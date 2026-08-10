import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { useInventoryStore } from './useInventoryStore';
import { useQuestStore } from './useQuestStore';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { VEHICLE_DATABASE, TUNING_CONFIG, HEALTH_PENALTIES } from '../data/vehicleConfig';

// Calculate effective speed based on tuning and health
export function calculateEffectiveSpeed(vehicle) {
  const config = VEHICLE_DATABASE[vehicle.model_id];
  if (!config) return 0;
  const baseSpeed = config.baseSpeed || 100;

  // Engine bonus
  const engineStage = vehicle.engine_stage || 0;
  const engineConfig = TUNING_CONFIG.engine.stages[engineStage - 1];
  const engineBonus = engineConfig ? engineConfig.bonus : 0;

  // Health penalty
  const health = vehicle.health || 100;
  let healthPenalty = 0;
  for (const p of HEALTH_PENALTIES) {
    if (health <= p.threshold) {
      healthPenalty = p.speedPenalty;
      break;
    }
  }

  return Math.round(baseSpeed * (1 + engineBonus) * (1 - healthPenalty));
}

// Calculate effective acceleration
export function calculateEffectiveAcceleration(vehicle) {
  const config = VEHICLE_DATABASE[vehicle.model_id];
  if (!config) return 0;
  const baseAccel = config.acceleration || 50;

  const suspensionStage = vehicle.suspension_stage || 0;
  const suspConfig = TUNING_CONFIG.suspension.stages[suspensionStage - 1];
  const accelBonus = suspConfig ? suspConfig.accelBonus : 0;

  return Math.round(baseAccel * (1 + accelBonus));
}

// Calculate effective handling
export function calculateEffectiveHandling(vehicle) {
  const config = VEHICLE_DATABASE[vehicle.model_id];
  if (!config) return 0;
  const baseHandling = config.handling || 50;

  // Brakes bonus
  const brakesStage = vehicle.brakes_stage || 0;
  const brakesConfig = TUNING_CONFIG.brakes.stages[brakesStage - 1];
  const brakesBonus = brakesConfig ? brakesConfig.bonus : 0;

  // Suspension grip bonus
  const suspensionStage = vehicle.suspension_stage || 0;
  const suspConfig = TUNING_CONFIG.suspension.stages[suspensionStage - 1];
  const gripBonus = suspConfig ? suspConfig.gripBonus : 0;

  // Health penalty
  const health = vehicle.health || 100;
  let healthPenalty = 0;
  for (const p of HEALTH_PENALTIES) {
    if (health <= p.threshold) {
      healthPenalty = p.speedPenalty;
      break;
    }
  }

  return Math.round(baseHandling * (1 + brakesBonus + gripBonus) * (1 - healthPenalty * 0.5));
}

// ВАЖНО: Добавлен экспорт
export const useVehicleStore = create((set, get) => ({
  myVehicles: [],
  isLoading: false,

  fetchVehicles: async () => {
    const player = usePlayerStore.getState().player;
    if (!player) return;
    set({ isLoading: true });
    const { data } = await supabase.from('vehicles').select('*').eq('owner_id', player.id);
    set({ myVehicles: data || [], isLoading: false });
  },

  setActiveVehicle: async (vehicleId) => {
    const playerStore = usePlayerStore.getState();
    if (!playerStore.player) return;

    set({ isLoading: true });
    try {
      await supabase.from('vehicles').update({ is_active: false }).eq('owner_id', playerStore.player.id);

      if (vehicleId) {
        const { data, error } = await supabase
          .from('vehicles')
          .update({ is_active: true })
          .eq('id', vehicleId)
          .select()
          .single();

        if (error) throw error;
        playerStore.setLocalActiveVehicle(data);
      } else {
        playerStore.setLocalActiveVehicle(null);
      }
      await get().fetchVehicles();
    } catch (e) {
      console.error("Vehicle active error:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  buyVehicle: async (modelId, colorId, house) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const config = VEHICLE_DATABASE[modelId];

    if (!house || !house.id_name) {
      alert("Ошибка: Дом не выбран.");
      return false;
    }

    if (Number(player.money) < config.price) {
      alert("Недостаточно денег!");
      return false;
    }

    const inHouse = (get().myVehicles || []).filter(v => v.house_id === house.id_name).length;
    const hConfig = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;

    if (inHouse >= (hConfig.garage_slots || 1)) {
      alert("В гараже этого дома нет мест!");
      return false;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase.from('vehicles').insert([{
        owner_id: player.id,
        model_id: modelId,
        color: colorId,
        house_id: house.id_name,
        fuel: config.fuelMax,
        max_fuel: config.fuelMax,
        fuel_type: config.fuelType,
        plate: `SA-${Math.floor(100 + Math.random() * 899)}`.toUpperCase(),
        engine_stage: 0,
        suspension_stage: 0,
        brakes_stage: 0,
        has_nitro: false,
        health: 100
      }]).select().single();

      if (error) throw error;

      await updateProfile({ money: Number(player.money) - config.price });
      useQuestStore.getState().registerEvent('buy_vehicle');
      await get().fetchVehicles();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  tuneVehicle: async (vehicleId, part, stage) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const vehicles = get().myVehicles;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return alert("Машина не найдена!");

    let colName = '';
    let config;
    if (part === 'nitro') {
      if (vehicle.has_nitro) return alert("Нитро уже установлен!");
      config = TUNING_CONFIG.nitro;
      colName = 'has_nitro';
    } else {
      config = TUNING_CONFIG[part];
      if (!config) return alert("Неизвестная деталь!");
      const stageConfig = config.stages[stage - 1];
      if (!stageConfig) return alert("Неизвестный этап!");
      // Check if current stage is at least stage-1
      const currentStage = vehicle[`${part}_stage`] || 0;
      if (currentStage < stage - 1) {
        return alert(`Сначала установите ${config.stages[stage - 2]?.name}!`);
      }
      colName = `${part}_stage`;
    }

    if (Number(player.money) < config.price) {
      alert("Недостаточно денег!");
      return false;
    }

    set({ isLoading: true });
    try {
      const updateData = colName === 'has_nitro' ? { has_nitro: true } : { [colName]: stage };
      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId);

      if (error) throw error;
      await updateProfile({ money: Number(player.money) - config.price });
      await get().fetchVehicles();
      return true;
    } catch (e) {
      console.error(e);
      alert("Ошибка при тюнинге!");
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  repairVehicle: async (vehicleId) => {
    const { items, removeItem } = useInventoryStore.getState();
    const hasKit = items.find(i => i.item_id === 'repair_kit');

    if (!hasKit) return alert("Нужен ремкомплект!");

    const { error } = await supabase
      .from('vehicles')
      .update({ health: 100 })
      .eq('id', vehicleId);

    if (!error) {
      await removeItem(hasKit.id, 1);
      await get().fetchVehicles();
      alert("Машина как новая!");
    }
  },

}));