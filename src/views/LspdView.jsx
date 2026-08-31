import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { useLspdStore } from '../store/useLspdStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { FINAL_LOCATIONS } from '../data/locations';

export default function LspdView({ onClose }) {
  const { player } = usePlayerStore();
  const {
    isMember, rank, reputation, isInUniform,
    onPatrol, patrolType, patrolRoute, patrolRouteRunning,
    cameras,
    joinLspd, startPatrol, endPatrol, loadLspdStatus,
    putOnUniform, takeOffUniform,
    startPatrolRoute,
    installCamera, removeCamera,
    canQueryVehicle, canQueryPerson,
    getVehicleQueryCooldown, getPersonQueryCooldown,
    getPatrolRoutes,
  } = useLspdStore();
  
  const [joining, setJoining] = useState(false);
  const [cooldown, setCooldown] = useState({ vehicle: 0, person: 0 });
  const [patrolMenu, setPatrolMenu] = useState(false);
  const [patrolStep, setPatrolStep] = useState('type'); // 'type' -> 'route'
  const [selectedPatrolType, setSelectedPatrolType] = useState('vehicle');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [camerasOpen, setCamerasOpen] = useState(false);
  const [installMenu, setInstallMenu] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [installingCamera, setInstallingCamera] = useState(false);
  const [cameraTimers, setCameraTimers] = useState({});
  
  // Load patrol routes dynamically (includes localStorage)
  const patrolRoutes = useCallback(() => getPatrolRoutes(), [getPatrolRoutes]);
  
  // useMemo for occupied location IDs (camera still active)
  const occupiedLocationIds = React.useMemo(() => {
    return cameras.map(c => c.location_id);
  }, [cameras]);
  
  // Доступные локации для камер (не дома, не фильтр)
  const cameraLocations = (FINAL_LOCATIONS || []).filter(loc =>
    loc.type && loc.type !== 'house' && loc.icon
  );
  
  // Загрузить статус LSPD при открытии
  useEffect(() => {
    if (player?.id) {
      loadLspdStatus(player.id);
    }
  }, [player?.id, loadLspdStatus]);
  
  // Timer for cooldown display
  useEffect(() => {
    if (!isMember) return;
    const interval = setInterval(() => {
      setCooldown({
        vehicle: getVehicleQueryCooldown(),
        person: getPersonQueryCooldown(),
      });
      // Обновить таймеры камер
      const timers = {};
      cameras.forEach(cam => {
        const remaining = Math.max(0, Math.ceil((new Date(cam.expires_at) - new Date()) / 1000));
        timers[cam.id] = remaining;
      });
      setCameraTimers(timers);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMember, getVehicleQueryCooldown, getPersonQueryCooldown, cameras]);
  
  const handleJoin = async () => {
    if (!player?.id || joining) return;
    setJoining(true);
    const ok = await joinLspd(player.id);
    setJoining(false);
    if (!ok) alert('Не удалось вступить. Попробуйте позже.');
  };
  
  const handlePutOnUniform = async () => {
    if (!player?.id) return;
    const ok = await putOnUniform(player.id);
    if (!ok) alert('Не удалось надеть форму.');
  };
  
  const handleTakeOffUniform = async () => {
    if (!player?.id) return;
    const ok = await takeOffUniform(player.id);
    if (!ok) alert('Не удалось снять форму.');
  };
  
  const handleSelectPatrolType = (type) => {
    if (!isInUniform) { alert('Сначала наденьте форму'); return; }
    setSelectedPatrolType(type);
    setPatrolStep('route');
  };
  
  const handleStartPatrol = (routeId) => {
    if (!isInUniform) { alert('Сначала наденьте форму'); return; }
    if (patrolRouteRunning) { alert('Патруль уже активен'); return; }
    const routes = patrolRoutes();
    const route = routeId ? routes.find(r => r.id === routeId) : null;
    if (routeId) {
      // Start route-based patrol with movement
      startPatrolRoute(routeId);
    } else {
      // Free patrol — just set status
      startPatrol(selectedPatrolType, null, route);
    }
    setPatrolMenu(false);
    setPatrolStep('type');
    setSelectedRoute('');
  };
  
  const stopPatrolRoute = useLspdStore(state => state.stopPatrolRoute);
  const handleEndPatrol = () => {
    if (patrolRouteRunning) {
      stopPatrolRoute();
    } else {
      endPatrol();
    }
  };
  
  const handleInstallCamera = async () => {
    if (!player?.id || !selectedLocation) return;
    if (!isInUniform) { alert('Сначала наденьте форму'); return; }
    const loc = cameraLocations.find(l => l.id === selectedLocation);
    if (!loc) return;
    setInstallingCamera(true);
    const ok = await installCamera(loc.id, loc.name, player.id);
    setInstallingCamera(false);
    if (ok) {
      setSelectedLocation('');
      setInstallMenu(false);
    }
  };
  
  const handleRemoveCamera = async (id) => {
    const ok = await removeCamera(id);
    if (!ok) alert('Не удалось удалить камеру.');
  };
  
  const rankLabel = rank === 'Patrolman' ? 'Патрульный' : rank || '—';
  
  return (
    <div className="fixed inset-0 z-[350] bg-[#020617] flex flex-col text-white font-sans">
      {/* Header */}
      <div className="shrink-0 h-24 px-6 bg-[#071006]/95 border-b border-[#68ff79]/15 backdrop-blur-sm z-50 flex items-center justify-between gta-panel gta-frame">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.45em] mb-1">
            {isMember ? (isInUniform ? 'НА СЛУЖБЕ' : 'СОТРУДНИК') : 'POLICE'}
          </p>
          <h1 className="text-xl font-black uppercase italic tracking-[0.18em] leading-none gta-title">
            LSPD Headquarters
          </h1>
          <p className="text-[9px] font-black uppercase mt-1 gta-label opacity-80">
            {isMember ? (isInUniform ? `Ранг: ${rankLabel}` : 'Сотрудник LSPD') : 'Los Santos Police Department'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-3 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition-all"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-4">
        
        {!isMember ? (
          /* === НЕ ЧЛЕН LSPD === */
          <>
            <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-6 rounded-2xl">
              <div className="text-5xl text-center mb-4">🚔</div>
              <div className="text-[10px] uppercase tracking-widest text-blue-400/70 font-black text-center mb-3">
                Департамент полиции Лос-Сантос
              </div>
              <div className="text-xs text-slate-300 space-y-2">
                <p>LSPD — это постоянная роль сотрудника полиции. Вы можете жить обычной жизнью, но в любой момент включиться в полицейскую деятельность.</p>
                <p className="text-[10px] text-slate-400">Как сотрудник вы получите доступ к:</p>
                <ul className="text-[10px] text-slate-400 list-disc pl-4 space-y-1">
                  <li>Запросам по автомобилям и личностям</li>
                  <li>Системе патрулирования районов</li>
                  <li>Розыску и задержанию преступников</li>
                  <li>Расследованию дел</li>
                  <li>Камерам наблюдения</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={handleJoin}
              disabled={joining}
              className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-wider text-sm transition-all
                ${joining 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-500/20'
                }`}
            >
              {joining ? 'Обработка...' : 'Вступить в LSPD'}
            </button>
          </>
        ) : !isInUniform ? (
          /* === ЧЛЕН LSPD, НО БЕЗ ФОРМЫ === */
          <>
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-6 rounded-2xl">
              <div className="text-5xl text-center mb-4">👔</div>
              <div className="text-[10px] uppercase tracking-widest text-amber-400/70 font-black text-center mb-3">
                Вы — сотрудник LSPD
              </div>
              <div className="text-xs text-slate-300 space-y-2 text-center">
                <p>Чтобы выйти на службу, наденьте полицейскую форму. После этого вам будет доступен патруль, запросы базы данных и камеры наблюдения.</p>
              </div>
            </div>
            
            <button
              onClick={handlePutOnUniform}
              className="w-full py-4 rounded-2xl font-black uppercase italic tracking-wider text-sm transition-all
                bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-500/20"
            >
              👮 Надеть форму
            </button>
          </>
        ) : (
          /* === НА СЛУЖБЕ (в форме) === */
          <>
            {/* Статус сотрудника */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-400 font-black">Статус сотрудника</p>
                  <p className="text-lg font-black italic text-white">{rankLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-400 font-black">Репутация</p>
                  <p className="text-xl font-black italic text-emerald-400">{reputation}</p>
                </div>
              </div>
              <button
                onClick={handleTakeOffUniform}
                className="w-full py-3 bg-slate-600/80 hover:bg-slate-500 rounded-xl text-white font-black uppercase italic text-xs transition-all active:scale-95"
              >
                👔 Снять форму (закончить смену)
              </button>
            </div>
            
            {/* Патруль */}
            <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-5 rounded-2xl">
              <p className="text-[9px] uppercase tracking-[0.3em] text-blue-400 font-black mb-3">Патруль</p>
              
              {onPatrol ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-black text-green-400 italic">
                      Активный — {patrolType === 'vehicle' ? 'Автомобильный' : 'Пеший'}
                      {patrolRoute && `: ${patrolRoute.name}`}
                    </span>
                  </div>
                  <button
                    onClick={handleEndPatrol}
                    className="w-full py-3 bg-red-600/80 hover:bg-red-500 rounded-xl text-white font-black uppercase italic text-xs transition-all active:scale-95"
                  >
                    Окончить патруль
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-slate-500 rounded-full" />
                    <span className="text-sm font-black text-slate-400 italic">Не активен</span>
                  </div>
                  {!patrolMenu ? (
                    <button
                      onClick={() => setPatrolMenu(true)}
                      className="w-full py-3 bg-blue-600/80 hover:bg-blue-500 rounded-xl text-white font-black uppercase italic text-xs transition-all active:scale-95"
                    >
                      Начать патруль
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {patrolStep === 'type' ? (
                        <>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black">Выберите тип:</p>
                          <button
                            onClick={() => handleSelectPatrolType('vehicle')}
                            className="w-full py-3 bg-blue-700 hover:bg-blue-600 rounded-xl text-white font-black uppercase italic text-xs transition-all active:scale-95"
                          >
                            🚗 Автомобильный патруль
                          </button>
                          <button
                            onClick={() => handleSelectPatrolType('foot')}
                            className="w-full py-3 bg-blue-700 hover:bg-blue-600 rounded-xl text-white font-black uppercase italic text-xs transition-all active:scale-95"
                          >
                            🚶 Пеший патруль
                          </button>
                          <button
                            onClick={() => setPatrolMenu(false)}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 font-black uppercase text-[10px] transition-all"
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black">
                            {(selectedPatrolType === 'vehicle' ? '🚗 Автомобильный' : '🚶 Пеший')} — выберите маршрут:
                          </p>
                          {patrolRoutes().length === 0 ? (
                            <p className="text-[9px] text-slate-500 text-center italic">Маршрутов пока нет. Создайте в редакторе дорог.</p>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartPatrol('')}
                                className="w-full py-3 bg-blue-700 hover:bg-blue-600 rounded-xl text-white font-black uppercase italic text-xs transition-all active:scale-95"
                              >
                                📍 Свободный патруль
                              </button>
                              {patrolRoutes().map(route => (
                                <button
                                  key={route.id}
                                  onClick={() => handleStartPatrol(route.id)}
                                  className="w-full py-3 bg-blue-700 hover:bg-blue-600 rounded-xl text-left transition-all active:scale-95"
                                >
                                  <p className="text-xs font-black uppercase italic text-white">{route.name}</p>
                                  <p className="text-[9px] text-blue-200">{route.description || `${route.stops.length} точек`}</p>
                                </button>
                              ))}
                            </>
                          )}
                          <button
                            onClick={() => setPatrolStep('type')}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 font-black uppercase text-[10px] transition-all"
                          >
                            ← Назад
                          </button>
                          <button
                            onClick={() => setPatrolMenu(false)}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 font-black uppercase text-[10px] transition-all"
                          >
                            Отмена
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Запросы (ТЗ 5.1, 5.2, 5.3) */}
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-5 rounded-2xl">
              <p className="text-[9px] uppercase tracking-[0.3em] text-amber-400 font-black mb-3">Запросы базы данных</p>
              
              <div className="space-y-3">
                {/* Запрос по авто */}
                <div className="flex items-center justify-between bg-black/30 rounded-xl p-3">
                  <div>
                    <p className="text-xs font-black text-white italic">🚗 Запрос по авто</p>
                    <p className="text-[9px] text-slate-400">Кулдаун: {canQueryVehicle() ? 'Готов' : `${cooldown.vehicle}с`}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${canQueryVehicle() ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                
                {/* Запрос по личности */}
                <div className="flex items-center justify-between bg-black/30 rounded-xl p-3">
                  <div>
                    <p className="text-xs font-black text-white italic">👤 Запрос по личности</p>
                    <p className="text-[9px] text-slate-400">Кулдаун: {canQueryPerson() ? 'Готов' : `${cooldown.person}с`}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${canQueryPerson() ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              </div>
              
              <p className="text-[9px] text-slate-500 mt-3 text-center">Функционал запросов скоро будет доступен</p>
            </div>
            
            {/* Камеры наблюдения */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 p-5 rounded-2xl">
              <button
                onClick={() => setCamerasOpen(!camerasOpen)}
                className="w-full flex items-center justify-between"
              >
                <p className="text-[9px] uppercase tracking-[0.3em] text-cyan-400 font-black">
                  📹 Камеры наблюдения ({cameras.length})
                </p>
                {camerasOpen ? <ChevronUp size={14} className="text-cyan-400" /> : <ChevronDown size={14} className="text-cyan-400" />}
              </button>
              
              {camerasOpen && (
                <div className="mt-3 space-y-3">
                  {cameras.length > 0 && (
                    <div className="space-y-2">
                      {cameras.map(cam => {
                        const remaining = cameraTimers[cam.id] || 0;
                        const mins = Math.floor(remaining / 60);
                        const secs = remaining % 60;
                        return (
                          <div key={cam.id} className="flex items-center justify-between bg-black/30 rounded-xl p-3">
                            <div className="flex-1">
                              <p className="text-xs font-black text-white italic">{cam.location_name}</p>
                              <p className="text-[9px] text-slate-400">
                                ⏱ Осталось: {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveCamera(cam.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-all"
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {!installMenu ? (
                    <button
                      onClick={() => setInstallMenu(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600/80 hover:bg-cyan-500 rounded-xl text-white font-black uppercase italic text-xs transition-all active:scale-95"
                    >
                      <Plus size={14} />
                      Установить камеру
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black">Выберите локацию:</p>
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full p-3 bg-black/40 border border-cyan-500/30 rounded-xl text-xs text-white font-black"
                      >
                        <option value="">— Выберите —</option>
                        {cameraLocations
                          .filter(loc => !occupiedLocationIds.includes(loc.id))
                          .map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.icon} {loc.name}</option>
                          ))
                        }
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={handleInstallCamera}
                          disabled={!selectedLocation || installingCamera}
                          className={`flex-1 py-3 rounded-xl font-black uppercase italic text-xs transition-all active:scale-95
                            ${!selectedLocation || installingCamera
                              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            }`}
                        >
                          {installingCamera ? 'Установка...' : 'Подтвердить'}
                        </button>
                        <button
                          onClick={() => { setInstallMenu(false); setSelectedLocation(''); }}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 font-black uppercase text-xs transition-all"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-[9px] text-slate-500 text-center">
                    Камера действует 2 часа. За установку +10 репутации
                  </p>
                </div>
              )}
            </div>
            
            {/* Скоро: Розыск и Дела */}
            <div className="bg-gradient-to-br from-slate-500/10 to-transparent border border-slate-500/20 p-5 rounded-2xl text-center">
              <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-black mb-2">Скоро</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p>🔍 Список розыска</p>
                <p>📁 Дела и расследования</p>
                <p>�️ Internal Affairs</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
