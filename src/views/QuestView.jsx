import React, { useMemo, useState } from 'react';
import { X, Award, MapPin, DollarSign, Banknote, ArrowDownRight, Smartphone, Home, Car, TrendingUp, ChevronRight } from 'lucide-react';
import { useQuestStore } from '../store/useQuestStore';
import { QUESTS_DATABASE } from '../data/questsConfig';

export default function QuestView({ onClose }) {
  const store = useQuestStore();
  const completedQuestIds = store.completedQuestIds;

  const [selectedQuest, setSelectedQuest] = useState(null);
  const [activeCategory, setActiveCategory] = useState('tutorial');

  const tutorialQuests = useMemo(() =>
    QUESTS_DATABASE.filter(q => q.category === 'tutorial').sort((a, b) => a.order - b.order), []);

  const mainQuests = useMemo(() =>
    QUESTS_DATABASE.filter(q => q.category === 'main').sort((a, b) => a.order - b.order), []);

  const categories = [
    { id: 'tutorial', label: 'Обучение', icon: '🎓', quests: tutorialQuests },
    { id: 'main', label: 'Основные', icon: '⭐', quests: mainQuests },
  ];

  const quests = categories.find(c => c.id === activeCategory)?.quests || [];
  const completedCount = quests.filter(q => completedQuestIds.includes(q.id)).length;

  const getProgress = (quest) => {
    if (completedQuestIds.includes(quest.id)) return 100;
    return store.getQuestProgress(quest) || 0;
  };

  const getStages = (quest) => {
    const cond = quest.condition;
    const progress = getProgress(quest);
    if (cond.type === 'deposit') return [
      { label: 'Зайдите в банк', done: progress > 0 },
      { label: `Пополните счёт на ${cond.amount} ₽`, done: progress >= 100 },
    ];
    if (cond.type === 'withdraw') return [
      { label: 'Зайдите в банк', done: progress > 0 },
      { label: 'Снимите наличные', done: progress >= 100 },
    ];
    if (cond.type === 'earn_money') return [
      { label: 'Начните зарабатывать', done: progress > 0 },
      { label: `Заработайте ${cond.amount.toLocaleString()} ₽`, done: progress >= 100 },
    ];
    if (cond.type === 'visit') return [
      { label: 'Исследуйте город', done: progress > 0 },
      { label: `Посетите ${cond.count} локаций`, done: progress >= 100 },
    ];
    if (cond.type === 'buy_house') return [
      { label: 'Найдите дом', done: progress > 0 },
      { label: 'Купите квартиру', done: progress >= 100 },
    ];
    if (cond.type === 'transfer') return [
      { label: 'Откройте раздел переводов', done: progress > 0 },
      { label: 'Переведите деньги', done: progress >= 100 },
    ];
    return [{ label: quest.description, done: progress >= 100 }];
  };

  const selectedData = selectedQuest ? {
    quest: selectedQuest,
    stages: getStages(selectedQuest),
    progress: getProgress(selectedQuest),
  } : null;

  return (
    <div className="fixed inset-0 z-[400] bg-[#020617] flex flex-col text-white font-sans">
      <div className="w-full flex-1 bg-[#0a1208] flex flex-col overflow-hidden">

        {/* Header - GTA style */}
        <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-[#0f1a0b] to-[#0a1208] border-b border-[#68ff79]/15 flex items-center justify-between">
          <div>
            <p className="text-[#8cff4a] font-black uppercase text-[9px] tracking-[0.4em]">Журнал заданий</p>
            <h2 className="text-xl font-black uppercase italic tracking-tight text-white leading-none">Миссии</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl active:scale-90"><X size={18}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* LEFT PANEL - Categories & Quest List */}
          <div className="w-[200px] shrink-0 border-r border-[#68ff79]/10 flex flex-col">
            {/* Category tabs */}
            <div className="flex flex-col">
              {categories.map(cat => {
                const catCompleted = cat.quests.filter(q => completedQuestIds.includes(q.id)).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setSelectedQuest(null); }}
                    className={`px-3 py-2 text-left font-black text-xs uppercase tracking-wider transition-all ${
                      activeCategory === cat.id
                        ? 'bg-[#68ff79]/15 text-[#8cff4a] border-l-2 border-[#68ff79]'
                        : 'text-slate-400 hover:text-white border-l-2 border-transparent'
                    }`}
                  >
                    <span className="mr-1">{cat.icon}</span>{cat.label}
                    <span className="float-right text-[9px] opacity-60">{catCompleted}/{cat.quests.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Quest list */}
            <div className="flex-1 overflow-y-auto no-scrollbar mt-2">
              {quests.map(quest => {
                const isCompleted = completedQuestIds.includes(quest.id);
                const isSelected = selectedQuest?.id === quest.id;
                const prog = getProgress(quest);

                return (
                  <button
                    key={quest.id}
                    onClick={() => setSelectedQuest(quest)}
                    className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-all ${
                      isSelected ? 'bg-[#68ff79]/20' : isCompleted ? 'bg-emerald-500/5' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-[#8cff4a]' : prog > 0 ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span className="text-sm">{quest.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[11px] font-black truncate ${isCompleted ? 'text-[#8cff4a]' : 'text-white'}`}>
                          {quest.title}
                        </div>
                        {!isCompleted && prog > 0 && (
                          <div className="w-full bg-white/5 rounded-full h-[2px] mt-1">
                            <div className="bg-amber-400 h-[2px] rounded-full" style={{ width: `${prog}%` }} />
                          </div>
                        )}
                      </div>
                      {isCompleted && <Award size={12} className="text-[#8cff4a] shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL - Quest Detail */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-[#08100a]">
            {selectedData ? (
              <div className="p-4">
                {/* Quest header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{selectedData.quest.icon}</span>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-[#8cff4a] font-black">{selectedData.quest.category === 'tutorial' ? 'Обучение' : 'Основная'}</p>
                    <h3 className="text-lg font-black uppercase italic">{selectedData.quest.title}</h3>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white/[0.03] border border-white/6 rounded-xl p-3 mb-4">
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedData.quest.description}</p>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>Прогресс</span>
                    <span className="text-amber-400 font-black">{Math.round(selectedData.progress)}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all" style={{ width: `${selectedData.progress}%` }} />
                  </div>
                </div>

                {/* Stages */}
                <div className="mb-4">
                  <h4 className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-black mb-2">Этапы</h4>
                  {selectedData.stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                        stage.done ? 'bg-[#8cff4a]/20 border-[#8cff4a] text-[#8cff4a]' : 'bg-white/5 border-white/10 text-slate-600'
                      }`}>
                        <span className="text-[10px] font-black">{i + 1}</span>
                      </div>
                      <span className={`text-xs ${stage.done ? 'text-[#8cff4a]' : 'text-slate-400'}`}>
                        {stage.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reward */}
                <div className="bg-[#68ff79]/5 border border-[#68ff79]/15 rounded-xl p-3">
                  <h4 className="text-[9px] uppercase tracking-[0.3em] text-[#8cff4a] font-black mb-2">Награда</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#8cff4a]/15 rounded-lg flex items-center justify-center">
                      <DollarSign size={14} className="text-[#8cff4a]" />
                    </div>
                    <span className="text-lg font-black text-[#8cff4a]">{selectedData.quest.rewardText}</span>
                  </div>
                </div>

                {/* Claim reward button */}
                {selectedData.progress >= 100 && !completedQuestIds.includes(selectedData.quest.id) && (
                  <button
                    onClick={() => store.completeQuest(selectedData.quest.id)}
                    className="w-full mt-4 bg-[#8cff4a] hover:bg-[#68ff79] text-black font-black uppercase py-3 rounded-xl transition-all active:scale-95 text-sm"
                  >
                    Завершить задание
                  </button>
                )}

                {selectedData.progress >= 100 && completedQuestIds.includes(selectedData.quest.id) && (
                  <div className="mt-4 bg-[#8cff4a]/10 border border-[#8cff4a]/20 rounded-xl p-3 text-center">
                    <p className="text-[#8cff4a] font-black text-sm uppercase">✓ Задание выполнено</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-600">
                <div className="text-center">
                  <ChevronRight size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs uppercase tracking-widest font-black">Выберите задание</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}