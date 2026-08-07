import React from 'react';
import PropTypes from 'prop-types';
import { X, Navigation, MapPin, Zap, Wallet, Award, CheckCircle2, Wrench } from 'lucide-react';
import { JOBS_DATABASE } from '../data/jobsConfig';
import { useJobStore } from '../store/useJobStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTravelStore } from '../store/useTravelStore';

export default function JobView({ jobId, onClose }) {
  const job = JOBS_DATABASE[jobId];
  const player = usePlayerStore((state) => state.player);
  const isMoving = useTravelStore((state) => state.isMoving);
  const {
    activeShift,
    isProcessing,
    jobMessage,
    taskProgress,
    lastTask,
    startShift,
    cancelShift,
    goToCurrentStop,
    completeStop,
    returnToBase,
    runTask,
    endStationShift,
    availableTasks,
    skillValue,
    hasLicenseFor,
  } = useJobStore();

  if (!job) return null;

  const shift = activeShift?.jobId === jobId ? activeShift : null;
  const otherShift = activeShift && activeShift.jobId !== jobId;
  const skill = skillValue(jobId);
  const licensed = hasLicenseFor(jobId);
  const busy = isProcessing || isMoving;

  const stop = shift?.stops?.[shift.currentStop];

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white font-sans animate-in fade-in duration-300">
      <div className="w-full flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${job.accent}`}>{job.short}</p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">{job.name} {job.icon}</h2>
            <p className="text-sm text-slate-400 mt-3">{job.desc}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X size={24} /></button>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Навык</span>
            <span className={`font-black italic ${job.accent}`}>{skill}%</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-white/60 transition-all duration-700" style={{ width: `${skill}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat icon={<Wallet size={14} className="text-emerald-400" />} label="Баланс" value={`${Number(player?.money || 0).toLocaleString()}`} />
          <Stat icon={<Zap size={14} className="text-yellow-400" />} label="Энергия" value={`${player?.energy || 0}%`} />
          <Stat icon={<Award size={14} className="text-sky-400" />} label="Расход" value={`-${job.energyCost}%`} />
        </div>

        {jobMessage && (
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-4 text-sm text-slate-300">{jobMessage}</div>
        )}

        {!licensed && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-4 text-sm text-red-300">
            Требуется лицензия: {job.license === 'truck' ? 'Грузовые (C)' : 'Вождение (B)'}.
          </div>
        )}

        {otherShift && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 text-sm text-amber-200">
            У вас уже открыта смена на другой работе. Завершите её, чтобы начать эту.
          </div>
        )}

        {job.kind === 'route'
          ? <RouteBody job={job} shift={shift} stop={stop} busy={busy} onStart={() => startShift(jobId)} onGo={goToCurrentStop} onComplete={completeStop} onReturn={returnToBase} onCancel={cancelShift} disabled={!licensed || otherShift} />
          : <StationBody job={job} shift={shift} busy={busy} progress={taskProgress} lastTask={lastTask} tasks={availableTasks(jobId)} onStart={() => startShift(jobId)} onRun={runTask} onEnd={endStationShift} disabled={otherShift} />}
      </div>
    </div>
  );
}

function RouteBody({ job, shift, stop, busy, onStart, onGo, onComplete, onReturn, onCancel, disabled }) {
  if (!shift) {
    return (
      <div className="space-y-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-2">Оплата</p>
          <p className="text-lg font-black uppercase">${job.payPerStop[0].toLocaleString()}–${job.payPerStop[1].toLocaleString()} за точку</p>
          <p className="text-slate-400 text-sm mt-2">Премия за полную смену: ${job.bonusOnFinish.toLocaleString()}. Транспорт выдаётся на смену.</p>
        </div>
        <button onClick={onStart} disabled={disabled}
          className={`w-full py-6 rounded-[32px] text-xl font-black uppercase italic transition-all ${disabled ? 'bg-slate-800 opacity-50' : 'bg-emerald-600 active:scale-95'}`}>
          Начать смену
        </button>
      </div>
    );
  }

  const done = shift.status === 'toBase' || shift.status === 'returning';

  return (
    <div className="space-y-4">
      {shift.cargo && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-4 text-sm text-slate-300">Груз: <b>{shift.cargo}</b></div>
      )}

      <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-5 space-y-3">
        {shift.stops.map((s, index) => {
          const isCurrent = index === shift.currentStop && !done;
          const isPassed = index < shift.currentStop || done;
          return (
            <div key={`${s.location.id}-${index}`} className={`flex items-center gap-3 ${isCurrent ? 'text-white' : isPassed ? 'text-emerald-400/70' : 'text-slate-500'}`}>
              {isPassed ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
              <div className="flex-grow text-left">
                <p className="text-sm font-black uppercase">{s.label}</p>
                <p className="text-[11px] opacity-70">{s.location.name}</p>
              </div>
              {s.pay > 0 && <span className="text-xs font-black">${s.pay.toLocaleString()}</span>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <Stat icon={<Wallet size={14} className="text-emerald-400" />} label="Заработано" value={`$${shift.earned.toLocaleString()}`} />
        <Stat icon={<Award size={14} className="text-sky-400" />} label="Опыт" value={`${shift.exp} XP`} />
      </div>

      {shift.status === 'assigned' && (
        <button onClick={onGo} disabled={busy}
          className={`w-full py-6 rounded-[32px] text-lg font-black uppercase italic flex items-center justify-center gap-3 ${busy ? 'bg-slate-800 opacity-50' : 'bg-blue-600 active:scale-95'}`}>
          <Navigation size={20} /> Ехать: {stop?.location.name}
        </button>
      )}

      {shift.status === 'driving' && (
        <div className="w-full py-6 rounded-[32px] bg-slate-800/60 text-center text-lg font-black uppercase italic animate-pulse">В пути...</div>
      )}

      {shift.status === 'arrived' && (
        <button onClick={onComplete} className="w-full py-6 rounded-[32px] bg-emerald-600 text-lg font-black uppercase italic active:scale-95">
          Выполнить: {stop?.label}
        </button>
      )}

      {shift.status === 'toBase' && (
        <button onClick={onReturn} disabled={busy}
          className={`w-full py-6 rounded-[32px] text-lg font-black uppercase italic ${busy ? 'bg-slate-800 opacity-50' : 'bg-amber-600 active:scale-95'}`}>
          Вернуться на базу за расчётом
        </button>
      )}

      {shift.status === 'returning' && (
        <div className="w-full py-6 rounded-[32px] bg-slate-800/60 text-center text-lg font-black uppercase italic animate-pulse">Возвращение...</div>
      )}

      <button onClick={onCancel} disabled={busy} className="w-full py-3 rounded-3xl border border-white/10 text-xs font-black uppercase text-slate-400 active:scale-95">
        Отменить смену
      </button>
    </div>
  );
}

function StationBody({ job, shift, busy, progress, lastTask, tasks, onStart, onRun, onEnd, disabled }) {
  if (!shift) {
    return (
      <div className="space-y-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-2">Наряды</p>
          {job.tasks.map((t) => (
            <div key={t.id} className="flex justify-between text-sm py-1 text-slate-400">
              <span>{t.name}</span>
              <span>${t.pay[0].toLocaleString()}–${t.pay[1].toLocaleString()} · навык {t.minSkill}%</span>
            </div>
          ))}
        </div>
        <button onClick={onStart} disabled={disabled}
          className={`w-full py-6 rounded-[32px] text-xl font-black uppercase italic ${disabled ? 'bg-slate-800 opacity-50' : 'bg-emerald-600 active:scale-95'}`}>
          Заступить на смену
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat icon={<Wrench size={14} className="text-sky-400" />} label="Нарядов" value={shift.tasksDone} />
        <Stat icon={<Wallet size={14} className="text-emerald-400" />} label="За смену" value={`$${shift.earned.toLocaleString()}`} />
        <Stat icon={<Award size={14} className="text-sky-400" />} label="Опыт" value={`${shift.exp} XP`} />
      </div>

      {busy && (
        <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black mb-3">Выполнение наряда</p>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {lastTask && !busy && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 text-sm text-emerald-200">
          {lastTask.name}: +${lastTask.pay.toLocaleString()}, +{lastTask.exp} XP
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((t) => (
          <button key={t.id} onClick={() => onRun(t.id)} disabled={busy}
            className={`w-full p-5 rounded-[28px] border text-left transition-all ${busy ? 'border-white/5 bg-white/[0.02] opacity-50' : 'border-white/10 bg-white/[0.04] active:scale-95'}`}>
            <p className="font-black uppercase">{t.name}</p>
            <p className="text-xs text-slate-400 mt-1">${t.pay[0].toLocaleString()}–${t.pay[1].toLocaleString()} · +{t.exp} XP · -{job.energyCost}% энергии</p>
          </button>
        ))}
        {tasks.length === 0 && <p className="text-sm text-slate-500">Нет доступных нарядов — поднимите навык.</p>}
      </div>

      <button onClick={onEnd} disabled={busy} className="w-full py-4 rounded-3xl border border-white/10 text-xs font-black uppercase text-slate-400 active:scale-95">
        Закончить смену
      </button>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-4">
      <div className="flex items-center justify-center gap-2 mb-1">{icon}
        <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-black">{label}</p>
      </div>
      <p className="text-sm font-black uppercase">{value}</p>
    </div>
  );
}

JobView.propTypes = {
  jobId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
