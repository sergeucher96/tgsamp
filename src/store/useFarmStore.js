import { create } from 'zustand';
import { supabase } from '../api/supabase';

export const useFarmStore = create((set, get) => ({
  cropCount: 0,
  loading: false,
  harvesting: false,

  // Fetch current crop count from the farm table
  fetchCropCount: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('farm')
        .select('crop_count')
        .eq('id', 1)
        .single();

      if (!error && data) {
        set({ cropCount: data.crop_count || 0 });
      } else {
        console.error('Farm fetch error:', error);
      }
    } catch (err) {
      console.error('Failed to fetch farm data:', err);
    } finally {
      set({ loading: false });
    }
  },

  // Harvest 1 crop (increments farm crop_count by 1)
  harvestCrop: async () => {
    if (get().harvesting) return false;
    set({ harvesting: true });

    try {
      const { data, error } = await supabase
        .from('farm')
        .update({
          crop_count: get().cropCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
        .select('crop_count')
        .single();

      if (!error && data) {
        set({ cropCount: data.crop_count });
        return true;
      } else {
        console.error('Harvest error:', error);
        return false;
      }
    } catch (err) {
      console.error('Failed to harvest crop:', err);
      return false;
    } finally {
      set({ harvesting: false });
    }
  },
}));
