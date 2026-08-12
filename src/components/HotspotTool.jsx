import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, Trash2, MapPin, Save } from 'lucide-react';
import { HOUSE_PREVIEWS_MAP } from '../data/houseStyles';
import { LOCATION_IMAGES } from '../data/locationStyles';

// Merge house classes + location types into one unified map
const ALL_CLASSES = {
  // House classes
  economy: HOUSE_PREVIEWS_MAP.economy,
  comfort: HOUSE_PREVIEWS_MAP.comfort,
  business: HOUSE_PREVIEWS_MAP.business,
  premium: HOUSE_PREVIEWS_MAP.premium,
  // Location types (from LOCATION_IMAGES)
  ...LOCATION_IMAGES
};

const CLASS_LABELS = {
  economy: '🏠 Эконом',
  comfort: '🏠 Комфорт',
  business: '🏠 Бизнес',
  premium: '🏠 Премиум',
  ...Object.entries(LOCATION_IMAGES).reduce((acc, [k, v]) => {
    acc[k] = v.label || k;
    return acc;
  }, {})
};

/**
 * HotspotTool — dev-инструмент для разметки интерактивных зон на изображениях.
 * Поддерживает дома (economy/comfort/business/premium) и локации (bank/shop/bar и т.д.).
 */
export default function HotspotTool({ onClose, onExport }) {
  const [houseClass, setHouseClass] = useState('economy');
  const [selectedImage, setSelectedImage] = useState(null);
  const [hotspots, setHotspots] = useState(() => {
    const saved = localStorage.getItem(`hotspot_tool_${houseClass}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [mode, setMode] = useState('rect');
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [hotspotNames, setHotspotNames] = useState({});
  const [hotspotPositions, setHotspotPositions] = useState(hotspots);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const hotspotsRef = useRef(hotspots);

  // Recalculate hotspot positions based on current image layout
  // Does NOT depend on hotspots state — uses hsList parameter or hotspotsRef
  const recalcHotspotPositions = useCallback((hsList) => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.complete) return;

    const cRect = container.getBoundingClientRect();
    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    if (nW === 0 || nH === 0) return;

    const scale = Math.max(cRect.width / nW, cRect.height / nH);
    const offsetX = (cRect.width - nW * scale) / 2;
    const offsetY = (cRect.height - nH * scale) / 2;

    const list = hsList ?? hotspotsRef.current;
    const positions = list.map(hs => {
      if (hs.type === 'rect') {
        return {
          ...hs,
          _left: offsetX + (hs.x / 100) * nW * scale,
          _top: offsetY + (hs.y / 100) * nH * scale,
          _width: (hs.w / 100) * nW * scale,
          _height: (hs.h / 100) * nH * scale,
        };
      }
      return hs;
    });
    setHotspotPositions(positions);
  }, []);

  // Keep hotspotsRef in sync
  useEffect(() => {
    hotspotsRef.current = hotspots;
  }, [hotspots]);

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
    const data = ALL_CLASSES[cls];
    if (data?.images?.[0]) {
      setSelectedImage(data.images[0].src);
    }
    const saved = localStorage.getItem(`hotspot_tool_${cls}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setHotspots(parsed);
      hotspotsRef.current = parsed;
    } else setHotspots([]);
  };

  // Recalculate positions when image loads (after class change)
  useEffect(() => {
    if (selectedImage) {
      // Delay to ensure image is rendered
      const timer = setTimeout(() => recalcHotspotPositions(hotspotsRef.current), 100);
      return () => clearTimeout(timer);
    }
  }, [selectedImage]);

  // Load first image on mount
  useEffect(() => {
    const data = ALL_CLASSES[houseClass];
    if (data?.images?.[0] && !selectedImage) {
      setSelectedImage(data.images[0].src);
    }
  }, [houseClass]);

  const getPercentCoords = useCallback((e) => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return { x: 0, y: 0 };
    
    const cRect = container.getBoundingClientRect();
    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    if (nW === 0 || nH === 0) return { x: 0, y: 0 };
    
    const scale = Math.max(cRect.width / nW, cRect.height / nH);
    const drawW = nW * scale;
    const drawH = nH * scale;
    const offsetX = (cRect.width - drawW) / 2;
    const offsetY = (cRect.height - drawH) / 2;
    
    const clickX = e.clientX - cRect.left;
    const clickY = e.clientY - cRect.top;
    
    const imgX = ((clickX - offsetX) / drawW) * 100;
    const imgY = ((clickY - offsetY) / drawH) * 100;
    
    return { x: imgX, y: imgY };
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
        const newHotspot = { id, type: 'rect', x, y, w, h, name: 'zone' };
        const updated = [...hotspotsRef.current, newHotspot];
        setHotspots(updated);
        localStorage.setItem(`hotspot_tool_${houseClass}`, JSON.stringify(updated));
        // Recalculate positions immediately with the new hotspot list
        recalcHotspotPositions(updated);
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
      const updated = [...hotspotsRef.current, { id, type: 'polygon', points, name: 'zone' }];
      setHotspots(updated);
      localStorage.setItem(`hotspot_tool_${houseClass}`, JSON.stringify(updated));
      recalcHotspotPositions(updated);
    }
    setPolygonPoints([]);
  };

  const removeHotspot = (id) => {
    const updated = hotspotsRef.current.filter(h => h.id !== id);
    setHotspots(updated);
    localStorage.setItem(`hotspot_tool_${houseClass}`, JSON.stringify(updated));
    recalcHotspotPositions(updated);
  };

  const renameHotspot = (id, name) => {
    setHotspotNames(prev => ({ ...prev, [id]: name }));
  };

  const saveToStorage = () => {
    localStorage.setItem(`hotspot_tool_${houseClass}`, JSON.stringify(hotspots));
  };

  const exportJSON = () => {
    const data = {
      class: houseClass,
      hotspots: hotspots.map(h => ({
        ...h,
        name: hotspotNames[h.id] || h.name,
      })),
    };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    if (onExport) onExport(data);
    saveToStorage();
  };

  const clearAll = () => {
    setHotspots([]);
    setHotspotPositions([]);
    setHotspotNames({});
    localStorage.removeItem(`hotspot_tool_${houseClass}`);
  };

  // Preview of drawing rect
  const previewRect = drawing && startPos ? (() => {
    // Will be updated via mousemove — simplified
    return null;
  })() : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col text-white font-sans">
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
              className="absolute inset-0 w-full h-full object-cover"
              onLoad={() => {
                console.log('HotspotTool img loaded:', selectedImage);
                recalcHotspotPositions(hotspotsRef.current);
              }}
              onError={(e) => console.error('HotspotTool img error:', selectedImage, e)}
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
            <div className="text-center">
              <div className="text-6xl mb-4">🏠</div>
              <p className="text-sm font-black uppercase text-slate-500">Нет изображений</p>
              <p className="text-[10px] mt-2 text-slate-700">Добавьте фото в public/houses/</p>
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
              <optgroup label="🏠 Дома">
                <option value="economy" className="bg-[#0a0f0a] text-white">🏠 Эконом-класс</option>
                <option value="comfort" className="bg-[#0a0f0a] text-white">🏡 Комфорт-класс</option>
                <option value="business" className="bg-[#0a0f0a] text-white">🏢 Бизнес-класс</option>
                <option value="premium" className="bg-[#0a0f0a] text-white">🏰 Премиум-класс</option>
              </optgroup>
              <optgroup label="📍 Локации">
                {Object.entries(LOCATION_IMAGES).map(([key]) => (
                  <option key={key} value={key} className="bg-[#0a0f0a] text-white">{CLASS_LABELS[key] || key}</option>
                ))}
              </optgroup>
            </select>
            {imagesList.length > 1 && (
              <select value={selectedImage || ''} onChange={e => setSelectedImage(e.target.value)}
                className="bg-[#0a0f0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
                {imagesList.map(img => <option key={img.src} value={img.src} className="bg-[#0a0f0a] text-white">{img.src.split('/').pop()}</option>)}
              </select>
            )}
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
              <button onClick={clearAll} className="p-1.5 bg-red-600/20 rounded-lg active:scale-90">
                <Trash2 size={12} className="text-red-400" />
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
          {hotspots.map(h => (
            <div key={h.id} className="flex items-center gap-2 bg-white/[0.03] rounded-xl p-2">
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
          ))}
          {hotspots.length === 0 && (
            <p className="text-[10px] text-slate-600 text-center py-2">Нет зон — нарисуйте на изображении</p>
          )}
        </div>
      </div>
    </div>
  );
}