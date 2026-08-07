import React, { useState } from 'react';
import { VEHICLE_DATABASE, VEHICLE_COLORS } from '../data/vehicleConfig';
import { useVehicleStore } from '../store/useVehicleStore';
import { ChevronLeft, ChevronRight, X, Zap, Fuel, ShoppingCart, Lock } from 'lucide-react';

export default function CarShowroom({ onClose, playerHouses, playerPos, showroomPos }) {
  const models = Object.keys(VEHICLE_DATABASE);
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

  return (
    <div className="fixed inset-0 z-[300] bg-[#050814] flex flex-col p-6 text-white overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Premium Motors</h2>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl"><X /></button>
      </div>
      <div className="flex items-center justify-between w-full mb-6">
        <button onClick={() => setModelIndex((modelIndex - 1 + models.length) % models.length)} className="p-4 bg-white/5 rounded-full"><ChevronLeft /></button>
        <h3 className="text-4xl font-black uppercase italic">{config.name}</h3>
        <button onClick={() => setModelIndex((modelIndex + 1) % models.length)} className="p-4 bg-white/5 rounded-full"><ChevronRight /></button>
      </div>
      <img src={`/vehicles/${models[modelIndex]}_${selectedColor}.webp`} className="w-full aspect-square object-contain drop-shadow-2xl mb-6" />
      <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[32px] mb-8">
          <span className="text-[10px] font-black text-slate-400 uppercase block mb-3">Гараж для доставки</span>
          <select value={selectedHouseId || ''} onChange={(e) => setSelectedHouseId(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-4 rounded-2xl outline-none font-bold text-white">
              {playerHouses.map(h => <option key={h.id_name} value={h.id_name}>{h.name}</option>)}
          </select>
      </div>
      <button disabled={!isAtShowroom || isLoading} onClick={handleBuy} className={`w-full py-6 rounded-[32px] font-black uppercase italic text-xl ${isAtShowroom ? 'bg-blue-600 shadow-blue-900/40' : 'bg-slate-800 opacity-50'}`}>
        {isLoading ? 'ОФОРМЛЕНИЕ...' : `КУПИТЬ ЗА $${config.price.toLocaleString()}`}
      </button>
    </div>
  );
}