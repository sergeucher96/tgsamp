// src/data/houseConfig.js

export const HOUSE_CLASSES = {
  economy: {
    name: 'Эконом-класс',
    price: 50000,
    wardrobe_slots: 10,
    garage_slots: 1,
    bedrooms: 1,
    bathrooms: 1,
    description: 'Бюджетный стартовый дом. Компактная жилая зона для начинающих игроков с минимальным комфортом.',
    color: 'bg-emerald-600',
    markerSize: 'w-6 h-6'
  },
  comfort: {
    name: 'Комфорт-класс',
    price: 150000,
    wardrobe_slots: 25,
    garage_slots: 2,
    bedrooms: 2,
    bathrooms: 1,
    description: 'Просторная квартира с двумя спальнями и гаражом на два места. Идеальный выбор для растущего игрока.',
    color: 'bg-teal-600',
    markerSize: 'w-7 h-7'
  },
  business: {
    name: 'Бизнес-класс',
    price: 500000,
    wardrobe_slots: 50,
    garage_slots: 4,
    bedrooms: 3,
    bathrooms: 2,
    description: 'Элитная недвижимость в центре города. Три спальни, два санузла и вместительный гараж.',
    color: 'bg-cyan-600',
    markerSize: 'w-8 h-8'
  },
  premium: {
    name: 'Премиум-класс',
    price: 2000000,
    wardrobe_slots: 100,
    garage_slots: 10,
    bedrooms: 5,
    bathrooms: 4,
    description: 'Роскошная резиденция высшей категории. Пять спален, просторные ванные и гараж на десять автомобилей.',
    color: 'bg-purple-600',
    markerSize: 'w-10 h-10'
  }
};