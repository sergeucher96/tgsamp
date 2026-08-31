import React, { useEffect } from 'react';
import { useFarmStore } from '../store/useFarmStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { X, Wheat, Warehouse, DollarSign } from 'lucide-react';

export default function FarmView({ onClose }) {
  const { cropCount, loading, harvesting, harvestCrop, fetchCropCount } = useFarmStore();
  const { player, updateProfile } = usePlayerStore();

  useEffect(() => {
    fetchCropCount();
  }, []);

  const handleHarvest = async () => {
    if (harvesting || !player) return;

    const success = await harvestCrop();
    if (success) {
      //Reward player $1
      await updateProfile({ money: (player.money || 0) + 1 });
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white">
      <div className="w-full flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">
              Rural Area
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">ФЕРМА</h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 rounded-2xl active:scale-75 transition-all"
          >
            <X />
          </button>
        </div>

        {/* Warehouse Stats */}
        <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px] mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Warehouse size={20} className="text-green-500" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Склад фермы
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
                <Wheat size={24} className="text-green-500" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Урожай</p>
                <p className="text-2xl font-black italic text-green-400">
                  {loading ? '...' : cropCount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-slate-500 uppercase font-black">На складе</p>
              <p className="text-xs text-green-400 font-bold">+1 за сбор</p>
            </div>
          </div>
        </div>

        {/* Harvest Button */}
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full bg-green-500/5 animate-pulse" />
            <div className="relative w-36 h-36 bg-gradient-to-br from-green-900 to-green-700 rounded-[50px] border-2 border-green-500/30 flex items-center justify-center shadow-2xl">
              <Wheat size={64} className="text-green-400" />
            </div>
          </div>

          <button
            onClick={handleHarvest}
            disabled={harvesting || loading}
            className={`w-full max-w-xs py-6 rounded-[32px] text-xl font-black uppercase italic transition-all ${
              harvesting || loading
                ? 'bg-slate-800 opacity-50'
                : 'bg-green-600 shadow-green-900/40 active:scale-95 shadow-lg'
            }`}
          >
            {harvesting ? 'СОБИРАЮ...' : 'СОБРАТЬ УРОЖАЙ'}
          </button>

          <div className="flex items-center gap-2 mt-4 text-green-400">
            <DollarSign size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              +$1 за каждый сбор
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Wheat size={16} className="text-green-500" />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Награда</p>
              <p className="text-xs font-bold text-green-400">$1 за сбор</p>
            </div>
          </div>
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Warehouse size={16} className="text-blue-500" />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Склад</p>
              <p className="text-xs font-bold">Общий</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
