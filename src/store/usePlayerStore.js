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
  buffsInterval: null,
  activeBuffs: [],

  login: async () => {
    set({ loading: true });
    const tgData = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const tgId = tgData?.id?.toString() || "DEBUG_PLAYER_1";

    try {
      let { data: profile } = await supabase.from('profiles').select('*').eq('telegram_id', tgId).maybeSingle();

      if (!profile) {
        const { data: newProf } = await supabase.from('profiles').insert([{ 
          telegram_id: tgId, 
          money: 50000, 
          inv_slots: 12, 
          bank_balance: 0, 
          deposit_balance: 0,
          energy: 100,
          hp: 100,
          hunger: 100,
          thirst: 100
        }]).select().single();
        profile = newProf;
      }

      const [skills, licenses, vehicle] = await Promise.all([
        supabase.from('player_skills').select('*').eq('player_id', profile.id),
        supabase.from('player_licenses').select('*').eq('player_id', profile.id),
        supabase.from('vehicles').select('*').eq('owner_id', profile.id).eq('is_active', true).maybeSingle()
      ]);

      const activeBuffs = get().loadBuffs();

      set({ 
        player: { ...profile, rotation: 0 }, 
        skills: skills.data || [], 
        licenses: licenses.data || [],
        activeVehicle: vehicle.data || null,
        loading: false, 
        needsRegistration: !profile.first_name,
        activeBuffs
      });

      // Clean up existing intervals if any
      if (get().metabolismInterval) {
        clearInterval(get().metabolismInterval);
      }
      if (get().buffsInterval) {
        clearInterval(get().buffsInterval);
      }

      // ЗАПУСКАЕМ МЕТАБОЛИЗМ (Раз в 2 минуты -1 энергия)
      const metabolismInterval = setInterval(() => {
        get().processMetabolism();
      }, 120000);

      // ЗАПУСКАЕМ ОБРАБОТКУ БАФФОВ (Раз в 30 секунд)
      const buffsInterval = setInterval(() => {
        get().tickBuffs();
      }, 30000);

      set({ metabolismInterval, buffsInterval });


    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  logout: () => {
    // Clean up intervals on logout
    if (get().metabolismInterval) {
      clearInterval(get().metabolismInterval);
      set({ metabolismInterval: null });
    }
    if (get().buffsInterval) {
      clearInterval(get().buffsInterval);
      set({ buffsInterval: null });
    }
    set({
      player: null,
      skills: [],
      licenses: [],
      activeVehicle: null,
      loading: true,
      needsRegistration: false,
      activeBuffs: []
    });
  },

  // ЛОГИКА ПАССИВНОГО ГОЛОДА И ЖАЖДЫ
  processMetabolism: async () => {
    const { player, updateProfile } = get();
    if (!player) return;

    const updates = {};
    if (player.energy > 0) {
      updates.energy = Math.max(0, player.energy - 1);
    } else if (player.hp > 5) {
      updates.hp = player.hp - 2;
    }

    if (player.hunger > 0) {
      updates.hunger = Math.max(0, player.hunger - 1);
    } else if (player.hp > 5) {
      updates.hp = player.hp - 1;
    }

    if (player.thirst > 0) {
      updates.thirst = Math.max(0, player.thirst - 1);
    } else if (player.hp > 5) {
      updates.hp = player.hp - 1;
    }

    if (Object.keys(updates).length > 0) {
      await updateProfile(updates);
    }
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
        : [...(skills || []), { player_id: player.id, skill_name: skillName, value: nextValue, category: 'general' }],
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

  loadBuffs: () => {
    try {
      const raw = localStorage.getItem('player_active_buffs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveBuffs: (buffs) => {
    localStorage.setItem('player_active_buffs', JSON.stringify(buffs));
  },

  applyBuff: (buff) => {
    const { player, activeBuffs } = get();
    if (!player) return;
    const newBuff = {
      ...buff,
      id: `buff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      appliedAt: Date.now(),
      expiresAt: Date.now() + (Number(buff.duration_minutes) || 60) * 60 * 1000,
    };
    const updated = [...activeBuffs, newBuff];
    set({ activeBuffs: updated });
    get().saveBuffs(updated);
  },

  removeBuff: (buffId) => {
    const { activeBuffs } = get();
    const updated = activeBuffs.filter(b => b.id !== buffId);
    set({ activeBuffs: updated });
    get().saveBuffs(updated);
  },

  tickBuffs: async () => {
    const { player, activeBuffs, updateProfile } = get();
    if (!player || !activeBuffs.length) return;

    const now = Date.now();
    const expired = activeBuffs.filter(b => b.expiresAt <= now);
    const remaining = activeBuffs.filter(b => b.expiresAt > now);

    if (expired.length > 0) {
      set({ activeBuffs: remaining });
      get().saveBuffs(remaining);
    }
  },

  getActiveBuffs: () => {
    const { activeBuffs } = get();
    const now = Date.now();
    return activeBuffs.filter(b => b.expiresAt > now);
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