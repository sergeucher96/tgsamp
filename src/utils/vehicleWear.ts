import {
  WEAR_SYSTEMS,
  WEAR_SYSTEM_ORDER,
  WEAR_WARN_THRESHOLD,
  CONDITION_WEIGHTS,
  CONDITION_PERFORMANCE,
  OIL_OVERDUE_EFFECTS,
  getSystemResource,
  type VehicleModelId,
  type WearSystemKey,
  type ConditionPerformance,
} from '../data/vehicleConfig';

export interface VehicleWearData {
  model_id: VehicleModelId;

  mileage?: number;
  condition?: number;
  health?: number;
  repair_count?: number;

  wear_oil?: number;
  wear_tires?: number;
  wear_battery?: number;
  wear_brakes?: number;
  wear_cooling?: number;
  wear_electric?: number;
  wear_suspension?: number;
  wear_transmission?: number;
  wear_engine?: number;
}

export type VehicleWearUpdates = {
  mileage?: number;
  condition?: number;
  repair_count?: number;
} & Partial<Record<`wear_${WearSystemKey}`, number>>;

export type SystemStatus = 'ok' | 'warning' | 'overdue';

export interface MaintenanceMessage {
  system: WearSystemKey;
  name: string;
  action: string;
  ratio: number;
  message: string;
}

export interface DiagnosisItem {
  key: WearSystemKey;
  name: string;
  type: string;
  action: string;
  cost: number;
  status: SystemStatus;
  wearKm: number;
  resourceKm: number;
  percentUsed: number;
}

/**
 * Получить статус системы: 'ok' | 'warning' | 'overdue'
 */
export function getSystemStatus(
  wearKm: number,
  resourceKm: number
): SystemStatus {
  if (resourceKm <= 0) return 'ok';

  const ratio = wearKm / resourceKm;

  if (ratio < WEAR_WARN_THRESHOLD) return 'ok';
  if (ratio <= 1.0) return 'warning';

  return 'overdue';
}

/**
 * Получить текстовый статус для отображения
 */
export function getStatusText(status: SystemStatus): string {
  const texts: Record<SystemStatus, string> = {
    ok: 'Исправно',
    warning: 'Требуется обслуживание',
    overdue: 'Просрочено',
  };

  return texts[status] || 'Исправно';
}

/**
 * Получить цветовой класс для статуса
 */
export function getStatusColor(status: SystemStatus): string {
  const colors: Record<SystemStatus, string> = {
    ok: 'text-green-400',
    warning: 'text-yellow-400',
    overdue: 'text-red-400',
  };

  return colors[status] || 'text-green-400';
}

/**
 * Получить коэффициент износа двигателя на основе состояния масла
 */
export function getEngineWearMultiplier(
  vehicle: VehicleWearData
): number {
  const modelId = vehicle.model_id;
  const oilResource = getSystemResource(modelId, 'oil');
  const oilWear = vehicle.wear_oil || 0;

  if (oilResource <= 0 || oilWear <= oilResource) return 1.0;

  const ratio = oilWear / oilResource;

  for (const effect of OIL_OVERDUE_EFFECTS) {
    if (ratio < effect.ratio) return effect.multiplier;
  }

  return OIL_OVERDUE_EFFECTS[OIL_OVERDUE_EFFECTS.length - 1].multiplier;
}

/**
 * Начислить износ всем системам за пройденное расстояние
 * distance — в единицах игрового мира (1 ед ≈ 1 км для упрощения)
 * Возвращает объект с новыми значениями износа
 */
export function applyWear(
  vehicle: VehicleWearData,
  distance: number
): VehicleWearUpdates | VehicleWearData {
  if (!vehicle || distance <= 0) return vehicle;

  const modelId = vehicle.model_id;
  const updates: VehicleWearUpdates = {};

  // Общий пробег (округляем для INTEGER колонки)
  updates.mileage = Math.round((vehicle.mileage || 0) + distance);

  // Коэффициент износа двигателя (влияние масла)
  const engineMultiplier = getEngineWearMultiplier(vehicle);

  // Начисляем износ каждой системе
  for (const sysKey of WEAR_SYSTEM_ORDER) {
    const dbField = `wear_${sysKey}` as `wear_${WearSystemKey}`;
    const currentWear = vehicle[dbField] || 0;

    let wearToAdd = distance;

    // Для двигателя применяем множитель от масла
    if (sysKey === 'engine') {
      wearToAdd = distance * engineMultiplier;
    }

    updates[dbField] = Math.round(currentWear + wearToAdd);
  }

  // Рассчитываем новое общее состояние
  const newVehicle = {
    ...vehicle,
    ...updates,
  };

  updates.condition = calculateOverallCondition(newVehicle);

  return updates;
}

/**
 * Рассчитать общее состояние автомобиля (0–100%)
 * На основе весов CONDITION_WEIGHTS
 */
export function calculateOverallCondition(
  vehicle: VehicleWearData
): number {
  if (!vehicle) return 100;

  const modelId = vehicle.model_id;

  let totalCondition = 0;
  let totalWeight = 0;

  for (const [sysKey, weight] of Object.entries(CONDITION_WEIGHTS) as [
    WearSystemKey,
    number
  ][]) {
    const dbField = `wear_${sysKey}` as `wear_${WearSystemKey}`;
    const wear = vehicle[dbField] || 0;
    const resource = getSystemResource(modelId, sysKey);

    if (resource <= 0) continue;

    const health = Math.max(0, 1 - wear / resource);

    totalCondition += health * weight * 100;
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    totalCondition = totalCondition / totalWeight;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(totalCondition))
  );
}

/**
 * Получить множитель характеристик на основе состояния
 */
export function getPerformanceMultiplier(
  condition: number
): ConditionPerformance {
  const cond = Math.max(0, Math.min(100, condition || 0));

  for (const tier of CONDITION_PERFORMANCE) {
    if (cond >= tier.min && cond <= tier.max) {
      return tier;
    }
  }

  return {
    min: 0,
    max: 100,
    speed: 1.0,
    accel: 1.0,
    brakes: 1.0,
  };
}

/**
 * Получить сообщение о необходимости обслуживания
 */
export function getMaintenanceMessages(
  vehicle: VehicleWearData
): MaintenanceMessage[] {
  if (!vehicle) return [];

  const modelId = vehicle.model_id;
  const messages: MaintenanceMessage[] = [];

  for (const sysKey of WEAR_SYSTEM_ORDER) {
    const dbField = `wear_${sysKey}` as `wear_${WearSystemKey}`;
    const wear = vehicle[dbField] || 0;
    const resource = getSystemResource(modelId, sysKey);
    const sys = WEAR_SYSTEMS[sysKey];

    if (resource <= 0) continue;

    const ratio = wear / resource;

    if (ratio > 1.0) {
      messages.push({
        system: sysKey,
        name: sys.name,
        action: sys.action,
        ratio: Math.round(ratio * 100),
        message: `${sys.name}: сильно просрочено! Требуется ${sys.action.toLowerCase()}.`,
      });
    } else if (ratio >= WEAR_WARN_THRESHOLD) {
      messages.push({
        system: sysKey,
        name: sys.name,
        action: sys.action,
        ratio: Math.round(ratio * 100),
        message: `${sys.name}: требуется ${sys.action.toLowerCase()}.`,
      });
    }
  }

  return messages;
}

/**
 * Получить данные для диагностики
 */
export function getDiagnosis(
  vehicle: VehicleWearData
): DiagnosisItem[] {
  if (!vehicle) return [];

  const modelId = vehicle.model_id;
  const diagnosis: DiagnosisItem[] = [];

  for (const sysKey of WEAR_SYSTEM_ORDER) {
    const dbField = `wear_${sysKey}` as `wear_${WearSystemKey}`;
    const wear = vehicle[dbField] || 0;
    const resource = getSystemResource(modelId, sysKey);
    const sys = WEAR_SYSTEMS[sysKey];
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
      percentUsed:
        resource > 0
          ? Math.round((wear / resource) * 100)
          : 0,
    });
  }

  return diagnosis;
}

/**
 * Сбросить износ конкретной системы (после обслуживания)
 */
export function getServiceUpdates(
  vehicle: VehicleWearData,
  systemKey: WearSystemKey
): VehicleWearUpdates | null {
  if (!WEAR_SYSTEMS[systemKey]) return null;

  const dbField = `wear_${systemKey}` as `wear_${WearSystemKey}`;

  return {
    [dbField]: 0,
    repair_count: (vehicle.repair_count || 0) + 1,
  };
}