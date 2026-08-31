import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useBusinessStore } from '../store/useBusinessStore';
import { useFarmStore } from '../store/useFarmStore';
import { useCafeteriaStore } from '../store/useCafeteriaStore';
import { BUSINESS_TYPES } from '../data/businessConfig';
import { supabase } from '../api/supabase';
import { ArrowLeft, Wheat, Zap, ShoppingCart, Truck } from 'lucide-react';

const CAFETERIA_DISHES = [
  { id: 'dish_1', name: 'Классический обед', price: 100, energy: 50, crops: 5, icon: '🍗', desc: 'Курица с пюре и салатом' },
  { id: 'dish_2', name: 'Паста карбонара', price: 100, energy: 50, crops: 5, icon: '�', desc: 'Спагетти с беконом и пармезаном' },
  { id: 'dish_3', name: 'Стейк с овощами', price: 100, energy: 50, crops: 5, icon: '🥩', desc: 'Сочный стейк и свежие овощи' },
];

export default function CafeteriaView({ businessId, onClose }) {
  const { player, updateProfile } = usePlayerStore();
  const { businesses, fetchBusinesses, getBusinessState, isPlayerOwner, buyBusiness } = useBusinessStore();
  const { cropCount: farmCropCount, fetchCropCount } = useFarmStore();
  const { fetchBusinessCrops, getCropCount, decrementCrops, addCrops } = useCafeteriaStore();
  
  const [loading, setLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [deliveryAmount, setDeliveryAmount] = useState(10);
  
  const state = getBusinessState(businessId);
  const owner = isPlayerOwner(businessId);

  useEffect(() => {
    fetchBusinesses();
    fetchBusinessCrops(businessId);
    fetchCropCount();
  }, []);

  const businessCropCount = getCropCount(businessId);

  const clearMessage = () => {
    if (lastMessage) {
      setTimeout(() => setLastMessage(''), 3000);
    }
  };

  const handleBuyBusiness = async () => {
    const success = await buyBusiness(businessId);
    if (success) {
      setLastMessage('✅ Поздравляем! Вы стали владельцем столовой!');
      clearMessage();
    }
  };

  const handleOrderDish = async (dish) => {
    if (!player) return;
    if (loading) return;
    
    // Проверяем деньги
    if (player.money < dish.price) {
      setLastMessage('❌ Недостаточно денег!');
      clearMessage();
      return;
    }
    
    // Проверяем урожай на складе
    if (businessCropCount < dish.crops) {
      setLastMessage('❌ Недостаточно урожая! Закажите доставку через панель владельца.');
      clearMessage();
      return;
    }
    
    setLoading(true);
    try {
      // Снимаем деньги
      await updateProfile({ money: player.money - dish.price });
      
      // Снимаем урожай
      const success = await decrementCrops(businessId, dish.crops);
      if (!success) {
        setLastMessage('❌ Не удалось снять урожай!');
        clearMessage();
        setLoading(false);
        return;
      }
      
      // Восстанавливаем энергию
      const newEnergy = Math.min(100, (player.energy || 0) + dish.energy);
      await updateProfile({ energy: newEnergy });
      
      setLastMessage(`✅ ${dish.name} съеден! +${dish.energy} энергии`);
      clearMessage();
    } catch (err) {
      console.error('Ошибка заказа блюда:', err);
      setLastMessage('❌ Ошибка при заказе!');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  const handleOrderDelivery = async () => {
    if (!player || !owner) return;
    if (loading) return;
    
    const cost = deliveryAmount * 10; // $10 за единицу
    
    // Проверяем деньги
    if (player.money < cost) {
      setLastMessage(`❌ Недостаточно денег! Нужно $${cost}`);
      clearMessage();
      return;
    }
    
    // Проверяем урожай на ферме
    if (farmCropCount < deliveryAmount) {
      setLastMessage('❌ Недостаточно урожая на ферме!');
      clearMessage();
      return;
    }
    
    if (deliveryAmount < 1) {
      setLastMessage('❌ Минимальный заказ: 1 единица');
      clearMessage();
      return;
    }
    
    setLoading(true);
    try {
      // Снимаем деньги
      await updateProfile({ money: player.money - cost });
      
      // Снимаем урожай с фермы
      const { error: farmError } = await supabase
        .from('farm')
        .update({ 
          crop_count: farmCropCount - deliveryAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
      
      if (farmError) throw farmError;
      
      // Добавляем урожай на склад столовой
      const success = await addCrops(businessId, deliveryAmount);
      if (!success) throw new Error('Failed to add crops');
      
      // Обновляем состояние фермы
      await fetchCropCount();
      
      setLastMessage(`✅ Доставлено ${deliveryAmount} единиц урожая!`);
      clearMessage();
    } catch (err) {
      console.error('Ошибка доставки урожая:', err);
      setLastMessage('❌ Ошибка при заказе доставки!');
      clearMessage();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white">
      <div className="w-full flex-1 overflow-y-auto p-8">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">
              Food Service
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Столовая</h2>
            {owner && (
              <p className="text-[10px] text-yellow-500 font-black mt-1">👑 Вы — владелец</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 rounded-2xl active:scale-75 transition-all"
          >
            <ArrowLeft />
          </button>
        </div>

        {/* Message */}
        {lastMessage && (
          <div className={`mb-4 p-4 rounded-2xl border ${lastMessage.startsWith('✅') ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
            <p className="text-sm font-black text-orange-400">{lastMessage}</p>
          </div>
        )}

        {/* Crop Count Display */}
        <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px] mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black uppercase text-slate-500">
              Урожай на складе
            </span>
            <span className="text-orange-500 font-black italic text-2xl">{businessCropCount}</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-1000"
              style={{ width: `${Math.min(100, (businessCropCount / 100) * 100)}%` }}
            />
          </div>
          <p className="text-[8px] text-slate-600 mt-2">Каждое блюдо требует 5 единиц урожая</p>
        </div>

        {/* Buy Business Section - если бизнес ещё не куплен */}
        {!state.purchased && (
          <div className="mb-8">
            <div className="bg-white/[0.03] border border-yellow-500/20 p-5 rounded-[32px]">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">�</span>
                <div>
                  <p className="text-[10px] text-yellow-500 uppercase font-black">Бизнес продаётся</p>
                  <p className="text-sm text-slate-300">Станьте владельцем столовой и управляйте ею!</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-yellow-500/10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400">Стоимость</p>
                  <p className="font-black text-xl text-yellow-400">${BUSINESS_TYPES.cafeteria.purchasePrice.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-yellow-500/10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400">Доход/день</p>
                  <p className="font-black text-xl text-yellow-400">${BUSINESS_TYPES.cafeteria.dailyIncome.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={handleBuyBusiness}
                disabled={loading}
                className={`w-full py-4 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                  loading
                    ? 'bg-slate-800 opacity-50'
                    : 'bg-yellow-600 hover:bg-yellow-500 active:scale-95'
                }`}
              >
                Купить за ${BUSINESS_TYPES.cafeteria.purchasePrice.toLocaleString()}
              </button>
            </div>
          </div>
        )}

        {/* Purchased by somоne else */}
        {state.purchased && !owner && (
          <div className="mb-6 rounded-3xl border border-blue-500/20 bg-[#0a0a1a]/80 p-4">
            <p className="text-sm text-blue-400">� Этот бизнес имеет владельца. Вы можете использовать услуги столовой.</p>
          </div>
        )}

        {/* Owner Panel – Delivery */}
        <h3 className="text-xl font-black uppercase italic mb-4 text-orange-400">� Меню</h3>
        <div className="space-y-4 mb-8">
          {CAFETERIA_DISHES.map((dish) => (
            <div key={dish.id} className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl">{dish.icon}</span>
                <div>
                  <h4 className="text-lg font-black">{dish.name}</h4>
                  <p className="text-[10px] text-slate-400">{dish.desc}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-orange-400 font-black text-xl">${dish.price}</p>
                </div>
              </div>
              <div className="flex gap-3 mb-3">
                <div className="flex items-center gap-2 bg-orange-900/20 px-3 py-1.5 rounded-xl">
                  <Wheat size={14} className="text-orange-500" />
                  <span className="text-[10px] font-black text-orange-400">{dish.crops} урожая</span>
                </div>
                <div className="flex items-center gap-2 bg-green-900/20 px-3 py-1.5 rounded-xl">
                  <Zap size={14} className="text-green-500" />
                  <span className="text-[10px] font-black text-green-400">+{dish.energy} энергии</span>
                </div>
              </div>
              <button
                onClick={() => handleOrderDish(dish)}
                disabled={loading}
                className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                  loading
                    ? 'bg-slate-800 opacity-50'
                    : 'bg-orange-600 shadow-orange-900/40 active:scale-95'
                }`}
              >
                {loading ? 'ЗАКАЗывается...' : 'ЗАКАЗАТЬ'}
              </button>
            </div>
          ))}
        </div>

        {/* Owner Panel – Delivery */}
        {owner && (
          <div className="mb-8">
            <h3 className="text-xl font-black uppercase italic mb-4 text-yellow-400">🚚 Панель владельца</h3>
            <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
              <div className="flex items-center gap-3 mb-3">
                <Truck size={20} className="text-yellow-500" />
                <span className="text-sm font-black uppercase text-yellow-400">Доставка урожая</span>
              </div>
              <div className="mb-3">
                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Количество единиц</label>
                <input
                  type="number"
                  min="1"
                  value={deliveryAmount}
                  onChange={(e) => setDeliveryAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-black/50 border border-yellow-500/30 rounded-2xl px-4 py-3 text-white font-black"
                />
              </div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black">Цена за единицу</p>
                  <p className="text-sm font-black text-yellow-400">$10/ед</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-black">Итого</p>
                  <p className="text-lg font-black text-yellow-400">${deliveryAmount * 10}</p>
                </div>
              </div>
              <button
                onClick={handleOrderDelivery}
                disabled={loading}
                className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
                  loading
                    ? 'bg-slate-800 opacity-50'
                    : 'bg-yellow-600 shadow-yellow-900/40 active:scale-95'
                }`}
              >
                {loading ? 'ДОСТАВЛЯЕТСЯ...' : 'ЗАКАЗАТЬ ДОСТАВКУ'}
              </button>
            </div>
          </div>
        )}

        {/* Farm Crop Count */}
        <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-500">
              Урожай на складе фермы
            </span>
            <span className="text-orange-500 font-black italic">{farmCropCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}