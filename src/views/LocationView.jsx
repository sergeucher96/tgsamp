import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { LOCATION_IMAGES, getLocationHotspots, getLocationLabel, getLocationSublocations } from '../data/locationStyles';

/**
 * LocationView — показывает 2D картинку локации с интерактивными зонами (hotspots).
 * Поддерживает переход в подлокации (sublocation) и возврат назад.
 * @param {Object} location - локация из locations.js ({ id, name, type, ... })
 * @param {Function} onClose - закрыть вид
 * @param {Function} onAction - вызывается при клике на hotspot: (action, label, subLocation?) => void
 */
export default function LocationView({ location, onClose, onAction }) {
  if (!location) return null;
  const [houseImage, setHouseImage] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotPositions, setHotspotPositions] = useState([]);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  // Sublocation navigation
  const [subLocationStack, setSubLocationStack] = useState([]); // [{ key, location, imageData, hsList, label }]
  const [currentSubLocation, setCurrentSubLocation] = useState(null);
  const [subLocationImage, setSubLocationImage] = useState(null);
  const [subLocationHotspots, setSubLocationHotspots] = useState([]);
  const [subLocationPositions, setSubLocationPositions] = useState([]);

  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const inSubLocation = subLocationImage !== null;

  // Load image and hotspots for this location
  useEffect(() => {
    if (!location) return;
    // Check localStorage first (HotspotTool may have saved custom image/hotspots)
    const saved = localStorage.getItem(`hotspot_tool_${location.id}`);
    let customImage = null;
    let customHotspots = [];
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data?.default) customImage = data.default;
        else if (data?.images?.length > 0) customImage = data.images[0]?.src || data.default;
        if (Array.isArray(data)) customHotspots = data;
        else if (Array.isArray(data?.hotspots)) customHotspots = data.hotspots;
      } catch (e) {}
    }
    const locData = LOCATION_IMAGES[location.id];
    // Determine image: custom first, then static
    const finalImage = customImage || (locData ? (locData.default || locData.images?.[0]?.src || null) : null);
    // Determine hotspots: custom first (even without custom image), then static helper
    const finalHotspots = customHotspots.length > 0 ? customHotspots : (getLocationHotspots(location.id, 1) || []);
    setHouseImage(finalImage);
    setHotspots(finalHotspots);
    // Reset sublocation stack on location change
    setSubLocationStack([]);
    setSubLocationImage(null);
    setSubLocationHotspots([]);
    setSubLocationPositions([]);
  }, [location]);

  useEffect(() => {
    const list = inSubLocation ? subLocationHotspots : hotspots;
    if (!imgRef.current || !containerRef.current || !list.length) return;

    const recalc = () => {
      const img = imgRef.current;
      const container = containerRef.current;
      if (!img || !container || !img.complete) return;

      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const positions = list.map(hs => {
        if (hs.type === 'rect') {
          return {
            id: hs.id,
            action: hs.action,
            label: hs.label || '',
            subLocation: hs.subLocation,
            left: (hs.x / 100) * cW,
            top: (hs.y / 100) * cH,
            width: (hs.w / 100) * cW,
            height: (hs.h / 100) * cH,
          };
        }
        return null;
      }).filter(Boolean);

      if (inSubLocation) setSubLocationPositions(positions);
      else setHotspotPositions(positions);
    };

    if (imgRef.current?.complete) recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [hotspots, subLocationHotspots, inSubLocation]);

  const handleHotspotClick = (hs) => {
    // Handle sublocation navigation
    if (hs.action === 'sublocation' && hs.subLocation) {
      const subData = getLocationSublocations(location?.id)?.[hs.subLocation];
      if (subData) {
        setSubLocationStack(prev => [...prev, {
          image: subLocationImage,
          hotspots: subLocationHotspots,
          positions: subLocationPositions,
          label: currentSubLocation?.label || location?.name || getLocationLabel(location?.id),
        }]);
        setCurrentSubLocation(hs); // store the hotspot that led here
        setSubLocationImage(subData.image);
        setSubLocationHotspots(subData.hotspots || []);
        setSubLocationPositions([]);
        // Return to trigger recalc below
        return;
      }
    }
    // Forward to parent (MapView) for non-sublocation actions
    if (onAction) onAction(hs.action, hs.label);
  };

  const goBackFromSublocation = () => {
    if (subLocationStack.length === 0) return;
    const prev = subLocationStack[subLocationStack.length - 1];
    setSubLocationStack(prevStack => prevStack.slice(0, -1));
    setCurrentSubLocation(null);
    setSubLocationImage(prev.image);
    setSubLocationHotspots(prev.hotspots);
    setSubLocationPositions(prev.positions);
  };

  const label = currentSubLocation?.label || currentSubLocation?.name || location?.name || getLocationLabel(location?.id) || location?.id;

  // Determine which image/hotspots to render
  const displayImage = subLocationImage || houseImage;
  const displayHotspots = subLocationHotspots.length > 0 ? subLocationHotspots : hotspots;
  const displayPositions = subLocationPositions.length > 0 ? subLocationPositions : hotspotPositions;

  return (
    <div className="fixed inset-0 z-[350] bg-[#020617] flex flex-col text-white font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          {inSubLocation && (
            <button onClick={goBackFromSublocation}
              className="p-2 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition-all"
              title="Назад">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="text-left">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">
              {inSubLocation ? 'Подлокация' : 'Локация'}
            </p>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">{label}</h2>
          </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition-all">
          <X size={18} />
        </button>
      </div>

      {/* 2D Image with Hotspots */}
      <div ref={containerRef} className="absolute inset-0 bg-black overflow-hidden"
        onClick={!inSubLocation && !displayHotspots.length ? () => onAction?.('default', '') : undefined}
        onDoubleClick={!inSubLocation && !displayHotspots.length ? () => onAction?.('default', '') : undefined}
      >
        {displayImage ? (
          <>
            <img
              ref={imgRef}
              src={displayImage}
              alt={label}
              className="absolute inset-0 w-full h-full object-fill"
              onLoad={() => {
                const container = containerRef.current;
                if (!container) return;
                const cW = container.clientWidth;
                const cH = container.clientHeight;
                const list = inSubLocation ? subLocationHotspots : hotspots;
                const positions = list.map(hs => {
                  if (hs.type === 'rect') {
                    return {
                      id: hs.id,
                      action: hs.action,
                      label: hs.label || '',
                      subLocation: hs.subLocation,
                      left: (hs.x / 100) * cW,
                      top: (hs.y / 100) * cH,
                      width: (hs.w / 100) * cW,
                      height: (hs.h / 100) * cH,
                    };
                  }
                  return null;
                }).filter(Boolean);
                if (inSubLocation) setSubLocationPositions(positions);
                else setHotspotPositions(positions);
              }}
            />
            {displayPositions.map((pos) => {
              // Find the original hotspot to get subLocation data
              const originalHs = displayHotspots.find(h => h.id === pos.id);
              return (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    const hs = { id: pos.id, action: pos.action, label: pos.label, subLocation: originalHs?.subLocation };
                    handleHotspotClick(hs);
                  }}
                >
                  <div
                    className={`w-full h-full flex items-center justify-center transition-all duration-200 rounded-2xl ${
                      pos.action === 'sublocation'
                        ? 'bg-cyan-500/20 border border-cyan-400/40'
                        : hoveredHotspot === pos.id
                          ? 'bg-white/20'
                          : 'bg-white/10'
                    }`}
                    onMouseEnter={() => setHoveredHotspot(pos.id)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                  >
                    <span className="text-xs font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center pointer-events-none select-none">
                      {pos.action === 'sublocation' ? `📍 ${pos.label}` : pos.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f0a]">
            <span className="text-4xl mb-4">📍</span>
            <p className="text-sm font-black uppercase italic text-slate-500">{label}</p>
            <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest text-center px-8">Загрузите картинку для этой локации в Hotspot Tool</p>
          </div>
        )}
      </div>
    </div>
  );
}