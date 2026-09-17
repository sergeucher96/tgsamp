import { DEFAULT_TERRITORIES, type Territory } from '../../features/gangs/data/territoriesConfig';

function isInsideTerritory(x: number, y: number, territory: Territory): boolean {
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
