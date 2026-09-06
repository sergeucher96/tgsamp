import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useHouseStore } from '../store/useHouseStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useVehicleStore } from '../store/useVehicleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { HOUSE_CLASSES } from '../data/houseConfig';
import {
  HOUSE_PREVIEWS_MAP,
  getHouseHotspots,
  getHouseImage,
  getHouseGarageData,
  getHouseSublocations,
} from '../data/houseStyles';
import { VEHICLE_DATABASE } from '../data/vehicleConfig';
import KitchenView from './KitchenView';
import InventoryGrid from '../components/InventoryGrid';
import ItemActionMenu from '../components/ItemActionMenu';
import { LogOut, ArrowLeft, ParkingCircle, Move } from 'lucide-react';

const PHYSICS_CONFIG = {
  friction: 0.93,
  springStiffness: 0.18,
  bounceResistance: 0.32,
  maxSpeed: 45,
  stopVelocity: 0.05,
  dragThreshold: 6,
};

export default function HouseInterior() {
  const { currentInterior, exitHouse, exitGarage } = useNavigationStore();
  const { dbHouses } = useHouseStore();
  const { houseItems, fetchHouseInventory, fetchPlayerInventory } = useInventoryStore();

  const [selectedItem, setSelectedItem] = useState(null);
  const [houseImage, setHouseImage] = useState('/houses/eco_1.webp');
  const [hotspots, setHotspots] = useState([]);
  const [mode, setMode] = useState('exterior');
  const [navStack, setNavStack] = useState([]);

  // Sublocations
  const [subLocationImage, setSubLocationImage] = useState(null);
  const [subLocationHotspots, setSubLocationHotspots] = useState([]);
  const [subLocationLabel, setSubLocationLabel] = useState('');
  const [subRatio, setSubRatio] = useState(16 / 9);

  // Garage
  const [garageImage, setGarageImage] = useState('/houses/eco_1_int.webp');
  const [garageHotspots, setGarageHotspots] = useState([]);
  const [garageHoveredHotspot, setGarageHoveredHotspot] = useState(null);
  const [garageRatio, setGarageRatio] = useState(16 / 9);

  const [hoveredHotspot, setHoveredHotspot] = useState(null);

  // Vehicles
  const activeVehicle = usePlayerStore((state) => state.activeVehicle);
  const setLocalActiveVehicle = usePlayerStore((state) => state.setLocalActiveVehicle);
  const { myVehicles } = useVehicleStore();

  const houseData = dbHouses.find((h) => h.id_name === currentInterior);
  const garageVehicles = (myVehicles || []).filter((v) => v.house_id === houseData?.id_name);

  // Камера и физика
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
  }, [mode]);

  useEffect(() => {
    if (!houseData) return;
    const cls = houseData.class;
    const imgIdx = houseData.image?.v || 1;

    const img = getHouseImage(cls, imgIdx) || '/houses/eco_1.webp';
    setHouseImage(img);

    const hs = getHouseHotspots(cls, imgIdx);
    setHotspots(hs || []);

    setMode('exterior');
    setNavStack([]);

    stopInertia();
    cameraXRef.current = 0;
    setCameraX(0);

    const garageData = getHouseGarageData(cls);
    setGarageImage(garageData?.image || '/houses/eco_1_int.webp');
    const garageHsList = garageData?.hotspots || {};
    setGarageHotspots(Array.isArray(garageHsList) ? garageHsList : Object.values(garageHsList));
  }, [houseData]);

  useEffect(() => {
    if (currentInterior) {
      fetchHouseInventory(currentInterior);
      fetchPlayerInventory();
    }
  }, [currentInterior]);

  const handleExteriorImageLoad = (e) => {
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

  const navigateTo = (newMode) => {
    stopInertia();
    setNavStack((prev) => [
      ...prev,
      {
        mode,
        subLocationImage,
        subLocationHotspots,
        subLocationLabel,
      },
    ]);

    if (newMode !== 'sublocation') {
      setSubLocationImage(null);
      setSubLocationHotspots([]);
      setSubLocationLabel('');
    }

    cameraXRef.current = 0;
    setCameraX(0);
    setMode(newMode);
  };

  const goBack = () => {
    stopInertia();
    setNavStack((prevStack) => {
      if (prevStack.length === 0) {
        setMode('exterior');
        return [];
      }
      const previous = prevStack[prevStack.length - 1];
      setMode(previous.mode);
      setSubLocationImage(previous.subLocationImage);
      setSubLocationHotspots(previous.subLocationHotspots);
      setSubLocationLabel(previous.subLocationLabel);
      return prevStack.slice(0, -1);
    });

    cameraXRef.current = 0;
    setCameraX(0);
  };

  const handleHotspotClick = (pos) => {
    if (totalDragDistanceRef.current >= PHYSICS_CONFIG.dragThreshold) return;

    if (pos.action === 'enter') {
      navigateTo('interior');
    } else if (pos.action === 'garage') {
      navigateTo('garage');
    } else if (pos.action === 'kitchen') {
      navigateTo('kitchen');
    } else if (pos.action === 'sublocation' && pos.subLocation) {
      const subs = getHouseSublocations(houseData.class);
      const subData = subs[pos.subLocation];
      if (subData) {
        setSubLocationImage(subData.image || '/houses/eco_1_int.webp');
        setSubLocationHotspots(subData.hotspots || []);
        setSubLocationLabel(pos.subLocation);
        navigateTo('sublocation');
      }
    }
  };

  const handleGarageHotspotClick = (action) => {
    if (totalDragDistanceRef.current >= PHYSICS_CONFIG.dragThreshold) return;
    if (action === 'exit') {
      goBack();
    } else if (action === 'drive') {
      handleExitInGarage();
    }
  };

  const handleExitInGarage = async () => {
    if (activeVehicle) {
      exitHouse();
      exitGarage();
      return;
    }
    if (garageVehicles.length > 0) {
      await useVehicleStore.getState().leaveGarage(garageVehicles[0].id);
      exitHouse();
      exitGarage();
    }
  };

  const handleExitRequest = () => {
    if (!activeVehicle) {
      setLocalActiveVehicle(null);
    }
    exitHouse();
    exitGarage();
  };

  const handleParkActiveVehicle = async () => {
    if (!activeVehicle) return;
    await useVehicleStore.getState().parkVehicle(activeVehicle.id, houseData.id_name);
  };

  if (!houseData) return null;

  // РЕНДЕР: ГАРАЖ
  if (mode === 'garage') {
    const garageHsList = Array.isArray(garageHotspots) ? garageHotspots : Object.values(garageHotspots);
    return (
      <div className="h-full w-full bg-[#050814] text-white overflow-hidden font-sans relative select-none">
        <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="text-left pointer-events-auto">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1 active:opacity-70"
            >
              <ArrowLeft size={14} /> Назад
            </button>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Гараж</p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{houseData.name}</h2>
          </div>
          <button
            onClick={handleExitInGarage}
            className="p-4 bg-emerald-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all pointer-events-auto"
          >
            <LogOut />
          </button>
        </div>

        <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
          {garageImage ? (
            <div
              className="relative h-full flex items-center justify-center shrink-0"
              style={{ aspectRatio: `${garageRatio}`, maxHeight: '100%' }}
            >
              <img
                src={garageImage}
                alt="Garage"
                onError={() => setGarageImage('/houses/eco_1_int.webp')}
                onLoad={(e) => setGarageRatio((e.target.naturalWidth || 16) / (e.target.naturalHeight || 9))}
                className="w-full h-full object-contain pointer-events-none block"
                draggable={false}
              />
              {garageHsList.map((hs) => (
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
                  onClick={() => handleGarageHotspotClick(hs.action)}
                >
                  <div
                    className={`w-full h-full flex items-center justify-center transition-all duration-200 rounded-2xl ${
                      garageHoveredHotspot === hs.id ? 'bg-white/25 border border-white/40' : 'bg-white/10 border border-white/20'
                    }`}
                    onMouseEnter={() => setGarageHoveredHotspot(hs.id)}
                    onMouseLeave={() => setGarageHoveredHotspot(null)}
                  >
                    <span className="text-sm font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center pointer-events-none select-none">
                      {hs.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              <p className="text-sm font-black uppercase">Загрузите картинку гаража</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // РЕНДЕР: ПОДЛОКАЦИЯ
  if (mode === 'sublocation') {
    return (
      <div className="h-full w-full bg-[#050814] text-white overflow-hidden font-sans relative select-none">
        <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="text-left pointer-events-auto">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-1 active:opacity-70"
            >
              <ArrowLeft size={14} /> Назад
            </button>
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Подлокация</p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
              {subLocationLabel || 'Комната'}
            </h2>
          </div>
          <button
            onClick={handleExitRequest}
            className="p-4 bg-red-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all pointer-events-auto"
          >
            <LogOut />
          </button>
        </div>

        <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
          {subLocationImage && (
            <div
              className="relative h-full flex items-center justify-center shrink-0"
              style={{ aspectRatio: `${subRatio}`, maxHeight: '100%' }}
            >
              <img
                src={subLocationImage}
                alt="Sublocation"
                onError={() => setSubLocationImage('/houses/eco_1_int.webp')}
                onLoad={(e) => setSubRatio((e.target.naturalWidth || 16) / (e.target.naturalHeight || 9))}
                className="w-full h-full object-contain pointer-events-none block"
                draggable={false}
              />
              {subLocationHotspots.map((hs) => (
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
                  onClick={() => handleHotspotClick(hs)}
                >
                  <div className="w-full h-full flex items-center justify-center transition-all duration-200 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/35">
                    <span className="text-sm font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center pointer-events-none select-none">
                      📍 {hs.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // РЕНДЕР: ОСНОВНОЙ ЭКРАН ДОМА
  if (mode === 'exterior') {
    return (
      <div className="h-full w-full bg-[#020617] text-white overflow-hidden font-sans relative select-none">
        <div className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="text-left pointer-events-auto">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Моя недвижимость</p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white drop-shadow-md">
              {houseData.name}
            </h2>
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
              onClick={handleExitRequest}
              className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-3xl shadow-lg active:scale-90 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {activeVehicle && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-[#0c1220]/90 backdrop-blur-md border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-black uppercase">
                {VEHICLE_DATABASE?.[activeVehicle.model_id]?.name || activeVehicle.model_id}
              </p>
              <p className="text-[9px] text-slate-500">{activeVehicle.plate}</p>
            </div>
            <button
              onClick={handleParkActiveVehicle}
              className="bg-blue-600 hover:bg-blue-500 py-2 px-4 rounded-xl text-xs font-black uppercase flex items-center gap-2 active:scale-95"
            >
              <ParkingCircle size={14} /> Запарковать
            </button>
            <button onClick={() => {}} className="text-slate-400 text-xs font-black uppercase py-2 px-3 active:opacity-70">
              Закрыть
            </button>
          </div>
        )}

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
          {houseImage && (
            <div
              className="relative h-full flex items-center will-change-transform"
              style={{
                transform: `translate3d(${-cameraX}px, 0, 0)`,
                width: `${scaledWidth}px`,
                height: '100%',
              }}
            >
              <img
                src={houseImage}
                alt={houseData.name}
                onError={() => setHouseImage('/houses/eco_1.webp')}
                onLoad={handleExteriorImageLoad}
                className="h-full w-auto max-w-none object-cover pointer-events-none block"
                draggable={false}
              />

              {hotspots.map((hs) => (
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
          )}
        </div>

        {isPanorama && maxCameraX > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-32 h-1 bg-white/15 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-cyan-400/80 rounded-full transition-all duration-75"
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

  // РЕНДЕР: ШКАФ
  if (mode === 'interior') {
    return (
      <div className="h-full w-full bg-[#050814] text-white p-6 relative select-none">
        <button onClick={goBack} className="flex items-center gap-2 text-blue-400 font-bold mb-4">
          <ArrowLeft size={16} /> Назад
        </button>
        <h2 className="text-xl font-bold">Шкаф / Интерьер</h2>
        <div className="mt-4">
          <InventoryGrid items={houseItems} onItemClick={(it) => setSelectedItem(it)} />
        </div>
        {selectedItem && <ItemActionMenu item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </div>
    );
  }

  // РЕНДЕР: КУХНЯ (переданы и onClose, и onBack для полной совместимости)
  if (mode === 'kitchen') {
    return <KitchenView onClose={goBack} onBack={goBack} houseId={currentInterior} />;
  }

  return null;
}