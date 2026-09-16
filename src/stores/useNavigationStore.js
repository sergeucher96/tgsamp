import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';

export const useNavigationStore = create((set) => ({
  activeTab: 'profile',
  currentInterior: null,
  currentGarage: null,
  showPhone: false,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setInterior: (houseId) => set({ currentInterior: houseId }),
  
  setGarage: (houseId) => set({ currentGarage: houseId }),

  // Парковка автомобиля в гараже дома
  parkCarInHouse: (houseId) => {
    usePlayerStore.getState().setLocalActiveVehicle(null);
    localStorage.setItem('parked_house', houseId);
    set({ currentGarage: null });
  },

  // Получить house_id где припаркована машина
  getParkedHouse: () => {
    return localStorage.getItem('parked_house') || null;
  },

  // Убрать парковку (когда выходишь с машиной)
  clearParkedHouse: () => {
    localStorage.removeItem('parked_house');
  },

  exitHouse: () => set({ currentInterior: null }),
  exitGarage: () => set({ currentGarage: null }),

  openPhone: () => set({ showPhone: true }),
  closePhone: () => set({ showPhone: false }),
}));