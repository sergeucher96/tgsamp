import { create } from 'zustand';
import { supabase } from '../api/supabase';

export const useOilRigStore = create((set, get) => ({
  oilCount: 0,
  loading: false,
  extracting: false,

  // Fetch current oil count from the oil_rig table
  fetchOilCount: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('oil_rig')
        .select('oil_count')
        .eq('id', 1)
        .single();

      if (!error && data) {
        set({ oilCount: data.oil_count || 0 });
      } else {
        console.error('Oil rig fetch error:', error);
      }
    } catch (err) {
      console.error('Failed to fetch oil rig data:', err);
    } finally {
      set({ loading: false });
    }
  },

  // Extract 1 oil unit (increments oil_rig oil_count by 1)
  extractOil: async () => {
    if (get().extracting) return false;
    set({ extracting: true });

    try {
      const { data, error } = await supabase
        .from('oil_rig')
        .update({
          oil_count: get().oilCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
        .select('oil_count')
        .single();

      if (!error && data) {
        set({ oilCount: data.oil_count });
        return true;
      } else {
        console.error('Extract oil error:', error);
        return false;
      }
    } catch (err) {
      console.error('Failed to extract oil:', err);
      return false;
    } finally {
      set({ extracting: false });
    }
  },
}));
