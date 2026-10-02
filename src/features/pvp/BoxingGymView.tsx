import React, { useEffect } from 'react';
import { X, Loader2, Dumbbell, Lock, Sparkles, Zap } from 'lucide-react';
import { useBoxingStore, type Stat } from './useBoxingStore';

interface BoxingGymViewProps { onClose: () => void; }

/**
 * Спортзал: три станции, тренировка за энергию.
 *
 * Что видно и зачем. Главный элемент — не характеристики, а запас
 * энергии: именно он ограничивает, сколько подходов игрок успеет
 * сделать. Поэтому он стоит сверху во всю ширину, а характеристики
 * идут ниже и показывают, во что эти подходы сложились.
 *
 * Отката нет намеренно. В Punch Club тренировка не ждёт таймера:
 * нажал — потратил энергию, получил опыт, нажал снова, пока хватит.
 * Ограничитель один, и он честный: ресурс, а не минуты на часах.
 */

/** Разряды с пробелами — числа на полосах опыта. */
const num = (n: number) => n.toLocaleString('ru');

export default function BoxingGymView({ onClose }: BoxingGymViewProps) {
  const { progress, loading, training, error, levelUp, refresh, train, clearLevelUp } =
    useBoxingStore();

  // Энергия восстанавливается сама, поэтому прогресс перечитывается:
  // без опроса полоса показывала бы «сил нет» и после того, как
  // игрок поел и подождал.
  useEffect(() => {
    void refresh();
    const t = setInterval(() => { void refresh(); }, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  const energy = progress?.energy ?? 0;
  const energyMax = progress?.energy_max ?? 100;
  const energyPct = Math.min(100, Math.round((energy / energyMax) * 100));
  const items = progress?.items ?? [];
  const sessions = progress?.sessions_left ?? 0;

  return (
    <div className="fixed inset-0 z-[820] bg-[#040802] flex flex-col text-white">
      <div className="w-full max-w-lg mx-auto gta-panel flex-1 overflow-y-auto p-4">
        {/* ------------------------------------------------ шапка */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-10" />
          <h1 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Dumbbell size={16} className="text-[#8cff4a]" /> Спортзал
          </h1>
          <button onClick={onClose} className="w-10 p-2 gta-button rounded-xl">
            <X size={16} />
          </button>
        </div>

        {/* ------------------------------------------------ энергия */}
        {/* Главный ресурс зала, поэтому он первым и во всю ширину.
            Полоса и число подходов отвечают на разные вопросы:
            «сколько сил» и «сколько раз ещё можно». */}
        <div className="gta-frame rounded-2xl p-3 mb-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              Силы
            </span>
            <span className="text-xs font-black text-[#8cff4a] tabular-nums">
              {energy} / {energyMax}
            </span>
          </div>

          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2f7a1c] to-[#8cff4a] transition-[width] duration-300"
              style={{ width: `${energyPct}%` }}
            />
          </div>

          <div className="mt-1.5 text-[10px] text-slate-400">
            {sessions > 0 ? (
              <>осталось подходов: <span className="font-black text-white">{sessions}</span></>
            ) : (
              <>сил нет — поешь и подожди, они вернутся</>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-900/30 border border-red-700/40 text-xs text-red-300">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-8">Загрузка...</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const busy = training === item.stat;
              const blocked = item.max_level || !item.affordable || busy;

              const pct = item.max_level
                ? 100
                : Math.min(100, Math.round((item.xp_in_level / item.xp_need) * 100));

              return (
                <div
                  key={item.stat}
                  className="gta-panel rounded-2xl p-3 border border-white/10"
                >
                  {/* ---------------------------------- уровень */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">{item.icon}</div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-400">{item.effect}</div>
                    </div>

                    <div className="shrink-0 text-center">
                      <div className="text-[9px] uppercase text-slate-500">уровень</div>
                      <div className="text-2xl font-black text-[#8cff4a] leading-none tabular-nums">
                        {item.level}
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------ опыт */}
                  {item.max_level ? (
                    <div className="h-9 rounded-xl bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-xs font-black text-emerald-400 mb-2">
                      Максимальный уровень
                    </div>
                  ) : (
                    <>
                      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-gradient-to-r from-[#4caf2a] to-[#8cff4a]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-baseline justify-between text-[11px] mb-2.5">
                        <span className="text-slate-300 tabular-nums">
                          <span className="font-black text-white">{num(item.xp_in_level)}</span>
                          {' / '}
                          {num(item.xp_need)}
                          <span className="text-slate-500"> опыта</span>
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          до {item.level + 1} ур.
                        </span>
                      </div>
                    </>
                  )}

                  {/* --------------------------------- кнопка */}
                  <button
                    onClick={() => train(item.stat as Stat)}
                    disabled={blocked}
                    className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 ${
                      blocked
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : 'gta-button active:scale-[0.98] transition-transform'
                    }`}
                  >
                    {busy ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Тренировка...
                      </>
                    ) : item.max_level ? (
                      <>
                        <Lock size={13} /> Всё прокачано
                      </>
                    ) : !item.affordable ? (
                      <>
                        <Zap size={13} /> Нужны силы — поешь или подожди
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Тренировать · {progress?.energy_cost} силы · +{item.train_xp} опыта
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 leading-relaxed">
          Тренировка тратит силы, а не деньги: пока есть запас, жми
          сколько хочешь. Силы восстанавливаются, пока ты сыт и не хочешь
          пить, поэтому еда — это и есть второй ресурс спортзала.
          Характеристики растут и за бои, но бой лишь показывает разницу:
          опыт за него приходит по тому, чем ты пользовался.
        </div>
      </div>

      {/* Повышение уровня показывается поверх всего: после подхода
          игрок смотрит на свои характеристики, а не на окно поверх них. */}
      {levelUp && (
        <div className="fixed inset-0 z-[900] bg-black/85 flex items-center justify-center p-6">
          <button
            onClick={clearLevelUp}
            className="w-full max-w-xs p-7 rounded-3xl gta-frame bg-gradient-to-b from-[#3f8f1f] to-[#1d4d0e] text-center active:scale-95 transition-transform"
          >
            <div className="text-6xl mb-3">{levelUp.icon}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200 mb-1">
              Новый уровень
            </div>
            <div className="text-5xl font-black mb-4 tabular-nums">{levelUp.level}</div>
            <div className="text-sm font-black flex items-center justify-center gap-2">
              {levelUp.title}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
