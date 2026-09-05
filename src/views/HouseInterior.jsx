import React, { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useHouseStore } from '../store/useHouseStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useVehicleStore } from '../store/useVehicleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { HOUSE_PREVIEWS_MAP, getHouseHotspots, getHouseImage, getHouseGarageData, getHouseSublocations } from '../data/houseStyles';
import { VEHICLE_DATABASE } from '../data/vehicleConfig';
import KitchenView from './KitchenView';
import InventoryGrid from '../components/InventoryGrid';
import ItemActionMenu from '../components/ItemActionMenu';
import { LogOut, Wallet, ArrowLeft, ParkingCircle, Move } from 'lucide-react';

export default function HouseInterior() {
  const { currentInterior, setInterior, setGarage, exitHouse, exitGarage } = useNavigationStore();
  const { dbHouses, manageSafe } = useHouseStore();
  const { items, houseItems, fetchHouseInventory, fetchPlayerInventory, transferItem, useItem, removeItem } = useInventoryStore();
  const player = usePlayerStore(state => state.player);

  const [selectedItem, setSelectedItem] = useState(null);
  const [houseImage, setHouseImage] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [mode, setMode] = useState('exterior');
  const [navStack, setNavStack] = useState([]);
  const [subLocationImage, setSubLocationImage] = useState(null);
  const [subLocationHotspots, setSubLocationHotspots] = useState([]);
  const [subLocationPositions, setSubLocationPositions] = useState([]);
  const [subLocationLabel, setSubLocationLabel] = useState('');
  const [hotspotPositions, setHotspotPositions] = useState([]);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const [garageHotspotPositions, setGarageHotspotPositions] = useState([]);
  const [garageImage, setGarageImage] = useState(null);
  const [garageHotspots, setGarageHotspots] = useState([]);
  const [garageHoveredHotspot, setGarageHoveredHotspot] = useState(null);
  const [garageMode, setGarageMode] = useState(null);
  const garageImgRef = useRef(null);
  const garageContainerRef = useRef(null);
  const subLocationImgRef = useRef(null);
  const subLocationContainerRef = useRef(null);

  // Panorama state
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanorama, setIsPanorama] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

  const activeVehicle = usePlayerStore(state => state.activeVehicle);
  const setLocalActiveVehicle = usePlayerStore(state => state.setLocalActiveVehicle);
  const { myVehicles } = useVehicleStore();

  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const houseData = dbHouses.find(h => h.id_name === currentInterior);
  const hConfig = HOUSE_CLASSES[houseData?.class] || HOUSE_CLASSES.economy;
  const garageVehicles = (myVehicles || []).filter(v => v.house_id === houseData?.id_name);

  useEffect(() => {
    if (currentInterior) {
      fetchHouseInventory(currentInterior);
      fetchPlayerInventory();
    }
  }, [currentInterior]);

  useEffect(() => {
    if (!houseData) return;
    const cls = houseData.class;
    const imgIdx = houseData.image?.v || 1;
    // Use merged functions that read from localStorage
    const img = getHouseImage(cls, imgIdx);
    setHouseImage(img);
    const hs = getHouseHotspots(cls, imgIdx);
    setHotspots(hs);
    // Reset nav stack when house changes
    setMode('exterior');
    setNavStack([]);
    // Load garage image from localStorage (sublocation) or static data
    const garageData = getHouseGarageData(cls);
    setGarageImage(garageData?.image || null);
    const garageHsList = garageData?.hotspots || {};
    setGarageHotspots(Array.isArray(garageHsList) ? {} : garageHsList);
  }, [houseData]);

  /* Recalculate hotspot positions whenever the image/container size changes */
  useEffect(() => {
    if (mode !== 'exterior' || !imgRef.current || !containerRef.current) return;

    const recalc = () => {
      const container = containerRef.current;
      if (!container || !hotspots.length) return;

      const cW = container.clientWidth;
      const cH = container.clientHeight;
      // object-fill: image stretches 1:1 to container, simple percentage coords
      const positions = hotspots.map(hs => {
        if (hs.type === 'rect') {
          const pos = {
            id: hs.id,
            action: hs.action,
            label: hs.label || '',
            subLocation: hs.subLocation || '',
            left: (hs.x / 100) * cW,
            top: (hs.y / 100) * cH,
            width: (hs.w / 100) * cW,
            height: (hs.h / 100) * cH,
          };
          // console.log('[Recalc] hotspot:', hs.id, 'action:', hs.action, 'subLocation:', hs.subLocation);
          return pos;
        }
        return null;
      }).filter(Boolean);
      setHotspotPositions(positions);
    };

    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [mode, hotspots, houseImage]);

  /* Recalculate garage hotspot positions */
  useEffect(() => {
    if (mode !== 'garage' || !garageImgRef.current || !garageContainerRef.current) return;
    const garageHsList = Object.values(garageHotspots);
    if (!garageHsList.length) return;

    const recalcGarage = () => {
      const container = garageContainerRef.current;
      if (!container) return;

      const cW = container.clientWidth;
      const cH = container.clientHeight;
      // object-fill: simple percentage coords
      const positions = garageHsList.map(hs => {
        if (hs.type === 'rect') {
          return {
            id: hs.id,
            action: hs.action,
            label: hs.label || '',
            left: (hs.x / 100) * cW,
            top: (hs.y / 100) * cH,
            width: (hs.w / 100) * cW,
            height: (hs.h / 100) * cH,
          };
        }
        return null;
      }).filter(Boolean);
      setGarageHotspotPositions(positions);
    };

    recalcGarage();
    window.addEventListener('resize', recalcGarage);
    return () => window.removeEventListener('resize', recalcGarage);
  }, [mode, garageHotspots, garageImage]);

  /* Recalculate sublocation hotspot positions */
  useEffect(() => {
    if (mode !== 'sublocation' || !subLocationImgRef.current || !subLocationContainerRef.current) return;
    if (!subLocationHotspots.length) return;

    const recalcSub = () => {
      const container = subLocationContainerRef.current;
      if (!container) return;
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const positions = subLocationHotspots.map(hs => {
        if (hs.type === 'rect') {
          return {
            id: hs.id,
            action: hs.action,
            label: hs.label || '',
            subLocation: hs.subLocation || '',
            left: (hs.x / 100) * cW,
            top: (hs.y / 100) * cH,
            width: (hs.w / 100) * cW,
            height: (hs.h / 100) * cH,
          };
        }
        return null;
      }).filter(Boolean);
      setSubLocationPositions(positions);
    };

    recalcSub();
    window.addEventListener('resize', recalcSub);
    return () => window.removeEventListener('resize', recalcSub);
  }, [mode, subLocationHotspots, subLocationImage]);

  // Panorama handlers
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

  const handleWheel = (e) => {
    if (!isPanorama) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  };

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

  if (!houseData) return null;

  // Exit: if active vehicle => leave with it. Otherwise leave on foot.
  const handleExitRequest = () => {
    if (!activeVehicle) {
      setLocalActiveVehicle(null);
    }
    exitHouse();
    exitGarage();
  };

  // Park active vehicle into garage (from exterior when arriving in car)
  const handleParkActiveVehicle = async () => {
    if (!activeVehicle) return;
    await useVehicleStore.getState().parkVehicle(activeVehicle.id, houseData.id_name);
  };

  // Park a specific vehicle from the garage list (swap cars)
  const handleParkVehicle = async (vehicleId) => {
    await useVehicleStore.getState().parkVehicle(vehicleId, houseData.id_name);
    await useVehicleStore.getState().fetchVehicles();
  };

  // Drive away with a specific garage car
  const handleDriveGarageCar = async (vehicleId) => {
    await useVehicleStore.getState().leaveGarage(vehicleId);
    exitHouse();
    exitGarage();
  };

  const handleSafeAction = (type) => {
    const msg = type === 'deposit' ? "Введите сумму для внесения в сейф:" : "Введите сумму, которую хотите забрать:";
    const val = window.prompt(msg);
    if (val === null || val.trim() === "") return;
    manageSafe(houseData.id_name, val, type);
  };

  const navigateTo = (newMode) => {
    const current = {
      mode,
      subLocationImage,
      subLocationHotspots,
      subLocationLabel,
      subLocationPositions,
    };
    setNavStack(prev => [...prev, current]);
    if (newMode !== 'sublocation') {
      setSubLocationImage(null);
      setSubLocationHotspots([]);
      setSubLocationPositions([]);
      setSubLocationLabel('');
    }
    setMode(newMode);
  };

  const goBack = () => {
    setNavStack(prevStack => {
      if (prevStack.length === 0) { setMode('exterior'); return []; }
      const previous = prevStack[prevStack.length - 1];
      setMode(previous.mode);
      setSubLocationImage(previous.subLocationImage);
      setSubLocationHotspots(previous.subLocationHotspots);
      setSubLocationLabel(previous.subLocationLabel);
      return prevStack.slice(0, -1);
    });
  };

  const handleHotspotClick = (pos) => {
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
        setSubLocationImage(subData.image);
        setSubLocationHotspots(subData.hotspots || []);
        setSubLocationPositions([]);
        setSubLocationLabel(pos.subLocation);
        navigateTo('sublocation');
      }
    }
  };

  const goBackFromSublocation = () => {
    goBack();
  };

  const handleGarageHotspotClick = (action) => {
    if (action === 'exit') {
      goBack();
    } else if (action === 'drive') {
      handleExitInGarage();
    }
  };

  // Exit from garage: use active vehicle or first garage car
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

  // ===== GARAGE SUBLOCATION =====
  if (mode === 'garage') {
    return (
      <div className="h-full w-full bg-[#050814] text-white overflow-hidden font-sans relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-left">
            <button onClick={goBack} className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1 active:opacity-70">
              <ArrowLeft size={14} /> Назад
            </button>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Гараж</p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{houseData.name}</h2>
          </div>
          <button onClick={handleExitInGarage} className="p-4 bg-emerald-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all"><LogOut /></button>
        </div>

        {/* Park active vehicle button */}
        {activeVehicle && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 bg-[#0c1220]/90 backdrop-blur-md border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-black uppercase">{VEHICLE_DATABASE?.[activeVehicle.model_id]?.name || activeVehicle.model_id}</p>
              <p className="text-[9px] text-slate-500">{activeVehicle.plate}</p>
            </div>
            <button onClick={handleParkActiveVehicle}
              className="bg-blue-600 hover:bg-blue-500 py-2 px-4 rounded-xl text-xs font-black uppercase flex items-center gap-2 active:scale-95">
              <ParkingCircle size={14} /> Запарковать
            </button>
          </div>
        )}

        {/* Garage vehicles list */}
        {garageVehicles.length > 0 && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-[min(90vw,400px)] bg-[#0c1220]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 max-h-48 overflow-y-auto no-scrollbar">
            {garageVehicles.map(veh => {
              const cfg = VEHICLE_DATABASE[veh.model_id];
              return (
                <div key={veh.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-black uppercase italic">{cfg?.name || veh.model_id}</p>
                    <p className="text-[10px] text-slate-400">{veh.plate}</p>
                  </div>
                  {activeVehicle?.id === veh.id ? (
                    <span className="text-xs text-emerald-400 font-black uppercase">Активна</span>
                  ) : (
                    <button onClick={() => handleDriveGarageCar(veh.id)}
                      className="bg-emerald-600 py-2 px-3 rounded-xl text-[10px] font-black uppercase active:scale-95">
                      Выехать
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Garage image with hotspots */}
        <div
          ref={garageContainerRef}
          className="absolute inset-0 bg-black overflow-hidden"
          onMouseDown={isPanorama ? handleMouseDown : undefined}
          onMouseMove={isPanorama ? handleMouseMove : undefined}
          onMouseUp={isPanorama ? handleMouseUp : undefined}
          onMouseLeave={isPanorama ? handleMouseUp : undefined}
          onWheel={isPanorama ? handleWheel : undefined}
          onTouchStart={isPanorama ? handleTouchStart : undefined}
          onTouchMove={isPanorama ? handleTouchMove : undefined}
          onTouchEnd={isPanorama ? handleTouchEnd : undefined}
          style={{ cursor: isPanorama ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {garageImage ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: isPanorama ? `translate(${panX}px, ${panY}px) scale(${zoom})` : undefined,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <img
                ref={garageImgRef}
                src={garageImage}
                alt="Гараж"
                className="max-w-none max-h-none"
                style={{
                  width: isPanorama ? 'auto' : '100%',
                  height: isPanorama ? 'auto' : '100%',
                  objectFit: isPanorama ? 'none' : 'fill',
                  pointerEvents: isPanorama ? 'none' : 'auto',
                }}
                onLoad={() => {
                  if (garageImgRef.current && garageContainerRef.current) {
                    const img = garageImgRef.current;
                    const container = garageContainerRef.current;
                    const cW = container.clientWidth;
                    const cH = container.clientHeight;
                    const nW = img.naturalWidth;
                    const nH = img.naturalHeight;
                    setImageNaturalSize({ width: nW, height: nH });
                    if (nW > 0 && nH > 0 && nW / nH > 1.5) {
                      setIsPanorama(true);
                    } else {
                      setIsPanorama(false);
                    }
                    const imageScale = nW / nH > 1.5 ? cH / nH : Math.max(cW / nW, cH / nH);
                    const displayWidth = nW * imageScale;
                    const displayHeight = nH * imageScale;
                    const garageHsList = Object.values(garageHotspots);
                    const positions = garageHsList.map(hs => {
                      if (hs.type === 'rect') {
                        return {
                          id: hs.id,
                          action: hs.action,
                          label: hs.label || '',
                          left: (hs.x / 100) * displayWidth,
                          top: (hs.y / 100) * displayHeight,
                          width: (hs.w / 100) * displayWidth,
                          height: (hs.h / 100) * displayHeight,
                        };
                      }
                      return null;
                    }).filter(Boolean);
                    setGarageHotspotPositions(positions);
                  }
                }}
              />
              {garageHotspotPositions.map((pos) => (
                <div
                  key={pos.id}
                  style={{ position: 'absolute', left: `${pos.left}px`, top: `${pos.top}px`, width: `${pos.width}px`, height: `${pos.height}px`, cursor: 'pointer' }}
                  onClick={(e) => {
                    if (isPanorama && isDragging) return;
                    handleGarageHotspotClick(pos.action);
                  }}
                >
                  <div className={`w-full h-full flex items-center justify-center transition-all duration-200 rounded-2xl ${hoveredHotspot === pos.id ? 'bg-white/20' : 'bg-white/10'}`}
                    onMouseEnter={() => setGarageHoveredHotspot(pos.id)}
                    onMouseLeave={() => setGarageHoveredHotspot(null)}
                  >
                    <span className="text-sm font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center pointer-events-none select-none">
                      {pos.label}
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

  // ===== EXTERIOR VIEW =====
  if (mode === 'exterior') {
    return (
      <div className="h-full w-full bg-[#050814] text-white overflow-hidden font-sans relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-left">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Моя недвижимость</p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{houseData.name}</h2>
          </div>
          <button onClick={handleExitRequest} className="p-4 bg-red-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all"><LogOut /></button>
        </div>

        {/* Parking panel for active vehicle (always shown when arriving on car) */}
        {activeVehicle && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-[#0c1220]/90 backdrop-blur-md border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-black uppercase">{VEHICLE_DATABASE?.[activeVehicle.model_id]?.name || activeVehicle.model_id}</p>
              <p className="text-[9px] text-slate-500">{activeVehicle.plate}</p>
            </div>
            <button onClick={handleParkActiveVehicle}
              className="bg-blue-600 hover:bg-blue-500 py-2 px-4 rounded-xl text-xs font-black uppercase flex items-center gap-2 active:scale-95">
              <ParkingCircle size={14} /> Запарковать
            </button>
            <button onClick={() => {}}
              className="text-slate-400 text-xs font-black uppercase py-2 px-3 active:opacity-70">
              Закрыть
            </button>
          </div>
        )}

        {/* Fullscreen image */}
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
          style={{ cursor: isPanorama ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {houseImage && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: isPanorama ? `translate(${panX}px, ${panY}px) scale(${zoom})` : undefined,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <img
                ref={imgRef}
                src={houseImage}
                alt={houseData.name}
                className="max-w-none max-h-none"
                style={{
                  width: isPanorama ? 'auto' : '100%',
                  height: isPanorama ? 'auto' : '100%',
                  objectFit: isPanorama ? 'none' : 'fill',
                  pointerEvents: isPanorama ? 'none' : 'auto',
                }}
                onLoad={() => {
                  if (imgRef.current && containerRef.current) {
                    const img = imgRef.current;
                    const container = containerRef.current;
                    const cW = container.clientWidth;
                    const cH = container.clientHeight;
                    const nW = img.naturalWidth;
                    const nH = img.naturalHeight;
                    setImageNaturalSize({ width: nW, height: nH });
                    if (nW > 0 && nH > 0 && nW / nH > 1.5) {
                      setIsPanorama(true);
                    } else {
                      setIsPanorama(false);
                    }
                    const imageScale = nW / nH > 1.5 ? cH / nH : Math.max(cW / nW, cH / nH);
                    const displayWidth = nW * imageScale;
                    const displayHeight = nH * imageScale;
                    const positions = hotspots.map(hs => {
                      if (hs.type === 'rect') {
                        return {
                          id: hs.id,
                          action: hs.action,
                          label: hs.label || '',
                          subLocation: hs.subLocation || '',
                          left: (hs.x / 100) * displayWidth,
                          top: (hs.y / 100) * displayHeight,
                          width: (hs.w / 100) * displayWidth,
                          height: (hs.h / 100) * displayHeight,
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
                  style={{ position: 'absolute', left: `${pos.left}px`, top: `${pos.top}px`, width: `${pos.width}px`, height: `${pos.height}px`, cursor: 'pointer' }}
                  onClick={(e) => {
                    if (isPanorama && isDragging) return;
                    handleHotspotClick(pos);
                  }}
                >
                  <div className={`w-full h-full flex items-center justify-center transition-all duration-200 rounded-2xl ${
                    pos.action === 'sublocation'
                      ? 'bg-cyan-500/20 border border-cyan-400/40'
                      : hoveredHotspot === pos.id ? 'bg-white/20' : 'bg-white/10'
                  }`}
                    onMouseEnter={() => setHoveredHotspot(pos.id)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                  >
                    <span className="text-sm font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center pointer-events-none select-none">
                      {pos.action === 'sublocation' ? `📍 ${pos.label}` : pos.label}
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

  // ===== SUBLOCATION VIEW =====
  if (mode === 'sublocation') {
    return (
      <div className="h-full w-full bg-[#050814] text-white overflow-hidden font-sans relative">
        <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-left">
            <button onClick={goBackFromSublocation} className="flex items-center gap-2 text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-1 active:opacity-70">
              <ArrowLeft size={14} /> Назад
            </button>
            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">Подлокация</p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{subLocationLabel}</h2>
          </div>
          <button onClick={handleExitRequest} className="p-4 bg-red-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all"><LogOut /></button>
        </div>

        <div
          ref={subLocationContainerRef}
          className="absolute inset-0 bg-black overflow-hidden"
          onMouseDown={isPanorama ? handleMouseDown : undefined}
          onMouseMove={isPanorama ? handleMouseMove : undefined}
          onMouseUp={isPanorama ? handleMouseUp : undefined}
          onMouseLeave={isPanorama ? handleMouseUp : undefined}
          onWheel={isPanorama ? handleWheel : undefined}
          onTouchStart={isPanorama ? handleTouchStart : undefined}
          onTouchMove={isPanorama ? handleTouchMove : undefined}
          onTouchEnd={isPanorama ? handleTouchEnd : undefined}
          style={{ cursor: isPanorama ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {subLocationImage ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: isPanorama ? `translate(${panX}px, ${panY}px) scale(${zoom})` : undefined,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <img
                ref={subLocationImgRef}
                src={subLocationImage}
                alt={subLocationLabel}
                className="max-w-none max-h-none"
                style={{
                  width: isPanorama ? 'auto' : '100%',
                  height: isPanorama ? 'auto' : '100%',
                  objectFit: isPanorama ? 'none' : 'fill',
                  pointerEvents: isPanorama ? 'none' : 'auto',
                }}
                onLoad={() => {
                  if (subLocationImgRef.current && subLocationContainerRef.current) {
                    const img = subLocationImgRef.current;
                    const container = subLocationContainerRef.current;
                    const cW = container.clientWidth;
                    const cH = container.clientHeight;
                    const nW = img.naturalWidth;
                    const nH = img.naturalHeight;
                    setImageNaturalSize({ width: nW, height: nH });
                    if (nW > 0 && nH > 0 && nW / nH > 1.5) {
                      setIsPanorama(true);
                    } else {
                      setIsPanorama(false);
                    }
                    const imageScale = nW / nH > 1.5 ? cH / nH : Math.max(cW / nW, cH / nH);
                    const displayWidth = nW * imageScale;
                    const displayHeight = nH * imageScale;
                    const positions = subLocationHotspots.map(hs => {
                      if (hs.type === 'rect') {
                        return {
                          id: hs.id,
                          action: hs.action,
                          label: hs.label || '',
                          subLocation: hs.subLocation || '',
                          left: (hs.x / 100) * displayWidth,
                          top: (hs.y / 100) * displayHeight,
                          width: (hs.w / 100) * displayWidth,
                          height: (hs.h / 100) * displayHeight,
                        };
                      }
                      return null;
                    }).filter(Boolean);
                    setSubLocationPositions(positions);
                  }
                }}
              />
              {subLocationPositions.map((pos) => (
                <div
                  key={pos.id}
                  style={{ position: 'absolute', left: `${pos.left}px`, top: `${pos.top}px`, width: `${pos.width}px`, height: `${pos.height}px`, cursor: 'pointer' }}
                  onClick={(e) => {
                    if (isPanorama && isDragging) return;
                    handleHotspotClick(pos);
                  }}
                >
                  <div className={`w-full h-full flex items-center justify-center transition-all duration-200 rounded-2xl ${
                    pos.action === 'sublocation'
                      ? 'bg-cyan-500/20 border border-cyan-400/40'
                      : hoveredHotspot === pos.id ? 'bg-white/20' : 'bg-white/10'
                  }`}
                    onMouseEnter={() => setHoveredHotspot(pos.id)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                  >
                    <span className="text-sm font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center pointer-events-none select-none">
                      {pos.action === 'sublocation' ? `📍 ${pos.label}` : pos.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              <p className="text-sm font-black uppercase">Загрузите картинку подлокации</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== KITCHEN VIEW =====
  if (mode === 'kitchen') {
    return <KitchenView onClose={goBack} houseId={houseData?.id_name} />;
  }

  // ===== INTERIOR VIEW =====
  return (
    <div className="h-full w-full bg-[#050814] flex flex-col text-white overflow-hidden font-sans animate-in fade-in duration-500">
      {selectedItem && (
        <ItemActionMenu 
          item={selectedItem} location="house" onClose={() => setSelectedItem(null)}
          onUse={(it) => { useItem(it); setSelectedItem(null); }}
          onDrop={(it) => { if(window.confirm("Выбросить этот предмет?")) removeItem(it.id, it.amount); setSelectedItem(null); }}
          onTransfer={(it) => {
            const toType = it.storage_type === 'player' ? 'house' : 'player';
            const toOwner = it.storage_type === 'player' ? houseData.id_name : player.id;
            transferItem(it.id, toType, toOwner);
            setSelectedItem(null);
          }}
        />
      )}

      <div className="shrink-0 p-8 flex justify-between items-center bg-gradient-to-b from-blue-600/20 to-transparent border-b border-white/5">
        <div className="text-left">
          <button onClick={goBack} className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1 active:opacity-70">
            <ArrowLeft size={14} /> Назад
          </button>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Моя недвижимость</p>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{houseData.name}</h2>
        </div>
        <button onClick={handleExitRequest} className="p-4 bg-red-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all"><LogOut /></button>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-6 pb-32">
          <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[32px] flex justify-between items-center shadow-xl">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500"><Wallet /></div>
                <div>
                  <span className="block font-black uppercase italic text-xs text-slate-400">Баланс сейфа</span>
                  <span className="text-xl font-black text-white">${houseData.safe_balance?.toLocaleString() || 0}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSafeAction('deposit')} className="bg-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic active:scale-90">Положить</button>
                <button onClick={() => handleSafeAction('withdraw')} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic active:scale-90 border border-white/10">Взять</button>
              </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white/[0.02] p-4 rounded-[32px] border border-white/5">
                <InventoryGrid label="Ваша сумка" items={items} slotsCount={player?.inv_slots || 12} onAction={(it) => setSelectedItem(it)} />
            </div>
            <div className="bg-white/[0.02] p-4 rounded-[32px] border border-white/5">
                <InventoryGrid label="Шкаф дома" items={houseItems} slotsCount={hConfig.wardrobe_slots} onAction={(it) => setSelectedItem(it)} />
            </div>
          </div>
          <div className="h-20 shrink-0"></div>
      </div>
    </div>
  );
}