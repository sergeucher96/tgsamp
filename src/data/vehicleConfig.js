// src/data/vehicleConfig.js

export const VEHICLE_DATABASE = {
  'clover': {
    id: 'clover',
    name: 'Clover',
    desc: 'Классический маслкар эконом-класса. Надежный выбор для старта.',
    price: 45000,
    baseSpeed: 100,
    speed: 400,
    acceleration: 50,
    handling: 50,
    fuelType: '92',
    fuelMax: 50,
    colors: ['white', 'black', 'red', 'blue', 'green']
  },
  'scooter': {
    id: 'scooter',
    name: 'Скутер доставки',
    desc: 'Легкий городской скутер для доставки пиццы.',
    price: 0,
    baseSpeed: 70,
    speed: 280,
    acceleration: 60,
    handling: 70,
    fuelType: '92',
    fuelMax: 20,
    colors: ['yellow', 'black']
  },
  'bus': {
    id: 'bus',
    name: 'Городской автобус',
    desc: 'Служебный автобус городского автопарка. Выдается на время смены.',
    price: 0,
    baseSpeed: 60,
    speed: 300,
    acceleration: 30,
    handling: 40,
    fuelType: '92',
    fuelMax: 120,
    colors: ['yellow', 'white']
  },
  'taxi': {
    id: 'taxi',
    name: 'Такси',
    desc: 'Служебная машина таксопарка со счетчиком. Выдается на время смены.',
    price: 0,
    baseSpeed: 110,
    speed: 450,
    acceleration: 65,
    handling: 60,
    fuelType: '92',
    fuelMax: 55,
    colors: ['yellow', 'black']
  },
  'truck': {
    id: 'truck',
    name: 'Тягач с прицепом',
    desc: 'Магистральный тягач грузового терминала. Медленный, но берет тяжелый груз.',
    price: 0,
    baseSpeed: 50,
    speed: 250,
    acceleration: 20,
    handling: 30,
    fuelType: '92',
    fuelMax: 300,
    colors: ['white', 'black', 'red']
  },
  'sentinel': {
    id: 'sentinel',
    name: 'Sentinel',
    desc: 'Представительский седан. Сочетание немецкой мощи и комфорта.',
    price: 180000,
    baseSpeed: 140,
    speed: 550,
    acceleration: 75,
    handling: 70,
    fuelType: '95',
    fuelMax: 65,
    colors: ['white', 'black', 'red', 'blue', 'green']
  },
  'infernus': {
    id: 'infernus',
    name: 'Infernus',
    desc: 'Самый быстрый автомобиль в штате. Только для настоящих королей дорог.',
    price: 2500000,
    baseSpeed: 240,
    speed: 950,
    acceleration: 90,
    handling: 85,
    fuelType: '98',
    fuelMax: 80,
    colors: ['white', 'black', 'red']
  }
};

// Тюнинг конфиг
export const TUNING_CONFIG = {
  engine: {
    name: 'Двигатель',
    icon: '⚙️',
    stages: [
      { stage: 1, name: 'Stage 1', bonus: 0.10, price: 5000, desc: '+10% скорость' },
      { stage: 2, name: 'Stage 2', bonus: 0.20, price: 15000, desc: '+20% скорость' },
      { stage: 3, name: 'Stage 3', bonus: 0.30, price: 35000, desc: '+30% скорость' }
    ]
  },
  suspension: {
    name: 'Подвеска',
    icon: '🔧',
    stages: [
      { stage: 1, name: 'Stage 1', accelBonus: 0.10, gripBonus: 0.10, price: 4000, desc: '+10% ускорение, +10% сцепление' },
      { stage: 2, name: 'Stage 2', accelBonus: 0.20, gripBonus: 0.20, price: 12000, desc: '+20% ускорение, +20% сцепление' },
      { stage: 3, name: 'Stage 3', accelBonus: 0.30, gripBonus: 0.30, price: 28000, desc: '+30% ускорение, +30% сцепление' }
    ]
  },
  brakes: {
    name: 'Тормоза',
    icon: '🛑',
    stages: [
      { stage: 1, name: 'Stage 1', bonus: 0.05, price: 3000, desc: '+5% управление' },
      { stage: 2, name: 'Stage 2', bonus: 0.10, price: 8000, desc: '+10% управление' },
      { stage: 3, name: 'Stage 3', bonus: 0.15, price: 18000, desc: '+15% управление' }
    ]
  },
  nitro: {
    name: 'Нитро',
    icon: '🚀',
    price: 50000,
    desc: 'Установка нитро-ускорителя'
  }
};

// Штрафы за состояние авто
export const HEALTH_PENALTIES = [
  { threshold: 30, speedPenalty: 0.70 },  // 30% health → -70% speed
  { threshold: 40, speedPenalty: 0.25 },  // 40% health → -25% speed
  { threshold: 50, speedPenalty: 0.10 },  // 50% health → -10% speed
];

export const VEHICLE_COLORS = [
  { id: 'white', name: 'Белый', hex: '#FFFFFF' },
  { id: 'black', name: 'Черный', hex: '#1A1A1A' },
  { id: 'red',   name: 'Красный', hex: '#EF4444' },
  { id: 'blue',  name: 'Синий', hex: '#3B82F6' },
  { id: 'green', name: 'Зеленый', hex: '#10B981' }
];