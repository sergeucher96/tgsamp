import { create } from 'zustand';

export const useNavigationStore = create((set) => ({
  activeTab: 'profile',
  currentInterior: null,
  currentGarage: null,
  showPhone: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setInterior: (houseId) => set({ currentInterior: houseId }),
  
  setGarage: (houseId) => set({ currentGarage: houseId }),

  exitHouse: () => set({ currentInterior: null }),
  exitGarage: () => set({ currentGarage: null }),

  openPhone: () => set({ showPhone: true }),
  closePhone: () => set({ showPhone: false }),
}));