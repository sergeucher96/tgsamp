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
  authError: null,

  login: async () => {
    set({ loading: true });

    // Wait for Telegram WebApp script to load
    let tg = window.Telegram?.WebApp;
    let attempts = 0;
    const maxAttempts = 30; // max 3 seconds
    while (!tg && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 100));
      tg = window.Telegram?.WebApp;
      attempts++;
    }

    // Получаем сырую подписанную строку от Telegram Web App
    const rawInitData = tg?.initData || (import.meta.env.DEV ? 'DEV_DEBUG' : '');
    console.log('[Auth] Telegram detected:', !!tg);
    console.log('[Auth] initData length:', rawInitData?.length || 0);
    console.log('[Auth] DEV mode:', import.meta.env.DEV);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData: rawInitData }),
      });

      const result = await response.json();
      console.log('[Auth] Response status:', response.status);

      if (!response.ok || !result.success) {
        console.error('Ошибка авторизации Telegram:', result.error);
        set({
          loading: false,
          authError: result.error || 'Ошибка проверки подлинности Telegram'
        });
        return;
      }

      const { profile, skills, licenses, activeVehicle } = result;
      const activeBuffs = get().loadBuffs();

      set({
        player: { ...profile, rotation: 0 },
        skills: skills || [],
        licenses: licenses || [],
        activeVehicle: activeVehicle || null,
        loading: false,
        needsRegistration: !profile.first_name,
        activeBuffs,
        authError: null
      });

      // Clean up existing intervals if any
      if (get().metabolismInterval) {
        clearInterval(get().metabolismInterval);
      }
      if (get().buffsInterval) {
        clearInterval(get().buffsInterval);
      }

      // ЗАПУСКАЕМ МЕТАБОЛИЗМ (Раз в 2 минуты -1 голод)
      const metabolismInterval = setInterval(() => {
        get().processMetabolism();
      }, 120000);

      // ЗАПУСКАЕМ ОБРАБОТКУ БАФФОВ (Раз в 30 секунд)
      const buffsInterval = setInterval(() => {
        get().tickBuffs();
      }, 30000);

      set({ metabolismInterval, buffsInterval });

    } catch (err) {
      console.error('Сетевая ошибка авторизации:', err);
      set({ loading: false, authError: 'Не удалось связаться с сервером игры' });
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

  // ЛОГИКА ПАССИВНОГО ГОЛОДА
  processMetabolism: async () => {
    const { player, updateProfile } = get();
    if (!player) return;

    const updates = {};

    // Голод уменьшается со временем
    if (player.hunger > 0) {
      updates.hunger = Math.max(0, player.hunger - 1);
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