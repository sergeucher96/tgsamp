import React, { useEffect, useMemo, useState } from 'react';
import { Swords, Clock, X, Users } from 'lucide-react';
import { useWarStore, type War } from '../../stores/useWarStore';
import { warTimeLeftMs } from './warService';
import { useTerritoryStore } from '../../stores/useTerritoryStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { GANGS, WAR_CONFIG, getGang } from './data/organizationsConfig';
import type { Territory } from './data/territoriesConfig';
import type { MapPoint } from '../../game/world/polygon';

/** Центр зоны: среднее по вершинам, а если их нет — середина прямоугольника. */
function territoryCenter(t: Territory): { x: number; y: number } | null {
  const points = t.points as MapPoint[] | undefined;
  if (points && points.length >= 3) {
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  }
  if (t.min_x || t.max_x || t.min_y || t.max_y) {
    return { x: (t.min_x + t.max_x) / 2, y: (t.min_y + t.max_y) / 2 };
  }
  return null;
}

/** Центры зон по id — чтобы маркер и окно показывали одно и то же. */
function useTerritoryCenters(territories: Territory[]) {
  return useMemo(() => {
    const map = new Map<number, { x: number; y: number; name: string }>();
    for (const t of territories) {
      const c = territoryCenter(t);
      if (c) map.set(t.id, { ...c, name: t.name });
    }
    return map;
  }, [territories]);
}

function formatTime(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function gangLabel(id: string | null): string {
  if (!id) return 'Никто';
  return `${getGang(id)?.icon ?? '⚪'} ${getGang(id)?.name ?? id}`;
}

/**
 * Значки войн на карте.
 *
 * Обязан рендериться ВНУТРИ TransformComponent, вместе с объектами
 * карты: координаты зон заданы в мировых пикселях (сотни и тысячи),
 * а экран — сотни. Вынесенный наружу маркер встаёт на 5000px правее
 * и ниже видимой области, то есть война есть, а значка не видно.
 */
export function WarMapMarkers() {
  const { wars, timeLeftMs, setOpenWarId } = useWarStore();
  const { territories } = useTerritoryStore();
  const centers = useTerritoryCenters(territories);

  if (wars.length === 0) return null;

  return (
    <div className="absolute inset-0" style={{ zIndex: 90, pointerEvents: 'none' }}>
      {wars.map(war => {
        const center = centers.get(war.territory_id);
        if (!center) return null;
        const left = timeLeftMs(war);

        return (
          <div
            key={war.id}
            className="absolute pointer-events-auto"
            style={{ left: `${center.x}px`, top: `${center.y}px`, transform: 'translate(-50%, -50%)', zIndex: 90 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenWarId(war.id);
              }}
              title={`Война за «${center.name}»`}
              className="relative flex flex-col items-center animate-pulse"
            >
              <span className="text-3xl drop-shadow-lg">⚔️</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${left < 60_000 ? 'bg-red-600' : 'bg-amber-600'}`}
              >
                {formatTime(left)}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Окно участия в войне.
 *
 * Реендерится НАД картой, вне TransformComponent. Если поместить его
 * внутрь, то `fixed` начнёт считаться относительно трансформированного
 * предка: окно уедет вместе с зумом и перестанет быть по центру экрана.
 */
export function WarMapOverlay() {
  const {
    wars,
    openWarId,
    setOpenWarId,
    participatingIn,
  myRankNumber,
  myWarPointsPerMin,
  isBusy,
  join,
  leave,
  getScore,
  } = useWarStore();
  const { territories } = useTerritoryStore();
  const { player } = usePlayerStore();

  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const centers = useTerritoryCenters(territories);
  const openWar = openWarId !== null ? wars.find(w => w.id === openWarId) ?? null : null;

  if (!openWar) return null;

  const handleParticipate = async (war: War) => {
    const leaving = participatingIn === war.id;
    const result = leaving ? await leave(war.id) : await join(war.id);
    setMessage(result.ok ? null : result.reason ?? null);
  };

  return (
    <div
      className="fixed inset-0 z-[600] bg-black/70 flex items-center justify-center p-4"
      onClick={() => setOpenWarId(null)}
    >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-gradient-to-b from-gray-900 to-black border border-red-900/40 p-5 text-white"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-lg font-black flex items-center gap-2">
                  <Swords size={20} className="text-red-400" />
                  {centers.get(openWar.territory_id)?.name ?? 'Территория'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Война за территории · {Math.round(WAR_CONFIG.durationMs / 60000)} мин
                </div>
              </div>
              <button onClick={() => setOpenWarId(null)} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            {/* Стороны */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { gang: openWar.attacker_gang_id, role: 'Атакует' },
                { gang: openWar.defender_gang_id, role: 'Защищает' },
              ].map(side => {
                const s = side.gang === openWar.attacker_gang_id ? getScore(openWar.id)?.attacker : getScore(openWar.id)?.defender;
                const leading = getScore(openWar.id)?.leader === side.gang;
                return (
                  <div
                    key={side.role}
                    className={`p-3 rounded-xl border text-center ${
                      leading ? 'border-emerald-500/40 bg-emerald-900/20' : 'border-white/10 bg-black/30'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 uppercase">{side.role}</div>
                    <div className="text-sm font-black mt-0.5">{gangLabel(side.gang)}</div>
                    <div className="text-3xl font-black my-1">{s?.score ?? 0}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-2">
                      <span className="flex items-center gap-0.5"><Users size={10} /> {s?.players ?? 0}</span>
                      <span>{Math.round((s?.seconds ?? 0) / 60)} мин</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {getScore(openWar.id)?.isTie && (
              <div className="text-[11px] text-amber-300 mb-3 text-center">
                Ничья — побеждает атакующий ({gangLabel(openWar.attacker_gang_id)})
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mb-4 text-sm">
              <Clock size={16} className="text-amber-300" />
              <span className="font-black">{formatTime(warTimeLeftMs(openWar, now))}</span>
              <span className="text-slate-400 text-xs">до конца войны</span>
            </div>

            {message && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-red-900/40 border border-red-700/40 text-xs text-red-200">
                {message}
              </div>
            )}

            <ParticipationButton
              war={openWar}
              participating={participatingIn === openWar.id}
              isBusy={isBusy}
              playerGangId={player?.organization_id ?? null}
              myRankNumber={myRankNumber}
              pointsPerMin={myWarPointsPerMin}
              onToggle={() => handleParticipate(openWar)}
            />
          </div>
    </div>
  );
}

interface ParticipationButtonProps {
  war: War;
  participating: boolean;
  isBusy: boolean;
  playerGangId: string | null;
  myRankNumber: number;
  /** Очки в минуту у ранга игрока — из редактора рангов */
  pointsPerMin: number;
  onToggle: () => void;
}

function ParticipationButton({ war, participating, isBusy, playerGangId, myRankNumber, pointsPerMin, onToggle }: ParticipationButtonProps) {
  const inThisWar = playerGangId === war.attacker_gang_id || playerGangId === war.defender_gang_id;

  if (!playerGangId) {
    return <div className="text-center text-xs text-slate-400 py-2">Вы не состоите в банде</div>;
  }
  if (!GANGS.some(g => g.id === playerGangId)) {
    return <div className="text-center text-xs text-slate-400 py-2">Воевать могут только уличные банды</div>;
  }
  if (!inThisWar) {
    return <div className="text-center text-xs text-slate-400 py-2">Ваша банда не участвует в этой войне</div>;
  }

  return (
    <div>
      <button
        onClick={onToggle}
        disabled={isBusy}
        className={`w-full py-3 rounded-xl font-black uppercase text-sm disabled:opacity-40 ${
          participating
            ? 'bg-red-600/30 hover:bg-red-600/40 border border-red-500/40 text-red-100'
            : 'bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-100'
        }`}
      >
        {participating ? 'Выйти из войны' : 'Участвовать'}
      </button>
      {participating && (
        <div className="mt-2 text-center text-[11px] text-emerald-300">
          Ранг {myRankNumber || '—'} · {pointsPerMin || 0} очков в минуту
        </div>
      )}
    </div>
  );
}
