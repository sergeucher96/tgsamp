import React, { useState, useEffect, useRef } from 'react';
import { X, Bus, Clock, Wallet, Award, Navigation, AlertCircle, CheckCircle2, Battery } from 'lucide-react';
import { useBusStore } from '../store/useBusStore';
import { usePlayerStore } from '../store/usePlayerStore';

export default function BusDepotView({ onClose }) {
  const [tick, setTick] = useState(0); // для обновления таймеров UI
  const timerRef = useRef(null);

  const {
    isEmployed,
    isBusRented,
    rentEndTime,
    currentRoute,
    routeRunning,
    awaitingRepeat,
    earnedToday,
    routesCompleted,
    message,
    employ,
    rentBus,
    returnBus,
    startRoute,
    repeatRoute,
    stopRoute,
    getRentTimeLeft,
    getAvailableRoutes,
  } = useBusStore();

  const player = usePlayerStore((state) => state.player);

  // Close BusDepotView when route starts (MapView handles it, this is a safety net)
  useEffect(() => {
    if (routeRunning) {
      onClose();
    }
  }, [routeRunning, onClose]);

  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const rentTimeLeft = getRentTimeLeft();
  const rentSeconds = Math.max(0, Math.ceil(rentTimeLeft / 1000));
  const rentMinutes = Math.floor(rentSeconds / 60);
  const rentSecs = rentSeconds % 60;

  const availableRoutes = getAvailableRoutes();

  // Форматирование времени аренды
  const formatRentTime = () => {
    if (!isBusRented) return '--:--';
    return `${rentMinutes.toString().padStart(2, '0')}:${rentSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white font-sans animate-in fade-in duration-300">
      <div className="w-full flex-1 overflow-y-auto p-6 space-y-5">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 text-yellow-400">Транспорт</p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Автобусный парк �</h2>
            <p className="text-sm text-slate-400 mt-3">Арендуйте автобус и выполняйте маршруты по городу</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90">
            <X size={24} />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-4 text-sm text-yellow-200">
            <p>{message}</p>
          </div>
        )}

        {/* Employment section */}
        {!isEmployed ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-400" />
              <p className="text-sm text-slate-300">Вы ещё не трудоустроены в автобусный парк.</p>
            </div>
            <button
              onClick={() => employ()}
              className="w-full py-6 rounded-[32px] text-xl font-black uppercase italic bg-emerald-600 active:scale-95 transition-all"
            >
              Устроиться на работу
            </button>
          </div>
        ) : (
          <>
            {/* Employment stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <StatBox icon={<Wallet size={14} className="text-emerald-400" />} label="Заработано" value={`$${earnedToday.toLocaleString()}`} />
              <StatBox icon={<Award size={14} className="text-sky-400" />} label="Маршрутов" value={routesCompleted} />
            </div>

            {/* Bus rental section */}
            {!isBusRented ? (
              <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black uppercase text-slate-300">Аренда автобуса</p>
                  <span className="text-xs text-slate-500">10 минут работы</span>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-yellow-200">Стоимость аренды</span>
                    <span className="text-lg font-black text-yellow-400 italic">500$</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-yellow-200">Ваши средства</span>
                    <span className="text-sm text-yellow-200">${(player?.money || 0).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => rentBus()}
                  disabled={(player?.money || 0) < 500}
                  className={`w-full py-6 rounded-[32px] text-xl font-black uppercase italic transition-all ${
                    (player?.money || 0) < 500
                      ? 'bg-slate-800 opacity-50'
                      : 'bg-yellow-600 active:scale-95'
                  }`}
                >
                  Арендовать автобус — 500$
                </button>
              </div>
            ) : (
              <>
                {/* Active rental info */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-[32px] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-yellow-400" />
                      <p className="text-sm font-black uppercase text-yellow-200">Осталось времени</p>
                    </div>
                    <span className="text-xl font-black italic text-yellow-400">{formatRentTime()}</span>
                  </div>

                  {/* Timer bar */}
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all duration-1000"
                      style={{ width: `${(rentTimeLeft / (10 * 60 * 1000)) * 100}%` }}
                    />
                  </div>

                  {!routeRunning && (
                    <button
                      onClick={() => returnBus()}
                      className="w-full py-3 rounded-2xl border border-white/10 text-xs font-black uppercase text-slate-400 active:scale-95"
                    >
                      Вернуть автобус
                    </button>
                  )}
                </div>

                {/* Route in progress */}
                {routeRunning && currentRoute && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-[32px] p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Navigation size={20} className="text-blue-400 animate-pulse" />
                      <div>
                        <p className="text-sm font-black uppercase text-blue-200">{currentRoute.name}</p>
                        <p className="text-xs text-slate-400">Автобус едет по маршруту...</p>
                      </div>
                    </div>
                    <div className="w-full py-4 rounded-2xl bg-slate-800/60 text-center text-lg font-black uppercase italic animate-pulse">
                      В пути...
                    </div>
                  </div>
                )}

                {/* Awaiting repeat - ask to repeat route */}
                {!routeRunning && awaitingRepeat && currentRoute && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[32px] p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                      <div>
                        <p className="text-sm font-black uppercase text-emerald-200">Маршрут завершён!</p>
                        <p className="text-xs text-slate-400">Едем ещё раз?</p>
                      </div>
                    </div>

                    {/* Energy info */}
                    <div className="bg-black/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Энергия</span>
                        <div className="flex items-center gap-2">
                          <Battery size={14} className={player?.energy >= 2 ? 'text-emerald-400' : 'text-red-400'} />
                          <span className={`text-sm font-black ${(player?.energy || 0) >= 2 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {Math.round(player?.energy || 0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Расход за маршрут</span>
                        <span className="text-sm font-black text-amber-400">2%</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => repeatRoute()}
                        disabled={(player?.energy || 0) < 2}
                        className={`flex-1 py-5 rounded-2xl text-base font-black uppercase italic transition-all ${
                          (player?.energy || 0) < 2
                            ? 'bg-slate-800 opacity-50 cursor-not-allowed'
                            : 'bg-emerald-600 active:scale-95'
                        }`}
                      >
                        Да, едем
                      </button>
                      <button
                        onClick={() => stopRoute()}
                        className="flex-1 py-5 rounded-2xl text-base font-black uppercase italic border border-white/10 bg-white/[0.05] active:scale-95 transition-all text-slate-300"
                      >
                        Нет, хватит
                      </button>
                    </div>
                  </div>
                )}

                {/* Available routes */}
                {!routeRunning && availableRoutes.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Доступные маршруты</p>
                    {availableRoutes.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => startRoute(route.id)}
                        className="w-full p-5 rounded-[28px] border border-white/10 bg-white/[0.04] text-left transition-all active:scale-95"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-black uppercase text-white">{route.name}</p>
                          <span className="text-xs font-black text-emerald-400 italic">
                            ${route.pay[0].toLocaleString()}–${route.pay[1].toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{route.description}</p>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>📍 {route.stops.length} остановок</span>
                          <span>🎓 +{route.exp} XP</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
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
      <div className="flex items-center justify-center gap-2 mb-1">
        {icon}
        <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-black">{label}</p>
      </div>
      <p className="text-sm font-black uppercase">{value}</p>
    </div>
  );
}
