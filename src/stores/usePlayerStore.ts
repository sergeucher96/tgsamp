import { create } from 'zustand';
import { supabase } from '../services/supabase/client';

export interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  money: number;
  hp: number;
  hunger: number;
  energy: number;
  registered_at: string | null;
  rotation: number;
  inv_slots: number;
  activeVehicle: Vehicle | null;
  pos_x: number;
  pos_y: number;
  last_node_id: string | null;
  bank_balance: number;
  deposit_balance: number;
  phone_number: string | null;
  driving_exam_attempts: { moto: number; car: number; truck: number };
  gun_range_attempts: number;
  organization_id: string | null;
  organization_rank: string | null;
}

export interface Skill {
  player_id: string;
  skill_name: string;
  value: number;
  category: string;
}

export interface License {
  id?: string;
  name?: string;
  icon?: string;
  desc?: string;
  player_id?: string;
  license_type?: string;
  expires_at?: string;
}

export interface Buff {
  id: string;
  name: string;
  duration_minutes: number;
  effect: string;
  appliedAt: number;
  expiresAt: number;
}

export interface Vehicle {
  id: string;
  model_id: string;
  color: number;
  house_id: string | null;
  fuel: number;
  max_fuel: number;
  fuel_type: string;
  plate: string;
  engine_stage: number;
  suspension_stage: number;
  brakes_stage: number;
  has_nitro: boolean;
  health: number;
  is_active: boolean;
  owner_id: string;
  x: number;
  y: number;
}

interface AuthResponse {
  success: boolean;
  profile?: Profile;
  skills?: Skill[];
  licenses?: License[];
  activeVehicle?: Vehicle | null;
  error?: string;
}

interface PlayerState {
  player: Profile | null;
  skills: Skill[];
  licenses: License[];
  activeVehicle: Vehicle | null;
  loading: boolean;
  needsRegistration: boolean;
  metabolismInterval: ReturnType<typeof setInterval> | null;
  buffsInterval: ReturnType<typeof setInterval> | null;
  activeBuffs: Buff[];
  authError: string | null;

  login: () => Promise<boolean>;
  logout: () => void;
  processMetabolism: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  setLocalActiveVehicle: (veh: Vehicle | null) => void;
  addSkillProgress: (skillName: string, amount: number) => Promise<void>;
  loadBuffs: () => Buff[];
  saveBuffs: (buffs: Buff[]) => void;
  applyBuff: (buff: Omit<Buff, 'id' | 'appliedAt' | 'expiresAt'>) => void;
  removeBuff: (buffId: string) => void;
  tickBuffs: () => Promise<void>;
  getActiveBuffs: () => Buff[];
  finishRegistration: (form: { firstName: string; lastName: string; gender: string }) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
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

    let tg = window.Telegram?.WebApp;
    let attempts = 0;
    const maxAttempts = 30;
    while (!tg && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 100));
      tg = window.Telegram?.WebApp;
      attempts++;
    }

    const rawInitData = tg?.initData || (import.meta.env.DEV ? 'DEV_DEBUG' : '');
    console.log('[Auth] Telegram detected:', !!tg);
    console.log('[Auth] initData length:', rawInitData?.length || 0);
    console.log('[Auth] DEV mode:', import.meta.env.DEV);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: rawInitData }),
      });

      const result: AuthResponse = await response.json();
      console.log('[Auth] Response status:', response.status);

      if (!response.ok || !result.success) {
        console.error('Ошибка авторизации Telegram:', result.error);
        set({
          loading: false,
          authError: result.error || 'Ошибка проверки подлинности Telegram'
        });
        return false;
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

      if (get().metabolismInterval) {
        clearInterval(get().metabolismInterval);
      }
      if (get().buffsInterval) {
        clearInterval(get().buffsInterval);
      }

      const metabolismInterval = setInterval(() => {
        get().processMetabolism();
      }, 120000);

      const buffsInterval = setInterval(() => {
        get().tickBuffs();
      }, 30000);

      set({ metabolismInterval, buffsInterval });

      return true;

    } catch (err) {
      console.error('Сетевая ошибка авторизации:', err);
      set({ loading: false, authError: 'Не удалось связаться с сервером игры' });
      return false;
    }
  },

  logout: () => {
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

  processMetabolism: async () => {
    const { player, updateProfile } = get();
    if (!player) return;

    const updates: Partial<Profile> = {};

    if (player.hunger > 0) {
      updates.hunger = Math.max(0, player.hunger - 1);
    } else if (player.hp > 5) {
      updates.hp = player.hp - 1;
    }

    if (Object.keys(updates).length > 0) {
      await updateProfile(updates);
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { player } = get();
    if (!player) return false;

    set({ player: { ...player, ...updates } });

    const dbFields = { ...updates };
    ['rotation', 'activeVehicle'].forEach(k => delete dbFields[k]);

    if (Object.keys(dbFields).length > 0) {
      const { error } = await supabase.from('profiles').update(dbFields).eq('id', player.id);
      return !error;
    }
    return true;
  },

  setLocalActiveVehicle: (veh: Vehicle | null) => set({ activeVehicle: veh }),

  addSkillProgress: async (skillName: string, amount: number) => {
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

  saveBuffs: (buffs: Buff[]) => {
    localStorage.setItem('player_active_buffs', JSON.stringify(buffs));
  },

  applyBuff: (buff: Omit<Buff, 'id' | 'appliedAt' | 'expiresAt'>) => {
    const { player, activeBuffs } = get();
    if (!player) return;
    const newBuff: Buff = {
      ...buff,
      id: `buff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      appliedAt: Date.now(),
      expiresAt: Date.now() + (Number(buff.duration_minutes) || 60) * 60 * 1000,
    };
    const updated = [...activeBuffs, newBuff];
    set({ activeBuffs: updated });
    get().saveBuffs(updated);
  },

  removeBuff: (buffId: string) => {
    const { activeBuffs } = get();
    const updated = activeBuffs.filter(b => b.id !== buffId);
    set({ activeBuffs: updated });
    get().saveBuffs(updated);
  },

  tickBuffs: async () => {
    const { player, activeBuffs } = get();
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

  finishRegistration: async (form: { firstName: string; lastName: string; gender: string }) => {
    const { player } = get();
    const { data, error } = await supabase.from('profiles').update({
      first_name: form.firstName,
      last_name: form.lastName,
      gender: form.gender,
      username: `${form.firstName}_${form.lastName}`,
      registered_at: new Date().toISOString(),
      inv_slots: 12
    }).eq('id', player.id).select().single();
    if (!error) set({ player: data, needsRegistration: false });
  }
}));