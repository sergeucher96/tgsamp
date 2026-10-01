/**
 * Экономика территорий.
 *
 * Доход зоны складывается из двух частей:
 *   * base_income — базовый доход самой зоны;
 *   * налог с объектов — домов и бизнесов внутри неё.
 *
 * Налог берётся только с КУПЛЕННЫХ объектов: пустой дом или
 * никому не принадлежащий бизнес не приносят банду денег, иначе
 * одна банка захватила бы зону и получала доход с чужого
 * имущества, ничего не сделав.
 */

import type { Territory } from './territoriesConfig';
import type { AssetReport, TerritoryAssetSummary } from '../../../game/world/territoryAssets';

/** Сколько приносит один купленный объект в час. */
export const TERRITORY_TAX = {
  perHouse: 40,
  perBusiness: 260,
} as const;

export interface TerritoryIncomeBreakdown {
  base: number;
  taxFromHouses: number;
  taxFromBusinesses: number;
  total: number;
  objects: number;
}

export function territoryIncome(
  territory: Pick<Territory, 'base_income'>,
  assets?: Pick<TerritoryAssetSummary, 'houses' | 'businesses' | 'owned'>
): TerritoryIncomeBreakdown {
  const base = territory.base_income || 0;
  // owned — сколько объектов куплено; неизвестно — налог не берём,
  // чтобы не платить банду за чужое имущество
  const owned = assets?.owned ?? 0;

  const taxFromHouses = owned * TERRITORY_TAX.perHouse;
  const taxFromBusinesses = owned * TERRITORY_TAX.perBusiness;

  return {
    base,
    taxFromHouses,
    taxFromBusinesses,
    total: base + taxFromHouses + taxFromBusinesses,
    objects: owned,
  };
}

/**
 * Сводный доход банды по всем её зонам.
 *
 * Базовый доход берём из territories (в AssetReport его нет), а
 * налог — из уже посчитанных объектов зоны.
 */
export function gangIncome(
  report: AssetReport,
  territories: readonly Pick<Territory, 'id' | 'base_income'>[],
  gangId: string
): { income: TerritoryIncomeBreakdown; zones: number } {
  const baseByTerritory = new Map(territories.map(t => [t.id, t.base_income || 0]));
  const own = report.byTerritory.filter(t => t.ownerGangId === gangId);

  const income = own.reduce<TerritoryIncomeBreakdown>(
    (acc, zone) => {
      const breakdown = territoryIncome(
        { base_income: baseByTerritory.get(zone.territoryId) ?? 0 },
        zone
      );
      return {
        base: acc.base + breakdown.base,
        taxFromHouses: acc.taxFromHouses + breakdown.taxFromHouses,
        taxFromBusinesses: acc.taxFromBusinesses + breakdown.taxFromBusinesses,
        total: acc.total + breakdown.total,
        objects: acc.objects + breakdown.objects,
      };
    },
    { base: 0, taxFromHouses: 0, taxFromBusinesses: 0, total: 0, objects: 0 }
  );

  return { income, zones: own.length };
}
