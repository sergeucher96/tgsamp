import { create } from 'zustand';

export interface NavigationState {
  activeTab: 'map' | 'profile' | 'inventory';
  currentInterior: string | null;
  currentGarage: string | null;
  showPhone: boolean;

  setActiveTab: (tab: 'map' | 'profile' | 'inventory') => void;
  setInterior: (houseId: string) => void;
  setGarage: (houseId: string) => void;
  parkCarInHouse: (houseId: string) => void;
  getParkedHouse: () => string | null;
  clearParkedHouse: () => void;
  exitHouse: () => void;
  exitGarage: () => void;
  openPhone: () => void;
  closePhone: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'profile',
  currentInterior: null,
  currentGarage: null,
  showPhone: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setInterior: (houseId) => set({ currentInterior: houseId }),

  setGarage: (houseId) => set({ currentGarage: houseId }),

  parkCarInHouse: (houseId) => {
    localStorage.setItem('parked_house', houseId);
    set({ currentGarage: null });
  },

  getParkedHouse: () => {
    return localStorage.getItem('parked_house') || null;
  },

  clearParkedHouse: () => {
    localStorage.removeItem('parked_house');
  },

  exitHouse: () => set({ currentInterior: null }),
  exitGarage: () => set({ currentGarage: null }),

  openPhone: () => set({ showPhone: true }),
  closePhone: () => set({ showPhone: false }),
}));