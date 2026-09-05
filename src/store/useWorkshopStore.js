import { create } from 'zustand';
import { supabase } from '../api/supabase';

export const useWorkshopStore = create((set, get) => ({
  metalCount: 0,
  partCount: 0,
  oilCount: 0,
  microchipCount: 0,
  factoryMetalCount: 0,
  oilRigOilCount: 0,
  loading: false,
  delivering: false,
  producing: false,

  fetchWorkshopData: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('workshop')
        .select('metal_count, part_count, oil_count, microchip_count')
        .eq('id', 1)
        .single();

      if (!error && data) {
        set({
          metalCount: data.metal_count || 0,
          partCount: data.part_count || 0,
          oilCount: data.oil_count || 0,
          microchipCount: data.microchip_count || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch workshop data:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchFactoryMetalCount: async () => {
    try {
      const { data, error } = await supabase
        .from('factory')
        .select('metal_count')
        .eq('id', 1)
        .single();

      if (!error && data) {
        set({ factoryMetalCount: data.metal_count || 0 });
      }
    } catch (err) {
      console.error('Failed to fetch factory metal count:', err);
    }
  },

  fetchOilRigOilCount: async () => {
    try {
      const { data, error } = await supabase
        .from('oil_rig')
        .select('oil_count')
        .eq('id', 1)
        .single();

      if (!error && data) {
        set({ oilRigOilCount: data.oil_count || 0 });
      }
    } catch (err) {
      console.error('Failed to fetch oil rig oil count:', err);
    }
  },

  // Deliver 5 metal from factory to workshop
  deliverMetal: async () => {
    if (get().delivering) return false;
    set({ delivering: true });

    try {
      // Check factory has enough metal
      const { data: factoryData } = await supabase
        .from('factory')
        .select('metal_count')
        .eq('id', 1)
        .single();

      if (!factoryData || factoryData.metal_count < 5) {
        alert('На заводе недостаточно металла! Нужно 5 единиц.');
        return false;
      }

      // Decrement factory metal
      const factoryNewCount = factoryData.metal_count - 5;
      await supabase
        .from('factory')
        .update({ metal_count: factoryNewCount })
        .eq('id', 1);

      // Increment workshop metal
      const { data: workshopData } = await supabase
        .from('workshop')
        .update({ metal_count: get().metalCount + 5 })
        .eq('id', 1)
        .select('metal_count')
        .single();

      if (workshopData) {
        set({ metalCount: workshopData.metal_count, factoryMetalCount: factoryNewCount });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to deliver metal:', err);
      return false;
    } finally {
      set({ delivering: false });
    }
  },

  // Deliver 5 oil from oil rig to workshop
  deliverOil: async () => {
    if (get().delivering) return false;
    set({ delivering: true });

    try {
      // Check oil rig has enough oil
      const { data: oilRigData } = await supabase
        .from('oil_rig')
        .select('oil_count')
        .eq('id', 1)
        .single();

      if (!oilRigData || oilRigData.oil_count < 5) {
        alert('На вышке недостаточно нефти! Нужно 5 единиц.');
        return false;
      }

      // Decrement oil rig oil
      const oilRigNewCount = oilRigData.oil_count - 5;
      await supabase
        .from('oil_rig')
        .update({ oil_count: oilRigNewCount })
        .eq('id', 1);

      // Increment workshop oil
      const { data: workshopData } = await supabase
        .from('workshop')
        .update({ oil_count: get().oilCount + 5 })
        .eq('id', 1)
        .select('oil_count')
        .single();

      if (workshopData) {
        set({ oilCount: workshopData.oil_count, oilRigOilCount: oilRigNewCount });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to deliver oil:', err);
      return false;
    } finally {
      set({ delivering: false });
    }
  },

  // Produce 1 part from 5 metal
  producePart: async () => {
    if (get().producing) return false;
    set({ producing: true });

    try {
      if (get().metalCount < 5) {
        alert('Недостаточно металла! Нужно 5 единиц.');
        return false;
      }

      const { data, error } = await supabase
        .from('workshop')
        .update({
          metal_count: get().metalCount - 5,
          part_count: get().partCount + 1,
        })
        .eq('id', 1)
        .select('metal_count, part_count')
        .single();

      if (!error && data) {
        set({ metalCount: data.metal_count, partCount: data.part_count });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to produce part:', err);
      return false;
    } finally {
      set({ producing: false });
    }
  },

  // Produce 1 microchip from 5 oil + 3 parts
  produceMicrochip: async () => {
    if (get().producing) return false;
    set({ producing: true });

    try {
      if (get().oilCount < 5) {
        alert('Недостаточно нефти! Нужно 5 единиц.');
        return false;
      }
      if (get().partCount < 3) {
        alert('Недостаточно деталей! Нужно 3 единицы.');
        return false;
      }

      const { data, error } = await supabase
        .from('workshop')
        .update({
          oil_count: get().oilCount - 5,
          part_count: get().partCount - 3,
          microchip_count: get().microchipCount + 1,
        })
        .eq('id', 1)
        .select('oil_count, part_count, microchip_count')
        .single();

      if (!error && data) {
        set({ oilCount: data.oil_count, partCount: data.part_count, microchipCount: data.microchip_count });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to produce microchip:', err);
      return false;
    } finally {
      set({ producing: false });
    }
  },
}));