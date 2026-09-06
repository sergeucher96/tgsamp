import React from 'react';
import { ITEM_DATABASE } from '../data/items';
import { useItemCategoryStore } from '../store/useItemCategoryStore';
import { isImageIcon } from '../utils/iconHelper';

export default function InventoryGrid({ items = [], slotsCount = 12, onAction }) {
  const { items: dbItems } = useItemCategoryStore();
  
  const getItemInfo = (itemId) => {
    const dbItem = dbItems.find(i => i.item_key === itemId);
    if (dbItem) {
      return { name: dbItem.item_name, icon: dbItem.icon || '📦', type: dbItem.type };
    }
    return ITEM_DATABASE[itemId] || null;
  };

  const getCategoryColor = (type) => {
    if (type === 'food') return 'border-emerald-500/40 bg-emerald-500/10 shadow-emerald-900/20';
    if (type === 'resource') return 'border-amber-500/40 bg-amber-500/10 shadow-amber-900/20';
    if (type === 'tool') return 'border-sky-500/40 bg-sky-500/10 shadow-sky-900/20';
    return 'border-blue-500/40 bg-blue-500/10 shadow-blue-900/20';
  };

  const renderSlots = () => {
    const slots = [];
    for (let i = 0; i < slotsCount; i++) {
      const item = items[i] || null;
      const itemInfo = item ? getItemInfo(item.item_id) : null;
      const categoryColor = item ? getCategoryColor(itemInfo?.type) : '';

      slots.push(
        <div 
          key={i}
          onClick={() => item && onAction(item)}
          className={`
            aspect-square rounded-2xl flex items-center justify-center relative transition-all duration-200
            ${item 
              ? `${categoryColor} cursor-pointer active:scale-90 shadow-lg backdrop-blur-sm` 
              : 'bg-gradient-to-br from-white/[0.02] to-white/[0.01] border border-white/5'
            }
          `}
        >
          {item ? (
            <>
              {isImageIcon(itemInfo?.icon) ? (
                <img src={itemInfo.icon} className="w-8 h-8 object-contain drop-shadow-md" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span className="text-3xl drop-shadow-md">{itemInfo?.icon || '❓'}</span>
              )}
              {item.amount > 1 && (
                <span className="absolute bottom-1 right-1 bg-slate-900/80 backdrop-blur-sm text-[9px] font-black px-1.5 py-0.5 rounded-lg border border-white/10 shadow-md text-white">
                  {item.amount}
                </span>
              )}
            </>
          ) : (
            <div className="w-1.5 h-1.5 bg-white/[0.06] rounded-full" />
          )}
        </div>
      );
    }
    return slots;
  };

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {renderSlots()}
    </div>
  );
}