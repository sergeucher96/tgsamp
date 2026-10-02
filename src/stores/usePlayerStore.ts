import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { type Vehicle } from './useVehicleStore';
import {
  getEffectDef,
  DEFAULT_BUFF_MINUTES,
  MAX_MODIFIER_PERCENT,
  type ModifierKey,
} from '../features/items/data/itemEffects';

/** Тик метаболизма, мс */
const METABOLISM_TICK_MS = 120000;
/** Расход сытости за тик */
const HUNGER_DRAIN_PER_TICK = 1;
/** Расход жажды за тик — она уходит быстрее голода */
const THIRST_DRAIN_PER_TICK = 2;
/** Ниже этого значения (из 100) персонаж уставший */
const LOW_STAT_THRESHOLD = 20;
/** Дополнительный расход энергии при нехватке еды или воды */
const ENERGY_DRAIN_WHEN_TIRED = 1;
/**
 * Порог сытости и жажды, с которого организм тратит энергию на
 * восстановление, а не слив. Ниже LOW_STAT_THRESHOLD начинается
 * расход, выше — восстановление, между ними энергия стоит на месте:
 * так игрок не чувствует, что поправка на каждый шаг выедает его
 * запас, и не получает его обратно на автомате, толком не поев.
 */
const ENERGY_REGEN_THRESHOLD = 50;
/** Прирост энергии за тик при нормальном питании */
const ENERGY_REGEN_PER_TICK = 1;
/** Потолок энергии. Тот же, что у полосы в профиле. */
const ENERGY_MAX = 100;

export interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  money: number;
  hp: number;
  hunger: number;
  thirst: number;
  energy: number;
  sportEnergy: number;
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
  exp?: number;
  lvl?: number;
  luck?: number;
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
  amount: number;
  appliedAt: number;
  expiresAt: number;
  type?: string;
  /** Откуда пришёл бафф: 'food' | 'clothing' | 'manual' */
  source?: string;
}

/** Суммарные системные модификаторы игрока, в процентах */
export interface PlayerModifiers {
  xp_gain: number;
  money_gain: number;
  energy_regen: number;
  drop_rate: number;
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
  addMoney?: (amount: number) => void;
  addSkillProgress: (skillName: string, amount: number) => Promise<void>;
  loadBuffs: () => Promise<Buff[]>;
  saveBuffs: (buffs: Buff[]) => void;
  applyBuff: (buff: Omit<Buff, 'id' | 'appliedAt' | 'expiresAt'>) => void;
  removeBuff: (buffId: string) => void;
  tickBuffs: () => Promise<void>;
  getActiveBuffs: () => Buff[];
  getModifiers: () => PlayerModifiers;
  /** Пересчитать навык с учётом модификатора опыта */
  applySkillProgress: (skillName: string, amount: number) => Promise<void>;
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
        // detail приходит только от dev-обработчика и содержит
        // настоящую причину отказа Supabase, а не общий текст.
        console.error('Ошибка авторизации Telegram:', result.error, (result as { detail?: string }).detail || '');
        set({
          loading: false,
          authError: result.error || 'Ошибка проверки подлинности Telegram'
        });
        return false;
      }

      const { profile, skills, licenses, activeVehicle } = result;

      set({
        player: { ...profile, rotation: 0 },
        skills: skills || [],
        licenses: licenses || [],
        activeVehicle: activeVehicle || null,
        loading: false,
        needsRegistration: !profile.first_name,
        authError: null
      });

      // Баффы грузим после установки игрока — нужен его id для выборки из БД
      const activeBuffs = await get().loadBuffs();
      set({ activeBuffs });

      if (get().metabolismInterval) {
        clearInterval(get().metabolismInterval);
      }
      if (get().buffsInterval) {
        clearInterval(get().buffsInterval);
      }

      const metabolismInterval = setInterval(() => {
        get().processMetabolism();
      }, METABOLISM_TICK_MS);

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

    // Голод и жажда расходуются каждый тик
    if (player.hunger > 0) {
      updates.hunger = Math.max(0, player.hunger - HUNGER_DRAIN_PER_TICK);
    }
    if (player.thirst > 0) {
      updates.thirst = Math.max(0, player.thirst - THIRST_DRAIN_PER_TICK);
    }

    // На голодном желудке или от жажды организм сжигает здоровье
    const starving = (player.hunger ?? 0) <= 0;
    const parched = (player.thirst ?? 0) <= 0;
    if ((starving || parched) && player.hp > 0) {
      const damage = (starving ? 1 : 0) + (parched ? 1 : 0);
      updates.hp = Math.max(0, player.hp - damage);
    }

    // Нехватка еды и воды дополнительно выматывает
    const tired = (player.hunger ?? 0) < LOW_STAT_THRESHOLD || (player.thirst ?? 0) < LOW_STAT_THRESHOLD;
    if (tired && player.energy > 0) {
      updates.energy = Math.max(0, player.energy - ENERGY_DRAIN_WHEN_TIRED);
    }

    // Сытого организм восстанавливает сам. Без этого энергия была бы
    // односторонним сливом: раньше она только убывала от голода, и
    // спортзал нельзя было бы тренировать дважды — второй подход
    // стоил бы ресурса, которого взять уже неоткуда.
    //
    // Порог отличается от порога усталости намеренно: восстановление
    // начинается раньше, чем начинается слив. Иначе энергия застряла
    // бы в нуле у того, кто поел, но не до конца.
    const fed = (player.hunger ?? 0) >= ENERGY_REGEN_THRESHOLD
      && (player.thirst ?? 0) >= ENERGY_REGEN_THRESHOLD;
    if (fed && player.energy < ENERGY_MAX) {
      updates.energy = Math.min(ENERGY_MAX, player.energy + ENERGY_REGEN_PER_TICK);
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

  loadBuffs: async () => {
    const { player } = get();
    const fallback = (): Buff[] => {
      try {
        const raw = localStorage.getItem('player_active_buffs');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };
    if (!player) return [];

    try {
      const { data, error } = await supabase
        .from('player_buffs')
        .select('*')
        .eq('player_id', player.id);
      if (error) return fallback();

      const now = Date.now();
      const rows = (data || []) as any[];
      return rows
        .map(r => ({
          id: String(r.id),
          effect: r.effect_key,
          name: r.name,
          amount: Number(r.amount) || 0,
          duration_minutes: Number(r.duration_minutes) || DEFAULT_BUFF_MINUTES,
          source: r.source || undefined,
          type: r.type || undefined,
          appliedAt: new Date(r.applied_at).getTime(),
          expiresAt: new Date(r.expires_at).getTime(),
        }))
        .filter(b => b.expiresAt > now);
    } catch {
      return fallback();
    }
  },

  saveBuffs: (buffs: Buff[]) => {
    localStorage.setItem('player_active_buffs', JSON.stringify(buffs));
  },

  /**
   * Накладывает бафф.
   * Если такой эффект уже активен — новый приём полностью заменяет старый:
   * остаётся сильнейшее значение, время отсчитывается заново.
   */
  applyBuff: (buff: Omit<Buff, 'id' | 'appliedAt' | 'expiresAt'>) => {
    const { player, activeBuffs } = get();
    if (!player) return;

    const minutes = Number(buff.duration_minutes) || DEFAULT_BUFF_MINUTES;
    const now = Date.now();
    const amount = Number(buff.amount) || 0;

    const previous = activeBuffs.find(b => b.effect === buff.effect && b.expiresAt > now);
    const strongest = previous ? Math.max(previous.amount, amount) : amount;

    const newBuff: Buff = {
      ...buff,
      amount: strongest,
      duration_minutes: minutes,
      id: `buff_${now}_${Math.random().toString(36).slice(2, 9)}`,
      appliedAt: now,
      expiresAt: now + minutes * 60 * 1000,
    };

    // Заменяем предыдущий бафф с тем же эффектом, остальные оставляем как есть
    const kept = activeBuffs.filter(b => b.effect !== buff.effect || b.expiresAt <= now);
    const updated = [...kept, newBuff];

    set({ activeBuffs: updated });
    get().saveBuffs(updated);

    // Зеркалим в БД, чтобы бафф не пропал при смене устройства
    void (async () => {
      try {
        await supabase
          .from('player_buffs')
          .upsert({
            player_id: player.id,
            effect_key: newBuff.effect,
            name: newBuff.name,
            amount: newBuff.amount,
            duration_minutes: minutes,
            type: newBuff.type,
            source: newBuff.source,
            applied_at: new Date(newBuff.appliedAt).toISOString(),
            expires_at: new Date(newBuff.expiresAt).toISOString(),
          }, { onConflict: 'player_id,effect_key' });
      } catch {
        // таблица может быть ещё не создана — работаем на localStorage
      }
    })();
  },

  removeBuff: (buffId: string) => {
    const { activeBuffs, player } = get();
    const target = activeBuffs.find(b => b.id === buffId);
    const updated = activeBuffs.filter(b => b.id !== buffId);
    set({ activeBuffs: updated });
    get().saveBuffs(updated);
    if (target && player) {
      void supabase
        .from('player_buffs')
        .delete()
        .eq('player_id', player.id)
        .eq('effect_key', target.effect)
        .then(() => {});
    }
  },

  tickBuffs: async () => {
    const { player, activeBuffs } = get();
    if (!player || !activeBuffs.length) return;

    const now = Date.now();
    const expired = activeBuffs.filter(b => b.expiresAt <= now);
    if (expired.length === 0) return;

    const remaining = activeBuffs.filter(b => b.expiresAt > now);
    set({ activeBuffs: remaining });
    get().saveBuffs(remaining);

    try {
      await supabase
        .from('player_buffs')
        .delete()
        .eq('player_id', player.id)
        .in('effect_key', expired.map(b => b.effect));
    } catch {
      // таблица может быть ещё не создана
    }
  },

  getActiveBuffs: () => {
    const { activeBuffs } = get();
    const now = Date.now();
    return activeBuffs.filter(b => b.expiresAt > now);
  },

  /**
   * Суммарные системные модификаторы.
   * Проценты складываются, результат ограничен MAX_MODIFIER_PERCENT.
   */
  getModifiers: () => {
    const result: PlayerModifiers = { xp_gain: 0, money_gain: 0, energy_regen: 0, drop_rate: 0 };
    get().getActiveBuffs().forEach(buff => {
      const def = getEffectDef(buff.effect);
      if (def.kind !== 'modifier' || !def.modifier) return;
      result[def.modifier] += Number(buff.amount) || 0;
    });
    (Object.keys(result) as ModifierKey[]).forEach(k => {
      result[k] = Math.min(MAX_MODIFIER_PERCENT, result[k]);
    });
    return result;
  },

  /** Навык с учётом бонуса «Опыт профессий» */
  applySkillProgress: async (skillName: string, amount: number) => {
    const { xp_gain } = get().getModifiers();
    const multiplier = 1 + xp_gain / 100;
    await get().addSkillProgress(skillName, amount * multiplier);
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