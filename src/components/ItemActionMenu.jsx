import React from 'react';
import { Play, ArrowLeftRight, Trash2, Clock, X } from 'lucide-react';
import { ITEM_DATABASE } from '../data/items';
import { useItemCategoryStore } from '../store/useItemCategoryStore';
import { isImageIcon } from '../utils/iconHelper';

export default function ItemActionMenu({ item, location, onUse, onTransfer, onDrop, onClose }) {
  const { items: dbItems } = useItemCategoryStore();
  
  const dbItem = dbItems.find(i => i.item_key === item.item_id);
  const itemData = dbItem
    ? { name: dbItem.item_name, icon: dbItem.icon || '�', desc: dbItem.description || '', type: dbItem.type }
    : ITEM_DATABASE[item.item_id];
  
  if (!itemData) return null;

  const getTimeLeft = () => {
    if (!item.expires_at) return null;
    const diff = new Date(item.expires_at) - new Date();
    if (diff <= 0) return "Срок истек";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${mins}м`;
  };

  const timeLeft = getTimeLeft();

  const categoryBg = (type) => {
    if (type === 'food') return 'from-emerald-500/20 to-emerald-900/30 border-emerald-500/30';
    if (type === 'resource') return 'from-amber-500/20 to-amber-900/30 border-amber-500/30';
    if (type === 'tool') return 'from-sky-500/20 to-sky-900/30 border-sky-500/30';
    return 'from-blue-500/20 to-blue-900/30 border-blue-500/30';
  };

  return (
    <div className="fixed inset-0 z-[1001] bg-black/70 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-xs rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header с иконкой */}
        <div className={`relative bg-gradient-to-br ${categoryBg(itemData.type)} border p-6 pb-8 text-center`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            <X size={14} />
          </button>
          
          <div className="text-6xl mb-3 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] inline-block">
            {isImageIcon(itemData.icon) ? (
              <img src={itemData.icon} className="w-16 h-16 object-contain mx-auto" />
            ) : (
              itemData.icon
            )}
          </div>
          <h3 className="text-lg font-black uppercase italic text-white leading-none tracking-tight">
            {itemData.name}
          </h3>
          {item.amount > 1 && (
            <p className="text-[9px] font-black uppercase text-slate-400 mt-1">× {item.amount}</p>
          )}
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-3 px-4 leading-relaxed">
            {itemData.desc}
          </p>

          {timeLeft && (
            <div className="mt-3 flex items-center justify-center gap-2 text-white/90 bg-white/5 py-2 rounded-xl">
              <Clock size={12} />
              <span className="text-[10px] font-black uppercase">Осталось: {timeLeft}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-slate-900/95 p-5 space-y-2.5">
          {itemData.action && item.storage_type === 'player' && (
            <button 
              onClick={() => onUse(item)} 
              className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-2xl font-black uppercase italic text-xs flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-blue-900/30"
            >
              <Play size={14} fill="currentColor" /> Использовать
            </button>
          )}

          {location === 'house' && (
            <button 
              onClick={() => onTransfer(item)} 
              className="w-full bg-white/5 text-white py-3.5 rounded-2xl font-black uppercase italic text-xs flex items-center justify-center gap-2 active:bg-white/10 transition-all border border-white/10"
            >
              <ArrowLeftRight size={14} /> {item.storage_type === 'player' ? 'Переложить в шкаф' : 'Взять в сумку'}
            </button>
          )}

          <button 
            onClick={() => onDrop(item)} 
            className="w-full bg-red-500/10 text-red-400 py-3.5 rounded-2xl font-black uppercase italic text-xs flex items-center justify-center gap-2 active:bg-red-500/20 transition-all border border-red-500/20"
          >
            <Trash2 size={14} /> Выбросить
          </button>
        </div>
      </div>
    </div>
  );
}