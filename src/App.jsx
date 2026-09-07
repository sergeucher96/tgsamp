import React, { useEffect, useState, lazy, Suspense } from 'react';
import { usePlayerStore } from './store/usePlayerStore';
import { useNavigationStore } from './store/useNavigationStore';
import { useHouseStore } from './store/useHouseStore';
import { useVehicleStore } from './store/useVehicleStore';
import { useBankStore } from './store/useBankStore';
import { useWeaponStore } from './store/useWeaponStore';
import { useQuestStore } from './store/useQuestStore';
import { useSmsStore } from './store/useSmsStore';
import { useLspdStore } from './store/useLspdStore';
import { useTerritoryStore } from './store/useTerritoryStore';
import { useWarStore } from './store/useWarStore';
import { useItemCategoryStore } from './store/useItemCategoryStore';
import { useTelegram } from './hooks/useTelegram';

// Dev tools (only in development — won't be bundled in production build)
const IS_DEV = import.meta.env.DEV;
const HotspotTool = IS_DEV ? lazy(() => import('./components/HotspotTool')) : null;
const RoadEditor = IS_DEV ? lazy(() => import('./views/RoadEditor')) : null;
const BusinessProductsEditor = IS_DEV ? lazy(() => import('./views/BusinessProductsEditor')) : null;
const CategoryEditor = IS_DEV ? lazy(() => import('./views/CategoryEditor')) : null;
const LocationIconEditor = IS_DEV ? lazy(() => import('./views/LocationIconEditor')) : null;

// Views
import MapView from './views/MapView';
import ProfileView from './views/ProfileView';
import InventoryView from './views/InventoryView';
import RegistrationView from './views/RegistrationView';
import HouseInterior from './views/HouseInterior';
import GarageView from './views/GarageView';
import QuestView from './views/QuestView';
import PhoneView from './views/PhoneView';
import CharacterView from './views/CharacterView';
import TerritoriesView from './views/TerritoriesView';
import WarsView from './views/WarsView';

// Components
import BankNotifications from './components/BankNotifications';
import VehicleInfoMenu from './components/VehicleInfoMenu';
import MyPropertyMenu from './components/MyPropertyMenu';
import MyVehiclesMenu from './components/MyVehiclesMenu';
import CarViewer from './components/CarViewer';

// 🌾 ИМПОРТ 3D ФЕРМЫ (СТРОКА 45)
import FarmHarvestGame from './components/FarmHarvestGame';

import { Loader2 } from 'lucide-react';

function App() {
  const { player, loading, login, needsRegistration, skills, licenses, activeVehicle } = usePlayerStore();
  const { activeTab, setActiveTab, currentInterior, currentGarage, showPhone, closePhone } = useNavigationStore();
  const { fetchDbHouses, dbHouses } = useHouseStore();
  const { fetchVehicles, myVehicles } = useVehicleStore();
  const { isTelegram } = useTelegram();
  const { startDecay, stopDecay, startStabilization, stopStabilization } = useTerritoryStore();
  const { completeExpiredWars, fetchWars } = useWarStore();
  
  const [showQuests, setShowQuests] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showRoadEditor, setShowRoadEditor] = useState(false);
  const [showBusinessProducts, setShowBusinessProducts] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showLocationIconEditor, setShowLocationIconEditor] = useState(false);
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);
  const [showMyProperty, setShowMyProperty] = useState(false);
  const [showMyVehicles, setShowMyVehicles] = useState(false);
  const [showTerritories, setShowTerritories] = useState(false);
  const [showWars, setShowWars] = useState(false);
  const [showCarViewer, setShowCarViewer] = useState(false);

  // 🌾 Состояние модального окна 3D Фермы
  const [showFarmGame, setShowFarmGame] = useState(false);

  // Dev keyboard shortcut: Ctrl+Shift+H
  useEffect(() => {
    if (!IS_DEV) return;
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setShowDevTools(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const unsubLspd = usePlayerStore.subscribe(state => state.player, (p) => {
      if (p?.id) useLspdStore.getState().loadLspdStatus(p.id);
    });
    startDecay();
    startStabilization();
    return () => {
      if (typeof unsubLspd === 'function') unsubLspd();
      stopDecay();
      stopStabilization();
    };
  }, [startDecay, stopDecay, startStabilization, stopStabilization]);

  useEffect(() => {
    const interval = setInterval(async () => {
      await completeExpiredWars();
      await fetchWars();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [completeExpiredWars, fetchWars]);

  useEffect(() => { 
    login().then(() => {
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

      if (isBackButtonSupported && tg.BackButton) {
        tg.BackButton.show();
      }
      
      const handleBack = () => {
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

      if (isBackButtonSupported && tg.BackButton) {
        tg.BackButton.onClick(handleBack);
      }
      tg.onEvent('backButtonClicked', handleBack);

      return () => {
        if (isBackButtonSupported && tg.BackButton) {
          tg.BackButton.offClick(handleBack);
        }
        tg.offEvent('backButtonClicked', handleBack);
      };
    }
  }, [isTelegram, showFarmGame]);

  // Начисление денег за смену на ферме
  const handleFarmFinish = (reward) => {
    if (reward && reward.money) {
      const store = usePlayerStore.getState();
      if (typeof store.addMoney === 'function') {
        store.addMoney(reward.money);
      } else if (player) {
        usePlayerStore.setState(prev => ({
          player: prev.player ? { ...prev.player, money: (Number(prev.player.money) || 0) + reward.money } : null
        }));
      }
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#050805] flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-[#8cff4a] animate-spin" />
      <p className="text-[#8cff4a] font-black uppercase text-[10px] mt-4 tracking-[0.4em] animate-pulse">Загрузка данных...</p>
    </div>
  );

  if (needsRegistration) return <RegistrationView />;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#020617] text-white select-none overflow-x-hidden font-sans">
      
      {/* Bank Notifications */}
      <BankNotifications />
      
      {/* Views & Modals */}
      {showQuests && <QuestView onClose={() => setShowQuests(false)} />}
      {showPhone && <PhoneView onClose={closePhone} />}
      {showCharacter && <CharacterView onClose={() => setShowCharacter(false)} />}
      {showVehicleInfo && activeVehicle && <VehicleInfoMenu vehicle={activeVehicle} onClose={() => setShowVehicleInfo(false)} />}
      {showMyProperty && <MyPropertyMenu onClose={() => setShowMyProperty(false)} />}
      {showMyVehicles && <MyVehiclesMenu onClose={() => setShowMyVehicles(false)} />}
      {showTerritories && <TerritoriesView onClose={() => setShowTerritories(false)} />}
      {showWars && <WarsView onClose={() => setShowWars(false)} />}
      {showCarViewer && <CarViewer onClose={() => setShowCarViewer(false)} />}

      {/* 🌾 Модальное окно 3D Фермы SA-MP */}
      {showFarmGame && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl relative my-auto">
            <FarmHarvestGame
              onHarvestFinish={handleFarmFinish}
              onClose={() => setShowFarmGame(false)}
            />
          </div>
        </div>
      )}
      
      {/* Dev Tools */}
      {IS_DEV && HotspotTool && showDevTools && (
        <Suspense fallback={null}>
          <HotspotTool onClose={() => setShowDevTools(false)} />
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
              <div className="text-right">
                  <div className="text-[#9eff52] font-black italic text-2xl leading-none">
                    ${Number(player?.money || 0).toLocaleString()}
                  </div>
                  <div className="text-[8px] text-[#b8ff84] font-black uppercase mt-1 tracking-[0.45em]">{player?.energy}% Энергия</div>
              </div>
          </header>

          <main className="relative flex-grow overflow-hidden">
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
                onClick={() => setShowTerritories(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] active:scale-105 shrink-0"
              >
                🏙️
              </button>
              <button
                onClick={() => setShowWars(true)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] active:scale-95 shrink-0"
              >
                ⚔️
              </button>
              {IS_DEV && <NavButton active={showDevTools} onClick={() => setShowDevTools(true)} icon="🛠️" />}
              {IS_DEV && <NavButton active={showRoadEditor} onClick={() => setShowRoadEditor(true)} icon="🛣️" />}
              {IS_DEV && <NavButton active={showBusinessProducts} onClick={() => setShowBusinessProducts(true)} icon="📦" />}
              {IS_DEV && <NavButton active={showCategoryEditor} onClick={() => setShowCategoryEditor(true)} icon="📚" />}
              {IS_DEV && <NavButton active={showLocationIconEditor} onClick={() => setShowLocationIconEditor(true)} icon="📍" />}
              <NavButton active={showCarViewer} onClick={() => setShowCarViewer(true)} icon="🚗" />
          </footer>
        </>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon }) {
  return (
    <button 
      onClick={onClick} 
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
