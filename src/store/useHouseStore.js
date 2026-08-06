import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { useQuestStore } from './useQuestStore';
import { HOUSE_CLASSES } from '../data/houseConfig';

export const useHouseStore = create((set, get) => ({
  dbHouses: [], 
  isProcessing: false,

  fetchDbHouses: async () => {
    const { data, error } = await supabase.from('houses').select('*');
    if (!error) set({ dbHouses: data || [] });
  },

  manageSafe: async (houseId, amountInput, type) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const house = get().dbHouses.find(h => h.id_name === houseId);

    if (!house || !player) return false;

    // --- ЖЕЛЕЗОБЕТОННАЯ ПРОВЕРКА ЧИСЛА ---
    const amount = parseInt(amountInput); // Превращаем строку в целое число
    
    if (isNaN(amount) || amount <= 0) {
      alert("ОШИБКА: Введите корректное положительное число!");
      return false;
    }

    let newSafeBalance = Number(house.safe_balance || 0);
    let newPlayerMoney = Number(player.money || 0);

    if (type === 'deposit') {
      if (newPlayerMoney < amount) {
        alert("У вас нет такой суммы наличными!");
        return false;
      }
      newSafeBalance += amount;
      newPlayerMoney -= amount;
    } else {
      if (newSafeBalance < amount) {
        alert("В сейфе недостаточно средств!");
        return false;
      }
      newSafeBalance -= amount;
      newPlayerMoney += amount;
    }

    try {
      // Обновляем сейф в БД
      const { error } = await supabase
        .from('houses')
        .update({ safe_balance: newSafeBalance })
        .eq('id_name', houseId);

      if (error) throw error;

      // Обновляем деньги игрока
      await updateProfile({ money: newPlayerMoney });
      
      // Обновляем локальный список домов
      await get().fetchDbHouses();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  buyHouse: async (houseLocation) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const hConfig = HOUSE_CLASSES[houseLocation.class] || HOUSE_CLASSES.economy;

    if (!player || Number(player.money) < hConfig.price) {
      alert("Недостаточно наличных!");
      return false;
    }

    try {
      const { error: dbError } = await supabase
        .from('houses')
        .upsert({
          id_name: houseLocation.id,
          owner_id: player.id,
          is_for_sale: false,
          class: houseLocation.class,
          name: houseLocation.name,
          garage_slots: hConfig.garage_slots,
          wardrobe_slots: hConfig.wardrobe_slots
        }, { onConflict: 'id_name' });

      if (dbError) throw dbError;
      await updateProfile({ money: Number(player.money) - hConfig.price });
      useQuestStore.getState().registerEvent('buy_house');
      await get().fetchDbHouses();
      alert(`Поздравляем с покупкой!`);
      return true;
    } catch (err) {
      console.error(err);
      alert("Ошибка БД. Проверьте UNIQUE у id_name");
    }
    return false;
  }
}));