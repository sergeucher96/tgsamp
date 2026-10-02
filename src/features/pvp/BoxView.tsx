import React, { useEffect, useState } from 'react';
import { X, Loader2, Swords, LogOut, Users, Dumbbell, ChevronRight, HelpCircle, User } from 'lucide-react';
import { usePvpQueueStore } from './usePvpQueueStore';
import { useBoxingStore } from './useBoxingStore';
import BoxingGymView from './BoxingGymView';
import BoxingHelpView from './BoxingHelpView';
import BoxingCharacterView from './BoxingCharacterView';
import type { QueueFighter } from './types';

interface BoxViewProps { onClose: () => void }

/**
 * Три стата, которые игрок видит в бою. Потолки совпадают с
 * c_trained_*_cap в снимке бойца: у силы он 40, у скорости и
 * выносливости 100. Подсветка «потолок» должна наступать там же,
 * где он действительно есть, иначе игрок будет качать впустую.
 *
 * Сами значения — это снаряжение ПЛЮС тренировка. Разделить их в
 * панели нельзя: снимок отдаёт только сумму, а догадываться о
 * вкладе каждой части — значит завести на клиенте вторую правду.
 */
const BOX_STATS = [
  { key: 'strength', icon: '💪', label: 'Сила', cap: 60 },
  { key: 'agility', icon: '🦶', label: 'Ловкость', cap: 60 },
  { key: 'stamina', icon: '🫀', label: 'Выносливость', cap: 60 },
] as const;

/**
 * Бокс: подбор противника из тех, кто стоит в очереди.
 *
 * Порядок действий игрока:
 *   1. «Встать в очередь» — появляешься в общем списке;
 *   2. любой может выбрать тебя и начать бой;
 *   3. бой считает сервер, итог видят оба;
 *   4. после боя ты вне очереди и можешь встать снова.
 *
 * Почему список обновляется и по событию, и по таймеру. Событие
 * realtime может потеряться — соединение с Realtime рвётся при
 * сворачивании телеграма. Тогда список просто подтянется при
 * следующем тике, а очередь на сервере живёт по своему TTL в
 * любом случае.
 */
export default function BoxView({ onClose }: BoxViewProps) {
  const {
    inQueue, fighters, loading, fighting, error,
    refresh, join, leave, fight,
  } = usePvpQueueStore();

  // Тренировки живут в этом же меню, а не в локации спортзала: заходить
  // на карте ради кнопки «тренировать» было лишним шагом, а локация
  // без своего интерьера всё равно показывала чужую картинку.
  const gymProgress = useBoxingStore((s) => s.progress);
  const refreshGym = useBoxingStore((s) => s.refresh);
  const stats = useBoxingStore((s) => s.stats);
  const refreshStats = useBoxingStore((s) => s.refreshStats);
  const [showTraining, setShowTraining] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'training' | 'character'>('queue');

  // Выбранный соперник. Бой не запускается с одного клика по карточке:
  // случайно вызвать кого-то в бой — обиднее, чем сделать лишний клик.
  const [target, setTarget] = useState<string>('');

  // Подписка и опрос живут в сторе и стартуют в App, а не здесь.
  // Если поднимать их на открытии меню, вызванный бой не пришёл бы
  // тому, кто в этот момент смотрит на карту, — а именно такой
  // игрок и ждёт результат.
  useEffect(() => { void refresh(); }, [refresh, inQueue]);

  // Уровни на плашке тренировок появляются сразу при открытии меню:
  // ждать, пока игрок сам зайдёт в спортзал, означало бы показывать
  // три пустые полоски вместо его настоящего прогресса.
  useEffect(() => { void refreshGym(); }, [refreshGym]);

  // Характеристики меняются вместе со снаряжением, а не тренировкой,
  // поэтому обновляем их только при открытии меню.
  useEffect(() => { void refreshStats(); }, [refreshStats]);

  const handleJoin = async () => {
    const ok = await join();
    if (ok) await refresh();
  };

  const handleFight = async (opponentId: string) => {
    // Вызывающий — это тот, кто нажал «вызвать». Он всегда
    // сидит на стороне 'a', и итог приезжает прямо в ответе.
    const result = await fight(opponentId);
    if (result) {
      // Кладём в стор, а не в локальный state: тот же путь, что у
      // защитника, — одна модалка на обоих.
      usePvpQueueStore.setState({ lastFight: result });
      setTarget('');
    }
  };

// ------------------------------------------------------------------ вид

  const tabs = [
    { key: 'queue', label: 'Очередь', icon: <Users size={13} /> },
    { key: 'training', label: 'Тренировки', icon: <Dumbbell size={13} /> },
    { key: 'character', label: 'Персонаж', icon: <User size={13} /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-[800] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-gray-900 to-black flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">Бокс</h1>
          <button
            onClick={() => setShowHelp(true)}
            aria-label="Инструкция"
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center
                       active:scale-90 transition-transform"
          >
            <HelpCircle size={16} />
          </button>
        </div>

        {/* Табы */}
        <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                         text-xs font-black transition-colors ${
                activeTab === tab.key
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-900/30 border border-red-700/40 text-xs text-red-300 break-words">
            {error}
          </div>
        )}

        {/* -------------------------------------------------------- контент табов */}
        {activeTab === 'queue' && (
          <>
            {/* ------------------------------------------------ кнопка очереди */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-4">
              {inQueue ? (
                <>
                  <div className="flex items-center gap-2 text-xs mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-black">Вы в очереди</span>
                  </div>
                  <button
                    onClick={leave}
                    disabled={fighting}
                    className="w-full py-3 rounded-xl bg-white/10 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <LogOut size={14} /> Выйти из очереди
                  </button>
                </>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={fighting}
                  className="w-full py-3 rounded-xl bg-emerald-600 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {fighting ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
                  Встать в очередь
                </button>
              )}
            </div>

            {/* ----------------------------------------------- соперники */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase text-slate-400">Готовы к бою</h2>
              <span className="text-[10px] text-slate-500">{fighters.length}</span>
            </div>

            {loading && fighters.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">Загрузка...</div>
            ) : fighters.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400">
                Пока никого нет. Встаньте в очередь первым — вас увидят другие.
              </div>
            ) : (
              <div className="space-y-2">
                {fighters.map((f: QueueFighter) => {
                  const selected = target === f.player_id;
                  return (
                    <button
                      key={f.player_id}
                      onClick={() => setTarget(selected ? '' : f.player_id)}
                      disabled={fighting}
                      className={`w-full text-left p-3 rounded-2xl border ${
                        selected
                          ? 'bg-amber-900/30 border-amber-600/50'
                          : 'bg-white/5 border-white/10'
                      } ${fighting ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black">{f.username}</span>
                        {f.lvl != null && (
                          <span className="text-[10px] text-slate-500">ур. {f.lvl}</span>
                        )}
                        <span className="ml-auto text-[10px] text-slate-400">
                          рейтинг {f.rating}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>здоровье {f.power}</span>
                        <span className="ml-auto text-slate-500">
                          {selected ? 'нажмите ещё раз, чтобы начать бой' : 'вызов на бой'}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Второй шаг. Кнопка, а не второй клик по карточке:
                    подтверждение должно быть видно перед отправкой боя. */}
                {target && (
                  <button
                    onClick={() => handleFight(target)}
                    disabled={fighting}
                    className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {fighting ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
                    {fighting ? 'Бой идёт...' : 'Начать бой'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'training' && (
          <>
            {/* --------------------------------------------- тренировки */}
            <button
              onClick={() => setShowTraining(true)}
              className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center shrink-0">
                <Dumbbell size={17} className="text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-black">Тренировки</span>
                  <span className="text-[9px] text-[#8cff4a] tabular-nums">
                    сил {gymProgress?.energy ?? 0}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {(gymProgress?.items ?? []).map((i, idx) => {
                    const pct = i.max_level
                      ? 100
                      : Math.min(100, Math.round((i.xp_in_level / i.xp_need) * 100));
                    return (
                      <div key={i.stat ?? idx} className="flex-1 min-w-0">
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#4caf2a] to-[#8cff4a]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                          {i.icon} {i.level}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500 shrink-0" />
            </button>

            {/* --------------------------------------- характеристики в табе тренировки */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-4">
              <div className="flex items-baseline justify-between mb-2.5">
                <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Характеристики
                </h2>
                <span className="text-[9px] text-slate-500">снаряжение + тренировка</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {BOX_STATS.map((s) => {
                  const value = stats?.[s.key] ?? 0;
                  const atCap = s.cap != null && value >= s.cap;
                  return (
                    <div key={s.key}
                         className="p-2 rounded-xl bg-black/30 border border-white/5">
                      <div className="text-base mb-0.5">{s.icon}</div>
                      <div className={`text-lg font-black leading-none tabular-nums ${
                        atCap ? 'text-[#8cff4a]' : 'text-white'
                      }`}>
                        {value}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1 leading-tight">
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 text-[9px] text-slate-500 leading-relaxed">
                Сила идёт в урон, ловкость — в уклонение и темп боя,
                выносливость — в запас энергии и крепость стойки.
              </div>
            </div>
          </>
        )}

        {activeTab === 'character' && (
          <BoxingCharacterView onClose={() => setActiveTab('queue')} />
        )}
      </div>

      {/* Слой выше меню (820 против 800), поэтому тренировка
          перекрывает очередь целиком, а не рисуется поверх неё. */}
      {showTraining && <BoxingGymView onClose={() => setShowTraining(false)} />}
      {/* Справка выше всего: её открывают поверх тренировки и читают,
          ничего не меняя. */}
      {showHelp && <BoxingHelpView onClose={() => setShowHelp(false)} />}
      {/* Модалка итога намеренно не здесь: её рисует App, чтобы
          результат показался и тем, кто сейчас не в меню. */}
    </div>
  );
}