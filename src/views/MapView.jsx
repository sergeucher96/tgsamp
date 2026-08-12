import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { supabase } from '../api/supabase';

// Конфигурации и Данные
import { MAP_CONFIG } from '../data/mapConfig';
import { FINAL_LOCATIONS } from '../data/locations'; 
import { WAYPOINTS } from '../data/roads';
import { getHouseStyle } from '../data/houseStyles';

// Сторы
import { usePlayerStore } from '../store/usePlayerStore'; 
import { useTravelStore } from '../store/useTravelStore'; 
import { useHouseStore } from '../store/useHouseStore';
import { useVehicleStore } from '../store/useVehicleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useDeliveryStore } from '../store/useDeliveryStore';
import { getJobByLocation } from '../data/jobsConfig';

// Компоненты (Интерфейсы локаций)
import HouseMenu from '../components/HouseMenu';
import ShowroomMenu from '../components/ShowroomMenu';
import CarShowroom from './CarShowroom';
import ShopView from './ShopView';
import PizzeriaView from './PizzeriaView';
import MineView from './MineView';
import BankView from './BankView';
import ExportView from './ExportView'; // Скупщик руды
import StripClubView from './StripClubView';
import JobView from './JobView';
import DrivingSchoolView from './DrivingSchoolView';
import GunRangeView from './GunRangeView';
import ATMView from './ATMView';
import TuningShopView from './TuningShopView';
import LocationView from './LocationView';
// Иконки
import { 
  Loader2, Crosshair, Navigation, Compass, Target, Search, X, Home 
} from 'lucide-react';

function TravelOverlay({ player, activeVehicle, isMoving, remainingPath, routeTarget, currentPosition, currentRotation }) {
  const animatedPosition = useTravelStore(state => state.animatedPosition);
  const animatedRotation = useTravelStore(state => state.animatedRotation);

  const displayPosition = isMoving && animatedPosition ? animatedPosition : currentPosition;
  const displayRotation = isMoving && animatedRotation != null ? animatedRotation : currentRotation;

  const routePoints = useMemo(() => {
    if (!isMoving || (remainingPath.length === 0 && !routeTarget)) return '';
    return [
      `${displayPosition.x},${displayPosition.y}`,
      ...remainingPath.map(id => `${WAYPOINTS[id]?.x},${WAYPOINTS[id]?.y}`),
      ...(routeTarget ? [`${routeTarget.x},${routeTarget.y}`] : []),
    ].filter(Boolean).join(' ');
  }, [isMoving, remainingPath, routeTarget, displayPosition.x, displayPosition.y]);

  return (
    <>
      {isMoving && routePoints && (
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 12 }} width="6144" height="6144">
          <polyline
            points={routePoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-30 blur-md"
          />
          <polyline
            points={routePoints}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="30 20"
          />
        </svg>
      )}

      <div id="player-car-hub" className="absolute pointer-events-none z-150" style={{ left: `${displayPosition.x}px`, top: `${displayPosition.y}px`, transform: `translate(-50%, -50%) rotate(${displayRotation}deg)` }}>
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 bg-blue-500/20 blur-xl rounded-full -z-10" />
          {activeVehicle ? (
            <img src={`/vehicles/${activeVehicle.model_id}_${activeVehicle.color}_map.png`} className="w-16 h-16 object-contain drop-shadow-2xl" onError={(e) => e.target.src = '/car.png'} />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white">👤</div>
          )}
          <div className="absolute -top-12 bg-blue-600/90 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 shadow-xl" style={{ transform: `rotate(-${displayRotation}deg)` }}>
            <span className="text-[10px] font-black uppercase text-white italic">{player?.username}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function MapView() {
  // --- СОСТОЯНИЯ ---
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [currentScale, setCurrentScale] = useState(0.15);
  const currentScaleRef = useRef(0.15);
  const [isFollowing, setIsFollowing] = useState(true);
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Модальные окна
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedShowroom, setSelectedShowroom] = useState(null);
  const [showShowroom, setShowShowroom] = useState(false);
  const [currentShop, setCurrentShop] = useState(null);
  const [showBank, setShowBank] = useState(false);
  const [showPizzeria, setShowPizzeria] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [showExport, setShowExport] = useState(false); // Скупка
  const [showStripClub, setShowStripClub] = useState(false);
  const [showDrivingSchool, setShowDrivingSchool] = useState(false);
  const [showGunRange, setShowGunRange] = useState(false);
  const [showATM, setShowATM] = useState(false);
  const [showTuningShop, setShowTuningShop] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [locationView, setLocationView] = useState(null); // Локация для открытия 2D картинки
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Long-press travel marker
  const [travelMarker, setTravelMarker] = useState(null);
  const longPressTimer = useRef(null);
  // Поиск / фильтрация
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showHouses, setShowHouses] = useState(true);
  
  // Данные из сторов
  const { player, activeVehicle } = usePlayerStore();
  const isMoving = useTravelStore(state => state.isMoving);
  const startRoute = useTravelStore(state => state.startRoute);
  const remainingPath = useTravelStore(state => state.remainingPath);
  const routeTarget = useTravelStore(state => state.routeTarget);
  const { dbHouses, buyHouse, fetchDbHouses } = useHouseStore();
  const { fetchVehicles } = useVehicleStore();
  const { fetchPlayerInventory } = useInventoryStore();
  const { activeDeliveryJob, goToCustomer, deliverPizza, deliveryMessage } = useDeliveryStore();
  const [showDeliveryCard, setShowDeliveryCard] = useState(true);

  const positionRef = useRef(player ? { x: player.pos_x, y: player.pos_y } : { x: 0, y: 0 });
  const rotationRef = useRef(player?.rotation || 0);
  const pinchRef = useRef();

  const currentPosition = positionRef.current;
  const currentRotation = rotationRef.current;

  // Загрузка данных при входе
  useEffect(() => {
    fetchVehicles();
    fetchDbHouses();
    fetchPlayerInventory();
  }, []);

  // Обновление результатов поиска
  useEffect(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const matches = FINAL_LOCATIONS.filter(loc => {
      if (activeFilter !== 'all' && loc.type !== activeFilter) return false;
      return (loc.name || '').toLowerCase().includes(q) || (loc.id || '').toLowerCase().includes(q) || (loc.desc || '').toLowerCase().includes(q);
    }).slice(0, 12);

    setSearchResults(matches);
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    setShowDeliveryCard(true);
  }, [activeDeliveryJob?.targetHouse?.id, activeDeliveryJob?.status]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const flyToLocation = (loc, zoom = 0.7) => {
    if (!pinchRef.current) return;
    const vw = viewportSize.width;
    const vh = viewportSize.height;
    const targetScale = zoom;
    const newX = (vw / 2) - (loc.x * targetScale);
    const newY = (vh / 2) - (loc.y * targetScale);
    try { pinchRef.current.setTransform(newX, newY, targetScale, 600); } catch(e) { /* ignore */ }
    setIsFollowing(false);
  };

  // Find nearest road waypoint to arbitrary map point
  const findNearestRoadPoint = (mapX, mapY) => {
    let minDist = Infinity;
    let nearest = null;
    for (const id in WAYPOINTS) {
      const wp = WAYPOINTS[id];
      const dist = Math.abs(wp.x - mapX) + Math.abs(wp.y - mapY);
      if (dist < minDist) {
        minDist = dist;
        nearest = id;
      }
    }
    return nearest;
  };

  // Handle long-press on map to set travel destination
  const handleMapLongPress = (e) => {
    if (isMoving) return;
    const scale = currentScaleRef.current;
    const transform = pinchRef.current?.state;
    if (!transform) return;

    const mapX = Math.round((e.clientX - transform.x) / scale);
    const mapY = Math.round((e.clientY - transform.y) / scale);

    const nearestWaypoint = findNearestRoadPoint(mapX, mapY);
    if (nearestWaypoint) {
      setTravelMarker({ x: mapX, y: mapY, waypoint: nearestWaypoint });
    }
  };

  const startTravelToMarker = () => {
    if (!travelMarker) return;
    setIsFollowing(true);
    startRoute(travelMarker.waypoint);
    setTravelMarker(null);
  };

  // --- ЛОГИКА КАМЕРЫ (60 FPS) ---
  const syncCamera = useCallback(() => {
    if (!pinchRef.current || !isFollowing) return;
    const { setTransform } = pinchRef.current;
    const targetScale = isMoving ? 0.8 : 1.2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const newX = (vw / 2) - (positionRef.current.x * targetScale);
    const newY = (vh / 2) - (positionRef.current.y * targetScale);

    setTransform(newX, newY, targetScale, 0);
  }, [isFollowing, isMoving]);

  useEffect(() => {
    if (player) {
      positionRef.current = { x: player.pos_x, y: player.pos_y };
      rotationRef.current = player.rotation || 0;
      if (isFollowing) syncCamera();
    }
  }, [player?.pos_x, player?.pos_y, player?.rotation, isFollowing, syncCamera]);

  useEffect(() => {
    const unsubPosition = useTravelStore.subscribe(state => state.animatedPosition, (value) => {
      if (value) {
        positionRef.current = value;
        if (isFollowing) syncCamera();
      }
    });

    const unsubRotation = useTravelStore.subscribe(state => state.animatedRotation, (value) => {
      if (value != null) rotationRef.current = value;
    });

    return () => {
      unsubPosition();
      unsubRotation();
    };
  }, [isFollowing, syncCamera]);

  return (
    <div className="relative w-full h-screen bg-[#050805] overflow-x-hidden select-none touch-auto text-white font-sans">
      
      {/* --- СЛОЙ ИНТЕРФЕЙСОВ (MODALS) --- */}
      {showExport && <ExportView onClose={() => setShowExport(false)} />}
      {showMine && <MineView onClose={() => setShowMine(null)} />}
      {showBank && <BankView onClose={() => setShowBank(false)} />}
      {showPizzeria && <PizzeriaView onClose={() => setShowPizzeria(false)} />}
      {showStripClub && <StripClubView onClose={() => setShowStripClub(false)} />}
      {showDrivingSchool && <DrivingSchoolView onClose={() => setShowDrivingSchool(false)} />}
      {showGunRange && <GunRangeView onClose={() => setShowGunRange(false)} />}
      {showATM && <ATMView onClose={() => setShowATM(false)} />}
      {showTuningShop && <TuningShopView onClose={() => setShowTuningShop(false)} />}
      {locationView && (
        <LocationView
          location={locationView}
          onClose={() => setLocationView(null)}
          onAction={(action, label) => {
            // Route actions to existing views
            setLocationView(null);
            if (action === 'default') {
              // No hotspots configured — open the default menu for this location type
              if (locationView.type === 'bank') { setShowBank(true); }
              else if (locationView.type === 'shop') { setCurrentShop('shop_24_7'); }
              else if (locationView.id === 'pizzeria_1') { setShowPizzeria(true); }
              else if (locationView.id === 'mine') { setShowMine(true); }
              else if (locationView.id === 'port_ls') { setShowExport(true); }
              else if (locationView.type === 'nightclub') { setShowStripClub(true); }
              else if (locationView.type === 'clothes') { setCurrentShop('clothes_1'); }
              else if (locationView.type === 'tuning') { setShowTuningShop(true); }
              else if (locationView.id === 'driving_1') { setShowDrivingSchool(true); }
              else if (locationView.id === 'guns_1') { setShowGunRange(true); }
              else if (locationView.type === 'atm') { setShowATM(true); }
              else if (getJobByLocation(locationView.id)) { setActiveJobId(getJobByLocation(locationView.id).id); }
            } else {
              // Hotspot action — same routing
              if (locationView.type === 'bank') { setShowBank(true); }
              else if (locationView.type === 'shop') { setCurrentShop('shop_24_7'); }
              else if (locationView.id === 'pizzeria_1') { setShowPizzeria(true); }
              else if (locationView.id === 'mine') { setShowMine(true); }
              else if (locationView.id === 'port_ls') { setShowExport(true); }
              else if (locationView.type === 'nightclub') { setShowStripClub(true); }
              else if (locationView.type === 'clothes') { setCurrentShop('clothes_1'); }
              else if (locationView.type === 'tuning') { setShowTuningShop(true); }
              else if (locationView.id === 'driving_1') { setShowDrivingSchool(true); }
              else if (locationView.id === 'guns_1') { setShowGunRange(true); }
            }
          }}
        />
      )}
      {activeJobId && <JobView jobId={activeJobId} onClose={() => setActiveJobId(null)} />}
      {currentShop && <ShopView shopType={currentShop} player={player} onClose={() => setCurrentShop(null)} />}
      {showShowroom && (
        <CarShowroom 
          playerHouses={dbHouses.filter(h => h.owner_id === player.id)} 
          playerPos={currentPosition}
          showroomPos={{x: 5870, y: 4500}} 
          onClose={() => setShowShowroom(false)} 
        />
      )}
      {selectedShowroom && (
        <ShowroomMenu 
            showroom={selectedShowroom} onClose={() => setSelectedShowroom(null)} 
            onGPS={(l) => { setIsFollowing(true); startRoute(l.id); setSelectedShowroom(null); }}
            isPlayerHere={Math.abs(player.pos_x - selectedShowroom.x) < 30}
            onOpen={() => setShowShowroom(true)}
        />
      )}
      {selectedHouse && (
        <HouseMenu 
          house={selectedHouse} player={player} 
          onBuy={(h) => buyHouse(h)} 
          onGPS={(h) => { setIsFollowing(true); startRoute(h.id); setSelectedHouse(null); }}
          onClose={() => setSelectedHouse(null)} 
        />
      )}

      {/* ЛОАДЕР */}
      {isImgLoading && (
        <div className="absolute inset-0 z-100 flex flex-col items-center justify-center bg-[#020617]">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-blue-500 font-black uppercase text-[10px] mt-4 tracking-[0.4em] animate-pulse">GPS Linking...</p>
        </div>
      )}

      {/* --- ДВИЖОК КАРТЫ --- */}
      <TransformWrapper
        ref={pinchRef}
        initialScale={0.15}
        minScale={MAP_CONFIG.minZoom}
        maxScale={MAP_CONFIG.maxZoom}
        minPositionX={Math.min(viewportSize.width - MAP_CONFIG.width, 0)}
        maxPositionX={0}
        minPositionY={Math.min(viewportSize.height - MAP_CONFIG.height, 0)}
        maxPositionY={0}
        limitToBounds={true}
        centerOnInit={true}
        onTransformed={(ref) => {
          setCurrentScale(ref.state.scale);
          currentScaleRef.current = ref.state.scale;
        }}
        onPinchingStart={() => setIsFollowing(false)}
        onPanningStart={() => setIsFollowing(false)}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%", touchAction: 'none' }}>
          <div className="relative" style={{ width: `${MAP_CONFIG.width}px`, height: `${MAP_CONFIG.height}px` }}>
            <img src="/map.webp" className="absolute inset-0 w-full h-full opacity-60" style={{ filter: 'brightness(0.5) contrast(1.2)', pointerEvents: 'none' }} onLoad={() => setIsImgLoading(false)} />

            {/* Travel marker from long-press */}
            {travelMarker && (
              <div className="absolute pointer-events-none" style={{ left: `${travelMarker.x}px`, top: `${travelMarker.y}px`, transform: 'translate(-50%, -50%)', zIndex: 50 }}>
                <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-white shadow-lg animate-ping absolute" />
                <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-white shadow-lg relative flex items-center justify-center">
                  <Navigation size={10} className="text-black" />
                </div>
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-black/80 backdrop-blur-md border border-yellow-400/30 rounded-xl px-3 py-1.5">
                    <span className="text-[9px] font-black uppercase text-yellow-400 italic">Нажмите для перемещения</span>
                  </div>
                </div>
              </div>
            )}

            <TravelOverlay
              player={player}
              activeVehicle={activeVehicle}
              isMoving={isMoving}
              remainingPath={remainingPath}
              routeTarget={routeTarget}
              currentPosition={currentPosition}
              currentRotation={currentRotation}
            />

            {/* Long-press overlay for travel */}
            <div
              className="absolute inset-0 z-5"
              onMouseDown={(e) => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                longPressTimer.current = setTimeout(() => handleMapLongPress(e), 500);
              }}
              onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
              onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
              onTouchStart={(e) => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                const touch = e.touches[0];
                longPressTimer.current = setTimeout(() => handleMapLongPress(touch), 500);
              }}
              onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            />

            {/* МАРКЕРЫ ОБЪЕКТОВ */}
            <div className="absolute inset-0" style={{ zIndex: 20 }}>
              {FINAL_LOCATIONS.map((loc) => {
                const isNear = Math.abs(currentPosition.x - loc.x) < 30 && Math.abs(currentPosition.y - loc.y) < 30;
                const q = (searchQuery || '').toLowerCase().trim();
                const isHighlighted = q && ((loc.name || '').toLowerCase().includes(q) || (loc.id || '').toLowerCase().includes(q) || searchResults.find(r => r.id === loc.id));
                const isHouse = loc.type === 'house';
                const isDeliveryTarget = loc.id === activeDeliveryJob?.targetHouse?.id;
                // Hide houses when toggle is off
                if (isHouse && !showHouses) return null;

                const dbData = dbHouses.find(h => h.id_name === loc.id);
                const hWithD = { ...loc, owner_id: dbData?.owner_id, is_for_sale: dbData?.is_for_sale };
                const style = isHouse ? getHouseStyle(hWithD, player) : { color: loc.color, border: 'border-white border-[3px]' };
                const showText = currentScale > 0.8 || isNear;
                const showLabel = showText;

                return (
                  <div key={loc.id} className="absolute pointer-events-auto" style={{ left: `${loc.x}px`, top: `${loc.y}px`, transform: 'translate(-50%, -50%)', zIndex: isNear ? 100 : 25 }}>
                    <div className="flex flex-col items-center">
                      <button disabled={isMoving} onClick={(e) => { 
                        e.stopPropagation();
                        if (isDeliveryTarget) {
                          if (activeDeliveryJob.status === 'assigned') {
                            setIsFollowing(true);
                            goToCustomer();
                            return;
                          }
                          if (activeDeliveryJob.status === 'toCustomer') {
                            setIsFollowing(true);
                            startRoute(loc.id);
                            return;
                          }
                          if (activeDeliveryJob.status === 'arrived') {
                            return;
                          }
                        }
                        if (isHouse) setSelectedHouse(hWithD);
                        else if (loc.id === 'showroom_ls') { if (isNear) setShowShowroom(true); else setSelectedShowroom(loc); }
                        else if (isNear) {
                          // Open LocationView for all non-house locations
                          setLocationView(loc);
                        } else {
                          setIsFollowing(true); startRoute(loc.id);
                        }
                      }}
                        className={`relative ${isHouse ? 'w-7 h-7' : 'w-14 h-14'} ${style.color} ${style.border} rounded-xl shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-75 ${isMoving && !isNear ? 'opacity-40 grayscale' : 'opacity-100'} overflow-hidden ${isHighlighted || isDeliveryTarget ? 'ring-4 ring-yellow-400/40 animate-pulse' : ''}`}
                      >
                        <div className="absolute inset-0 glass-shine pointer-events-none" />
                        {isHouse ? <img src="/iconHouse.png" className="w-4 h-4 brightness-200" /> : <span className="text-2xl">{loc.icon}</span>}
                        {isDeliveryTarget && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full shadow-lg animate-pulse" />}
                        {isNear && <div className="absolute inset-0 border-4 border-white animate-marker-pulse rounded-inherit" />}
                      </button>
                      {showLabel && (
                        <div className="mt-2 px-2 py-0.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl text-[8px] font-black text-white italic whitespace-nowrap">
                          {loc.name}{isDeliveryTarget ? ' — Заказ' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>
      
      {/* SEARCH BUTTON - small magnifying glass */}
      <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-3">
        <button
          onClick={() => setIsSearchOpen((open) => !open)}
          className="w-12 h-12 flex items-center justify-center rounded-2xl border border-[#7eff67]/30 bg-[#071006]/95 text-[#d6ff9f] shadow-[0_0_24px_rgba(130,255,100,0.16)] transition hover:bg-[#0b1208] active:scale-90"
        >
          <Search size={22} />
        </button>

        {isSearchOpen && (
          <div className="w-[min(92vw,320px)] bg-[#071006]/95 backdrop-blur-xl border border-[#7eff67]/20 p-3 rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.35)] gta-panel gta-frame">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск локаций..."
              className="w-full bg-[#081108]/95 border border-[#7eff67]/20 p-3 rounded-2xl text-sm outline-none placeholder:text-[#9eff8d] text-[#def1c5]"
            />
            <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
              <button onClick={() => setActiveFilter('all')} className={`px-3 py-2 rounded-2xl ${activeFilter==='all'?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#8ebc88]'}`}>Все</button>
              <button onClick={() => setActiveFilter('shop')} className={`px-3 py-2 rounded-2xl ${activeFilter==='shop'?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#8ebc88]'}`}>Магазины</button>
              <button onClick={() => setActiveFilter('house')} className={`px-3 py-2 rounded-2xl ${activeFilter==='house'?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#8ebc88]'}`}>Дома</button>
              <button onClick={() => setActiveFilter('bank')} className={`px-3 py-2 rounded-2xl ${activeFilter==='bank'?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#8ebc88]'}`}>Банк</button>
              <button onClick={() => setActiveFilter('nightclub')} className={`px-3 py-2 rounded-2xl ${activeFilter==='nightclub'?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#8ebc88]'}`}>Клубы</button>
              <button onClick={() => setActiveFilter('job')} className={`px-3 py-2 rounded-2xl ${activeFilter==='job'?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#8ebc88]'}`}>Работа</button>
              <button onClick={() => setShowHouses(v => !v)} className={`px-3 py-2 rounded-2xl flex items-center gap-1.5 ${showHouses?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#5a7a54]'}`}>
                <Home size={12} /> {showHouses ? 'Дома видны' : 'Дома скрыты'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-52 overflow-y-auto no-scrollbar">
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => { flyToLocation(s); setSearchQuery(''); setSearchResults([]); setIsSearchOpen(false); }}
                    className="p-3 rounded-2xl hover:bg-white/5 cursor-pointer text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{s.icon || '📍'}</span>
                        <div>
                          <div className="font-black uppercase text-[12px]">{s.name}</div>
                          <div className="text-[10px] text-slate-400">{s.id}</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400">{s.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* КНОПКА ФОКУСА */}
      <button onClick={() => { setIsFollowing(true); pinchRef.current.zoomToElement("player-car-hub", 1.2, 600); }}
        className={`absolute bottom-10 right-6 z-50 p-5 rounded-3xl shadow-[0_0_30px_rgba(90,255,95,0.18)] border ${isFollowing ? 'bg-[#2b690d] border-[#8cff4a] text-[#e8ffc4]' : 'bg-[#0f1209] border-[#4b6b3f]/50 text-[#a0c68f]'}`}
      >
        {isFollowing ? <Target size={28} /> : <Crosshair size={28} />}
      </button>

      {/* Travel marker confirm button */}
      {travelMarker && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
          <button
            onClick={startTravelToMarker}
            disabled={isMoving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-6 py-3 rounded-2xl font-black uppercase text-sm shadow-xl active:scale-95 transition-all"
          >
            <Navigation size={18} /> Переместиться сюда
          </button>
          <button
            onClick={() => setTravelMarker(null)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-black uppercase"
          >
            <X size={14} /> Отмена
          </button>
        </div>
      )}

      {activeDeliveryJob && showDeliveryCard && (
        <div className="absolute left-6 bottom-24 z-50 w-[min(92vw,340px)] bg-[#071006]/95 backdrop-blur-xl border border-[#7eff67]/20 p-4 rounded-4xl shadow-[0_30px_80px_rgba(0,0,0,0.4)] gta-panel gta-frame">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#a0ff88] font-black">Текущий заказ</p>
              <p className="text-lg font-black uppercase mt-2 text-[#d6ff9f]">{activeDeliveryJob.targetHouse.name}</p>
            </div>
            <button onClick={() => setShowDeliveryCard(false)} className="p-2 rounded-2xl bg-[#0f1209]/90 text-[#a8d59f] hover:bg-[#1a2310]/90 border border-[#7eff67]/20">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-[#b8e8a3] leading-relaxed">{deliveryMessage || (activeDeliveryJob.status === 'assigned' ? 'Заказ назначен — отправляйтесь к дому клиента.' : activeDeliveryJob.status === 'toCustomer' ? 'Вы движетесь к клиенту.' : activeDeliveryJob.status === 'arrived' ? 'Вы прибыли. Нажмите «Доставить пиццу».': 'Заказ выполнен — возвращайтесь в пиццерию.')}</p>
          <div className="mt-4 flex flex-col gap-2">
            {activeDeliveryJob.status === 'assigned' && (
              <button onClick={() => { setIsFollowing(true); goToCustomer(); }} className="w-full bg-[#3f780e] hover:bg-[#4f9a10] text-[#eef9da] py-3 rounded-3xl font-black uppercase tracking-[0.08em] transition">Поехать к клиенту</button>
            )}
            {activeDeliveryJob.status === 'arrived' && (
              <button onClick={deliverPizza} className="w-full bg-[#4b8c10] hover:bg-[#67bf1e] text-[#eef9da] py-3 rounded-3xl font-black uppercase tracking-[0.08em] transition">Доставить пиццу</button>
            )}
            {activeDeliveryJob.status === 'delivered' && (
              <button onClick={() => { setIsFollowing(true); startRoute(activeDeliveryJob.pickupId); }} className="w-full bg-[#9a5b10] hover:bg-[#b57e12] text-[#fff1d2] py-3 rounded-3xl font-black uppercase tracking-[0.08em] transition">Вернуться в пиццерию</button>
            )}
          </div>
        </div>
      )}

      {/* GPS indicator - minimal */}
      <div className="absolute top-6 left-6 z-50 pointer-events-none">
        <div className={`w-10 h-10 ${isMoving ? 'bg-[#4f8f0f] animate-pulse shadow-[0_0_15px_rgba(115,255,102,0.35)]' : 'bg-[#121a0c]'} rounded-2xl flex items-center justify-center text-[#d9ffb3] border border-[#7eff67]/20`}>
          {isMoving ? <Navigation size={20} className="animate-bounce" /> : <Compass size={20} />}
        </div>
      </div>

    </div>
  );
}