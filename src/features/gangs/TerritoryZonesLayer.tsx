import React, { useMemo } from 'react';
import { useTerritoryStore } from '../../stores/useTerritoryStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { getGang } from './data/organizationsConfig';
import { TERRITORY_STATUSES, type Territory } from './data/territoriesConfig';
import type { MapPoint } from '../../game/world/polygon';

/**
 * Контуры зон на карте.
 *
 * Живёт внутри TransformComponent, как и объекты: координаты зон
 * заданы в пикселях текстуры карты (0…6144), поэтому без общей с
 * картой трансформации контуры уедут за пределы экрана.
 *
 * Заливка и обводка — в одном SVG на весь слой, а не отдельными
 * div: зон может быть много, и на каждый rect-прогон браузером
 * заметно тяжелее, чем на один путь.
 */

/** Цвет зоны: явный из БД, иначе фирменный цвет банды, иначе серый. */
function zoneColor(t: Territory): string {
  if (t.color) return t.color;
  if (t.owner_gang_id) return getGang(t.owner_gang_id)?.mapColor ?? '#64748b';
  return '#64748b';
}

/** Война поверх зоны должна быть видна поверх цвета владельца. */
function strokeColor(t: Territory): string {
  if (t.status === 'WAR_ACTIVE') return '#ef4444';
  return zoneColor(t);
}

function zonePointsAttr(t: Territory): string | null {
  const pts = (t.points || []) as MapPoint[];
  if (pts.length >= 3) {
    return pts.map(p => `${p.x},${p.y}`).join(' ');
  }
  // Полигона ещё нет — рисуем осевой прямоугольник, иначе зона
  // исчезла бы с карты до того, как её обведут в RoadEditor.
  if (t.min_x || t.max_x || t.min_y || t.max_y) {
    return `${t.min_x},${t.min_y} ${t.max_x},${t.min_y} ${t.max_x},${t.max_y} ${t.min_x},${t.max_y}`;
  }
  return null;
}

export function TerritoryZonesLayer() {
  const { territories } = useTerritoryStore();
  const { player } = usePlayerStore();
  const myGangId = player?.organization_id ?? null;

  const zones = useMemo(
    () =>
      territories
        .map(t => ({ t, pts: zonePointsAttr(t) }))
        .filter((z): z is { t: Territory; pts: string } => z.pts !== null),
    [territories]
  );

  if (zones.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
      width="6144"
      height="6144"
    >
      {zones.map(({ t, pts }) => {
        const isMine = t.owner_gang_id === myGangId;
        const fill = zoneColor(t);
        const status = TERRITORY_STATUSES[t.status];

        return (
          <g key={t.id}>
            <polygon
              points={pts}
              fill={fill}
              // Своя зона чуть ярче: игроку важнее видеть, что его.
              fillOpacity={isMine ? 0.28 : 0.15}
              stroke={strokeColor(t)}
              strokeWidth={isMine ? 8 : 5}
              strokeOpacity={isMine ? 0.95 : 0.7}
            />
            {t.status === 'WAR_ACTIVE' && (
              <polygon
                points={pts}
                fill="none"
                stroke="#ef4444"
                strokeWidth="10"
                className="animate-pulse"
              />
            )}
            <text
              x={(t.min_x + t.max_x) / 2}
              y={(t.min_y + t.max_y) / 2}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="64"
              fontWeight="900"
              opacity="0.85"
              stroke="#000000"
              strokeWidth="10"
              paintOrder="stroke"
            >
              {status?.icon ?? '⚪'} {t.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default TerritoryZonesLayer;
