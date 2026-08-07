import React, { useState } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { MINING_LOOT, MINING_SETTINGS } from '../data/miningConfig';
import { ITEM_DATABASE } from '../data/items';
import { Zap, X, Pickaxe } from 'lucide-react';

export default function MineView({ onClose }) {
  const { player, updateProfile, skills } = usePlayerStore();
  const { items, buyItem } = useInventoryStore();

  const [isMining, setIsMining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastLoot, setLastLoot] = useState(null);

  const miningSkill = (skills || []).find((s) => s.skill_name === 'miner')?.value || 0;
  const hasPickaxe = (items || []).some((i) => i.item_id === 'pickaxe');

  const calculateLoot = () => {
    const availableLoot = MINING_LOOT.filter((l) => miningSkill >= l.minSkill);
    const roll = Math.random() * 100 / (player.luck || 1);
    let currentChance = 0;
    for (const item of [...availableLoot].reverse()) {
      currentChance += item.chance;
      if (roll <= currentChance) return item;
    }
    return availableLoot[0];
  };

  const startMining = () => {
    if (!hasPickaxe) return alert('Нужна кирка!');
    if (player.energy < MINING_SETTINGS.energyCost) return alert('Нет энергии!');

    setIsMining(true);
    setProgress(0);
    setLastLoot(null);

    const step = 100 / (MINING_SETTINGS.miningTime / 100);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          finishMining();
          return 100;
        }
        return prev + step;
      });
    }, 100);
  };

  const finishMining = async () => {
    const loot = calculateLoot();
    const success = await buyItem(loot.id, 0, 1);
    if (success) {
      await updateProfile({
        energy: player.energy - MINING_SETTINGS.energyCost,
        exp: (player.exp || 0) + 5,
      });
      setLastLoot(ITEM_DATABASE[loot.id]);
    }
    setIsMining(false);
    setProgress(0);
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white">
      <div className="w-full flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">
              Industrial Zone
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">ШАХТА</h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 rounded-2xl active:scale-75 transition-all"
          >
            <X />
          </button>
        </div>

        <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px] mb-8 text-left">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black uppercase text-slate-500">
              Навык шахтера
            </span>
            <span className="text-orange-500 font-black italic">{miningSkill}%</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-1000"
              style={{ width: `${miningSkill}%` }}
            />
          </div>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center relative">
          {lastLoot && !isMining && (
            <div className="absolute top-0 animate-bounce text-center">
              <div className="w-20 h-20 bg-orange-500/20 rounded-3xl flex items-center justify-center text-4xl border border-orange-500/30 mb-2">
                {lastLoot.icon}
              </div>
              <p className="text-[10px] font-black uppercase text-orange-400">
                Добыто: {lastLoot.name}
              </p>
            </div>
          )}

          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-white/5"
              />
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={628}
                strokeDashoffset={628 - (628 * progress) / 100}
                strokeLinecap="round"
                className="text-orange-500 transition-all duration-100"
              />
            </svg>
            <div
              className={`relative z-10 w-32 h-32 bg-slate-900 rounded-[50px] border-2 border-white/10 flex items-center justify-center shadow-2xl transition-all ${
                isMining ? 'scale-110' : ''
              }`}
            >
              <Pickaxe
                size={60}
                className={isMining ? 'text-orange-500 animate-pulse' : 'text-slate-700'}
              />
            </div>
          </div>

          <button
            onClick={startMining}
            disabled={isMining || !hasPickaxe}
            className={`mt-12 w-full max-w-xs py-6 rounded-[32px] text-xl font-black uppercase italic transition-all ${
              hasPickaxe
                ? 'bg-orange-600 shadow-orange-900/40 active:scale-95'
                : 'bg-slate-800 opacity-50'
            }`}
          >
            {hasPickaxe ? (isMining ? 'ДОБЫЧА...' : 'НАЧАТЬ РАБОТУ') : 'НУЖНА КИРКА'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Zap size={16} className="text-yellow-500" />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Расход</p>
              <p className="text-xs font-bold">-{MINING_SETTINGS.energyCost} Energy</p>
            </div>
          </div>
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Pickaxe size={16} className="text-blue-500" />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Инструмент</p>
              <p className="text-xs font-bold">{hasPickaxe ? 'Кирка OK' : 'Нет'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}