import React, { useEffect } from 'react';
import { usePlayerStore } from './store/usePlayerStore';
import { useNavigationStore } from './store/useNavigationStore';
import { useHouseStore } from './store/useHouseStore';
import { useVehicleStore } from './store/useVehicleStore';
import { useBankStore } from './store/useBankStore';
import { useWeaponStore } from './store/useWeaponStore';
import { useTelegram } from './hooks/useTelegram';

// Views
import MapView from './views/MapView';
import ProfileView from './views/ProfileView';
import InventoryView from './views/InventoryView';
import RegistrationView from './views/RegistrationView';
import HouseInterior from './views/HouseInterior';
import GarageView from './views/GarageView';

// Components
import BankNotifications from './components/BankNotifications';

import { Loader2 } from 'lucide-react';

function App() {
  const { player, loading, login, needsRegistration, skills, licenses } = usePlayerStore();
  const { activeTab, setActiveTab, currentInterior, currentGarage } = useNavigationStore();
  const { fetchDbHouses } = useHouseStore();
  const { fetchVehicles } = useVehicleStore();
  const { isTelegram } = useTelegram();

  useEffect(() => { 
    login().then(() => {
        fetchDbHouses();
        fetchVehicles();
        useBankStore.getState().startInterestAccrual();
        useBankStore.getState().startRealtimeSubscription();
        useWeaponStore.getState().fetchWeapons();
    });
  }, []);

  // Handle Telegram back button
  useEffect(() => {
    if (isTelegram && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Show back button
      if (tg.BackButton) {
        tg.BackButton.show();
      }
      
      tg.onEvent('backButtonClicked', () => {
        const nav = useNavigationStore.getState();
        if (nav.currentGarage) {
          nav.exitGarage();
        } else if (nav.currentInterior) {
          nav.exitHouse();
        }
      });
    }
    return () => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.offEvent('backButtonClicked');
      }
    };
  }, [isTelegram]);

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
      
      {/* СЛОЙ 1: ГАРАЖ (Самый верхний) */}
      {currentGarage && <GarageView />}

      {/* СЛОЙ 2: ИНТЕРЬЕР (Показывается, если мы в доме и НЕ в гараже) */}
      {currentInterior && !currentGarage && <HouseInterior />}

      {/* СЛОЙ 3: ОБЫЧНЫЙ МИР (Скрыт, если мы в интерьере или гараже) */}
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
                {activeTab === 'profile' && <ProfileView player={player} skills={skills} licenses={licenses} />}
                {activeTab === 'inventory' && <InventoryView />}
            </div>
          </main>

          <footer className="shrink-0 h-24 bg-[#071006]/95 border-t border-[#68ff79]/10 backdrop-blur-xl flex items-center justify-around px-6 pb-6 z-50 gta-panel gta-frame">
              <NavButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon="🗺️" />
              <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon="👤" />
              <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon="🎒" />
          </footer>
        </>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon }) {
    return (
        <button onClick={onClick} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 gta-button ${active ? 'border border-[#7eff63]/40 text-[#e8ffc4] shadow-[0_0_20px_rgba(130,255,100,0.22)] scale-105' : 'border border-white/10 text-[#8ebc88]'}`}>
            {icon}
        </button>
    );
}

export default App;