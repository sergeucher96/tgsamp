// src/data/locationStyles.js
// 2D картинки и интерактивные зоны (hotspots) для локаций
// Аналог houseStyles.js — координаты в процентах от изображения

// Интерактивные зоны (дверь, касса, стойка...)
// Формат: { locationId: { imageIndex: [ { id, type, x, y, w, h, action, label } ] } }
// locationId — это ID локации из locations.js (bank_1, shop_1, tuning_1...)
// Координаты x, y, w, h в процентах (0-100) от изображения
export const LOCATION_HOTSPOTS = {
  // === Магазины: "Войти в магазин" + "Купить бизнес" ===
  shop_1: { 1: [{ id: 'enter_shop', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в магазин' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  shop_24_7: { 1: [{ id: 'enter_shop', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в магазин' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  shop_2: { 1: [{ id: 'enter_shop', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в магазин' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  shop_3: { 1: [{ id: 'enter_shop', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в магазин' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  shop_4: { 1: [{ id: 'enter_shop', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в магазин' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  shop_5: { 1: [{ id: 'enter_shop', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в магазин' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },

  // === Одежда: "Войти в магазин" + "Купить бизнес" ===
  clothes_1: { 1: [{ id: 'enter_shop', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в магазин' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },

  // === Бары: "Войти в бар" + "Купить бизнес" ===
  bar_1: { 1: [{ id: 'enter_bar', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в бар' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  bar_2: { 1: [{ id: 'enter_bar', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в бар' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  bar_3: { 1: [{ id: 'enter_bar', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в бар' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  bar_4: { 1: [{ id: 'enter_bar', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в бар' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },

  // === АЗС: "АЗС (скоро)" + "Банкомат" + "Купить бизнес" ===
  gas_1: { 1: [
    { id: 'gas_service', type: 'rect', x: 24.53125317891439, y: 26.323296458362837, w: 42.29166507720948, h: 28.703236560505093, action: 'coming_soon', label: 'АЗС — Скоро открытие' },
    { id: 'gas_atm', type: 'rect', x: 71.19792302449545, y: 52.94658832140533, w: 21.666677792867006, h: 24.26602147039688, action: 'atm', label: 'Банкомат' }
  ] },
  gas_2: { 1: [{ id: 'refuel', type: 'rect', x: 25, y: 30, w: 50, h: 25, action: 'enter', label: 'Заправиться' }, { id: 'atm_gas', type: 'rect', x: 25, y: 60, w: 22, h: 15, action: 'atm', label: 'Банкомат' }, { id: 'buy_gas', type: 'rect', x: 53, y: 60, w: 22, h: 15, action: 'buy_business', label: 'Купить бизнес' }] },
  gas_3: { 1: [{ id: 'refuel', type: 'rect', x: 25, y: 30, w: 50, h: 25, action: 'enter', label: 'Заправиться' }, { id: 'buy_gas', type: 'rect', x: 25, y: 60, w: 50, h: 15, action: 'buy_business', label: 'Купить бизнес' }] },
  gas_4: { 1: [{ id: 'refuel', type: 'rect', x: 25, y: 30, w: 50, h: 25, action: 'enter', label: 'Заправиться' }, { id: 'buy_gas', type: 'rect', x: 25, y: 60, w: 50, h: 15, action: 'buy_business', label: 'Купить бизнес' }] },
  gas_5: { 1: [{ id: 'refuel', type: 'rect', x: 25, y: 30, w: 50, h: 25, action: 'enter', label: 'Заправиться' }, { id: 'buy_gas', type: 'rect', x: 25, y: 60, w: 50, h: 15, action: 'buy_business', label: 'Купить бизнес' }] },

  // === Парковки: "Парковка" + "Купить бизнес" ===
  parking_1: { 1: [{ id: 'enter_parking', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Парковка' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  parking_2: { 1: [{ id: 'enter_parking', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Парковка' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  parking_3: { 1: [{ id: 'enter_parking', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Парковка' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  parking_4: { 1: [{ id: 'enter_parking', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Парковка' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },

  // === Спортзал: "Войти" + "Купить бизнес" ===
  gym_1: { 1: [{ id: 'enter_gym', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в спортзал' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },
  gym_2: { 1: [{ id: 'enter_gym', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в спортзал' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },

  // === Склад: "Войти" + "Купить бизнес" ===
  warehouse_1: { 1: [{ id: 'enter_warehouse', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти на склад' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },

  // === Отель: "Заселиться" + "Купить отель" ===
  hotel_1: { 1: [{ id: 'enter_hotel', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'open_hotel', label: 'Отель' }, { id: 'buy_hotel', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить отель' }] },
  hotel_2: { 1: [{ id: 'enter_hotel', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'open_hotel', label: 'Отель' }, { id: 'buy_hotel', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить отель' }] },
  hotel_3: { 1: [{ id: 'enter_hotel', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'open_hotel', label: 'Отель' }, { id: 'buy_hotel', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить отель' }] },
  hotel_4: { 1: [{ id: 'enter_hotel', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'open_hotel', label: 'Отель' }, { id: 'buy_hotel', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить отель' }] },

  // === Ночной клуб: "Войти" + "Купить бизнес" ===
  club_1: { 1: [{ id: 'enter_club', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в клуб' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },

  // === Тюнинг: "Войти" + "Купить бизнес" ===
  tuning_1: { 1: [{ id: 'enter_tuning', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в тюнинг' }, { id: 'buy_business', type: 'rect', x: 25, y: 78, w: 50, h: 12, action: 'buy_business', label: 'Купить бизнес' }] },

  // === Мусорная база ===
  // (hotspots managed via HotspotTool)

  // === Банк ===
  bank_1: { 1: [{ id: 'enter_bank', type: 'rect', x: 25, y: 30, w: 50, h: 40, action: 'enter', label: 'Войти в банк' }] },
};

// Картинки для каждой локации по ID (bank_1, bank_2, shop_1...)
// Каждая отдельная локация на карте имеет свой ID и свою картинку
// Положите файлы в public/locations/
export const LOCATION_IMAGES = {
  garbage_depot: { label: '🗑️ Мусорная база', default: '/locations/garbage_depot.svg' },
  bus_depot: { label: '🚌 Автобусный парк', images: [{ id: 1, src: '/locations/bus_depot.webp' }], default: '/locations/bus_depot.webp' },
  meriya: { label: '🏛️ Мэрия', images: [{ id: 1, src: '/locations/city_holl.webp' }], default: '/locations/city_holl.webp' },
  city_hall: { label: '🏛️ Мэрия', images: [{ id: 1, src: '/locations/city_holl.webp' }], default: '/locations/city_holl.webp' },
  pizzeria_1: { label: '🍕 Пиццерия #1', images: [{ id: 1, src: '/locations/pizzeria_1.webp' }], default: '/locations/pizzeria_1.webp' },
  club_1: { label: '💃 Стрип-клуб "Velvet"', images: [{ id: 1, src: '/locations/strip_1.webp' }], default: '/locations/strip_1.webp' },
  strip_1: { label: '💃 Стрип-клуб #1', images: [{ id: 1, src: '/locations/strip_1.webp' }], default: '/locations/strip_1.webp' },
  bank_1: { label: '🏦 Банк #1', images: [{ id: 1, src: '/locations/bank_1.webp' }], default: '/locations/bank_1.webp' },
  bank_2: { label: '🏦 Банк #2', images: [{ id: 1, src: '/locations/bank_2.webp' }], default: '/locations/bank_2.webp' },
  shop_1: { label: '🛒 Магазин #1', images: [{ id: 1, src: '/locations/shop_1.webp' }], default: '/locations/shop_1.webp' },
  shop_2: { label: '🛒 Супермаркет #2', images: [{ id: 1, src: '/locations/shop_2.webp' }], default: '/locations/shop_2.webp' },
  shop_3: { label: '🛒 Продукты', images: [{ id: 1, src: '/locations/shop_1.webp' }], default: '/locations/shop_1.webp' },
  shop_4: { label: '🛒 Минимаркет', images: [{ id: 1, src: '/locations/shop_2.webp' }], default: '/locations/shop_2.webp' },
  shop_5: { label: '🛒 Угловой магазин', images: [{ id: 1, src: '/locations/shop_1.webp' }], default: '/locations/shop_1.webp' },
  shop_24_7: { label: '🛒 24/7 Market', images: [{ id: 1, src: '/locations/shop_2.webp' }], default: '/locations/shop_2.webp' },
  gas_1: { label: '⛽ АЗС "X-Oil"', images: [{ id: 1, src: '/locations/gas_1.webp' }], default: '/locations/gas_1.webp' },
  gas_2: { label: '⛽ АЗС "East"', images: [{ id: 1, src: '/locations/gas_1.webp' }], default: '/locations/gas_1.webp' },
  gas_3: { label: '⛽ АЗС "North"', images: [{ id: 1, src: '/locations/gas_1.webp' }], default: '/locations/gas_1.webp' },
  gas_4: { label: '⛽ АЗС "HighWay"', images: [{ id: 1, src: '/locations/gas_1.webp' }], default: '/locations/gas_1.webp' },
  gas_5: { label: '⛽ АЗС "West Side"', images: [{ id: 1, src: '/locations/gas_1.webp' }], default: '/locations/gas_1.webp' },
  parking_1: { label: '🅿️ Парковка #1', images: [{ id: 1, src: '/locations/bus_depot.webp' }], default: '/locations/bus_depot.webp' },
};

// Получить картинку для локации по ID
// Checks localStorage first (HotspotTool saves blob URLs there), falls back to static data
export const getLocationImage = (locationId, imageIndex) => {
  // Check if HotspotTool saved a custom image for this location
  const saved = localStorage.getItem(`hotspot_tool_${locationId}`);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      // If data has 'default' or 'images' field (image was saved via editor)
      if (data?.default) return data.default;
      if (data?.images?.length > 0) return data.images[imageIndex - 1]?.src || data.default || null;
    } catch (e) {}
  }
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
// Prioritizes localStorage data (HotspotTool saves hotspots there), falls back to static data
export const getLocationHotspots = (locationId, imageIndex) => {
  // Check localStorage for editor-saved hotspots
  const saved = localStorage.getItem(`hotspot_tool_${locationId}`);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      // If it's an array of hotspots and not empty — use it
      if (Array.isArray(data) && data.length > 0) return data;
      // If it has a hotspots field and it's not empty
      if (Array.isArray(data?.hotspots) && data.hotspots.length > 0) return data.hotspots;
    } catch (e) {}
  }
  // Fall back to static data
  return LOCATION_HOTSPOTS[locationId]?.[imageIndex] || [];
};

// Подлокации (сублокации) — картинка + хотспоты для каждой части локации
// Формат: { parentId: { subLocationKey: { image: '/path.webp', hotspots: [...], label: 'Имя' } } }
// Merges static data with localStorage data (HotspotTool saves sublocations there)
export function getLocationSublocations(locationId) {
  const staticData = LOCATION_SUBLOCATIONS[locationId] || {};
  // Check localStorage for editor-saved sublocations
  const saved = localStorage.getItem('hotspot_tool_sublocations');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      // Filter entries that belong to this locationId
      // Key format: "locationId__subLocationLabel"
      if (data && typeof data === 'object') {
        const result = { ...staticData };
        for (const [key, value] of Object.entries(data)) {
          // Check if key starts with locationId__ (locationId followed by __ and label)
          if (key.startsWith(locationId + '__')) {
            const label = key.substring(locationId.length + 2);
            result[label] = value;
          }
        }
        return result;
      }
    } catch (e) {}
  }
  return staticData;
}

// Keep the export for backward compatibility
export const LOCATION_SUBLOCATIONS = {};