import { DEFAULT_TERRITORIES, type Territory } from '../../features/gangs/data/territoriesConfig';
import { isInsidePolygon, type MapPoint } from './polygon';

function isInsideTerritory(x: number, y: number, territory: Territory): boolean {
  // Точный контур приоритетнее прямоугольника: иначе игрок числится
  // внутри зоны на участке, который на карте свободен
  const points = territory.points as MapPoint[] | undefined;
  if (points && points.length >= 3) {
    return isInsidePolygon(x, y, points);
  }

  return (
    x >= (territory.min_x || 0) &&
    x <= (territory.max_x || 0) &&
    y >= (territory.min_y || 0) &&
    y <= (territory.max_y || 0)
  );
}

export function getTerritoryByPosition(
  x: number,
  y: number,
  territories: readonly Territory[] = []
): Territory | null {
  const source = territories.length > 0 ? territories : DEFAULT_TERRITORIES;

  for (const territory of source) {
    if (isInsideTerritory(x, y, territory)) {
      return territory;
    }
  }

  return null;
}

export function getTerritoryAtPosition(
  x: number,
  y: number,
  territories: readonly Territory[] = []
): Territory | null {
  const source = territories.length > 0 ? territories : DEFAULT_TERRITORIES;
  const matches = source.filter(territory => isInsideTerritory(x, y, territory));
  return matches.length > 0 ? matches[0] : null;
}
