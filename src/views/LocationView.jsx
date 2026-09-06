import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowLeft, Move } from 'lucide-react';
import {
  getLocationImage,
  getLocationHotspots,
  getLocationLabel,
  getLocationSublocations,
} from '../data/locationStyles';

const PHYSICS_CONFIG = {
  friction: 0.93,
  springStiffness: 0.18,
  bounceResistance: 0.32,
  maxSpeed: 45,
  stopVelocity: 0.05,
  dragThreshold: 6,
};

export default function LocationView({ location, onClose, onAction }) {
  if (!location) return null;

  const [houseImage, setHouseImage] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);

  const [subLocationStack, setSubLocationStack] = useState([]);
  const [currentSubLocation, setCurrentSubLocation] = useState(null);
  const [subLocationImage, setSubLocationImage] = useState(null);
  const [subLocationHotspots, setSubLocationHotspots] = useState([]);

  const containerRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [imageAspect, setImageAspect] = useState(16 / 9);
  const [isPanorama, setIsPanorama] = useState(false);

  const [cameraX, setCameraX] = useState(0);
  const cameraXRef = useRef(0);
  cameraXRef.current = cameraX;

  const isDraggingRef = useRef(false);
  const dragStartPointerX = useRef(0);
  const dragStartCameraX = useRef(0);
  const totalDragDistanceRef = useRef(0);
  const pointerSamplesRef = useRef([]);
  const velocityRef = useRef(0);
  const rafIdRef = useRef(null);

  const inSubLocation = subLocationImage !== null;
  const scaledWidth = viewportHeight > 0 ? viewportHeight * imageAspect : 0;
  const maxCameraX = Math.max(0, scaledWidth - viewportWidth);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      setViewportWidth(containerRef.current.clientWidth);
      setViewportHeight(containerRef.current.clientHeight);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const stopInertia = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    velocityRef.current = 0;
  };

  const startInertiaLoop = useCallback(() => {
    stopInertia();

    const loop = () => {
      let currentX = cameraXRef.current;
      let vel = velocityRef.current;
      const vH = containerRef.current?.clientHeight || 0;
      const vW = containerRef.current?.clientWidth || 0;
      const currentMax = Math.max(0, vH * imageAspect - vW);

      if (currentX >= 0 && currentX <= currentMax) {
        currentX -= vel;
        vel *= PHYSICS_CONFIG.friction;
      } else if (currentX < 0) {
        const springDelta = (0 - currentX) * PHYSICS_CONFIG.springStiffness;
        currentX += springDelta;
        vel *= 0.65;
      } else if (currentX > currentMax) {
        const springDelta = (currentMax - currentX) * PHYSICS_CONFIG.springStiffness;
        currentX += springDelta;
        vel *= 0.65;
      }

      cameraXRef.current = currentX;
      setCameraX(currentX);
      velocityRef.current = vel;

      const isOutOfBounds = currentX < -0.5 || currentX > currentMax + 0.5;
      if (Math.abs(vel) > PHYSICS_CONFIG.stopVelocity || isOutOfBounds) {
        rafIdRef.current = requestAnimationFrame(loop);
      } else {
        const clamped = Math.max(0, Math.min(currentMax, currentX));
        cameraXRef.current = clamped;
        setCameraX(clamped);
        stopInertia();
      }
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, [imageAspect]);

  useEffect(() => {
    if (!location) return;

    const finalImage = getLocationImage(location.id, 1) || '/locations/shop_1.webp';
    const finalHotspots = getLocationHotspots(location.id, 1) || [];

    setHouseImage(finalImage);
    setHotspots(finalHotspots);
    setSubLocationStack([]);
    setSubLocationImage(null);
    setSubLocationHotspots([]);

    stopInertia();
    cameraXRef.current = 0;
    setCameraX(0);
  }, [location]);

  const handleImageLoad = (e) => {
    const nw = e.target.naturalWidth || 16;
    const nh = e.target.naturalHeight || 9;
    const ratio = nw / nh;
    setImageAspect(ratio);

    const isPano = ratio > (window.innerWidth / window.innerHeight || 1.3);
    setIsPanorama(isPano);

    if (containerRef.current && isPano) {
      const vH = containerRef.current.clientHeight;
      const vW = containerRef.current.clientWidth;
      const sW = vH * ratio;
      const initialMax = Math.max(0, sW - vW);
      const initialCenter = initialMax / 2;
      cameraXRef.current = initialCenter;
      setCameraX(initialCenter);
    }
  };

  const handlePointerDown = (e) => {
    if (!isPanorama) return;
    stopInertia();

    isDraggingRef.current = true;
    dragStartPointerX.current = e.clientX;
    dragStartCameraX.current = cameraXRef.current;
    totalDragDistanceRef.current = 0;

    pointerSamplesRef.current = [{ x: e.clientX, time: performance.now() }];

    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || !isPanorama) return;

    const deltaX = e.clientX - dragStartPointerX.current;
    totalDragDistanceRef.current += Math.abs(e.movementX || deltaX);

    let targetCameraX = dragStartCameraX.current - deltaX;

    if (targetCameraX < 0) {
      targetCameraX = targetCameraX * PHYSICS_CONFIG.bounceResistance;
    } else if (targetCameraX > maxCameraX) {
      const over = targetCameraX - maxCameraX;
      targetCameraX = maxCameraX + over * PHYSICS_CONFIG.bounceResistance;
    }

    cameraXRef.current = targetCameraX;
    setCameraX(targetCameraX);

    const now = performance.now();
    const samples = pointerSamplesRef.current.filter((s) => now - s.time <= 100);
    samples.push({ x: e.clientX, time: now });
    pointerSamplesRef.current = samples;
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const samples = pointerSamplesRef.current;
    if (samples.length >= 2) {
      const oldest = samples[0];
      const newest = samples[samples.length - 1];
      const dt = newest.time - oldest.time;
      const dx = newest.x - oldest.x;

      if (dt > 10) {
        let v = (dx / dt) * 16.6;
        v = Math.max(-PHYSICS_CONFIG.maxSpeed, Math.min(PHYSICS_CONFIG.maxSpeed, v));
        velocityRef.current = v;
      }
    }

    pointerSamplesRef.current = [];
    startInertiaLoop();
  };

  const handleHotspotClick = (hs) => {
    if (totalDragDistanceRef.current >= PHYSICS_CONFIG.dragThreshold) return;

    if (hs.action === 'sublocation' && hs.subLocation) {
      const subData = getLocationSublocations(location?.id)?.[hs.subLocation];
      if (subData) {
        stopInertia();
        setSubLocationStack((prev) => [
          ...prev,
          {
            image: subLocationImage || houseImage,
            hotspots: inSubLocation ? subLocationHotspots : hotspots,
            label: currentSubLocation?.label || location?.name || getLocationLabel(location?.id),
          },
        ]);
        setCurrentSubLocation(hs);
        setSubLocationImage(subData.image || '/locations/shop_1.webp');
        setSubLocationHotspots(subData.hotspots || []);
        cameraXRef.current = 0;
        setCameraX(0);
        return;
      }
    }

    if (onAction) onAction(hs.action, hs.label);
  };

  const goBackFromSublocation = () => {
    if (subLocationStack.length === 0) return;
    stopInertia();

    const prev = subLocationStack[subLocationStack.length - 1];
    setSubLocationStack((prevStack) => prevStack.slice(0, -1));
    setCurrentSubLocation(null);

    if (subLocationStack.length === 1) {
      setSubLocationImage(null);
      setSubLocationHotspots([]);
    } else {
      setSubLocationImage(prev.image);
      setSubLocationHotspots(prev.hotspots || []);
    }

    cameraXRef.current = 0;
    setCameraX(0);
  };

  const label =
    currentSubLocation?.label ||
    currentSubLocation?.name ||
    location?.name ||
    getLocationLabel(location?.id) ||
    location?.id;

  const displayImage = subLocationImage || houseImage || '/locations/shop_1.webp';
  const displayHotspots = inSubLocation ? subLocationHotspots : hotspots;

  return (
    <div className="fixed inset-0 z-[350] bg-[#020617] flex flex-col text-white font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {inSubLocation && (
            <button
              onClick={goBackFromSublocation}
              className="p-3 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition-all hover:bg-white/20"
              title="Назад"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="text-left">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">
              {inSubLocation ? 'Подлокация' : 'Локация'}
            </p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter drop-shadow-md">
              {label}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {isPanorama && (
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-xl px-3 py-1 border border-white/10">
              <Move size={12} className="text-cyan-400 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
                Панорама
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-3xl shadow-lg active:scale-90 transition-all backdrop-blur-md"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Screen container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 bg-black overflow-hidden flex items-center"
        style={{
          cursor: isPanorama ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
          touchAction: 'none',
        }}
      >
        {displayImage ? (
          <div
            className="relative h-full flex items-center will-change-transform"
            style={{
              transform: `translate3d(${-cameraX}px, 0, 0)`,
              width: `${scaledWidth}px`,
              height: '100%',
            }}
          >
            <img
              src={displayImage}
              alt={label}
              onError={(e) => {
                // Если картинка не найдена в Vercel, подставляем гарантированно существующий fallback
                if (!e.currentTarget.src.includes('/locations/shop_1.webp')) {
                  e.currentTarget.src = '/locations/shop_1.webp';
                }
              }}
              onLoad={handleImageLoad}
              className="h-full w-auto max-w-none object-cover pointer-events-none block"
              draggable={false}
            />

            {/* Hotspots */}
            {displayHotspots.map((hs) => (
              <div
                key={hs.id}
                style={{
                  position: 'absolute',
                  left: `${hs.x}%`,
                  top: `${hs.y}%`,
                  width: `${hs.w}%`,
                  height: `${hs.h}%`,
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHotspotClick(hs);
                }}
              >
                <div
                  className={`w-full h-full flex items-center justify-center transition-all duration-200 rounded-2xl border ${
                    hs.action === 'sublocation'
                      ? 'bg-cyan-500/25 border-cyan-400/60 shadow-lg shadow-cyan-500/25 hover:bg-cyan-500/40'
                      : hoveredHotspot === hs.id
                      ? 'bg-white/25 border-white/40 shadow-xl'
                      : 'bg-white/10 border-white/20'
                  }`}
                  onMouseEnter={() => setHoveredHotspot(hs.id)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                >
                  <span className="text-sm font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] text-center pointer-events-none select-none px-2 truncate max-w-full">
                    {hs.action === 'sublocation' ? `📍 ${hs.label}` : hs.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f0a]">
            <span className="text-4xl mb-4">📍</span>
            <p className="text-sm font-black uppercase italic text-slate-500">{label}</p>
          </div>
        )}
      </div>

      {/* Panorama indicator */}
      {isPanorama && maxCameraX > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-32 h-1 bg-white/15 rounded-full overflow-hidden pointer-events-none">
          <div
            className="h-full bg-emerald-400/80 rounded-full transition-all duration-75"
            style={{
              width: `${Math.max(15, (viewportWidth / scaledWidth) * 100)}%`,
              transform: `translateX(${(cameraX / maxCameraX) * (128 - Math.max(20, (viewportWidth / scaledWidth) * 128))}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}