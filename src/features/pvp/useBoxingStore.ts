import { create } from 'zustand';
import { supabase } from '../../services/supabase/client';
import { usePlayerStore } from '../../stores/usePlayerStore';

/**
 * Тренировки по трём характеристикам.
 *
 * Считает всё сервер. Здесь нет ни кривой уровней, ни цен, ни
 * проверки отката: pvp_boxing_progress отдаёт готовые числа под
 * отрисовку. Держать копию этих правил на клиенте означало бы
 * ровно то, от чего ушли в серверную систему, — две правды об
 * одном предмете.
 */

/**
 * Три характеристики, ровно как в Punch Club.
 *
 *      СИЛ — урон
 *      ЛОВ — уклонение и темп
 *      ВЫН — запас энергии, здоровье и поглощение урона
 *
 * Их смысл задаёт сервер: снимок бойца раскладывает их по ролям,
 * и клиент не решает, что усиливает каждая.
 */
export type Stat = 'strength' | 'agility' | 'stamina';

export interface BoxingStat {
  stat: Stat;
  title: string;
  icon: string;
  /** Что характеристика делает — приходит с сервера. */
  effect: string;
  level: number;
  level_max: number;
  xp: number;
  xp_in_level: number;
  xp_need: number;
  train_xp: number;
  affordable: boolean;
  max_level: boolean;
}

export interface BoxingProgress {
  ok: boolean;
  /** Запас энергии. Это же он и есть ограничитель тренировок. */
  energy: number;
  energy_max: number;
  energy_cost: number;
  /** Сколько подходов игрок успеет сделать на текущей энергии. */
  sessions_left: number;
  level_max: number;
  items: BoxingStat[];
}

/**
 * Статы бойца для показа в меню бокса.
 *
 * Берутся из pvp_fighter_snapshot — того же снимка, по которому сервер
 * считает бой. Отдельного счёта характеристик здесь нет намеренно:
 * панель должна показывать ровно то, с чем боец выйдет на ринг.
 * Значения — это тренировка плюс снаряжение, вместе.
 */
export interface BoxingStats {
  strength: number;
  agility: number;
  stamina: number;
  attack: number;
  defense: number;
  luck: number;
  maxHp: number;
}

interface BoxingState {
  progress: BoxingProgress | null;
  /** Характеристики бойца для панели в меню. */
  stats: BoxingStats | null;
  loading: boolean;
  training: Stat | null;
  error: string | null;
  /** Последнее повышение уровня — для всплывающего сообщения. */
  levelUp: { title: string; icon: string; level: number } | null;

  refresh: () => Promise<void>;
  refreshStats: () => Promise<void>;
  train: (stat: Stat) => Promise<boolean>;
  clearLevelUp: () => void;
}

const me = () => usePlayerStore.getState().player?.id ?? null;

/**
 * Причины отказа приходят полем reason, а не ошибкой: «кончилась
 * энергия» — это не поломка, и показывать её красной плашкой «ошибка»
 * значило бы наказать игрока за усталость как за сбой.
 */
function reasonText(reason: string): string {
  switch (reason) {
    case 'no_energy':
      return 'Сил кончилось — поешь или выспись, чтобы восстановить энергию';
    case 'max_level':
      return 'Максимальный уровень достигнут';
    default:
      return 'Не удалось потренироваться';
  }
}

export const useBoxingStore = create<BoxingState>((set, get) => ({
  progress: null,
  stats: null,
  loading: false,
  training: null,
  error: null,
  levelUp: null,

  refreshStats: async () => {
    const playerId = me();
    if (!playerId) return;

    const { data, error } = await supabase.rpc('pvp_fighter_snapshot', {
      p_player_id: playerId,
    });

    // Снимок может вернуться с blocked — например, когда игрок без
    // персонажа. Это не поломка панели, поэтому ошибку молча
    // проглатываем: панель просто покажет нули.
    if (error || !data || data.ok === false) return;

    set({
      stats: {
        strength: Number(data.strength) || 0,
        agility: Number(data.agility) || 0,
        stamina: Number(data.stamina) || 0,
        attack: Number(data.attack) || 0,
        defense: Number(data.defense) || 0,
        luck: Number(data.luck) || 0,
        maxHp: Number(data.max_hp) || 0,
      },
    });
  },

  refresh: async () => {
    const playerId = me();
    if (!playerId) return;
    set({ loading: true });

    const { data, error } = await supabase.rpc('pvp_boxing_progress', { p_player_id: playerId });

    if (error) {
      set({ error: `Прогресс тренировок недоступен [${error.code}]` });
    } else if (data) {
      set({ progress: data as BoxingProgress });
    }

    set({ loading: false });
  },

  train: async (stat: Stat) => {
    const playerId = me();
    if (!playerId) return false;
    set({ training: stat, error: null });

    const { data, error } = await supabase.rpc('pvp_boxing_train', {
      p_player_id: playerId,
      p_stat: stat,
    });

    if (error) {
      set({ error: `Тренировка не удалась [${error.code}]` });
      set({ training: null });
      return false;
    }

    if (!data?.ok) {
      set({ error: reasonText(String(data?.reason ?? '')) });
      set({ training: null });
      await get().refresh();
      return false;
    }

    if (data.levelled_up) {
      const item = get().progress?.items?.find((i) => i.stat === stat);
      set({
        levelUp: {
          title: item?.title ?? stat,
          icon: item?.icon ?? '🥊',
          level: Number(data.level) || 0,
        },
      });
    }

    // Энергия списалась на сервере, а профиль на клиенте про неё
    // ещё не знает. Без синхронизации полоса в интерфейсе осталась
    // бы прежней до следующего обновления — и игрок жал бы впустую,
    // думая, что запас ещё есть.
    if (typeof data.energy === 'number') {
      usePlayerStore.setState((prev) => ({
        player: prev.player ? { ...prev.player, sportEnergy: data.energy } : prev.player,
      }));
    }

    set({ training: null });
    await get().refresh();
    return true;
  },

  clearLevelUp: () => set({ levelUp: null }),
}));
