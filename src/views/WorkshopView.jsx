import React, { useEffect, useState } from 'react';
import { useWorkshopStore } from '../store/useWorkshopStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTravelStore } from '../store/useTravelStore';
import { X, Package, Cpu, Truck, DollarSign, Warehouse } from 'lucide-react';

export default function WorkshopView({ onClose }) {
  const {
    metalCount, partCount, factoryMetalCount, loading,
    delivering, producing, fetchWorkshopData, fetchFactoryMetalCount,
    deliverMetal, producePart
  } = useWorkshopStore();
  const { player, updateProfile } = usePlayerStore();
  const { startRoute, isMoving } = useTravelStore();
  const [lastMessage, setLastMessage] = useState('');

  useEffect(() => {
    fetchWorkshopData();
    fetchFactoryMetalCount();
  }, []);

  const clearMessage = () => {
    if (lastMessage) setTimeout(() => setLastMessage(''), 3000);
  };

  // Deliver metal: travel to factory, then return, +$5 reward
  const handleDeliver = async () => {
    if (delivering || isMoving || !player) return;
    if (factoryMetalCount < 5) {
      setLastMessage('❌ На заводе недостаточно металла!');
      clearMessage();
      return;
    }

    // Step 1: Travel to factory
    await startRoute('factory_1');

    // Step 2: Transfer metal
    const success = await deliverMetal();
    if (!success) {
      setLastMessage('❌ Не удалось принять металл!');
      clearMessage();
      return;
    }

    // Step 3: Return to workshop
    await startRoute('workshop_1');

    // Step 4: Reward
    await updateProfile({ money: (player.money || 0) + 5 });

    // Refresh data
    await fetchWorkshopData();
    await fetchFactoryMetalCount();

    setLastMessage('✅ Металл доставлен! +$5');
    clearMessage();
  };

  // Produce 1 part from 5 metal, +$5 reward
  const handleProduce = async () => {
    if (producing || !player) return;
    if (metalCount < 5) {
      setLastMessage('❌ Недостаточно металла!');
      clearMessage();
      return;
    }

    const success = await producePart();
    if (!success) {
      setLastMessage('❌ Ошибка производства!');
      clearMessage();
      return;
    }

    await updateProfile({ money: (player.money || 0) + 5 });

    setLastMessage('✅ Деталь произведена! +$5');
    clearMessage();
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white">
      <div className="w-full flex-1 overflow-y-auto p-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">
              Manufacturing
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Фабрика</h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 rounded-2xl active:scale-75 transition-all"
          >
            <X />
          </button>
        </div>

        {/* Message */}
        {lastMessage && (
          <div className={`mb-4 p-4 rounded-2xl border ${lastMessage.startsWith('✅') ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
            <p className="text-sm font-black">{lastMessage}</p>
          </div>
        )}

        {/* Metal & Part Counts */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-slate-500">Металл</span>
              <span className="text-blue-500 font-black italic text-2xl">{metalCount}</span>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, (metalCount / 100) * 100)}%` }}
              />
            </div>
            <p className="text-[8px] text-slate-600 mt-2">Нужно 5 для производства детали</p>
          </div>

          <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-slate-500">Детали</span>
              <span className="text-purple-500 font-black italic text-2xl">{partCount}</span>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, (partCount / 50) * 100)}%` }}
              />
            </div>
            <p className="text-[8px] text-slate-600 mt-2">5 металла → 1 деталь</p>
          </div>
        </div>

        {/* Factory Metal */}
        <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px] mb-8">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-500">Металл на заводе</span>
            <span className="text-amber-500 font-black italic">{factoryMetalCount}</span>
          </div>
        </div>

        {/* Work Buttons */}
        <h3 className="text-xl font-black uppercase italic mb-4 text-blue-400">Рабочие места</h3>

        {/* Deliver Metal */}
        <div className="mb-6 bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-amber-900/30 rounded-2xl flex items-center justify-center text-2xl">
              🚛
            </div>
            <div>
              <h4 className="text-lg font-black">Привезти металл</h4>
              <p className="text-[10px] text-slate-400">Авто-поездка на завод → получить 5 металла</p>
            </div>
          </div>
          <div className="flex gap-3 mb-3">
            <div className="flex items-center gap-2 bg-amber-900/20 px-3 py-1.5 rounded-xl">
              <Package size={14} className="text-amber-500" />
              <span className="text-[10px] font-black text-amber-400">-5 металла с завода</span>
            </div>
            <div className="flex items-center gap-2 bg-green-900/20 px-3 py-1.5 rounded-xl">
              <DollarSign size={14} className="text-green-500" />
              <span className="text-[10px] font-black text-green-400">+$5</span>
            </div>
          </div>
          <button
            onClick={handleDeliver}
            disabled={delivering || isMoving || factoryMetalCount < 5}
            className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
              delivering || isMoving
                ? 'bg-slate-800 opacity-50'
                : 'bg-amber-600 shadow-amber-900/40 active:scale-95'
            }`}
          >
            {delivering ? 'ДОСТАВЛЯЮ...' : isMoving ? 'ЕДУ...' : 'ПРИВЕЗТИ МЕТАЛЛ'}
          </button>
          <div className="flex items-center gap-2 mt-3 text-amber-400">
            <Truck size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">Авто-поездка на завод</span>
          </div>
        </div>

        {/* Produce Part */}
        <div className="mb-6 bg-white/[0.03] border border-white/5 p-5 rounded-[32px]">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-purple-900/30 rounded-2xl flex items-center justify-center text-2xl">
              ⚙️
            </div>
            <div>
              <h4 className="text-lg font-black">Произвести деталь</h4>
              <p className="text-[10px] text-slate-400">Собрать одну деталь из металла</p>
            </div>
          </div>
          <div className="flex gap-3 mb-3">
            <div className="flex items-center gap-2 bg-blue-900/20 px-3 py-1.5 rounded-xl">
              <Package size={14} className="text-blue-500" />
              <span className="text-[10px] font-black text-blue-400">-5 металла</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-900/20 px-3 py-1.5 rounded-xl">
              <Cpu size={14} className="text-purple-500" />
              <span className="text-[10px] font-black text-purple-400">+1 деталь</span>
            </div>
            <div className="flex items-center gap-2 bg-green-900/20 px-3 py-1.5 rounded-xl">
              <DollarSign size={14} className="text-green-500" />
              <span className="text-[10px] font-black text-green-400">+$5</span>
            </div>
          </div>
          <button
            onClick={handleProduce}
            disabled={producing || metalCount < 5}
            className={`w-full py-3 rounded-[32px] text-sm font-black uppercase italic transition-all ${
              producing
                ? 'bg-slate-800 opacity-50'
                : 'bg-purple-600 shadow-purple-900/40 active:scale-95'
            }`}
          >
            {producing ? 'ПРОИЗВОЖУ...' : 'ПРОИЗВЕСТИ ДЕТАЛЬ'}
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Truck size={16} className="text-amber-500" />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Доставка</p>
              <p className="text-xs font-bold text-green-400">+$5 / поездка</p>
            </div>
          </div>
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Warehouse size={16} className="text-purple-500" />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Производство</p>
              <p className="text-xs font-bold text-green-400">+$5 / деталь</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}