import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTruckerStore, TRUCK_TYPES, BUY_PRICE, SELL_PRICE } from '../store/useTruckerStore';
import { RESOURCE_TYPES } from '../data/businessConfig';
import { FINAL_LOCATIONS } from '../data/locations';
import { ArrowLeft, Truck, Package, Warehouse, DollarSign, X, ShoppingCart, TrendingUp, Wheat, Droplets } from 'lucide-react';

export default function TruckerView({ onClose }) {
  const { player, updateProfile } = usePlayerStore();
  const {
    rentedTruck, farmCropCount, factoryMetalCount, oilRigOilCount, loading, isOperating,
    fetchResourceCounts, rentTruck, returnTruck, buyResource, sellAtPort,
    getCargo, getLoadedCargo, trucks,
    pendingOrders, fetchPendingOrders, setPendingDelivery
  } = useTruckerStore();

  const [tab, setTab] = useState('buy'); // 'buy' | 'orders'
  const [buyAmount, setBuyAmount] = useState({ crop: 10, metal: 10, oil: 10 });
  const [lastMessage, setLastMessage] = useState('');

  useEffect(() => {
    fetchResourceCounts();
    fetchPendingOrders();
  }, []);

  // Refresh orders when switching to orders tab
  const switchToOrders = () => {
    setTab('orders');
    fetchPendingOrders();
  };

  const showMessage = (msg) => {
    setLastMessage(msg);
    setTimeout(() => setLastMessage(''), 3000);
  };

  const handleRent = async (truckId) => {
    const success = await rentTruck(truckId);
    if (success) showMessage('✅ Транспорт арендован!');
  };

  const handleBuy = async (resourceType) => {
    const amount = buyAmount[resourceType];
    const loaded = getLoadedCargo();
    if (!rentedTruck || loaded + amount > rentedTruck.capacity) {
      alert('Не помещается!');
      return;
    }
    const success = await buyResource(resourceType, amount);
    const labels = { crop: 'урожая', metal: 'металла', oil: 'нефти' };
    if (success) showMessage(`✅ Куплено ${amount} ед. ${labels[resourceType] || resourceType}!`);
  };

  const handleSell = async () => {
    const success = await sellAtPort();
    if (success) {
      // Update resource counts
      await fetchResourceCounts();
    }
  };

  const handleReturn = () => {
    if (rentedTruck && getLoadedCargo() > 0) {
      if (!confirm('Груз не продан! Уверены что хотите вернуть транспорт?')) return;
    }
    returnTruck();
    showMessage('🔄 Транспорт возвращён');
  };

  const loaded = getLoadedCargo();
  const capacity = rentedTruck?.capacity || 0;

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white">
      <div className="w-full flex-1 overflow-y-auto p-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-1">
              Logistics
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Дальнобойщик</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-75 transition-all">
            <X />
          </button>
        </div>

        {/* Message */}
        {lastMessage && (
          <div className={`mb-4 p-4 rounded-2xl border ${lastMessage.startsWith('✅') ? 'bg-green-900/20 border-green-500/30' : 'bg-cyan-900/20 border-cyan-500/30'}`}>
            <p className="text-sm font-black text-cyan-400">{lastMessage}</p>
          </div>
        )}

        {/* No truck — Show rental options */}
        {!rentedTruck && (
          <div>
            <h3 className="text-xl font-black uppercase italic mb-4 text-cyan-400">🚛 Выберите транспорт</h3>
            <div className="space-y-4">
              {trucks.map(truck => (
                <div key={truck.id} className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{truck.icon}</span>
                    <div>
                      <h4 className="text-lg font-black">{truck.name}</h4>
                      <p className="text-[10px] text-slate-400">Вместимость: {truck.capacity} ед.</p>
                    </div>
                    <div className="ml-auto">
                      <p className="text-cyan-400 font-black text-xl">${truck.rentPrice}</p>
                      <p className="text-[10px] text-slate-500 uppercase">аренда</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRent(truck.id)}
                    disabled={loading}
                    className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                      loading ? 'bg-slate-800 opacity-50' : 'bg-cyan-600 shadow-cyan-900/40 active:scale-95'
                    }`}
                  >
                    АРЕНДОВАТЬ
                  </button>
                </div>
              ))}
            </div>

            {/* Resource availability */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-black">Урожай на ферме</p>
                <p className="text-xl font-black text-green-400">{farmCropCount}</p>
                <p className="text-[9px] text-slate-600 mt-1">Закупка: ${BUY_PRICE}/ед</p>
              </div>
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-black">Металл на заводе</p>
                <p className="text-xl font-black text-amber-400">{factoryMetalCount}</p>
                <p className="text-[9px] text-slate-600 mt-1">Закупка: ${BUY_PRICE}/ед</p>
              </div>
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-black">Нефть на вышке</p>
                <p className="text-xl font-black text-cyan-400">{oilRigOilCount}</p>
                <p className="text-[9px] text-slate-600 mt-1">Закупка: ${BUY_PRICE}/ед</p>
              </div>
            </div>

            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 mt-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" />
                <p className="text-sm font-black text-green-400">Продажа в порту: ${SELL_PRICE}/ед (прибыль ${SELL_PRICE - BUY_PRICE}/ед)</p>
              </div>
            </div>
          </div>
        )}

        {/* Has truck — Show cargo management */}
        {rentedTruck && (
          <div>
            {/* Truck Info */}
            <div className="mb-8 bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase text-slate-500">Транспорт</span>
                <span className="text-cyan-400 font-black italic">
                  {TRUCK_TYPES.find(t => t.id === rentedTruck.type)?.icon} {TRUCK_TYPES.find(t => t.id === rentedTruck.type)?.name}
                </span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${(loaded / capacity) * 100}%` }}
                />
              </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Груз: {loaded} / {capacity} ед.</span>
                  <span className="text-cyan-400 font-black">
                    {getCargo('crop') > 0 && `🌾${getCargo('crop')}`}
                    {' '}{getCargo('metal') > 0 && `🔩${getCargo('metal')}`}
                    {' '}{getCargo('oil') > 0 && `🛢️${getCargo('oil')}`}
                  </span>
                </div>
            </div>

            {/* Buy Resources */}
            {tab === 'buy' && (
            <div>
            <h3 className="text-lg font-black uppercase italic mb-4 text-green-400">🛒 Закупка ресурсов</h3>

            {/* Crop */}
            <div className="mb-4 bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
              <div className="flex items-center gap-3 mb-3">
                <Wheat size={20} className="text-green-500" />
                <span className="text-sm font-black uppercase text-green-400">Урожай (на складе: {farmCropCount})</span>
              </div>
              <div className="mb-3">
                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Количество</label>
                <input
                  type="number"
                  min="1"
                  max={Math.min(farmCropCount, capacity - loaded)}
                  value={buyAmount.crop}
                  onChange={(e) => setBuyAmount({ ...buyAmount, crop: Math.max(1, parseInt(e.target.value) || 0) })}
                  className="w-full bg-black/50 border border-green-500/30 rounded-2xl px-4 py-3 text-white font-black"
                />
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-slate-500">Цена: ${BUY_PRICE}/ед</span>
                <span className="text-green-400 font-black">${buyAmount.crop * BUY_PRICE}</span>
              </div>
              <button
                onClick={() => handleBuy('crop')}
                disabled={loading || isOperating || farmCropCount <= 0}
                className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                  loading || farmCropCount <= 0 ? 'bg-slate-800 opacity-50' : 'bg-green-600 active:scale-95'
                }`}
              >
                КУПИТЬ УРОЖАЙ
              </button>
            </div>

             {/* Metal */}
             <div className="mb-4 bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
               <div className="flex items-center gap-3 mb-3">
                 <Package size={20} className="text-amber-500" />
                 <span className="text-sm font-black uppercase text-amber-400">Металл (на складе: {factoryMetalCount})</span>
               </div>
               <div className="mb-3">
                 <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Количество</label>
                 <input
                   type="number"
                   min="1"
                   max={Math.min(factoryMetalCount, capacity - loaded)}
                   value={buyAmount.metal}
                   onChange={(e) => setBuyAmount({ ...buyAmount, metal: Math.max(1, parseInt(e.target.value) || 0) })}
                   className="w-full bg-black/50 border border-amber-500/30 rounded-2xl px-4 py-3 text-white font-black"
                 />
               </div>
               <div className="flex justify-between items-center mb-3">
                 <span className="text-[10px] text-slate-500">Цена: ${BUY_PRICE}/ед</span>
                 <span className="text-amber-400 font-black">${buyAmount.metal * BUY_PRICE}</span>
               </div>
               <button
                 onClick={() => handleBuy('metal')}
                 disabled={loading || isOperating || factoryMetalCount <= 0}
                 className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                   loading || factoryMetalCount <= 0 ? 'bg-slate-800 opacity-50' : 'bg-amber-600 active:scale-95'
                 }`}
               >
                 КУПИТЬ МЕТАЛЛ
               </button>
             </div>

             {/* Oil */}
             <div className="mb-8 bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
               <div className="flex items-center gap-3 mb-3">
                 <Droplets size={20} className="text-cyan-500" />
                 <span className="text-sm font-black uppercase text-cyan-400">Нефть (на складе: {oilRigOilCount})</span>
               </div>
               <div className="mb-3">
                 <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Количество</label>
                 <input
                   type="number"
                   min="1"
                   max={Math.min(oilRigOilCount, capacity - loaded)}
                   value={buyAmount.oil}
                   onChange={(e) => setBuyAmount({ ...buyAmount, oil: Math.max(1, parseInt(e.target.value) || 0) })}
                   className="w-full bg-black/50 border border-cyan-500/30 rounded-2xl px-4 py-3 text-white font-black"
                 />
               </div>
               <div className="flex justify-between items-center mb-3">
                 <span className="text-[10px] text-slate-500">Цена: ${BUY_PRICE}/ед</span>
                 <span className="text-cyan-400 font-black">${buyAmount.oil * BUY_PRICE}</span>
               </div>
               <button
                 onClick={() => handleBuy('oil')}
                 disabled={loading || isOperating || oilRigOilCount <= 0}
                 className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                   loading || oilRigOilCount <= 0 ? 'bg-slate-800 opacity-50' : 'bg-cyan-600 active:scale-95'
                 }`}
               >
                 КУПИТЬ НЕФТЬ
               </button>
             </div>

            </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTab('buy')}
                className={`flex-1 py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                  tab === 'buy' ? 'bg-cyan-600' : 'bg-white/5 border border-white/10'
                }`}
              >
                🛒 Закупка
              </button>
              <button
                onClick={switchToOrders}
                className={`flex-1 py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                  tab === 'orders' ? 'bg-cyan-600' : 'bg-white/5 border border-white/10'
                }`}
              >
                📋 Заказы ({pendingOrders.length})
              </button>
            </div>

            {/* Orders tab */}
            {tab === 'orders' && (
              <div>
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-2xl mb-2">📋</p>
                    <p className="text-slate-500 text-sm font-black">Нет активных заказов</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingOrders.map(order => {
                      const bizLoc = FINAL_LOCATIONS.find(l => l.id === order.business_id);
                      const resInfo = RESOURCE_TYPES[order.resource_type];
                      const cargoAmount = getCargo(order.resource_type);
                      const canDeliver = Math.min(cargoAmount, Number(order.quantity));

                      return (
                        <div key={order.id} className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">{resInfo?.icon || '📦'}</span>
                            <div className="flex-1">
                              <p className="text-sm font-black">{resInfo?.name || order.resource_type}</p>
                              <p className="text-[10px] text-slate-400">
                                📍 {bizLoc?.name || order.business_id}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-amber-400">{Math.round(order.quantity)} ед.</p>
                              <p className="text-[10px] text-slate-400">${Math.round(order.price_per_unit)}/ед</p>
                            </div>
                          </div>

                          {/* Show what you can deliver */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] text-slate-400">
                              В грузовике: <span className="text-cyan-400 font-black">{cargoAmount} ед.</span>
                            </span>
                            <span className="text-[10px] text-green-400 font-black">
                             +прибыль: ${canDeliver * Math.round(order.price_per_unit)}
                            </span>
                          </div>

                          <button
                            onClick={async () => {
                              if (canDeliver > 0 && !isOperating) {
                                await setPendingDelivery(
                                  order.id,
                                  order.resource_type
                                );
                              }
                            }}
                            disabled={canDeliver <= 0 || isOperating}
                            className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                              canDeliver <= 0 ? 'bg-slate-800 opacity-50' : 'bg-green-600 active:scale-95'
                            }`}
                          >
                            {canDeliver <= 0 ? 'Нет ресурса' : `Доставить`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Return truck */}
            <button
              onClick={handleReturn}
              disabled={isOperating}
              className="w-full mt-6 py-3 rounded-[32px] text-sm font-black uppercase italic border border-red-500/30 text-red-400 active:scale-95 transition-all"
            >
              {isOperating ? 'НЕВОЗМОЖНО ВОЗВРАТИТЬ' : 'ВЕРНУТЬ ТРАНСПОРТ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}