import React, { useCallback, useEffect, useState } from 'react';
import { X, Swords, Loader2, Lock, RotateCcw } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { presentFight, type PresentedFight } from '../pvp/types';
import { FightComic } from '../pvp/FightResultModal';

interface BoxClubViewProps {
  onClose: () => void;
}

/**
 * Боксёрский клуб: бой с NPC.
 *
 * Боевой расчёт уехал на сервер (pvp_resolve_npc). Раньше бой
 * целиком считался здесь, через Math.random(), а деньги и опыт
 * начислялись вызовом из браузера. При открытом RLS это означало,
 * что награду можно было получить, не сходя в бой вовсе: достаточно
 * было дописать в консоли пару строк.
 *
 * Теперь клиент только выбирает противника и показывает то, что
 * вернул сервер. Список берётся из pvp_npc_available, а не из
 * локального массива — иначе закрытые по рейтингу противники
 * показывались бы и были бы доступны.
 *
 * РАУНДОВ ПО ХОДУ НЕТ. Раньше игрок сам выбирал удар или блок.
 * Теперь решение принимает сервер, иначе расчёт снова уехал бы в
 * клиент вместе с возможностью подкрутить исход.
 */

interface NpcRow {
  key: string;
  username: string;
  tier: string;
  min_rating: number;
  lvl: number;
  weapon_name: string;
  weapon_icon: string;
  available: boolean;
  locked_reason: string | null;
}

type Stage = 'menu' | 'result';

export default function BoxClubView({ onClose }: BoxClubViewProps) {
  const player = usePlayerStore((s) => s.player);
  const setPlayer = usePlayerStore.setState;

  const [stage, setStage] = useState<Stage>('menu');
  const [npcs, setNpcs] = useState<NpcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fighting, setFighting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fight, setFight] = useState<PresentedFight | null>(null);
  const [reward, setReward] = useState<number>(0);

  const playerId = player?.id ?? null;

  const loadNpcs = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    const { data, error: err } = await supabase.rpc('pvp_npc_available', {
      p_player_id: playerId,
    });
    if (err) setError(`Список противников недоступен [${err.code}]`);
    else if (data) setNpcs((data ?? []) as NpcRow[]);
    setLoading(false);
  }, [playerId]);

  useEffect(() => { void loadNpcs(); }, [loadNpcs]);

  const startFight = async (npcKey: string) => {
    if (!playerId) return;
    setFighting(npcKey);
    setError(null);

    const { data, error: err } = await supabase.rpc('pvp_resolve_npc', {
      p_player_id: playerId,
      p_npc_key: npcKey,
    });

    setFighting(null);

    if (err) {
      setError(`Бой не состоялся [${err.code}]: ${err.message}`);
      await loadNpcs();
      return;
    }
    if (!data) {
      setError('Бой не состоялся');
      return;
    }

    // Вызывающий — игрок, поэтому он всегда сторона 'a'.
    setFight(presentFight(data, 'a'));
    setReward(Number(data.reward_money) || 0);

    // Сервер списал или начислил деньги и качнул дисциплины.
    // Профиль на клиенте про это ещё не знает, поэтому обновляем
    // деньги: сумма разошлась бы до следующего логина.
    //
    // Навыки перечитывать не нужно: характеристики больше не
    // дублируются в player_skills, а меню бокса читает их прямо из
    // pvp_boxing_progress. Кэшировать их в клиенте значило бы завести
    // вторую правду, которая стёрлась бы при перезагрузке страницы.
    if (typeof data.money === 'number') {
      setPlayer((prev) => ({
        player: prev.player ? { ...prev.player, money: data.money } : prev.player,
      }));
    }
    await loadNpcs();
    setStage('result');
  };

  const backToMenu = () => {
    setStage('menu');
    setFight(null);
    setReward(0);
  };

  // ------------------------------------------------------------ меню
  if (stage === 'menu') {
    return (
      <div className="fixed inset-0 z-[440] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full bg-[#0a0f1a] border-t sm:border border-white/10 sm:rounded-3xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px]">
          <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Swords size={16} className="text-[#8cff4a]" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8cff4a]">
                Боксерский клуб
              </span>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
              <X size={18} className="text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4">
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-900/30 border border-red-700/40 text-xs text-red-300 break-words">
                {error}
              </div>
            )}

            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
              Выберите противника
            </div>

            {loading ? (
              <div className="text-center text-xs text-slate-400 py-8">Загрузка...</div>
            ) : (
              <div className="space-y-3">
                {npcs.map((npc) => {
                  const busy = fighting === npc.key;
                  const blocked = !npc.available || busy;

                  return (
                    <button
                      key={npc.key}
                      onClick={() => startFight(npc.key)}
                      disabled={blocked}
                      className={`w-full bg-white/[0.03] border border-white/6 p-4 rounded-2xl text-left transition-all ${
                        blocked ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-3xl">{npc.weapon_icon}</div>
                        <div>
                          <div className="text-sm font-black uppercase italic text-white">
                            {npc.username}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {npc.tier === 'real' ? 'Боевой противник' : 'Тренировочный'} · ур. {npc.lvl}
                          </div>
                        </div>
                        {busy && <Loader2 size={16} className="ml-auto animate-spin text-[#8cff4a]" />}
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-slate-400">
                        <span>{npc.weapon_name}</span>
                        {npc.available ? (
                          <span className="ml-auto text-[#8cff4a] font-black">В бой</span>
                        ) : (
                          <span className="ml-auto text-amber-400 flex items-center gap-1">
                            <Lock size={10} /> {npc.locked_reason ?? 'Недоступен'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/6 text-[11px] text-slate-400 leading-relaxed">
              Бой считает сервер: он не перебрасывается и не повторяется, а опыт
              бокса начисляется по тому, какими приёмами ты бил. Качать дисциплины
              можно в спортзале — там за деньги и без риска.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ итог
  return (
      <div className="fixed inset-0 z-[420] bg-black/80 backdrop-blur-sm flex flex-col text-white">

      <div className="flex-1 overflow-y-auto p-4 flex items-center">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                fight?.won ? 'bg-emerald-600' : 'bg-rose-700'
              }`}
            >
              {fight?.won ? 'Победа' : 'Поражение'}
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
              <X size={16} />
            </button>
          </div>

          {fight && (
            // FightComic, а не FightResultModal: модалка —
            // полноэкранный слой, и внутри экрана она перекрыла бы
            // и сам бой, и блок с наградой под ним.
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6">
              <FightComic fight={fight} />
            </div>
          )}

          {reward > 0 && (
            <div className="mt-3 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 text-center">
              Награда за победу: +{reward.toLocaleString('ru')}$
            </div>
          )}

          <button
            onClick={backToMenu}
            className="w-full mt-3 py-3 rounded-xl bg-white/5 text-xs font-black flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} /> К списку противников
          </button>
        </div>
      </div>
    </div>
  );
}