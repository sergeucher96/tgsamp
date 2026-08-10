import React, { useState } from 'react';
import { VEHICLE_DATABASE, VEHICLE_COLORS } from '../data/vehicleConfig';
import { useVehicleStore } from '../store/useVehicleStore';
import { ChevronLeft, ChevronRight, X, Zap, Fuel, Gauge, ShoppingCart, ArrowDownToLine } from 'lucide-react';

export default function CarShowroom({ onClose, playerHouses, playerPos, showroomPos }) {
  const models = Object.keys(VEHICLE_DATABASE).filter(m => VEHICLE_DATABASE[m].price > 0);
  const [modelIndex, setModelIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('white');
  const [selectedHouseId, setSelectedHouseId] = useState(playerHouses[0]?.id_name || null);

  const config = VEHICLE_DATABASE[models[modelIndex]];
  const { buyVehicle, isLoading } = useVehicleStore();
  const isAtShowroom = Math.hypot(playerPos.x - showroomPos.x, playerPos.y - showroomPos.y) < 50;

  const handleBuy = async () => {
    if (!isAtShowroom) return alert("Вы далеко!");
    const house = playerHouses.find(h => h.id_name === selectedHouseId);
    if (await buyVehicle(models[modelIndex], selectedColor, house)) onClose();
  };

  const maxSpeed = 950;

  return (
    <div className="fixed inset-0 z-[300] bg-[#080c14] flex flex-col text-white overflow-y-auto no-scrollbar">
      
      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-5 pb-3">
        <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl active:scale-90 transition-all">
          <X size={20} />
        </button>
        <h2 className="text-lg font-black uppercase italic tracking-tight">Автосалон</h2>
        <div className="w-10" />
      </div>

      {/* Model navigation */}
      <div className="flex items-center justify-between px-5 mb-3">
        <button onClick={() => setModelIndex((modelIndex - 1 + models.length) % models.length)} 
          className="p-3 bg-white/5 rounded-xl active:scale-90 transition-all">
          <ChevronLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h3 className="text-2xl font-black uppercase italic">{config.name}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{config.desc}</p>
        </div>
        <button onClick={() => setModelIndex((modelIndex + 1) % models.length)} 
          className="p-3 bg-white/5 rounded-xl active:scale-90 transition-all">
          <ChevronRight size={22} className="text-slate-300" />
        </button>
      </div>

      {/* Car image */}
      <div className="px-5 mb-4">
        <div className="bg-gradient-to-b from-white/[0.03] to-transparent rounded-3xl p-6 border border-white/5">
          <img 
            src={`/vehicles/${models[modelIndex]}_${selectedColor}.webp`} 
            className="w-full aspect-[4/3] object-contain drop-shadow-2xl" 
          />
        </div>
      </div>

      {/* Color picker */}
      <div className="px-5 mb-4">
        <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Цвет</div>
        <div className="flex gap-2 flex-wrap">
          {config.colors.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              className={`w-9 h-9 rounded-full border-2 transition-all active:scale-90 ${selectedColor === c ? 'border-white scale-110' : 'border-white/20'}`}
              style={{ backgroundColor: VEHICLE_COLORS.find(v => v.id === c)?.hex || c }}
            />
          ))}
        </div>
      </div>

      {/* Characteristics */}
      <div className="px-5 mb-4">
        <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Характеристики</div>
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 space-y-2.5">
          {/* Speed */}
          <div className="flex items-center gap-3">
            <Gauge size={16} className="text-blue-400 shrink-0" />
            <span className="text-[11px] text-slate-300 w-16">Скорость</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(config.speed / maxSpeed) * 100}%` }} />
            </div>
            <span className="text-[11px] font-bold text-slate-300 w-14 text-right">{config.speed} км/ч</span>
          </div>
          {/* Fuel */}
          <div className="flex items-center gap-3">
            <Fuel size={16} className="text-amber-400 shrink-0" />
            <span className="text-[11px] text-slate-300 w-16">Топливо</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(config.fuelMax / 300) * 100}%` }} />
            </div>
            <span className="text-[11px] font-bold text-slate-300 w-14 text-right">{config.fuelMax} л</span>
          </div>
          {/* Fuel type */}
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-emerald-400 shrink-0" />
            <span className="text-[11px] text-slate-300 w-16">Бензин</span>
            <div className="flex-1" />
            <span className="text-[11px] font-bold text-slate-300 w-14 text-right">АИ-{config.fuelType}</span>
          </div>
        </div>
      </div>

      {/* Garage selector */}
      <div className="px-5 mb-4">
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3">
          <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Доставка в гараж</div>
          <select 
            value={selectedHouseId || ''} 
            onChange={(e) => setSelectedHouseId(e.target.value)} 
            className="w-full bg-slate-900 border border-white/10 p-3 rounded-xl outline-none font-bold text-sm text-white"
          >
            {playerHouses.map(h => <option key={h.id_name} value={h.id_name}>{h.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1" />

      {/* Buy button */}
      <div className="px-5 pb-6 pt-3">
        <button 
          disabled={!isAtShowroom || isLoading} 
          onClick={handleBuy} 
          className={`w-full py-4 rounded-2xl font-black uppercase text-lg transition-all active:scale-[0.98] ${
            isAtShowroom 
              ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/40' 
              : 'bg-slate-800 opacity-50 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Оформление...' : (
            <div className="flex items-center justify-center gap-2">
              <ArrowDownToLine size={20} />
              {config.price.toLocaleString()} ₽
            </div>
          )}
        </button>
        {!isAtShowroom && (
          <div className="text-center text-[10px] text-slate-500 mt-2">Приедьте в автосалон для покупки</div>
        )}
      </div>
    </div>
  );
}