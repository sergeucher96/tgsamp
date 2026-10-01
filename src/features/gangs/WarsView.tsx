import React, { useEffect, useState } from 'react';
import { X, Swords, Clock, Users, MapPin, Target } from 'lucide-react';
import { useWarStore, type War } from '../../stores/useWarStore';
import { warTimeLeftMs } from './warService';
import { useTerritoryStore } from '../../stores/useTerritoryStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { GANGS, WAR_CONFIG, getGang } from '../gangs/data/organizationsConfig';

interface WarsViewProps { onClose: () => void; }

function formatTime(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function gangName(id: string | null): string {
  if (!id) return 'Никто';
  return getGang(id)?.name ?? id;
}

function gangIcon(id: string | null): string {
  return id ? getGang(id)?.icon ?? '⚪' : '⚪';
}

function gangColor(id: string | null): string {
  return id ? getGang(id)?.color ?? 'bg-gray-600' : 'bg-gray-600';
}

export default function WarsView({ onClose }: WarsViewProps) {
  const {
    wars,
    participatingIn,
    myRankNumber,
    isBusy,
    fetchWars,
    declareWar,
    join,
    leave,
    getScore,
    tick,
  } = useWarStore();
  const { territories, fetchTerritories } = useTerritoryStore();
  const { player } = usePlayerStore();
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'info' } | null>(null);

  const playerGangId = player?.organization_id ?? null;
  const isGang = GANGS.some(g => g.id === playerGangId);

  useEffect(() => {
    fetchWars();
    fetchTerritories();
    void tick();
  }, [fetchWars, fetchTerritories, tick]);

  // Локальный тикер только для отображения: обновляет цифру
  // секунд каждый раз, не дёргая базу.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const canStart = isGang && myRankNumber >= WAR_CONFIG.canStartWarMinRank;

  const targets = territories.filter(t => t.owner_gang_id !== playerGangId && !wars.some(w => w.territory_id === t.id));

  const handleDeclare = async (territoryId: number) => {
    const result = await declareWar(territoryId);
    if (!result.ok) {
      setMessage({ text: result.reason, kind: 'error' });
      return;
    }
    setMessage({ text: 'Война объявлена! Значок появился на карте.', kind: 'info' });
  };

  const handleParticipate = async (war: War) => {
    const result = participatingIn === war.id ? await leave(war.id) : await join(war.id);
    if (!result.ok) {
      setMessage({ text: result.reason, kind: 'error' });
      return;
    }
    setMessage({ text: participatingIn === war.id ? 'Вы вышли из войны.' : 'Вы участвуете в войне.', kind: 'info' });
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-red-950/90 to-gray-900 flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Swords size={22} className="text-red-400" /> Войны за территории
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Война длится {Math.round(WAR_CONFIG.durationMs / 60000)} минуты. Очки банде капают за каждую минуту
              участия: ранг × минуты. Объявить войну может ранг {WAR_CONFIG.canStartWarMinRank} и выше,
              стоимость ${WAR_CONFIG.cost.toLocaleString()}.
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {message && (
          <div
            onClick={() => setMessage(null)}
            className={`mb-3 px-3 py-2 rounded-xl text-xs cursor-pointer ${
              message.kind === 'error' ? 'bg-red-900/40 border border-red-700/40 text-red-200' : 'bg-emerald-900/30 border border-emerald-700/40 text-emerald-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {!isGang && (
          <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-300">
            Воевать могут только участники уличных банд.
          </div>
        )}

        {isGang && !canStart && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-900/20 border border-amber-700/30 text-sm text-amber-100">
            Объявить войну может участник с рангом {WAR_CONFIG.canStartWarMinRank} или выше.
            Ваш ранг: {myRankNumber || '—'}.
          </div>
        )}

        {/* === Идущие войны === */}
        <div className="text-xs text-slate-400 uppercase mb-2">Идущие сейчас ({wars.length})</div>
        <div className="space-y-2 mb-5">
          {wars.length === 0 && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-400">
              Активных войн нет. Значки появятся на карте у оспариваемых территорий.
            </div>
          )}

          {wars.map(war => {
            const left = warTimeLeftMs(war, now);
            const score = getScore(war.id);
            const territory = territories.find(t => t.id === war.territory_id);
            const mySide = war.attacker_gang_id === playerGangId || war.defender_gang_id === playerGangId;
            const participating = participatingIn === war.id;

            // За сколько очков ранг 10 выиграл бы эту войну
            const topScore = score?.leader ? (score.leader === war.attacker_gang_id ? score.attacker : score.defender)?.score ?? 0 : 0;

            return (
              <div key={war.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <span className="font-black">{territory?.name ?? `Территория #${war.territory_id}`}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg ${gangColor(war.attacker_gang_id)} font-black`}>
                      ⚔️ атакует
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-black ${left < 60_000 ? 'text-red-400' : 'text-amber-300'}`}>
                    <Clock size={14} /> {formatTime(left)}
                  </div>
                </div>

                {/* Счёт */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { gang: war.attacker_gang_id, role: 'Атакующий', s: score?.attacker },
                    { gang: war.defender_gang_id, role: 'Защитник', s: score?.defender },
                  ].map(side => (
                    <div
                      key={`${side.role}-${side.gang}`}
                      className={`p-3 rounded-xl border ${
                        score?.leader === side.gang ? 'border-emerald-500/40 bg-emerald-900/20' : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 uppercase">{side.role}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span>{gangIcon(side.gang)}</span>
                        <span className="text-sm font-black">{gangName(side.gang)}</span>
                      </div>
                      <div className="text-2xl font-black mt-1">{side.s?.score ?? 0}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-0.5"><Users size={10} /> {side.s?.players ?? 0}</span>
                        <span>{Math.round((side.s?.seconds ?? 0) / 60)} мин</span>
                      </div>
                    </div>
                  ))}
                </div>

                {score?.isTie && (
                  <div className="text-[11px] text-amber-300 mb-2">
                    Ничья — побеждает атакующий ({gangName(war.attacker_gang_id)}).
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {mySide ? (
                    <button
                      onClick={() => handleParticipate(war)}
                      disabled={isBusy || left <= 0}
                      className={`flex-1 px-4 py-2 rounded-xl font-black text-xs uppercase disabled:opacity-40 ${
                        participating
                          ? 'bg-red-600/30 border border-red-500/40 text-red-200'
                          : 'bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-100'
                      }`}
                    >
                      {participating ? 'Выйти из войны' : 'Участвовать'}
                    </button>
                  ) : (
                    <div className="flex-1 text-center text-[11px] text-slate-400 py-2">
                      Ваша банда не участвует в этой войне
                    </div>
                  )}
                </div>

                {participating && (
                  <div className="mt-2 text-[11px] text-emerald-300 flex items-center gap-1">
                    <Target size={12} />
                    Идёт набор: ранг {myRankNumber} даёт {myRankNumber} очков в минуту
                    {topScore > 0 && <span className="text-slate-400">· у лидера {topScore}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* === Объявление войны === */}
        {canStart && (
          <>
            <div className="text-xs text-slate-400 uppercase mb-2">Объявить войну ({targets.length})</div>
            <div className="space-y-1.5">
              {targets.length === 0 && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400">
                  Нет доступных территорий: все зоны либо ваши, либо уже оспариваются.
                </div>
              )}
              {targets.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.color || '#64748b' }} />
                    <span className="text-sm">{t.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${gangColor(t.owner_gang_id)}`}>
                      {gangName(t.owner_gang_id)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeclare(t.id)}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/40 border border-red-500/40 text-[10px] font-black uppercase disabled:opacity-40"
                  >
                    Объявить · ${WAR_CONFIG.cost.toLocaleString()}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
