import React from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useVehicleStore } from '../store/useVehicleStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { ArrowLeft, Fuel, Wrench, Gauge, Power, Settings2, CarFront } from 'lucide-react';

export default function GarageView() {
  const { currentGarage, setGarage } = useNavigationStore();
  const { myVehicles, setActiveVehicle, isLoading } = useVehicleStore();
  const player = usePlayerStore(state => state.player);

  const garageVehicles = (myVehicles || []).filter(v => v.house_id === currentGarage);

  return (
    <div className="h-full w-full bg-[#050814] flex flex-col text-white font-sans animate-in slide-in-from-right duration-500">
      
      <div className="shrink-0 p-8 flex justify-between items-center bg-gradient-to-b from-blue-900/20 to-transparent border-b border-white/5">
        <div className="text-left">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Технический сектор</p>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Мой Гараж</h2>
        </div>
        <button onClick={() => setGarage(null)} className="p-4 bg-white/5 text-white rounded-3xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-6 pb-32">
        {garageVehicles.map(veh => (
          <div key={veh.id} className={`bg-slate-900/50 border ${veh.is_active ? 'border-blue-500' : 'border-white/5'} rounded-[40px] p-6 shadow-2xl`}>
            <div className="flex items-center justify-between mb-6">
                <div className="text-left">
                    <h3 className="text-2xl font-black uppercase italic">{veh.model_id}</h3>
                    <span className="text-[10px] font-bold text-blue-500 uppercase">{veh.plate}</span>
                </div>
                <img src={`/vehicles/${veh.model_id}_${veh.color}.webp`} className="w-32 object-contain" onError={(e) => e.target.src='/car.png'} />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                    <Fuel size={14} className="mx-auto text-yellow-500 mb-1" />
                    <span className="text-[10px] font-black block">{Math.round(veh.fuel)}%</span>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                    <Wrench size={14} className="mx-auto text-red-500 mb-1" />
                    <span className="text-[10px] font-black block">{veh.health}%</span>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                    <Gauge size={14} className="mx-auto text-blue-500 mb-1" />
                    <span className="text-[10px] font-black block">{Math.round(veh.mileage || 0)} км</span>
                </div>
            </div>

            <button disabled={isLoading} onClick={() => setActiveVehicle(veh.is_active ? null : veh.id)}
                className={`w-full py-4 rounded-2xl font-black uppercase italic text-xs flex items-center justify-center gap-2 transition-all ${veh.is_active ? 'bg-red-600' : 'bg-blue-600 shadow-blue-900/20'}`}
            >
                <Power size={16} /> {veh.is_active ? 'Заглушить' : 'Выехать'}
            </button>
          </div>
        ))}

        {garageVehicles.length === 0 && <div className="py-20 text-center opacity-20"><CarFront size={80} className="mx-auto mb-4" /><p className="font-black uppercase italic">Гараж пуст</p></div>}
      </div>
    </div>
  );
}