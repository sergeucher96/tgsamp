import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase/client';
import { usePlayerStore } from '../../stores/usePlayerStore';
import type { QueueFighter } from './types';

/**
 * Очередь бокса.
 *
 * Расчёт боя целиком на сервере, здесь только состояние: стою ли я
 * в очереди, кто ещё стоит, и не ждёт ли меня готовый бой.
 *
 * ПОЧЕМУ РЕАЛТАЙМ НА СВОЕЙ СТРОКЕ, А НЕ НА pvp_fights
 * ----------------------------------------------------
 * Подписаться на INSERT в pvp_fights с фильтром «я участвую»
 * нельзя: postgres_changes умеет только равенство по одному
 * полю, а участвуют двое. Подписка на собственную строку очереди
 * фильтруется идеально — player_id = мой id, — и в этой же строке
 * лежит fight_id, поэтому уведомление не перепутает бои.
 *
 * События INSERT без фильтра обновляют список: появление и уход
 * игроков видно без опроса. Если по какой-то причине событие
 * потерялось, список всё равно обновится по своему таймеру.
 */

interface PvpQueueState {
  /** Стою ли я в очереди прямо сейчас. */
  inQueue: boolean;
  /**
   * Бой, который сервер уже отдал, но который ещё не показан.
   *
   * Именно состояние, а не возврат из функции: бой достаётся и по
   * событию realtime, и по таймеру, и в обработчике события
   * возвращаемое значение выбросилось бы. Пока он лежит здесь,
   * модалка подхватывает его откуда угодно — из меню, из карты,
   * из любого экрана.
   */
  lastFight: any | null;
  fighters: QueueFighter[];
  loading: boolean;
  fighting: boolean;
  error: string | null;
  channel: RealtimeChannel | null;
  poller: ReturnType<typeof setInterval> | null;

  refresh: () => Promise<void>;
  join: () => Promise<boolean>;
  leave: () => Promise<void>;
  /** Возвращает готовый результат боя или null, если бой не начался. */
  fight: (opponentId: string) => Promise<any | null>;
  /**
   * Забирает бой из очереди и кладёт его в lastFight.
   * Результат остаётся в сторе, а не возвращается вызывающему:
   * вызывают эту функцию и realtime, и таймер, и из обработчика
   * события возвращаемое значение просто терялось бы.
   */
  takePending: () => Promise<void>;
  /** Показать бой и убрать его из lastFight. */
  clearFight: () => void;
  /**
   * Подписка плюс опрос. Идемпотентна: без неё бой приходил бы
   * только тому, кто случайно открыл меню в момент вызова.
   */
  ensureActive: () => void;
  stop: () => void;
}

const me = () => usePlayerStore.getState().player?.id ?? null;

/**
 * Текст ошибки PostgREST для игрока.
 *
 * ПОЧЕМУ ПО КОДУ, А НЕ ПО ТЕКСТУ. PostgREST на одну и ту же
 * причину отвечает разными словами в зависимости от слоя:
 * через RPC он пишет «Could not find the function» (PGRST202),
 * а прямой вызов SQL — «function … does not exist» (42883).
 * Ловить регуляркой текст означило молча проглатывать половину
 * случаев и показывать игроку голое «что-то пошло не так».
 *
 * PGRST202 означает не только «функции нет». Тот же код PostgREST
 * отдаёт, когда функция есть, но не совпали имена аргументов, —
 * поэтому в подсказке обе причины.
 */
function explain(e: any, what: string): string {
  const code = String(e?.code ?? '');
  const raw = String(e?.message ?? e ?? '');

  if (code === 'PGRST202' || /could not find the function|does not exist.*function/i.test(raw)) {
    return `${what} [${code}]: сервер не знает эту функцию — проверьте, применены ли миграции pvp_* и совпадают ли имена аргументов`;
  }
  if (code === 'PGRST205' || /could not find the table|relation .* does not exist/i.test(raw)) {
    return `${what} [${code}]: на сервере нет таблицы — проверьте миграции pvp_*`;
  }
  if (code === '42501' || /permission denied|row-level security/i.test(raw)) {
    return `${what} [${code}]: нет прав у роли`;
  }
  if (code === '23514' || code === 'P0001') {
    // check_violation / raise_exception. Миграция так сообщает об
    // обычных отказах: свой рейтинг, вызов себя, неготовый боец.
    return `${what}: сервер отказал — ${raw}`;
  }
  if (code === '23502' || code === '23503' || code === '23505') {
    return `${what} [${code}]: нарушено ограничение в базе — баг в миграции, нужен серверный лог`;
  }
  return `${what} [${code}]: ${raw}`;
}

export const usePvpQueueStore = create<PvpQueueState>((set, get) => ({
  inQueue: false,
  lastFight: null,
  fighters: [],
  loading: false,
  fighting: false,
  error: null,
  channel: null,
  poller: null,

  refresh: async () => {
    const playerId = me();
    if (!playerId) return;
    set({ loading: true });

    // Список соперников и своя строка берутся разными запросами:
    // список отдаёт RPC с фильтром по порогу и TTL, а свою строку
    // RPC не отдаёт — она и нужна, чтобы знать, стою ли я.
    const [list, mine] = await Promise.all([
      supabase.rpc('pvp_queue_list', { p_player_id: playerId }),
      supabase.from('pvp_queue')
        .select('player_id, status, fight_id, acknowledged_at')
        .eq('player_id', playerId)
        .maybeSingle(),
    ]);

    if (list.error) set({ error: explain(list.error, 'Не удалось получить список бойцов') });
    else set({ fighters: (list.data ?? []) as QueueFighter[] });

    const row = mine.data as any;
    if (!mine.error) {
      set({ inQueue: row?.status === 'waiting' });
    }

    set({ loading: false });
  },

  join: async () => {
    const playerId = me();
    if (!playerId) return false;
    set({ fighting: true, error: null });

    const { error } = await supabase.rpc('pvp_queue_join', { p_player_id: playerId });
    if (error) set({ error: explain(error, 'Не удалось встать в очередь') });
    else set({ inQueue: true });

    await get().refresh();
    set({ fighting: false });
    return !error;
  },

  leave: async () => {
    const playerId = me();
    if (!playerId) return;
    const { error } = await supabase.rpc('pvp_queue_leave', { p_player_id: playerId });
    if (error) set({ error: explain(error, 'Не удалось выйти из очереди') });
    set({ inQueue: false });
    await get().refresh();
  },

  fight: async (opponentId: string) => {
    const playerId = me();
    if (!playerId || !opponentId) return null;
    set({ fighting: true, error: null });

    const { data, error } = await supabase.rpc('pvp_queue_fight', {
      p_challenger_id: playerId,
      p_defender_id: opponentId,
    });

    if (error) {
      // Самая частая причина — противника только что вызвали.
      // Это не поломка, поэтому отдельным текстом, а не ошибкой.
      const raw = String(error.message ?? '');
      if (/уже в бою|вышел из очереди/i.test(raw)) set({ error: 'Противник уже в бою' });
      else set({ error: explain(error, 'Бой не начался') });
      await get().refresh();
      set({ fighting: false });
      return null;
    }

    // Вызывающий получает итог прямо здесь, а не из очереди: его
    // строку pvp_queue_fight удалил, и забирать было бы нечего.
    set({ inQueue: false });
    await get().refresh();
    set({ fighting: false });
    return data ?? null;
  },

  takePending: async () => {
    const playerId = me();
    if (!playerId) return;

    // Пока бой ждёт показания, следующий take ничего не вернёт:
    // acknowledged_at уже проставлен. Без этой проверки опрос
    // каждые несколько секунд дёргал бы базу впустую и сыпал
    // ошибками в консоль.
    if (get().lastFight) return;

    const { data, error } = await supabase.rpc('pvp_queue_take', { p_player_id: playerId });
    if (error) {
      set({ error: explain(error, 'Не удалось забрать бой') });
      return;
    }
    if (!data?.has_fight) return;

    // Бой кладу в стор — его подхватит модалка, где бы игрок ни был.
    set({ lastFight: data });
  },

  clearFight: () => set({ lastFight: null }),

  ensureActive: () => {
    const playerId = me();
    if (!playerId) return;

    // Realtime — быстрый путь, но не единственный: публикация
    // supabase_realtime может не содержать pvp_queue, а соединение
    // с Realtime рвётся, когда телеграм сворачивают. Поэтому рядом
    // всегда работает опрос, а realtime просто ускоряет доставку.
    if (!get().channel) {
      const channel = supabase
        .channel('pvp-queue')
        // Моя строка изменилась: меня вызвали в бой.
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pvp_queue', filter: `player_id=eq.${playerId}` },
          () => { void get().takePending(); },
        )
        // Кто-то встал или вышел — список должен быть живым.
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pvp_queue' },
          () => { void get().refresh(); },
        )
        .subscribe();

      set({ channel });
    }

    if (!get().poller) {
      const poller = setInterval(() => {
        void get().takePending();
        void get().refresh();
      }, 5000);
      set({ poller });
    }
  },

  stop: () => {
    const { channel, poller } = get();
    if (channel) supabase.removeChannel(channel);
    if (poller) clearInterval(poller);
    set({ channel: null, poller: null });
  },
}));