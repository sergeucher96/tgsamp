import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { supabase } from '../api/supabase';

// Конфигурации и Данные
import { MAP_CONFIG } from '../data/mapConfig';
import { getMergedLocations, refreshFinalLocations } from '../data/locations';
import { WAYPOINTS } from '../data/roads';
import { getHouseStyle, getHouseIcon } from '../data/houseStyles';

// Сторы
import { usePlayerStore } from '../store/usePlayerStore'; 
import { useTravelStore } from '../store/useTravelStore'; 
import { useBusStore } from '../store/useBusStore';
import { useHouseStore } from '../store/useHouseStore';
import { useVehicleStore } from '../store/useVehicleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useDeliveryStore } from '../store/useDeliveryStore';
import { useTruckerStore } from '../store/useTruckerStore';
import { useLspdStore } from '../store/useLspdStore';
import { useNavigationStore } from '../store/useNavigationStore';
import { useJobStore } from '../store/useJobStore';
import { getJobByLocation, JOBS_DATABASE } from '../data/jobsConfig';
import { RESOURCE_TYPES } from '../data/businessConfig';
import { isImageIcon } from '../utils/iconHelper';

// Компоненты (Интерфейсы локаций)
import HouseMenu from '../components/HouseMenu';
import ShowroomMenu from '../components/ShowroomMenu';
import CarShowroom from './CarShowroom';
import ShopView from './ShopView';
import PizzeriaView from './PizzeriaView';
import MineView from './MineView';
import FishingPortView from './FishingPortView';
import FarmView from './FarmView';
import FactoryView from './FactoryView';
import OilRigView from './OilRigView';
import WorkshopView from './WorkshopView';
import TruckerView from './TruckerView';
import CafeteriaView from './CafeteriaView';
import BankView from './BankView';
import ExportView from './ExportView'; // Скупщик руды
import StripClubView from './StripClubView';
import JobView from './JobView';
import DrivingSchoolView from './DrivingSchoolView';
import GunRangeView from './GunRangeView';
import BoxClubView from './BoxClubView';
import ATMView from './ATMView';
import TuningShopView from './TuningShopView';
import LocationView from './LocationView';
import HotelView from './HotelView';
import BusinessView from './BusinessView';
import BusDepotView from './BusDepotView';
import LspdView from './LspdView';
import MafiaView from './MafiaView';
import { OrganizationPanel } from './OrganizationView';
// Иконки
import { 
  Loader2, Crosshair, Navigation, Compass, Target, Search, X, Home 
} from 'lucide-react';

function TravelOverlay({ player, activeVehicle, isMoving, remainingPath, routeTarget, currentPosition, currentRotation }) {
  const animatedPosition = useTravelStore(state => state.animatedPosition);
  const animatedRotation = useTravelStore(state => state.animatedRotation);
  const busRouteRunning = useBusStore(state => state.routeRunning);
  const busAwaitingRepeat = useBusStore(state => state.awaitingRepeat);
  const patrolRouteRunning = useLspdStore(state => state.patrolRouteRunning);
  const patrolAwaitingRepeat = useLspdStore(state => state.awaitingRepeat);
  const garbageShift = useJobStore(state => state.activeShift);

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

  const isGarbageActive = garbageShift?.kind === 'garbage';
  const garbageCapacity = isGarbageActive ? garbageShift.capacity : 0;
  const garbageMax = isGarbageActive ? (JOBS_DATABASE[garbageShift.jobId]?.capacity || 1000) : 1000;
  const garbagePercent = Math.min(100, (garbageCapacity / garbageMax) * 100);

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
          {busRouteRunning || busAwaitingRepeat ? (
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-3xl shadow-2xl">
              🚌
            </div>
          ) : patrolRouteRunning || patrolAwaitingRepeat ? (
            <div className="w-20 h-20 relative flex items-center justify-center shadow-2xl">
              <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-3xl border-2 border-blue-400 relative z-10">
                🚔
              </div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-3 flex gap-2 z-20">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>
          ) : isGarbageActive ? (
            <div className="w-16 h-16 bg-lime-600 rounded-full flex items-center justify-center text-3xl shadow-2xl border-2 border-lime-300">
              🗑️
            </div>
          ) : activeVehicle ? (
            <img src={`/vehicles/${activeVehicle.model_id}_${activeVehicle.color}_map.png`} className="w-16 h-16 object-contain drop-shadow-2xl" onError={(e) => e.target.src = '/car.png'} />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white">👤</div>
          )}
          <div className="absolute -top-12 bg-blue-600/90 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 shadow-xl" style={{ transform: `rotate(-${displayRotation}deg)` }}>
            <span className="text-[10px] font-black uppercase text-white italic">{player?.username}</span>
          </div>
          {isGarbageActive && (
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="bg-lime-900/90 backdrop-blur-md border border-lime-500/30 rounded-xl px-3 py-2 shadow-xl flex flex-col items-center gap-1">
                <span className="text-[9px] font-black uppercase text-lime-300 italic">{garbageCapacity} / {garbageMax} кг</span>
                <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-lime-500 transition-all duration-700" style={{ width: `${garbagePercent}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function MapView() {
  const { setInterior } = useNavigationStore();

  // --- СОСТОЯНИЯ ---
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [currentScale, setCurrentScale] = useState(0.15);
  const currentScaleRef = useRef(0.15);
  const [isFollowing, setIsFollowing] = useState(true);
  const isFollowingRef = useRef(true);
  useEffect(() => { isFollowingRef.current = isFollowing; }, [isFollowing]);
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [mergedLocations, setMergedLocations] = useState(() => getMergedLocations());

  useEffect(() => {
    const handler = () => {
      setMergedLocations(getMergedLocations());
      refreshFinalLocations();
    };
    window.addEventListener('roadEditorLocationsUpdated', handler);
    return () => window.removeEventListener('roadEditorLocationsUpdated', handler);
  }, []);

  // Модальные окна
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedShowroom, setSelectedShowroom] = useState(null);
  const [showShowroom, setShowShowroom] = useState(false);
  const [currentShop, setCurrentShop] = useState(null);
  const [showBank, setShowBank] = useState(false);
  const [showPizzeria, setShowPizzeria] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [showFishingPort, setShowFishingPort] = useState(false);
  const [showFarm, setShowFarm] = useState(false);
  const [showFactory, setShowFactory] = useState(false);
  const [showOilRig, setShowOilRig] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [showTrucker, setShowTrucker] = useState(false);
  const [showCafeteria, setShowCafeteria] = useState(false);
  const [cafeteriaBusinessId, setCafeteriaBusinessId] = useState(null);
  const [showExport, setShowExport] = useState(false); // Скупка
  const [showStripClub, setShowStripClub] = useState(false);
  const [showDrivingSchool, setShowDrivingSchool] = useState(false);
  const [showGunRange, setShowGunRange] = useState(false);
  const [showBoxClub, setShowBoxClub] = useState(false);
  const [showATM, setShowATM] = useState(false);
  const [showTuningShop, setShowTuningShop] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [showBusDepot, setShowBusDepot] = useState(false);
  const [showLspd, setShowLspd] = useState(false);
  const [showMafia, setShowMafia] = useState(false);
  const [showHospital, setShowHospital] = useState(false);
  const [locationView, setLocationView] = useState(null); // Локация для открытия 2D картинки
  const [selectedHotel, setSelectedHotel] = useState(null); // Выбранный отель (hotel_3, hotel_4)
  const [selectedBusiness, setSelectedBusiness] = useState(null); // Выбранный бизнес
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Long-press travel marker
  const [travelMarker, setTravelMarker] = useState(null);
  const longPressTimer = useRef(null);
  // Поиск / фильтрация
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showHouses, setShowHouses] = useState(true);
  const [showEmptyTruck, setShowEmptyTruck] = useState(false);
  
  // Bus route completion popup
  const busAwaitingRepeat = useBusStore(state => state.awaitingRepeat);
  const busCurrentRoute = useBusStore(state => state.currentRoute);
  const busRouteRunning = useBusStore(state => state.routeRunning);
  const busRepeatRoute = useBusStore(state => state.repeatRoute);
  const busStopRoute = useBusStore(state => state.stopRoute);
  const [showBusPopup, setShowBusPopup] = useState(false);

  useEffect(() => {
    if (busAwaitingRepeat) setShowBusPopup(true);
  }, [busAwaitingRepeat]);

  // Patrol route completion popup
  const patrolAwaitingRepeat = useLspdStore(state => state.awaitingRepeat);
  const patrolRouteRunning = useLspdStore(state => state.patrolRouteRunning);
  const patrolCurrentRoute = useLspdStore(state => state.patrolRoute);
  const patrolRepeatRoute = useLspdStore(state => state.repeatPatrolRoute);
  const patrolStopRoute = useLspdStore(state => state.stopPatrolRoute);
  const [showPatrolPopup, setShowPatrolPopup] = useState(false);

  useEffect(() => {
    if (patrolAwaitingRepeat && !patrolRouteRunning) setShowPatrolPopup(true);
  }, [patrolAwaitingRepeat, patrolRouteRunning]);

  const patrolLocationRef = useRef(null);

  // When bus route starts, close all overlays and follow the bus on the map
  useEffect(() => {
    if (busRouteRunning) {
      if (locationView && locationView.id === 'bus_depot') {
        busDepotLocationRef.current = locationView;
      }
      setShowBusDepot(false);
      setLocationView(null);
      setIsFollowing(true);
    } else if (busDepotLocationRef.current) {
      // Route completed or stopped - do NOT restore LocationView,
      // keep player on the map so the popup is visible
      busDepotLocationRef.current = null;
    }
  }, [busRouteRunning]);

  // Keep camera following when bus route is awaiting repeat
  useEffect(() => {
    if (busAwaitingRepeat && !busRouteRunning) {
      setIsFollowing(true);
    }
  }, [busAwaitingRepeat, busRouteRunning]);

  // When patrol route starts, close overlays and follow on the map
  useEffect(() => {
    if (patrolRouteRunning) {
      if (locationView && locationView.id === 'lspd') {
        patrolLocationRef.current = locationView;
      }
      setShowLspd(false);
      setLocationView(null);
      setIsFollowing(true);
    } else if (patrolLocationRef.current) {
      patrolLocationRef.current = null;
    }
  }, [patrolRouteRunning]);

  // Keep camera following when patrol route is awaiting repeat
  useEffect(() => {
    if (patrolAwaitingRepeat && !patrolRouteRunning) {
      setIsFollowing(true);
    }
  }, [patrolAwaitingRepeat, patrolRouteRunning]);

  // Данные из сторов
  const { player, activeVehicle } = usePlayerStore();
  const isMoving = useTravelStore(state => state.isMoving);
  const startRoute = useTravelStore(state => state.startRoute);
  const remainingPath = useTravelStore(state => state.remainingPath);
  const routeTarget = useTravelStore(state => state.routeTarget);
  const garbageShift = useJobStore(state => state.activeShift);
  const selectBin = useJobStore(state => state.selectBin);
  const collectGarbage = useJobStore(state => state.collectGarbage);
  const skipBin = useJobStore(state => state.skipBin);
  const freeDrive = useJobStore(state => state.freeDrive);
  const { dbHouses, buyHouse, fetchDbHouses } = useHouseStore();
  const { fetchVehicles } = useVehicleStore();
  const { fetchPlayerInventory } = useInventoryStore();
  const { activeDeliveryJob, goToCustomer, deliverPizza, deliveryMessage } = useDeliveryStore();
  const { cameras, loadCameras } = useLspdStore();
  const [showDeliveryCard, setShowDeliveryCard] = useState(true);
  
  // Load cameras on mount
  useEffect(() => {
    loadCameras();
  }, []);

  // При прибытии на базу мусорщиков (через «Вернуться на базу») — открываем локацию базы,
  // где находится хотспот «Разгрузить». Закрываем JobView чтобы он не перекрывал LocationView.
  useEffect(() => {
    if (garbageShift?.kind === 'garbage' && garbageShift.status === 'at_base') {
      const loc = FINAL_LOCATIONS.find((l) => l.id === 'garbage_depot');
      setActiveJobId(null);
      if (loc) setLocationView(loc);
      useJobStore.setState({ activeShift: { ...useJobStore.getState().activeShift, status: 'selecting' } });
    }
  }, [garbageShift?.status]);

  // При завершении поездки (isMoving стал false) — проверяем pendingDelivery и показываем модалку разгрузки
  const pendingDelivery = useTruckerStore(state => state.pendingDelivery);
  const completeDelivery = useTruckerStore(state => state.completeDelivery);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryAmount, setDeliveryAmountVal] = useState(1);

  // Track previous isMoving to detect arrival
  const prevIsMovingRef = useRef(true);
  useEffect(() => {
    // When travel finishes (isMoving went from true to false) and there's a pending delivery
    if (prevIsMovingRef.current && !isMoving && pendingDelivery) {
      setDeliveryAmountVal(pendingDelivery.maxAmount);
      setDeliveryModalOpen(true);
    }
    prevIsMovingRef.current = isMoving;
  }, [isMoving, pendingDelivery]);

  const positionRef = useRef(player ? { x: player.pos_x, y: player.pos_y } : { x: 0, y: 0 });
  const rotationRef = useRef(player?.rotation || 0);
  const pinchRef = useRef();
  const busDepotLocationRef = useRef(null);

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

    const matches = mergedLocations.filter(loc => {
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

  // Expose closeAllViews globally for delivery flow
  const closeAllViews = () => {
    setLocationView(null);
    setSelectedHouse(null);
    setSelectedShowroom(null);
    setShowShowroom(false);
    setCurrentShop(null);
    setShowBank(false);
    setShowPizzeria(false);
    setShowMine(false);
    setShowFishingPort(false);
    setShowFarm(false);
    setShowFactory(false);
    setShowOilRig(false);
    setShowWorkshop(false);
    setShowTrucker(false);
    setShowCafeteria(false);
    setShowExport(false);
    setShowStripClub(false);
    setActiveJobId(null);
    setShowDrivingSchool(false);
    setShowGunRange(false);
    setShowBoxClub(false);
    setShowATM(false);
    setShowTuningShop(false);
    setSelectedHotel(null);
    setSelectedBusiness(null);
    setShowBusDepot(false);
    setShowLspd(false);
    setShowMafia(false);
    setShowHospital(false);
  };
  useEffect(() => {
    window.closeAllMapViewViews = closeAllViews;
    window.setMapViewFollowing = setIsFollowing;
    return () => { delete window.closeAllMapViewViews; delete window.setMapViewFollowing; };
  }, []);

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
    if (isMoving) {
      // Во время смены мусорщика можно прервать текущий маршрут
      if (garbageShift?.kind === 'garbage' && garbageShift.status !== 'selecting') {
        freeDrive();
      } else {
        return;
      }
    }
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

  // --- CAMERA FOLLOW (60 FPS) ---
  // Continuous camera loop — always reads latest state via refs and store.getState()
  useEffect(() => {
    // Keep positionRef in sync with player
    const unsubPosition = useTravelStore.subscribe(state => state.animatedPosition, (value) => {
      if (value) positionRef.current = value;
    });
    const unsubRotation = useTravelStore.subscribe(state => state.animatedRotation, (value) => {
      if (value != null) rotationRef.current = value;
    });

    let animFrameId;
    function cameraLoop() {
      if (isFollowingRef.current && pinchRef.current) {
        const travelState = useTravelStore.getState();
        const busRunning = useBusStore.getState().routeRunning;
        const busWaiting = useBusStore.getState().awaitingRepeat;
        const patrolRunning = useLspdStore.getState().patrolRouteRunning;
        const patrolWaiting = useLspdStore.getState().awaitingRepeat;

        const isAnimating = travelState.isMoving || busRunning || patrolRunning;
        const targetPos = (travelState.animatedPosition && isAnimating)
          ? travelState.animatedPosition
          : positionRef.current;
        const targetScale = isAnimating ? 0.8 : 1.2;

        const { setTransform } = pinchRef.current;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const newX = (vw / 2) - (targetPos.x * targetScale);
        const newY = (vh / 2) - (targetPos.y * targetScale);
        setTransform(newX, newY, targetScale, 0);
      }
      animFrameId = requestAnimationFrame(cameraLoop);
    }
    animFrameId = requestAnimationFrame(cameraLoop);

    return () => {
      unsubPosition();
      unsubRotation();
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  // Keep refs in sync when player profile updates
  useEffect(() => {
    if (player) {
      positionRef.current = { x: player.pos_x, y: player.pos_y };
      rotationRef.current = player.rotation || 0;
    }
  }, [player?.pos_x, player?.pos_y, player?.rotation]);

  return (
    <div className="relative w-full h-screen bg-[#050805] overflow-x-hidden select-none touch-auto text-white font-sans">
      
      {/* --- СЛОЙ ИНТЕРФЕЙСОВ (MODALS) --- */}
      {showExport && <ExportView onClose={() => setShowExport(false)} />}
      {showMine && <MineView onClose={() => setShowMine(null)} />}
      {showFishingPort && <FishingPortView onClose={() => setShowFishingPort(false)} />}
      {showFarm && <FarmView onClose={() => setShowFarm(false)} />}
      {showOilRig && <OilRigView onClose={() => setShowOilRig(false)} />}
      {showFactory && <FactoryView onClose={() => setShowFactory(false)} />}
      {showWorkshop && <WorkshopView onClose={() => setShowWorkshop(false)} />}
      {showTrucker && <TruckerView onClose={() => setShowTrucker(false)} />}

      {/* Delivery unload modal — appears after arrival at business */}
      {deliveryModalOpen && pendingDelivery && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-6" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="w-full max-w-sm bg-[#0a0f1a] border border-white/10 rounded-[32px] p-6">
            <h3 className="text-lg font-black uppercase italic mb-4 text-green-400">🏭 Прибыли на объект</h3>
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-1">Заказчик</p>
              <p className="font-black">{pendingDelivery.businessName}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-1">Ресурс</p>
              <p className="font-black">{RESOURCE_TYPES[pendingDelivery.resourceType]?.icon || '�'} {RESOURCE_TYPES[pendingDelivery.resourceType]?.name || pendingDelivery.resourceType}</p>
            </div>
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">
                Сколько разгрузить? (макс. {pendingDelivery.maxAmount})
              </label>
              <input
                type="number"
                min="1"
                max={pendingDelivery.maxAmount}
                value={deliveryAmount}
                onChange={(e) => setDeliveryAmountVal(Math.max(1, Math.min(parseInt(e.target.value) || 1, pendingDelivery.maxAmount)))}
                className="w-full bg-black/50 border border-green-500/30 rounded-2xl px-4 py-3 text-white font-black text-center text-xl"
              />
            </div>
            <div className="mb-4 p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">Цена за единицу</span>
                <span className="font-black text-amber-400">${Math.round(pendingDelivery.pricePerUnit)}/ед</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-slate-500">Ваш доход</span>
                <span className="font-black text-green-400 text-xl">${Math.round(deliveryAmount * pendingDelivery.pricePerUnit)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  useTruckerStore.getState().cancelDelivery();
                  setDeliveryModalOpen(false);
                }}
                className="flex-1 py-3 rounded-[32px] text-sm font-black uppercase italic border border-white/10 bg-white/5"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  const amount = Math.max(1, Math.min(deliveryAmount, pendingDelivery.maxAmount));
                  const success = await completeDelivery(amount);
                  if (success) setDeliveryModalOpen(false);
                }}
                className="flex-1 py-3 rounded-[32px] text-sm font-black uppercase italic bg-green-600 active:scale-95"
              >
                Разгрузить
              </button>
            </div>
          </div>
        </div>
      )}

      {showCafeteria && cafeteriaBusinessId && <CafeteriaView businessId={cafeteriaBusinessId} onClose={() => { setShowCafeteria(false); setCafeteriaBusinessId(null); }} />}
      {showBank && <BankView onClose={() => setShowBank(false)} />}
      {showPizzeria && <PizzeriaView onClose={() => setShowPizzeria(false)} />}
      {showStripClub && <StripClubView onClose={() => setShowStripClub(false)} />}
      {showDrivingSchool && <DrivingSchoolView onClose={() => setShowDrivingSchool(false)} />}
      {showGunRange && <GunRangeView onClose={() => setShowGunRange(false)} />}
      {showBoxClub && <BoxClubView onClose={() => setShowBoxClub(false)} />}
      {showTuningShop && <TuningShopView onClose={() => setShowTuningShop(false)} />}
      {selectedHotel && <HotelView hotelId={selectedHotel} onClose={() => setSelectedHotel(null)} />}
      {selectedBusiness && <BusinessView businessId={selectedBusiness} onClose={() => setSelectedBusiness(null)} />}
      {showBusDepot && <BusDepotView onClose={() => setShowBusDepot(false)} />}
      {showLspd && <LspdView onClose={() => setShowLspd(false)} />}
      {showMafia && <MafiaView onClose={() => setShowMafia(false)} />}
      {showHospital && <OrganizationPanel orgId='hospital' onClose={() => setShowHospital(false)} />}
      {locationView && (
        <LocationView
          location={locationView}
          onClose={() => setLocationView(null)}
            onAction={(action) => {
              const loc = locationView;
              if (action === 'unload_garbage') {
                setLocationView(null);
                const state = useJobStore.getState();
                const shift = state.activeShift;
                if (state.isProcessing) {
                  useJobStore.getState().set({ jobMessage: 'Подождите, действие уже выполняется...' });
                  return;
                }
                if (shift?.kind !== 'garbage' || shift.capacity <= 0) {
                  setShowEmptyTruck(true);
                  return;
                }
                (async () => {
                  await state.performUnload();
                })();
                return;
              }
             // Действия поверх LocationView (не закрываем картинку локации)
             if (action === 'atm' || action === 'open_atm') { setShowATM(true); return; }
            if (action === 'buy_business') { setSelectedBusiness(loc.id); return; }
            if (action === 'open_hotel') { setSelectedHotel(loc.id); return; }
            // Enter/Default — маршрутизация по типу локации
            if (action === 'enter' || action === 'default' || action === 'refuel') {
              if (loc.type === 'bank') { setShowBank(true); }
              else if (loc.type === 'shop') { setCurrentShop(loc.id); }
              else if (loc.id === 'pizzeria_1') { setShowPizzeria(true); }
              else if (loc.id === 'mine') { setShowMine(true); }
              else if (loc.id === 'fishing_port') { setShowFishingPort(true); }
              else if (loc.type === 'farm') { setShowFarm(true); }
              else if (loc.type === 'oil_rig') { setShowOilRig(true); }
              else if (loc.type === 'factory') { setShowFactory(true); }
              else if (loc.type === 'workshop') { setShowWorkshop(true); }
              else if (loc.type === 'trucker') { setShowTrucker(true); }
              else if (loc.id === 'port_ls') { setShowExport(true); }
              else if (loc.type === 'nightclub') { setShowStripClub(true); }
              else if (loc.type === 'clothes') { setCurrentShop(loc.id); }
              else if (loc.type === 'tuning') { setShowTuningShop(true); }
               else if (loc.id === 'driving_1' || loc.id === 'driving_school_1') { setShowDrivingSchool(true); }
               else if (loc.id === 'guns_1' || loc.id === 'gun_range_1') { setShowGunRange(true); }
               else if (loc.id === 'box_club') { setShowBoxClub(true); }
              else if (loc.type === 'atm') { setShowATM(true); }
              else if (loc.type === 'hotel') { setSelectedHotel(loc.id); }
              else if (loc.type === 'bar') { setCurrentShop(loc.id); }
              else if (loc.type === 'gas') { setCurrentShop(loc.id); }
              else if (loc.type === 'parking') { alert('Парковка — скоро открытие'); }
              else if (loc.type === 'gym') { alert('Спортзал — скоро открытие'); }
               else if (loc.id === 'bus_depot') { setShowBusDepot(true); }
               else if (loc.type === 'lspd') { setShowLspd(true); }
               else if (loc.type === 'mafia') { setShowMafia(true); }
               else if (loc.type === 'hospital') { setShowHospital(true); }
               else if (loc.type === 'farm') { setShowFarm(true); }
              else if (loc.type === 'cafeteria') { setShowCafeteria(true); setCafeteriaBusinessId(loc.id); }
              else if (loc.type === 'showroom' || loc.id === 'showroom_ls') { setShowShowroom(true); }
              else if (getJobByLocation(loc.id)) { setActiveJobId(getJobByLocation(loc.id).id); }
              return;
            }
            // Fallback: try type-based routing for any other action
            if (loc.id === 'bus_depot') { setShowBusDepot(true); return; }
            if (loc.type === 'bank') { setShowBank(true); return; }
            else if (loc.type === 'shop') { setCurrentShop(loc.id); return; }
            else if (loc.id === 'pizzeria_1') { setShowPizzeria(true); return; }
            else if (loc.id === 'mine') { setShowMine(true); return; }
            else if (loc.id === 'fishing_port') { setShowFishingPort(true); return; }
             else if (loc.type === 'farm') { setShowFarm(true); }
             else if (loc.type === 'oil_rig') { setShowOilRig(true); }
             else if (loc.type === 'factory') { setShowFactory(true); }
             else if (loc.type === 'workshop') { setShowWorkshop(true); }
            else if (loc.type === 'trucker') { setShowTrucker(true); }
            else if (loc.id === 'port_ls') { setShowExport(true); return; }
            else if (loc.type === 'nightclub') { setShowStripClub(true); return; }
            else if (loc.type === 'clothes') { setCurrentShop(loc.id); return; }
            else if (loc.type === 'tuning') { setShowTuningShop(true); return; }
             else if (loc.id === 'driving_1' || loc.id === 'driving_school_1') { setShowDrivingSchool(true); return; }
             else if (loc.id === 'guns_1' || loc.id === 'gun_range_1') { setShowGunRange(true); return; }
             else if (loc.id === 'box_club') { setShowBoxClub(true); return; }
            else if (loc.type === 'atm') { setShowATM(true); return; }
            else if (loc.type === 'hotel') { setSelectedHotel(loc.id); return; }
             else if (loc.type === 'lspd') { setShowLspd(true); return; }
             else if (loc.type === 'mafia') { setShowMafia(true); return; }
             else if (loc.type === 'hospital') { setShowHospital(true); return; }
              else if (loc.type === 'farm') { setShowFarm(true); return; }
             else if (loc.type === 'oil_rig') { setShowOilRig(true); return; }
             else if (loc.type === 'factory') { setShowFactory(true); return; }
            else if (loc.type === 'workshop') { setShowWorkshop(true); return; }
            else if (loc.type === 'trucker') { setShowTrucker(true); return; }
            else if (loc.type === 'cafeteria') { setShowCafeteria(true); setCafeteriaBusinessId(loc.id); return; }
            else if (loc.type === 'showroom' || loc.id === 'showroom_ls') { setShowShowroom(true); return; }
            else if (getJobByLocation(loc.id)) { setActiveJobId(getJobByLocation(loc.id).id); return; }
          }}
        />
      )}
      {showATM && <ATMView onClose={() => setShowATM(false)} />}
      {currentShop && <ShopView shopType={currentShop} player={player} onClose={() => setCurrentShop(null)} />}
      {activeJobId && <JobView jobId={activeJobId} onClose={() => setActiveJobId(null)} />}
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
        onPinchingStart={() => {
          if (!useBusStore.getState().routeRunning) setIsFollowing(false);
        }}
        onPanningStart={() => {
          if (!useBusStore.getState().routeRunning) setIsFollowing(false);
        }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%", touchAction: 'none' }}>
          <div className="relative" style={{ width: `${MAP_CONFIG.width}px`, height: `${MAP_CONFIG.height}px` }}>
            <img src="/map.webp" className="absolute inset-0 w-full h-full opacity-60" style={{ filter: 'brightness(0.5) contrast(1.2)', pointerEvents: 'none' }} onLoad={() => setIsImgLoading(false)} onError={() => setIsImgLoading(false)} />

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
              {mergedLocations.map((loc) => {
                const isNear = Math.abs(currentPosition.x - loc.x) < 30 && Math.abs(currentPosition.y - loc.y) < 30;
                const q = (searchQuery || '').toLowerCase().trim();
                const isHighlighted = q && ((loc.name || '').toLowerCase().includes(q) || (loc.id || '').toLowerCase().includes(q) || searchResults.find(r => r.id === loc.id));
                const isHouse = loc.type === 'house';
                const isDeliveryTarget = loc.id === activeDeliveryJob?.targetHouse?.id;
                const hasCamera = cameras.some(cam => cam.location_id === loc.id);
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
                      <button
                        disabled={isMoving && !garbageShift?.kind}
                        onClick={(e) => {
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
                        if (isHouse) {
                          const isMyHouse = hWithD.owner_id === player?.id;
                          if (isMyHouse && isNear) {
                            setInterior(hWithD.id);
                          } else {
                            setSelectedHouse(hWithD);
                          }
                         }
                         else if (garbageShift?.kind === 'garbage' && garbageShift.status !== 'selecting') {
                          // Если мусорщик находится у контейнера или едет к нему — сбрасываем статус и едем куда надо
                          if (isNear) {
                            freeDrive(loc.id);
                            setLocationView(loc);
                          } else {
                            freeDrive(loc.id);
                            setIsFollowing(true);
                            startRoute(loc.id);
                          }
                        }
                        else if (isNear) {
                          // Open LocationView for ALL non-house locations
                          setLocationView(loc);
                        } else {
                          setIsFollowing(true); startRoute(loc.id);
                        }
                      }}
                        className={`relative ${isHouse ? 'w-7 h-7' : 'w-14 h-14'} ${isImageIcon(loc.icon) ? 'bg-transparent border border-white/10' : `${style.color} ${style.border}`} rounded-xl shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-75 ${isMoving && !isNear ? 'opacity-40 grayscale' : 'opacity-100'} overflow-hidden ${isHighlighted || isDeliveryTarget ? 'ring-4 ring-yellow-400/40 animate-pulse' : ''}`}
                      >
                        <div className="absolute inset-0 glass-shine pointer-events-none" />
                        {isImageIcon(loc.icon) ? (
                          <img src={loc.icon} className={`object-contain ${isHouse ? 'w-5 h-5' : 'w-10 h-10'}`} />
                        ) : isHouse ? (
                          <img src={getHouseIcon(hWithD, player) || "/iconHouse.png"} className={`object-contain ${getHouseIcon(hWithD, player) ? 'w-6 h-6' : 'w-4 h-4'}`} />
                        ) : (
                          <span className="text-2xl">{loc.icon || '📌'}</span>
                        )}
                        {hasCamera && !isHouse && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10">
                            <span className="text-xs">📹</span>
                          </div>
                        )}
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
             {/* МАРКЕРЫ МУСОРОК */}
            {garbageShift?.kind === 'garbage' && garbageShift.activeBins && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 22 }}>
                {garbageShift.activeBins.map((binId, index) => {
                  const wp = WAYPOINTS[binId];
                  if (!wp) return null;
                  const isCurrent = garbageShift.status === 'selecting' || garbageShift.status === 'driving_to_bin' || garbageShift.status === 'at_bin';
                  const isPassed = binId !== garbageShift.selectedBinId && (garbageShift.status === 'to_base' || garbageShift.status === 'driving_to_base');
                  const canSelect = garbageShift.status === 'selecting' && !isPassed && garbageShift.capacity < (JOBS_DATABASE[garbageShift.jobId]?.capacity || 1000);
                  return (
                    <div key={binId} className="absolute pointer-events-auto" style={{ left: `${wp.x}px`, top: `${wp.y}px`, transform: 'translate(-50%, -50%)', zIndex: isCurrent ? 25 : 20 }}>
                      <button
                        onClick={() => canSelect && selectBin(binId)}
                        disabled={!canSelect}
                        className={`w-10 h-10 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-lg transition-all ${isCurrent ? 'bg-lime-500 animate-pulse' : canSelect ? 'bg-lime-500 hover:bg-lime-400 active:scale-90 cursor-pointer' : isPassed ? 'bg-lime-700/60 cursor-not-allowed' : 'bg-lime-900/80 cursor-not-allowed'}`}
                      >
                        🗑️
                      </button>
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1">
                          <span className="text-[8px] font-black uppercase text-lime-300 italic">#{index + 1}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
              <button onClick={() => setActiveFilter('hotel')} className={`px-3 py-2 rounded-2xl ${activeFilter==='hotel'?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#8ebc88]'}`}>Отели</button>
              <button onClick={() => { setActiveFilter(''); }} className={`px-3 py-2 rounded-2xl ${activeFilter===''?'bg-[#7eff67]/20 text-[#d6ff9f]':'bg-[#111610]/80 text-[#8ebc88]'}`}>Бизнесы</button>
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

      {/* Модалка: машина пустая */}
      {showEmptyTruck && (
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-6">
          <div className="w-[min(92vw,360px)] bg-[#071006]/98 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] space-y-4">
            <p className="text-sm font-black uppercase text-slate-200 text-center">Ваша машина пустая</p>
            <button onClick={() => setShowEmptyTruck(false)} className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-black uppercase active:scale-95">ОК</button>
          </div>
        </div>
      )}

      {/* Подсказка для мусорщика */}
      {garbageShift?.kind === 'garbage' && garbageShift.status === 'selecting' && garbageShift.capacity < (JOBS_DATABASE[garbageShift.jobId]?.capacity || 1000) && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,360px)] bg-lime-900/95 backdrop-blur-xl border border-lime-500/30 p-4 rounded-[28px] shadow-[0_20px_80px_rgba(0,0,0,0.5)] text-center space-y-2">
          <p className="text-sm font-black uppercase text-lime-200">Выберите мусорку, подъедьте и соберите мусор</p>
          <p className="text-[11px] text-lime-300/80">Кузов: {garbageShift.capacity || 0} / {JOBS_DATABASE[garbageShift.jobId]?.capacity || 1000} кг. Для движения нажмите и держите на карте.</p>
        </div>
      )}

      {/* Попап сбора мусора */}
      {garbageShift?.kind === 'garbage' && garbageShift.status === 'at_bin' && (
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-6">
          <div className="w-[min(92vw,400px)] bg-[#071006]/98 backdrop-blur-xl border border-lime-500/20 p-6 rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-lime-500/20 rounded-2xl flex items-center justify-center text-2xl">🗑️</div>
                <div>
                  <p className="text-sm font-black uppercase text-lime-200">Контейнер найден</p>
                  <p className="text-xs text-slate-400">Подъезд выполнен</p>
                </div>
              </div>
            </div>
            <div className="bg-black/30 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">В контейнере</span>
                <span className="text-base font-black text-lime-400 italic">{garbageShift.lastBinAmount || 0} кг</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">В кузове</span>
                <span className="text-sm font-black text-slate-300">{garbageShift.capacity || 0} / {JOBS_DATABASE[garbageShift.jobId]?.capacity || 1000} кг</span>
              </div>
            </div>
            {garbageShift.collecting ? (
              <div className="space-y-2">
                <p className="text-xs text-lime-300 text-center">Сбор мусора...</p>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-lime-500 transition-all duration-100" style={{ width: `${garbageShift.collectProgress || 0}%` }} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button onClick={collectGarbage} className="w-full bg-lime-600 hover:bg-lime-500 text-white py-5 rounded-2xl font-black uppercase italic text-base transition active:scale-95">
                  Собрать мусор
                </button>
                <button onClick={skipBin} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-black uppercase text-sm transition active:scale-95">
                  Пропустить
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Таймер разгрузки мусоровоза */}
      {garbageShift?.kind === 'garbage' && garbageShift.unloading && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center pointer-events-none p-6">
          <div className="w-[min(92vw,400px)] bg-[#071006]/95 backdrop-blur-xl border border-amber-500/30 p-6 rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-2xl animate-pulse">🗑️</div>
              <div>
                <p className="text-sm font-black uppercase text-amber-200">Разгрузка мусоровоза</p>
                <p className="text-xs text-slate-400">Подождите, идёт выгрузка...</p>
              </div>
            </div>
            <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-100" style={{ width: `${garbageShift.unloadProgress || 0}%` }} />
            </div>
            <p className="text-xs text-slate-400">Осталось: {Math.max(0, Math.ceil((100 - (garbageShift.unloadProgress || 0)) / 10))} с</p>
          </div>
        </div>
      )}

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

      {/* Bus route completion popup */}
      {showBusPopup && busCurrentRoute && (
        <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-6">
          <div className="w-[min(92vw,400px)] bg-[#071006]/98 backdrop-blur-xl border border-[#7eff67]/20 p-6 rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl">✅</div>
                <div>
                  <p className="text-sm font-black uppercase text-emerald-200">{busCurrentRoute.name}</p>
                  <p className="text-xs text-slate-400">Маршрут завершён!</p>
                </div>
              </div>
              <button onClick={() => { setShowBusPopup(false); useBusStore.getState().dismissRoutePopup(); }}
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white active:scale-90">
                <X size={18} />
              </button>
            </div>
            <div className="bg-black/30 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Заработано</span>
                <span className="text-base font-black text-emerald-400 italic">+{busCurrentRoute.pay[0].toLocaleString()}$–{busCurrentRoute.pay[1].toLocaleString()}$</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Опыт</span>
                <span className="text-sm font-black text-blue-400">+{busCurrentRoute.exp} XP</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">Едем ещё раз?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { busRepeatRoute(); setShowBusPopup(false); }}
                disabled={(player?.energy || 0) < 2}
                className={`flex-1 py-5 rounded-2xl text-base font-black uppercase italic transition-all ${
                  (player?.energy || 0) < 2
                    ? 'bg-slate-800 opacity-50 cursor-not-allowed'
                    : 'bg-emerald-600 active:scale-95'
                }`}
              >
                Да, едем
              </button>
              <button
                onClick={() => { busStopRoute(); setShowBusPopup(false); }}
                className="flex-1 py-5 rounded-2xl text-base font-black uppercase italic border border-white/10 bg-white/[0.05] active:scale-95 transition-all text-slate-300"
              >
                Нет, хватит
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patrol route completion popup */}
      {showPatrolPopup && patrolCurrentRoute && (
        <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-6">
          <div className="w-[min(92vw,400px)] bg-[#071006]/98 backdrop-blur-xl border border-blue-500/20 p-6 rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-2xl">🚔</div>
                <div>
                  <p className="text-sm font-black uppercase text-blue-200">{patrolCurrentRoute.name}</p>
                  <p className="text-xs text-slate-400">Патрульный маршрут завершён!</p>
                </div>
              </div>
              <button onClick={() => { setShowPatrolPopup(false); }}
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white active:scale-90">
                <X size={18} />
              </button>
            </div>
            <div className="bg-black/30 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Репутация</span>
                <span className="text-base font-black text-blue-400 italic">+10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Остановок</span>
                <span className="text-sm font-black text-slate-300">{patrolCurrentRoute.stops.length}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">Продолжить патруль?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { patrolRepeatRoute(); setShowPatrolPopup(false); }}
                className="flex-1 py-5 rounded-2xl text-base font-black uppercase italic bg-blue-600 active:scale-95 transition-all"
              >
                Продолжить
              </button>
              <button
                onClick={() => { patrolStopRoute(); setShowPatrolPopup(false); }}
                className="flex-1 py-5 rounded-2xl text-base font-black uppercase italic border border-white/10 bg-white/[0.05] active:scale-95 transition-all text-slate-300"
              >
                Закончить смену
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
