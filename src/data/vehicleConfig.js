// src/data/vehicleConfig.js

export const VEHICLE_DATABASE = {
  'clover': {
    id: 'clover',
    name: 'Clover',
    desc: 'Классический маслкар эконом-класса. Надежный выбор для старта.',
    price: 45000,
    speed: 400,
    acceleration: 50,
    handling: 50,
    fuelType: '92',
    fuelMax: 50,
    colors: ['white', 'black', 'red', 'blue', 'green'],
    model3d: '/models/cars/test.glb'
  },
  'scooter': {
    id: 'scooter',
    name: 'Скутер доставки',
    desc: 'Легкий городской скутер для доставки пиццы.',
    price: 0,
    speed: 280,
    acceleration: 60,
    handling: 70,
    fuelType: '92',
    fuelMax: 20,
    colors: ['yellow', 'black'],
    model3d: '/models/cars/test.glb'
  },
  'bus': {
    id: 'bus',
    name: 'Городской автобус',
    desc: 'Служебный автобус городского автопарка. Выдается на время смены.',
    price: 0,
    speed: 300,
    acceleration: 30,
    handling: 40,
    fuelType: '92',
    fuelMax: 120,
    colors: ['yellow', 'white'],
    model3d: '/models/cars/test.glb'
  },
  'taxi': {
    id: 'taxi',
    name: 'Такси',
    desc: 'Служебная машина таксопарка со счетчиком. Выдается на время смены.',
    price: 0,
    speed: 450,
    acceleration: 65,
    handling: 60,
    fuelType: '92',
    fuelMax: 55,
    colors: ['yellow', 'black'],
    model3d: '/models/cars/test.glb'
  },
  'truck': {
    id: 'truck',
    name: 'Тягач с прицепом',
    desc: 'Магистральный тягач грузового терминала. Медленный, но берет тяжелый груз.',
    price: 0,
    speed: 250,
    acceleration: 20,
    handling: 30,
    fuelType: '92',
    fuelMax: 300,
    colors: ['white', 'black', 'red'],
    model3d: '/models/cars/test.glb'
  },
  'garbage_truck': {
    id: 'garbage_truck',
    name: 'Мусоровоз',
    desc: 'Служебный мусоровоз для уборки города. Выдается на время смены.',
    price: 0,
    speed: 200,
    acceleration: 25,
    handling: 35,
    fuelType: '92',
    fuelMax: 150,
    colors: ['green', 'white'],
    model3d: '/models/cars/test.glb'
  },
  'sentinel': {
    id: 'sentinel',
    name: 'Sentinel',
    desc: 'Представительский седан. Сочетание немецкой мощи и комфорта.',
    price: 180000,
    speed: 550,
    acceleration: 75,
    handling: 70,
    fuelType: '95',
    fuelMax: 65,
    colors: ['white', 'black', 'red', 'blue', 'green'],
    model3d: '/models/cars/test.glb'
  },
  'hatchback': {
    id: 'hatchback',
    name: 'Hatchback',
    desc: 'Компактный хэтчбек для города. Маневренный и экономичный.',
    price: 75000,
    speed: 420,
    acceleration: 60,
    handling: 75,
    fuelType: '92',
    fuelMax: 45,
    colors: ['white', 'black', 'red', 'blue', 'green'],
    model3d: '/models/cars/hatchback.glb'
  },
  'hatchback2': {
    id: 'hatchback2',
    name: 'Hatchback Sport',
    desc: 'Спортивная версия хэтчбека с улучшенными характеристиками.',
    price: 95000,
    speed: 480,
    acceleration: 70,
    handling: 80,
    fuelType: '95',
    fuelMax: 50,
    colors: ['white', 'black', 'red', 'blue'],
    model3d: '/models/cars/hatchback2.glb'
  },
  'offroad': {
    id: 'offroad',
    name: 'Offroad',
    desc: 'Внедорожник для любых условий. Пройдет там где другие сдадутся.',
    price: 150000,
    speed: 450,
    acceleration: 55,
    handling: 65,
    fuelType: '95',
    fuelMax: 80,
    colors: ['white', 'black', 'green', 'blue'],
    model3d: '/models/cars/Offroad.glb'
  },
  'pickup': {
    id: 'pickup',
    name: 'Pickup',
    desc: 'Пикап для работы и отдыха. Вместительный и мощный.',
    price: 165000,
    speed: 470,
    acceleration: 50,
    handling: 60,
    fuelType: '95',
    fuelMax: 90,
    colors: ['white', 'black', 'red', 'blue'],
    model3d: '/models/cars/Pickup.glb'
  },
  'wagon': {
    id: 'wagon',
    name: 'Wagon',
    desc: 'Универсал для семьи. Комфорт и вместительность на каждый день.',
    price: 120000,
    speed: 460,
    acceleration: 58,
    handling: 70,
    fuelType: '92',
    fuelMax: 60,
    colors: ['white', 'black', 'red', 'blue', 'green'],
    model3d: '/models/cars/Wagon.glb'
  },
  'suv': {
    id: 'suv',
    name: 'SUV',
    desc: 'Полноразмещенный внедорожник премиум-класса.',
    price: 220000,
    speed: 520,
    acceleration: 65,
    handling: 72,
    fuelType: '95',
    fuelMax: 85,
    colors: ['white', 'black', 'red', 'blue'],
    model3d: '/models/cars/suv.glb'
  },
  'sport': {
    id: 'sport',
    name: 'Sport',
    desc: 'Спортивный купе. Скорость и адреналин на каждом повороте.',
    price: 350000,
    speed: 650,
    acceleration: 80,
    handling: 85,
    fuelType: '98',
    fuelMax: 70,
    colors: ['white', 'black', 'red'],
    model3d: '/models/cars/sport.glb'
  },
  'infernus': {
    id: 'infernus',
    name: 'Infernus',
    desc: 'Самый быстрый автомобиль в штате. Только для настоящих королей дорог.',
    price: 2500000,
    speed: 950,
    acceleration: 90,
    handling: 85,
    fuelType: '98',
    fuelMax: 80,
    colors: ['white', 'black', 'red'],
    model3d: '/models/cars/test.glb'
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
  { threshold: 30, speedPenalty: 0.50 },  // <30% health → -50% speed
  { threshold: 50, speedPenalty: 0.20 },  // <50% health → -20% speed
];

// Стоимость ремонта за 1% здоровья
export const REPAIR_COST_PER_PERCENT = 50;

// Скорость износа авто (потеря % здоровья за 1000 единиц расстояния)
export const HEALTH_WEAR_RATE = 0.5;

export const VEHICLE_COLORS = [
  { id: 'white', name: 'Белый', hex: '#FFFFFF' },
  { id: 'black', name: 'Черный', hex: '#1A1A1A' },
  { id: 'red',   name: 'Красный', hex: '#EF4444' },
  { id: 'blue',  name: 'Синий', hex: '#3B82F6' },
  { id: 'green', name: 'Зеленый', hex: '#10B981' }
];