/**
 * Подсчёт объектов (домов, бизнесов) по территориям.
 *
 * Координаты везде одни и те же — целые пиксели текстуры карты (0…6144):
 *   дом      = Location(id = 'h_*').x/.y      из locations.ts
 *   бизнес   = Location(id = 'shop_1').x/.y   из locations.ts
 *   территория = bbox или points               из таблицы territories
 *
 * Проверка попадания та же, что и в игре: сначала полигон,
 * при его отсутствии — осевой прямоугольник (territoryService).
 */

import { BUSINESS_TYPES, RESOURCE_TYPES } from '../../features/businesses/data/businessConfig';
import type { Territory } from '../../features/gangs/data/territoriesConfig';
import { isInsidePolygon, type MapPoint } from './polygon';

export type AssetKind = 'house' | 'business';

export interface LocatableObject {
  id: string;
  x: number;
  y: number;
  type?: string;
  name?: string;
  class?: string;
}

export interface AssetObject extends LocatableObject {
  kind: AssetKind;
  /** null — объект не попал ни в одну зону */
  territoryId: number | null;
  territoryName: string | null;
  /** null — объект никому не принадлежит (не куплен) */
  ownerId: string | null;
}

export interface TerritoryAssetSummary {
  territoryId: number;
  territoryName: string;
  ownerGangId: string | null;
  houses: number;
  businesses: number;
  total: number;
  /** объекты в зоне, у которых есть владелец */
  owned: number;
  assets: AssetObject[];
}

export interface AssetReport {
  byTerritory: TerritoryAssetSummary[];
  /** объекты вне всех зон — обычно признак неверных координат зон */
  outsideZones: AssetObject[];
  /** объекты, попавшие сразу в несколько зон: контуры пересекаются */
  overlapping: AssetObject[];
  totals: {
    houses: number;
    businesses: number;
    total: number;
    owned: number;
    outsideZones: number;
    overlapping: number;
  };
}

/**
 * Префиксы id, которые считаем бизнесом.
 * Берём из BUSINESS_TYPES, поэтому новый тип бизнеса в конфиге
 * подхватывается автоматически. RESOURCE_TYPES — это ресурсы
 * (crop/oil/metal/...), а не покупаемые предприятия, их исключаем.
 */
export const BUSINESS_ID_PREFIXES: readonly string[] = Object.keys(BUSINESS_TYPES).filter(
  key => !(key in RESOURCE_TYPES)
);

export function isBusinessLocationId(id: string): boolean {
  return BUSINESS_ID_PREFIXES.includes(id.split('_')[0]);
}

/** Дом или бизнес — то, что вообще имеет смысл считать в зоне */
export function classifyAsset(location: LocatableObject): AssetKind | null {
  if (location.type === 'house') return 'house';
  if (isBusinessLocationId(location.id)) return 'business';
  return null;
}

function containsPoint(territory: Territory, x: number, y: number): boolean {
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

/**
 * Осевой прямоугольник территории — быстрая отбраковка.
 * Позволяет не гонять проверку по полигону, если объект
 * заведомо не может лежать в этой зоне.
 */
function mayContain(territory: Territory, x: number, y: number): boolean {
  if (territory.points && territory.points.length >= 3) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of territory.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  return (
    x >= (territory.min_x || 0) && x <= (territory.max_x || 0) &&
    y >= (territory.min_y || 0) && y <= (territory.max_y || 0)
  );
}

export interface CountAssetsOptions {
  locations: readonly LocatableObject[];
  territories: readonly Territory[];
  /** locationId → id владельца. Из useHouseStore.dbHouses и useBusinessStore */
  owners?: Readonly<Record<string, string | null>>;
}

/**
 * Разложить объекты по территориям.
 *
 * Одна зона на объект: если контуры пересеклись и точка попала
 * сразу в несколько, объект зачисляется первой по порядку,
 * а сам факт пересечения попадает в report.overlapping —
 * чтобы это можно было увидеть и починить контуры в RoadEditor.
 */
export function countAssetsByTerritory({
  locations,
  territories,
  owners,
}: CountAssetsOptions): AssetReport {
  const buckets = new Map<number, AssetObject[]>();
  for (const territory of territories) {
    buckets.set(territory.id, []);
  }

  const outsideZones: AssetObject[] = [];
  const overlapping: AssetObject[] = [];
  let houses = 0;
  let businesses = 0;
  let owned = 0;

  const ownerOf = (id: string) => owners?.[id] ?? null;

  for (const location of locations) {
    const kind = classifyAsset(location);
    if (!kind) continue;

    const matches = territories.filter(t => mayContain(t, location.x, location.y) && containsPoint(t, location.x, location.y));
    if (matches.length > 1) {
      overlapping.push({ ...location, kind, territoryId: matches[0].id, territoryName: matches[0].name, ownerId: ownerOf(location.id) });
    }

    const target = matches[0] ?? null;
    const asset: AssetObject = {
      ...location,
      kind,
      territoryId: target?.id ?? null,
      territoryName: target?.name ?? null,
      ownerId: ownerOf(location.id),
    };

    if (kind === 'house') houses++;
    else businesses++;
    if (asset.ownerId) owned++;

    if (target) buckets.get(target.id)!.push(asset);
    else outsideZones.push(asset);
  }

  const byTerritory: TerritoryAssetSummary[] = territories.map(territory => {
    const assets = buckets.get(territory.id) ?? [];
    return {
      territoryId: territory.id,
      territoryName: territory.name,
      ownerGangId: territory.owner_gang_id,
      houses: assets.filter(a => a.kind === 'house').length,
      businesses: assets.filter(a => a.kind === 'business').length,
      total: assets.length,
      owned: assets.filter(a => a.ownerId).length,
      assets,
    };
  });

  return {
    byTerritory,
    outsideZones,
    overlapping,
    totals: {
      houses,
      businesses,
      total: houses + businesses,
      owned,
      outsideZones: outsideZones.length,
      overlapping: overlapping.length,
    },
  };
}

/** Сводка по зонам одной банды — то, что нужно для дохода и влияния */
export function summarizeGangAssets(
  report: AssetReport,
  gangId: string
): { territories: number; houses: number; businesses: number; total: number; owned: number } {
  const own = report.byTerritory.filter(t => t.ownerGangId === gangId);

  return {
    territories: own.length,
    houses: own.reduce((sum, t) => sum + t.houses, 0),
    businesses: own.reduce((sum, t) => sum + t.businesses, 0),
    total: own.reduce((sum, t) => sum + t.total, 0),
    owned: own.reduce((sum, t) => sum + t.owned, 0),
  };
}

export interface PolygonAssetCount {
  houses: number;
  businesses: number;
  total: number;
  owned: number;
  /** объекты, не попавшие в контур — их покрывают другие зоны */
  outside: number;
}

/**
 * Подсчёт объектов внутри одного контура.
 *
 * Нужен в RoadEditor, пока зона ещё не сохранена: показываем
 * банду сколько домов и бизнесов попадёт в зону прямо во время
 * рисования, чтобы видеть результат до кнопки «Сохранить».
 */
export function countAssetsInPolygon(
  points: readonly MapPoint[],
  locations: readonly LocatableObject[],
  owners?: Readonly<Record<string, string | null>>
): PolygonAssetCount {
  const result: PolygonAssetCount = { houses: 0, businesses: 0, total: 0, owned: 0, outside: 0 };
  if (points.length < 3) {
    result.outside = locations.filter(l => classifyAsset(l) !== null).length;
    return result;
  }

  for (const location of locations) {
    const kind = classifyAsset(location);
    if (!kind) continue;

    if (!isInsidePolygon(location.x, location.y, points as MapPoint[])) {
      result.outside++;
      continue;
    }

    if (kind === 'house') result.houses++;
    else result.businesses++;
    result.total++;
    if (owners?.[location.id]) result.owned++;
  }

  return result;
}
