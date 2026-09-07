/**
 * locationActions.js — действия для категорий локаций.
 *
 * Каждая категория (house, gas, bank, shop...) имеет список действий.
 * Для добавления нового действия — допишите его в массив нужной категории.
 *
 * HotspotTool.jsx берёт список actions через getActionsForCategory().
 * MapView.jsx использует handleLocationAction() для маршрутизации.
 */

export const LOCATION_ACTIONS = {

  // --- Дом (economy, comfort, business, premium) ---
  house: [
    { value: 'enter',         label: '📦 Войти в дом / Шкаф' },
    { value: 'garage',        label: '🅿️ Зайти в гараж' },
    { value: 'kitchen',       label: '🍳 Кухня' },
    { value: 'sublocation',   label: '📍 Часть локации (комната)' },
  ],

  // --- Банк ---
  bank: [
    { value: 'enter',         label: '� Войти в банк' },
    { value: 'atm',           label: '� Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Перейти в зал' },
  ],

  // --- АЗС ---
  gas: [
    { value: 'refuel',        label: '⛽ Заправиться' },
    { value: 'enter',         label: '🛒 Войти в магазин АЗС' },
    { value: 'atm',           label: '� Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Отель ---
  hotel: [
    { value: 'enter',         label: '🏨 Зайти в отель' },
    { value: 'open_hotel',    label: '🛏️ Меню номеров' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Магазин ---
  shop: [
    { value: 'enter',         label: '🛒 Войти в магазин' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Пиццерия ---
  pizzeria: [
    { value: 'enter',         label: '🍕 Войти в пиццерию' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Тюнинг ---
  tuning: [
    { value: 'enter',         label: '🔧 Войти в тюнинг' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Автосалон ---
  showroom: [
    { value: 'enter',         label: '🚗 Войти в автосалон' },
    { value: 'buy_vehicle',   label: '🛒 Купить авто' },
    { value: 'atm',           label: '� Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Автошкола ---
  driving: [
    { value: 'enter',         label: '🎓 Войти в автошколу' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Тир / Стрелковый ---
  guns: [
    { value: 'enter',         label: '🔫 Войти в тир' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Стрип-клуб ---
  nightclub: [
    { value: 'enter',         label: '💃 Войти в клуб' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '� Часть локации' },
  ],

  // --- Бар ---
  bar: [
    { value: 'enter',         label: '🍺 Войти в бар' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Парковка ---
  parking: [
    { value: 'enter',         label: '🅿️ Зайти на парковку' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Спортзал ---
  gym: [
    { value: 'enter',         label: '💪 Войти в спортзал' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Больница ---
  hospital: [
    { value: 'enter',         label: '🏥 Войти в больницу' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Шахта ---
  mine: [
    { value: 'enter',         label: '⛏️ Войти в шахту' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Порт ---
  port: [
    { value: 'enter',         label: '⚓ Войти в порт' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Склад ---
  warehouse: [
    { value: 'enter',         label: '📦 Войти на склад' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Ферма ---
  farm: [
    { value: 'enter',         label: '🌾 Войти на ферму' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Сваяная платформа ---
  oil_rig: [
    { value: 'enter',         label: '🛢️ Войти на платформу' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Завод ---
  factory: [
    { value: 'enter',         label: '🏭 Войти на завод' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],

  // --- Fallback для неизвестных типов ---
  default: [
    { value: 'enter',         label: '🚪 Войти в здание / интерьер' },
    { value: 'atm',           label: '� Использовать банкомат' },
    { value: 'buy_business',  label: '💼 Купить бизнес / инфо' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],
};

// ═══════════════════════════════════════════════════
//  КАТЕГОРИЯ ПО ID ЛОКАЦИИ
// ═══════════════════════════════════════════════════

export function getLocationCategory(locId) {
  if (!locId) return 'default';
  if (['economy', 'comfort', 'business', 'premium'].includes(locId)) return 'house';
  if (locId.startsWith('bank')) return 'bank';
  if (locId.startsWith('gas')) return 'gas';
  if (locId.startsWith('hotel')) return 'hotel';
  if (locId.startsWith('shop') || locId.startsWith('clothes')) return 'shop';
  if (locId.startsWith('pizzeria')) return 'pizzeria';
  if (locId.startsWith('tuning')) return 'tuning';
  if (locId.startsWith('showroom')) return 'showroom';
  if (locId.startsWith('driving')) return 'driving';
  if (locId.startsWith('guns') || locId.startsWith('gun_range')) return 'guns';
  if (locId.startsWith('strip') || locId.startsWith('club') || locId.startsWith('nightclub')) return 'nightclub';
  if (locId.startsWith('bar')) return 'bar';
  if (locId.startsWith('parking')) return 'parking';
  if (locId.startsWith('gym')) return 'gym';
  if (locId.startsWith('hospital')) return 'hospital';
  if (locId.startsWith('mine')) return 'mine';
  if (locId.startsWith('port') || locId.startsWith('fishing_port')) return 'port';
  if (locId.startsWith('warehouse')) return 'warehouse';
  if (locId.startsWith('farm')) return 'farm';
  if (locId.startsWith('oil_rig')) return 'oil_rig';
  if (locId.startsWith('factory')) return 'factory';
  return 'default';
}

// ═══════════════════════════════════════════════════
//  СПИСОК ДЕЙСТВИЙ ДЛЯ КАТЕГОРИИ
// ═══════════════════════════════════════════════════

export function getActionsForCategory(locId) {
  const category = getLocationCategory(locId);
  return LOCATION_ACTIONS[category] || LOCATION_ACTIONS.default;
}

// ═══════════════════════════════════════════════════
//  РУТЕР ОБРАБОТКИ (для MapView)
// ═══════════════════════════════════════════════════

export function handleLocationAction(action, location, callbacks) {
  const loc = location;

  if (action === 'unload_garbage') return callbacks.onUnloadGarbage?.();
  if (action === 'atm' || action === 'open_atm') return callbacks.setShowATM?.(true);
  if (action === 'buy_business') return callbacks.setSelectedBusiness?.(loc.id);
  if (action === 'open_hotel') return callbacks.setSelectedHotel?.(loc.id);

  if (action === 'enter' || action === 'default' || action === 'refuel') {
    return routeByType(loc, callbacks);
  }

  return routeByType(loc, callbacks);
}

function routeByType(loc, cb) {
  const t = loc.type;
  const id = loc.id;

  if (t === 'bank') return cb.setShowBank?.(true);
  if (t === 'shop') return cb.setCurrentShop?.(id);
  if (id === 'pizzeria_1') return cb.setShowPizzeria?.(true);
  if (id === 'mine') return cb.setShowMine?.(true);
  if (id === 'fishing_port') return cb.setShowFishingPort?.(true);
  if (t === 'farm') return cb.setShowFarm?.(true);
  if (t === 'oil_rig') return cb.setShowOilRig?.(true);
  if (t === 'factory') return cb.setShowFactory?.(true);
  if (t === 'workshop') return cb.setShowWorkshop?.(true);
  if (t === 'trucker') return cb.setShowTrucker?.(true);
  if (id === 'port_ls') return cb.setShowExport?.(true);
  if (t === 'nightclub') return cb.setShowStripClub?.(true);
  if (t === 'clothes') return cb.setCurrentShop?.(id);
  if (t === 'tuning') return cb.setShowTuningShop?.(true);
  if (id === 'driving_1' || id === 'driving_school_1') return cb.setShowDrivingSchool?.(true);
  if (id === 'guns_1' || id === 'gun_range_1') return cb.setShowGunRange?.(true);
  if (id === 'box_club') return cb.setShowBoxClub?.(true);
  if (t === 'atm') return cb.setShowATM?.(true);
  if (t === 'hotel') return cb.setSelectedHotel?.(id);
  if (t === 'bar') return cb.setCurrentShop?.(id);
  if (t === 'gas') return cb.setCurrentShop?.(id);
  if (t === 'parking') return cb.alert?.('Парковка — скоро открытие');
  if (t === 'gym') return cb.alert?.('Спортзал — скоро открытие');
  if (id === 'bus_depot') return cb.setShowBusDepot?.(true);
  if (t === 'lspd') return cb.setShowLspd?.(true);
  if (t === 'mafia') return cb.setShowMafia?.(true);
  if (t === 'hospital') return cb.setShowHospital?.(true);
  if (t === 'cafeteria') { cb.setShowCafeteria?.(true); return cb.setCafeteriaBusinessId?.(id); }
  if (t === 'showroom' || id === 'showroom_ls') return cb.setShowShowroom?.(true);
}
