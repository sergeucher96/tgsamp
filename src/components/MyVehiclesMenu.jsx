import React from 'react';
import { X, Navigation, CarFront, Fuel, Wrench, Gauge, MapPin } from 'lucide-react';
import { VEHICLE_DATABASE } from '../data/vehicleConfig';
import { useVehicleStore } from '../store/useVehicleStore';
import { useTravelStore } from '../store/useTravelStore';
import { LOCATIONS } from '../data/locations';

export default function MyVehiclesMenu({ onClose }) {
  const myVehicles = useVehicleStore(state => state.myVehicles);
  const startRoute = useTravelStore(state => state.startRoute);
  const setActiveVehicle = useVehicleStore(state => state.setActiveVehicle);

  const getVehicleStatus = (vehicle) => {
    if (vehicle.is_active) {
      return { text: 'Сейчас в использовании', color: 'text-[#8cff4a]', bg: 'bg-[#8cff4a]/10' };
    }
    if (vehicle.house_id) {
      const houseLoc = LOCATIONS.find(l => l.id === vehicle.house_id);
      if (houseLoc) {
        return { text: `В гараже ${houseLoc.name}`, color: 'text-blue-400', bg: 'bg-blue-500/10' };
      }
      return { text: `В гараже дома #${vehicle.house_id.replace('h_', '')}`, color: 'text-blue-400', bg: 'bg-blue-500/10' };
    }
    return { text: 'Неизвестное местоположение', color: 'text-slate-400', bg: 'bg-white/5' };
  };

  const handleGPS = (vehicle) => {
    const houseLoc = LOCATIONS.find(l => l.id === vehicle.house_id);
    if (houseLoc) {
      startRoute(houseLoc.id);
    }
    onClose();
  };

  const handleSetActive = async (vehicleId) => {
    await setActiveVehicle(vehicleId);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full bg-[#0a0f1a] border-t sm:border border-white/10 sm:rounded-3xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px]">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <CarFront size={16} className="text-[#8cff4a]" />
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8cff4a]">Мой транспорт</span>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {myVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <CarFront size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-black uppercase">Нет транспорта</p>
              <p className="text-[10px] text-slate-500 mt-1">Посетите автосалон для покупки</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {myVehicles.map((vehicle) => {
                const cfg = VEHICLE_DATABASE[vehicle.model_id];
                const status = getVehicleStatus(vehicle);
                const fuelMax = cfg?.fuelMax || vehicle.max_fuel || 100;
                const fuelPercent = Math.round((vehicle.fuel / fuelMax) * 100);
                const health = vehicle.health || 0;

                return (
                  <div key={vehicle.id} className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                        <img
                          src={`/vehicles/${vehicle.model_id}_${vehicle.color}.webp`}
                          className="w-10 h-10 object-contain"
                          onError={(e) => { e.target.src = '/car.png'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black uppercase italic text-white truncate">
                          {cfg?.name || vehicle.model_id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold tracking-wider">{vehicle.plate}</div>
                        <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${status.bg} ${status.color}`}>
                          <MapPin size={10} />
                          {status.text}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Fuel size={12} className="text-amber-400 shrink-0" />
                        <span className="text-[10px] text-slate-300 w-12">Топливо</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fuelPercent}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 w-8 text-right">{fuelPercent}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wrench size={12} className="text-emerald-400 shrink-0" />
                        <span className="text-[10px] text-slate-300 w-12">Состояние</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${health > 50 ? 'bg-emerald-500' : health > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${health}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 w-8 text-right">{health}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gauge size={12} className="text-blue-400 shrink-0" />
                        <span className="text-[10px] text-slate-300 w-12">Пробег</span>
                        <div className="flex-1" />
                        <span className="text-[10px] font-bold text-slate-300 w-12 text-right">{Math.round(vehicle.mileage || 0)} км</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {!vehicle.is_active && (
                        <button
                          onClick={() => handleSetActive(vehicle.id)}
                          className="flex items-center justify-center gap-2 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 py-2.5 rounded-2xl font-black uppercase text-[11px] transition-all active:scale-95"
                        >
                          <CarFront size={14} />
                          Использовать
                        </button>
                      )}
                      {vehicle.house_id && (
                        <button
                          onClick={() => handleGPS(vehicle)}
                          className="flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 py-2.5 rounded-2xl font-black uppercase text-[11px] transition-all active:scale-95"
                        >
                          <Navigation size={14} />
                          Маршрут
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="shrink-0 p-4 pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-2xl font-black uppercase text-xs tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <X size={14} />
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
