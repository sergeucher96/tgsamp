export interface GangDefinition {
  id: string;
  name: string;
  /** Короткое имя для тесных мест в интерфейсе */
  short: string;
  icon: string;
  /** Tailwind-класс фона: bg-emerald-700 и т.п. */
  color: string;
  /** Цвет для SVG и других мест, где нужен hex, а не класс */
  mapColor: string;
  /** Район на карте, вокруг которого банда держит влияние */
  district: string;
  description: string;
}

export interface GangRankSeed {
  rank_name: string;
  rank_level: number;
  /** Номер ранга 1…10, равен темпу очков в минуту */
  rank_number: number;
  salary: number;
  permissions: Record<string, boolean>;
}

export const ORGANIZATIONS = [
  { id: 'lspd', name: 'LSPD', type: 'police', icon: '🚔', color: 'bg-blue-700', location_id: 'lspd' },
  { id: 'city_hall', name: 'Мэрия', type: 'government', icon: '🏛️', color: 'bg-amber-600', location_id: 'meriya' },
  { id: 'hospital', name: 'Больница', type: 'medical', icon: '🏥', color: 'bg-red-600', location_id: 'hospital_1' },
  { id: 'farm_org', name: 'Фермерский кооператив', type: 'agriculture', icon: '🌾', color: 'bg-green-600', location_id: 'farm' },
  { id: 'grove', name: 'Grove Street', type: 'gang', icon: '🌳', color: 'bg-emerald-700', location_id: 'grove_hideout', criminal: true },
  { id: 'ballas', name: 'Ballas', type: 'gang', icon: '🟣', color: 'bg-purple-700', location_id: 'ballas_hideout', criminal: true },
  { id: 'rifa', name: 'Varios Los Aztecas', type: 'gang', icon: '💀', color: 'bg-yellow-600', location_id: 'rifa_hideout', criminal: true },
  { id: 'aztec', name: 'Aztécas', type: 'gang', icon: '⚔️', color: 'bg-cyan-700', location_id: 'aztec_hideout', criminal: true },
];

/** Уличные банды — участницы войны за территории */
export const GANGS: GangDefinition[] = [
  {
    id: 'grove',
    name: 'Grove Street',
    short: 'Грув',
    icon: '🌳',
    color: 'bg-emerald-700',
    mapColor: '#22c55e',
    district: 'Ganton',
    description: 'Старейший район на юго-западе. Своя школа, свой двор, своя территория — и общая беда с полицией.',
  },
  {
    id: 'ballas',
    name: 'Ballas',
    short: 'Баллас',
    icon: '🟣',
    color: 'bg-purple-700',
    mapColor: '#a855f7',
    district: 'Idlewood',
    description: 'Молодые и многочисленные. Держат Los Santos силой и численностью, но ссорятся из-за денег.',
  },
  {
    id: 'rifa',
    name: 'Varios Los Aztecas',
    short: 'Рифа',
    icon: '💀',
    color: 'bg-yellow-600',
    mapColor: '#eab308',
    district: 'Glen Park',
    description: 'Старые вооружённые ветераны. Держатся особняком на холме и не идут ни на какие союзы.',
  },
  {
    id: 'aztec',
    name: 'Aztécas',
    short: 'Ацтек',
    icon: '⚔️',
    color: 'bg-cyan-700',
    mapColor: '#06b6d4',
    district: 'Los Santos Docks',
    description: 'Портовая банда. Торгуют всем подряд и бьются за каждый контейнер в доках.',
  },
];

export const GANG_IDS = GANGS.map(g => g.id);

export function getGang(gangId: string | null | undefined): GangDefinition | null {
  if (!gangId) return null;
  return GANGS.find(g => g.id === gangId) || null;
}

export const CRIMINAL_ORGANIZATIONS = ORGANIZATIONS.filter(o => o.criminal);

export const ORG_TYPES = {
  police: { name: 'Полиция', icon: '🚔', color: 'bg-blue-700' },
  government: { name: 'Администрация', icon: '🏛️', color: 'bg-amber-600' },
  medical: { name: 'Медицина', icon: '🏥', color: 'bg-red-600' },
  agriculture: { name: 'Сельское хозяйство', icon: '🌾', color: 'bg-green-600' },
  gang: { name: 'Банда', icon: '🌳', color: 'bg-emerald-700' },
};

/**
 * Ранги банды — 10 штук, номер совпадает с темпом очков в войне:
 * ранг N приносит N очков за минуту участия.
 *
 * Права выданы рангам 8…10: именно они могут объявить войну
 * (см. WAR_CONFIG.canStartWarMinRank), 10-й ещё и управляет
 * составом и складом.
 *
 * rank_level оставлен как N * 10 — он отвечает за порядок
 * вывода рангов и за существующие проверки прав, а не за бой.
 */
export const GANG_RANKS: GangRankSeed[] = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1;
  return {
    rank_name: `Ранг ${n}`,
    rank_level: n * 10,
    rank_number: n,
    salary: 500 + n * 450,
    permissions: n >= 10
      ? { set_salary: true, access_safe: true, change_rank: true, manage_members: true, manage_vehicle: true }
      : n >= 8
        ? { set_salary: true, access_safe: true, change_rank: false, manage_members: true, manage_vehicle: true }
        : { set_salary: false, access_safe: false, change_rank: false, manage_members: false, manage_vehicle: false },
  };
});

/** Параметры войны за территорию. */
export const WAR_CONFIG = {
  /** Длительность войны, миллисекунды */
  durationMs: 5 * 60 * 1000,
  /** Минимальный ранг, с которого можно объявить войну: 8, 9, 10 */
  canStartWarMinRank: 8,
  /** Стоимость войны из общего склада банды */
  cost: 25_000,
  /** Перезарядка на ту же территорию для той же банды, миллисекунды */
  cooldownMs: 10 * 60 * 1000,
  /** Сколько банд могут воевать за одну территорию одновременно */
  maxGangsPerWar: 2,
  /** Очки за минуту участия. Сколько именно — задаёт редактор рангов
   *  в org_ranks.war_points_per_min. Ранги, которые не зарабатывают очки */
  minScoringRank: 1,
} as const;

/**
 * Начисление очков: очки в минуту × минуты участия.
 *
 * Множитель приходит из org_ranks.war_points_per_min — его можно
 * настроить в редакторе рангов. Раньше он жёстко равнялся номеру
 * ранга, и ранг 1 давал ровно 1 очко в минуту.
 */
export function warPointsFor(pointsPerMin: number, seconds: number): number {
  if (pointsPerMin < WAR_CONFIG.minScoringRank) return 0;
  return Math.floor((pointsPerMin * seconds) / 60);
}

export const DEFAULT_RANKS = {
  police: [
    { rank_name: 'Капитан', rank_level: 100, salary: 3000 },
    { rank_name: 'Сержант', rank_level: 75, salary: 2000 },
    { rank_name: 'Patrolman', rank_level: 25, salary: 1000 },
  ],
  government: [
    { rank_name: 'Мэр', rank_level: 100, salary: 4000 },
    { rank_name: 'Сотрудник', rank_level: 75, salary: 2000 },
    { rank_name: 'Стажёр', rank_level: 25, salary: 1000 },
  ],
  medical: [
    { rank_name: 'Главврач', rank_level: 100, salary: 3500 },
    { rank_name: 'Доктор', rank_level: 75, salary: 2500 },
    { rank_name: 'Медбрат', rank_level: 25, salary: 1000 },
  ],
  agriculture: [
    { rank_name: 'Глава', rank_level: 100, salary: 3000 },
    { rank_name: 'Бригадир', rank_level: 75, salary: 2000 },
    { rank_name: 'Рабочий', rank_level: 25, salary: 1000 },
  ],
  gang: GANG_RANKS,
};

export const VEHICLE_TYPES = [
  { id: 'patrol_1', name: 'Патрульный автомобиль', capacity: 2, icon: '🚗' },
  { id: 'van_1', name: 'Фургон', capacity: 4, icon: '🚐' },
  { id: 'truck_1', name: 'Грузовик', capacity: 8, icon: '🚚' },
];