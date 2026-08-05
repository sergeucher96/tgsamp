import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { VEHICLE_DATABASE } from '../data/vehicleConfig';

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
      // Снимаем активность со всех авто в БД
      await supabase.from('vehicles').update({ is_active: false }).eq('owner_id', playerStore.player.id);

      if (vehicleId) {
        // Активируем выбранную
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
        plate: `SA-${Math.floor(100 + Math.random() * 899)}`.toUpperCase()
      }]).select().single();

      if (error) throw error;

      await updateProfile({ money: Number(player.money) - config.price });
      await get().fetchVehicles();
      return true;
    } catch (e) {
      console.error(e);
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