import { create } from 'zustand';
import { supabase } from '../api/supabase';

export const useCafeteriaStore = create((set, get) => ({
  businessCrops: {},
  loading: false,

  fetchBusinessCrops: async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('crop_count')
        .eq('id', businessId)
        .maybeSingle();
      
      if (!error && data) {
        set(state => ({
          businessCrops: { ...state.businessCrops, [businessId]: data.crop_count || 0 }
        }));
      }
      return data?.crop_count || 0;
    } catch (err) {
      console.error('Failed to fetch business crops:', err);
      return 0;
    }
  },

  getCropCount: (businessId) => {
    return get().businessCrops[businessId] || 0;
  },

  decrementCrops: async (businessId, amount) => {
    const currentCrops = get().getCropCount(businessId);
    if (currentCrops < amount) return false;
    
    const newCrops = currentCrops - amount;
    const { error } = await supabase
      .from('businesses')
      .update({ crop_count: newCrops })
      .eq('id', businessId);
    
    if (!error) {
      set(state => ({
        businessCrops: { ...state.businessCrops, [businessId]: newCrops }
      }));
      return true;
    }
    return false;
  },

  addCrops: async (businessId, amount) => {
    const currentCrops = get().getCropCount(businessId);
    const newCrops = currentCrops + amount;
    const { error } = await supabase
      .from('businesses')
      .update({ crop_count: newCrops })
      .eq('id', businessId);
    
    if (!error) {
      set(state => ({
        businessCrops: { ...state.businessCrops, [businessId]: newCrops }
      }));
      return true;
    }
    return false;
  },
}));