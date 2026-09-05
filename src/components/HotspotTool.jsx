import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, Trash2, MapPin, Save, Upload, ArrowLeft } from 'lucide-react';
import { HOUSE_PREVIEWS_MAP } from '../data/houseStyles';
import { LOCATION_IMAGES } from '../data/locationStyles';
import { LOCATIONS } from '../data/locations';

/**
 * Safe localStorage write — catches QuotaExceededError and notifies the user.
 * Returns true if wrote successfully.
 */
function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert('⚠️LocalStorage переполнен! Нажмите "🗑️ Очистить всё" или удалите старые картинки для освобождения места.');
      return false;
    }
    throw e;
  }
}

/** Compress image to a smaller base64 string (max 1200px width/height, 0.7 quality) */
function compressImageBase64(base64, maxDim = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

// Type → label mapping for grouping
const TYPE_LABELS = {
  bank:       '🏦 Банки',
  shop:       '🛒 Магазины',
  clothes:    '👕 Одежда',
  bar:        '� Бары',
  nightclub:  '💃 Клубы',
  hotel:      '🏨 Отели',
  gas:        '⛽ АЗС',
  parking:    '🅿️ Парковки',
  gym:        '💪 Спорт',
  warehouse:  '📦 Склады',
  atm:        '🏧 Банкоматы',
  tuning:     '🔧 Тюнинг',
  showroom:   '🚗 Автосалон',
  driving_school: '🎓 Автошкола',
  guns:       '🔫 Оружие',
  gun_range:  '🎯 Стрелковые',
  job:        '💼 Работа',
  public:     '🏛️ Общественные',
  bus_depot:  '🚌 Транспорт',
};

// Build unified map: house classes + LOCATION_IMAGES + non-house LOCATIONS
const ALL_CLASSES = {
  economy:  HOUSE_PREVIEWS_MAP.economy,
  comfort:  HOUSE_PREVIEWS_MAP.comfort,
  business: HOUSE_PREVIEWS_MAP.business,
  premium:  HOUSE_PREVIEWS_MAP.premium,
  ...LOCATION_IMAGES,
};

// Auto-add locations from LOCATIONS not yet in ALL_CLASSES
LOCATIONS.forEach(loc => {
  if (loc.type === 'house' || ALL_CLASSES[loc.id]) return;
  const src = `/locations/${loc.id}.webp`;
  ALL_CLASSES[loc.id] = {
    label: (loc.icon || '📍') + ' ' + (loc.name || loc.id),
    images: [{ id: 1, src }],
    default: src,
  };
});

const CLASS_LABELS = {
  economy: '🏠 Эконом',
  comfort: '🏠 Комфорт',
  business: '🏠 Бизнес',
  premium: '🏠 Премиум',
  ...Object.entries(LOCATION_IMAGES).reduce((acc, [k, v]) => {
    acc[k] = v.label || k;
    return acc;
  }, {}),
};

// Also add labels from LOCATIONS
LOCATIONS.forEach(loc => {
  if (loc.type !== 'house' && !CLASS_LABELS[loc.id]) {
    CLASS_LABELS[loc.id] = (loc.icon || '📍') + ' ' + (loc.name || loc.id);
  }
});

// Group location keys by `type` for the dropdown
function getLocationGroups() {
  const seen = new Set(['economy', 'comfort', 'business', 'premium']);
  const byType = {};

  // From LOCATIONS (source of truth for type)
  LOCATIONS.forEach(loc => {
    if (loc.type === 'house') return;
    const key = loc.id;
    if (seen.has(key)) return;
    seen.add(key);
    const type = loc.type || 'other';
    if (!byType[type]) {
      byType[type] = { label: TYPE_LABELS[type] || ('📍 ' + type), keys: [] };
    }
    byType[type].keys.push(key);
  });

  // From LOCATION_IMAGES / ALL_CLASSES not in LOCATIONS
  Object.keys(LOCATION_IMAGES).forEach(key => {
    if (seen.has(key)) return;
    seen.add(key);
    if (!byType['__other__']) {
      byType['__other__'] = { label: '📦 Прочее', keys: [] };
    }
    byType['__other__'].keys.push(key);
  });

  return byType;
}

// Actions available per location type (maps to MapView onAction handler)
const HOTSPOT_ACTIONS = {
  // House classes
  economy:  [
    { value: 'enter', label: '📦 Шкаф' },
    { value: 'garage', label: '🅿️ Гараж' },
    { value: 'kitchen', label: '🍳 Кухня' },
    { value: 'sublocation', label: '📍 Часть локации' },
  ],
  comfort:  [
    { value: 'enter', label: '📦 Шкаф' },
    { value: 'garage', label: '🅿️ Гараж' },
    { value: 'kitchen', label: '🍳 Кухня' },
    { value: 'sublocation', label: '� Часть локации' },
  ],
  business: [
    { value: 'enter', label: '� Шкаф' },
    { value: 'garage', label: '�️ Гараж' },
    { value: 'kitchen', label: '🍳 Кухня' },
    { value: 'sublocation', label: '📍 Часть локации' },
  ],
  premium:  [
    { value: 'enter', label: '📦 Шкаф' },
    { value: 'garage', label: '🅿️ Гараж' },
    { value: 'kitchen', label: '🍳 Кухня' },
    { value: 'sublocation', label: '📍 Часть локации' },
  ],
  // Bank
  bank_1: [
    { value: 'enter', label: '🚪 Войти в банк' },
    { value: 'atm', label: '🏧 Банкомат' },
  ],
  bank_2: [
    { value: 'enter', label: '🚪 Войти в банк' },
    { value: 'atm', label: '🏧 Банкомат' },
  ],
  // Shops
  shop_1: [{ value: 'enter', label: '🛒 Войти в магазин' }],
  shop_2: [{ value: 'enter', label: '🛒 Войти в магазин' }],
  shop_3: [{ value: 'enter', label: '🛒 Войти в магазин' }],
  shop_4: [{ value: 'enter', label: '🛒 Войти в магазин' }],
  shop_5: [{ value: 'enter', label: '🛒 Войти в магазин' }],
  // Clothes
  clothes_1: [{ value: 'enter', label: '👕 Магазин одежды' }],
  // Bars
  bar_1: [{ value: 'enter', label: '🍺 Войти в бар' }],
  bar_2: [{ value: 'enter', label: '🍺 Войти в бар' }],
  bar_3: [{ value: 'enter', label: '🍺 Войти в бар' }],
  bar_4: [{ value: 'enter', label: '🍺 Войти в бар' }],
  // Nightclub
  club_1: [{ value: 'enter', label: '💃 Войти в клуб' }],
  // Hotels
  hotel_1: [
    { value: 'enter', label: '🏨 Зайти в отель' },
    { value: 'open_hotel', label: '🛏️ Забронировать' },
  ],
  hotel_2: [
    { value: 'enter', label: '🏨 Зайти в отель' },
    { value: 'open_hotel', label: '🛏️ Забронировать' },
  ],
  hotel_3: [
    { value: 'enter', label: '� Зайти в отель' },
    { value: 'open_hotel', label: '🛏️ Забронировать' },
  ],
  hotel_4: [
    { value: 'enter', label: '🏨 Зайти в отель' },
    { value: 'open_hotel', label: '🛏️ Забронировать' },
  ],
  // Gas stations
  gas_1: [
    { value: 'enter', label: '⛽ АЗС' },
    { value: 'refuel', label: '⛽ Заправиться' },
  ],
  gas_2: [
    { value: 'enter', label: '⛽ АЗС' },
    { value: 'refuel', label: '⛽ Заправиться' },
  ],
  gas_3: [
    { value: 'enter', label: '⛽ АЗС' },
    { value: 'refuel', label: '⛽ Заправиться' },
  ],
  gas_4: [
    { value: 'enter', label: '⛽ АЗС' },
    { value: 'refuel', label: '⛽ Заправиться' },
  ],
  gas_5: [
    { value: 'enter', label: '⛽ АЗС' },
    { value: 'refuel', label: '⛽ Заправиться' },
  ],
  // Parking
  parking_1: [
    { value: 'enter', label: '🅿️ Парковка' },
    { value: 'coming_soon', label: '🚧 Скоро открытие' },
  ],
  // Gym
  gym_1: [
    { value: 'enter', label: '💪 Спортзал' },
    { value: 'coming_soon', label: '🚧 Скоро открытие' },
  ],
  // Warehouse
  warehouse_1: [{ value: 'enter', label: '📦 Склад' }],
  warehouse_2: [{ value: 'enter', label: '📦 Склад' }],
  // ATM
  atm_1: [{ value: 'atm', label: '🏧 Банкомат' }],
  atm_2: [{ value: 'atm', label: '� Банкомат' }],
  // Tuning
  tuning_1: [{ value: 'enter', label: '🔧 Тюнинг' }],
  // Showroom
  showroom_ls: [
    { value: 'enter', label: '🚗 Автосалон' },
    { value: 'buy_business', label: '💰 Купить бизнес' },
  ],
  // Driving school
  driving_1: [{ value: 'enter', label: '🎓 Автошкола' }],
  driving_school_1: [{ value: 'enter', label: '🎓 Автошкола' }],
  // Gun range
  guns_1: [{ value: 'enter', label: '🔫 Стрелковый' }],
  gun_range_1: [{ value: 'enter', label: '🎯 Стрелковый' }],
  // Port / Export
  port_ls: [{ value: 'enter', label: '📦 Порт / Скупка' }],
  // Mine
  mine: [{ value: 'enter', label: '⛏️ Шахта' }],
  // Fishing port
  fishing_port: [{ value: 'enter', label: '🎣 Рыболовный порт' }],
  // Pizzeria
  pizzeria_1: [{ value: 'enter', label: '🍕 Пizzeria' }],
  // Bus depot
  bus_depot: [{ value: 'enter', label: '🚌 Автовокзал' }],
  // Garbage depot — разгрузка мусоровоза
  garbage_depot: [
    { value: 'enter', label: '🚪 Войти' },
    { value: 'unload_garbage', label: '🗑️ Разгрузить мусор' },
  ],
  // LSPD
  lspd_1: [{ value: 'enter', label: '🚔 Полицейский участок' }],
  // Default fallback for unknown types
  default: [
    { value: 'enter', label: '🚪 Войти' },
    { value: 'atm', label: '🏧 Банкомат' },
    { value: 'buy_business', label: '💰 Купить бизнес' },
    { value: 'open_hotel', label: '🛏️ Открыть отель' },
    { value: 'refuel', label: '⛽ Заправиться' },
    { value: 'sublocation', label: '📍 Часть локации' },
    { value: 'coming_soon', label: '🚧 Скоро открытие' },
  ],
};

// Auto-add actions for locations not explicitly listed (use default)
LOCATIONS.forEach(loc => {
  if (loc.type === 'house') return;
  if (!HOTSPOT_ACTIONS[loc.id]) {
    HOTSPOT_ACTIONS[loc.id] = [{ value: 'enter', label: `Войти в ${loc.name || loc.id}` }];
  }
});

// Add 'sublocation' action to every location that doesn't already have it
Object.keys(HOTSPOT_ACTIONS).forEach(key => {
  const list = HOTSPOT_ACTIONS[key];
  if (!list.some(a => a.value === 'sublocation')) {
    list.push({ value: 'sublocation', label: '📍 Часть локации' });
  }
});

/**
 * HotspotTool — dev-инструмент для разметки интерактивных зон на изображениях.
 * Поддерживает дома (economy/comfort/business/premium) и локации (bank/shop/bar и т.д.).
 */
export default function HotspotTool({ onClose, onExport }) {
  const [houseClass, setHouseClass] = useState(() => {
    return localStorage.getItem('hotspot_tool_last_class') || 'economy';
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [hotspots, setHotspots] = useState(() => {
    try {
      const saved = localStorage.getItem(`hotspot_tool_${localStorage.getItem('hotspot_tool_last_class') || 'economy'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed.hotspots)) return parsed.hotspots;
      }
    } catch (e) {}
    return [];
  });
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('hotspot_tool_mode') || 'rect';
  });
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [hotspotNames, setHotspotNames] = useState({});
  const [hotspotActions, setHotspotActions] = useState({});
  const [hotspotSubNames, setHotspotSubNames] = useState({});
  const [hotspotPositions, setHotspotPositions] = useState(hotspots);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Panorama mode state
  const [isPanorama, setIsPanorama] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  
  const showToast = (message, duration = 2000) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  };
  
  // Sublocation editor mode
  const [editingSubLocation, setEditingSubLocation] = useState(null); // { hotspotId, parentId, parentClass, subName }
  const [subselectedImage, setSubselectedImage] = useState(null);
  const [subHotspots, setSubHotspots] = useState(() => {
    const saved = localStorage.getItem('hotspot_tool_sublocations');
    return saved ? JSON.parse(saved) : {}; // { subLocationKey: [hotspots] }
  });
  const [subHotspotNames, setSubHotspotNames] = useState({});
  const [subHotspotActions, setSubHotspotActions] = useState({});
  const [subHotspotSubNames, setSubHotspotSubNames] = useState({});
  const [subHotspotPositions, setSubHotspotPositions] = useState([]);
  const subContainerRef = useRef(null);
  const subImgRef = useRef(null);
  const subFileInputRef = useRef(null);
  const [subMode, setSubMode] = useState('rect');
  const [subDrawing, setSubDrawing] = useState(false);
  const [subStartPos, setSubStartPos] = useState(null);
  const [subPolygonPoints, setSubPolygonPoints] = useState([]);
  const [subDrawingRect, setSubDrawingRect] = useState(null);
  
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const hotspotsRef = useRef(hotspots);
  const hotspotNamesRef = useRef(hotspotNames);
  const hotspotActionsRef = useRef(hotspotActions);
  const hotspotSubNamesRef = useRef(hotspotSubNames);
  const houseClassRef = useRef(houseClass);
  const fileInputRef = useRef(null);

  // Keep all refs in sync
  useEffect(() => { hotspotsRef.current = hotspots; }, [hotspots]);
  useEffect(() => { hotspotNamesRef.current = hotspotNames; }, [hotspotNames]);
  useEffect(() => { hotspotActionsRef.current = hotspotActions; }, [hotspotActions]);
  useEffect(() => { hotspotSubNamesRef.current = hotspotSubNames; }, [hotspotSubNames]);
  useEffect(() => { houseClassRef.current = houseClass; }, [houseClass]);
  useEffect(() => { safeLocalStorageSet('hotspot_tool_last_class', houseClass); }, [houseClass]);
  useEffect(() => { safeLocalStorageSet('hotspot_tool_mode', mode); }, [mode]);

  // Handle uploading an image for the current location
  // Compress image before storing to avoid localStorage quota exceeded
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImageBase64(ev.target.result);
      setSelectedImage(compressed);
      const data = ALL_CLASSES[houseClass];
      if (data) {
        data.images = [{ id: 1, src: compressed }];
        data.default = compressed;
      }
      // Save image to localStorage
      const currentHs = hotspotsRef.current;
      const names = hotspotNamesRef.current;
      const actions = hotspotActionsRef.current;
      const subNames = hotspotSubNamesRef.current;
      const enriched = currentHs.map(h => {
        const action = actions[h.id] || h.action || 'enter';
        const sub = subNames[h.id] || h.subName || h.subLocation || '';
        return {
          ...h,
          name: names[h.id] || h.name || 'zone',
          action,
          subLocation: action === 'sublocation' ? sub : '',
          label: names[h.id] || h.name || 'zone',
        };
      });
      const saveData = {
        hotspots: enriched,
        default: compressed,
        images: [{ id: 1, src: compressed }],
      };
      safeLocalStorageSet(`hotspot_tool_${houseClass}`, JSON.stringify(saveData));
      showToast('🖼️ Изображение загружено');
      setTimeout(() => recalcHotspotPositions(currentHs), 200);
    };
    reader.readAsDataURL(file);
  };

  // Panorama handlers for image navigation
  const handlePanMouseDown = (e) => {
    if (!isPanorama) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handlePanMouseMove = (e) => {
    if (!isDragging || !isPanorama) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handlePanMouseUp = () => {
    setIsDragging(false);
  };

  const handlePanWheel = (e) => {
    if (!isPanorama) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  const togglePanorama = () => {
    setIsPanorama(prev => !prev);
    setPanX(0);
    setPanY(0);
    setZoom(1);
  };

  // Recalculate hotspot positions based on current image layout
  // Does NOT depend on hotspots state — uses hsList parameter or hotspotsRef
  const recalcHotspotPositions = useCallback((hsList) => {
    const container = containerRef.current;
    if (!container) return;

    const cW = container.getBoundingClientRect().width;
    const cH = container.getBoundingClientRect().height;

    const list = hsList ?? hotspotsRef.current;
    const positions = list.map(hs => {
      if (hs.type === 'rect') {
        return {
          ...hs,
          _left: (hs.x / 100) * cW,
          _top: (hs.y / 100) * cH,
          _width: (hs.w / 100) * cW,
          _height: (hs.h / 100) * cH,
        };
      }
      return hs;
    });
    setHotspotPositions(positions);
  }, []);

  // === Sublocation editor functions ===
  const getSubLocationKey = useCallback(() => {
    if (!editingSubLocation) return '';
    return `${editingSubLocation.parentId}__${editingSubLocation.subName}`;
  }, [editingSubLocation]);

  const loadSublocationData = useCallback((subKey) => {
    const imgs = subHotspots[subKey]?.images || subHotspots[subKey];
    if (Array.isArray(imgs)) {
      // It's an old-format hotspot array loaded from localStorage
      setSubselectedImage(null);
      setSubHotspots(prev => prev); // keep as-is
    }
    // Load sublocation hotspots
    const data = subHotspots[subKey];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      setSubselectedImage(data.image || null);
      setSubHotspotPositions([]);
    } else {
      setSubselectedImage(null);
      setSubHotspotPositions([]);
    }
  }, [subHotspots]);

  // Recalculate sublocation hotspot positions
  const recalcSubHotspotPositions = useCallback((subKey) => {
    const container = subContainerRef.current;
    if (!container) return;

    const cW = container.getBoundingClientRect().width;
    const cH = container.getBoundingClientRect().height;

    const data = subHotspots[subKey];
    const hsList = (data && typeof data === 'object' && data.hotspots) ? data.hotspots : [];
    const positions = hsList.map(hs => {
      if (hs.type === 'rect') {
        return {
          ...hs,
          _left: (hs.x / 100) * cW,
          _top: (hs.y / 100) * cH,
          _width: (hs.w / 100) * cW,
          _height: (hs.h / 100) * cH,
        };
      }
      return hs;
    });
    setSubHotspotPositions(positions);
  }, [subHotspots]);

  // Load sublocation when editingSubLocation changes
  useEffect(() => {
    if (!editingSubLocation) return;
    const subKey = getSubLocationKey();
    const data = subHotspots[subKey];
    if (data && typeof data === 'object' && data.image) {
      setSubselectedImage(data.image);
      setTimeout(() => recalcSubHotspotPositions(subKey), 200);
    } else {
      setSubselectedImage(null);
    }
    setSubHotspotNames({});
    setSubHotspotActions({});
    setSubHotspotSubNames({});
  }, [editingSubLocation]);

  // Recalc sub hotspots on their change or resize
  useEffect(() => {
    if (!editingSubLocation) return;
    const subKey = getSubLocationKey();
    recalcSubHotspotPositions(subKey);
    const onResize = () => recalcSubHotspotPositions(subKey);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [editingSubLocation, subHotspots, recalcSubHotspotPositions, getSubLocationKey]);

  // Sublocation image upload
  // Always use base64 for persistence (survives page reload)
  const handleSubImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setSubselectedImage(base64);
      setSubHotspots(prev => {
        const subKey = `${editingSubLocation.parentId}__${editingSubLocation.subName}`;
        const updated = { ...prev };
        updated[subKey] = { ...(updated[subKey] || {}), image: base64, hotspots: updated[subKey]?.hotspots || [] };
        safeLocalStorageSet('hotspot_tool_sublocations', JSON.stringify(updated));
        return updated;
      });
      showToast('🖼️ Изображение подлокации загружено');
      setTimeout(() => {
        const subKey = `${editingSubLocation.parentId}__${editingSubLocation.subName}`;
        recalcSubHotspotPositions(subKey);
      }, 200);
    };
    reader.readAsDataURL(file);
  };

  // Sublocation mouse handlers
  const getSubPercentCoords = useCallback((e) => {
    const container = subContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const cRect = container.getBoundingClientRect();
    const clickX = e.clientX - cRect.left;
    const clickY = e.clientY - cRect.top;
    return {
      x: (clickX / cRect.width) * 100,
      y: (clickY / cRect.height) * 100,
    };
  }, []);

  const saveSubHotspotsList = useCallback((list) => {
    const subKey = getSubLocationKey();
    setSubHotspots(prev => {
      const updated = { ...prev };
      const existing = updated[subKey] || {};
      updated[subKey] = { ...existing, hotspots: list };
      safeLocalStorageSet('hotspot_tool_sublocations', JSON.stringify(updated));
      return updated;
    });
  }, [getSubLocationKey]);

  const handleSubMouseDown = useCallback((e) => {
    const coords = getSubPercentCoords(e);
    if (subMode === 'rect') {
      setSubDrawing(true);
      setSubStartPos(coords);
    } else if (subMode === 'polygon') {
      setSubPolygonPoints(prev => [...prev, coords]);
    }
  }, [subMode, getSubPercentCoords]);

  const handleSubMouseMove = useCallback((e) => {
    if (subMode === 'rect' && subDrawing && subStartPos) {
      const end = getSubPercentCoords(e);
      setSubDrawingRect({
        x: Math.min(subStartPos.x, end.x),
        y: Math.min(subStartPos.y, end.y),
        w: Math.abs(end.x - subStartPos.x),
        h: Math.abs(end.y - subStartPos.y),
      });
    }
  }, [subMode, subDrawing, subStartPos, getSubPercentCoords]);

  const handleSubMouseUp = useCallback((e) => {
    if (subMode === 'rect' && subDrawing && subStartPos) {
      const end = getSubPercentCoords(e);
      const x = Math.min(subStartPos.x, end.x);
      const y = Math.min(subStartPos.y, end.y);
      const w = Math.abs(end.x - subStartPos.x);
      const h = Math.abs(end.y - subStartPos.y);
      if (w > 1 && h > 1) {
        const id = Date.now();
        const newHs = { id, type: 'rect', x, y, w, h, name: 'zone' };
        const subKey = getSubLocationKey();
        const existing = subHotspots[subKey]?.hotspots || [];
        const updated = [...existing, newHs];
        saveSubHotspotsList(updated);
        setTimeout(() => recalcSubHotspotPositions(subKey), 50);
      }
      setSubDrawing(false);
      setSubStartPos(null);
      setSubDrawingRect(null);
    }
  }, [subMode, subDrawing, subStartPos, getSubPercentCoords, subHotspots, getSubLocationKey, saveSubHotspotsList, recalcSubHotspotPositions]);

  const finishSubPolygon = () => {
    if (subPolygonPoints.length >= 3) {
      const id = Date.now();
      const points = subPolygonPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const subKey = getSubLocationKey();
      const existing = subHotspots[subKey]?.hotspots || [];
      const updated = [...existing, { id, type: 'polygon', points, name: 'zone' }];
      saveSubHotspotsList(updated);
      setTimeout(() => recalcSubHotspotPositions(subKey), 50);
    }
    setSubPolygonPoints([]);
  };

  const removeSubHotspot = (id) => {
    const subKey = getSubLocationKey();
    const existing = subHotspots[subKey]?.hotspots || [];
    const updated = existing.filter(h => h.id !== id);
    saveSubHotspotsList(updated);
    setTimeout(() => recalcSubHotspotPositions(subKey), 50);
  };

  const renameSubHotspot = (id, name) => {
    const newNames = { ...subHotspotNames, [id]: name };
    setSubHotspotNames(newNames);
    const subKey = getSubLocationKey();
    const hsList = subHotspots[subKey]?.hotspots || [];
    const enriched = hsList.map(h => ({
      ...h,
      name: newNames[h.id] || h.name || 'zone',
      action: subHotspotActions[h.id] || h.action || 'enter',
      subName: subHotspotSubNames[h.id] || h.subName || '',
      label: newNames[h.id] || h.name || 'zone',
    }));
    saveSubHotspotsList(enriched);
  };

  const setSubHotspotAction = (id, action) => {
    const newActions = { ...subHotspotActions, [id]: action };
    setSubHotspotActions(newActions);
    const subKey = getSubLocationKey();
    const hsList = subHotspots[subKey]?.hotspots || [];
    const enriched = hsList.map(h => ({
      ...h,
      name: subHotspotNames[h.id] || h.name || 'zone',
      action: newActions[h.id] || h.action || 'enter',
      subName: subHotspotSubNames[h.id] || h.subName || '',
      label: subHotspotNames[h.id] || h.name || 'zone',
    }));
    saveSubHotspotsList(enriched);
  };

  const setSubHotspotSubName = (id, subName) => {
    const newSubNames = { ...subHotspotSubNames, [id]: subName };
    setSubHotspotSubNames(newSubNames);
    const subKey = getSubLocationKey();
    const hsList = subHotspots[subKey]?.hotspots || [];
    const enriched = hsList.map(h => ({
      ...h,
      name: subHotspotNames[h.id] || h.name || 'zone',
      action: subHotspotActions[h.id] || h.action || 'enter',
      subName: newSubNames[h.id] || h.subName || '',
      label: subHotspotNames[h.id] || h.name || 'zone',
    }));
    saveSubHotspotsList(enriched);
  };

  // Enter sublocation edit mode
  const openSubLocationEditor = (hotspotId) => {
    const subName = hotspotSubNames[hotspotId] || '';
    if (!subName) { alert('Сначала введите имя подлокации'); return; }
    const subKey = `${houseClass}__${subName}`;
    setEditingSubLocation({ hotspotId, parentId: houseClass, subName });
    const existing = subHotspots[subKey];
    if (existing && existing.image) {
      setSubselectedImage(existing.image);
      // Restore names, actions from saved hotspots
      const names = {}, actions = {}, subNames = {};
      (existing.hotspots || []).forEach(h => {
        if (h.name) names[h.id] = h.name;
        if (h.action) actions[h.id] = h.action;
        if (h.subName) subNames[h.id] = h.subName;
      });
      setSubHotspotNames(names);
      setSubHotspotActions(actions);
      setSubHotspotSubNames(subNames);
    } else {
      setSubselectedImage(null);
    }
  };

  // Exit sublocation editor
  const closeSubLocationEditor = () => {
    setEditingSubLocation(null);
    setSubselectedImage(null);
    setSubHotspotPositions([]);
    setSubPolygonPoints([]);
    setSubDrawing(false);
  };

  // Recalculate on hotspots change and resize
  useEffect(() => {
    recalcHotspotPositions();

    const onResize = () => recalcHotspotPositions();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [hotspots, recalcHotspotPositions]);

  // Load images from ALL_CLASSES for current class
  const currentClassData = ALL_CLASSES[houseClass] || {};
  const imagesList = currentClassData.images || [];

  // Load image when class changes
  const handleClassChange = (cls) => {
    setHouseClass(cls);
    setPolygonPoints([]);
    setDrawing(false);
    setStartPos(null);
    setDrawingRect(null);
    const data = ALL_CLASSES[cls];
    if (data?.images?.[0]) {
      setSelectedImage(data.images[0].src);
    } else {
      setSelectedImage(null);
    }
    const saved = localStorage.getItem(`hotspot_tool_${cls}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      const hsArray = Array.isArray(parsed) ? parsed : (parsed.hotspots || []);
      setHotspots(hsArray);
      hotspotsRef.current = hsArray;
      const names = {}, actions = {}, subNames = {};
      hsArray.forEach(h => {
        if (h.name) names[h.id] = h.name;
        if (h.action) actions[h.id] = h.action;
        if (h.subLocation) subNames[h.id] = h.subLocation;
        if (h.subName && !h.subLocation) subNames[h.id] = h.subName;
      });
      setHotspotNames(names);
      setHotspotActions(actions);
      setHotspotSubNames(subNames);
      // Restore custom image
      if (!Array.isArray(parsed) && parsed.default) {
        setSelectedImage(parsed.default);
      } else if (!Array.isArray(parsed) && parsed.images?.length > 0) {
        setSelectedImage(parsed.images[0].src);
      }
    } else {
      setHotspots([]);
      hotspotsRef.current = [];
      setHotspotNames({});
      setHotspotActions({});
      setHotspotSubNames({});
      hotspotNamesRef.current = {};
      hotspotActionsRef.current = {};
      hotspotSubNamesRef.current = {};
    }
  };

  // Recalculate positions when image loads (after class change)
  useEffect(() => {
    if (selectedImage) {
      // Delay to ensure image is rendered
      const timer = setTimeout(() => recalcHotspotPositions(hotspotsRef.current), 100);
      return () => clearTimeout(timer);
    }
  }, [selectedImage]);

  // Load first image on mount and restore names/actions from localStorage
  useEffect(() => {
    const data = ALL_CLASSES[houseClass];
    if (data?.images?.[0] && !selectedImage) {
      setSelectedImage(data.images[0].src);
    }
    // Restore names/actions/subNames from saved hotspots
    const saved = localStorage.getItem(`hotspot_tool_${houseClass}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Support both old format [array] and new format {hotspots: [...]}
        const hsArray = Array.isArray(parsed) ? parsed : (parsed.hotspots || []);
        const names = {}, actions = {}, subNames = {};
        hsArray.forEach(h => {
          if (h.name) names[h.id] = h.name;
          if (h.action) actions[h.id] = h.action;
          if (h.subLocation) subNames[h.id] = h.subLocation;
          if (h.subName && !h.subLocation) subNames[h.id] = h.subName;
        });
        setHotspotNames(names);
        setHotspotActions(actions);
        setHotspotSubNames(subNames);
        // Also sync refs immediately
        hotspotNamesRef.current = names;
        hotspotActionsRef.current = actions;
        hotspotSubNamesRef.current = subNames;
        // Restore hotspots array
        if (hsArray.length > 0) {
          setHotspots(hsArray);
          hotspotsRef.current = hsArray;
          // Load custom image (houses and locations)
          if (!Array.isArray(parsed) && parsed.default) {
            setSelectedImage(parsed.default);
          } else if (!Array.isArray(parsed) && parsed.images?.length > 0) {
            setSelectedImage(parsed.images[0].src);
          }
          showToast(`✅ ${hsArray.length} зон загружено`);
        }
      } catch (e) {}
    }
  }, []);

  const getPercentCoords = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    
    const cRect = container.getBoundingClientRect();
    const clickX = e.clientX - cRect.left;
    const clickY = e.clientY - cRect.top;
    
    return {
      x: (clickX / cRect.width) * 100,
      y: (clickY / cRect.height) * 100,
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    const coords = getPercentCoords(e);
    if (mode === 'rect') {
      setDrawing(true);
      setStartPos(coords);
    } else if (mode === 'polygon') {
      setPolygonPoints(prev => [...prev, coords]);
    }
  }, [mode, getPercentCoords]);

  const [drawingRect, setDrawingRect] = useState(null);
  const handleMouseMove = useCallback((e) => {
    if (mode === 'rect' && drawing && startPos) {
      const end = getPercentCoords(e);
      setDrawingRect({ x: Math.min(startPos.x, end.x), y: Math.min(startPos.y, end.y), w: Math.abs(end.x - startPos.x), h: Math.abs(end.y - startPos.y) });
    }
  }, [mode, drawing, startPos, getPercentCoords]);

  const handleMouseUp = useCallback((e) => {
    if (mode === 'rect' && drawing && startPos) {
      const end = getPercentCoords(e);
      const x = Math.min(startPos.x, end.x);
      const y = Math.min(startPos.y, end.y);
      const w = Math.abs(end.x - startPos.x);
      const h = Math.abs(end.y - startPos.y);
      if (w > 1 && h > 1) {
        const id = Date.now();
        const newHotspot = { id, type: 'rect', x, y, w, h, name: 'zone', action: 'enter' };
        const updated = [...hotspotsRef.current, newHotspot];
        setHotspots(updated);
        saveHotspotsToStorage(updated);
        recalcHotspotPositions(updated);
        showToast('✅ Зона создана');
      }
      setDrawing(false);
      setStartPos(null);
      setDrawingRect(null);
    }
  }, [mode, drawing, startPos, houseClass, recalcHotspotPositions, getPercentCoords]);

  const finishPolygon = () => {
    if (polygonPoints.length >= 3) {
      const id = Date.now();
      const points = polygonPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const updated = [...hotspotsRef.current, { id, type: 'polygon', points, name: 'zone', action: 'enter' }];
      setHotspots(updated);
      saveHotspotsToStorage(updated);
      recalcHotspotPositions(updated);
      showToast('✅ Полигон создан');
    }
    setPolygonPoints([]);
  };

  const removeHotspot = (id) => {
    const updated = hotspotsRef.current.filter(h => h.id !== id);
    setHotspots(updated);
    saveHotspotsToStorage(updated);
    recalcHotspotPositions(updated);
  };

  const renameHotspot = (id, name) => {
    const newNames = { ...hotspotNames, [id]: name };
    setHotspotNames(newNames);
    hotspotNamesRef.current = newNames;
    saveHotspotsToStorage();
  };

  const setHotspotAction = (id, action) => {
    const newActions = { ...hotspotActions, [id]: action };
    setHotspotActions(newActions);
    hotspotActionsRef.current = newActions;
    saveHotspotsToStorage();
  };

  const setHotspotSubName = (id, subName) => {
    const newSubNames = { ...hotspotSubNames, [id]: subName };
    setHotspotSubNames(newSubNames);
    hotspotSubNamesRef.current = newSubNames;
    saveHotspotsToStorage();
  };

  // Central save function: saves hotspots with embedded name, action, subLocation
  // Saves custom image (base64) for both houses and locations
  const saveHotspotsToStorage = (hsList) => {
    const hs = hsList || hotspotsRef.current;
    const names = hotspotNamesRef.current;
    const actions = hotspotActionsRef.current;
    const subNames = hotspotSubNamesRef.current;
    const cls = houseClassRef.current;
    const enriched = hs.map(h => {
      const action = actions[h.id] || h.action || 'enter';
      const sub = subNames[h.id] || h.subName || h.subLocation || '';
      const obj = {
        ...h,
        name: names[h.id] || h.name || 'zone',
        action,
        subLocation: action === 'sublocation' ? sub : '',
        label: names[h.id] || h.name || 'zone',
      };
      return obj;
    });
    // Save base64 image if available (both houses and locations)
    const customImg = selectedImage && !selectedImage.startsWith('/') ? selectedImage : undefined;
    const data = {
      hotspots: enriched,
      ...(customImg ? {
        default: customImg,
        images: [{ id: 1, src: customImg }],
      } : {}),
    };
    safeLocalStorageSet(`hotspot_tool_${cls}`, JSON.stringify(data));
  };

  const saveToStorage = () => {
    saveHotspotsToStorage();
    showToast('✅ Сохранено');
  };

  const exportJSON = () => {
    const data = {
      class: houseClass,
      hotspots: hotspots.map(h => {
        const action = hotspotActions[h.id] || 'enter';
        const obj = {
          ...h,
          name: hotspotNames[h.id] || h.name,
          label: hotspotNames[h.id] || h.name,
          action,
        };
        if (action === 'sublocation') {
          obj.subLocation = hotspotSubNames[h.id] || '';
        }
        return obj;
      }),
      // Include sublocations data
      sublocations: (() => {
        const subs = {};
        Object.entries(subHotspots).forEach(([key, val]) => {
          if (typeof val === 'object' && !Array.isArray(val) && val.image) {
            const actionMap = {};
            const nameMap = {};
            const subNameMap = {};
            // Find which location owns this sub — use key prefix
            const locId = key.split('__')[0];
            const subKey = key.split('__')[1];
            subs[`${locId}__${subKey}`] = {
              image: val.image,
              label: subKey,
              hotspots: (val.hotspots || []).map(hs => {
                const act = actionMap[hs.id] || 'enter';
                const hsObj = {
                  ...hs,
                  name: nameMap[hs.id] || hs.name,
                  label: nameMap[hs.id] || hs.name,
                  action: act,
                };
                if (act === 'sublocation') {
                  hsObj.subLocation = subNameMap[hs.id] || '';
                }
                return hsObj;
              })
            };
          }
        });
        return Object.keys(subs).length > 0 ? subs : undefined;
      })(),
    };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showToast('📋 JSON скопирован в буфер обмена');
    }).catch(() => {
      showToast('❌ Не удалось скопировать');
    });
    if (onExport) onExport(data);
    saveToStorage();
  };

  const clearAll = () => {
    setHotspots([]);
    setHotspotPositions([]);
    setHotspotNames({});
    localStorage.removeItem(`hotspot_tool_${houseClass}`);
    showToast('🗑️ Все зоны удалены');
  };

  const clearAllStorage = () => {
    if (!confirm('Удалить ВСЕ данные HotspotTool из localStorage? Это освободит место.')) return;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('hotspot_tool_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    setHotspots([]);
    setHotspotPositions([]);
    setHotspotNames({});
    setSubHotspots({});
    setSubselectedImage(null);
    setSelectedImage(null);
    showToast(`🗑️ Удалено ${keysToRemove.length} записей`);
  };

  // Preview of drawing rect
  const previewRect = drawing && startPos ? (() => {
    // Will be updated via mousemove — simplified
    return null;
  })() : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col text-white font-sans">
      {/* Toast notification */}
      {toast && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-green-600/90 backdrop-blur-md border border-green-400/30 shadow-xl text-xs font-black uppercase animate-bounce">
          {toast}
        </div>
      )}
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 shrink-0 p-4 flex items-center justify-between bg-gradient-to-r from-orange-600/20 to-transparent border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-lg">🛠️</span>
          <div>
            <h2 className="text-sm font-black uppercase italic">Hotspot Tool</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Инструмент разметки</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-xl active:scale-90">
          <X size={18} />
        </button>
      </div>

      {/* Image area — absolute fills parent */}
      <div ref={containerRef} className="absolute inset-0 bg-black overflow-hidden">
        {selectedImage ? (
          <div
            className="absolute inset-0 w-full h-full cursor-crosshair select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={e => handleMouseDown(e.touches[0])}
            onTouchMove={e => handleMouseMove(e.touches[0])}
            onTouchEnd={e => handleMouseUp(e.changedTouches[0])}
          >
            <img
              ref={imgRef}
              src={selectedImage}
              alt="House"
              className="absolute inset-0 w-full h-full object-fill"
              onLoad={() => {
                console.log('HotspotTool img loaded:', selectedImage);
                recalcHotspotPositions(hotspotsRef.current);
              }}
              onError={(e) => {
                console.error('HotspotTool img error:', selectedImage, e);
                setSelectedImage(null);
              }}
            />

            {/* Hotspot overlays */}
            {hotspotPositions.map(h => {
              const name = hotspotNames[h.id] || h.name;
              if (h.type === 'rect') {
                return (
                  <div key={h.id}
                    className="absolute border-2 border-orange-500 bg-orange-500/30 rounded-lg cursor-move group"
                    style={{
                      left: `${h._left}px`,
                      top: `${h._top}px`,
                      width: `${h._width}px`,
                      height: `${h._height}px`,
                      zIndex: 20,
                    }}
                  >
                    <span className="absolute -top-6 left-0 text-[10px] font-black text-orange-300 uppercase whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                      {name} ({h.x.toFixed(0)}%, {h.y.toFixed(0)}%)
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); removeHotspot(h.id); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <X size={10} />
                    </button>
                  </div>
                );
              }
              return (
                <svg key={h.id}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 20 }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="pointer-events-none"
                >
                  <polygon points={h.points} fill="rgba(255,140,0,0.2)" stroke="#f97316" strokeWidth="1" />
                </svg>
              );
            })}

            {/* Drawing preview */}
            {drawingRect && (
              <div
                className="absolute border-2 border-dashed border-orange-400 bg-orange-400/40 rounded pointer-events-none"
                style={{
                  left: `${drawingRect.x}%`,
                  top: `${drawingRect.y}%`,
                  width: `${drawingRect.w}%`,
                  height: `${drawingRect.h}%`,
                  zIndex: 30,
                }}
              />
            )}

            {/* Drawing polygon preview */}
            {polygonPoints.length > 0 && (
              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none"
              >
                {polygonPoints.map((p, i) => (
                  <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="3" fill="#f97316" />
                ))}
                {polygonPoints.length > 1 && (
                  <polyline points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="4" />
                )}
              </svg>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">🏠</div>
              <p className="text-sm font-black uppercase text-slate-500">Нет изображения</p>
              <p className="text-[10px] mt-2 text-slate-700">Загрузите фото для {CLASS_LABELS[houseClass] || houseClass}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-purple-600/20 text-purple-300 border border-purple-500/30 active:scale-90 flex items-center gap-2 mx-auto"
              >
                <Upload size={14} /> Загрузить изображение
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel — controls + zone list, overlaid on image */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col max-h-[45vh] bg-white/[0.02] border-t border-white/5 backdrop-blur-sm">
        {/* Controls */}
        <div className="shrink-0 p-4 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <select value={houseClass} onChange={e => handleClassChange(e.target.value)}
              className="bg-[#0a0f0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
              <optgroup label="🏡 Дома">
                <option value="economy" className="bg-[#0a0f0a] text-white">🏡 Эконом-класс</option>
                <option value="comfort" className="bg-[#0a0f0a] text-white">🏡️ Комфорт-класс</option>
                <option value="business" className="bg-[#0a0f0a] text-white">🏢 Бизнес-класс</option>
                <option value="premium" className="bg-[#0a0f0a] text-white">🏼 Премиум-класс</option>
              </optgroup>
              {Object.values(getLocationGroups()).map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.keys.map(key => (
                    <option key={key} value={key} className="bg-[#0a0f0a] text-white">{CLASS_LABELS[key] || key}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {imagesList.length > 1 && (
              <select value={selectedImage || ''} onChange={e => setSelectedImage(e.target.value)}
                className="bg-[#0a0f0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
                {imagesList.map(img => <option key={img.src} value={img.src} className="bg-[#0a0f0a] text-white">{img.src.split('/').pop()}</option>)}
              </select>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-purple-600/20 text-purple-300 border border-purple-500/30 active:scale-90 flex items-center gap-1"
              title="Загрузить изображение"
            >
              <Upload size={12} /> Загрузить
            </button>
            <button onClick={() => setMode('rect')}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase ${mode === 'rect' ? 'bg-orange-600' : 'bg-white/5'}`}>
              ⬜ Прямоугольник
            </button>
            <button onClick={() => setMode('polygon')}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase ${mode === 'polygon' ? 'bg-orange-600' : 'bg-white/5'}`}>
              🔷 Полигон
            </button>
            {mode === 'polygon' && polygonPoints.length > 0 && (
              <button onClick={finishPolygon} className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-green-600">
                ✓ Готово ({polygonPoints.length} точек)
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              {mode === 'rect' ? 'Зажмите и потяните для создания зоны' : 'Тапайте чтобы добавить точки, затем нажмите "Готово"'}
            </span>
            <div className="flex gap-2">
              <button onClick={clearAll} className="p-1.5 bg-red-600/20 rounded-lg active:scale-90" title="Очистить зоны">
                <Trash2 size={12} className="text-red-400" />
              </button>
              <button onClick={clearAllStorage} className="p-1.5 bg-red-800/30 rounded-lg active:scale-90" title="Очистить весь localStorage">
                <Trash2 size={12} className="text-red-600" />🗄️
              </button>
              <button onClick={saveToStorage} className="p-1.5 bg-blue-600/20 rounded-lg active:scale-90">
                <Save size={12} className="text-blue-400" />
              </button>
              <button onClick={exportJSON} className="p-1.5 bg-orange-600/20 rounded-lg active:scale-90">
                <Copy size={12} className="text-orange-400" />
              </button>
            </div>
          </div>
        </div>
        {/* Zone list */}
        <div className="flex-grow overflow-y-auto p-4 pt-0 space-y-1.5">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
            Зоны ({hotspots.length})
          </p>
          {hotspots.map(h => {
            const action = hotspotActions[h.id] || 'enter';
            return (
              <React.Fragment key={h.id}>
                <div key={h.id} className="flex flex-col gap-1.5 bg-white/[0.03] rounded-xl p-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-orange-400 shrink-0" />
                    <input value={hotspotNames[h.id] || h.name}
                      onChange={e => renameHotspot(h.id, e.target.value)}
                      className="flex-grow bg-transparent text-xs text-white outline-none font-black uppercase"
                      placeholder="Название зоны" />
                    <span className="text-[9px] text-slate-500 shrink-0">{h.type}</span>
                    <button onClick={() => removeHotspot(h.id)} className="p-1 text-red-400 shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 ml-5">
                    <select value={action}
                      onChange={e => setHotspotAction(h.id, e.target.value)}
                      className="bg-[#0a0f0a] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none flex-grow">
                      {(HOTSPOT_ACTIONS[houseClass] || HOTSPOT_ACTIONS.default).map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  {action === 'sublocation' && (
                    <div className="flex items-center gap-2 ml-5">
                      <span className="text-[9px] text-cyan-400 shrink-0">→</span>
                      <input value={hotspotSubNames[h.id] || ''}
                        onChange={e => setHotspotSubName(h.id, e.target.value)}
                        className="flex-grow bg-[#0a0f0a] border border-cyan-500/30 rounded-lg px-2 py-1 text-[10px] text-cyan-300 outline-none"
                        placeholder="Имя подлокации" />
                      <button
                        onClick={() => openSubLocationEditor(h.id)}
                        className="shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 active:scale-90"
                      >
                        ✏️ Редактировать
                      </button>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          {hotspots.length === 0 && (
            <p className="text-[10px] text-slate-600 text-center py-2">Нет зон — нарисуйте на изображении</p>
          )}
        </div>
      </div>

      {/* === Sublocation Editor === */}
      {editingSubLocation && (
        <div className="fixed inset-0 z-[10000] bg-[#020617] flex flex-col text-white font-sans">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-30 shrink-0 p-4 flex items-center justify-between bg-gradient-to-r from-cyan-600/20 to-transparent border-b border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button onClick={closeSubLocationEditor} className="p-2 bg-white/5 rounded-xl active:scale-90">
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-sm font-black uppercase italic">Подлокация: {editingSubLocation.subName}</h2>
                <p className="text-[10px] text-cyan-400 uppercase tracking-widest">
                  Родитель: {CLASS_LABELS[editingSubLocation.parentId] || editingSubLocation.parentId}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-xl active:scale-90">
              <X size={18} />
            </button>
          </div>

          {/* Image area */}
          <div ref={subContainerRef} className="absolute inset-0 bg-black overflow-hidden">
            {subselectedImage ? (
              <div
                className="absolute inset-0 w-full h-full cursor-crosshair select-none"
                onMouseDown={handleSubMouseDown}
                onMouseMove={handleSubMouseMove}
                onMouseUp={handleSubMouseUp}
                onTouchStart={e => handleSubMouseDown(e.touches[0])}
                onTouchMove={e => handleSubMouseMove(e.touches[0])}
                onTouchEnd={e => handleSubMouseUp(e.changedTouches[0])}
              >
                <img
                  ref={subImgRef}
                  src={subselectedImage}
                  alt="Sublocation"
                  className="absolute inset-0 w-full h-full object-fill"
                  onLoad={() => {
                    const subKey = getSubLocationKey();
                    recalcSubHotspotPositions(subKey);
                  }}
                />

                {/* Sublocation hotspot overlays */}
                {subHotspotPositions.map(h => {
                  const name = subHotspotNames[h.id] || h.name;
                  if (h.type === 'rect') {
                    return (
                      <div key={h.id}
                        className="absolute border-2 border-cyan-500 bg-cyan-500/30 rounded-lg cursor-move group"
                        style={{
                          left: `${h._left}px`,
                          top: `${h._top}px`,
                          width: `${h._width}px`,
                          height: `${h._height}px`,
                          zIndex: 20,
                        }}
                      >
                        <span className="absolute -top-6 left-0 text-[10px] font-black text-cyan-300 uppercase whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                          {name}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); removeSubHotspot(h.id); }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <X size={10} />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <svg key={h.id}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 20 }}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="pointer-events-none"
                    >
                      <polygon points={h.points} fill="rgba(6,182,212,0.2)" stroke="#06b6d4" strokeWidth="1" />
                    </svg>
                  );
                })}

                {subDrawingRect && (
                  <div
                    className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/40 rounded pointer-events-none"
                    style={{
                      left: `${subDrawingRect.x}%`,
                      top: `${subDrawingRect.y}%`,
                      width: `${subDrawingRect.w}%`,
                      height: `${subDrawingRect.h}%`,
                      zIndex: 30,
                    }}
                  />
                )}

                {subPolygonPoints.length > 0 && (
                  <svg
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', }}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none"
                  >
                    {subPolygonPoints.map((p, i) => (
                      <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="3" fill="#06b6d4" />
                    ))}
                    {subPolygonPoints.length > 1 && (
                      <polyline points={subPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4" />
                    )}
                  </svg>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">🗺️</div>
                  <p className="text-sm font-black uppercase text-slate-500">Нет изображения</p>
                  <p className="text-[10px] mt-2 text-slate-700">Загрузите фото подлокации «{editingSubLocation.subName}»</p>
                  <button
                    onClick={() => subFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 active:scale-90 flex items-center gap-2 mx-auto"
                  >
                    <Upload size={14} /> Загрузить изображение
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom panel */}
          <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col max-h-[45vh] bg-white/[0.02] border-t border-white/5 backdrop-blur-sm">
            <div className="shrink-0 p-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => subFileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 active:scale-90 flex items-center gap-1"
                >
                  <Upload size={12} /> Загрузить
                </button>
                <input
                  ref={subFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSubImageUpload}
                  className="hidden"
                />
                <button onClick={() => setSubMode('rect')}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase ${subMode === 'rect' ? 'bg-cyan-600' : 'bg-white/5'}`}>
                  ⬜ Прямоугольник
                </button>
                <button onClick={() => setSubMode('polygon')}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase ${subMode === 'polygon' ? 'bg-cyan-600' : 'bg-white/5'}`}>
                  🔷 Полигон
                </button>
                {subMode === 'polygon' && subPolygonPoints.length > 0 && (
                  <button onClick={finishSubPolygon} className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-green-600">
                    ✓ Готово ({subPolygonPoints.length} точек)
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {subMode === 'rect' ? 'Зажмите и потяните для создания зоны' : 'Тапайте чтобы добавить точки'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => saveSubHotspotsList(subHotspots[getSubLocationKey()]?.hotspots || [])} className="p-1.5 bg-blue-600/20 rounded-lg active:scale-90">
                    <Save size={12} className="text-blue-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sub hotspots list */}
            <div className="flex-grow overflow-y-auto p-4 pt-0 space-y-1.5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                Зоны подлокации ({(subHotspots[getSubLocationKey()]?.hotspots || []).length})
              </p>
              {(subHotspots[getSubLocationKey()]?.hotspots || []).map(h => {
                const action = subHotspotActions[h.id] || 'enter';
                return (
                  <React.Fragment key={h.id}>
                    <div className="flex flex-col gap-1.5 bg-white/[0.03] rounded-xl p-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-cyan-400 shrink-0" />
                        <input value={subHotspotNames[h.id] || h.name}
                          onChange={e => renameSubHotspot(h.id, e.target.value)}
                          className="flex-grow bg-transparent text-xs text-white outline-none font-black uppercase"
                          placeholder="Название зоны" />
                        <span className="text-[9px] text-slate-500 shrink-0">{h.type}</span>
                        <button onClick={() => removeSubHotspot(h.id)} className="p-1 text-red-400 shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 ml-5">
                        <select value={action}
                          onChange={e => setSubHotspotAction(h.id, e.target.value)}
                          className="bg-[#0a0f0a] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none flex-grow">
                          {(HOTSPOT_ACTIONS[editingSubLocation?.parentId] || HOTSPOT_ACTIONS.default).map(a => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                          ))}
                        </select>
                      </div>
                      {action === 'sublocation' && (
                        <div className="flex items-center gap-2 ml-5">
                          <span className="text-[9px] text-cyan-400 shrink-0">→</span>
                          <input value={subHotspotSubNames[h.id] || ''}
                            onChange={e => setSubHotspotSubName(h.id, e.target.value)}
                            className="flex-grow bg-[#0a0f0a] border border-cyan-500/30 rounded-lg px-2 py-1 text-[10px] text-cyan-300 outline-none"
                            placeholder="Имя подлокации" />
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              {(subHotspots[getSubLocationKey()]?.hotspots || []).length === 0 && (
                <p className="text-[10px] text-slate-600 text-center py-2">Нет зон — нарисуйте на изображении</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}