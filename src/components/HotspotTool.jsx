import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  X, Copy, Trash2, MapPin, Save, Upload, Plus, ZoomIn, ZoomOut,
  Maximize2, Eye, EyeOff, Check, AlertCircle, RefreshCw, Layers,
  Compass, ArrowRight, Settings2, Sparkles, Smartphone, Download
} from 'lucide-react';
import { HOUSE_PREVIEWS_MAP } from '../data/houseStyles';
import { LOCATION_IMAGES } from '../data/locationStyles';
import { LOCATIONS } from '../data/locations';

/**
 * Безопасная запись в localStorage с отловом QuotaExceededError
 */
function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert('⚠️ LocalStorage переполнен! Удалите тяжелые картинки или очистите кэш.');
      return false;
    }
    console.error(e);
    return false;
  }
}

/**
 * Сжатие загружаемых изображений для экономии памяти
 */
function compressImageBase64(base64, maxDim = 1600, quality = 0.8) {
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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

// Категории локаций
const TYPE_LABELS = {
  bank: '🏦 Банки',
  shop: '🛒 Магазины',
  clothes: '👕 Одежда',
  bar: '🍺 Бары',
  nightclub: '💃 Клубы',
  hotel: '🏨 Отели',
  gas: '⛽ АЗС',
  parking: '🅿️ Парковки',
  gym: '💪 Спорт',
  warehouse: '📦 Склады',
  atm: '🏧 Банкоматы',
  tuning: '🔧 Тюнинг',
  showroom: '🚗 Автосалон',
  driving_school: '🎓 Автошкола',
  guns: '🔫 Оружие',
  gun_range: '🎯 Стрелковые',
  job: '💼 Работа',
  public: '🏛️ Общественные',
  bus_depot: '🚌 Транспорт',
};

// Единый словарь всех локаций и классов
const ALL_CLASSES = {
  economy: HOUSE_PREVIEWS_MAP?.economy || { label: '🏠 Эконом' },
  comfort: HOUSE_PREVIEWS_MAP?.comfort || { label: '🏠 Комфорт' },
  business: HOUSE_PREVIEWS_MAP?.business || { label: '🏠 Бизнес' },
  premium: HOUSE_PREVIEWS_MAP?.premium || { label: '🏠 Премиум' },
  ...LOCATION_IMAGES,
};

LOCATIONS?.forEach(loc => {
  if (loc.type === 'house' || ALL_CLASSES[loc.id]) return;
  const src = `/locations/${loc.id}.webp`;
  ALL_CLASSES[loc.id] = {
    label: (loc.icon || '📍') + ' ' + (loc.name || loc.id),
    images: [{ id: 1, src }],
    default: src,
  };
});

const CLASS_LABELS = {
  economy: '🏠 Дом: Эконом',
  comfort: '🏠 Дом: Комфорт',
  business: '🏠 Дом: Бизнес',
  premium: '🏠 Дом: Премиум',
  ...Object.entries(LOCATION_IMAGES || {}).reduce((acc, [k, v]) => {
    acc[k] = v.label || k;
    return acc;
  }, {}),
};

LOCATIONS?.forEach(loc => {
  if (loc.type !== 'house' && !CLASS_LABELS[loc.id]) {
    CLASS_LABELS[loc.id] = (loc.icon || '📍') + ' ' + (loc.name || loc.id);
  }
});

// Действия по умолчанию для хотспотов
const DEFAULT_HOTSPOT_ACTIONS = [
  { value: 'enter', label: '🚪 Войти в здание / интерьер' },
  { value: 'buy_business', label: '💼 Купить бизнес / инфо' },
  { value: 'atm', label: '🏧 Использовать банкомат' },
  { value: 'garage', label: '🅿️ Зайти в гараж' },
  { value: 'sublocation', label: '📍 Перейти в подуровень' },
  { value: 'open_hotel', label: '🛏️ Меню отеля' },
  { value: 'refuel', label: '⛽ Заправиться' },
  { value: 'coming_soon', label: '🚧 Скоро открытие' },
];

export default function HotspotTool({ onClose, onExport }) {
  // Выбранная локация
  const [selectedLocId, setSelectedLocId] = useState(() => {
    return localStorage.getItem('hotspot_tool_last_class') || 'bank_1';
  });

  const [activeImageSrc, setActiveImageSrc] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 1280, height: 720 });
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);

  // Режимы редактирования
  const [toolMode, setToolMode] = useState('select'); // 'select' | 'draw' | 'pan'
  const [showTwaFrame, setShowTwaFrame] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);

  // Камера: панорамирование и зум
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Рисование нового хотспота
  const [drawBox, setDrawBox] = useState(null); // { startX, startY, currentX, currentY } in image px
  const isDrawingRef = useRef(false);

  // Манипуляция хотспотом (Drag / Resize)
  const [transforming, setTransforming] = useState(null); // { type: 'move'|'resize', handle?: string, startPointer: {x,y}, origBox: {} }

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const stageViewportRef = useRef(null);
  const fileInputRef = useRef(null);

  // Загрузка локации и хотспотов
  useEffect(() => {
    localStorage.setItem('hotspot_tool_last_class', selectedLocId);

    // 1. Пытаемся взять сохраненный прогресс из localStorage
    const saved = localStorage.getItem(`hotspot_tool_${selectedLocId}`);
    let img = null;
    let loadedHotspots = [];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.default) img = parsed.default;
        else if (parsed?.images?.[0]?.src) img = parsed.images[0].src;

        if (Array.isArray(parsed)) loadedHotspots = parsed;
        else if (Array.isArray(parsed?.hotspots)) loadedHotspots = parsed.hotspots;
      } catch (e) {
        console.error('Failed to parse saved hotspots', e);
      }
    }

    // 2. Дефолтная картинка из конфига
    if (!img) {
      const locData = ALL_CLASSES[selectedLocId];
      img = locData?.default || locData?.images?.[0]?.src || `/locations/${selectedLocId}.webp`;
    }

    setActiveImageSrc(img);
    setSelectedHotspotId(null);

    // Загрузка картинки для определения реального разрешения
    const tester = new Image();
    tester.onload = () => {
      const nw = tester.naturalWidth || 1280;
      const nh = tester.naturalHeight || 720;
      setNaturalSize({ width: nw, height: nh });

      // Преобразуем хотспоты из % в локальные пиксели для точного редактирования
      const converted = loadedHotspots.map((h, index) => {
        const x = (h.x != null ? (h.x / 100) * nw : 50);
        const y = (h.y != null ? (h.y / 100) * nh : 50);
        const w = (h.w != null ? (h.w / 100) * nw : 120);
        const hVal = (h.h != null ? (h.h / 100) * nh : 80);
        return {
          id: h.id || `hs_${Date.now()}_${index}`,
          label: h.label || 'Зона',
          action: h.action || 'enter',
          subLocation: h.subLocation || '',
          x,
          y,
          w,
          h: hVal,
          type: 'rect',
        };
      });
      setHotspots(converted);

      // Сброс камеры по центру
      setPan({ x: 0, y: 0 });
      setZoom(1);
    };
    tester.onerror = () => {
      setNaturalSize({ width: 1280, height: 720 });
      setHotspots([]);
    };
    tester.src = img;
  }, [selectedLocId]);

  // Конвертация экранных координат мыши в пиксели изображения
  const getPointerImageCoords = useCallback((clientX, clientY) => {
    if (!stageViewportRef.current) return { x: 0, y: 0 };
    const rect = stageViewportRef.current.getBoundingClientRect();
    const stageCenterX = rect.width / 2;
    const stageCenterY = rect.height / 2;

    const screenOffsetX = clientX - rect.left;
    const screenOffsetY = clientY - rect.top;

    // Реверс формулы трансформации:
    // screenX = stageCenterX + pan.x + (imgX - naturalSize.width / 2) * zoom
    const imgX = (screenOffsetX - stageCenterX - pan.x) / zoom + naturalSize.width / 2;
    const imgY = (screenOffsetY - stageCenterY - pan.y) / zoom + naturalSize.height / 2;

    return {
      x: Math.max(0, Math.min(naturalSize.width, imgX)),
      y: Math.max(0, Math.min(naturalSize.height, imgY)),
    };
  }, [pan, zoom, naturalSize]);

  // Обработчики колесика зума
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.25), 4));
  };

  // Начало взаимодействия с холстом
  const handleStagePointerDown = (e) => {
    // Средняя кнопка мыши или режим панорамы — скроллим камеру
    if (e.button === 1 || toolMode === 'pan' || e.altKey || e.spaceKey) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (toolMode === 'draw') {
      const coords = getPointerImageCoords(e.clientX, e.clientY);
      isDrawingRef.current = true;
      setDrawBox({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      return;
    }

    // Если кликнули в пустую область — сбрасываем выделение
    if (e.target === stageViewportRef.current || e.target.tagName === 'IMG') {
      setSelectedHotspotId(null);
    }
  };

  // Перемещение курсора по сцене
  const handleStagePointerMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (isDrawingRef.current && drawBox) {
      const coords = getPointerImageCoords(e.clientX, e.clientY);
      setDrawBox((prev) => ({
        ...prev,
        currentX: coords.x,
        currentY: coords.y,
      }));
      return;
    }

    if (transforming) {
      const { type, handle, origBox, startPointer } = transforming;
      const currentPointer = getPointerImageCoords(e.clientX, e.clientY);
      const dx = currentPointer.x - startPointer.x;
      const dy = currentPointer.y - startPointer.y;

      setHotspots((prev) =>
        prev.map((h) => {
          if (h.id !== selectedHotspotId) return h;

          if (type === 'move') {
            const nextX = Math.max(0, Math.min(naturalSize.width - origBox.w, origBox.x + dx));
            const nextY = Math.max(0, Math.min(naturalSize.height - origBox.h, origBox.y + dy));
            return { ...h, x: nextX, y: nextY };
          }

          if (type === 'resize') {
            let newX = origBox.x;
            let newY = origBox.y;
            let newW = origBox.w;
            let newH = origBox.h;

            if (handle.includes('e')) newW = Math.max(30, origBox.w + dx);
            if (handle.includes('s')) newH = Math.max(30, origBox.h + dy);
            if (handle.includes('w')) {
              const proposedW = origBox.w - dx;
              if (proposedW >= 30) {
                newX = origBox.x + dx;
                newW = proposedW;
              }
            }
            if (handle.includes('n')) {
              const proposedH = origBox.h - dy;
              if (proposedH >= 30) {
                newY = origBox.y + dy;
                newH = proposedH;
              }
            }
            return { ...h, x: newX, y: newY, w: newW, h: newH };
          }
          return h;
        })
      );
    }
  };

  // Завершение клика/перетаскивания
  const handleStagePointerUp = () => {
    setIsPanning(false);

    if (isDrawingRef.current && drawBox) {
      isDrawingRef.current = false;
      const x = Math.min(drawBox.startX, drawBox.currentX);
      const y = Math.min(drawBox.startY, drawBox.currentY);
      const w = Math.abs(drawBox.currentX - drawBox.startX);
      const h = Math.abs(drawBox.currentY - drawBox.startY);

      if (w > 15 && h > 15) {
        const newHs = {
          id: `hotspot_${Date.now()}`,
          label: 'Новая зона',
          action: 'enter',
          subLocation: '',
          x,
          y,
          w,
          h,
          type: 'rect',
        };
        setHotspots((prev) => [...prev, newHs]);
        setSelectedHotspotId(newHs.id);
        setToolMode('select');
        showToast('Зона создана!');
      }
      setDrawBox(null);
    }

    if (transforming) {
      setTransforming(null);
    }
  };

  // Старт Drag для хотспота
  const startDragHotspot = (e, hs) => {
    e.stopPropagation();
    setSelectedHotspotId(hs.id);
    const pointer = getPointerImageCoords(e.clientX, e.clientY);
    setTransforming({
      type: 'move',
      startPointer: pointer,
      origBox: { x: hs.x, y: hs.y, w: hs.w, h: hs.h },
    });
  };

  // Старт Resize за угол
  const startResizeHotspot = (e, hs, handle) => {
    e.stopPropagation();
    setSelectedHotspotId(hs.id);
    const pointer = getPointerImageCoords(e.clientX, e.clientY);
    setTransforming({
      type: 'resize',
      handle,
      startPointer: pointer,
      origBox: { x: hs.x, y: hs.y, w: hs.w, h: hs.h },
    });
  };

  // Дублирование зоны
  const duplicateHotspot = (hs) => {
    const dup = {
      ...hs,
      id: `hs_${Date.now()}`,
      label: `${hs.label} (Копия)`,
      x: Math.min(naturalSize.width - hs.w, hs.x + 30),
      y: Math.min(naturalSize.height - hs.h, hs.y + 30),
    };
    setHotspots((prev) => [...prev, dup]);
    setSelectedHotspotId(dup.id);
    showToast('Слой продублирован');
  };

  // Удаление зоны
  const deleteHotspot = (id) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    if (selectedHotspotId === id) setSelectedHotspotId(null);
    showToast('Зона удалена');
  };

  // Сохранение в SAMP LocalStorage
  const handleSaveToStorage = () => {
    // Переводим обратно в проценты для идеальной совместимости с LocationView.jsx
    const normalized = hotspots.map((hs) => ({
      id: hs.id,
      type: 'rect',
      label: hs.label,
      action: hs.action,
      subLocation: hs.subLocation || undefined,
      x: Number(((hs.x / naturalSize.width) * 100).toFixed(3)),
      y: Number(((hs.y / naturalSize.height) * 100).toFixed(3)),
      w: Number(((hs.w / naturalSize.width) * 100).toFixed(3)),
      h: Number(((hs.h / naturalSize.height) * 100).toFixed(3)),
    }));

    const payload = {
      default: activeImageSrc,
      hotspots: normalized,
      updatedAt: new Date().toISOString(),
    };

    const ok = safeLocalStorageSet(`hotspot_tool_${selectedLocId}`, JSON.stringify(payload));
    if (ok) {
      showToast('💾 Сохранено для игры!');
      if (onExport) onExport(payload);
    }
  };

  // Экспорт готового JS-конфига для locationStyles.js
  const handleCopyCode = () => {
    const normalized = hotspots.map((hs) => ({
      id: hs.id,
      type: 'rect',
      x: Number(((hs.x / naturalSize.width) * 100).toFixed(2)),
      y: Number(((hs.y / naturalSize.height) * 100).toFixed(2)),
      w: Number(((hs.w / naturalSize.width) * 100).toFixed(2)),
      h: Number(((hs.h / naturalSize.height) * 100).toFixed(2)),
      action: hs.action,
      label: hs.label,
      ...(hs.subLocation ? { subLocation: hs.subLocation } : {}),
    }));

    const snippet = `// Код для src/data/locationStyles.js:\n'${selectedLocId}': {\n  1: ${JSON.stringify(normalized, null, 4)}\n},`;
    navigator.clipboard.writeText(snippet);
    showToast('📋 Код скопирован в буфер!');
  };

  // Загрузка пользовательской картинки/панорамы
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawBase64 = ev.target.result;
      const compressed = await compressImageBase64(rawBase64);
      setActiveImageSrc(compressed);

      const t = new Image();
      t.onload = () => {
        setNaturalSize({ width: t.naturalWidth, height: t.naturalHeight });
        setPan({ x: 0, y: 0 });
        setZoom(1);
        showToast('🖼️ Картинка обновлена!');
      };
      t.src = compressed;
    };
    reader.readAsDataURL(file);
  };

  const selectedHotspot = useMemo(
    () => hotspots.find((h) => h.id === selectedHotspotId),
    [hotspots, selectedHotspotId]
  );

  return (
    <div className="fixed inset-0 z-[400] bg-[#090d16] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs tracking-wide animate-fade-in">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Верхняя панель инструментов */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800/80 px-4 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Compass size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              SAMP Hotspot Studio
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRO 60FPS
              </span>
            </h1>
          </div>

          {/* Селектор локаций */}
          <div className="ml-4 flex items-center gap-2">
            <select
              value={selectedLocId}
              onChange={(e) => setSelectedLocId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 max-w-[220px] truncate"
            >
              <optgroup label="🏠 Недвижимость">
                <option value="economy">Эконом дом</option>
                <option value="comfort">Комфорт дом</option>
                <option value="business">Бизнес дом</option>
                <option value="premium">Премиум дом</option>
              </optgroup>
              <optgroup label="📍 Локации штата">
                {Object.keys(CLASS_LABELS).filter(k => !['economy', 'comfort', 'business', 'premium'].includes(k)).map(k => (
                  <option key={k} value={k}>
                    {CLASS_LABELS[k]}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Быстрые переключатели режима */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 gap-1">
          <button
            onClick={() => setToolMode('select')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'select' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
            title="Выбор и перемещение зон"
          >
            <Settings2 size={14} />
            Выбор
          </button>
          <button
            onClick={() => setToolMode('draw')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'draw' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
            title="Нарисовать новую интерактивную зону"
          >
            <Plus size={14} />
            Создать зону
          </button>
          <button
            onClick={() => setToolMode('pan')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'pan' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
            title="Свободное перемещение камеры"
          >
            <Maximize2 size={14} />
            Панорама
          </button>
        </div>

        {/* Действия сохранения и экспорта */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Загрузить свою картинку для локации"
          >
            <Upload size={16} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => setShowTwaFrame((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showTwaFrame ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Симулятор экрана смартфона Telegram Mini App"
          >
            <Smartphone size={15} />
            TWA 390px
          </button>

          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Скопировать JS-код для вставки в locationStyles.js"
          >
            <Download size={14} />
            Экспорт кода
          </button>

          <button
            onClick={handleSaveToStorage}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
          >
            <Save size={14} />
            Сохранить
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 ml-2"
              title="Закрыть редактор"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Основная рабочая область */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Интерактивный холст панорамы */}
        <div
          ref={stageViewportRef}
          onWheel={handleWheel}
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
          className={`flex-1 relative bg-[#040711] overflow-hidden flex items-center justify-center ${
            toolMode === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : toolMode === 'draw' ? 'cursor-crosshair' : 'cursor-default'
          }`}
        >
          {/* Сетка холста */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Трансформируемый контейнер сцены */}
          <div
            style={{
              width: naturalSize.width,
              height: naturalSize.height,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning || transforming || isDrawingRef.current ? 'none' : 'transform 0.08s ease-out',
            }}
            className="relative shadow-2xl border border-slate-700/50 bg-slate-950/80 shrink-0"
          >
            {/* Фоновое изображение */}
            {activeImageSrc && (
              <img
                src={activeImageSrc}
                alt="Panorama Location"
                draggable={false}
                className="w-full h-full object-cover block pointer-events-none"
              />
            )}

            {/* Отрисовка размеченных хотспотов */}
            {showOverlays &&
              hotspots.map((hs) => {
                const isSelected = hs.id === selectedHotspotId;
                return (
                  <div
                    key={hs.id}
                    onPointerDown={(e) => startDragHotspot(e, hs)}
                    style={{
                      left: hs.x,
                      top: hs.y,
                      width: hs.w,
                      height: hs.h,
                    }}
                    className={`absolute rounded-xl transition-shadow cursor-move flex flex-col items-center justify-center border-2 ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/25 shadow-2xl shadow-emerald-500/40 z-20'
                        : 'border-cyan-400/80 bg-cyan-500/15 hover:border-cyan-300 hover:bg-cyan-500/25 z-10'
                    }`}
                  >
                    {/* Плашка действия */}
                    <div className="pointer-events-none px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 text-center max-w-[90%] truncate shadow-lg">
                      <div className="text-[11px] font-black text-white uppercase tracking-wider truncate">
                        {hs.label}
                      </div>
                      <div className="text-[9px] font-mono text-emerald-400 font-bold lowercase">
                        {hs.action}
                      </div>
                    </div>

                    {/* Манипуляторы ресайза (только у выбранного) */}
                    {isSelected && (
                      <>
                        <div
                          onPointerDown={(e) => startResizeHotspot(e, hs, 'nw')}
                          className="absolute -top-2 -left-2 w-4 h-4 bg-emerald-400 border-2 border-slate-950 rounded cursor-nwse-resize shadow"
                        />
                        <div
                          onPointerDown={(e) => startResizeHotspot(e, hs, 'ne')}
                          className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400 border-2 border-slate-950 rounded cursor-nesw-resize shadow"
                        />
                        <div
                          onPointerDown={(e) => startResizeHotspot(e, hs, 'sw')}
                          className="absolute -bottom-2 -left-2 w-4 h-4 bg-emerald-400 border-2 border-slate-950 rounded cursor-nesw-resize shadow"
                        />
                        <div
                          onPointerDown={(e) => startResizeHotspot(e, hs, 'se')}
                          className="absolute -bottom-2 -right-2 w-4 h-4 bg-emerald-400 border-2 border-slate-950 rounded cursor-nwse-resize shadow"
                        />
                      </>
                    )}
                  </div>
                );
              })}

            {/* Бокс рисования новой зоны */}
            {drawBox && (
              <div
                style={{
                  left: Math.min(drawBox.startX, drawBox.currentX),
                  top: Math.min(drawBox.startY, drawBox.currentY),
                  width: Math.abs(drawBox.currentX - drawBox.startX),
                  height: Math.abs(drawBox.currentY - drawBox.startY),
                }}
                className="absolute border-2 border-dashed border-emerald-400 bg-emerald-500/20 rounded-xl pointer-events-none z-30"
              />
            )}
          </div>

          {/* TWA Frame Overlay (390 x 720 экран смартфона) */}
          {showTwaFrame && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40">
              <div className="w-[390px] h-[720px] rounded-[42px] border-4 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(3,7,18,0.75)] flex flex-col justify-between p-4 relative">
                <div className="w-32 h-4 bg-slate-900 mx-auto rounded-full" />
                <div className="text-center">
                  <span className="bg-black/80 text-emerald-400 text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-emerald-500/40">
                    Telegram Web App 390×720
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Нижняя панель зума на холсте */}
          <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 backdrop-blur-md shadow-xl">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
              title="Отдалить"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono font-bold w-12 text-center text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.15))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
              title="Приблизить"
            >
              <ZoomIn size={16} />
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <button
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 text-xs"
              title="Сбросить камеру"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowOverlays((v) => !v)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
              title="Показать / скрыть оверлеи зон"
            >
              {showOverlays ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>

        {/* Правый сайдбар: Инспектор выбранного хотспота */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-30 shrink-0">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} />
              Слои и хотспоты ({hotspots.length})
            </h2>
          </div>

          {/* Список зон */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-56 border-b border-slate-800">
            {hotspots.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Нет зон. Нажмите <br />
                <span className="text-emerald-400 font-bold">«Создать зону»</span>
              </div>
            ) : (
              hotspots.map((hs) => (
                <div
                  key={hs.id}
                  onClick={() => setSelectedHotspotId(hs.id)}
                  className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer border transition-all ${
                    hs.id === selectedHotspotId
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-sm'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin size={13} className={hs.id === selectedHotspotId ? 'text-emerald-400' : 'text-slate-500'} />
                    <span className="font-semibold truncate">{hs.label || 'Без названия'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateHotspot(hs);
                      }}
                      className="p-1 hover:text-white text-slate-400"
                      title="Дублировать"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHotspot(hs.id);
                      }}
                      className="p-1 hover:text-rose-400 text-slate-400"
                      title="Удалить"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Инспектор параметров выбранного хотспота */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedHotspot ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Параметры зоны
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">ID: {selectedHotspot.id}</span>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Название на кнопке:
                  </label>
                  <input
                    type="text"
                    value={selectedHotspot.label}
                    onChange={(e) =>
                      setHotspots((prev) =>
                        prev.map((h) =>
                          h.id === selectedHotspot.id ? { ...h, label: e.target.value } : h
                        )
                      )
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Игровое действие (action):
                  </label>
                  <select
                    value={selectedHotspot.action}
                    onChange={(e) =>
                      setHotspots((prev) =>
                        prev.map((h) =>
                          h.id === selectedHotspot.id ? { ...h, action: e.target.value } : h
                        )
                      )
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {DEFAULT_HOTSPOT_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label} ({a.value})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedHotspot.action === 'sublocation' && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Ключ подлокации (sublocation key):
                    </label>
                    <input
                      type="text"
                      placeholder="interior_hall, garage_1..."
                      value={selectedHotspot.subLocation || ''}
                      onChange={(e) =>
                        setHotspots((prev) =>
                          prev.map((h) =>
                            h.id === selectedHotspot.id ? { ...h, subLocation: e.target.value } : h
                          )
                        )
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Координаты */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Геометрия зоны
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-800/70 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-slate-500 text-[10px] block">X (%):</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {((selectedHotspot.x / naturalSize.width) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-slate-800/70 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-slate-500 text-[10px] block">Y (%):</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {((selectedHotspot.y / naturalSize.height) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-slate-800/70 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-slate-500 text-[10px] block">Ширина (%):</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {((selectedHotspot.w / naturalSize.width) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-slate-800/70 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-slate-500 text-[10px] block">Высота (%):</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {((selectedHotspot.h / naturalSize.height) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => duplicateHotspot(selectedHotspot)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy size={13} />
                    Дубликат
                  </button>
                  <button
                    onClick={() => deleteHotspot(selectedHotspot.id)}
                    className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                Выберите зону на холсте или в списке слоев для редактирования
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}