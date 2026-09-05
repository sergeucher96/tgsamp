import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { useTravelStore } from './useTravelStore';
import { useBusinessStore } from './useBusinessStore';
import { FINAL_LOCATIONS } from '../data/locations';

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
  oil: 'oil_rig',     // Oil rig location id (buy oil)
};

export const useTruckerStore = create((set, get) => ({
  rentedTruck: null,       // { type, capacity, cargo: { crop: 0, metal: 0, oil: 0, part: 0, microchip: 0 } }
  farmCropCount: 0,
  factoryMetalCount: 0,
  oilRigOilCount: 0,
  isOperating: false,      // Currently traveling for delivery
  loading: false,
  pendingOrders: [],        // All pending business orders
  pendingDelivery: null,    // { orderId, resourceType, maxAmount, pricePerUnit, businessId, businessName }

  trucks: TRUCK_TYPES,

  // Fetch resource counts from farm, factory and oil rig
  fetchResourceCounts: async () => {
    set({ loading: true });
    try {
      const [farmRes, factoryRes, oilRes] = await Promise.all([
        supabase.from('farm').select('crop_count').eq('id', 1).single(),
        supabase.from('factory').select('metal_count').eq('id', 1).single(),
        supabase.from('oil_rig').select('oil_count').eq('id', 1).single(),
      ]);

      if (!farmRes.error) set(state => ({ farmCropCount: farmRes.data?.crop_count || 0 }));
      if (!factoryRes.error) set(state => ({ factoryMetalCount: factoryRes.data?.metal_count || 0 }));
      if (!oilRes.error) set(state => ({ oilRigOilCount: oilRes.data?.oil_count || 0 }));
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
      set({ rentedTruck: { type: truck.id, capacity: truck.capacity, cargo: { crop: 0, metal: 0, oil: 0 } } });
      return true;
    } catch (err) {
      console.error('Rent truck error:', err);
      return false;
    }
  },

  // Fetch all pending business orders
  fetchPendingOrders: async () => {
    try {
      const { data, error } = await supabase
        .from('business_orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Enrich with business info
        const businesses = await supabase.from('businesses').select('id, owner_id').in(
          'id',
          data.map(o => o.business_id)
        );
        const bizMap = {};
        if (businesses.data) {
          businesses.data.forEach(b => { bizMap[b.id] = b; });
        }

        const enriched = data.map(order => {
          const locName = FINAL_LOCATIONS.find(l => l.id === order.business_id)?.name || order.business_id;
          return {
            ...order,
            business_owner_id: bizMap[order.business_id]?.owner_id || null,
            business_name: locName,
          };
        });

        set({ pendingOrders: enriched });
      }
    } catch (err) {
      console.error('Failed to fetch pending orders:', err);
    }
  },

  // Set pending delivery: close menu, start traveling to business
  setPendingDelivery: async (orderId, resourceType) => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;

    const truck = get().rentedTruck;
    if (!truck) return false;

    const cargoHas = get().getCargo(resourceType);
    const order = get().pendingOrders.find(o => o.id === parseInt(orderId));
    if (!order) {
      alert('Заказ не найден!');
      return false;
    }

    const maxAmount = Math.min(cargoHas, Number(order.quantity));
    if (maxAmount <= 0) {
      alert('Нет ресурса в грузовике или заказ пуст!');
      return false;
    }

    if (useTravelStore.getState().isMoving) {
      alert('Нельзя пока движетесь!');
      return false;
    }

    // Close all MapView overlays immediately
    if (typeof window.closeAllMapViewViews === 'function') {
      window.closeAllMapViewViews();
    }

    set({
      pendingDelivery: {
        orderId,
        resourceType,
        maxAmount,
        pricePerUnit: order.price_per_unit,
        businessId: order.business_id,
        businessName: order.business_name || order.business_id,
      },
      isOperating: true,
    });

    // Follow player on map
    if (typeof window.setMapViewFollowing === 'function') {
      window.setMapViewFollowing(true);
    }

    // Start traveling to business
    await useTravelStore.getState().startRoute(order.business_id);
    return true;
  },

  // Complete delivery: unload resources at business (called after arrival)
  completeDelivery: async (deliveryAmount) => {
    const delivery = get().pendingDelivery;
    if (!delivery) return false;

    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const truck = get().rentedTruck;
    if (!truck) return false;

    const deliveryNum = Number(deliveryAmount);
    if (deliveryNum <= 0 || deliveryNum > delivery.maxAmount) {
      alert(`Можно разгрузить 1–${delivery.maxAmount} ед.!`);
      return false;
    }

    const pricePerUnit = delivery.pricePerUnit;
    const earnings = deliveryNum * pricePerUnit;

    set({ loading: true });
    try {
      // Phase 1: Add resources to business warehouse
      const { data: warehouseData } = await supabase
        .from('business_resources')
        .select('quantity')
        .eq('business_id', delivery.businessId)
        .eq('resource_type', delivery.resourceType)
        .single();

      const currentQty = Number(warehouseData?.quantity) || 0;
      const newQty = currentQty + deliveryNum;

      const { error: resError } = await supabase
        .from('business_resources')
        .upsert(
          { business_id: delivery.businessId, resource_type: delivery.resourceType, quantity: newQty },
          { onConflict: 'business_id,resource_type' }
        );

      if (resError) throw resError;

      // Phase 2: Update order - reduce remaining quantity or mark fulfilled
      const order = get().pendingOrders.find(o => o.id === delivery.orderId);
      if (order) {
        const newRemaining = Number(order.quantity) - deliveryNum;
        if (newRemaining <= 0) {
          await supabase
            .from('business_orders')
            .update({ status: 'fulfilled' })
            .eq('id', delivery.orderId);
        } else {
          await supabase
            .from('business_orders')
            .update({ quantity: newRemaining })
            .eq('id', delivery.orderId);
        }
      }

      // Phase 3: Pay driver
      await updateProfile({ money: player.money + earnings });

      // Phase 4: Clear delivered cargo from truck
      set(state => ({
        rentedTruck: {
          ...state.rentedTruck,
          cargo: { ...state.rentedTruck.cargo, [delivery.resourceType]: Math.max(0, truck.cargo[delivery.resourceType] - deliveryNum) }
        },
        pendingDelivery: null,
        isOperating: false,
        loading: false,
      }));

      // Refresh orders and resource counts
      await get().fetchPendingOrders();
      await get().fetchResourceCounts();
      await useBusinessStore.getState().fetchResources(delivery.businessId);

      alert(`✅ Доставлено ${deliveryNum} ед. за $${Math.round(earnings)}!`);
      return true;
    } catch (err) {
      console.error('Complete delivery error:', err);
      set({ isOperating: false, loading: false });
      alert('Ошибка при разгрузке!');
      return false;
    }
  },

  // Cancel pending delivery
  cancelDelivery: () => {
    set({ pendingDelivery: null, isOperating: false });
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
    return (cargo.crop || 0) + (cargo.metal || 0) + (cargo.oil || 0);
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
    else if (resourceType === 'oil') sourceCount = get().oilRigOilCount;

    if (sourceCount < amount) {
      alert(`Недостаточно ресурса на складе!`);
      return false;
    }

    try {
      // Deduct money
      await updateProfile({ money: player.money - cost });

      // Deduct from source
      const sourceLoc = RESOURCE_SOURCES[resourceType];
      const colName = resourceType === 'crop' ? 'crop_count' : resourceType === 'metal' ? 'metal_count' : 'oil_count';
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
          cargo: { crop: 0, metal: 0, oil: 0 }
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