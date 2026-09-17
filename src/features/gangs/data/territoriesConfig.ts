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
}

export interface TerritoryInfluence {
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

export const DEFAULT_TERRITORIES: Territory[] = [
  { id: 1, name: 'Ganton', owner_gang_id: 'tgd', status: 'CONTROLLED', activity: 75, base_income: 1200, control: 82, min_x: 5450, max_x: 5850, min_y: 5050, max_y: 5450 },
  { id: 2, name: 'Idlewood', owner_gang_id: 'mafia', status: 'CONTROLLED', activity: 68, base_income: 950, control: 71, min_x: 5250, max_x: 5650, min_y: 4450, max_y: 4850 },
  { id: 3, name: 'Jefferson', owner_gang_id: null, status: 'NEUTRAL', activity: 30, base_income: 800, control: 0, min_x: 5100, max_x: 5500, min_y: 4750, max_y: 5150 },
  { id: 4, name: 'Glen Park', owner_gang_id: null, status: 'NEUTRAL', activity: 25, base_income: 600, control: 0, min_x: 4900, max_x: 5300, min_y: 5150, max_y: 5550 },
  { id: 5, name: 'Verona Beach', owner_gang_id: null, status: 'NEUTRAL', activity: 40, base_income: 1000, control: 0, min_x: 5350, max_x: 5750, min_y: 4250, max_y: 4650 },
  { id: 6, name: 'East Los Santos', owner_gang_id: null, status: 'NEUTRAL', activity: 35, base_income: 900, control: 0, min_x: 5550, max_x: 5950, min_y: 4650, max_y: 5050 },
  { id: 7, name: 'Market', owner_gang_id: 'tgd', status: 'TENSION', activity: 55, base_income: 1500, control: 45, min_x: 5250, max_x: 5650, min_y: 4550, max_y: 4950 },
  { id: 8, name: 'Marina', owner_gang_id: null, status: 'NEUTRAL', activity: 20, base_income: 700, control: 0, min_x: 5050, max_x: 5450, min_y: 4250, max_y: 4650 },
  { id: 9, name: 'Vinewood', owner_gang_id: null, status: 'NEUTRAL', activity: 60, base_income: 1800, control: 0, min_x: 5150, max_x: 5550, min_y: 4050, max_y: 4450 },
  { id: 10, name: 'Los Santos Docks', owner_gang_id: null, status: 'NEUTRAL', activity: 15, base_income: 2000, control: 0, min_x: 5050, max_x: 5450, min_y: 5550, max_y: 5950 },
];

export const DEFAULT_INFLUENCE: TerritoryInfluence[] = [
  { territory_id: 1, gang_id: 'tgd', influence: 85 },
  { territory_id: 1, gang_id: 'mafia', influence: 10 },
  { territory_id: 2, gang_id: 'mafia', influence: 78 },
  { territory_id: 2, gang_id: 'tgd', influence: 15 },
  { territory_id: 7, gang_id: 'tgd', influence: 60 },
  { territory_id: 7, gang_id: 'mafia', influence: 35 },
];

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
