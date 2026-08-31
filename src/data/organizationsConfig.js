export const ORGANIZATIONS = [
  { id: 'lspd', name: 'LSPD', type: 'police', icon: '🚔', color: 'bg-blue-700', location_id: 'lspd' },
  { id: 'city_hall', name: 'Мэрия', type: 'government', icon: '🏛️', color: 'bg-amber-600', location_id: 'meriya' },
  { id: 'hospital', name: 'Больница', type: 'medical', icon: '🏥', color: 'bg-red-600', location_id: 'hospital_1' },
  { id: 'farm_org', name: 'Фермерский кооператив', type: 'agriculture', icon: '🌾', color: 'bg-green-600', location_id: 'farm' },
  { id: 'tgd', name: 'TGD', type: 'gang', icon: '👤', color: 'bg-purple-700', location_id: 'bar_1' },
  { id: 'mafia', name: 'Мафия "Коза Ностра"', type: 'mafia', icon: '🕴️', color: 'bg-red-900', location_id: 'mafia_hideout' },
];

export const ORG_TYPES = {
  police: { name: 'Полиция', icon: '🚔', color: 'bg-blue-700' },
  government: { name: 'Администрация', icon: '🏛️', color: 'bg-amber-600' },
  medical: { name: 'Медицина', icon: '🏥', color: 'bg-red-600' },
  agriculture: { name: 'Сельское хозяйство', icon: '🌾', color: 'bg-green-600' },
  gang: { name: 'Банда', icon: '�', color: 'bg-purple-700' },
  mafia: { name: 'Мафия', icon: '🕴️', color: 'bg-red-900' },
};

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
    { rank_name: 'Медбрат', rank_level: 25, salary: 1500 },
  ],
  agriculture: [
    { rank_name: 'Глава', rank_level: 100, salary: 3000 },
    { rank_name: 'Бригадир', rank_level: 75, salary: 2000 },
    { rank_name: 'Рабочий', rank_level: 25, salary: 1000 },
  ],
  gang: [
    { rank_name: 'Босс', rank_level: 100, salary: 5000 },
    { rank_name: 'Зам', rank_level: 75, salary: 3000 },
    { rank_name: 'Солдат', rank_level: 25, salary: 1000 },
  ],
  mafia: [
    { rank_name: 'Капо', rank_level: 100, salary: 6000 },
    { rank_name: 'Солдат', rank_level: 75, salary: 3000 },
    { rank_name: 'Вербуемый', rank_level: 25, salary: 1500 },
  ],
};

export const VEHICLE_TYPES = [
  { id: 'patrol_1', name: 'Патрульный автомобиль', capacity: 2, icon: '🚗' },
  { id: 'van_1', name: 'Фургон', capacity: 4, icon: '🚐' },
  { id: 'truck_1', name: 'Грузовик', capacity: 8, icon: '🚚' },
];