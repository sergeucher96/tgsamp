import { DEFAULT_TERRITORIES } from '../data/territoriesConfig';

function isInsideTerritory(x, y, territory) {
  return (
    x >= (territory.min_x || 0) &&
    x <= (territory.max_x || 0) &&
    y >= (territory.min_y || 0) &&
    y <= (territory.max_y || 0)
  );
}

export function getTerritoryByPosition(x, y, territories = []) {
  const source = territories.length > 0 ? territories : DEFAULT_TERRITORIES;

  for (const territory of source) {
    if (isInsideTerritory(x, y, territory)) {
      return territory;
    }
  }

  return null;
}

export function getTerritoryAtPosition(x, y, territories = []) {
  const source = territories.length > 0 ? territories : DEFAULT_TERRITORIES;
  const matches = source.filter(t => isInsideTerritory(x, y, t));
  return matches.length > 0 ? matches[0] : null;
}
