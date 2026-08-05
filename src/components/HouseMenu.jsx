import React from 'react';
import { X, DoorOpen, BadgeDollarSign, Navigation, Lock, Box, CarFront } from 'lucide-react';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { getHousePreview } from '../data/houseStyles';
import { useNavigationStore } from '../store/useNavigationStore';

export default function HouseMenu({ house, player, onBuy, onGPS, onClose }) {
  const setInterior = useNavigationStore(state => state.setInterior);
  
  const houseClass = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
  const isOwner = house.owner_id === player?.id;
  const houseNumber = house.id.replace('h_', '');
  const isAtHouse = Math.abs(player.pos_x - house.x) < 35 && Math.abs(player.pos_y - house.y) < 35;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 font-sans">
      <div className="w-full max-w-md bg-[#0a0f1e] rounded-[48px] border border-white/10 p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
        <div className="flex justify-between items-center mb-6 px-4">
          <div className="flex flex-col text-left text-white">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">ДОМ №{houseNumber}</h1>
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] mt-2 ${houseClass.color.replace('bg-', 'text-')}`}>{houseClass.name}</span>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-white active:scale-90"><X size={24} /></button>
        </div>

        <div className="relative w-full aspect-video rounded-[32px] overflow-hidden border border-white/5 mb-6 bg-slate-900">
          <img src={getHousePreview(house)} alt="House" className="w-full h-full object-cover" />
          {!house.owner_id && <div className="absolute bottom-4 right-4 bg-emerald-500 text-white px-5 py-2 rounded-2xl font-black italic shadow-xl border border-white/20">${houseClass.price.toLocaleString()}</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[28px] text-left text-white">
                <Box size={14} className="text-slate-500 mb-2" />
                <span className="text-xl font-black italic">{houseClass.wardrobe_slots} <small className="text-[10px] not-italic text-slate-500 uppercase tracking-widest">ячеек</small></span>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[28px] text-left text-white">
                <CarFront size={14} className="text-slate-500 mb-2" />
                <span className="text-xl font-black italic">{houseClass.garage_slots} <small className="text-[10px] not-italic text-slate-500 uppercase tracking-widest">мест</small></span>
            </div>
        </div>

        <div className="space-y-4 px-2">
          {!house.owner_id ? (
            isAtHouse ? (
              <button onClick={() => onBuy(house)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[32px] font-black uppercase italic text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3">
                <BadgeDollarSign size={24} /> КУПИТЬ ДОМ
              </button>
            ) : (
              <button onClick={() => onGPS(house)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[32px] font-black uppercase italic text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3">
                <Navigation size={24} /> ПРОЛОЖИТЬ МАРШРУТ
              </button>
            )
          ) : isOwner ? (
            <button 
              onClick={() => { setInterior(house.id); onClose(); }} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[32px] font-black uppercase italic text-lg active:scale-95 flex items-center justify-center gap-3"
            >
                <DoorOpen size={24} /> ВОЙТИ В ИНТЕРЬЕР
            </button>
          ) : (
            <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[32px] text-center text-red-500/50 font-black uppercase italic text-sm">ДОМ ЗАНЯТ</div>
          )}
        </div>
      </div>
    </div>
  );
}