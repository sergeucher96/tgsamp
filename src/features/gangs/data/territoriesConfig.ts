export interface ControlLevel {
  min: number;
  max: number;
  label: string;
  color: string;
}

export type TerritoryStatus =
  | 'NEUTRAL'
  | 'CONTROLLED'
  | 'TENSION'
  | 'WAR_PREPARATION'
  | 'WAR_ACTIVE'
  | 'OCCUPIED'
  | 'STABILIZING';

export interface TerritoryStatusConfig {
  label: string;
  color: string;
  icon: string;
}

export interface Territory {
  id: number;
  name: string;
  owner_gang_id: string | null;
  status: TerritoryStatus;
  activity: number;
  base_income: number;
  control: number;
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  /** Точный контур зоны в координатах карты. Если нет — используется прямоугольник */
  points?: { x: number; y: number }[];
  /** Цвет отрисовки зоны на карте */
  color?: string;
}

export interface TerritoryInfluence {
  id?: string | number;
  territory_id: number;
  gang_id: string;
  influence: number;
}

export interface ActivityDecayConfig {
  intervalMs: number;
  decayPerTick: number;
  minActivity: number;
  maxActivity: number;
}

export interface InfluenceDecayFactors {
  gangHeadquarters: number;
  controlledProperties: number;
  activePlayers: number;
  territoryUpgrades: number;
}

export interface InfluenceDecayConfig {
  intervalMs: number;
  baseDecayPerTick: number;
  minInfluence: number;
  maxInfluence: number;
  factors: InfluenceDecayFactors;
}

export interface GangContext {
  hasHeadquarters?: boolean;
  controlledProperties?: number;
  activePlayers?: number;
  upgrades?: number;
}

export const CONTROL_LEVELS: ControlLevel[] = [
  { min: 0, max: 29, label: 'Слабый контроль', color: 'bg-red-500' },
  { min: 30, max: 49, label: 'Нестабильный', color: 'bg-orange-500' },
  { min: 50, max: 69, label: 'Контролируется', color: 'bg-yellow-500' },
  { min: 70, max: 89, label: 'Сильный контроль', color: 'bg-blue-500' },
  { min: 90, max: 100, label: 'Укреплена', color: 'bg-emerald-500' },
];

export function getControlLevel(control: number): ControlLevel {
  return CONTROL_LEVELS.find(level => control >= level.min && control <= level.max) || CONTROL_LEVELS[0];
}

export const TERRITORY_STATUSES: Record<TerritoryStatus, TerritoryStatusConfig> = {
  NEUTRAL: { label: 'Нейтральная', color: 'bg-gray-500', icon: '⚪' },
  CONTROLLED: { label: 'Контролируется', color: 'bg-purple-500', icon: '🟣' },
  TENSION: { label: 'Напряжение', color: 'bg-orange-500', icon: '🟠' },
  WAR_PREPARATION: { label: 'Подготовка к войне', color: 'bg-red-500', icon: '🔴' },
  WAR_ACTIVE: { label: 'Война', color: 'bg-red-700', icon: '💥' },
  OCCUPIED: { label: 'Оккупирована', color: 'bg-yellow-600', icon: '🟡' },
  STABILIZING: { label: 'Стабилизация', color: 'bg-blue-500', icon: '🔵' },
};

/**
 * Зоны НЕ хранятся в коде: они рисуются на карте в RoadEditor
 * (режим «Зона войны») и лежат в таблице territories.
 *
 * Раньше здесь был черновой список из прямоугольников 400×400.
 * Он не годился: прямоугольники пересекались, покрывали не весь
 * город и оставляли две зоны вовсе без объектов. Из-за этого
 * подсчёт домов и бизнесов по зонам давал произвольные числа —
 * 36% объектов попадали сразу в несколько зон.
 *
 * Пустой массив — осознанное решение, а не заглушка: пока зон нет,
 * countAssets возвращает всё в outsideZones, вместо того чтобы
 * размазать объекты по выдуманным границам.
 */
export const DEFAULT_TERRITORIES: Territory[] = [];

export const DEFAULT_INFLUENCE: TerritoryInfluence[] = [];

export const ACTIVITY_DECAY_CONFIG: ActivityDecayConfig = {
  intervalMs: 10 * 60 * 1000,
  decayPerTick: 1,
  minActivity: 0,
  maxActivity: 100,
};

export const INFLUENCE_DECAY_CONFIG: InfluenceDecayConfig = {
  intervalMs: 15 * 60 * 1000,
  baseDecayPerTick: 1,
  minInfluence: 0,
  maxInfluence: 100,
  factors: {
    gangHeadquarters: 0.5,
    controlledProperties: 0.3,
    activePlayers: 0.2,
    territoryUpgrades: 0.4,
  },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateActivityDecay(currentActivity: number): number {
  const decay = ACTIVITY_DECAY_CONFIG.decayPerTick;
  return clamp(currentActivity - decay, ACTIVITY_DECAY_CONFIG.minActivity, ACTIVITY_DECAY_CONFIG.maxActivity);
}

export function calculateInfluenceDecay(
  currentInfluence: number,
  gangContext: GangContext = {}
): number {
  const baseDecay = INFLUENCE_DECAY_CONFIG.baseDecayPerTick;
  const factors = INFLUENCE_DECAY_CONFIG.factors;

  let reduction = 0;
  if (gangContext.hasHeadquarters) reduction += factors.gangHeadquarters;
  if (gangContext.controlledProperties > 0) reduction += factors.controlledProperties * Math.min(gangContext.controlledProperties, 3);
  if (gangContext.activePlayers > 0) reduction += factors.activePlayers * Math.min(gangContext.activePlayers, 5);
  if (gangContext.upgrades > 0) reduction += factors.territoryUpgrades * Math.min(gangContext.upgrades, 3);

  const effectiveDecay = Math.max(0, baseDecay - reduction);
  return clamp(currentInfluence - effectiveDecay, INFLUENCE_DECAY_CONFIG.minInfluence, INFLUENCE_DECAY_CONFIG.maxInfluence);
}
