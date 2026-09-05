import React from 'react';
import { X, Navigation, DoorOpen, Home, CarFront, BedDouble, Box } from 'lucide-react';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { useNavigationStore } from '../store/useNavigationStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTravelStore } from '../store/useTravelStore';
import { useHouseStore } from '../store/useHouseStore';

export default function MyPropertyMenu({ onClose }) {
  const player = usePlayerStore(state => state.player);
  const dbHouses = useHouseStore(state => state.dbHouses);
  const startRoute = useTravelStore(state => state.startRoute);
  const setInterior = useNavigationStore(state => state.setInterior);

  const ownedHouses = (dbHouses || []).filter(h => h.owner_id === player?.id);

  const handleEnterHouse = (house) => {
    if (!player) return;
    const activeVehicle = usePlayerStore.getState().activeVehicle;
    if (activeVehicle) {
      usePlayerStore.getState().setLocalActiveVehicle(null);
    }
    setInterior(house.id_name);
    onClose();
  };

  const handleGPS = (house) => {
    startRoute(house.id_name);
    onClose();
  };

  const isAtHouse = (house) => {
    if (!player) return false;
    return Math.abs(player.pos_x - house.x) < 35 && Math.abs(player.pos_y - house.y) < 35;
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full bg-[#0a0f1a] border-t sm:border border-white/10 sm:rounded-3xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px]">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Home size={16} className="text-[#8cff4a]" />
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8cff4a]">Моя недвижимость</span>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {ownedHouses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Home size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-black uppercase">Нет недвижимости</p>
              <p className="text-[10px] text-slate-500 mt-1">Посетите агента недвижимости для покупки дома</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {ownedHouses.map((house) => {
                const houseClass = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
                const dailyTax = Math.round(houseClass.price * 0.001);
                const atHouse = isAtHouse(house);

                return (
                  <div key={house.id_name} className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-black uppercase italic text-white">
                          {house.name || `Дом #${house.id_name.replace('h_', '')}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{houseClass.name}</div>
                      </div>
                      <div className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${houseClass.color} text-white`}>
                        {houseClass.name}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center">
                        <CarFront size={12} className="text-slate-500 mx-auto mb-1" />
                        <span className="text-[11px] font-black text-white block">{house.garage_slots || 0}</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Гараж</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center">
                        <BedDouble size={12} className="text-slate-500 mx-auto mb-1" />
                        <span className="text-[11px] font-black text-white block">{houseClass.bedrooms || 1}</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Спальни</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center">
                        <Box size={12} className="text-slate-500 mx-auto mb-1" />
                        <span className="text-[11px] font-black text-white block">{houseClass.wardrobe_slots}</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Ячеек</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-3 text-[11px]">
                      <span className="text-slate-400">Налог в день</span>
                      <span className="text-white font-black">${dailyTax.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleGPS(house)}
                        className="flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 py-2.5 rounded-2xl font-black uppercase text-[11px] transition-all active:scale-95"
                      >
                        <Navigation size={14} />
                        Маршрут
                      </button>
                      {atHouse && (
                        <button
                          onClick={() => handleEnterHouse(house)}
                          className="flex items-center justify-center gap-2 bg-teal-600/20 border border-teal-500/30 hover:bg-teal-600/30 py-2.5 rounded-2xl font-black uppercase text-[11px] transition-all active:scale-95"
                        >
                          <DoorOpen size={14} />
                          Войти
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
