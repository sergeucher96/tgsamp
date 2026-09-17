import {
  WEAR_SYSTEMS,
  WEAR_SYSTEM_ORDER,
  WEAR_WARN_THRESHOLD,
  CONDITION_WEIGHTS,
  CONDITION_PERFORMANCE,
  OIL_OVERDUE_EFFECTS,
  getSystemResource
} from '../../vehicles/data/vehicleConfig';

export type WearSystemKey =
  | 'oil'
  | 'tires'
  | 'battery'
  | 'brakes'
  | 'cooling'
  | 'electric'
  | 'suspension'
  | 'transmission'
  | 'engine';

export type WearStatus = 'ok' | 'warning' | 'overdue';

export interface WearSystemConfig {
  name: string;
  type: string;
  baseResource: number;
  action: string;
  cost: number;
}

export interface PerformanceMultiplier {
  speed: number;
  accel: number;
  brakes: number;
}

export interface PerformanceTier extends PerformanceMultiplier {
  min: number;
  max: number;
}

export interface OilOverdueEffect {
  ratio: number;
  multiplier: number;
}

export interface VehicleWear {
  model_id: string;
  mileage?: number;
  wear_oil?: number;
  wear_tires?: number;
  wear_battery?: number;
  wear_brakes?: number;
  wear_cooling?: number;
  wear_electric?: number;
  wear_suspension?: number;
  wear_transmission?: number;
  wear_engine?: number;
  repair_count?: number;
  condition?: number;
  health?: number;
  [key: string]: unknown;
}

export interface WearUpdates {
  mileage: number;
  condition: number;
  [key: string]: number | undefined;
}

export interface MaintenanceMessage {
  system: WearSystemKey;
  name: string;
  action: string;
  ratio: number;
  message: string;
}

export interface Diagnosis {
  key: WearSystemKey;
  name: string;
  type: string;
  action: string;
  cost: number;
  status: WearStatus;
  wearKm: number;
  resourceKm: number;
  percentUsed: number;
}

export type WearServiceUpdates = Record<string, number> & { repair_count: number };

const wearSystems = WEAR_SYSTEMS as Record<WearSystemKey, WearSystemConfig>;
const wearSystemOrder = WEAR_SYSTEM_ORDER as WearSystemKey[];
const conditionWeights = CONDITION_WEIGHTS as Record<WearSystemKey, number>;
const conditionPerformance = CONDITION_PERFORMANCE as PerformanceTier[];
const oilOverdueEffects = OIL_OVERDUE_EFFECTS as OilOverdueEffect[];
const getSystemResourceForWear = getSystemResource as (
  modelId: string,
  systemKey: WearSystemKey,
) => number;

function getVehicleNumber(vehicle: VehicleWear, key: string): number {
  return (vehicle[key] as number | undefined) || 0;
}

/**
 * Получить статус системы: 'ok' | 'warning' | 'overdue'
 */
export function getSystemStatus(wearKm: number, resourceKm: number): WearStatus {
  if (resourceKm <= 0) return 'ok';
  const ratio = wearKm / resourceKm;
  if (ratio < WEAR_WARN_THRESHOLD) return 'ok';       // 0–69%
  if (ratio <= 1.0) return 'warning';                  // 70–100%
  return 'overdue';                                    // >100%
}

/**
 * Получить текстовый статус для отображения
 */
export function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    ok: 'Исправно',
    warning: 'Требуется обслуживание',
    overdue: 'Просрочено'
  };
  return texts[status] || 'Исправно';
}

/**
 * Получить цветовой класс для статуса
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ok: 'text-green-400',
    warning: 'text-yellow-400',
    overdue: 'text-red-400'
  };
  return colors[status] || 'text-green-400';
}

/**
 * Получить коэффициент износа двигателя на основе состояния масла
 */
export function getEngineWearMultiplier(vehicle: VehicleWear): number {
  const modelId = vehicle.model_id;
  const oilResource = getSystemResourceForWear(modelId, 'oil');
  const oilWear = vehicle.wear_oil || 0;

  if (oilResource <= 0 || oilWear <= oilResource) return 1.0;

  const ratio = oilWear / oilResource;
  for (const effect of oilOverdueEffects) {
    if (ratio < effect.ratio) return effect.multiplier;
  }
  return oilOverdueEffects[oilOverdueEffects.length - 1].multiplier;
}

/**
 * Начислить износ всем системам за пройденное расстояние
 * distance — в единицах игрового мира (1 ед ≈ 1 км для упрощения)
 * Возвращает объект с новыми значениями износа
 */
export function applyWear(vehicle: VehicleWear, distance: number): VehicleWear | WearUpdates {
  if (!vehicle || distance <= 0) return vehicle;

  const updates: WearUpdates = {
    mileage: Math.round((vehicle.mileage || 0) + distance),
    condition: 0,
  };

  const engineMultiplier = getEngineWearMultiplier(vehicle);

  for (const sysKey of wearSystemOrder) {
    const dbField = `wear_${sysKey}`;
    const currentWear = getVehicleNumber(vehicle, dbField);
    let wearToAdd = distance;

    if (sysKey === 'engine') {
      wearToAdd = distance * engineMultiplier;
    }

    updates[dbField] = Math.round(currentWear + wearToAdd);
  }

  const newVehicle = { ...vehicle, ...updates };
  updates.condition = calculateOverallCondition(newVehicle);

  return updates;
}

/**
 * Рассчитать общее состояние автомобиля (0–100%)
 * На основе весов CONDITION_WEIGHTS
 */
export function calculateOverallCondition(vehicle?: VehicleWear | null): number {
  if (!vehicle) return 100;
  const modelId = vehicle.model_id;

  let totalCondition = 0;
  let totalWeight = 0;

  for (const [sysKey, weight] of Object.entries(conditionWeights) as [WearSystemKey, number][]) {
    const dbField = `wear_${sysKey}`;
    const wear = getVehicleNumber(vehicle, dbField);
    const resource = getSystemResourceForWear(modelId, sysKey);

    if (resource <= 0) continue;

    const health = Math.max(0, 1 - (wear / resource));
    totalCondition += health * weight * 100;
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    totalCondition = (totalCondition / totalWeight);
  }

  return Math.max(0, Math.min(100, Math.round(totalCondition)));
}

/**
 * Получить множитель характеристик на основе состояния
 */
export function getPerformanceMultiplier(condition: number): PerformanceMultiplier {
  const cond = Math.max(0, Math.min(100, condition || 0));
  for (const tier of conditionPerformance) {
    if (cond >= tier.min && cond <= tier.max) {
      return tier;
    }
  }
  return { speed: 1.0, accel: 1.0, brakes: 1.0 };
}

/**
 * Получить сообщение о необходимости обслуживания
 */
export function getMaintenanceMessages(vehicle?: VehicleWear | null): MaintenanceMessage[] {
  if (!vehicle) return [];
  const modelId = vehicle.model_id;
  const messages: MaintenanceMessage[] = [];

  for (const sysKey of wearSystemOrder) {
    const dbField = `wear_${sysKey}`;
    const wear = getVehicleNumber(vehicle, dbField);
    const resource = getSystemResourceForWear(modelId, sysKey);
    const sys = wearSystems[sysKey];

    if (resource <= 0) continue;

    const ratio = wear / resource;
    if (ratio > 1.0) {
      messages.push({
        system: sysKey,
        name: sys.name,
        action: sys.action,
        ratio: Math.round(ratio * 100),
        message: `${sys.name}: сильно просрочено! Требуется ${sys.action.toLowerCase()}.`
      });
    } else if (ratio >= WEAR_WARN_THRESHOLD) {
      messages.push({
        system: sysKey,
        name: sys.name,
        action: sys.action,
        ratio: Math.round(ratio * 100),
        message: `${sys.name}: требуется ${sys.action.toLowerCase()}.`
      });
    }
  }

  return messages;
}

/**
 * Получить данные для диагностики
 */
export function getDiagnosis(vehicle?: VehicleWear | null): Diagnosis[] {
  if (!vehicle) return [];
  const modelId = vehicle.model_id;
  const diagnosis: Diagnosis[] = [];

  for (const sysKey of wearSystemOrder) {
    const dbField = `wear_${sysKey}`;
    const wear = getVehicleNumber(vehicle, dbField);
    const resource = getSystemResourceForWear(modelId, sysKey);
    const sys = wearSystems[sysKey];
    const status = getSystemStatus(wear, resource);

    diagnosis.push({
      key: sysKey,
      name: sys.name,
      type: sys.type,
      action: sys.action,
      cost: sys.cost,
      status,
      wearKm: Math.round(wear),
      resourceKm: Math.round(resource),
      percentUsed: resource > 0 ? Math.round((wear / resource) * 100) : 0
    });
  }

  return diagnosis;
}

/**
 * Сбросить износ конкретной системы (после обслуживания)
 */
export function getServiceUpdates(vehicle: VehicleWear, systemKey: string): WearServiceUpdates | null {
  const sysKey = systemKey as WearSystemKey;
  if (!wearSystems[sysKey]) return null;
  const dbField = `wear_${sysKey}`;
  return {
    [dbField]: 0,
    repair_count: (vehicle.repair_count || 0) + 1
  };
}
