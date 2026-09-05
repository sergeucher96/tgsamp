// src/data/houseStyles.js

// Hotspots для интерактивных зон дома (дверь, гараж и т.д.)
// Координаты рассчитываются от картинки (object-contain) — стабильны при любом размере экрана.
// Нарисуйте зоны через HotspotTool (Ctrl+Shift+H)
export const HOUSE_HOTSPOTS = {
  economy: {
    1: [
      { id: 'door', type: 'rect', x: 22.03635853728407, y: 50.697541268952165, w: 32.53247332111437, h: 18.46437690836538, action: 'enter', label: 'Войти в дом' },
      { id: 'garage', type: 'rect', x: 67.53786676604943, y: 45.568543767077344, w: 27.03711334302976, h: 24.912261960987607, action: 'garage', label: 'Гараж' }
    ]
  },
  comfort: {},
  business: {},
  premium: {}
};

// Картинки гаражей по классу дома (загрузите через Hotspot Tool)
export const HOUSE_GARAGE_IMAGES = {
  economy: {
    image: null, // загрузите 2D картинку гаража и укажите путь
  },
  comfort: {
    image: null,
  },
  business: {
    image: null,
  },
  premium: {
    image: null,
  }
};

// Хотспоты для гаража — подлокация дома
// 사용grundlage HotspotTool: создайте хотспоты "exit" (выход из гаража), "drive" (выехать на машине)
export const HOUSE_GARAGE_HOTSPOTS = {
  economy: {
    exit: { id: 'exit', type: 'rect', x: 10, y: 40, w: 20, h: 20, action: 'exit', label: 'Назад' },
  },
  comfort: {
    exit: { id: 'exit', type: 'rect', x: 10, y: 40, w: 20, h: 20, action: 'exit', label: 'Назад' },
  },
  business: {
    exit: { id: 'exit', type: 'rect', x: 10, y: 40, w: 20, h: 20, action: 'exit', label: 'Назад' },
  },
  premium: {
    exit: { id: 'exit', type: 'rect', x: 10, y: 40, w: 20, h: 20, action: 'exit', label: 'Назад' },
  }
};

// Реестр изображений (используем индексы v: 1, v: 2 и т.д.)
export const HOUSE_PREVIEWS_MAP = {
  economy: {
    images: [
      { id: 1, src: '/houses/eco_1.webp' },
      { id: 2, src: '/houses/eco_2.webp' },
      { id: 3, src: '/houses/eco_water.webp' },
    ],
    default: '/houses/eco_1.webp'
  },
  comfort: {
    images: [
      { id: 1, src: '/houses/comf_1.webp' },
      { id: 2, src: '/houses/comf_modern.webp' },
    ],
    default: '/houses/comf_1.webp'
  },
  business: {
    images: [
      { id: 1, src: '/houses/bus_1.webp' },
    ],
    default: '/houses/bus_1.webp'
  },
  premium: {
    images: [
      { id: 1, src: '/houses/prem_villa.webp' },
    ],
    default: '/houses/prem_villa.webp'
  }
};

const HOUSE_PREVIEWS = {
  economy: {
    1: '/houses/eco_1.webp',
    2: '/houses/eco_2.webp',
    3: '/houses/eco_water.webp',
    default: '/houses/eco_1.webp'
  },
  comfort: {
    1: '/houses/comf_1.webp',
    2: '/houses/comf_modern.webp',
    default: '/houses/comf_1.webp'
  },
  business: {
    1: '/houses/bus_1.webp',
    default: '/houses/bus_1.webp'
  },
  premium: {
    1: '/houses/prem_villa.webp',
    default: '/houses/prem_villa.webp'
  }
};

// Настройки обводок в зависимости от КЛАССА дома
export const CLASS_BORDERS = {
  economy: 'border-white/80 border-[2px]',
  comfort: 'border-yellow-400/90 border-[3px] shadow-[0_0_10px_rgba(234,179,8,0.3)]',
  business: 'border-cyan-400 border-[4px] shadow-[0_0_15px_rgba(34,211,238,0.5)]',
  premium: 'border-purple-500 border-[4px] shadow-[0_0_20px_rgba(168,85,247,0.7)] animate-pulse',
};

// 1. Функция получения стиля маркера на карте
export const getHouseStyle = (house, player) => {
  let statusColor = 'bg-emerald-600'; // По умолчанию: Свободен (Зеленый)

  if (house.owner_id) {
    if (house.owner_id === player?.id) {
      statusColor = 'bg-blue-600'; // Мой дом (Синий)
    } else if (house.is_for_sale) {
      statusColor = 'bg-amber-500'; // Продается игроком (Желтый)
    } else {
      statusColor = 'bg-red-600'; // Занят (Красный)
    }
  }

  return {
    color: statusColor,
    border: CLASS_BORDERS[house.class] || CLASS_BORDERS.economy,
  };
};

export const getHouseStateKey = (house, player) => {
  if (!house.owner_id) return 'free';
  if (house.owner_id === player?.id) return 'player';
  return 'occupied';
};

export const getHouseIconKey = (house, player) => {
  const cls = house.class || 'economy';
  const state = getHouseStateKey(house, player);
  return `${cls}-${state}`;
};

const HOUSE_ICONS_KEY = 'house_icons';

export const loadHouseIcons = () => {
  try {
    const raw = localStorage.getItem(HOUSE_ICONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveHouseIcon = (key, icon) => {
  const icons = loadHouseIcons();
  if (icon) {
    icons[key] = icon;
  } else {
    delete icons[key];
  }
  localStorage.setItem(HOUSE_ICONS_KEY, JSON.stringify(icons));
};

export const resetHouseIcon = (key) => {
  const icons = loadHouseIcons();
  delete icons[key];
  localStorage.setItem(HOUSE_ICONS_KEY, JSON.stringify(icons));
};

export const resetAllHouseIcons = () => {
  localStorage.removeItem(HOUSE_ICONS_KEY);
};

export const getHouseIcon = (house, player) => {
  const key = getHouseIconKey(house, player);
  const icons = loadHouseIcons();
  return icons[key] || null;
};

// 2. Функция получения картинки для меню (Маппинг)
export const getHousePreview = (house) => {
  const category = HOUSE_PREVIEWS[house.class] || HOUSE_PREVIEWS.economy;
  // Берем по индексу 'v' из объекта дома, если его нет — берем default
  return category[house.v] || category.default;
};

// Get house hotspots — merges localStorage (HotspotTool) with static data
// If localStorage has hotspots for the given class+imgIdx, use them. Otherwise fallback to static.
export function getHouseHotspots(cls, imgIdx) {
  const staticHs = HOUSE_HOTSPOTS[cls]?.[imgIdx] || [];
  const saved = localStorage.getItem(`hotspot_tool_${cls}`);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      console.log('[HouseHotspots] cls:', cls, 'saved data:', JSON.stringify(data));
      if (Array.isArray(data) && data.length > 0) return data;
      if (Array.isArray(data?.hotspots) && data.hotspots.length > 0) return data.hotspots;
    } catch (e) {}
  }
  return staticHs.length > 0 ? staticHs : [];
}

// Get house sublocations from localStorage (HotspotTool saves sublocations there)
export function getHouseSublocations(cls) {
  const saved = localStorage.getItem('hotspot_tool_sublocations');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(cls + '__')) {
          const label = key.substring(cls.length + 2);
          result[label] = value;
        }
      }
      return result;
    } catch (e) {}
  }
  return {};
}

// Get house preview image — merges static data with localStorage
export function getHouseImage(cls, imgIdx) {
  const saved = localStorage.getItem(`hotspot_tool_${cls}`);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data?.default) return data.default;
      if (data?.images?.length > 0) return data.images[imgIdx - 1]?.src || data.default;
    } catch (e) {}
  }
  const category = HOUSE_PREVIEWS_MAP[cls];
  if (!category) return null;
  const img = category.images?.find(i => i.id === imgIdx);
  return img?.src || category.default || null;
}

// Get house garage data from localStorage (HotspotTool sublocations)
export function getHouseGarageData(cls) {
  const saved = localStorage.getItem('hotspot_tool_sublocations');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(cls + '__')) {
          return value;
        }
      }
    } catch (e) {}
  }
  return HOUSE_GARAGE_IMAGES[cls] || { image: null };
}