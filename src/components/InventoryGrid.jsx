import React from 'react';
import { ITEM_DATABASE } from '../data/items';
import { isImageIcon } from '../utils/iconHelper';

export default function InventoryGrid({ items = [], slotsCount = 12, onAction, label }) {
  
  const renderSlots = () => {
    const slots = [];
    for (let i = 0; i < slotsCount; i++) {
      const item = items[i] || null; // Берем предмет по индексу из массива

      slots.push(
        <div 
          key={i}
          onClick={() => item && onAction(item)}
          className={`
            aspect-square rounded-2xl flex items-center justify-center relative transition-all duration-200
            ${item 
              ? 'bg-blue-600/10 border-2 border-blue-500/40 active:scale-90 cursor-pointer shadow-lg' 
              : 'bg-white/[0.02] border border-white/5 opacity-40'
            }
          `}
        >
          {item ? (
            <>
              {isImageIcon(ITEM_DATABASE[item.item_id]?.icon) ? (
                <img src={ITEM_DATABASE[item.item_id].icon} className="w-8 h-8 object-contain drop-shadow-md" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span className="text-3xl drop-shadow-md">{ITEM_DATABASE[item.item_id]?.icon || '❓'}</span>
              )}
              {item.amount > 1 && (
                <span className="absolute bottom-1.5 right-1.5 bg-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-lg border border-white/20 shadow-md">
                  {item.amount}
                </span>
              )}
            </>
          ) : (
            <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
          )}
        </div>
      );
    }
    return slots;
  };

  return (
    <div className="space-y-4">
      {label && (
        <div className="flex justify-between items-center px-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{label}</p>
            <p className="text-[10px] font-black uppercase text-blue-500/50">{items.length} / {slotsCount}</p>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3">
        {renderSlots()}
      </div>
    </div>
  );
}