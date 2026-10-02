import React, { useEffect, useState } from 'react';
import { X, Loader2, Swords, LogOut, Users } from 'lucide-react';
import { usePvpQueueStore } from './usePvpQueueStore';
import type { QueueFighter } from './types';

interface BoxViewProps { onClose: () => void; }

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

  // Выбранный соперник. Бой не запускается с одного клика по карточке:
  // случайно вызвать кого-то в бой — обиднее, чем сделать лишний клик.
  const [target, setTarget] = useState<string>('');

  // Подписка и опрос живут в сторе и стартуют в App, а не здесь.
  // Если поднимать их на открытии меню, вызванный бой не пришёл бы
  // тому, кто в этот момент смотрит на карту, — а именно такой
  // игрок и ждёт результат.
  useEffect(() => { void refresh(); }, [refresh, inQueue]);

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

  return (
    <div className="fixed inset-0 z-[800] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-gray-900 to-black flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">Бокс</h1>
          <div className="w-10" />
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-900/30 border border-red-700/40 text-xs text-red-300 break-words">
            {error}
          </div>
        )}

        {/* ------------------------------------------------ моя кнопка */}
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
                    <span>мощь {f.power}</span>
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
      </div>
{/* Модалка итога намеренно не здесь: её рисует App, чтобы
          результат показался и тем, кто сейчас не в меню. */}
    </div>
  );
}