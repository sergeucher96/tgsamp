import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { usePlayerStore, type Profile } from './usePlayerStore';
import { useInventoryStore } from './useInventoryStore';
import { CLOTHING_DATABASE, type ClothingItem } from '../features/character/data/clothingConfig';
import { CHARACTER_STATS_MAP } from '../features/character/data/characterStats';

export type EquipmentSlot = 'head' | 'neck' | 'torso' | 'hands' | 'legs' | 'feet';

export interface EquipmentState {
  equipment: Record<EquipmentSlot, string | null>;
  isLoading: boolean;

  fetchEquipment: () => Promise<void>;
  equipItem: (item_id: string) => Promise<boolean>;
  unequipItem: (slot: EquipmentSlot) => Promise<boolean>;
  getStats: () => Record<string, number>;
}

const initialEquipment: Record<EquipmentSlot, string | null> = {
  head: null,
  neck: null,
  torso: null,
  hands: null,
  legs: null,
  feet: null,
};

export const useEquipmentStore = create<EquipmentState>((set, get) => ({
  equipment: initialEquipment,
  isLoading: false,

  fetchEquipment: async () => {
    const player = usePlayerStore.getState().player;
    if (!player) return;

    const { data } = await supabase
      .from('profiles')
      .select('head_item, neck_item, torso_item, hands_item, legs_item, feet_item')
      .eq('id', player.id)
      .maybeSingle();

    if (data) {
      set({
        equipment: {
          head: data.head_item || null,
          neck: data.neck_item || null,
          torso: data.torso_item || null,
          hands: data.hands_item || null,
          legs: data.legs_item || null,
          feet: data.feet_item || null,
        },
      });
    }
  },

  equipItem: async (item_id): Promise<boolean> => {
    const player = usePlayerStore.getState().player;
    if (!player) return false;

    const itemData = CLOTHING_DATABASE[item_id] as ClothingItem | undefined;
    if (!itemData) { alert('Предмет не найден!'); return false; }

    const { items, removeItem, fetchPlayerInventory } = useInventoryStore.getState();
    const owned = items.find(i => i.item_id === item_id);
    if (!owned) { alert('У вас нет этого предмета!'); return false; }

    const slot = itemData.slot as EquipmentSlot;
    const currentEquipped = get().equipment[slot];

    set({ isLoading: true });
    try {
      await removeItem(owned.id, 1);

      const { error } = await supabase
        .from('profiles')
        .update({ [`${slot}_item`]: item_id })
        .eq('id', player.id);

      if (error) throw error;

      set({ equipment: { ...get().equipment, [slot]: item_id } });

      if (currentEquipped) {
        const { error: insertErr } = await supabase.from('inventory').insert([{
          owner_id: player.id.toString(),
          item_id: currentEquipped,
          amount: 1,
          storage_type: 'player',
        }]);
        if (insertErr) console.error('Error returning old item:', insertErr);
      }

      await fetchPlayerInventory();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  unequipItem: async (slot): Promise<boolean> => {
    const player = usePlayerStore.getState().player;
    if (!player) return false;

    const item_id = get().equipment[slot];
    if (!item_id) { alert('На этом слоте ничего нет!'); return false; }

    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [`${slot}_item`]: null })
        .eq('id', player.id);

      if (error) throw error;

      const { error: insertErr } = await supabase.from('inventory').insert([{
        owner_id: player.id.toString(),
        item_id: item_id,
        amount: 1,
        storage_type: 'player',
      }]);
      if (insertErr) throw insertErr;

      set({ equipment: { ...get().equipment, [slot]: null } });
      await useInventoryStore.getState().fetchPlayerInventory();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  getStats: () => {
    const { equipment } = get();
    const { activeBuffs } = usePlayerStore.getState();
    const stats: Record<string, number> = {};
    Object.keys(CHARACTER_STATS_MAP).forEach(key => { stats[key] = 0; });

    Object.values(equipment).forEach(item_id => {
      if (!item_id) return;
      const item = CLOTHING_DATABASE[item_id] as ClothingItem | undefined;
      if (!item || !item.stats) return;
      Object.entries(item.stats).forEach(([key, val]) => {
        if (stats[key] !== undefined) stats[key] += val;
      });
    });

    const now = Date.now();
    const active = (activeBuffs || []).filter(b => b.expiresAt > now);
    active.forEach(buff => {
      const key = buff.effect?.replace('buff_', '');
      if (key && stats[key] !== undefined) {
        stats[key] += Number((buff as any).amount) || 0;
      }
    });

    return stats;
  },
}));