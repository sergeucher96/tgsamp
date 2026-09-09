import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Wallet, Award, Battery, CheckCircle2 } from 'lucide-react';
import { useBusStore } from '../store/useBusStore';
import { usePlayerStore } from '../store/usePlayerStore';

export default function BusDepotView({ onClose }) {
  const [, setTick] = useState(0);
  const timerRef = useRef(null);
  const [routes, setRoutes] = useState([]);

  const {
    sessionActive, routeRunning, awaitingRepeat, currentRoute,
    sessionEarned, sessionRoutesCompleted, message,
    currentStopName, nextStopName, currentStopIndex, totalStops,
    startSession, endSession, repeatRoute, dismissRoutePopup,
  } = useBusStore();

  const player = usePlayerStore((state) => state.player);

  const loadRoutes = useCallback(async () => {
    const all = await useBusStore.getState().getAvailableRoutes();
    setRoutes(all);
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);
  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white font-sans animate-in fade-in duration-300">
      <div className="w-full flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 text-yellow-400">Транспорт</p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Автобусный парк</h2>
            <p className="text-sm text-slate-400 mt-3">Выберите маршрут и начните смену</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X size={24} /></button>
        </div>

        {message && <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-4 text-sm text-yellow-200">{message}</div>}

        {sessionActive ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-center">
              <StatBox icon={<Wallet size={14} className="text-emerald-400" />} label="Заработано" value={`$${sessionEarned.toLocaleString()}`} />
              <StatBox icon={<Award size={14} className="text-sky-400" />} label="Маршрутов" value={sessionRoutesCompleted} />
            </div>
            {!routeRunning && awaitingRepeat && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[32px] p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-400" />
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-200">Маршрут завершён!</p>
                    <p className="text-xs text-slate-400">Едем ещё раз?</p>
                  </div>
                </div>
                <div className="bg-black/30 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-xs text-slate-400">Энергия</span>
                    <div className="flex items-center gap-2"><Battery size={14} className={player?.energy >= 2 ? 'text-emerald-400' : 'text-red-400'} /><span className={`text-sm font-black ${(player?.energy || 0) >= 2 ? 'text-emerald-400' : 'text-red-400'}`}>{Math.round(player?.energy || 0)}%</span></div>
                  </div>
                  <div className="flex justify-between"><span className="text-xs text-slate-400">Расход за маршрут</span><span className="text-sm font-black text-amber-400">2%</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => repeatRoute()} disabled={(player?.energy || 0) < 2}
                    className={`flex-1 py-5 rounded-2xl text-base font-black uppercase italic transition-all ${(player?.energy || 0) < 2 ? 'bg-slate-800 opacity-50' : 'bg-emerald-600 active:scale-95'}`}>Да, едем</button>
                  <button onClick={() => endSession()} className="flex-1 py-5 rounded-2xl text-base font-black uppercase italic border border-white/10 bg-white/[0.05] active:scale-95 text-slate-300">Завершить смену</button>
                </div>
              </div>
            )}
            {!awaitingRepeat && routes.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Выберите маршрут</p>
                {routes.map(r => (
                  <button key={r.id} onClick={() => startSession(r.id)} disabled={(player?.energy || 0) < 5}
                    className="w-full p-5 rounded-[28px] border border-white/10 bg-white/[0.04] text-left transition-all active:scale-95 disabled:opacity-50">
                    <div className="flex justify-between items-start mb-2"><p className="font-black uppercase text-white">{r.name}</p><span className="text-xs font-black text-emerald-400 italic">${(r.pay || 500).toLocaleString()}</span></div>
                    <p className="text-xs text-slate-400 mb-2">{r.description}</p>
                    <div className="flex justify-between text-[10px] text-slate-500"><span>📍 {r.stops.length} точек</span><span>🎓 +{r.exp} XP</span></div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between"><span className="text-xs text-slate-400">Энергия</span>
                <div className="flex items-center gap-2"><Battery size={14} className={player?.energy >= 5 ? 'text-emerald-400' : 'text-red-400'} /><span className={`text-sm font-black ${player?.energy >= 5 ? 'text-emerald-400' : 'text-red-400'}`}>{Math.round(player?.energy || 0)}%</span></div>
              </div>
              <div className="flex justify-between"><span className="text-xs text-slate-400">Расход на старт</span><span className="text-sm font-black text-amber-400">5%</span></div>
            </div>
            {routes.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Доступные маршруты</p>
                {routes.map(r => (
                  <button key={r.id} onClick={() => startSession(r.id)} disabled={(player?.energy || 0) < 5}
                    className="w-full p-5 rounded-[28px] border border-white/10 bg-white/[0.04] text-left transition-all active:scale-95 disabled:opacity-50">
                    <div className="flex justify-between items-start mb-2"><p className="font-black uppercase text-white">{r.name}</p><span className="text-xs font-black text-emerald-400 italic">${(r.pay || 500).toLocaleString()}</span></div>
                    <p className="text-xs text-slate-400 mb-2">{r.description}</p>
                    <div className="flex justify-between text-[10px] text-slate-500"><span>� {r.stops.length} точек</span><span>🎓 +{r.exp} XP</span></div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-4">
      <div className="flex items-center justify-center gap-2 mb-1">{icon}<p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-black">{label}</p></div>
      <p className="text-sm font-black uppercase">{value}</p>
    </div>
  );
}
