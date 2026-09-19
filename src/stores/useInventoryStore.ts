import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { usePlayerStore, type Profile } from './usePlayerStore';
import { ITEM_DATABASE } from '../features/inventory/data/items';
import { RESOURCE_PRICES } from '../features/jobs/data/economy';
import { CLOTHING_DATABASE, type ClothingItem } from '../features/character/data/clothingConfig';
import { useNavigationStore } from './useNavigationStore';
import { useItemCategoryStore, type Item as CategoryItem, type ItemEffect as CategoryItemEffect } from './useItemCategoryStore';
import { CHARACTER_STATS_MAP } from '../features/character/data/characterStats';

export interface InventoryItem {
  id: string | number;
  owner_id: string;
  item_id: string;
  amount: number;
  storage_type: 'player' | 'house';
  created_at?: string;
  expires_at?: string | null;
}

export interface ItemData {
  id: string;
  name: string;
  desc: string;
  icon: string;
  stackable: boolean;
  type: string;
  action?: string | null;
  value?: number;
  maxStack?: number;
  sellPrice?: number;
}

interface DBItemEffect {
  effect_key?: string;
  value?: number;
  duration_minutes?: number;
}

interface DBItem {
  id: string | number;
  name: string;
  key: string;
  description?: string;
  icon?: string;
  weight?: number;
  stack_size?: number;
  category_id?: string | number;
  category?: CategoryItem['category'];
  properties?: Record<string, unknown>;
  effects?: DBItemEffect[];
  actions?: string[];
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  // Database-specific fields
  item_key?: string;
  item_name?: string;
  stackable?: boolean;
  max_stack?: number;
  type?: string;
  action?: string | null;
  action_value?: number;
  sell_price?: number;
}

function getItemData(itemId: string): ItemData | undefined {
  // Check DB items first (from item category system)
  const dbItem = useItemCategoryStore.getState().items.find(i => i.key === itemId || i.id?.toString() === itemId) as unknown as DBItem | undefined;
  const fallback = ITEM_DATABASE[itemId] || CLOTHING_DATABASE[itemId];

  if (dbItem) {
    return {
      id: dbItem.key || dbItem.id?.toString() || '',
      name: dbItem.name || '',
      desc: dbItem.description || '',
      icon: dbItem.icon || '📦',
      stackable: dbItem.stackable || false,
      maxStack: dbItem.max_stack || 99,
      type: dbItem.type || 'item',
      action: dbItem.action || fallback?.action || null,
      value: dbItem.action_value || 0,
      sellPrice: dbItem.sell_price || 0,
    };
  }
  if (fallback) {
    return {
      id: fallback.id,
      name: fallback.name,
      desc: fallback.desc || '',
      icon: fallback.icon || '📦',
      stackable: fallback.stackable || false,
      maxStack: fallback.maxStack || 99,
      type: fallback.type || 'item',
      action: fallback.action || null,
      value: fallback.value || 0,
      sellPrice: fallback.sellPrice || 0,
    };
  }
  return undefined;
}

interface InventoryState {
  items: InventoryItem[];
  houseItems: InventoryItem[];
  isLoading: boolean;
  isProcessing: boolean;

  cleanupExpiredItems: () => Promise<void>;
  fetchPlayerInventory: () => Promise<void>;
  fetchHouseInventory: (houseId: string) => Promise<void>;
  buyItem: (itemId: string, price: number, amount?: number) => Promise<boolean>;
  consumeItem: (item: InventoryItem) => Promise<void>;
  removeItem: (dbId: string | number, amount?: number) => Promise<void>;
  sellResource: (item: InventoryItem, amount: number) => Promise<boolean>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
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
  consumeItem: async (item: InventoryItem) => {
    const { player, updateProfile, applyBuff } = usePlayerStore.getState();
    const itemData = getItemData(item.item_id);
    if (!itemData || item.storage_type !== 'player') return;

    // Получаем полные данные предмета из БД для эффектов
    const dbItem = useItemCategoryStore.getState().items.find(i => i.key === item.item_id || i.id?.toString() === item.item_id) as unknown as DBItem | undefined;
    const itemEffects = (dbItem?.effects as DBItemEffect[]) || [];

    // 1. ЛОГИКА ЕДЫ
    if (itemData.action === 'HEAL_ENERGY') {
      if (player.energy >= 100) return alert("Вы не голодны!");
      await updateProfile({ energy: Math.min(100, player.energy + itemData.value) });
      await get().removeItem(item.id, 1);
    }

    // 1.5 ЛОГИКА БАФФОВ
    if (itemEffects.length > 0) {
      const buffNames: string[] = [];
      for (const effect of itemEffects) {
        if (effect.effect_key?.startsWith('buff_')) {
          applyBuff({
            effect: effect.effect_key,
            name: `Buff: ${effect.effect_key}`,
            duration_minutes: Number(effect.duration_minutes) || 60,
          });
          const statKey = effect.effect_key.replace('buff_', '');
          const stat = CHARACTER_STATS_MAP[statKey as keyof typeof CHARACTER_STATS_MAP];
          if (stat) {
            buffNames.push(`${stat.icon} ${stat.name} +${effect.value} на ${effect.duration_minutes}м`);
          }
        }
      }
      if (buffNames.length > 0) {
        alert(`Вы получили бафф: ${buffNames.join(', ')}`);
      }
      if (itemEffects.length > 0) {
        await get().removeItem(item.id, 1);
      }
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