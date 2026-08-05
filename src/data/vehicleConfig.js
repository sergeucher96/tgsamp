// src/data/vehicleConfig.js

export const VEHICLE_DATABASE = {
  'clover': {
    id: 'clover',
    name: 'Clover',
    desc: 'Классический маслкар эконом-класса. Надежный выбор для старта.',
    price: 45000,
    speed: 400,
    fuelType: '92',
    fuelMax: 50,
    colors: ['white', 'black', 'red', 'blue', 'green']
  },
  'scooter': {
    id: 'scooter',
    name: 'Скутер доставки',
    desc: 'Легкий городской скутер для доставки пиццы.',
    price: 0,
    speed: 280,
    fuelType: '92',
    fuelMax: 20,
    colors: ['yellow', 'black']
  },
  'bus': {
    id: 'bus',
    name: 'Городской автобус',
    desc: 'Служебный автобус городского автопарка. Выдается на время смены.',
    price: 0,
    speed: 300,
    fuelType: '92',
    fuelMax: 120,
    colors: ['yellow', 'white']
  },
  'taxi': {
    id: 'taxi',
    name: 'Такси',
    desc: 'Служебная машина таксопарка со счетчиком. Выдается на время смены.',
    price: 0,
    speed: 450,
    fuelType: '92',
    fuelMax: 55,
    colors: ['yellow', 'black']
  },
  'truck': {
    id: 'truck',
    name: 'Тягач с прицепом',
    desc: 'Магистральный тягач грузового терминала. Медленный, но берет тяжелый груз.',
    price: 0,
    speed: 250,
    fuelType: '92',
    fuelMax: 300,
    colors: ['white', 'black', 'red']
  },
  'sentinel': {
    id: 'sentinel',
    name: 'Sentinel',
    desc: 'Представительский седан. Сочетание немецкой мощи и комфорта.',
    price: 180000,
    speed: 550,
    fuelType: '95',
    fuelMax: 65,
    colors: ['white', 'black', 'red', 'blue', 'green']
  },
  'infernus': {
    id: 'infernus',
    name: 'Infernus',
    desc: 'Самый быстрый автомобиль в штате. Только для настоящих королей дорог.',
    price: 2500000,
    speed: 950,
    fuelType: '98',
    fuelMax: 80,
    colors: ['white', 'black', 'red']
  }
};

export const VEHICLE_COLORS = [
  { id: 'white', name: 'Белый', hex: '#FFFFFF' },
  { id: 'black', name: 'Черный', hex: '#1A1A1A' },
  { id: 'red',   name: 'Красный', hex: '#EF4444' },
  { id: 'blue',  name: 'Синий', hex: '#3B82F6' },
  { id: 'green', name: 'Зеленый', hex: '#10B981' }
];