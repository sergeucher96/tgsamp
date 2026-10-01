/**
 * Индикатор игрового времени.
 *
 * Показывает фазу, часы и сколько до следующей смены. Обратный
 * отсчёт нужен не для красоты: по нему видно, сколько ждать ночи,
 * и не смотреть на часы в ожидании.
 *
 * Подписано «игровое», потому что это не местное время игрока:
 * оно общее у всех и отсчитывается от часов базы.
 */

import { useTimeStore } from '../../stores/useTimeStore';
import { PHASES, PHASE_ICON, PHASE_LABEL, phaseForHour } from '../../game/time/gameClock';
import { Sun, Sunrise, Moon } from 'lucide-react';

const ICONS = {
  morning: Sunrise,
  day: Sun,
  night: Moon,
} as const;

/** Сколько игровых минут до начала следующей фазы */
function minutesToNextPhase(hour: number, minute: number) {
  const current = hour * 60 + minute;
  const boundaries = [PHASES.morning.from, PHASES.day.from, PHASES.night.from];
  for (const b of boundaries) {
    if (current < b * 60) return b * 60 - current;
  }
  // Утро следующих суток
  return 24 * 60 - current + PHASES.morning.from * 60;
}

export default function TimeIndicator() {
  const hour = useTimeStore((s) => s.hour);
  const minute = useTimeStore((s) => s.minute);
  const label = useTimeStore((s) => s.label);
  const phase = useTimeStore((s) => s.phase);
  const synced = useTimeStore((s) => s.synced);

  const Icon = ICONS[phase];
  const until = minutesToNextPhase(hour, minute);
  // Одна игровая минута длится реальную секунду, поэтому реальных
  // минут до смены фазы столько же, сколько игровых минут.
  const nextPhase = phaseForHour(hour + (until / 60) % 24);
  const nextLabel = until >= 60 ? `${Math.floor(until / 60)} ч ${until % 60} мин` : `${until} мин`;

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 select-none">
      <Icon size={16} className={phase === 'night' ? 'text-indigo-300' : phase === 'morning' ? 'text-amber-300' : 'text-yellow-300'} />
      <div className="leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-white font-mono">{label}</span>
          <span className="text-[10px] font-bold text-slate-400">
            {PHASE_ICON[phase]} {PHASE_LABEL[phase]}
          </span>
        </div>
        <div className="text-[9px] text-slate-500">
          {synced
            ? `${PHASE_LABEL[nextPhase]} через ${nextLabel}`
            : 'время с базы ещё не получено'}
        </div>
      </div>
    </div>
  );
}
