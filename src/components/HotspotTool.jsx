import { LOCATION_AUDIO_TRACKS } from '../data/audioTracks';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  X, Copy, Trash2, MapPin, Save, Upload, Plus, ZoomIn, ZoomOut,
  Maximize2, Eye, EyeOff, Check, AlertCircle, RefreshCw, Layers,
  Compass, ArrowRight, ArrowLeft, Settings2, Sparkles, Smartphone, Download,
  Sliders, PlusCircle, Music, Play, Square, Volume2
} from 'lucide-react';
import { HOUSE_PREVIEWS_MAP } from '../data/houseStyles';
import { LOCATION_IMAGES } from '../data/locationStyles';
import { LOCATIONS } from '../data/locations';
import { getActionsForCategory, getLocationCategory } from '../data/locationActions';

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
    img.src = base64;
  });
}

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

export default function HotspotTool({ onClose, onExport }) {
  const [selectedLocId, setSelectedLocId] = useState(() => {
    return localStorage.getItem('hotspot_tool_last_class') || 'economy';
  });

  // РЕЖИМ ПОДЛОКАЦИИ: { parentId, subName } или null
  const [editingSubLocation, setEditingSubLocation] = useState(null);

  // ПОЛЬЗОВАТЕЛЬСКИЕ ДЕЙСТВИЯ (КАСТОМИЗАЦИЯ ДЛЯ ЛОКАЦИЙ)
  const [customActionsMap, setCustomActionsMap] = useState(() => {
    try {
      const saved = localStorage.getItem('hotspot_tool_custom_actions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isManagingActions, setIsManagingActions] = useState(false);
  const [newActionCode, setNewActionCode] = useState('');
  const [newActionLabel, setNewActionLabel] = useState('');

  const [activeImageSrc, setActiveImageSrc] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 1280, height: 720 });
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);

  const [toolMode, setToolMode] = useState('select'); // 'select' | 'draw' | 'pan'
  const [showTwaFrame, setShowTwaFrame] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const [drawBox, setDrawBox] = useState(null);
  const isDrawingRef = useRef(false);
  const [transforming, setTransforming] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);
  const [activeMusic, setActiveMusic] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef(null);
  const musicInputRef = useRef(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const stageViewportRef = useRef(null);
  const fileInputRef = useRef(null);

  // ОПРЕДЕЛЕНИЕ РОДИТЕЛЬСКОГО ID ЛОКАЦИИ (для наследования действий в подлокациях)
  const effectiveParentId = editingSubLocation ? editingSubLocation.parentId : selectedLocId;

  // СПИСОК ДОСТУПНЫХ ДЕЙСТВИЙ: ВСЕГДА ВКЛЮЧАЕТ ДЕЙСТВИЯ РОДИТЕЛЬСКОЙ ЛОКАЦИИ
  const currentAvailableActions = useMemo(() => {
    const base = getActionsForCategory(effectiveParentId);
    const category = getLocationCategory(effectiveParentId);

    // В подлокациях первой опцией ставим "Назад / Выход"
    const subNavActions = editingSubLocation
      ? [{ value: 'exit', label: '⬅ Назад / Выход' }]
      : [];

    const customForLoc = customActionsMap[effectiveParentId] || [];
    const customForCat = customActionsMap[category] || [];

    const map = new Map();
    // Включаем навигацию, базу родительской локации (кухня, гараж, шкаф и т.д.) и все кастомные действия
    [...subNavActions, ...base, ...customForCat, ...customForLoc].forEach((item) => {
      map.set(item.value, item);
    });
    return Array.from(map.values());
  }, [effectiveParentId, editingSubLocation, customActionsMap]);

  // Добавление кастомного действия (привязывается к родительской локации)
  const handleAddCustomAction = () => {
    if (!newActionCode.trim() || !newActionLabel.trim()) {
      alert('Укажите ID действия (на английском) и отображаемое название!');
      return;
    }
    const item = { value: newActionCode.trim().toLowerCase(), label: newActionLabel.trim() };

    setCustomActionsMap((prev) => {
      const currentList = prev[effectiveParentId] || [];
      const updated = { ...prev, [effectiveParentId]: [...currentList.filter((a) => a.value !== item.value), item] };
      safeLocalStorageSet('hotspot_tool_custom_actions', JSON.stringify(updated));
      return updated;
    });

    setNewActionCode('');
    setNewActionLabel('');
    showToast(`✅ Действие "${item.label}" добавлено для всех комнат!`);
  };

  const handleRemoveCustomAction = (valToRemove) => {
    setCustomActionsMap((prev) => {
      const currentList = prev[effectiveParentId] || [];
      const updated = { ...prev, [effectiveParentId]: currentList.filter((a) => a.value !== valToRemove) };
      safeLocalStorageSet('hotspot_tool_custom_actions', JSON.stringify(updated));
      return updated;
    });
    showToast('Действие удалено');
  };

  // ЗАГРУЗКА ДАННЫХ
  useEffect(() => {
    if (editingSubLocation) {
      const subKey = `${editingSubLocation.parentId}__${editingSubLocation.subName}`;
      let loadedImg = null;
      let loadedHs = [];

      const savedSubs = localStorage.getItem('hotspot_tool_sublocations');
      if (savedSubs) {
        try {
          const parsed = JSON.parse(savedSubs);
          if (parsed[subKey]) {
            loadedImg = parsed[subKey].image || parsed[subKey].default;
            loadedHs = parsed[subKey].hotspots || [];
          }
        } catch (e) {}
      }

      setActiveImageSrc(loadedImg);
      setActiveMusic(subMusic);
      setMusicVolume(subVol);
      setSelectedHotspotId(null);

      const tester = new Image();
      tester.onload = () => {
        const nw = tester.naturalWidth || 1280;
        const nh = tester.naturalHeight || 720;
        setNaturalSize({ width: nw, height: nh });

        const converted = (loadedHs || []).map((h, idx) => ({
          id: h.id || `sub_hs_${Date.now()}_${idx}`,
          label: h.label || 'Назад',
          action: h.action || 'exit',
          subLocation: h.subLocation || '',
          x: h.x != null ? (h.x / 100) * nw : 50,
          y: h.y != null ? (h.y / 100) * nh : 50,
          w: h.w != null ? (h.w / 100) * nw : 120,
          h: h.h != null ? (h.h / 100) * nh : 80,
          type: 'rect',
        }));
        setHotspots(converted);
        setPan({ x: 0, y: 0 });
        setZoom(1);
      };
      tester.onerror = () => {
        setNaturalSize({ width: 1280, height: 720 });
        setHotspots([]);
      };
      if (loadedImg) tester.src = loadedImg;
      else {
        setNaturalSize({ width: 1280, height: 720 });
        setHotspots([]);
      }
      return;
    }

    localStorage.setItem('hotspot_tool_last_class', selectedLocId);
    const saved = localStorage.getItem(`hotspot_tool_${selectedLocId}`);
    let img = null;
    let loadedHotspots = [];
    let locMusic = '';
    let locVol = 0.5;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.default) img = parsed.default;
        else if (parsed?.images?.[0]?.src) img = parsed.images[0].src;
        locMusic = parsed?.bgMusic || '';
        locVol = parsed?.musicVolume ?? 0.5;

        if (Array.isArray(parsed)) loadedHotspots = parsed;
        else if (Array.isArray(parsed?.hotspots)) loadedHotspots = parsed.hotspots;
      } catch (e) {}
    }

    if (!img) {
      const locData = ALL_CLASSES[selectedLocId];
      img = locData?.default || locData?.images?.[0]?.src || `/locations/${selectedLocId}.webp`;
    }

    setActiveImageSrc(img);
    setActiveMusic(locMusic);
    setMusicVolume(locVol);
    setSelectedHotspotId(null);

    const tester = new Image();
    tester.onload = () => {
      const nw = tester.naturalWidth || 1280;
      const nh = tester.naturalHeight || 720;
      setNaturalSize({ width: nw, height: nh });

      const converted = loadedHotspots.map((h, index) => ({
        id: h.id || `hs_${Date.now()}_${index}`,
        label: h.label || 'Зона',
        action: h.action || 'enter',
        subLocation: h.subLocation || '',
        x: h.x != null ? (h.x / 100) * nw : 50,
        y: h.y != null ? (h.y / 100) * nh : 50,
        w: h.w != null ? (h.w / 100) * nw : 120,
        h: h.h != null ? (h.h / 100) * nh : 80,
        type: 'rect',
      }));
      setHotspots(converted);
      setPan({ x: 0, y: 0 });
      setZoom(1);
    };
    tester.onerror = () => {
      setNaturalSize({ width: 1280, height: 720 });
      setHotspots([]);
    };
    tester.src = img;
  }, [selectedLocId, editingSubLocation]);

  // Координаты мыши
  const getPointerImageCoords = useCallback((clientX, clientY) => {
    if (!stageViewportRef.current) return { x: 0, y: 0 };
    const rect = stageViewportRef.current.getBoundingClientRect();
    const stageCenterX = rect.width / 2;
    const stageCenterY = rect.height / 2;
    const screenOffsetX = clientX - rect.left;
    const screenOffsetY = clientY - rect.top;

    const imgX = (screenOffsetX - stageCenterX - pan.x) / zoom + naturalSize.width / 2;
    const imgY = (screenOffsetY - stageCenterY - pan.y) / zoom + naturalSize.height / 2;

    return {
      x: Math.max(0, Math.min(naturalSize.width, imgX)),
      y: Math.max(0, Math.min(naturalSize.height, imgY)),
    };
  }, [pan, zoom, naturalSize]);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.25), 4));
  };

  const handleStagePointerDown = (e) => {
    if (e.target !== stageViewportRef.current && !e.target.dataset.stageBackground) return;

    if (toolMode === 'pan' || e.button === 1 || e.altKey) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (toolMode === 'draw') {
      const coords = getPointerImageCoords(e.clientX, e.clientY);
      isDrawingRef.current = true;
      setDrawBox({ startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y });
      return;
    }

    if (toolMode === 'select') {
      setSelectedHotspotId(null);
    }
  };

  const handleStagePointerMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
      return;
    }

    if (isDrawingRef.current && drawBox) {
      const coords = getPointerImageCoords(e.clientX, e.clientY);
      setDrawBox((prev) => ({ ...prev, currentX: coords.x, currentY: coords.y }));
      return;
    }

    if (transforming) {
      const { type, handle, origBox, startPointer } = transforming;
      const dx = (e.clientX - startPointer.x) / zoom;
      const dy = (e.clientY - startPointer.y) / zoom;

      setHotspots((prev) =>
        prev.map((h) => {
          if (h.id !== origBox.id) return h;
          if (type === 'move') {
            return {
              ...h,
              x: Math.max(0, Math.min(naturalSize.width - origBox.w, origBox.x + dx)),
              y: Math.max(0, Math.min(naturalSize.height - origBox.h, origBox.y + dy)),
            };
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

  const handleStagePointerUp = () => {
    if (isPanning) setIsPanning(false);

    if (isDrawingRef.current && drawBox) {
      isDrawingRef.current = false;
      const x = Math.min(drawBox.startX, drawBox.currentX);
      const y = Math.min(drawBox.startY, drawBox.currentY);
      const w = Math.abs(drawBox.currentX - drawBox.startX);
      const h = Math.abs(drawBox.currentY - drawBox.startY);

      if (w > 15 && h > 15) {
        const defaultAction = editingSubLocation ? 'exit' : (currentAvailableActions[0]?.value || 'enter');
        const defaultLabel = editingSubLocation ? 'Назад' : 'Новая зона';

        const newHs = {
          id: `hotspot_${Date.now()}`,
          type: 'rect',
          label: defaultLabel,
          action: defaultAction,
          subLocation: '',
          x,
          y,
          w,
          h,
        };
        setHotspots((prev) => [...prev, newHs]);
        setSelectedHotspotId(newHs.id);
        setToolMode('select');
        showToast('Зона создана!');
      }
      setDrawBox(null);
    }

    if (transforming) setTransforming(null);
  };

  const startMoveHotspot = (e, hs) => {
    e.stopPropagation();
    if (toolMode !== 'select') return;
    setSelectedHotspotId(hs.id);
    setTransforming({
      type: 'move',
      origBox: { ...hs },
      startPointer: { x: e.clientX, y: e.clientY },
    });
  };

  const startResizeHotspot = (e, hs, handle) => {
    e.stopPropagation();
    setSelectedHotspotId(hs.id);
    setTransforming({
      type: 'resize',
      handle,
      origBox: { ...hs },
      startPointer: { x: e.clientX, y: e.clientY },
    });
  };

  const updateSelectedHotspot = (patch) => {
    setHotspots((prev) => prev.map((h) => (h.id === selectedHotspotId ? { ...h, ...patch } : h)));
  };

  const deleteHotspot = (id) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    if (selectedHotspotId === id) setSelectedHotspotId(null);
    showToast('Зона удалена');
  };

  // СОХРАНЕНИЕ
  const handleSave = async () => {
    const normalized = hotspots.map((hs) => ({
      id: hs.id,
      type: 'rect',
      label: hs.label,
      action: hs.action,
      ...(hs.subLocation ? { subLocation: hs.subLocation } : {}),
      x: Number(((hs.x / naturalSize.width) * 100).toFixed(3)),
      y: Number(((hs.y / naturalSize.height) * 100).toFixed(3)),
      w: Number(((hs.w / naturalSize.width) * 100).toFixed(3)),
      h: Number(((hs.h / naturalSize.height) * 100).toFixed(3)),
    }));

    if (editingSubLocation) {
      const subKey = `${editingSubLocation.parentId}__${editingSubLocation.subName}`;
      const payload = {
        image: activeImageSrc,
        label: editingSubLocation.subName,
        bgMusic: activeMusic,
        musicVolume: Number(musicVolume),
        hotspots: normalized,
        updatedAt: new Date().toISOString(),
      };

      let currentSubs = {};
      try {
        currentSubs = JSON.parse(localStorage.getItem('hotspot_tool_sublocations') || '{}');
      } catch (e) {}
      currentSubs[subKey] = payload;
      safeLocalStorageSet('hotspot_tool_sublocations', JSON.stringify(currentSubs));

      try {
        const res = await fetch('/api/save-hotspots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: subKey, payload }),
        });
        if (res.ok) {
          showToast(`💾 Подлокация «${editingSubLocation.subName}» сохранена на диск!`);
          return;
        }
      } catch (e) {}

      showToast(`💾 Подлокация сохранена в браузере!`);
      return;
    }

    const payload = {
      default: activeImageSrc,
      bgMusic: activeMusic,
      musicVolume: Number(musicVolume),
      hotspots: normalized,
      updatedAt: new Date().toISOString(),
    };

    safeLocalStorageSet(`hotspot_tool_${selectedLocId}`, JSON.stringify(payload));

    try {
      const res = await fetch('/api/save-hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedLocId, payload }),
      });
      if (res.ok) {
        showToast('💾 Успешно сохранено на диск в src/data/savedHotspots.json!');
        if (onExport) onExport(payload);
        return;
      }
    } catch (e) {}

    showToast('💾 Сохранено в браузере!');
    if (onExport) onExport(payload);
  };

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
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs tracking-wide animate-fade-in">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Шапка */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800/80 px-4 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {editingSubLocation ? (
            <button
              onClick={() => setEditingSubLocation(null)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft size={14} />
              Назад к {CLASS_LABELS[editingSubLocation.parentId] || editingSubLocation.parentId}
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Compass size={18} />
            </div>
          )}

          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              {editingSubLocation ? (
                <>
                  <span className="text-cyan-400">Подлокация:</span> {editingSubLocation.subName}
                  <span className="text-[10px] text-slate-400 font-normal">
                    (внутри: {CLASS_LABELS[editingSubLocation.parentId] || editingSubLocation.parentId})
                  </span>
                </>
              ) : (
                <>
                  SAMP Hotspot Studio
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    PRO 60FPS
                  </span>
                </>
              )}
            </h1>
          </div>

          {!editingSubLocation && (
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
          )}
        </div>

        {/* Быстрые переключатели режима */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 gap-1">
          <button
            onClick={() => setToolMode('select')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'select' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings2 size={14} /> Выбор
          </button>
          <button
            onClick={() => setToolMode('draw')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'draw' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus size={14} /> Создать зону
          </button>
          <button
            onClick={() => setToolMode('pan')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              toolMode === 'pan' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Maximize2 size={14} /> Панорама
          </button>
        </div>

        {/* Действия сохранения и загрузки */}
        <div className="flex items-center gap-2">
          {/* Селектор музыки и предпрослушивание */}
          <input
            type="file"
            ref={musicInputRef}
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                setActiveMusic(ev.target.result);
                showToast();
              };
              reader.readAsDataURL(file);
            }}
          />

          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1">
            <Music size={14} className="text-amber-400" />
            <select
              value={activeMusic.startsWith('data:') ? 'custom' : activeMusic}
              onChange={(e) => {
                if (e.target.value === 'upload') {
                  musicInputRef.current?.click();
                } else {
                  setActiveMusic(e.target.value);
                }
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none max-w-[150px] truncate"
              title="Фоновая музыка для локации"
            >
              {LOCATION_AUDIO_TRACKS.map(t => (
                <option key={t.id} value={t.url} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
              {activeMusic.startsWith('data:') && (
                <option value="custom" className="bg-slate-900 text-amber-300">
                  📁 Загруженный аудиофайл
                </option>
              )}
              <option value="upload" className="bg-slate-900 text-emerald-400 font-bold">
                ➕ Загрузить свой .mp3...
              </option>
            </select>

            {activeMusic && (
              <button
                type="button"
                onClick={() => {
                  if (isPlayingPreview && previewAudioRef.current) {
                    previewAudioRef.current.pause();
                    setIsPlayingPreview(false);
                  } else {
                    if (!previewAudioRef.current) previewAudioRef.current = new Audio();
                    previewAudioRef.current.src = activeMusic;
                    previewAudioRef.current.volume = musicVolume;
                    previewAudioRef.current.play();
                    setIsPlayingPreview(true);
                    previewAudioRef.current.onended = () => setIsPlayingPreview(false);
                  }
                }}
                className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title={isPlayingPreview ? "Остановить" : "Прослушать трек"}
              >
                {isPlayingPreview ? <Square size={13} className="text-red-400 fill-current" /> : <Play size={13} />}
              </button>
            )}

            {/* Ползунок громкости */}
            <div className="flex items-center gap-1.5 px-1.5 border-l border-slate-700">
              <Volume2 size={14} className={activeMusic ? 'text-amber-400' : 'text-slate-600'} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                disabled={!activeMusic}
                className="w-16 h-1 accent-amber-400 cursor-pointer disabled:opacity-30"
                title={`Громкость: ${Math.round(musicVolume * 100)}%`}
              />
              <span className="text-[10px] font-mono text-slate-400 w-7">{Math.round(musicVolume * 100)}%</span>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title={editingSubLocation ? "Загрузить фото комнаты/гаража" : "Загрузить фото локации"}
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
          >
            <Smartphone size={15} /> TWA 390px
          </button>

          {!editingSubLocation && (
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Download size={14} /> Экспорт
            </button>
          )}

          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
          >
            <Save size={14} /> Сохранить
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 ml-2"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Основная рабочая область */}
      <div className="flex-1 flex relative overflow-hidden">
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
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

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
            {activeImageSrc ? (
              <img
                src={activeImageSrc}
                alt="Scene"
                data-stage-background="true"
                className="w-full h-full object-contain pointer-events-none block select-none"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  {editingSubLocation ? `Нет фото для подлокации «${editingSubLocation.subName}»` : 'Нет изображения'}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
                >
                  <Upload size={14} /> Загрузить изображение
                </button>
              </div>
            )}

            {/* Хотспоты */}
            {hotspots.map((hs) => {
              const isSelected = hs.id === selectedHotspotId;
              return (
                <div
                  key={hs.id}
                  style={{
                    position: 'absolute',
                    left: hs.x,
                    top: hs.y,
                    width: hs.w,
                    height: hs.h,
                  }}
                  onPointerDown={(e) => startMoveHotspot(e, hs)}
                  className={`group absolute select-none transition-shadow ${
                    isSelected
                      ? 'border-2 border-emerald-400 bg-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.6)] z-20'
                      : hs.action === 'sublocation' || hs.action === 'garage'
                      ? 'border-2 border-cyan-400 bg-cyan-500/25 z-10'
                      : hs.action === 'exit'
                      ? 'border-2 border-red-400 bg-red-500/20 z-10'
                      : 'border-2 border-amber-400 bg-amber-500/20 z-10'
                  }`}
                >
                  <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none text-center">
                    <span className="text-[12px] font-black uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate px-1">
                      {hs.action === 'sublocation' || hs.action === 'garage'
                        ? `📍 ${hs.label}`
                        : hs.action === 'exit'
                        ? `⬅ ${hs.label}`
                        : hs.label}
                    </span>
                  </div>

                  {isSelected && (
                    <>
                      <div
                        onPointerDown={(e) => startResizeHotspot(e, hs, 'nw')}
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm cursor-nwse-resize z-30"
                      />
                      <div
                        onPointerDown={(e) => startResizeHotspot(e, hs, 'ne')}
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm cursor-nesw-resize z-30"
                      />
                      <div
                        onPointerDown={(e) => startResizeHotspot(e, hs, 'sw')}
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm cursor-nesw-resize z-30"
                      />
                      <div
                        onPointerDown={(e) => startResizeHotspot(e, hs, 'se')}
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm cursor-nwse-resize z-30"
                      />
                    </>
                  )}
                </div>
              );
            })}

            {drawBox && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(drawBox.startX, drawBox.currentX),
                  top: Math.min(drawBox.startY, drawBox.currentY),
                  width: Math.abs(drawBox.currentX - drawBox.startX),
                  height: Math.abs(drawBox.currentY - drawBox.startY),
                }}
                className="border-2 border-dashed border-emerald-400 bg-emerald-500/20 pointer-events-none z-30"
              />
            )}
          </div>
        </div>

        {/* Правая панель настроек хотспота */}
        <aside className="w-80 bg-slate-900/95 border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto z-20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              {editingSubLocation ? `Зоны «${editingSubLocation.subName}»` : 'Свойства зоны'}
            </h2>
            <button
              onClick={() => setIsManagingActions((v) => !v)}
              className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                isManagingActions
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Настроить действия"
            >
              <Sliders size={12} /> Настроить действия
            </button>
          </div>

          {/* Редактор списка действий */}
          {isManagingActions && (
            <div className="p-3 bg-slate-800/90 border border-amber-500/40 rounded-xl flex flex-col gap-2.5 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                  Действия для: {CLASS_LABELS[effectiveParentId] || effectiveParentId}
                </span>
                <button onClick={() => setIsManagingActions(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="ID действия (например: kitchen, safe)"
                  value={newActionCode}
                  onChange={(e) => setNewActionCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-[11px] outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  placeholder="Название (например: 🍳 Кухня, 🔒 Сейф)"
                  value={newActionLabel}
                  onChange={(e) => setNewActionLabel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-[11px] outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleAddCustomAction}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5"
                >
                  <PlusCircle size={13} /> Добавить действие в список
                </button>
              </div>

              {/* Список текущих действий */}
              <div className="mt-1 pt-2 border-t border-slate-700/60 max-h-36 overflow-y-auto flex flex-col gap-1">
                {currentAvailableActions.map((act) => (
                  <div key={act.value} className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded text-[10px]">
                    <span className="truncate">{act.label} <code className="text-slate-500">({act.value})</code></span>
                    {customActionsMap[effectiveParentId]?.some((a) => a.value === act.value) && (
                      <button
                        onClick={() => handleRemoveCustomAction(act.value)}
                        className="text-red-400 hover:text-red-300 ml-1"
                        title="Удалить"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedHotspot ? (
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Название кнопки:</label>
                <input
                  type="text"
                  value={selectedHotspot.label || ''}
                  onChange={(e) => updateSelectedHotspot({ label: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Действие:</label>
                  <span className="text-[10px] text-slate-500">
                    {currentAvailableActions.length} вариантов
                  </span>
                </div>
                <select
                  value={selectedHotspot.action || currentAvailableActions[0]?.value || 'enter'}
                  onChange={(e) => updateSelectedHotspot({ action: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500 outline-none"
                >
                  {currentAvailableActions.map((act) => (
                    <option key={act.value} value={act.value}>
                      {act.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Настройка подлокации */}
              {(selectedHotspot.action === 'sublocation' || selectedHotspot.action === 'garage') && !editingSubLocation && (
                <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl flex flex-col gap-2">
                  <label className="text-cyan-400 font-bold block">
                    Имя комнаты / подлокации:
                  </label>
                  <input
                    type="text"
                    placeholder="garage, спальня, кухня..."
                    value={selectedHotspot.subLocation || ''}
                    onChange={(e) => updateSelectedHotspot({ subLocation: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:border-cyan-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      const subName = selectedHotspot.subLocation || selectedHotspot.label || 'garage';
                      setEditingSubLocation({ parentId: selectedLocId, subName });
                    }}
                    className="w-full mt-1 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20 active:scale-95 transition-transform"
                  >
                    <Sparkles size={14} /> Редактировать подлокацию
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => deleteHotspot(selectedHotspot.id)}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} /> Удалить зону
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              <p>Выберите зону на холсте или нажмите «Создать зону»</p>
            </div>
          )}

          {/* Список всех зон */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Все зоны ({hotspots.length})
            </h3>
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {hotspots.map((h) => (
                <div
                  key={h.id}
                  onClick={() => setSelectedHotspotId(h.id)}
                  className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    h.id === selectedHotspotId
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300'
                  }`}
                >
                  <span className="truncate font-medium">{h.label || 'Без названия'}</span>
                  <span className="text-[10px] text-slate-500">{h.action}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}