/**
 * Стор игрового времени суток.
 *
 * Время общее у всех игроков: фаза считается не от часов
 * устройства, а от времени базы. Иначе у одного игрока в Москве
 * вечер, а у другого в Лос-Анджелесе глубокая ночь, и одинаковые
 * события происходили бы в разное игровое время.
 *
 * Как это устроено:
 *   1. При старте забираем now() из базы и запоминаем сдвиг между
 *      серверным и локальным временем (offsetMs).
 *   2. Дальше идём по своим часам, добавляя сдвиг, — так время не
 *      дёргается от каждого ответа сервера.
 *   3. Раз в несколько минут сверяемся с базой заново: часы
 *      устройства могут враться, а таймер в фоновой вкладке
 *      браузер дросселирует.
 *
 * Сама арифметика вынесена в game/time/gameClock, здесь только
 * состояние.
 */

import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { gameTimeAt, type DayPhase, type GameTimeSnapshot } from '../game/time/gameClock';

export type { DayPhase, GameTimeSnapshot } from '../game/time/gameClock';

/** Раз в столько минут сверяемся с базой */
const RESYNC_MS = 5 * 60 * 1000;

/** Тик раз в секунду: игровая минута равна реальной секунде */
const TICK_MS = 1000;

interface TimeState extends GameTimeSnapshot {
  /** Сдвиг «серверное минус локальное», мс */
  offsetMs: number;
  /** Удалось ли получить время базы */
  synced: boolean;
  /** Ошибка последней сверки, null если всё в порядке */
  error: string | null;

  /** Запустить часы: сверка с базой и тик. Идемпотентно. */
  start: () => void;
  /** Остановить часы. */
  stop: () => void;
  /** Принудительная сверка с базой. */
  sync: () => Promise<void>;
}

let ticker: ReturnType<typeof setInterval> | null = null;
let resyncTicker: ReturnType<typeof setInterval> | null = null;

export const useTimeStore = create<TimeState>((set, get) => ({
  offsetMs: 0,
  synced: false,
  error: null,

  // До первой сверки показываем полдень: иначе игрок увидит
  // ночь, пока идёт запрос, и потом увидит смену на день.
  hour: 12,
  minute: 0,
  phase: 'day',
  label: '12:00',

  sync: async () => {
    // Замер берём до запроса и после: за время похода в сеть
    // проходит часть секунды.
    const before = Date.now();
    const { data, error } = await supabase.rpc('game_server_now');
    const after = Date.now();

    if (error) {
      // Не останавливаемся: без базы лучше показывать время по
      // часам устройства со сдвигом, чем не показывать ничего.
      set({ error: error.message });
      return;
    }

    const serverMs = new Date(data as string).getTime();
    if (Number.isNaN(serverMs)) {
      set({ error: 'сервер вернул нечитаемое время' });
      return;
    }

    // Середина интервала запроса — момент, когда база формировала
    // ответ. От неё считаем сдвиг, иначе задержка сети приняла бы
    // на себя разницу часов между игроком и сервером.
    const mid = before + (after - before) / 2;

    set({ offsetMs: serverMs - mid, synced: true, error: null, ...gameTimeAt(serverMs) });
  },

  start: () => {
    if (ticker) return;
    void get().sync();

    ticker = setInterval(() => {
      const { offsetMs, hour, minute } = get();
      const snap = gameTimeAt(Date.now() + offsetMs);
      // Меняем состояние только на новой игровой минуте: за секунду
      // это всё равно, а перерисовки лишние.
      if (hour === snap.hour && minute === snap.minute) return;
      set({ hour: snap.hour, minute: snap.minute, phase: snap.phase, label: snap.label });
    }, TICK_MS);

    resyncTicker = setInterval(() => {
      void get().sync();
    }, RESYNC_MS);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
  },

  stop: () => {
    if (ticker) {
      clearInterval(ticker);
      ticker = null;
    }
    if (resyncTicker) {
      clearInterval(resyncTicker);
      resyncTicker = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
    }
  },
}));

function onVisibility() {
  // Возврат на вкладку — повод свериться: пока вкладка была в фоне,
  // браузер мог проредить таймеры, и локальный отсчёт разошёлся бы
  // с серверным на минуты.
  if (document.visibilityState === 'visible') void useTimeStore.getState().sync();
}

/**
 * Снимок игрового времени без подписки — для разовых расчётов.
 *
 * Считает всегда от текущего момента, а не берёт последнее
 * значение из стора: иначе вызовчик получил бы время, которое
 * устарело на сколько угодно минут.
 */
export function getGameTime(): GameTimeSnapshot {
  return gameTimeAt(Date.now() + useTimeStore.getState().offsetMs);
}
