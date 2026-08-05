import React from 'react';
import { Play, ArrowLeftRight, Trash2, Clock, Shield, X } from 'lucide-react';
import { ITEM_DATABASE } from '../data/items';

export default function ItemActionMenu({ item, location, onUse, onTransfer, onDrop, onClose }) {
  const itemData = ITEM_DATABASE[item.item_id];
  
  if (!itemData) return null;

  // Расчет оставшегося времени для временных предметов
  const getTimeLeft = () => {
    if (!item.expires_at) return null;
    const diff = new Date(item.expires_at) - new Date();
    if (diff <= 0) return "Срок истек";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч. ${mins}м.`;
  };

  const timeLeft = getTimeLeft();

  return (
    <div className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-[40px] p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
            {itemData.icon}
          </div>
          <h3 className="text-xl font-black uppercase italic text-white leading-none">
            {itemData.name}
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-3 px-2 leading-relaxed">
            {itemData.desc}
          </p>
          
          {timeLeft && (
            <div className="mt-4 flex items-center justify-center gap-2 text-blue-400 bg-blue-500/10 py-2 rounded-2xl border border-blue-500/20">
              <Clock size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Истечет через: {timeLeft}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Кнопка Использовать */}
          {itemData.action && item.storage_type === 'player' && (
            <button 
              onClick={() => onUse(item)} 
              className="w-full bg-blue-600 text-white py-4 rounded-[20px] font-black uppercase italic text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
               <Play size={14} fill="currentColor" /> Использовать
            </button>
          )}

          {/* Кнопка Перемещения (если мы в доме) */}
          {location === 'house' && (
            <button 
              onClick={() => onTransfer(item)} 
              className="w-full bg-white/5 text-white py-4 rounded-[20px] font-black uppercase italic text-xs flex items-center justify-center gap-2 active:bg-white/10 transition-all border border-white/5"
            >
               <ArrowLeftRight size={14} /> {item.storage_type === 'player' ? 'В шкаф' : 'В сумку'}
            </button>
          )}

          {/* Кнопка Выбросить */}
          <button 
            onClick={() => onDrop(item)} 
            className="w-full bg-red-600/10 text-red-500 py-4 rounded-[20px] font-black uppercase italic text-xs flex items-center justify-center gap-2 active:bg-red-600/20 transition-all border border-red-600/10"
          >
             <Trash2 size={14} /> Выбросить
          </button>
        </div>

        <button 
          onClick={onClose} 
          className="mt-6 w-full text-slate-600 font-black uppercase text-[9px] tracking-[0.4em] active:text-white transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}