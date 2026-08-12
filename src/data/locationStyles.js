// src/data/locationStyles.js
// 2D картинки и интерактивные зоны (hotspots) для локаций
// Аналог houseStyles.js — координаты в процентах от изображения

// Интерактивные зоны (дверь, касса, стойка...)
// Формат: { locationId: { imageIndex: [ { id, type, x, y, w, h, action, label } ] } }
// locationId — это ID локации из locations.js (bank_1, shop_1, tuning_1...)
export const LOCATION_HOTSPOTS = {
  // Пример:
  // bank_1: {
  //   1: [
  //     { id: 'enter', type: 'rect', x: 22.04, y: 50.70, w: 32.53, h: 18.46, action: 'enter', label: 'Войти в банк' }
  //   ]
  // }
};

// Картинки для каждой локации по ID (bank_1, bank_2, shop_1...)
// Каждая отдельная локация на карте имеет свой ID и свою картинку
// Положите файлы в public/locations/
export const LOCATION_IMAGES = {
  // === Банки ===
  bank_1: {
    label: '🏦 Банк #1',
    images: [
      { id: 1, src: '/locations/bank_1.webp' },
    ],
    default: '/locations/bank_1.webp'
  },
  bank_2: {
    label: '🏦 Банк #2',
    images: [
      { id: 1, src: '/locations/bank_2.webp' },
    ],
    default: '/locations/bank_2.webp'
  },

  // === Магазины ===
  shop_1: {
    label: '🛒 Магазин #1',
    images: [
      { id: 1, src: '/locations/shop_1.webp' },
    ],
    default: '/locations/shop_1.webp'
  },
  shop_2: {
    label: '🛒 Магазин #2',
    images: [
      { id: 1, src: '/locations/shop_2.webp' },
    ],
    default: '/locations/shop_2.webp'
  },

  // === Тюнинг ===
  tuning_1: {
    label: '🔧 Тюнинг #1',
    images: [
      { id: 1, src: '/locations/tuning_1.webp' },
    ],
    default: '/locations/tuning_1.webp'
  },

  // === Одежда ===
  clothes_1: {
    label: '👕 Одежда #1',
    images: [
      { id: 1, src: '/locations/clothes_1.webp' },
    ],
    default: '/locations/clothes_1.webp'
  },

  // === Шахта ===
  mine_1: {
    label: '⛏️ Шахта #1',
    images: [
      { id: 1, src: '/locations/mine_1.webp' },
    ],
    default: '/locations/mine_1.webp'
  },

  // === Пиццерия ===
  pizzeria_1: {
    label: '🍕 Пиццерия #1',
    images: [
      { id: 1, src: '/locations/pizzeria_1.webp' },
    ],
    default: '/locations/pizzeria_1.webp'
  },

  // === Автосалон ===
  showroom_1: {
    label: '🚗 Автосалон #1',
    images: [
      { id: 1, src: '/locations/showroom_1.webp' },
    ],
    default: '/locations/showroom_1.webp'
  },

  // === Стрелковый ===
  guns_1: {
    label: '🔫 Стрелковый #1',
    images: [
      { id: 1, src: '/locations/guns_1.webp' },
    ],
    default: '/locations/guns_1.webp'
  },

  // === Автошкола ===
  driving_1: {
    label: '🎓 Автошкола #1',
    images: [
      { id: 1, src: '/locations/driving_1.webp' },
    ],
    default: '/locations/driving_1.webp'
  },

  // === Экспорт ===
  export_1: {
    label: '📤 Экспорт #1',
    images: [
      { id: 1, src: '/locations/export_1.webp' },
    ],
    default: '/locations/export_1.webp'
  },

  // === Стрип-клуб ===
  strip_1: {
    label: '💃 Стрип-клуб #1',
    images: [
      { id: 1, src: '/locations/strip_1.webp' },
    ],
    default: '/locations/strip_1.webp'
  },

  // === Бары ===
  bar_1: {
    label: '🍺 Бар #1',
    images: [
      { id: 1, src: '/locations/bar_1.webp' },
    ],
    default: '/locations/bar_1.webp'
  },
  bar_2: {
    label: '🍺 Бар #2',
    images: [
      { id: 1, src: '/locations/bar_2.webp' },
    ],
    default: '/locations/bar_2.webp'
  },

  // === Отели ===
  hotel_1: {
    label: '🏨 Отель #1',
    images: [
      { id: 1, src: '/locations/hotel_1.webp' },
    ],
    default: '/locations/hotel_1.webp'
  },

  // === АЗС ===
  gas_1: {
    label: '⛽ АЗС #1',
    images: [
      { id: 1, src: '/locations/gas_1.webp' },
    ],
    default: '/locations/gas_1.webp'
  },
  gas_2: {
    label: '⛽ АЗС #2',
    images: [
      { id: 1, src: '/locations/gas_2.webp' },
    ],
    default: '/locations/gas_2.webp'
  },

  // === Парковки ===
  parking_1: {
    label: '🅿️ Парковка #1',
    images: [
      { id: 1, src: '/locations/parking_1.webp' },
    ],
    default: '/locations/parking_1.webp'
  },

  // === Спортзал ===
  gym_1: {
    label: '💪 Спортзал #1',
    images: [
      { id: 1, src: '/locations/gym_1.webp' },
    ],
    default: '/locations/gym_1.webp'
  },

  // === Склад ===
  warehouse_1: {
    label: '📦 Склад #1',
    images: [
      { id: 1, src: '/locations/warehouse_1.webp' },
    ],
    default: '/locations/warehouse_1.webp'
  },
};

// Получить картинку для локации по ID
export const getLocationImage = (locationId, imageIndex) => {
  const category = LOCATION_IMAGES[locationId];
  if (!category) return null;
  const img = category.images?.find(i => i.id === imageIndex);
  return img?.src || category.default || null;
};

// Получить label для локации
export const getLocationLabel = (locationId) => {
  return LOCATION_IMAGES[locationId]?.label || locationId;
};

// Получить hotspots для локации
export const getLocationHotspots = (locationId, imageIndex) => {
  return LOCATION_HOTSPOTS[locationId]?.[imageIndex] || [];
};