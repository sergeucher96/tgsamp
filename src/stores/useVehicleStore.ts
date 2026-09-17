import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { usePlayerStore } from './usePlayerStore';
import { useInventoryStore } from './useInventoryStore';
import { useQuestStore } from './useQuestStore';
import { HOUSE_CLASSES, HouseClass } from '../features/houses/data/houseConfig';
import {
  VEHICLE_DATABASE,
  TUNING_CONFIG,
  HEALTH_PENALTIES,
  REPAIR_COST_PER_PERCENT,
  DIAGNOSTIC_COST,
  WearSystemKey,
} from '../features/vehicles/data/vehicleConfig';
import {
  getDiagnosis,
  getServiceUpdates,
  calculateOverallCondition,
} from '../features/vehicles/utils/vehicleWear';

export interface Vehicle {
  id: string;
  model_id: string;
  color: number;
  house_id: string | null;
  fuel: number;
  max_fuel: number;
  fuel_type: string;
  plate: string;
  engine_stage: number;
  suspension_stage: number;
  brakes_stage: number;
  has_nitro: boolean;
  health: number;
  is_active: boolean;
  owner_id: string;
  x: number;
  y: number;
  mileage?: number;
  wear_oil?: number;
  wear_tires?: number;
  wear_battery?: number;
  wear_brakes?: number;
  wear_cooling?: number;
  wear_electric?: number;
  wear_suspension?: number;
  wear_transmission?: number;
  wear_engine?: number;
  repair_count?: number;
  condition?: number;
  [key: string]: unknown;
}

export interface Diagnosis {
  key: WearSystemKey;
  name: string;
  type: string;
  action: string;
  cost: number;
  status: 'ok' | 'warning' | 'overdue';
  wearKm: number;
  resourceKm: number;
  percentUsed: number;
}

interface VehicleState {
  myVehicles: Vehicle[];
  isLoading: boolean;
  carInGarage: string | null;

  parkInGarage: (houseId: string) => void;
  retrieveFromGarage: (houseId: string) => void;
  hasCarInGarage: (houseId: string) => boolean;
  fetchVehicles: () => Promise<void>;
  setActiveVehicle: (vehicleId: string | null) => Promise<void>;
  buyVehicle: (modelId: string, colorId: number, house: { id_name: string; class: HouseClass }) => Promise<boolean>;
  tuneVehicle: (vehicleId: string, part: keyof typeof TUNING_CONFIG, stage: number) => Promise<boolean>;
  repairVehicle: (vehicleId: string) => Promise<void>;
  updateVehicleHealth: (vehicleId: string, newHealth: number) => Promise<void>;
  parkVehicle: (vehicleId: string, houseId: string) => Promise<boolean>;
  leaveGarage: (vehicleId: string) => Promise<boolean>;
  repairVehicleForMoney: (vehicleId: string) => Promise<boolean>;
  diagnoseVehicle: (vehicleId: string) => Diagnosis[] | null;
  serviceWearSystem: (vehicleId: string, systemKey: WearSystemKey) => Promise<boolean>;
  diagnosticVehicle: (vehicleId: string) => Promise<Diagnosis[] | null>;
}

const houseLocations: Record<string, { x: number; y: number }> = {
  house_1: { x: 1200, y: 2200 },
  house_2: { x: 1500, y: 2000 },
  house_3: { x: 1800, y: 2300 },
  house_51: { x: 670, y: 4500 },
};

export function calculateEffectiveSpeed(vehicle: Vehicle): number {
  const config = VEHICLE_DATABASE[vehicle.model_id];
  if (!config) return 0;
  const baseSpeed = config.speed || 100;

  const engineStage = vehicle.engine_stage || 0;
  const engineConfig = TUNING_CONFIG.engine.stages[engineStage - 1];
  const engineBonus = engineConfig ? engineConfig.bonus : 0;

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

export function calculateEffectiveAcceleration(vehicle: Vehicle): number {
  const config = VEHICLE_DATABASE[vehicle.model_id];
  if (!config) return 0;
  const baseAccel = config.acceleration || 50;

  const suspensionStage = vehicle.suspension_stage || 0;
  const suspConfig = TUNING_CONFIG.suspension.stages[suspensionStage - 1];
  const accelBonus = suspConfig ? suspConfig.accelBonus : 0;

  return Math.round(baseAccel * (1 + accelBonus));
}

export function calculateEffectiveHandling(vehicle: Vehicle): number {
  const config = VEHICLE_DATABASE[vehicle.model_id];
  if (!config) return 0;
  const baseHandling = config.handling || 50;

  const brakesStage = vehicle.brakes_stage || 0;
  const brakesConfig = TUNING_CONFIG.brakes.stages[brakesStage - 1];
  const brakesBonus = brakesConfig ? brakesConfig.bonus : 0;

  const suspensionStage = vehicle.suspension_stage || 0;
  const suspConfig = TUNING_CONFIG.suspension.stages[suspensionStage - 1];
  const gripBonus = suspConfig ? suspConfig.gripBonus : 0;

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

export const useVehicleStore = create<VehicleState>((set, get) => ({
  myVehicles: [],
  isLoading: false,
  carInGarage: null,

  parkInGarage: (houseId: string) => {
    const { player } = usePlayerStore.getState();
    const vehicle = player?.activeVehicle;
    if (!vehicle) return;

    const pos = houseLocations[houseId] || { x: 0, y: 0 };

    supabase.from('vehicles')
      .update({ x: pos.x, y: pos.y })
      .eq('id', vehicle.id)
      .then(() => {});

    usePlayerStore.getState().setLocalActiveVehicle(null);
    set({ carInGarage: houseId });
  },

  retrieveFromGarage: (houseId: string) => {
    const vehicles = get().myVehicles || [];
    const garageVehicles = vehicles.filter(v => v.house_id === houseId);
    if (garageVehicles.length === 0) return;

    const vehicle = garageVehicles[0];
    usePlayerStore.getState().setLocalActiveVehicle(vehicle);
    set({ carInGarage: null });
  },

  hasCarInGarage: (houseId: string) => {
    const { carInGarage } = get();
    return carInGarage === houseId;
  },

  fetchVehicles: async () => {
    const player = usePlayerStore.getState().player;
    if (!player) return;
    set({ isLoading: true });
    const { data } = await supabase.from('vehicles').select('*').eq('owner_id', player.id);
    set({ myVehicles: data || [], isLoading: false });
  },

  setActiveVehicle: async (vehicleId: string | null) => {
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
      console.error('Vehicle active error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  buyVehicle: async (modelId: string, colorId: number, house: { id_name: string; class: HouseClass }) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const config = VEHICLE_DATABASE[modelId];

    if (!house || !house.id_name) {
      alert('Ошибка: Дом не выбран.');
      return false;
    }

    if (Number(player.money) < config.price) {
      alert('Недостаточно денег!');
      return false;
    }

    const inHouse = (get().myVehicles || []).filter(v => v.house_id === house.id_name).length;
    const hConfig = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;

    if (inHouse >= (hConfig.garage_slots || 1)) {
      alert('В гараже этого дома нет мест!');
      return false;
    }

    set({ isLoading: true });
    try {
      const { data: _data, error } = await supabase.from('vehicles').insert([{
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

  tuneVehicle: async (vehicleId: string, part: keyof typeof TUNING_CONFIG, stage: number): Promise<boolean> => {
    const { player, updateProfile } = usePlayerStore.getState();
    const vehicles = get().myVehicles;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      alert('Машина не найдена!');
      return false;
    }

    let colName = '';
    let price = 0;

    if (part === 'nitro') {
      if (vehicle.has_nitro) {
        alert('Нитро уже установлено!');
        return false;
      }
      price = TUNING_CONFIG.nitro.price;
      colName = 'has_nitro';
    } else {
      const partConfig = TUNING_CONFIG[part];
      if (!partConfig) {
        alert('Неизвестная деталь!');
        return false;
      }
      const stageConfig = partConfig.stages[stage - 1];
      if (!stageConfig) {
        alert('Неизвестный этап!');
        return false;
      }
      const currentStage = vehicle[`${String(part)}_stage` as keyof Vehicle] as number || 0;
      if (currentStage < stage - 1) {
        alert(`Сначала установите ${partConfig.stages[stage - 2]?.name}!`);
        return false;
      }
      price = stageConfig.price;
      colName = `${String(part)}_stage`;
    }

    if (Number(player.money) < price) {
      alert('Недостаточно денег!');
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
      await updateProfile({ money: Number(player.money) - price });
      await get().fetchVehicles();
      return true;
    } catch (e) {
      console.error(e);
      alert('Ошибка при тюнинге!');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  repairVehicle: async (vehicleId: string) => {
    const { items, removeItem } = useInventoryStore.getState();
    const hasKit = items.find(i => i.item_id === 'repair_kit');

    if (!hasKit) return alert('Нужен ремкомплект!');

    const { error } = await supabase
      .from('vehicles')
      .update({ health: 100 })
      .eq('id', vehicleId);

    if (!error) {
      await removeItem(hasKit.id, 1);
      await get().fetchVehicles();
      alert('Машина как новая!');
    }
  },

  updateVehicleHealth: async (vehicleId: string, newHealth: number) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ health: Math.round(newHealth) })
        .eq('id', vehicleId);

      if (error) throw error;
      const roundedHealth = Math.round(newHealth * 100) / 100;
      const vehicles = get().myVehicles.map(v =>
        v.id === vehicleId ? { ...v, health: roundedHealth } : v
      );
      set({ myVehicles: vehicles });
      const activeVehicle = usePlayerStore.getState().activeVehicle;
      if (activeVehicle && activeVehicle.id === vehicleId) {
        usePlayerStore.getState().setLocalActiveVehicle({ ...activeVehicle, health: roundedHealth });
      }
    } catch (e) {
      console.error('Vehicle health update error:', e);
    }
  },

  parkVehicle: async (vehicleId: string, houseId: string) => {
    if (!vehicleId || !houseId) return false;
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ house_id: houseId })
        .eq('id', vehicleId);

      if (error) throw error;
      usePlayerStore.getState().setLocalActiveVehicle(null);
      await get().fetchVehicles();
      return true;
    } catch (e) {
      console.error('Park vehicle error:', e);
      alert('Ошибка при парковке!');
      return false;
    }
  },

  leaveGarage: async (vehicleId: string) => {
    if (!vehicleId) return false;
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select()
        .eq('id', vehicleId)
        .single();

      if (error || !data) {
        alert('Машина не найдена в гараже!');
        return false;
      }

      usePlayerStore.getState().setLocalActiveVehicle(data);
      await get().fetchVehicles();
      return true;
    } catch (e) {
      console.error('Leave garage error:', e);
      return false;
    }
  },

  repairVehicleForMoney: async (vehicleId: string): Promise<boolean> => {
    const { player, updateProfile } = usePlayerStore.getState();
    const vehicles = get().myVehicles;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      alert('Машина не найдена!');
      return false;
    }

    const currentHealth = vehicle.health || 100;
    if (currentHealth >= 100) {
      alert('Машина в идеальном состоянии!');
      return false;
    }

    const damagePercent = Math.round(100 - currentHealth);
    const cost = damagePercent * REPAIR_COST_PER_PERCENT;

    if (Number(player.money) < cost) {
      alert(`Недостаточно денег! Нужно ${cost.toLocaleString()} ₽`);
      return false;
    }

    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ health: 100 })
        .eq('id', vehicleId);

      if (error) throw error;
      await updateProfile({ money: Number(player.money) - cost });
      await get().fetchVehicles();
      return true;
    } catch (e) {
      console.error(e);
      alert('Ошибка при ремонте!');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  diagnoseVehicle: (vehicleId: string) => {
    const vehicles = get().myVehicles;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return null;
    return getDiagnosis(vehicle);
  },

  serviceWearSystem: async (vehicleId: string, systemKey: WearSystemKey): Promise<boolean> => {
    const { player, updateProfile } = usePlayerStore.getState();
    const vehicles = get().myVehicles;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      alert('Машина не найдена!');
      return false;
    }

    const { WEAR_SYSTEMS } = await import('../features/vehicles/data/vehicleConfig');
    const sys = WEAR_SYSTEMS[systemKey];
    if (!sys) {
      alert('Неизвестная система!');
      return false;
    }

    if (Number(player.money) < sys.cost) {
      alert(`Недостаточно денег! Нужно ${sys.cost.toLocaleString()} ₽`);
      return false;
    }

    set({ isLoading: true });
    try {
      const updates = getServiceUpdates(vehicle, systemKey);
      const tempVehicle = { ...vehicle, ...updates };
      updates.condition = calculateOverallCondition(tempVehicle);
      updates.health = updates.condition;

      const { error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', vehicleId);

      if (error) throw error;
      await updateProfile({ money: Number(player.money) - sys.cost });
      await get().fetchVehicles();
      alert(`${sys.name} — ${sys.action.toLowerCase()}!`);
      return true;
    } catch (e) {
      console.error(e);
      alert('Ошибка при обслуживании!');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  diagnosticVehicle: async (vehicleId: string): Promise<Diagnosis[] | null> => {
    const { player, updateProfile } = usePlayerStore.getState();
    const vehicles = get().myVehicles;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return null;

    if (Number(player.money) < DIAGNOSTIC_COST) {
      alert(`Недостаточно денег! Нужно ${DIAGNOSTIC_COST.toLocaleString()} ₽`);
      return null;
    }

    await updateProfile({ money: Number(player.money) - DIAGNOSTIC_COST });
    return getDiagnosis(vehicle);
  },
}));