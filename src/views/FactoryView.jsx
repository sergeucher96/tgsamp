import React, { useEffect } from 'react';
import { useFactoryStore } from '../store/useFactoryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { X, Package, Warehouse, DollarSign } from 'lucide-react';

export default function FactoryView({ onClose }) {
  const { metalCount, loading, producing, produceMetal, fetchMetalCount } = useFactoryStore();
  const { player, updateProfile } = usePlayerStore();

  useEffect(() => {
    fetchMetalCount();
  }, []);

  const handleProduce = async () => {
    if (producing || !player) return;

    const success = await produceMetal();
    if (success) {
      await updateProfile({ money: (player.money || 0) + 1 });
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white">
      <div className="w-full flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">
              Industrial Zone
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">ЗАВОД</h2>
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
            <Warehouse size={20} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Склад завода
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30">
                <Package size={24} className="text-amber-500" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Металл</p>
                <p className="text-2xl font-black italic text-amber-400">
                  {loading ? '...' : metalCount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-slate-500 uppercase font-black">На складе</p>
              <p className="text-xs text-amber-400 font-bold">+1 за производство</p>
            </div>
          </div>
        </div>

        {/* Produce Button */}
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full bg-amber-500/5 animate-pulse" />
            <div className="relative w-36 h-36 bg-gradient-to-br from-amber-900 to-amber-700 rounded-[50px] border-2 border-amber-500/30 flex items-center justify-center shadow-2xl">
              <Package size={64} className="text-amber-400" />
            </div>
          </div>

          <button
            onClick={handleProduce}
            disabled={producing || loading}
            className={`w-full max-w-xs py-6 rounded-[32px] text-xl font-black uppercase italic transition-all ${
              producing || loading
                ? 'bg-slate-800 opacity-50'
                : 'bg-amber-600 shadow-amber-900/40 active:scale-95 shadow-lg'
            }`}
          >
            {producing ? 'ПРОИЗВОЖУ...' : 'ПРОИЗВЕСТИ МЕТАЛЛ'}
          </button>

          <div className="flex items-center gap-2 mt-4 text-amber-400">
            <DollarSign size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              +$1 за каждый сбор
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Package size={16} className="text-amber-500" />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Награда</p>
              <p className="text-xs font-bold text-amber-400">$1 за производство</p>
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
