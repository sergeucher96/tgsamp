import React from 'react';
import { X, Fuel, Wrench, Gauge, Settings, CarFront } from 'lucide-react';
import { VEHICLE_DATABASE, VEHICLE_COLORS, TUNING_CONFIG } from '../data/vehicleConfig';

export default function VehicleInfoMenu({ vehicle, onClose }) {
  if (!vehicle) return null;

  const cfg = VEHICLE_DATABASE[vehicle.model_id];
  const fuelMax = cfg?.fuelMax || vehicle.max_fuel || 100;
  const fuelPercent = Math.round((vehicle.fuel / fuelMax) * 100);
  const health = vehicle.health || 0;
  const mileage = Math.round(vehicle.mileage || 0);
  const colorData = VEHICLE_COLORS.find(c => c.id === vehicle.color);

  const tuningItems = [
    { key: 'engine_stage', ...TUNING_CONFIG.engine, current: vehicle.engine_stage || 0 },
    { key: 'suspension_stage', ...TUNING_CONFIG.suspension, current: vehicle.suspension_stage || 0 },
    { key: 'brakes_stage', ...TUNING_CONFIG.brakes, current: vehicle.brakes_stage || 0 },
  ];

  return (
    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full bg-[#0a0f1a] border-t sm:border border-white/10 sm:rounded-3xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px]">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <CarFront size={16} className="text-[#8cff4a]" />
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8cff4a]">Информация о транспорте</span>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          
          {/* Vehicle image + name */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                <img 
                  src={`/vehicles/${vehicle.model_id}_${vehicle.color}.webp`}
                  className="w-14 h-14 object-contain"
                  onError={(e) => { e.target.src = '/car.png'; }}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black uppercase italic text-white leading-none truncate">
                  {cfg?.name || vehicle.model_id}
                </h2>
                <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wider">{vehicle.plate}</p>
                {colorData && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: colorData.hex }} />
                    <span className="text-[10px] text-slate-400 font-bold">{colorData.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-5 mb-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 space-y-2.5">
              
              {/* Fuel */}
              <div className="flex items-center gap-3">
                <Fuel size={14} className="text-amber-400 shrink-0" />
                <span className="text-[11px] text-slate-300 w-14">Топливо</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${fuelPercent}%` }} />
                </div>
                <span className="text-[11px] font-bold text-slate-300 w-10 text-right">{fuelPercent}%</span>
              </div>

              {/* Health */}
              <div className="flex items-center gap-3">
                <Wrench size={14} className="text-emerald-400 shrink-0" />
                <span className="text-[11px] text-slate-300 w-14">Состояние</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${health > 50 ? 'bg-emerald-500' : health > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${health}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-300 w-10 text-right">{health}%</span>
              </div>

              {/* Mileage */}
              <div className="flex items-center gap-3">
                <Gauge size={14} className="text-blue-400 shrink-0" />
                <span className="text-[11px] text-slate-300 w-14">Пробег</span>
                <div className="flex-1" />
                <span className="text-[11px] font-bold text-slate-300 w-14 text-right">{mileage} км</span>
              </div>
            </div>
          </div>

          {/* Tuning */}
          <div className="px-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings size={12} className="text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Тюнинг</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 space-y-2">
              {tuningItems.map((tune) => (
                <div key={tune.key} className="flex items-center gap-3">
                  <span className="text-[13px] shrink-0">{tune.icon}</span>
                  <span className="text-[11px] text-slate-300 w-16">{tune.name}</span>
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((stage) => (
                      <div
                        key={stage}
                        className={`flex-1 h-1.5 rounded-full ${
                          tune.current >= stage ? 'bg-[#8cff4a]' : 'bg-white/5'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold w-6 text-right">{tune.current > 0 ? `S${tune.current}` : '-'}</span>
                </div>
              ))}
              
              {/* Nitro */}
              <div className="flex items-center gap-3 pt-1 border-t border-white/5">
                <span className="text-[13px] shrink-0">{TUNING_CONFIG.nitro.icon}</span>
                <span className="text-[11px] text-slate-300 w-16">{TUNING_CONFIG.nitro.name}</span>
                <div className="flex-1" />
                <span className={`text-[10px] font-bold uppercase ${vehicle.has_nitro ? 'text-[#8cff4a]' : 'text-slate-600'}`}>
                  {vehicle.has_nitro ? 'Установлен' : 'Нет'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-2" />
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
