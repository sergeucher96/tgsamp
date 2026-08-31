import React, { useState } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { ITEM_DATABASE } from '../data/items';
import { Fish, ShoppingBag, X, Anchor, Waves } from 'lucide-react';

const FISHING_ROD_PRICE = 2000;

// Fish types with loot table probabilities
const FISH_TYPES = [
  { id: 'fish_small',  weight: [1, 3],  chance: 50, icon: '🐟', label: 'Небольшая рыба' },
  { id: 'fish_medium', weight: [3, 7],  chance: 30, icon: '�', label: 'Рыба' },
  { id: 'fish_large',  weight: [7, 10], chance: 20, icon: '🐡', label: 'Крупная рыба' },
];

const TREASURE_MAP_CHANCE = 1; // 1% chance to catch treasure map

export default function FishingPortView({ onClose }) {
  const { player, updateProfile } = usePlayerStore();
  const { items, buyItem } = useInventoryStore();

  const [isFishing, setIsFishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastCatch, setLastCatch] = useState(null); // { type, weight, icon, label }
  const [phase, setPhase] = useState('idle');

  const hasFishingRod = (items || []).some(i => i.item_id === 'fishing_rod');
  const totalFishKg = FISH_TYPES.reduce((sum, f) =>
    sum + (items || []).reduce((s, i) => i.item_id === f.id ? s + Number(i.amount) : s, 0), 0
  );

  const buyFishingRod = async () => {
    if (Number(player.money) < FISHING_ROD_PRICE) return alert('Недостаточно денег!');
    const success = await buyItem('fishing_rod', FISHING_ROD_PRICE, 1);
    if (!success) alert('Не удалось купить удочку!');
  };

  const pickFishType = () => {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const fish of FISH_TYPES) {
      cumulative += fish.chance;
      if (roll < cumulative) {
        const weight = Math.floor(Math.random() * (fish.weight[1] - fish.weight[0])) + fish.weight[0];
        return { type: fish.id, weight, icon: fish.icon, label: fish.label };
      }
    }
    return { type: 'fish_small', weight: 1, icon: '🐟', label: 'Небольшая рыба' };
  };

  const startFishing = () => {
    if (player.energy < 5) return alert('Нет энергии!');
    setIsFishing(true);
    setProgress(0);
    setLastCatch(null);
    setPhase('casting');

    setTimeout(() => setPhase('waiting'), 500);

    const totalDuration = 3000;
    const step = 100 / (totalDuration / 100);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + step;
      });
    }, 100);

    setTimeout(() => {
      const roll = Math.random() * 100;
      let catchData = null;

      // 1% chance for treasure map
      if (roll < TREASURE_MAP_CHANCE) {
        catchData = { type: 'treasure_map', weight: 1, icon: '🗺️', label: 'Карта сокровищ!' };
        setLastCatch(catchData);
        buyItem('treasure_map', 0, 1);
        setPhase('reeling');
      }
      // 80% chance to catch fish
      else if (roll < TREASURE_MAP_CHANCE + 80) {
        catchData = pickFishType();
        setLastCatch(catchData);
        buyItem(catchData.type, 0, catchData.weight);
        setPhase('reeling');
      }
      // Nothing caught
      else {
        catchData = { type: 'miss', weight: 0, icon: '💨', label: 'Пусто!' };
        setLastCatch(catchData);
        setPhase('idle');
      }

      updateProfile({ energy: player.energy - 5 });

      setTimeout(() => {
        setIsFishing(false);
        setProgress(0);
        setPhase('idle');
      }, catchData?.type === 'miss' ? 800 : 1200);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white">
      <div className="w-full flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="text-left">
            <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-1">
              Recreation
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <Anchor size={32} /> РЫБОЛОВНЫЙ ПОРТ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 rounded-2xl active:scale-75 transition-all"
          >
            <X />
          </button>
        </div>

        {!hasFishingRod && (
          <div className="bg-white/[0.03] border border-cyan-500/30 p-5 rounded-[32px] mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-2xl">
                🎣
              </div>
              <div className="flex-1">
                <h3 className="font-black uppercase italic text-sm">Удочка</h3>
                <p className="text-[10px] text-slate-400">Необходима для рыбалки</p>
              </div>
              <button
                onClick={buyFishingRod}
                className="bg-cyan-600 px-4 py-2 rounded-xl text-xs font-black uppercase active:scale-95 flex items-center gap-2"
              >
                <ShoppingBag size={14} /> {FISHING_ROD_PRICE.toLocaleString()} ₽
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Fish size={16} className="text-cyan-400" />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Лов</p>
              <p className="text-xs font-bold">{totalFishKg} кг</p>
            </div>
          </div>
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Anchor size={16} className={hasFishingRod ? 'text-cyan-400' : 'text-slate-600'} />
            <div className="text-left">
              <p className="text-[8px] text-slate-500 uppercase font-black">Удочка</p>
              <p className="text-xs font-bold">{hasFishingRod ? ' Есть' : ' Нет'}</p>
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center relative min-h-[200px]">
          {lastCatch && phase === 'reeling' && lastCatch.type !== 'miss' && (
            <div className="absolute top-0 animate-bounce text-center">
              <div className="text-5xl mb-2">{lastCatch.icon}</div>
              <p className="text-[10px] font-black uppercase text-cyan-400">
                {lastCatch.type === 'treasure_map'
                  ? lastCatch.label
                  : `+${lastCatch.weight} кг${lastCatch.label}!`
                }
              </p>
            </div>
          )}
          {lastCatch?.type === 'miss' && (
            <div className="absolute top-0 animate-bounce text-center">
              <div className="text-5xl mb-2">{lastCatch.icon}</div>
              <p className="text-[10px] font-black uppercase text-red-400">{lastCatch.label}</p>
            </div>
          )}
          {phase === 'idle' && !isFishing && lastCatch === null && (
            <div className="text-center">
              <Waves size={60} className="text-cyan-500/30 mx-auto mb-4" />
              <p className="text-[10px] text-slate-500 uppercase font-black">Нажмите для рыбалки</p>
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
                className="text-cyan-500 transition-all duration-100"
              />
            </svg>
            <div
              className={`relative z-10 w-32 h-32 bg-slate-900 rounded-[50px] border-2 border-white/10 flex items-center justify-center shadow-2xl transition-all ${
                isFishing ? 'scale-110' : ''
              }`}
            >
              <span className={`text-6xl ${isFishing ? 'animate-pulse' : ''}`}>
                {phase === 'casting' ? '🎣' : phase === 'waiting' ? '🌊' : lastCatch?.icon || '⚓'}
              </span>
            </div>
          </div>

          <button
            onClick={startFishing}
            disabled={isFishing || !hasFishingRod}
            className={`mt-12 w-full max-w-xs py-6 rounded-[32px] text-xl font-black uppercase italic transition-all ${
              hasFishingRod
                ? 'bg-cyan-600 shadow-cyan-900/40 active:scale-95'
                : 'bg-slate-800 opacity-50'
            }`}
          >
            {!hasFishingRod ? 'НУЖНА УДОЧКА' : isFishing ? 'ЛОВЛЯ...' : 'РЫБАЧИТЬ'}
          </button>
        </div>
      </div>
    </div>
  );
}