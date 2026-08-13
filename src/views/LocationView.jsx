import React, { useState, useRef, useEffect } from 'react';
import { X, LogOut } from 'lucide-react';
import { LOCATION_IMAGES, getLocationHotspots, getLocationLabel } from '../data/locationStyles';

/**
 * LocationView — показывает 2D картинку локации с интерактивными зонами (hotspots).
 * Аналог HouseInterior для локаций.
 * @param {Object} location - локация из locations.js ({ id, name, type, ... })
 * @param {Function} onClose - закрыть вид
 * @param {Function} onAction - вызывается при клике на hotspot: (action, label) => void
 */
export default function LocationView({ location, onClose, onAction }) {
  const [houseImage, setHouseImage] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotPositions, setHotspotPositions] = useState([]);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);

  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Load image and hotspots for this location
  useEffect(() => {
    if (!location) return;
    const locData = LOCATION_IMAGES[location.id];
    if (locData) {
      setHouseImage(locData.default || locData.images?.[0]?.src || null);
      const hs = getLocationHotspots(location.id, 1) || [];
      setHotspots(hs);
    } else {
      // No image configured yet — fallback: show placeholder
      setHouseImage(null);
      setHotspots([]);
    }
  }, [location]);

  // Recalculate hotspot positions on image load
  useEffect(() => {
    if (!imgRef.current || !containerRef.current || !hotspots.length) return;

    const recalc = () => {
      const img = imgRef.current;
      const container = containerRef.current;
      if (!img || !container || !img.complete) return;

      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const nW = img.naturalWidth;
      const nH = img.naturalHeight;
      if (nW === 0 || nH === 0) return;

      const scale = Math.max(cW / nW, cH / nH);
      const drawW = nW * scale;
      const drawH = nH * scale;
      const offsetX = (cW - drawW) / 2;
      const offsetY = (cH - drawH) / 2;

      const positions = hotspots.map(hs => {
        if (hs.type === 'rect') {
          return {
            id: hs.id,
            action: hs.action,
            label: hs.label || '',
            left: offsetX + (hs.x / 100) * nW * scale,
            top: offsetY + (hs.y / 100) * nH * scale,
            width: (hs.w / 100) * nW * scale,
            height: (hs.h / 100) * nH * scale,
          };
        }
        return null;
      }).filter(Boolean);

      setHotspotPositions(positions);
    };

    if (imgRef.current?.complete) recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [hotspots]);

  const handleHotspotClick = (action, label) => {
    console.log('[ATM DEBUG] handleHotspotClick:', action, label, 'onAction exists:', !!onAction);
    if (onAction) onAction(action, label);
  };

  const label = location?.name || getLocationLabel(location?.id) || location?.id;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col text-white font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-left">
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">Локация</p>
          <h2 className="text-xl font-black uppercase italic tracking-tighter">{label}</h2>
        </div>
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition-all">
          <X size={18} />
        </button>
      </div>

      {/* 2D Image with Hotspots */}
      <div ref={containerRef} className="absolute inset-0 bg-black overflow-hidden"
        onClick={() => {
          // If no hotspots configured yet, open the location's menu on double-click or tap
          if (!hotspots.length && onAction) {
            onAction('default', '');
          }
        }}
        onDoubleClick={() => {
          if (!hotspots.length && onAction) {
            onAction('default', '');
          }
        }}
      >
        {houseImage ? (
          <>
            <img
              ref={imgRef}
              src={houseImage}
              alt={label}
              className="absolute inset-0 w-full h-full object-cover"
              onLoad={() => {
                if (imgRef.current && containerRef.current) {
                  const img = imgRef.current;
                  const container = containerRef.current;
                  const cW = container.clientWidth;
                  const cH = container.clientHeight;
                  const nW = img.naturalWidth;
                  const nH = img.naturalHeight;
                  if (nW === 0 || nH === 0) return;
                  const scale = Math.max(cW / nW, cH / nH);
                  const drawW = nW * scale;
                  const drawH = nH * scale;
                  const offsetX = (cW - drawW) / 2;
                  const offsetY = (cH - drawH) / 2;
                  const positions = hotspots.map(hs => {
                    if (hs.type === 'rect') {
                      return {
                        id: hs.id,
                        action: hs.action,
                        label: hs.label || '',
                        left: offsetX + (hs.x / 100) * nW * scale,
                        top: offsetY + (hs.y / 100) * nH * scale,
                        width: (hs.w / 100) * nW * scale,
                        height: (hs.h / 100) * nH * scale,
                      };
                    }
                    return null;
                  }).filter(Boolean);
                  setHotspotPositions(positions);
                }
              }}
            />
            {hotspotPositions.map((pos) => (
              <div
                key={pos.id}
                style={{
                  position: 'absolute',
                  left: `${pos.left}px`,
                  top: `${pos.top}px`,
                  width: `${pos.width}px`,
                  height: `${pos.height}px`,
                  cursor: 'pointer',
                }}
                onClick={(e) => { e.stopPropagation(); handleHotspotClick(pos.action, pos.label); }}
              >
                <div
                  className={`w-full h-full flex items-center justify-center transition-all duration-200 ${
                    hoveredHotspot === pos.id ? 'bg-white/20 rounded-2xl' : 'bg-white/10 rounded-2xl'
                  }`}
                  onMouseEnter={() => setHoveredHotspot(pos.id)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                >
                  <span className="text-xs font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center pointer-events-none select-none">
                    {pos.label}
                  </span>
                </div>
              </div>
            ))}
          </>
        ) : (
          // Placeholder when no image is configured yet
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f0a]">
            <span className="text-4xl mb-4">📍</span>
            <p className="text-sm font-black uppercase italic text-slate-500">{label}</p>
            <p className="text-[9px] text-slate-600 mt-2 uppercase tracking-widest">Картинка будет добавлена</p>
          </div>
        )}
      </div>
    </div>
  );
}