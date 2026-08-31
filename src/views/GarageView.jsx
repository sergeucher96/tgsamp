import React, { useState } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useVehicleStore } from '../store/useVehicleStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { VEHICLE_DATABASE, VEHICLE_COLORS } from '../data/vehicleConfig';
import { ArrowLeft, Fuel, Wrench, Gauge, Power, Paintbrush, ParkingCircle } from 'lucide-react';

export default function GarageView() {
  const { currentGarage, setGarage, exitHouse, exitGarage } = useNavigationStore();
  const { myVehicles, setActiveVehicle, isLoading, repairVehicle, parkVehicle } = useVehicleStore();
  const activeVehicle = usePlayerStore(state => state.activeVehicle);
  const player = usePlayerStore(state => state.player);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [paintingVehicle, setPaintingVehicle] = useState(null);

  const handleDriveAway = async (vehicleId) => {
    await useVehicleStore.getState().leaveGarage(vehicleId);
    exitHouse();
    exitGarage();
  };

  const garageVehicles = (myVehicles || []).filter(v => v.house_id === currentGarage);

  const handlePaint = async (veh, color) => {
    const { supabase } = await import('../api/supabase');
    const { error } = await supabase.from('vehicles').update({ color }).eq('id', veh.id);
    if (!error) {
      await useVehicleStore.getState().fetchVehicles();
      setPaintingVehicle(null);
    }
  };

  // Detailed vehicle view
  if (selectedVehicle) {
    const veh = selectedVehicle;
    const cfg = VEHICLE_DATABASE[veh.model_id];
    const fuelPercent = cfg?.fuelMax ? Math.round((veh.fuel / cfg.fuelMax) * 100) : 0;

    return (
      <div className="fixed inset-0 z-[300] bg-[#080c14] flex flex-col text-white">
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-4 pb-2">
          <button onClick={() => setSelectedVehicle(null)} className="p-2.5 bg-white/5 rounded-xl active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <div className="text-lg font-black uppercase italic">{cfg?.name || veh.model_id}</div>
            <div className="text-[10px] text-slate-400 font-bold">{veh.plate}</div>
          </div>
          <div className="w-10" />
        </div>

        {/* Car image */}
        <div className="px-5 mb-4">
          <div className="bg-gradient-to-b from-white/[0.03] to-transparent rounded-3xl p-6 border border-white/5">
            <img 
              src={`/vehicles/${veh.model_id}_${veh.color}.webp`} 
              className="w-full aspect-[4/3] object-contain drop-shadow-2xl"
              onError={(e) => e.target.src='/car.png'}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 mb-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <Fuel size={16} className="text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-300 w-16">Топливо</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fuelPercent}%` }} />
              </div>
              <span className="text-[11px] font-bold text-slate-300 w-10 text-right">{fuelPercent}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Wrench size={16} className="text-emerald-400 shrink-0" />
              <span className="text-[11px] text-slate-300 w-16">Состояние</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${veh.health > 50 ? 'bg-emerald-500' : veh.health > 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${veh.health}%` }} />
              </div>
              <span className="text-[11px] font-bold text-slate-300 w-10 text-right">{veh.health}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Gauge size={16} className="text-blue-400 shrink-0" />
              <span className="text-[11px] text-slate-300 w-16">Пробег</span>
              <div className="flex-1" />
              <span className="text-[11px] font-bold text-slate-300 w-14 text-right">{Math.round(veh.mileage || 0)} км</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setPaintingVehicle(veh)}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
            >
              <Paintbrush size={16} /> Покрасить
            </button>
            <button 
              onClick={() => repairVehicle(veh.id)}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
            >
              <Wrench size={16} /> Починить
            </button>
          </div>
          {activeVehicle && activeVehicle.id !== veh.id && (
            <button 
              onClick={() => {
                parkVehicle(activeVehicle.id, currentGarage);
                setSelectedVehicle(null);
              }}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500/30 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
            >
              <ParkingCircle size={16} /> Запарковать "{VEHICLE_DATABASE[activeVehicle.model_id]?.name || activeVehicle.model_id}" сюда
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* Drive button */}
        <div className="px-5 pb-6 pt-3">
          <button 
            disabled={isLoading} 
            onClick={() => {
              if (veh.is_active) handleDriveAway(veh.id);
              else {
                setActiveVehicle(veh.id);
                // After setting active, open garage so user can choose to drive
                exitHouse();
                exitGarage();
              }
            }}
            className={`w-full py-4 rounded-2xl font-black uppercase text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              veh.is_active 
                ? 'bg-emerald-600 shadow-lg shadow-emerald-900/40' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/40'
            }`}
          >
            <Power size={20} /> {veh.is_active ? 'Выехать' : 'Выставить'}
          </button>
        </div>

        {/* Paint modal */}
        {paintingVehicle?.id === veh.id && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-end">
            <div className="w-full bg-[#0c1020] rounded-t-3xl p-6">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-3">Выберите цвет</div>
              <div className="flex gap-3 flex-wrap mb-6">
                {cfg?.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => handlePaint(veh, c)}
                    className={`w-12 h-12 rounded-full border-3 transition-all active:scale-90 ${veh.color === c ? 'border-white scale-110' : 'border-white/20'}`}
                    style={{ backgroundColor: VEHICLE_COLORS.find(v => v.id === c)?.hex || c }}
                  />
                ))}
              </div>
              <button onClick={() => setPaintingVehicle(null)} className="w-full py-3 bg-white/5 rounded-2xl font-black uppercase text-sm">Отмена</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vehicle list
  return (
    <div className="fixed inset-0 z-[300] bg-[#080c14] flex flex-col text-white">
      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-5 pb-3">
        <button onClick={() => setGarage(null)} className="p-2.5 bg-white/5 rounded-xl active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-black uppercase italic tracking-tight">Мой гараж</h2>
        <div className="w-10" />
      </div>

      {garageVehicles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
          <Gauge size={48} className="mb-3 opacity-30" />
          <p className="text-sm font-black uppercase">Гараж пуст</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-5 space-y-3">
          {garageVehicles.map(veh => {
            const cfg = VEHICLE_DATABASE[veh.model_id];
            return (
              <button
                key={veh.id}
                onClick={() => setSelectedVehicle(veh)}
                className={`w-full bg-white/[0.03] border ${veh.is_active ? 'border-blue-500/50' : 'border-white/5'} rounded-2xl p-3 flex items-center gap-4 text-left active:scale-[0.98] transition-all`}
              >
                <img 
                  src={`/vehicles/${veh.model_id}_${veh.color}.webp`} 
                  className="w-20 h-20 rounded-xl object-contain bg-white/5 shrink-0"
                  onError={(e) => e.target.src='/car.png'}
                />
                <div className="flex-1">
                  <div className="font-black text-sm uppercase italic">{cfg?.name || veh.model_id}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{veh.plate}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Fuel size={10} className="text-amber-400" />
                      <span className="text-[10px] text-slate-400">{Math.round((veh.fuel / (cfg?.fuelMax || 1)) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wrench size={10} className="text-emerald-400" />
                      <span className="text-[10px] text-slate-400">{veh.health}%</span>
                    </div>
                  </div>
                </div>
                {veh.is_active && (
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}