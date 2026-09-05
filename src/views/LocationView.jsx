import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, Move } from 'lucide-react';
import { LOCATION_IMAGES, getLocationHotspots, getLocationLabel, getLocationSublocations } from '../data/locationStyles';

/**
 * LocationView — показывает 2D картинку локации с интерактивными зонами (hotspots).
 * Поддерживает панорамный режим для широких изображений с drag-to-pan и zoom.
 */
export default function LocationView({ location, onClose, onAction }) {
  if (!location) return null;
  const [houseImage, setHouseImage] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotPositions, setHotspotPositions] = useState([]);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  // Sublocation navigation
  const [subLocationStack, setSubLocationStack] = useState([]);
  const [currentSubLocation, setCurrentSubLocation] = useState(null);
  const [subLocationImage, setSubLocationImage] = useState(null);
  const [subLocationHotspots, setSubLocationHotspots] = useState([]);
  const [subLocationPositions, setSubLocationPositions] = useState([]);

  // Panorama state
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanorama, setIsPanorama] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const panoramaWrapperRef = useRef(null);

  const inSubLocation = subLocationImage !== null;

  // Load image and hotspots for this location
  useEffect(() => {
    if (!location) return;
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
    const finalImage = customImage || (locData ? (locData.default || locData.images?.[0]?.src || null) : null);
    const finalHotspots = customHotspots.length > 0 ? customHotspots : (getLocationHotspots(location.id, 1) || []);
    setHouseImage(finalImage);
    setHotspots(finalHotspots);
    setSubLocationStack([]);
    setSubLocationImage(null);
    setSubLocationHotspots([]);
    setSubLocationPositions([]);
    setPanX(0);
    setPanY(0);
    setZoom(1);
  }, [location]);

  // Check if image is panoramic and update natural size
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setImageNaturalSize({ width: nw, height: nh });
    if (nw > 0 && nh > 0 && nw / nh > 1.5) {
      setIsPanorama(true);
    } else {
      setIsPanorama(false);
    }
  }, [houseImage, subLocationImage]);

  // Recalculate hotspot positions
  useEffect(() => {
    const list = inSubLocation ? subLocationHotspots : hotspots;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.complete || !list.length) return;

    const nw = img.naturalWidth || imageNaturalSize.width;
    const nh = img.naturalHeight || imageNaturalSize.height;
    if (!nw || !nh) return;

    const cW = container.clientWidth;
    const cH = container.clientHeight;

    // For panorama: image is scaled to fit container height, width overflows
    // For normal: image fills container (object-fit: cover behavior)
    const imageScale = nw / nh > 1.5 ? cH / nh : Math.max(cW / nw, cH / nh);
    const displayWidth = nw * imageScale;
    const displayHeight = nh * imageScale;

    const positions = list.map(hs => {
      if (hs.type === 'rect') {
        const left = (hs.x / 100) * displayWidth;
        const top = (hs.y / 100) * displayHeight;
        const width = (hs.w / 100) * displayWidth;
        const height = (hs.h / 100) * displayHeight;
        return {
          id: hs.id,
          action: hs.action,
          label: hs.label || '',
          subLocation: hs.subLocation,
          left,
          top,
          width,
          height,
        };
      }
      return null;
    }).filter(Boolean);

    if (inSubLocation) setSubLocationPositions(positions);
    else setHotspotPositions(positions);
  }, [hotspots, subLocationHotspots, inSubLocation, imageNaturalSize, panX, panY, zoom]);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (!isPanorama) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !isPanorama) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handler
  const handleWheel = (e) => {
    if (!isPanorama) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (!isPanorama || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !isPanorama || e.touches.length !== 1) return;
    setPanX(e.touches[0].clientX - dragStart.x);
    setPanY(e.touches[0].clientY - dragStart.y);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleHotspotClick = (hs) => {
    if (isPanorama && isDragging) return; // Prevent click after drag
    if (hs.action === 'sublocation' && hs.subLocation) {
      const subData = getLocationSublocations(location?.id)?.[hs.subLocation];
      if (subData) {
        setSubLocationStack(prev => [...prev, {
          image: subLocationImage,
          hotspots: subLocationHotspots,
          positions: subLocationPositions,
          label: currentSubLocation?.label || location?.name || getLocationLabel(location?.id),
        }]);
        setCurrentSubLocation(hs);
        setSubLocationImage(subData.image);
        setSubLocationHotspots(subData.hotspots || []);
        setSubLocationPositions([]);
        return;
      }
    }
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
        <div className="flex items-center gap-2">
          {isPanorama && (
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-xl px-2 py-1">
              <Move size={12} className="text-slate-400" />
              <span className="text-[9px] font-black uppercase text-slate-400">Панорама</span>
            </div>
          )}
          <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition-all">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2D Image with Hotspots */}
      <div
        ref={containerRef}
        className="absolute inset-0 bg-black overflow-hidden"
        onMouseDown={isPanorama ? handleMouseDown : undefined}
        onMouseMove={isPanorama ? handleMouseMove : undefined}
        onMouseUp={isPanorama ? handleMouseUp : undefined}
        onMouseLeave={isPanorama ? handleMouseUp : undefined}
        onWheel={isPanorama ? handleWheel : undefined}
        onTouchStart={isPanorama ? handleTouchStart : undefined}
        onTouchMove={isPanorama ? handleTouchMove : undefined}
        onTouchEnd={isPanorama ? handleTouchEnd : undefined}
        onClick={!inSubLocation && !displayHotspots.length ? () => onAction?.('default', '') : undefined}
        onDoubleClick={!inSubLocation && !displayHotspots.length ? () => onAction?.('default', '') : undefined}
        style={{ cursor: isPanorama ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {displayImage ? (
          <div
            ref={panoramaWrapperRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: isPanorama ? `translate(${panX}px, ${panY}px) scale(${zoom})` : undefined,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <img
              ref={imgRef}
              src={displayImage}
              alt={label}
              className="max-w-none max-h-none"
              style={{
                width: isPanorama ? 'auto' : '100%',
                height: isPanorama ? 'auto' : '100%',
                objectFit: isPanorama ? 'none' : 'fill',
                pointerEvents: isPanorama ? 'none' : 'auto',
              }}
              onLoad={() => {
                const container = containerRef.current;
                if (!container) return;
                const img = imgRef.current;
                if (!img) return;
                const nw = img.naturalWidth;
                const nh = img.naturalHeight;
                setImageNaturalSize({ width: nw, height: nh });
                if (nw > 0 && nh > 0 && nw / nh > 1.5) {
                  setIsPanorama(true);
                } else {
                  setIsPanorama(false);
                }
                const list = inSubLocation ? subLocationHotspots : hotspots;
                const cW = container.clientWidth;
                const cH = container.clientHeight;
                const imageScale = nw / nh > 1.5 ? cH / nh : Math.max(cW / nw, cH / nh);
                const displayWidth = nw * imageScale;
                const displayHeight = nh * imageScale;
                const positions = list.map(hs => {
                  if (hs.type === 'rect') {
                    return {
                      id: hs.id,
                      action: hs.action,
                      label: hs.label || '',
                      subLocation: hs.subLocation,
                      left: (hs.x / 100) * displayWidth,
                      top: (hs.y / 100) * displayHeight,
                      width: (hs.w / 100) * displayWidth,
                      height: (hs.h / 100) * displayHeight,
                    };
                  }
                  return null;
                }).filter(Boolean);
                if (inSubLocation) setSubLocationPositions(positions);
                else setHotspotPositions(positions);
              }}
              draggable={false}
            />
            {displayPositions.map((pos) => {
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
                    if (isPanorama && isDragging) return;
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
          </div>
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
