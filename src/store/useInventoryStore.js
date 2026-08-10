import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { ITEM_DATABASE } from '../data/items';
import { CLOTHING_DATABASE } from '../data/clothingConfig';
import { useNavigationStore } from './useNavigationStore';

function getItemData(itemId) {
  return ITEM_DATABASE[itemId] || CLOTHING_DATABASE[itemId];
}

export const useInventoryStore = create((set, get) => ({
  items: [],
  houseItems: [],
  isLoading: false,
  isProcessing: false,

  cleanupExpiredItems: async () => {
    const now = new Date().toISOString();
    await supabase.from('inventory').delete().lt('expires_at', now);
  },

  fetchPlayerInventory: async () => {
    const player = usePlayerStore.getState().player;
    if (!player) return;
    await get().cleanupExpiredItems();
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('owner_id', player.id.toString())
      .eq('storage_type', 'player')
      .order('created_at', { ascending: true });
    set({ items: data || [] });
  },

  fetchHouseInventory: async (houseId) => {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('owner_id', houseId)
      .eq('storage_type', 'house')
      .order('created_at', { ascending: true });
    set({ houseItems: data || [] });
  },

  buyItem: async (itemId, price, amount = 1) => {
    const { isProcessing } = get();
    if (isProcessing) return false;

    const { player, updateProfile } = usePlayerStore.getState();
    const itemData = getItemData(itemId);
    if (!player) return false;

    const totalCost = price * amount;
    if (totalCost > Number(player.money)) {
      alert("Недостаточно наличных!");
      return false;
    }

    set({ isProcessing: true });
    try {
      const { data: dbItems } = await supabase.from('inventory').select('id').eq('owner_id', player.id.toString()).eq('storage_type', 'player');
      const currentItems = dbItems || [];

      if (itemData.stackable) {
        const { data: existing } = await supabase.from('inventory')
            .select('*').eq('owner_id', player.id.toString()).eq('item_id', itemId).lt('amount', itemData.maxStack || 99).maybeSingle();
        
        if (existing) {
          const { error } = await supabase.from('inventory').update({ amount: Number(existing.amount) + amount }).eq('id', existing.id);
          if (!error) {
            if (price > 0) await updateProfile({ money: Number(player.money) - totalCost });
            await get().fetchPlayerInventory();
            return true;
          }
        } else {
          // No existing stack - check inventory limit before creating new slot
          if (currentItems.length >= (player.inv_slots || 12)) {
            alert("Сумка полна!");
            return false;
          }
        }
      } else {
        if (currentItems.length >= (player.inv_slots || 12)) {
          alert("Сумка полна!");
          return false;
        }
      }

      const { error } = await supabase.from('inventory').insert([{
        owner_id: player.id.toString(), item_id: itemId, amount: amount, storage_type: 'player'
      }]);

      if (!error) {
        if (price > 0) await updateProfile({ money: Number(player.money) - totalCost });
        await get().fetchPlayerInventory();
        return true;
      }
    } finally { set({ isProcessing: false }); }
    return false;
  },

  // --- ЛОГИКА ИСПОЛЬЗОВАНИЯ ПРЕДМЕТОВ ---
  useItem: async (item) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const itemData = getItemData(item.item_id);
    if (!itemData || item.storage_type !== 'player') return;

    // 1. ЛОГИКА ЕДЫ
    if (itemData.action === 'HEAL_ENERGY') {
      if (player.energy >= 100) return alert("Вы не голодны!");
      await updateProfile({ energy: Math.min(100, player.energy + itemData.value) });
      await get().removeItem(item.id, 1);
    }

    // 2. ЛОГИКА СИМ-КАРТЫ
    if (itemData.action === 'ACTIVATE_SIM') {
      // Проверяем, есть ли у игрока телефон в сумке (опционально для реализма)
      const hasPhone = get().items.some(i => i.item_id === 'phone');
      if (!hasPhone) return alert("Вам нужен телефон в сумке, чтобы вставить сим-карту!");

      // Если номер уже есть - спрашиваем подтверждение
      if (player.phone_number) {
        const confirmChange = window.confirm(`Ваш текущий номер: ${player.phone_number}. Хотите заменить его на новый?`);
        if (!confirmChange) return;
      }

      set({ isLoading: true });

      try {
        let uniqueNumber = "";
        let isUnique = false;

        // Цикл генерации, пока не найдем свободный в БД
        while (!isUnique) {
          uniqueNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
          const { data } = await supabase.from('profiles').select('phone_number').eq('phone_number', uniqueNumber).maybeSingle();
          if (!data) isUnique = true;
        }

        // Обновляем профиль игрока
        const success = await updateProfile({ phone_number: uniqueNumber });
        if (success) {
          await get().removeItem(item.id, 1); // Удаляем симку
          alert(`Сим-карта активирована! Ваш новый номер: ${uniqueNumber}`);
        }
      } catch (e) {
        console.error(e);
      } finally {
        set({ isLoading: false });
      }
    }

    // 3. ЛОГИКА ТЕЛЕФОНА
    if (itemData.action === 'OPEN_PHONE') {
      useNavigationStore.getState().openPhone();
    }
  },

  removeItem: async (dbId, amount = 1) => {
    const item = [...get().items, ...get().houseItems].find(i => i.id === dbId);
    if (!item) return;
    if (Number(item.amount) > amount) {
      await supabase.from('inventory').update({ amount: Number(item.amount) - amount }).eq('id', dbId);
    } else {
      await supabase.from('inventory').delete().eq('id', dbId);
    }
    await get().fetchPlayerInventory();
  },
  sellResource: async (item, amount) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const price = RESOURCE_PRICES[item.item_id];

    if (!price || !player) return false;
    if (Number(item.amount) < amount) return false;

    const totalReward = price * amount;

    try {
      // 1. Сначала удаляем/обновляем предмет в базе
      if (Number(item.amount) === amount) {
        // Если продаем весь стек целиком
        await supabase.from('inventory').delete().eq('id', item.id);
      } else {
        // Если продаем только часть стека
        await supabase.from('inventory').update({ 
            amount: Number(item.amount) - amount 
        }).eq('id', item.id);
      }

      // 2. Начисляем деньги игроку
      await updateProfile({ money: Number(player.money) + totalReward });
      
      // 3. Обновляем инвентарь на экране
      await get().fetchPlayerInventory();
      
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}));