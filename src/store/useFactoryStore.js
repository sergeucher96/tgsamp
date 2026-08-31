import { create } from 'zustand';
import { supabase } from '../api/supabase';

export const useFactoryStore = create((set, get) => ({
  metalCount: 0,
  loading: false,
  producing: false,

  fetchMetalCount: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('factory')
        .select('metal_count')
        .eq('id', 1)
        .single();

      if (!error && data) {
        set({ metalCount: data.metal_count || 0 });
      } else {
        console.error('Factory fetch error:', error);
      }
    } catch (err) {
      console.error('Failed to fetch factory data:', err);
    } finally {
      set({ loading: false });
    }
  },

  produceMetal: async () => {
    if (get().producing) return false;
    set({ producing: true });

    try {
      const { data, error } = await supabase
        .from('factory')
        .update({
          metal_count: get().metalCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
        .select('metal_count')
        .single();

      if (!error && data) {
        set({ metalCount: data.metal_count });
        return true;
      } else {
        console.error('Produce metal error:', error);
        return false;
      }
    } catch (err) {
      console.error('Failed to produce metal:', err);
      return false;
    } finally {
      set({ producing: false });
    }
  },
}));
