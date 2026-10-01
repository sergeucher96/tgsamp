/**
 * locationActions.js — действия для категорий локаций.
 *
 * Каждая категория (house, gas, bank, shop...) имеет список действий.
 * Для добавления нового действия — допишите его в массив нужной категории.
 *
 * HotspotTool.jsx берёт список actions через getActionsForCategory().
 * MapView.jsx использует handleLocationAction() для маршрутизации.
 */

import { GANG_IDS } from '../../gangs/data/organizationsConfig';

export type LocationCategory =
  | 'house'
  | 'bank'
  | 'gas'
  | 'hotel'
  | 'shop'
  | 'pizzeria'
  | 'tuning'
  | 'showroom'
  | 'driving'
  | 'guns'
  | 'nightclub'
  | 'bar'
  | 'parking'
  | 'gym'
  | 'hospital'
  | 'mine'
  | 'port'
  | 'warehouse'
  | 'farm'
  | 'oil_rig'
  | 'factory'
  | 'gang'
  | 'military'
  | 'default';

export interface LocationAction {
  value: string;
  label: string;
}

export type LocationActionsMap = Record<LocationCategory, LocationAction[]>;

export type LocationId = string | number;

export interface LocationActionTarget {
  id: LocationId;
  type: string;
  [key: string]: unknown;
}

export interface LocationCallbacks {
  onUnloadGarbage?: () => unknown;
  setShowATM?: (value: boolean) => unknown;
  setSelectedBusiness?: (id: LocationId) => unknown;
  setSelectedHotel?: (id: LocationId) => unknown;
  setShowBank?: (value: boolean) => unknown;
  setCurrentShop?: (id: LocationId) => unknown;
  setShowPizzeria?: (value: boolean) => unknown;
  setShowMine?: (value: boolean) => unknown;
  setShowFishingPort?: (value: boolean) => unknown;
  setShowFarm?: (value: boolean) => unknown;
  setShowOilRig?: (value: boolean) => unknown;
  setShowFactory?: (value: boolean) => unknown;
  setShowWorkshop?: (value: boolean) => unknown;
  setShowTrucker?: (value: boolean) => unknown;
  setShowExport?: (value: boolean) => unknown;
  setShowStripClub?: (value: boolean) => unknown;
  setShowTuningShop?: (value: boolean) => unknown;
  setShowDrivingSchool?: (value: boolean) => unknown;
  setShowGunRange?: (value: boolean) => unknown;
  setShowBoxClub?: (value: boolean) => unknown;
  alert?: (message: string) => unknown;
  setShowBusDepot?: (value: boolean) => unknown;
  setShowLspd?: (value: boolean) => unknown;
  setOpenGangId?: (value: string | null) => unknown;
  setShowHospital?: (value: boolean) => unknown;
  setShowCafeteria?: (value: boolean) => unknown;
  setCafeteriaBusinessId?: (id: LocationId) => unknown;
  setShowShowroom?: (value: boolean) => unknown;
  setShowAutoService?: (value: boolean) => unknown;
  /**
   * Локация не попала ни в одну ветку. Нужен для хвостов, которые
   * знает только сама карта: работа по локациям, например.
   */
  onUnrouted?: (loc: LocationActionTarget) => unknown;
  /**
   * Попытка ограбления военной базы. Проверки (членство в банде,
   * время суток) карта делает сама — роутер только передаёт действие.
   */
  onStealMaterials?: (loc: LocationActionTarget) => unknown;
}

export const LOCATION_ACTIONS: LocationActionsMap = {

  // --- Дом (economy, comfort, business, premium) ---
  house: [
    { value: 'enter',         label: '📦 Войти в дом / Шкаф' },
    { value: 'garage',        label: '🅿️ Зайти в гараж' },
    { value: 'kitchen',       label: '🍳 Кухня' },
    { value: 'sublocation',   label: '📍 Часть локации (комната)' },
  ],

  // --- Банк ---
  bank: [
    { value: 'enter',         label: '🏦 Войти в банк' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'sublocation',   label: '📍 Перейти в зал' },
  ],

  // --- АЗС ---
  gas: [
    { value: 'refuel',        label: '⛽ Заправиться' },
    { value: 'enter',         label: '🛒 Войти в магазин АЗС' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
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
    { value: 'atm',           label: '🏧 Использовать банкомат' },
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
    { value: 'sublocation',   label: '📍 Часть локации' },
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

  // --- Хабы уличных банд ---
  // Отдельная категория нужна, чтобы в HotspotTool для хабов не
  // предлагались действия из default вроде «использовать банкомат».
  gang: [
    { value: 'open_gang',      label: '🎖️ Открыть меню банды' },
    { value: 'enter',         label: '🎖️ Войти в хаб (то же меню)' },
  ],

  // --- Военная база ---
  // Ограбление — только ночью и только для своих, проверки живут
  // в features/gangs/militaryBase.
  military: [
    { value: 'steal_materials', label: '📦 Воровать материалы' },
    { value: 'enter',           label: '🚪 Войти на базу' },
    { value: 'sublocation',     label: '📍 Часть локации' },
  ],

  // --- Fallback для неизвестных типов ---
  default: [
    { value: 'enter',         label: '🚪 Войти в здание / интерьер' },
    { value: 'atm',           label: '🏧 Использовать банкомат' },
    { value: 'buy_business',  label: '💼 Купить бизнес / инфо' },
    { value: 'sublocation',   label: '📍 Часть локации' },
  ],
};

// ═══════════════════════════════════════════════════
//  КАТЕГОРИЯ ПО ID ЛОКАЦИИ
// ═══════════════════════════════════════════════════

export function getLocationCategory(locId: string | undefined): LocationCategory {
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
  if (isGangLocationId(locId)) return 'gang';
  if (locId.startsWith('military')) return 'military';
  return 'default';
}

/**
 * Локация ли это уличной банды.
 *
 * Схема id хаба — <gang_id>_hideout (grove_hideout, ballas_hideout...),
 * именно на неё завязано и определение категории, и маршрутизация
 * в MapView. Голый gang_id тоже принимаем: в конфиге организаций
 * локация хаба хранится как location_id без суффикса.
 */
export function isGangLocationId(locId: string | undefined): boolean {
  if (!locId) return false;
  const base = locId.replace(/_hideout$/, '');
  return GANG_IDS.includes(base);
}

/** Банда по id локации. Пустая строка, если это не хаб. */
export function gangIdFromLocationId(locId: string | undefined): string {
  if (!locId) return '';
  const base = locId.replace(/_hideout$/, '');
  return GANG_IDS.includes(base) ? base : '';
}

// ═══════════════════════════════════════════════════
//  СПИСОК ДЕЙСТВИЙ ДЛЯ КАТЕГОРИИ
// ═══════════════════════════════════════════════════

export function getActionsForCategory(locId: string | undefined): LocationAction[] {
  const category = getLocationCategory(locId);
  return LOCATION_ACTIONS[category] || LOCATION_ACTIONS.default;
}

// ═══════════════════════════════════════════════════
//  РУТЕР ОБРАБОТКИ (для MapView)
// ═══════════════════════════════════════════════════

export function handleLocationAction(
  action: string,
  location: LocationActionTarget,
  callbacks: LocationCallbacks
): unknown {
  const loc = location;

  if (action === 'unload_garbage') return callbacks.onUnloadGarbage?.();
  if (action === 'steal_materials') return callbacks.onStealMaterials?.(loc);
  if (action === 'atm' || action === 'open_atm') return callbacks.setShowATM?.(true);
  if (action === 'buy_business') return callbacks.setSelectedBusiness?.(loc.id);
  if (action === 'open_hotel') return callbacks.setSelectedHotel?.(loc.id);
  // Автосалон открывается кнопкой в интерьере любой локации.
  if (action === 'buy_vehicle') return callbacks.setShowShowroom?.(true);

  // Меню банды: идёт и по 'enter', и по 'open_gang', но проверяем
  // тип локации, а не само значение — тогда хотспот, нарисованный
  // с другим действием, тоже откроет нужную панель.
  if (isGangLocationId(String(loc.id))) {
    return callbacks.setOpenGangId?.(gangIdFromLocationId(String(loc.id)) || null);
  }

  if (action === 'enter' || action === 'default' || action === 'refuel') {
    return routeByType(loc, callbacks);
  }

  return routeByType(loc, callbacks);
}

function routeByType(loc: LocationActionTarget, cb: LocationCallbacks): unknown {
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
  if (t === 'gang') {
    const gangId = String(id).replace(/_hideout$/, '');
    return cb.setOpenGangId?.(GANG_IDS.includes(gangId) ? gangId : null);
  }
  if (t === 'hospital') return cb.setShowHospital?.(true);
  if (t === 'cafeteria') { cb.setShowCafeteria?.(true); return cb.setCafeteriaBusinessId?.(id); }
  if (t === 'showroom' || id === 'showroom_ls') return cb.setShowShowroom?.(true);
  if (id === 'sto_1') return cb.setShowAutoService?.(true);
  // Ни одна ветка не знает про эту локацию — отдаём карте.
  return cb.onUnrouted?.(loc);
}
