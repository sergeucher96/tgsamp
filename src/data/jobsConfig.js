// Справочник профессий. Каждая работа привязана к локации из locations.js
// и к навыку из skills.js. Тип 'route' - работа с поездками по городу,
// тип 'station' - работа на месте (циклы задач с прогресс-баром).

export const JOBS_DATABASE = {
  bus_driver: {
    id: 'bus_driver',
    kind: 'route',
    name: 'Водитель автобуса',
    short: 'Автопарк',
    icon: '🚌',
    accent: 'text-yellow-400',
    locationId: 'bus_depot',
    skillId: 'bus',
    license: 'car',
    vehicle: { model_id: 'bus', color: 'yellow', name: 'Городской автобус' },
    energyCost: 12,
    minEnergy: 15,
    // Маршрут по фиксированным остановкам города
    stops: { type: 'fixed', ids: ['vokzal', 'parking_1', 'gym_1', 'parking_2', 'shop_2'], count: 4 },
    payPerStop: [400, 700],
    expPerStop: [6, 12],
    bonusOnFinish: 800,
    desc: 'Рейс по городским остановкам. Оплата за каждую остановку и премия за полный круг.',
  },

  taxi_driver: {
    id: 'taxi_driver',
    kind: 'route',
    name: 'Таксист',
    short: 'Таксопарк',
    icon: '🚖',
    accent: 'text-amber-300',
    locationId: 'taxi_park',
    skillId: 'taxi',
    license: 'car',
    vehicle: { model_id: 'taxi', color: 'yellow', name: 'Такси' },
    energyCost: 10,
    minEnergy: 12,
    // Случайные пассажиры: сначала подача к дому, потом высадка в городе
    stops: { type: 'random', pools: ['house', 'poi'], count: 3 },
    payPerStop: [500, 1100],
    expPerStop: [8, 15],
    bonusOnFinish: 500,
    tip: { chance: 0.4, min: 50, max: 300 },
    desc: 'Подача к клиенту и поездка по счётчику. Возможны чаевые.',
  },

  trucker: {
    id: 'trucker',
    kind: 'route',
    name: 'Дальнобойщик',
    short: 'Грузовой терминал',
    icon: '🚛',
    accent: 'text-cyan-300',
    locationId: 'truck_depot',
    skillId: 'trucker',
    license: 'truck',
    vehicle: { model_id: 'truck', color: 'white', name: 'Тягач с прицепом' },
    energyCost: 20,
    minEnergy: 25,
    stops: { type: 'random', pools: ['warehouse', 'far'], count: 2 },
    payPerStop: [2500, 4200],
    expPerStop: [25, 40],
    bonusOnFinish: 2000,
    cargo: ['Стройматериалы', 'Топливо', 'Электроника', 'Продукты', 'Металлопрокат'],
    desc: 'Дальний рейс с грузом. Долго, тяжело по энергии, но самая высокая оплата.',
  },

  factory_master: {
    id: 'factory_master',
    kind: 'station',
    name: 'Мастер на заводе',
    short: 'Завод',
    icon: '🏭',
    accent: 'text-orange-400',
    locationId: 'factory',
    skillId: 'factory',
    vehicle: null,
    energyCost: 9,
    minEnergy: 10,
    taskTime: 5000,
    tasks: [
      { id: 'press', name: 'Штамповка деталей', pay: [450, 800], exp: 6, minSkill: 0 },
      { id: 'weld', name: 'Сварка узлов', pay: [700, 1200], exp: 10, minSkill: 15 },
      { id: 'assembly', name: 'Сборка агрегата', pay: [1200, 1900], exp: 18, minSkill: 40 },
      { id: 'qc', name: 'Контроль качества партии', pay: [2000, 3000], exp: 28, minSkill: 70 },
    ],
    desc: 'Сменная работа у станка. Чем выше навык, тем более дорогие наряды доступны.',
  },

  mechanic: {
    id: 'mechanic',
    kind: 'station',
    name: 'Автомеханик',
    short: 'СТО',
    icon: '🔧',
    accent: 'text-sky-300',
    locationId: 'sto_1',
    skillId: 'mechanic',
    vehicle: null,
    energyCost: 8,
    minEnergy: 10,
    taskTime: 4500,
    tasks: [
      { id: 'oil', name: 'Замена масла', pay: [350, 600], exp: 5, minSkill: 0 },
      { id: 'brakes', name: 'Ремонт тормозов', pay: [650, 1100], exp: 9, minSkill: 15 },
      { id: 'engine', name: 'Переборка двигателя', pay: [1400, 2200], exp: 20, minSkill: 45 },
      { id: 'tuning', name: 'Тюнинг клиентской тачки', pay: [2400, 3600], exp: 30, minSkill: 75 },
    ],
    desc: 'Заказ-наряды в автосервисе. Ремонт клиентских машин без выезда в город.',
  },
};

export const JOBS_LIST = Object.values(JOBS_DATABASE);

export const getJobByLocation = (locationId) =>
  JOBS_LIST.find((job) => job.locationId === locationId) || null;
