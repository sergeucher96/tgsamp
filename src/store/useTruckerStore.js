import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { useTravelStore } from './useTravelStore';

// Transport rental configs
const TRUCK_TYPES = [
  { id: 'small', name: 'Малый фургон', capacity: 50, rentPrice: 100, icon: '🚐' },
  { id: 'medium', name: 'Средний грузовик', capacity: 100, rentPrice: 200, icon: '🚚' },
  { id: 'large', name: 'Большой тягач', capacity: 150, rentPrice: 300, icon: '🚛' },
];

// Prices
const BUY_PRICE = 5;     // Buy resource at $5/unit
const SELL_PRICE = 10;   // Sell resource at $10/unit

// Resource source locations
const RESOURCE_SOURCES = {
  crop: 'farm',       // Farm location id (buy crop)
  metal: 'factory',   // Factory location id (buy metal)
};

export const useTruckerStore = create((set, get) => ({
  rentedTruck: null,       // { type, capacity, cargo: { crop: 0, metal: 0 } }
  farmCropCount: 0,
  factoryMetalCount: 0,
  isOperating: false,      // Currently traveling for delivery
  loading: false,

  trucks: TRUCK_TYPES,

  // Fetch resource counts from farm and factory
  fetchResourceCounts: async () => {
    set({ loading: true });
    try {
      const [farmRes, factoryRes] = await Promise.all([
        supabase.from('farm').select('crop_count').eq('id', 1).single(),
        supabase.from('factory').select('metal_count').eq('id', 1).single(),
      ]);

      if (!farmRes.error) set(state => ({ farmCropCount: farmRes.data?.crop_count || 0 }));
      if (!factoryRes.error) set(state => ({ factoryMetalCount: factoryRes.data?.metal_count || 0 }));
    } catch (err) {
      console.error('Failed to fetch resource counts:', err);
    } finally {
      set({ loading: false });
    }
  },

  // Rent truck
  rentTruck: async (truckId) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const truck = TRUCK_TYPES.find(t => t.id === truckId);
    if (!truck) return false;

    if (get().rentedTruck) {
      alert('У вас уже арендован транспорт! Сначала верните его.');
      return false;
    }

    if (player.money < truck.rentPrice) {
      alert(`Недостаточно денег! Нужно $${truck.rentPrice}`);
      return false;
    }

    try {
      await updateProfile({ money: player.money - truck.rentPrice });
      set({ rentedTruck: { type: truck.id, capacity: truck.capacity, cargo: { crop: 0, metal: 0 } } });
      return true;
    } catch (err) {
      console.error('Rent truck error:', err);
      return false;
    }
  },

  // Return truck (finish work)
  returnTruck: () => {
    set({ rentedTruck: null });
  },

  // Get current cargo count for a given resource type
  getCargo: (resourceType) => {
    return get().rentedTruck?.cargo?.[resourceType] || 0;
  },

  // Total loaded cargo
  getLoadedCargo: () => {
    const cargo = get().rentedTruck?.cargo || {};
    return (cargo.crop || 0) + (cargo.metal || 0);
  },

  // Buy resource: deduct money, take from source, load into truck
  buyResource: async (resourceType, amount) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const truck = get().rentedTruck;
    if (!truck) return false;

    const loaded = get().getLoadedCargo();
    if (loaded + amount > truck.capacity) {
      alert(`Непомещается! Свободно: ${truck.capacity - loaded} ед.`);
      return false;
    }

    const cost = amount * BUY_PRICE;
    if (player.money < cost) {
      alert(`Недостаточно денег! Нужно $${cost}`);
      return false;
    }

    // Check resource availability at source
    let sourceCount = 0;
    if (resourceType === 'crop') sourceCount = get().farmCropCount;
    else if (resourceType === 'metal') sourceCount = get().factoryMetalCount;

    if (sourceCount < amount) {
      alert(`Недостаточно ресурса на складе!`);
      return false;
    }

    try {
      // Deduct money
      await updateProfile({ money: player.money - cost });

      // Deduct from source
      const sourceLoc = RESOURCE_SOURCES[resourceType];
      const colName = resourceType === 'crop' ? 'crop_count' : 'metal_count';
      const { error } = await supabase
        .from(sourceLoc)
        .update({ [colName]: sourceCount - amount })
        .eq('id', 1);

      if (error) throw error;

      // Add to truck cargo
      const currentCargo = get().getCargo(resourceType);
      set(state => ({
        rentedTruck: {
          ...state.rentedTruck,
          cargo: { ...state.rentedTruck.cargo, [resourceType]: currentCargo + amount }
        }
      }));

      // Refresh counts
      await get().fetchResourceCounts();
      return true;
    } catch (err) {
      console.error('Buy resource error:', err);
      return false;
    }
  },

  // Sell cargo at port: travel to port, sell loaded cargo, travel back to depot
  sellAtPort: async () => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const loaded = get().getLoadedCargo();
    if (loaded === 0) {
      alert('Грузовик пуст! Купите ресурс.');
      return false;
    }

    if (useTravelStore.getState().isMoving) {
      alert('Нельзя пока движетесь!');
      return false;
    }

    const earnings = loaded * SELL_PRICE;

    try {
      set({ isOperating: true });

      // Phase 1: Travel to port
      await useTravelStore.getState().startRoute('port_ls');

      // Phase 2: Sell cargo
      await updateProfile({ money: player.money + earnings });

      // Clear truck cargo
      set(state => ({
        rentedTruck: {
          ...state.rentedTruck,
          cargo: { crop: 0, metal: 0 }
        },
        isOperating: false
      }));

      alert(`✅ Продано за $${earnings}!`);
      return true;
    } catch (err) {
      console.error('Sell at port error:', err);
      set({ isOperating: false });
      return false;
    }
  },
}));

export { TRUCK_TYPES, BUY_PRICE, SELL_PRICE };