import { create } from 'zustand';

export const useNavigationStore = create((set) => ({
  activeTab: 'profile',
  currentInterior: null, // Для входа в дом
  currentGarage: null,   // Для входа в гараж

  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setInterior: (houseId) => set({ currentInterior: houseId }),
  
  setGarage: (houseId) => set({ currentGarage: houseId }),
}));