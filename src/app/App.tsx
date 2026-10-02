import React, { useEffect, useState, lazy, Suspense } from 'react';
import { usePlayerStore, type Profile } from '../stores/usePlayerStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useHouseStore } from '../stores/useHouseStore';
import { useVehicleStore } from '../stores/useVehicleStore';
import { useBankStore } from '../stores/useBankStore';
import { useWeaponStore } from '../stores/useWeaponStore';
import { useQuestStore } from '../stores/useQuestStore';
import { useSmsStore } from '../stores/useSmsStore';
import { useLspdStore } from '../stores/useLspdStore';
import { useTerritoryStore } from '../stores/useTerritoryStore';
import { useWarStore } from '../stores/useWarStore';
import { useTimeStore } from '../stores/useTimeStore';
import TimeIndicator from '../components/ui/TimeIndicator';
import { useItemCategoryStore } from '../stores/useItemCategoryStore';
import { useTelegram } from '../services/telegram/useTelegram';

// Dev tools (only in development — won't be bundled in production build)
const IS_DEV = import.meta.env.DEV;
const HotspotTool = IS_DEV ? lazy(() => import('../components/dev/HotspotTool')) : null;
const HotspotTool3D = IS_DEV ? lazy(() => import('../components/dev/HotspotTool3D')) : null;
const RoadEditor = IS_DEV ? lazy(() => import('../game/locations/RoadEditor')) : null;
const BusinessProductsEditor = IS_DEV ? lazy(() => import('../features/businesses/BusinessProductsEditor')) : null;
const CategoryEditor = IS_DEV ? lazy(() => import('../features/market/CategoryEditor')) : null;
const GangRanksEditor = IS_DEV ? lazy(() => import('../features/gangs/GangRanksEditor')) : null;
const ItemCatalog = IS_DEV ? lazy(() => import('../features/market/ItemCatalog')) : null;
const RecipeEditorHub = IS_DEV ? lazy(() => import('../features/market/RecipeEditorHub')) : null;
const LocationIconEditor = IS_DEV ? lazy(() => import('../game/locations/LocationIconEditor')) : null;
const PvpTestMenu = IS_DEV ? lazy(() => import('../features/pvp/PvpTestMenu')) : null;
// Бокс доступен всем игрокам, поэтому не под IS_DEV: очередь PvP —
// игровая функция, а не инструмент разработчика.
const BoxView = lazy(() => import('../features/pvp/BoxView'));

// Views
import MapView from '../game/locations/MapView';
import ProfileView from '../features/character/ProfileView';
import InventoryView from '../features/inventory/InventoryView';
import RegistrationView from '../features/character/RegistrationView';
import HouseInterior from '../game/locations/HouseInterior';
import GarageView from '../features/vehicles/GarageView';
import QuestView from '../features/market/QuestView';
import PhoneView from '../features/phone/PhoneView';
import CharacterView from '../features/character/CharacterView';
import WarsView from '../features/gangs/WarsView';
import GangsView from '../features/gangs/GangsView';

// Components
import BankNotifications from '../components/ui/BankNotifications';
import VehicleInfoMenu from '../components/common/VehicleInfoMenu';
import MyPropertyMenu from '../components/common/MyPropertyMenu';
import MyVehiclesMenu from '../components/common/MyVehiclesMenu';

// Lazy-loaded heavy 3D components
const CarViewer = lazy(() => import('../components/ui/CarViewer'));
const SceneViewer = lazy(() => import('../components/game/SceneViewer'));
const FarmHarvestGame = lazy(() => import('../components/game/FarmHarvestGame'));
const AutoServiceMechanicGame = lazy(() => import('../components/game/AutoServiceMechanicGame'));

import { Loader2, Maximize2, Minimize2 } from 'lucide-react';

function App() {
  const { player, loading, login, needsRegistration, skills, licenses, activeVehicle } = usePlayerStore();
  const { activeTab, setActiveTab, currentInterior, currentGarage, showPhone, closePhone } = useNavigationStore();
  const { fetchDbHouses, dbHouses } = useHouseStore();
  const { fetchVehicles, myVehicles } = useVehicleStore();
  const { isTelegram, isDesktop, isFullscreen, toggleFullscreen } = useTelegram();
  const { startDecay, stopDecay, startStabilization, stopStabilization, fetchTerritories } = useTerritoryStore();
  const { completeExpiredWars, fetchWars, startTicker: startWarTicker, stopTicker: stopWarTicker } = useWarStore();
  
  const [showQuests, setShowQuests] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showHotspotTool3D, setShowHotspotTool3D] = useState(false);
  const [showRoadEditor, setShowRoadEditor] = useState(false);
  const [showBusinessProducts, setShowBusinessProducts] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showGangRanksEditor, setShowGangRanksEditor] = useState(false);
  const [showPvpTestMenu, setShowPvpTestMenu] = useState(false);
  const [showBox, setShowBox] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);
  const [showLocationIconEditor, setShowLocationIconEditor] = useState(false);
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);
  const [showMyProperty, setShowMyProperty] = useState(false);
  const [showMyVehicles, setShowMyVehicles] = useState(false);
  const [showWars, setShowWars] = useState(false);
  const [showGangs, setShowGangs] = useState(false);
  const [showCarViewer, setShowCarViewer] = useState(false);
  const [showSceneViewer, setShowSceneViewer] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // 🌾 Состояние модального окна 3D Фермы
  const [showFarmGame, setShowFarmGame] = useState(false);
  // 🔧 Состояние модального окна Автосервиса (Механик 3D)
  const [showMechanicGame, setShowMechanicGame] = useState(false);

  // Dev keyboard shortcut: Ctrl+Shift+H
  useEffect(() => {
    if (!IS_DEV) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setShowDevTools(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    let lastLoadedPlayerId: string | null = null;
    const unsubscribe = usePlayerStore.subscribe((state) => {
      const currentId = state.player?.id || null;
      if (currentId && currentId !== lastLoadedPlayerId) {
        lastLoadedPlayerId = currentId;
        useLspdStore.getState().loadLspdStatus(currentId);
      }
    });
    startDecay(() => {});
    startStabilization();
    // Зоны нужны сразу: переключатель на карте показывает контуры,
    // а WarMapLayer ставит по ним значки войн. Раньше их грузил
    // TerritoriesView, который убрали вместе с экраном карты.
    fetchTerritories();
    return () => {
      unsubscribe();
      stopDecay();
      stopStabilization();
    };
  }, [startDecay, stopDecay, startStabilization, stopStabilization, fetchTerritories]);

  useEffect(() => {
    // Игровые часы: сверка с временем базы и тик. Запускаем сразу,
    // не дожидаясь входа, чтобы затемнение по суточкам не мигало
    // ночью, пока идёт авторизация.
    const { start, stop } = useTimeStore.getState();
    start();
    return () => stop();
  }, []);

  useEffect(() => {
    // Войны считаются быстрее, чем раз в минуту: очки зависят
    // от времени участия, и счёт должен обновляться на глазах.
    startWarTicker();
    return () => stopWarTicker();
  }, [startWarTicker, stopWarTicker]);

  useEffect(() => {
    // Первый вход в игру: подводим итоги тому, что истекло, пока
    // сервер был закрыт, и подгружаем текущие войны.
    const load = async () => {
      await completeExpiredWars();
      await fetchWars();
    };
    void load();
  }, [completeExpiredWars, fetchWars]);

  useEffect(() => { 
    login().then((success) => {
      if (!success) return;
      fetchDbHouses();
      fetchVehicles();
      useBankStore.getState().startInterestAccrual();
      useBankStore.getState().startRealtimeSubscription();
      useWeaponStore.getState().fetchWeapons();
      useQuestStore.getState().loadProgress();
      useQuestStore.getState().startQuestTimer();
      useSmsStore.getState().startRealtimeSubscription();
      useItemCategoryStore.getState().loadAll();
    });
  }, [login, fetchDbHouses, fetchVehicles]);

  // Handle Telegram back button
  useEffect(() => {
    if (isTelegram && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Кнопка Назад (BackButton) доступна в Telegram начиная с версии 6.1
      const isBackButtonSupported = typeof tg.isVersionAtLeast === 'function' ? tg.isVersionAtLeast('6.1') : false;

      if (isBackButtonSupported && tg.backButton) {
        tg.backButton.show();
      }
      
      const handleBack = () => {
        if (showMechanicGame) {
          setShowMechanicGame(false);
          return;
        }
        if (showFarmGame) {
          setShowFarmGame(false);
          return;
        }
        const nav = useNavigationStore.getState();
        if (nav.currentGarage) {
          nav.exitGarage();
        } else if (nav.currentInterior) {
          nav.exitHouse();
        }
      };

      if (isBackButtonSupported && tg.backButton) {
        tg.backButton.onClick(handleBack);
      }
      tg.onEvent('backButtonClicked', handleBack);

      return () => {
        if (isBackButtonSupported && tg.backButton) {
          tg.backButton.offClick(handleBack);
        }
        tg.offEvent('backButtonClicked', handleBack);
      };
    }
  }, [isTelegram, showFarmGame, showMechanicGame]);

  // Начисление денег за смену на ферме
  const handleFarmFinish = (reward: { money: number } | null) => {
    if (reward && reward.money) {
      const store = usePlayerStore.getState();
      const addMoney = (store as { addMoney?: (amount: number) => void }).addMoney;
      if (typeof addMoney === "function") {
        addMoney(reward.money);
      } else if (player) {
        usePlayerStore.setState(prev => ({
          player: prev.player ? { ...prev.player, money: (Number(prev.player.money) || 0) + reward.money } : null
        }));
      }
    }
  };

  // 🔧 Начисление зарплаты автомеханика в СТО
  const handleMechanicFinish = (reward: { money: number } | null) => {
    if (reward && reward.money) {
      const store = usePlayerStore.getState();
      const addMoney = (store as { addMoney?: (amount: number) => void }).addMoney;
      if (typeof addMoney === "function") {
        addMoney(reward.money);
      } else if (player) {
        usePlayerStore.setState(prev => ({
          player: prev.player ? { ...prev.player, money: (Number(prev.player.money) || 0) + reward.money } : null
        }));
      }
    }
  };

  if (loading) return (
    <div className="w-full h-full bg-[#050805] flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-[#050805]" />
      <div className="relative z-10 flex flex-col items-center">
        <Loader2 className="w-12 h-12 text-[#8cff4a] animate-spin" />
        <p className="text-[#8cff4a] font-black uppercase text-[10px] mt-4 tracking-[0.4em] animate-pulse">Загрузка данных...</p>
      </div>
    </div>
  );

  if (needsRegistration) return <RegistrationView />;

  return (
    <div className="flex flex-col w-full h-full bg-[#020617] text-white select-none overflow-hidden font-sans">
      
      {/* Bank Notifications */}
      <BankNotifications />
      
      {/* Views & Modals */}
      {showQuests && <QuestView onClose={() => setShowQuests(false)} />}
      {showPhone && <PhoneView onClose={closePhone} />}
      {showCharacter && <CharacterView onClose={() => setShowCharacter(false)} />}
      {showVehicleInfo && activeVehicle && <VehicleInfoMenu vehicle={activeVehicle} onClose={() => setShowVehicleInfo(false)} />}
      {showMyProperty && <MyPropertyMenu onClose={() => setShowMyProperty(false)} />}
      {showMyVehicles && <MyVehiclesMenu onClose={() => setShowMyVehicles(false)} />}
      {showWars && <WarsView onClose={() => setShowWars(false)} />}
      {showGangs && <GangsView onClose={() => setShowGangs(false)} />}
      {showCarViewer && (
        <Suspense fallback={<div className="flex items-center justify-center p-8 text-white"><Loader2 className="animate-spin mr-2" /> Загрузка 3D сцены...</div>}>
          <CarViewer onClose={() => setShowCarViewer(false)} />
        </Suspense>
      )}
      {showSceneViewer && (
        <Suspense fallback={<div className="flex items-center justify-center p-8 text-white"><Loader2 className="animate-spin mr-2" /> Загрузка 3D сцены...</div>}>
          <SceneViewer url="/models/myscene.glb" locationId="showroom_ls" onClose={() => setShowSceneViewer(false)} />
        </Suspense>
      )}

      {/* 🚜 Модальное окно 3D Фермы SA-MP (НА ВЕСЬ ЭКРАН БЕЗ ПОЛЕЙ И РАМОК) */}
      {showFarmGame && (
        <div className="fixed inset-0 z-[100] w-full h-full bg-black overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center w-full h-full text-white"><Loader2 className="animate-spin mr-2" /> Загрузка 3D сцены...</div>}>
            <FarmHarvestGame
              onHarvestFinish={handleFarmFinish}
              onClose={() => setShowFarmGame(false)}
            />
          </Suspense>
        </div>
      )}

      {/* 🔧 Модальное окно 3D Автосервиса (СТО Механик) */}
      {showMechanicGame && (
        <div className="fixed inset-0 z-[100] w-full h-full bg-black overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center w-full h-full text-white"><Loader2 className="animate-spin mr-2" /> Загрузка 3D сцены...</div>}>
            <AutoServiceMechanicGame
              onServiceFinish={handleMechanicFinish}
              onClose={() => setShowMechanicGame(false)}
            />
          </Suspense>
        </div>
      )}
      
      {/* Dev Tools */}
      {IS_DEV && HotspotTool && showDevTools && (
        <Suspense fallback={null}>
          <HotspotTool onClose={() => setShowDevTools(false)} />
        </Suspense>
      )}
      {IS_DEV && HotspotTool3D && showHotspotTool3D && (
        <Suspense fallback={null}>
          <HotspotTool3D onClose={() => setShowHotspotTool3D(false)} />
        </Suspense>
      )}
      {IS_DEV && RoadEditor && showRoadEditor && (
        <Suspense fallback={null}>
          <RoadEditor onClose={() => setShowRoadEditor(false)} />
        </Suspense>
      )}
      {IS_DEV && BusinessProductsEditor && showBusinessProducts && (
        <Suspense fallback={null}>
          <BusinessProductsEditor onClose={() => setShowBusinessProducts(false)} />
        </Suspense>
      )}
      {IS_DEV && CategoryEditor && showCategoryEditor && (
        <Suspense fallback={null}>
          <CategoryEditor onClose={() => setShowCategoryEditor(false)} />
        </Suspense>
      )}
      {IS_DEV && GangRanksEditor && showGangRanksEditor && (
        <Suspense fallback={null}>
          <GangRanksEditor onClose={() => setShowGangRanksEditor(false)} />
        </Suspense>
      )}
      {IS_DEV && PvpTestMenu && showPvpTestMenu && (
        <Suspense fallback={null}>
          <PvpTestMenu onClose={() => setShowPvpTestMenu(false)} />
        </Suspense>
      )}
      {showBox && (
        <Suspense fallback={null}>
          <BoxView onClose={() => setShowBox(false)} />
        </Suspense>
      )}
      {IS_DEV && ItemCatalog && showAllItems && (
        <Suspense fallback={null}>
          <ItemCatalog onClose={() => setShowAllItems(false)} />
        </Suspense>
      )}
      {/* Редактор рецептов: кухня, оружие и всё, что добавим позже.
          Живёт здесь, а не в игровых экранах, — это авторский
          инструмент, игрокам он не нужен. */}
      {IS_DEV && RecipeEditorHub && showRecipeEditor && (
        <Suspense fallback={null}>
          <RecipeEditorHub onClose={() => setShowRecipeEditor(false)} />
        </Suspense>
      )}
      {IS_DEV && LocationIconEditor && showLocationIconEditor && (
        <Suspense fallback={null}>
          <LocationIconEditor onClose={() => setShowLocationIconEditor(false)} />
        </Suspense>
      )}
      
      {/* СЛОЙ 1: ГАРАЖ */}
      {currentGarage && <GarageView />}

      {/* СЛОЙ 2: ИНТЕРЬЕР */}
      {currentInterior && !currentGarage && <HouseInterior />}

      {/* СЛОЙ 3: ОБЫЧНЫЙ МИР */}
      {!currentInterior && !currentGarage && (
        <>
          <header className="shrink-0 h-24 px-6 bg-[#071006]/95 border-b border-[#68ff79]/15 backdrop-blur-sm z-50 flex items-center justify-between gta-panel gta-frame">
           <div className="text-left">
                <p className="text-[10px] font-black uppercase gta-label tracking-[0.45em] mb-1">SAN ANDREAS</p>
                <h1 className="text-xl font-black uppercase italic tracking-[0.18em] leading-none gta-title">
                    {player?.username || "Гражданин"}
                </h1>
                <p className="text-[9px] font-black uppercase mt-1 gta-label opacity-80">Гражданин штата</p>
            </div>

            {/* Кнопка полного экрана — видна ТОЛЬКО на ПК и ноутбуках */}
            {isDesktop && (
              <button
                onClick={toggleFullscreen}
                className="gta-button px-3.5 py-2 rounded flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all hover:brightness-125 active:scale-95 shadow-md border border-[#7eff67]/30"
                title={isFullscreen ? "Свернуть в окно" : "Развернуть на весь экран"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-[#9eff52]" />
                    <span className="hidden sm:inline">Обычный экран</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-[#9eff52]" />
                    <span className="hidden sm:inline">На весь экран</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center gap-3">
              <TimeIndicator />
              <div className="text-right">
                  <div className="text-[#9eff52] font-black italic text-2xl leading-none">
                    ${Number(player?.money || 0).toLocaleString()}
                  </div>
                  <div className="text-[8px] text-[#b8ff84] font-black uppercase mt-1 tracking-[0.45em]">{player?.energy}% Энергия</div>
                  <div className="text-[8px] font-black uppercase mt-1 tracking-[0.45em] flex items-center justify-end gap-2">
                    <span className={Number(player?.hunger || 0) <= 20 ? 'text-red-400' : 'text-orange-300'}>🍽 {Math.round(Number(player?.hunger || 0))}%</span>
                    <span className={Number(player?.thirst || 0) <= 20 ? 'text-red-400' : 'text-sky-300'}>💧 {Math.round(Number(player?.thirst || 0))}%</span>
                  </div>
              </div>
            </div>
          </header>

          <main className="relative flex-grow overflow-hidden">
            {/* Слой ночной заливки пока отключён: синий оттенок на 46%
                поверх всей карты читался как выделение интерфейса, а не
                как темнота. Сам компонент и цвета в gameClock остаются —
                ночью по-прежнему меняется освещение 3D-сцен, а заливку
                можно вернуть одной строкой, когда подберём более
                мягкий вариант: не на всю карту, а точечно. Компонент цел:
                components/ui/DayNightOverlay.tsx, цвета — PHASE_TINT
                в game/time/gameClock.ts. */}
            {/* <DayNightOverlay /> */}
            <div className="absolute inset-0 overflow-y-auto no-scrollbar">
                {activeTab === 'map' && <MapView />}
                {activeTab === 'profile' && <ProfileView player={player} skills={skills} licenses={licenses} onOpenCharacter={() => setShowCharacter(true)} />}
                {activeTab === 'inventory' && <InventoryView />}
            </div>
          </main>

          <footer className="shrink-0 h-24 bg-[#071006]/95 border-t border-[#68ff79]/10 backdrop-blur-xl flex items-center justify-around px-6 pb-6 z-50 gta-panel gta-frame overflow-x-auto no-scrollbar gap-2">
              <NavButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon="🗺️" />
              <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon="👤" />
              <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon="🎒" />
              <NavButton active={showQuests} onClick={() => setShowQuests(true)} icon="📜" />
              
              {/* 🌾 КНОПКА ФЕРМЫ */}
              <button
                onClick={() => setShowFarmGame(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button border border-amber-500/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-105 hover:bg-amber-950/30 shrink-0"
                title="Ферма 3D (Flint County)"
              >
                🌾
              </button>

              {/* 🔧 КНОПКА АВТОСЕРВИСА (СТО МЕХАНИК) */}
              <button
                onClick={() => setShowMechanicGame(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button border border-sky-500/50 text-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.3)] active:scale-105 hover:bg-sky-950/30 shrink-0"
                title="Автосервис 3D (СТО Механик)"
              >
                🔧
              </button>

              {/* 🥊 КНОПКА БОКСА — очередь PvP */}
              <button
                onClick={() => setShowBox(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button border border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.25)] active:scale-105 hover:bg-rose-950/30 shrink-0"
                title="Бокс — PvP"
              >
                🥊
              </button>

              <button
                onClick={() => activeVehicle && setShowVehicleInfo(true)}
                disabled={!activeVehicle}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button shrink-0 ${
                  activeVehicle
                    ? 'border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] active:scale-105'
                    : 'border border-white/10 text-[#8ebc88] opacity-40 cursor-not-allowed'
                }`}
              >
                🚙
              </button>
              {(() => {
                const ownedCount = (dbHouses || []).filter(h => h.owner_id === player?.id).length;
                return (
                  <button
                    onClick={() => ownedCount > 0 && setShowMyProperty(true)}
                    disabled={ownedCount === 0}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button shrink-0 ${
                      ownedCount > 0
                        ? 'border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] active:scale-105'
                        : 'border border-white/10 text-[#8ebc88] opacity-40 cursor-not-allowed'
                    }`}
                  >
                    🏠
                  </button>
                );
              })()}
              {(() => {
                const vehicleCount = (myVehicles || []).length;
                return (
                  <button
                    onClick={() => vehicleCount > 0 && setShowMyVehicles(true)}
                    disabled={vehicleCount === 0}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button shrink-0 ${
                      vehicleCount > 0
                        ? 'border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] active:scale-105'
                        : 'border border-white/10 text-[#8ebc88] opacity-40 cursor-not-allowed'
                    }`}
                  >
                    🚗
                  </button>
                );
              })()}
              <button
                onClick={() => setShowWars(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] active:scale-95 shrink-0"
              >
                ⚔️
              </button>

              <button
                onClick={() => setShowGangs(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] active:scale-95 shrink-0"
              >
                🌳
              </button>

              {/* 🏔️ КНОПКА 3D СЦЕНЫ */}
              <button
                onClick={() => setShowSceneViewer(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button border border-purple-500/50 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-105 hover:bg-purple-950/30 shrink-0"
                title="3D Сцена"
              >
                🏔️
              </button>
              {IS_DEV && <NavButton active={showAdminPanel} onClick={() => setShowAdminPanel(prev => !prev)} icon="🔧" title="Админ панель" />}
              <NavButton active={showCarViewer} onClick={() => setShowCarViewer(true)} icon="🚗" />
            </footer>
          </>
        )}

        {IS_DEV && showAdminPanel && (
          <div 
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-100 flex flex-wrap gap-2 bg-[#020617]/95 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-xl"
            onClick={() => setShowAdminPanel(false)}
          >
            <NavButton active={showDevTools} onClick={(e) => { e.stopPropagation(); setShowDevTools(true); setShowAdminPanel(false); }} icon="🛠️" title="Редактор хотспотов" />
            <NavButton active={showHotspotTool3D} onClick={(e) => { e.stopPropagation(); setShowHotspotTool3D(true); setShowAdminPanel(false); }} icon="🧊" title="3D Редактор хотспотов" />
            <NavButton active={showRoadEditor} onClick={(e) => { e.stopPropagation(); setShowRoadEditor(true); setShowAdminPanel(false); }} icon="🛣️" title="Редактор дорог" />
            <NavButton active={showBusinessProducts} onClick={(e) => { e.stopPropagation(); setShowBusinessProducts(true); setShowAdminPanel(false); }} icon="📦" title="Товары бизнеса" />
              <NavButton active={showCategoryEditor} onClick={(e) => { e.stopPropagation(); setShowCategoryEditor(true); setShowAdminPanel(false); }} icon="📚" title="Категории" />
              <NavButton active={showGangRanksEditor} onClick={(e) => { e.stopPropagation(); setShowGangRanksEditor(true); setShowAdminPanel(false); }} icon="🎖️" title="Ранги банд" />
            <NavButton active={showAllItems} onClick={(e) => { e.stopPropagation(); setShowAllItems(true); setShowAdminPanel(false); }} icon="📋" title="Все предметы" />
            <NavButton active={showRecipeEditor} onClick={(e) => { e.stopPropagation(); setShowRecipeEditor(true); setShowAdminPanel(false); }} icon="🍳" title="Рецепты" />
            <NavButton active={showLocationIconEditor} onClick={(e) => { e.stopPropagation(); setShowLocationIconEditor(true); setShowAdminPanel(false); }} icon="📍" title="Иконки локаций" />
            <NavButton active={showPvpTestMenu} onClick={(e) => { e.stopPropagation(); setShowPvpTestMenu(true); setShowAdminPanel(false); }} icon="⚔️" title="Тест боёв" />
          </div>
        )}
      </div>
  );
}

function NavButton({ active, onClick, icon, title }: { active: boolean; onClick: (e?: React.MouseEvent) => void; icon: string; title?: string }) {
  return (
    <button 
      onClick={onClick} 
      title={title}
      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button shrink-0 ${
        active 
          ? 'border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] scale-105' 
          : 'border border-white/10 text-[#8ebc88]'
      }`}
    >
      {icon}
    </button>
  );
}

export default App;