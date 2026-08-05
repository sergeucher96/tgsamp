import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

const initialDancers = [
  {
    id: 'dancer_1',
    name: 'Луна',
    style: 'VIP-танцовщица',
    reputation: 25,
    bonus: 'Ускорение восстановления энергии',
    bonusValue: '+3% к восстановлению',
    personality: 'Холодная и уверенная',
    signature: 'Грациозный вальс света',
    description: 'Любит внимание публики и дарит гостям атмосферу элитарного шоу. Повышает скорость восстановления сил после миссий.',
    image: '/stripclub/luna.png',
  },
  {
    id: 'dancer_2',
    name: 'Миранда',
    style: 'Рок-звезда',
    reputation: 18,
    bonus: 'Повышенная стоимость продаж',
    bonusValue: '+2% к прибыли от заданий',
    personality: 'Страстная и громкая',
    signature: 'Взрывной гитарный рейв',
    description: 'Сильный сценический образ и яркая энергетика. Ее присутствие вдохновляет на большие сделки и бонусы.',
    image: '/stripclub/miranda.png',
  },
  {
    id: 'dancer_3',
    name: 'Ирис',
    style: 'Экзотика',
    reputation: 10,
    bonus: 'Меньше затрат на топливо',
    bonusValue: '-1% расход топлива',
    personality: 'Мистичная и загадочная',
    signature: 'Танец теней',
    description: 'Таинственная артистка, создающая атмосферу роскоши. Её бонусы помогают экономить ресурсы на долгих поездках.',
    image: 'public/iris.png',
  },
];

export default function StripClubView({ onClose }) {
  const player = usePlayerStore((state) => state.player);
  const [dancers, setDancers] = useState(initialDancers);
  const [selectedDancerId, setSelectedDancerId] = useState(initialDancers[0].id);

  const handleImproveReputation = (id) => {
    setDancers((current) => current.map((dancer) => {
      if (dancer.id !== id) return dancer;
      return {
        ...dancer,
        reputation: Math.min(100, dancer.reputation + 8),
      };
    }));
  };

  const [touchStartX, setTouchStartX] = useState(null);
  const selectedIndex = dancers.findIndex((dancer) => dancer.id === selectedDancerId);
  const selectedDancer = dancers[selectedIndex] || dancers[0];

  const goToPreviousDancer = () => {
    const previous = dancers[(selectedIndex - 1 + dancers.length) % dancers.length];
    setSelectedDancerId(previous.id);
  };

  const goToNextDancer = () => {
    const next = dancers[(selectedIndex + 1) % dancers.length];
    setSelectedDancerId(next.id);
  };

  const handleTouchStart = (event) => {
    setTouchStartX(event.touches[0].clientX);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX === null) return;
    const diffX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diffX) > 50) {
      if (diffX < 0) goToNextDancer();
      else goToPreviousDancer();
    }
    setTouchStartX(null);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white font-sans animate-in fade-in duration-300 overflow-hidden touch-auto overscroll-none" style={{ touchAction: 'pan-y' }}>
      <div className="w-full h-full bg-[#051009]/100 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15">
          <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f] hover:bg-[#152013]/90 transition">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>
          <div className="min-w-0 text-right">
            <p className="text-[8px] uppercase tracking-[0.35em] text-[#9eff52] font-black">Night Club</p>
            <h2 className="text-2xl font-black uppercase tracking-[0.12em] text-[#d6ff9f]">Velvet</h2>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-4">
          <div className="mb-3 flex items-center justify-center gap-4 rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-2 text-[10px] uppercase tracking-[0.16em] text-[#b8e8a3]">
            <button
              onClick={goToPreviousDancer}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7eff67]/20 bg-[#0b1b0d]/90 text-[#d6ff9f] transition hover:bg-[#143117]/90"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#d6ff9f]">
              {selectedDancer.name}
              <div className="text-[9px] text-[#9eff52] mt-1">{selectedIndex + 1} / {dancers.length}</div>
            </div>
            <button
              onClick={goToNextDancer}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7eff67]/20 bg-[#0b1b0d]/90 text-[#d6ff9f] transition hover:bg-[#143117]/90"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 rounded-[28px] border border-[#7eff67]/10 bg-[#071409]/80 overflow-hidden">
            <div
              className="h-full min-h-0 overflow-y-auto"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="p-3 grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="rounded-[28px] border border-[#7eff67]/10 bg-[#0b140f] p-3">
                  <div className="h-56 rounded-[28px] bg-[#112113] overflow-hidden mb-3 flex items-center justify-center">
                    <img
                      src={selectedDancer.image}
                      alt={selectedDancer.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/stripclub/placeholder.png'; }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#aef06c] font-black">Артистка</p>
                    <h3 className="text-xl font-black uppercase text-[#d6ff9f]">{selectedDancer.name}</h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9eff52]">{selectedDancer.style}</p>
                    <p className="text-[10px] text-[#b8e8a3] mt-2">{selectedDancer.personality}</p>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-3xl bg-[#081607]/90 p-3 border border-[#7eff67]/10">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Репутация</p>
                        <p className="font-black text-sm text-[#def1b8]">{selectedDancer.reputation}%</p>
                      </div>
                      <div className="rounded-3xl bg-[#081607]/90 p-3 border border-[#7eff67]/10">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Бонус</p>
                        <p className="font-black text-sm text-[#def1b8]">{selectedDancer.bonus}</p>
                        <p className="text-[11px] text-[#b8e8a3] mt-1">{selectedDancer.bonusValue}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-[28px] border border-[#7eff67]/10 bg-[#0b140f] p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#aef06c]">Описание</p>
                      <p className="mt-2 text-sm text-[#b8e8a3] leading-relaxed">{selectedDancer.description}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#aef06c]">Подпись</p>
                      <p className="mt-2 text-sm text-[#b8e8a3]">{selectedDancer.signature}</p>
                    </div>
                  </div>
                  <button onClick={() => handleImproveReputation(selectedDancer.id)} className="mt-4 w-full rounded-3xl bg-[#183317] border border-[#7eff67]/20 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#d6ff9f] hover:bg-[#22411b] transition">
                    Повысить репутацию
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
