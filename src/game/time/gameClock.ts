/**
 * Игровые часы: чистая арифметика без состояния и без базы.
 *
 * Отдельно от стора специально: эти функции ничего не знают про
 * React и Supabase, поэтому их можно вызывать откуда угодно и
 * проверять обычным запуском. Стор отвечает только за сверку
 * с сервером и за тик.
 *
 * Масштаб: игровой день длится 24 реальные минуты. Значит 1440
 * игровых минут проходят за 1440 реальных секунд — ровно одна
 * игровая минута за реальную секунду, и один игровой час равен
 * одной реальной минуте.
 *
 * Отсчёт от полуночи UTC: игровые часы совпадают с часами UTC
 * и не плывут при перезапуске сервера.
 */

export type DayPhase = 'morning' | 'day' | 'night';

export interface GameTimeSnapshot {
  /** Игровой час, 0…23 */
  hour: number;
  /** Игровая минута, 0…59 */
  minute: number;
  /** Фаза суток */
  phase: DayPhase;
  /** «ЧЧ:ММ» для интерфейса */
  label: string;
}

/** Игровой день = 24 реальные минуты */
export const REAL_MS_PER_GAME_DAY = 24 * 60 * 1000;

/** Полночь UTC — точка отсчёта игровых суток */
const GAME_EPOCH = Date.UTC(1970, 0, 1);

/**
 * Границы фаз в игровых часах. Ночь переходит через полночь,
 * поэтому у неё верхняя граница 29, а не 5.
 */
export const PHASES: Record<DayPhase, { from: number; to: number }> = {
  morning: { from: 5, to: 11 },
  day: { from: 11, to: 19 },
  night: { from: 19, to: 29 },
};

/** Затемнение экрана в каждую фазу: цвет и прозрачность */
export const PHASE_TINT: Record<DayPhase, string> = {
  morning: 'rgba(255, 196, 120, 0.10)',
  day: 'rgba(255, 255, 255, 0)',
  night: 'rgba(12, 20, 58, 0.46)',
};

/** Подпись фазы для интерфейса */
export const PHASE_LABEL: Record<DayPhase, string> = {
  morning: 'Утро',
  day: 'День',
  night: 'Ночь',
};

/** Иконка фазы для интерфейса */
export const PHASE_ICON: Record<DayPhase, string> = {
  morning: '🌅',
  day: '☀️',
  night: '🌙',
};

/**
 * Освещение 3D-сцены в каждую фазу.
 *
 * Цвет и сила задаются числами — three.js принимает цвет именно
 * так, и строкой он не прочитается.
 */
export const PHASE_LIGHT: Record<DayPhase, { ambient: number; color: number }> = {
  morning: { ambient: 0.62, color: 0xffe0b8 },
  day: { ambient: 0.75, color: 0xfff7ed },
  night: { ambient: 0.32, color: 0x9fb6ff },
};

export function phaseForHour(hour: number): DayPhase {
  if (hour >= PHASES.morning.from && hour < PHASES.morning.to) return 'morning';
  if (hour >= PHASES.day.from && hour < PHASES.day.to) return 'day';
  return 'night';
}

/**
 * Перевести реальный момент времени в игровое.
 *
 * На вход подаётся серверное время либо локальное со сдвигом,
 * поэтому результат у всех игроков одинаковый.
 */
export function gameTimeAt(epochMs: number): GameTimeSnapshot {
  // Одна реальная секунда — одна игровая минута.
  const gameMinutes = Math.floor((epochMs - GAME_EPOCH) / 1000);
  // Остаток положительный: % в JS сохраняет знак делимого, а
  // отрицательный остаток ушёл бы мимо 0…1439.
  const minutesInDay = ((gameMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  return {
    hour,
    minute,
    phase: phaseForHour(hour),
    label: String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'),
  };
}
