import React, { useEffect, useState } from 'react';
import { ShoppingBag, X, Wallet, Info, Package } from 'lucide-react';
import { SHOPS_DATABASE } from '../data/shops';
import { CLOTHING_DATABASE } from '../data/clothingConfig';
import { EQUIPMENT_SLOTS } from '../data/clothingConfig';
import { RESOURCE_TYPES } from '../data/businessConfig';
import { useInventoryStore } from '../store/useInventoryStore';
import { useBusinessStore } from '../store/useBusinessStore';
import { isImageIcon } from '../utils/iconHelper';

export default function ShopView({ shopType, player, onClose }) {
  const shopData = SHOPS_DATABASE[shopType] || SHOPS_DATABASE['shop_24_7'];
  const buyItem = useInventoryStore(state => state.buyItem);
  const { buyProduct, isPlayerOwner, getBusinessState, isProcessing, getShopProducts, getResources,
           fetchBusinesses, loadBusinessData, fetchResources } = useBusinessStore();

  const [businessLoaded, setBusinessLoaded] = useState(false);
  const [shopItems, setShopItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load business state to check ownership and resources
  useEffect(() => {
    const load = async () => {
      await fetchBusinesses();
      const state = getBusinessState(shopType);
      if (state.purchased) {
        // Load resources for any purchased business (owner or not)
        await loadBusinessData(shopType);
      }
      // Load shop products from DB
      const products = await getShopProducts(shopType);
      const items = products.map(p => ({
        id: p.id,
        price: p.price,
        product: p,
        name: p.name,
        icon: p.icon || '📦',
      }));
      setShopItems(items);
      setBusinessLoaded(true);
    };
    load();
  }, [refreshKey]);

  const business = businessLoaded ? getBusinessState(shopType) : null;
  const owned = isPlayerOwner(shopType);
  const resources = getResources(shopType);

  const getItemInfo = (itemId) => {
    const info = CLOTHING_DATABASE[itemId];
    return info;
  };

  const getItemDisplay = (shopItem) => {
    const info = getItemInfo(shopItem.id);
    if (info) return info;
    // Fallback to DB product data
    if (shopItem.product) {
      return {
        id: shopItem.id,
        name: shopItem.product.name,
        icon: shopItem.product.icon || '📦',
        desc: shopItem.product.description || '',
      };
    }
    return {
      id: shopItem.id,
      name: shopItem.name || shopItem.id,
      icon: shopItem.icon || '📦',
      desc: '',
    };
  };

  const handleBuy = async (item) => {
    if (!businessLoaded) return;

    // If business is purchased (owned by anyone), check resources before selling
    const state = getBusinessState(shopType);
    if (state.purchased) {
      const costs = getResourceCosts(item.product);
      if (costs && costs.length > 0) {
        const canProduce = costs.every(c => c.available >= c.qty);
        if (!canProduce) {
          alert('Данного товара нет!');
          return;
        }
      }
      const success = await buyProduct(shopType, item.id);
      if (success) {
        await buyItem(item.id, 0, 1);
        setRefreshKey(k => k + 1);
      }
      return;
    }

    // Default: buy to inventory
    await buyItem(item.id, item.price, 1);
  };

  // Only show items loaded from business_products DB
  const allItems = shopItems;

  const hasClothing = allItems.some(i => CLOTHING_DATABASE[i.id]);

  const getResourceCosts = (product) => {
    if (!product || !product.resources) return null;
    return Object.entries(product.resources).map(([type, qty]) => {
      const res = RESOURCE_TYPES[type];
      const available = resources[type] || 0;
      return { type, qty, res, available };
    });
  };

  return (
    <div className="fixed inset-0 z-[400] bg-[#020617] flex flex-col p-6 text-white font-sans animate-in fade-in duration-300">

      <div className="flex justify-between items-center mb-8">
        <div className="text-left">
          <p className="text-blue-500 font-black uppercase text-[10px] tracking-widest mb-1">Торговая точка</p>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{shopData.name}</h2>
          {owned && <p className="text-[9px] text-emerald-400 font-black mt-1">👑 Ваш бизнес</p>}
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X size={24}/></button>
      </div>

      <div className="bg-white/[0.03] border border-white/5 p-4 rounded-3xl mb-8 flex justify-between items-center">
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Наличные</span>
         <span className="text-green-500 font-black italic text-lg">${player?.money?.toLocaleString()}</span>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar space-y-3 pb-10">
        {allItems.map((shopItem) => {
          const itemDisplay = getItemDisplay(shopItem);
          const itemInfo = getItemInfo(shopItem.id);
          const isClothing = !!CLOTHING_DATABASE[shopItem.id];
          const slotInfo = isClothing && itemInfo ? EQUIPMENT_SLOTS[itemInfo.slot] : null;

          // Check if business has enough resources (applies to everyone if business is purchased)
          const costs = getResourceCosts(shopItem.product);
          const state = getBusinessState(shopType);
          const purchased = state?.purchased || false;
          const outOfStock = purchased && costs && costs.length > 0 && !costs.every(c => c.available >= c.qty);

          return (
            <div key={shopItem.id} className={`bg-slate-900/50 border p-5 rounded-[32px] transition-all ${
              outOfStock ? 'opacity-60' : ''
            } ${isClothing ? 'border-pink-500/20' : 'border-white/5'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden">
                    {isImageIcon(itemDisplay.icon) ? (
                      <img src={itemDisplay.icon} className="w-10 h-10 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span className="text-3xl">{itemDisplay.icon || '📦'}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="font-black uppercase italic text-sm">{itemDisplay.name}</h4>
                    <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 leading-tight max-w-[120px]">{itemDisplay.desc}</p>
                    {isClothing && slotInfo && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[8px] text-pink-400 font-black uppercase">{slotInfo.icon} {slotInfo.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                {outOfStock ? (
                  <div className="px-5 py-3 rounded-2xl font-black italic text-sm text-slate-400 bg-slate-700">
                    Нет в наличии
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(shopItem)}
                    disabled={isProcessing}
                    className={`px-5 py-3 rounded-2xl font-black italic text-sm shadow-lg active:scale-90 transition-all ${
                      isClothing
                        ? 'bg-pink-600 hover:bg-pink-500'
                        : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    ${shopItem.price}
                  </button>
                )}
              </div>

              {/* Show resource costs for owner */}
              {owned && costs && costs.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                  <Package size={10} className="text-slate-600 mt-1" />
                  {costs.map(({ type, qty, res, available }) => (
                    <span
                      key={type}
                      className={`text-[9px] font-black uppercase ${
                        available >= qty ? 'text-slate-400' : 'text-red-400'
                      }`}
                    >
                      {res?.icon || ''} {res?.name || type}: {available}/{qty}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
          <Info size={16} className="text-blue-500" />
          {owned && shopItems.some(si => si.product) ? (
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">
              Закупите ресурсы у грузовиков для пополнения запасов. Продажа тратит ресурсы со склада.
            </p>
          ) : hasClothing ? (
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Одежда покупается в сумку. Экипируйте через окно персонажа.</p>
          ) : (
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Предметы занимают место в сумке (макс. 12 слотов)</p>
          )}
      </div>
    </div>
  );
}