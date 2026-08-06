import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { useInventoryStore } from './useInventoryStore';

export const usePlayerStore = create((set, get) => ({
  player: null,
  skills: [],
  licenses: [],
  activeVehicle: null,
  loading: true,
  needsRegistration: false,

  login: async () => {
    set({ loading: true });
    const tgData = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const tgId = tgData?.id?.toString() || "DEBUG_PLAYER_1";

    try {
      let { data: profile } = await supabase.from('profiles').select('*').eq('telegram_id', tgId).maybeSingle();

      if (!profile) {
        const { data: newProf } = await supabase.from('profiles').insert([{ telegram_id: tgId, money: 50000, inv_slots: 12, bank_balance: 0 }]).select().single();
        profile = newProf;
      }

      const [skills, licenses, vehicle] = await Promise.all([
        supabase.from('player_skills').select('*').eq('player_id', profile.id),
        supabase.from('player_licenses').select('*').eq('player_id', profile.id),
        supabase.from('vehicles').select('*').eq('owner_id', profile.id).eq('is_active', true).maybeSingle()
      ]);

      set({ 
        player: { ...profile, rotation: 0 }, 
        skills: skills.data || [], 
        licenses: licenses.data || [],
        activeVehicle: vehicle.data || null,
        loading: false, 
        needsRegistration: !profile.first_name 
      });

      // ЗАПУСКАЕМ МЕТАБОЛИЗМ (Раз в 2 минуты -1 энергия)
      setInterval(() => {
        get().processMetabolism();
      }, 120000);

      // Проверяем, есть ли у игрока телефон, если нет — выдаём
      const { items, fetchPlayerInventory } = useInventoryStore.getState();
      const hasPhone = items.some(i => i.item_id === 'phone');
      if (!hasPhone) {
        await supabase.from('inventory').insert([{
          owner_id: profile.id.toString(),
          item_id: 'phone',
          amount: 1,
          storage_type: 'player'
        }]);
        await fetchPlayerInventory();
      }


    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  // ЛОГИКА ПАССИВНОГО ГОЛОДА
  processMetabolism: async () => {
    const { player, updateProfile } = get();
    if (!player || player.energy <= 0) {
        // Если энергия на нуле, начинаем потихоньку отнимать HP
        if (player?.energy <= 0 && player?.hp > 5) {
            await updateProfile({ hp: player.hp - 2 });
        }
        return;
    }
    
    // Отнимаем 1 единицу энергии
    await updateProfile({ energy: player.energy - 1 });
  },

  updateProfile: async (updates) => {
    const { player } = get();
    if (!player) return;

    // Локальное обновление
    set({ player: { ...player, ...updates } });

    // Чистка для БД
    const dbFields = { ...updates };
    ['rotation', 'activeVehicle'].forEach(k => delete dbFields[k]);

    if (Object.keys(dbFields).length > 0) {
      const { error } = await supabase.from('profiles').update(dbFields).eq('id', player.id);
      return !error;
    }
    return true;
  },

  setLocalActiveVehicle: (veh) => set({ activeVehicle: veh }),

  // Прокачка профессионального навыка (0-100)
  addSkillProgress: async (skillName, amount) => {
    const { player, skills } = get();
    if (!player || !skillName || !amount) return;

    const existing = (skills || []).find((s) => s.skill_name === skillName);
    const nextValue = Math.min(100, Math.round((existing?.value || 0) + amount));

    set({
      skills: existing
        ? skills.map((s) => (s.skill_name === skillName ? { ...s, value: nextValue } : s))
        : [...(skills || []), { player_id: player.id, skill_name: skillName, value: nextValue }],
    });

    if (existing) {
      await supabase.from('player_skills').update({ value: nextValue }).eq('player_id', player.id).eq('skill_name', skillName);
    } else {
      await supabase.from('player_skills').insert([{ player_id: player.id, skill_name: skillName, value: nextValue }]);
    }
  },
  
  finishRegistration: async (form) => {
    const { player } = get();
    const { data, error } = await supabase.from('profiles').update({
      first_name: form.firstName, last_name: form.lastName, gender: form.gender,
      username: `${form.firstName}_${form.lastName}`, registered_at: new Date().toISOString(),
      inv_slots: 12 // Устанавливаем базу при регистрации
    }).eq('id', player.id).select().single();
    if (!error) set({ player: data, needsRegistration: false });
  }
}));