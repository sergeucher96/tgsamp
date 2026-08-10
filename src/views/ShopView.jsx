import React from 'react';
import { ShoppingBag, X, Wallet, Info } from 'lucide-react';
import { SHOPS_DATABASE } from '../data/shops';
import { ITEM_DATABASE } from '../data/items';
import { CLOTHING_DATABASE } from '../data/clothingConfig';
import { EQUIPMENT_SLOTS } from '../data/clothingConfig';
import { useInventoryStore } from '../store/useInventoryStore';

export default function ShopView({ shopType, player, onClose }) {
  const shopData = SHOPS_DATABASE[shopType] || SHOPS_DATABASE['shop_24_7'];
  const buyItem = useInventoryStore(state => state.buyItem);

  const getItemInfo = (itemId) => {
    return ITEM_DATABASE[itemId] || CLOTHING_DATABASE[itemId];
  };

  const handleBuy = async (item) => {
    await buyItem(item.id, item.price, 1);
  };

  const hasClothing = shopData.items.some(i => CLOTHING_DATABASE[i.id]);

  return (
    <div className="fixed inset-0 z-[400] bg-[#020617] flex flex-col p-6 text-white font-sans animate-in fade-in duration-300">

      <div className="flex justify-between items-center mb-8">
        <div className="text-left">
          <p className="text-blue-500 font-black uppercase text-[10px] tracking-widest mb-1">Торговая точка</p>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{shopData.name}</h2>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X size={24}/></button>
      </div>

      <div className="bg-white/[0.03] border border-white/5 p-4 rounded-3xl mb-8 flex justify-between items-center">
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Наличные</span>
         <span className="text-green-500 font-black italic text-lg">${player?.money?.toLocaleString()}</span>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar space-y-3 pb-10">
        {shopData.items.map((shopItem) => {
          const itemInfo = getItemInfo(shopItem.id);
          if (!itemInfo) return null;
          const isClothing = !!CLOTHING_DATABASE[shopItem.id];
          const slotInfo = isClothing ? EQUIPMENT_SLOTS[itemInfo.slot] : null;

          return (
            <div key={shopItem.id} className={`bg-slate-900/50 border p-5 rounded-[32px] flex items-center justify-between transition-all active:bg-blue-600/5 ${isClothing ? 'border-pink-500/20' : 'border-white/5'}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">{itemInfo.icon}</div>
                <div className="text-left">
                  <h4 className="font-black uppercase italic text-sm">{itemInfo.name}</h4>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 leading-tight max-w-[120px]">{itemInfo.desc}</p>
                  {isClothing && slotInfo && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[8px] text-pink-400 font-black uppercase">{slotInfo.icon} {slotInfo.name}</span>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => handleBuy(shopItem)} className={`px-5 py-3 rounded-2xl font-black italic text-sm shadow-lg active:scale-90 transition-all ${isClothing ? 'bg-pink-600 hover:bg-pink-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                ${shopItem.price}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
          <Info size={16} className="text-blue-500" />
          {hasClothing ? (
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Одежда покупается в сумку. Экипируйте через окно персонажа.</p>
          ) : (
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Предметы занимают место в сумке (макс. 12 слотов)</p>
          )}
      </div>
    </div>
  );
}