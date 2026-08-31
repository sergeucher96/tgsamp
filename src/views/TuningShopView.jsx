import React, { useState, useEffect } from 'react';
import { X, Gauge, Zap, Disc, Flame, Wrench, Shield, Check } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useVehicleStore, calculateEffectiveSpeed, calculateEffectiveAcceleration, calculateEffectiveHandling } from '../store/useVehicleStore';
import { TUNING_CONFIG, VEHICLE_DATABASE, HEALTH_PENALTIES, REPAIR_COST_PER_PERCENT } from '../data/vehicleConfig';

export default function TuningShopView({ onClose }) {
  const player = usePlayerStore(state => state.player);
  const { myVehicles, fetchVehicles, tuneVehicle, repairVehicle, repairVehicleForMoney, isLoading } = useVehicleStore();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState('engine');

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (myVehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(myVehicles[0]);
    }
    if (myVehicles.length > 0 && selectedVehicle) {
      const found = myVehicles.find(v => v.id === selectedVehicle.id);
      if (found) setSelectedVehicle(found);
    }
  }, [myVehicles]);

  if (!selectedVehicle) return null;

  const config = VEHICLE_DATABASE[selectedVehicle.model_id] || {};
  const health = selectedVehicle.health || 100;
  const effectiveSpeed = calculateEffectiveSpeed(selectedVehicle);
  const effectiveAccel = calculateEffectiveAcceleration(selectedVehicle);
  const effectiveHandling = calculateEffectiveHandling(selectedVehicle);

  let currentHealthPenalty = 0;
  for (const p of HEALTH_PENALTIES) {
    if (health <= p.threshold) {
      currentHealthPenalty = p.speedPenalty;
      break;
    }
  }

  const getStageInfo = (part, currentStage) => {
    if (part === 'nitro') return null;
    const cfg = TUNING_CONFIG[part];
    if (!cfg) return null;
    return cfg.stages[currentStage - 1] || null;
  };

  const getNextStage = (part) => {
    if (part === 'nitro') return null;
    const cfg = TUNING_CONFIG[part];
    if (!cfg) return null;
    const currentStage = selectedVehicle[`${part}_stage`] || 0;
    return cfg.stages[currentStage] || null;
  };

  const handleTune = async (part) => {
    if (part === 'nitro') {
      if (selectedVehicle.has_nitro) return;
      if (Number(player.money) < TUNING_CONFIG.nitro.price) return;
      await tuneVehicle(selectedVehicle.id, part);
    } else {
      const next = getNextStage(part);
      if (!next) return;
      if (Number(player.money) < next.price) return;
      await tuneVehicle(selectedVehicle.id, part, next.stage);
    }
  };

  const handleRepair = async () => {
    await repairVehicle(selectedVehicle.id);
  };

  const handleRepairForMoney = async () => {
    const currentHealth = selectedVehicle.health || 100;
    const damagePercent = Math.round(100 - currentHealth);
    const cost = damagePercent * REPAIR_COST_PER_PERCENT;
    if (Number(player.money) < cost) return;
    await repairVehicleForMoney(selectedVehicle.id);
  };

  const healthColor = health > 60 ? 'bg-emerald-500' : health > 30 ? 'bg-amber-500' : 'bg-red-500';

  const tabs = [
    { id: 'engine', icon: <Gauge size={16} />, label: 'Двигатель' },
    { id: 'suspension', icon: <Zap size={16} />, label: 'Подвеска' },
    { id: 'brakes', icon: <Disc size={16} />, label: 'Тормоза' },
    { id: 'nitro', icon: <Flame size={16} />, label: 'Нитро' },
  ];

  return (
    <div className="fixed inset-0 z-[300] bg-[#050814] flex flex-col text-white overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase italic">Тюнинг-салон</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Upgrades & Repairs</p>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <X size={20} />
        </button>
      </div>

      {/* Vehicle Selector */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {myVehicles.map(v => {
            const vConfig = VEHICLE_DATABASE[v.model_id] || {};
            const isSelected = v.id === selectedVehicle.id;
            return (
              <button
                key={v.id}
                onClick={() => { setSelectedVehicle(v); setActiveTab('engine'); }}
                className={`flex-shrink-0 w-28 p-3 rounded-2xl border transition-all ${
                  isSelected ? 'bg-blue-600/20 border-blue-400/50' : 'bg-white/5 border-white/10'
                }`}
              >
                <img src={`/vehicles/${v.model_id}_${v.color}.webp`} className="w-full h-14 object-contain mb-2"
                  onError={(e) => { e.target.src = '/car.png'; }} />
                <div className="text-[10px] font-black truncate">{vConfig.name || v.model_id}</div>
                <div className="text-[9px] text-slate-400">{v.plate || '—'}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-6 mb-4 grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <div className="text-[9px] uppercase text-slate-400 font-black">Скорость</div>
          <div className="text-lg font-black text-cyan-400">{effectiveSpeed}</div>
          {currentHealthPenalty > 0 && (
            <div className="text-[8px] text-red-400">-{(currentHealthPenalty * 100).toFixed(0)}%</div>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <div className="text-[9px] uppercase text-slate-400 font-black">Ускорение</div>
          <div className="text-lg font-black text-amber-400">{effectiveAccel}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <div className="text-[9px] uppercase text-slate-400 font-black">Управл.</div>
          <div className="text-lg font-black text-purple-400">{effectiveHandling}</div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="px-6 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-slate-400" />
              <span className="text-xs font-black uppercase">Состояние</span>
            </div>
            <span className={`text-sm font-black ${health > 60 ? 'text-emerald-400' : health > 30 ? 'text-amber-400' : 'text-red-400'}`}>
              {health.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full ${healthColor} transition-all`} style={{ width: `${health}%` }} />
          </div>
          {currentHealthPenalty > 0 && (
            <div className="text-[9px] text-red-400/70 mt-1">
              ⚠ Скорость снижена на {(currentHealthPenalty * 100).toFixed(0)}%
            </div>
          )}
          {health < 100 && (
            <div className="mt-3 space-y-2">
              <button onClick={handleRepairForMoney}
                className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 py-2 rounded-xl text-xs font-black uppercase transition-all"
                disabled={isLoading}>
                � Отремонтировать ({(Math.round(100 - health) * REPAIR_COST_PER_PERCENT).toLocaleString()} ₽)
              </button>
              <button onClick={handleRepair}
                className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 py-2 rounded-xl text-xs font-black uppercase transition-all">
                <Wrench size={12} className="inline mr-1" /> Починить (ремкомплект)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-3 flex gap-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-6 pb-8">
        {activeTab !== 'nitro' && (
          <>
            {(() => {
              const currentStage = selectedVehicle[`${activeTab}_stage`] || 0;
              const currentInfo = getStageInfo(activeTab, currentStage);
              return (
                <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{TUNING_CONFIG[activeTab].icon}</span>
                    <span className="text-xs font-black uppercase">{TUNING_CONFIG[activeTab].name}</span>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {TUNING_CONFIG[activeTab].stages.map((s, i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full ${i < currentStage ? 'bg-cyan-400' : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-black">{currentStage > 0 ? `Stage ${currentStage}` : 'Без улучшений'}</span>
                    {currentInfo && <div className="text-[10px] text-slate-400 mt-1">{currentInfo.desc}</div>}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const next = getNextStage(activeTab);
              if (!next) return (
                <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-2xl p-4 text-center">
                  <Check size={20} className="inline mr-1 text-cyan-400" />
                  <span className="text-sm font-black text-cyan-400">Максимальный уровень</span>
                </div>
              );
              const canAfford = Number(player.money) >= next.price;
              return (
                <button onClick={() => handleTune(activeTab)} disabled={!canAfford || isLoading}
                  className={`w-full p-4 rounded-2xl border font-black uppercase transition-all ${
                    canAfford ? 'bg-cyan-600/20 border-cyan-400/30 text-cyan-400 hover:bg-cyan-600/30 active:scale-95'
                      : 'bg-white/5 border-white/10 text-slate-500 opacity-50'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">{next.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{next.desc}</div>
                    </div>
                    <div className="text-lg">{next.price.toLocaleString()} ₽</div>
                  </div>
                </button>
              );
            })()}
          </>
        )}

        {activeTab === 'nitro' && (
          <>
            <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <Flame size={32} className={`mx-auto mb-2 ${selectedVehicle.has_nitro ? 'text-orange-400' : 'text-slate-600'}`} />
              <div className="text-sm font-black">{selectedVehicle.has_nitro ? 'Установлено' : 'Не установлено'}</div>
              <div className="text-[10px] text-slate-400 mt-1">{TUNING_CONFIG.nitro.desc}</div>
            </div>
            {!selectedVehicle.has_nitro && (
              <button onClick={() => handleTune('nitro')}
                disabled={Number(player.money) < TUNING_CONFIG.nitro.price || isLoading}
                className={`w-full p-4 rounded-2xl border font-black uppercase transition-all ${
                  Number(player.money) >= TUNING_CONFIG.nitro.price
                    ? 'bg-orange-600/20 border-orange-400/30 text-orange-400 hover:bg-orange-600/30 active:scale-95'
                    : 'bg-white/5 border-white/10 text-slate-500 opacity-50'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">{TUNING_CONFIG.nitro.icon} {TUNING_CONFIG.nitro.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{TUNING_CONFIG.nitro.desc}</div>
                  </div>
                  <div className="text-lg">{TUNING_CONFIG.nitro.price.toLocaleString()} ₽</div>
                </div>
              </button>
            )}
            {selectedVehicle.has_nitro && (
              <div className="bg-orange-500/10 border border-orange-400/30 rounded-2xl p-4 text-center">
                <Check size={20} className="inline mr-1 text-orange-400" />
                <span className="text-sm font-black text-orange-400">Нитро-ускоритель активен</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 
