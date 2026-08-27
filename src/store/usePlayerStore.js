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
  metabolismInterval: null,

  login: async () => {
    set({ loading: true });
    const tgData = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const tgId = tgData?.id?.toString() || "DEBUG_PLAYER_1";

    try {
      let { data: profile } = await supabase.from('profiles').select('*').eq('telegram_id', tgId).maybeSingle();

      if (!profile) {
        const { data: newProf } = await supabase.from('profiles').insert([{ telegram_id: tgId, money: 50000, inv_slots: 12, bank_balance: 0, deposit_balance: 0 }]).select().single();
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

      // Clean up existing interval if any
      if (get().metabolismInterval) {
        clearInterval(get().metabolismInterval);
      }

      // ЗАПУСКАЕМ МЕТАБОЛИЗМ (Раз в 2 минуты -1 энергия)
      const interval = setInterval(() => {
        get().processMetabolism();
      }, 120000);

      set({ metabolismInterval: interval });


    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  logout: () => {
    // Clean up metabolism interval on logout
    if (get().metabolismInterval) {
      clearInterval(get().metabolismInterval);
      set({ metabolismInterval: null });
    }
    set({
      player: null,
      skills: [],
      licenses: [],
      activeVehicle: null,
      loading: true,
      needsRegistration: false
    });
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

    try {
      if (existing) {
        const { error } = await supabase.from('player_skills')
          .update({ value: nextValue })
          .eq('player_id', player.id)
          .eq('skill_name', skillName);
        if (error) console.error('Skill update error:', error);
      } else {
        const { error } = await supabase.from('player_skills')
          .insert([{ player_id: player.id, skill_name: skillName, value: nextValue, category: 'general' }]);
        if (error) console.error('Skill insert error:', error);
      }
    } catch (err) {
      console.error('Failed to save skill progress:', err);
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