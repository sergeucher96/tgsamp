import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { useInventoryStore } from './useInventoryStore';
import { CLOTHING_DATABASE } from '../data/clothingConfig';

export const useEquipmentStore = create((set, get) => ({
  equipment: {
    head: null,
    neck: null,
    torso: null,
    hands: null,
    legs: null,
    feet: null,
  },
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

  equipItem: async (item_id) => {
    const player = usePlayerStore.getState().player;
    if (!player) return false;

    const itemData = CLOTHING_DATABASE[item_id];
    if (!itemData) return alert('Предмет не найден!');

    const { items, removeItem, fetchPlayerInventory } = useInventoryStore.getState();
    const owned = items.find(i => i.item_id === item_id);
    if (!owned) return alert('У вас нет этого предмета!');

    const slot = itemData.slot;
    const currentEquipped = get().equipment[slot];

    set({ isLoading: true });
    try {
      // Удаляем из инвентаря
      await removeItem(owned.id, 1);

      // Сохраняем в профиль
      const { error } = await supabase
        .from('profiles')
        .update({ [`${slot}_item`]: item_id })
        .eq('id', player.id);

      if (error) throw error;

      set({ equipment: { ...get().equipment, [slot]: item_id } });

      // Если был предмет на этом слоте — возвращаем в инвентарь
      if (currentEquipped) {
        const { error: insertErr } = await supabase.from('inventory').insert([{
          owner_id: player.id.toString(),
          item_id: currentEquipped,
          amount: 1,
          storage_type: 'player'
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

  unequipItem: async (slot) => {
    const player = usePlayerStore.getState().player;
    if (!player) return false;

    const item_id = get().equipment[slot];
    if (!item_id) return alert('На этом слоте ничего нет!');

    set({ isLoading: true });
    try {
      // Очищаем слот в профиле
      const { error } = await supabase
        .from('profiles')
        .update({ [`${slot}_item`]: null })
        .eq('id', player.id);

      if (error) throw error;

      // Возвращаем в инвентарь
      const { error: insertErr } = await supabase.from('inventory').insert([{
        owner_id: player.id.toString(),
        item_id: item_id,
        amount: 1,
        storage_type: 'player'
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

  // Рассчитать бонусы от экипировки
  getStats: () => {
    const { equipment } = get();
    const stats = { charisma: 0, armor: 0, stamina: 0, speed: 0, inv_slots: 0 };

    Object.values(equipment).forEach(item_id => {
      if (!item_id) return;
      const item = CLOTHING_DATABASE[item_id];
      if (!item || !item.stats) return;
      Object.entries(item.stats).forEach(([key, val]) => {
        if (stats[key] !== undefined) stats[key] += val;
      });
    });

    return stats;
  },
}));
