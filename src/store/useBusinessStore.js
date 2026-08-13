import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { BUSINESS_TYPES } from '../data/businessConfig';

export const useBusinessStore = create((set, get) => ({
  businesses: [],
  isProcessing: false,

  fetchBusinesses: async () => {
    const { data, error } = await supabase.from('businesses').select('*');
    if (!error) set({ businesses: data || [] });
  },

  getBusinessState: (businessId) => {
    const biz = get().businesses.find(b => b.id === businessId);
    if (!biz) {
      return {
        id: businessId,
        purchased: false,
        owner_id: null,
        daily_earnings: 0,
        purchased_at: null,
      };
    }
    return {
      id: biz.id,
      purchased: biz.purchased || false,
      owner_id: biz.owner_id,
      daily_earnings: biz.daily_earnings || 0,
      purchased_at: biz.purchased_at,
    };
  },

  buyBusiness: async (businessId) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) {
      alert('Ошибка: игрок не найден!');
      return false;
    }

    const state = get().getBusinessState(businessId);
    if (state.purchased) {
      alert('Этот бизнес уже куплен!');
      return false;
    }

    const locType = get().getLocationType(businessId);
    const bizType = BUSINESS_TYPES[locType];
    if (!bizType) {
      alert('Неизвестный тип бизнеса!');
      return false;
    }

    const price = bizType.purchasePrice;
    if (Number(player.money) < price) {
      alert(`Недостаточно денег! Нужно $${price.toLocaleString()}`);
      return false;
    }

    set({ isProcessing: true });
    try {
      const { error: dbError } = await supabase
        .from('businesses')
        .upsert({
          id: businessId,
          owner_id: player.id,
          purchased: true,
          daily_earnings: bizType.dailyIncome,
          purchased_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (dbError) throw dbError;

      await updateProfile({ money: Number(player.money) - price });
      await get().fetchBusinesses();
      alert(`Поздравляем! Вы стали владельцем ${bizType.name.toLowerCase()}!`);
      return true;
    } catch (err) {
      console.error('Ошибка покупки бизнеса:', err);
      alert('Ошибка при покупке бизнеса!');
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  isPlayerOwner: (businessId) => {
    const player = usePlayerStore.getState().player;
    if (!player) return false;
    const state = get().getBusinessState(businessId);
    return state.purchased && state.owner_id === player.id;
  },

  getDailyEarnings: (businessId) => {
    const state = get().getBusinessState(businessId);
    if (!state.purchased) return 0;
    return state.daily_earnings || 0;
  },

  getLocationType: (businessId) => {
    // Extract type from businessId: shop_1 -> shop, bar_2 -> bar, gas_3 -> gas
    const parts = businessId.split('_');
    return parts[0] || '';
  },
}));
