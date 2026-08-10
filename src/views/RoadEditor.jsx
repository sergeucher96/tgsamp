import React, { useState, useRef, useCallback } from 'react';
import { X, Plus, Minus, Link, Save, Trash2, MapPin, RotateCcw, Check, AlertCircle, Building2 } from 'lucide-react';
import { WAYPOINTS, ROAD_NETWORK } from '../data/roads';
import { MAP_CONFIG } from '../data/mapConfig';
import { getLinkedLocations } from '../data/locations';

export default function RoadEditor({ onClose }) {
  const [waypoints, setWaypoints] = useState({ ...WAYPOINTS });
  const [roads, setRoads] = useState([...ROAD_NETWORK]);
  const existingLocations = getLinkedLocations();
  const [locations, setLocations] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState('house');

  const typeIcons = {
    house: '🏠', shop: '🛒', bar: '🍺', hotel: '🏨',
    gas: '⛽', parking: '🅿️', gym: '💪', warehouse: '📦',
    other: '📌', tuning: '🔧', clothes: '👕', bank: '🏦',
    mine: '⛏️', pizzeria: '🍕', showroom: '🚗', guns: '🔫',
    driving: '🎓', export: '📤', strip: '💃',
  };
  const typeNames = {
    house: 'Дом', shop: 'Магазин', bar: 'Бар', hotel: 'Отель',
    gas: 'АЗС', parking: 'Парковка', gym: 'Спортзал', warehouse: 'Склад',
    other: 'Другое', tuning: 'Тюнинг', clothes: 'Одежда', bank: 'Банк',
    mine: 'Шахта', pizzeria: 'Пиццерия', showroom: 'Автосалон', guns: 'Стрелковый',
    driving: 'Автошкола', export: 'Экспорт', strip: 'Стрип-клуб',
  };
  const [mode, setMode] = useState('point');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [previewLine, setPreviewLine] = useState(null);
  const [saved, setSaved] = useState(false);
  const [notification, setNotification] = useState(null);
  const [scale, setScale] = useState(0.15);
  const [offset, setOffset] = useState(() => {
    // Center the map in viewport initially
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: (vw - MAP_CONFIG.width * 0.15) / 2,
      y: (vh - MAP_CONFIG.height * 0.15) / 2
    };
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2000);
  };

  const getMapCoords = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Map origin (0,0) is at viewport position (offset.x, offset.y)
    // So mapX = (mouse - offset) / scale
    const mapX = Math.round((mx - offset.x) / scale);
    const mapY = Math.round((my - offset.y) / scale);
    return { x: mapX, y: mapY };
  }, [scale, offset]);

  const findNearestPoint = (x, y, maxDist) => {
    let minDist = Infinity, closest = null;
    for (const [id, pt] of Object.entries(waypoints)) {
      const dist = Math.hypot(x - pt.x, y - pt.y);
      if (dist < minDist && dist < maxDist) { minDist = dist; closest = id; }
    }
    return closest;
  };

  const handleDoubleClick = (e) => {
    const coords = getMapCoords(e);
    if (!coords) return;
    const radius = 30 / scale;
    const clickedPoint = findNearestPoint(coords.x, coords.y, radius);

    if (mode === 'point') {
      if (!clickedPoint) {
        const newId = String(Math.max(...Object.keys(waypoints).map(Number)) + 1);
        setWaypoints(p => ({ ...p, [newId]: { x: coords.x, y: coords.y } }));
        notify(`Точка ${newId} добавлена`);
      }
    } else if (mode === 'location') {
      const nextId = String(locations.length + 1);
      setLocations(prev => [...prev, { id: `loc_${nextId}`, name: locationName || `Локация ${nextId}`, type: locationType, x: coords.x, y: coords.y, nearestWaypoint: clickedPoint || '—' }]);
      notify(`Локация ${nextId} добавлена в список`);
    } else if (mode === 'road') {
      if (clickedPoint) {
        if (!selectedPoint) { setSelectedPoint(clickedPoint); notify(`Выбрана ${clickedPoint}`); }
        else if (clickedPoint !== selectedPoint) {
          const exists = roads.some(r => (r.from === selectedPoint && r.to === clickedPoint) || (r.from === clickedPoint && r.to === selectedPoint));
          if (exists) notify('Связь уже существует!', 'error');
          else { setRoads(p => [...p, { from: selectedPoint, to: clickedPoint }]); notify(`Дорога ${selectedPoint} → ${clickedPoint}`); }
          setSelectedPoint(null);
        }
      } else setSelectedPoint(null);
    } else if (mode === 'delete') {
      if (clickedPoint) {
        setWaypoints(p => { const n = { ...p }; delete n[clickedPoint]; return n; });
        setRoads(p => p.filter(r => r.from !== clickedPoint && r.to !== clickedPoint));
        notify(`Точка ${clickedPoint} удалена`);
      }
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { setIsPanning(true); setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); }
  };
  const handleMouseMove = (e) => {
    if (isPanning) setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    const coords = getMapCoords(e);
    if (!coords) return;
    const nearest = findNearestPoint(coords.x, coords.y, 30 / scale);
    setHoveredPoint(nearest);
    if (mode === 'road' && selectedPoint) setPreviewLine({ from: waypoints[selectedPoint], to: nearest ? waypoints[nearest] : coords });
  };
  const handleMouseUp = () => setIsPanning(false);
  const handleMouseLeave = () => { setIsPanning(false); setHoveredPoint(null); setPreviewLine(null); };
  const handleWheel = (e) => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.05, Math.min(3, scale * factor));
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Zoom towards mouse: adjust offset so point under mouse stays fixed
    const ratio = newScale / scale;
    setOffset({
      x: mx - (mx - offset.x) * ratio,
      y: my - (my - offset.y) * ratio
    });
    setScale(newScale);
  };
  const zoomIn = () => {
    const factor = 1.3;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const newScale = Math.min(3, scale * factor);
    const ratio = newScale / scale;
    setOffset({ x: cx - (cx - offset.x) * ratio, y: cy - (cy - offset.y) * ratio });
    setScale(newScale);
  };
  const zoomOut = () => {
    const factor = 0.7;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const newScale = Math.max(0.05, scale * factor);
    const ratio = newScale / scale;
    setOffset({ x: cx - (cx - offset.x) * ratio, y: cy - (cy - offset.y) * ratio });
    setScale(newScale);
  };

  const exportChanges = () => {
    const wp = Object.entries(waypoints).filter(([id]) => !WAYPOINTS[id]).map(([id, pt]) => `  "${id}": { x: ${pt.x}, y: ${pt.y }},`).join('\n');
    const rd = roads.filter(r => !ROAD_NETWORK.some(o => o.from === r.from && o.to === r.to)).map(r => `{ from: "${r.from}", to: "${r.to}" },`).join('\n');
    const locs = locations.map(l => `{ id: '${l.id}', x: ${l.x}, y: ${l.y}, name: '${l.name}', type: '${l.type}', nearestWaypoint: '${l.nearestWaypoint}' },`).join('\n');
    let out = '';
    if (wp) out += `// Новые точки\n${wp}\n\n`;
    if (rd) out += `// Новые дороги\n${rd}\n\n`;
    if (locs) out += `// Новые локации (ID, координаты, ближайшая точка)\n${locs}\n`;
    if (!out) out = 'Нет новых изменений.\n';
    navigator.clipboard.writeText(out); setSaved(true); notify('Скопировано!'); setTimeout(() => setSaved(false), 3000);
  };

  const undoLast = () => {
    const np = Object.keys(waypoints).filter(id => !WAYPOINTS[id]);
    if (np.length) { const l = np[np.length - 1]; setWaypoints(p => { const n = { ...p }; delete n[l]; return n; }); setRoads(p => p.filter(r => r.from !== l && r.to !== l)); notify(`Точка ${l} отменена`); }
    else if (roads.length > ROAD_NETWORK.length) { setRoads(p => p.slice(0, -1)); notify('Дорога отменена'); }
  };

  const resetAll = () => { setWaypoints({ ...WAYPOINTS }); setRoads([...ROAD_NETWORK]); setSelectedPoint(null); notify('Сброшено'); };

  const newPts = Object.keys(waypoints).filter(id => !WAYPOINTS[id]).length;
  const newRds = roads.length - ROAD_NETWORK.length;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col text-white font-sans">
      <div className="shrink-0 p-4 bg-[#071006]/95 border-b border-[#7eff67]/20 backdrop-blur-xl z-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="text-[#7eff67]" />
            <div>
              <h2 className="text-sm font-black uppercase italic">Редактор дорог</h2>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest">
                {Object.keys(waypoints).length} точек · {roads.length} дорог{locations.length > 0 && ` · ${locations.length} локаций`}
                {newPts > 0 && ` · +${newPts} новых`}{newRds > 0 && ` · +${newRds} дорог`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ModeButton active={mode === 'point'} onClick={() => { setMode('point'); setSelectedPoint(null); }} icon={<Plus size={14} />} label="Добавить" color="bg-emerald-600" />
          <ModeButton active={mode === 'road'} onClick={() => { setMode('road'); setSelectedPoint(null); }} icon={<Link size={14} />} label="Связать" color="bg-blue-600" />
          <ModeButton active={mode === 'delete'} onClick={() => setMode('delete')} icon={<Trash2 size={14} />} label="Удалить" color="bg-red-600" />
          <ModeButton active={mode === 'location'} onClick={() => { setMode('location'); setSelectedPoint(null); }} icon={<Building2 size={14} />} label="Локация" color="bg-purple-600" />
          <div className="flex-1" />
          <button onClick={undoLast} className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase"><RotateCcw size={12} /> Отмена</button>
          <button onClick={resetAll} className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase"><AlertCircle size={12} /> Сброс</button>
          <button onClick={exportChanges} className="flex items-center gap-1 px-3 py-2 bg-[#7eff67]/20 hover:bg-[#7eff67]/30 border border-[#7eff67]/30 rounded-xl text-[10px] font-black uppercase text-[#7eff67]">
            {saved ? <Check size={12} /> : <Save size={12} />} {saved ? 'Готово!' : 'Экспорт'}
          </button>
        </div>
        <div className="mt-2 text-[9px] text-slate-400">
          {mode === 'point' && 'Двойной клик — добавить точку · Перетаскивание — двигать карту · Колёсико — зум'}
          {mode === 'road' && (selectedPoint ? `🔗 Выбрана ${selectedPoint}. Двойной клик по второй` : '🔗 Двойной клик по первой, затем по второй')}
          {mode === 'delete' && '🗑️ Двойной клик по точке — удалить'}
          {mode === 'location' && `📍 Двойной клик — добавить локацию (${locations.length} добавлено)`}
        </div>
        {mode === 'location' && (
          <div className="mt-2 flex gap-2">
            <input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Название локации" className="flex-1 px-2 py-1 bg-white/5 border border-white/20 rounded-lg text-[10px] text-white placeholder-slate-500" />
            <select value={locationType} onChange={e => setLocationType(e.target.value)} className="px-2 py-1 bg-white/5 border border-white/20 rounded-lg text-[10px] text-white">
              <option value="house">🏠 Дом</option>
              <option value="shop">🛒 Магазин</option>
              <option value="bar">🍺 Бар</option>
              <option value="hotel">🏨 Отель</option>
              <option value="gas">⛽ АЗС</option>
              <option value="parking">🅿️ Парковка</option>
              <option value="gym">💪 Спортзал</option>
              <option value="warehouse">📦 Склад</option>
              <option value="other">📌 Другое</option>
            </select>
          </div>
        )}
      </div>

      {notification && (
        <div className={`fixed top-36 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-2xl text-xs font-black uppercase ${notification.type === 'error' ? 'bg-red-600/90 text-white' : 'bg-[#7eff67]/90 text-black'}`}>{notification.msg}</div>
      )}

      <div ref={containerRef} className="flex-1 relative overflow-hidden select-none"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onDoubleClick={handleDoubleClick}>
        <div style={{ position: 'absolute', left: `${offset.x}px`, top: `${offset.y}px`, width: MAP_CONFIG.width, height: MAP_CONFIG.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <img src="/map.webp" alt="Map" className="absolute inset-0 w-full h-full pointer-events-none" />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" width={MAP_CONFIG.width} height={MAP_CONFIG.height}>
            {ROAD_NETWORK.map((r, i) => { const f = waypoints[r.from], t = waypoints[r.to]; if (!f || !t) return null; return <line key={`r${i}`} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#3b82f6" strokeWidth="3" opacity="0.5" />; })}
            {roads.map((r, i) => { if (ROAD_NETWORK.some(o => o.from === r.from && o.to === r.to)) return null; const f = waypoints[r.from], t = waypoints[r.to]; if (!f || !t) return null; return <line key={`nr${i}`} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#7eff67" strokeWidth="4" opacity="0.8" strokeDasharray="8 4" />; })}
            {previewLine && <line x1={previewLine.from.x} y1={previewLine.from.y} x2={previewLine.to.x} y2={previewLine.to.y} stroke="#fbbf24" strokeWidth="3" opacity="0.7" strokeDasharray="6 3" />}
          </svg>
          {Object.entries(waypoints).map(([id, pt]) => (
            <div key={id} className="absolute" style={{ left: `${pt.x}px`, top: `${pt.y}px`, transform: 'translate(-50%, -50%)' }}>
              <div className={`w-3 h-3 rounded-full border-2 ${selectedPoint === id ? 'bg-yellow-400 border-yellow-200 scale-150' : hoveredPoint === id ? 'bg-white scale-125' : !WAYPOINTS[id] ? 'bg-[#7eff67] border-green-300' : mode === 'delete' ? 'bg-red-500 border-red-300' : 'bg-blue-400 border-blue-200'}`} />
              {(hoveredPoint === id || selectedPoint === id) && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/90 border border-white/20 rounded-lg text-[8px] font-black text-white whitespace-nowrap">{id} ({pt.x}, {pt.y})</div>
              )}
            </div>
          ))}
          {locations.map((loc, i) => {
            const icon = typeIcons[loc.type] || '📌';
            const name = typeNames[loc.type] || loc.type;
            return (
              <div key={`loc-${i}`} className="absolute" style={{ left: `${loc.x}px`, top: `${loc.y}px`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-5 h-5 bg-purple-500/80 border-2 border-purple-300 rounded-lg flex items-center justify-center text-[10px]">{icon}</div>
                <div className="absolute top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-900/90 border border-purple-400/50 rounded-lg text-[8px] font-black text-purple-200 whitespace-nowrap">{loc.name} ({name})</div>
              </div>
            );
          })}
          {existingLocations.map(loc => {
            const icon = loc.icon || (typeIcons[loc.type] || '📌');
            const name = loc.name || (typeNames[loc.type] || loc.type);
            return (
              <div key={`existing-${loc.id}`} className="absolute opacity-60" style={{ left: `${loc.x}px`, top: `${loc.y}px`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-5 h-5 bg-white/10 border border-white/30 rounded-lg flex items-center justify-center text-[10px]">{icon}</div>
                <div className="absolute top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900/80 border border-white/20 rounded text-[7px] font-black text-slate-400 whitespace-nowrap">{name}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-50">
        <div className="bg-[#071006]/90 backdrop-blur-xl border border-[#7eff67]/20 rounded-2xl overflow-hidden">
          <button onClick={zoomIn} className="p-3 text-[#7eff67] hover:bg-white/10"><Plus size={14} /></button>
          <div className="h-px bg-[#7eff67]/20" />
          <button onClick={zoomOut} className="p-3 text-[#7eff67] hover:bg-white/10"><Minus size={14} /></button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-50 bg-[#071006]/90 backdrop-blur-xl border border-[#7eff67]/20 p-3 rounded-2xl pointer-events-none">
        <div className="text-[9px] font-black uppercase text-[#7eff67] mb-2">Легенда</div>
        <div className="space-y-1 text-[9px] text-slate-400">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400 border border-blue-200" /><span>Старая точка</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#7eff67] border border-green-300" /><span>Новая точка</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-3 bg-blue-500/50" /><span>Старая дорога</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-3 bg-[#7eff67]/80" /><span>Новая дорога</span></div>
        </div>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label, color }) {
  return (<button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${active ? `${color} text-white shadow-lg` : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{icon} {label}</button>);
}