import React from 'react';
import { Car, X, Navigation, Info, DoorOpen } from 'lucide-react';

export default function ShowroomMenu({ showroom, onGPS, onClose, isPlayerHere, onOpen }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0a0f1e] rounded-[48px] border border-white/10 p-8 pb-10 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/20">
              <Car className="text-white" size={28} />
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-white">{showroom.name}</h2>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Автосалон</span>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-white"><X /></button>
        </div>

        <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[32px] mb-8 text-left text-slate-300 italic text-sm">
            {showroom.desc}
        </div>

        {isPlayerHere ? (
            <button onClick={() => { onOpen(); onClose(); }} className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black uppercase italic text-lg active:scale-95 flex items-center justify-center gap-4">
                <DoorOpen /> ВОЙТИ В САЛОН
            </button>
        ) : (
            <button onClick={() => onGPS(showroom)} className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black uppercase italic text-lg active:scale-95 flex items-center justify-center gap-4">
                <Navigation /> ПРОЛОЖИТЬ МАРШРУТ
            </button>
        )}
      </div>
    </div>
  );
}