import React, { useState } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { RESOURCE_PRICES } from '../data/economy';
import { Anchor, X, BadgeDollarSign, Truck, PackageCheck } from 'lucide-react';

export default function ExportView({ onClose }) {
  const { items, sellResource } = useInventoryStore();
  
  // Фильтруем только те вещи, которые можно продать (ресурсы)
  const sellableItems = items.filter(i => RESOURCE_PRICES[i.item_id]);

  return (
    <div className="fixed inset-0 z-[300] bg-[#020617] flex flex-col p-8 text-white font-sans animate-in fade-in">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-10">
        <div className="text-left">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Los Santos Port Authority</p>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter">Сбыт ресурсов</h2>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-75 transition-all">
          <X size={24} />
        </button>
      </div>

      {/* СПИСОК РЕСУРСОВ В СУМКЕ */}
      <div className="flex-grow overflow-y-auto no-scrollbar space-y-4 pb-20">
        {sellableItems.length > 0 ? (
          sellableItems.map(item => (
            <div key={item.id} className="bg-white/[0.03] border border-white/10 p-6 rounded-[32px] flex items-center justify-between shadow-xl">
               <div className="flex items-center gap-4">
                  <div className="text-4xl drop-shadow-lg">
                    {/* Берем иконку из базы предметов (можно импортировать ITEM_DATABASE) */}
                    📦 
                  </div>
                  <div className="text-left">
                    <h4 className="font-black uppercase italic text-white leading-none">{item.item_id}</h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 tracking-tighter">В наличии: {item.amount} шт.</p>
                  </div>
               </div>

               <button 
                onClick={() => sellResource(item, item.amount)}
                className="bg-green-600 hover:bg-green-500 px-5 py-3 rounded-2xl font-black italic text-xs shadow-lg active:scale-90 transition-all border border-green-400"
               >
                 ПРОДАТЬ ВСЁ (+${(RESOURCE_PRICES[item.item_id] * item.amount).toLocaleString()})
               </button>
            </div>
          ))
        ) : (
          <div className="h-64 flex flex-col items-center justify-center opacity-20">
             <Truck size={80} />
             <p className="mt-4 font-black uppercase italic tracking-widest text-sm">Нет товара для продажи</p>
          </div>
        )}
      </div>

      {/* ПРАЙС-ЛИСТ (Подсказка) */}
      <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-[32px]">
         <h4 className="text-[10px] font-black uppercase text-blue-400 mb-4 tracking-widest text-center">Текущие котировки порта</h4>
         <div className="grid grid-cols-3 gap-2">
            {Object.entries(RESOURCE_PRICES).map(([id, price]) => (
                <div key={id} className="bg-black/20 p-2 rounded-xl text-center">
                    <span className="block text-[8px] text-slate-500 uppercase font-black">{id}</span>
                    <span className="font-black text-xs text-green-500">${price}</span>
                </div>
            ))}
         </div>
      </div>

    </div>
  );
}