import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { useInventoryStore } from './useInventoryStore';
import type { VehicleWearData } from '../features/vehicles/utils/vehicleWear';

export interface Player {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  gender?: string | null;

  hp?: number;
  hunger?: number;
  thirst?: number;

  pos_x: number;
  pos_y: number;
  rotation?: number;
  last_node_id?: string | null;

  inv_slots?: number;
  registered_at?: string | null;

  [key: string]: unknown;
}

export interface PlayerSkill {
  player_id: string;
  skill_name: string;
  value: number;
  category?: string;
}

export interface PlayerLicense {
  [key: string]: unknown;
}

export interface ActiveBuff {
  id: string;
  appliedAt: number;
  expiresAt: number;
  duration_minutes?: number | string;
  [key: string]: unknown;
}

export interface ActiveVehicle extends VehicleWearData {
  id: string;
  model_id: VehicleWearData['model_id'];
  health?: number;
}

export interface RegistrationForm {
  firstName: string;
  lastName: string;
  gender: string;
}

export type PlayerProfileUpdates = Partial<Player> & {
  rotation?: number;
  activeVehicle?: ActiveVehicle | null;
};

interface PlayerStore {
  player: Player | null;
  skills: PlayerSkill[];
  licenses: PlayerLicense[];
  activeVehicle: ActiveVehicle | null;

  loading: boolean;
  needsRegistration: boolean;

  metabolismInterval: ReturnType<typeof setInterval> | null;
  buffsInterval: ReturnType<typeof setInterval> | null;

  activeBuffs: ActiveBuff[];
  authError: string | null;

  login: () => Promise<boolean>;
  logout: () => void;

  processMetabolism: () => Promise<void>;
  updateProfile: (
    updates: PlayerProfileUpdates
  ) => Promise<boolean | undefined>;

  setLocalActiveVehicle: (
    vehicle: ActiveVehicle | null
  ) => void;

  addSkillProgress: (
    skillName: string,
    amount: number
  ) => Promise<void>;

  loadBuffs: () => ActiveBuff[];
  saveBuffs: (buffs: ActiveBuff[]) => void;

  applyBuff: (
    buff: Partial<ActiveBuff>
  ) => void;

  removeBuff: (
    buffId: string
  ) => void;

  tickBuffs: () => Promise<void>;

  getActiveBuffs: () => ActiveBuff[];

  finishRegistration: (
    form: RegistrationForm
  ) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>(
  (set, get) => ({
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
      const maxAttempts = 30;

      while (!tg && attempts < maxAttempts) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, 100)
        );

        tg = window.Telegram?.WebApp;
        attempts++;
      }

      const rawInitData =
        tg?.initData ||
        (import.meta.env.DEV ? 'DEV_DEBUG' : '');

      console.log(
        '[Auth] Telegram detected:',
        !!tg
      );

      console.log(
        '[Auth] initData length:',
        rawInitData?.length || 0
      );

      console.log(
        '[Auth] DEV mode:',
        import.meta.env.DEV
      );

      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initData: rawInitData,
          }),
        });

        const result = await response.json();

        console.log(
          '[Auth] Response status:',
          response.status
        );

        if (!response.ok || !result.success) {
          console.error(
            'Ошибка авторизации Telegram:',
            result.error
          );

          set({
            loading: false,
            authError:
              result.error ||
              'Ошибка проверки подлинности Telegram',
          });

          return false;
        }

        const {
          profile,
          skills,
          licenses,
          activeVehicle,
        } = result;

        const activeBuffs =
          get().loadBuffs();

        set({
          player: {
            ...profile,
            rotation: 0,
          },

          skills: skills || [],
          licenses: licenses || [],
          activeVehicle:
            activeVehicle || null,

          loading: false,

          needsRegistration:
            !profile.first_name,

          activeBuffs,

          authError: null,
        });

        // Clean up existing intervals
        if (get().metabolismInterval) {
          clearInterval(
            get().metabolismInterval
          );
        }

        if (get().buffsInterval) {
          clearInterval(
            get().buffsInterval
          );
        }

        const metabolismInterval =
          setInterval(() => {
            get().processMetabolism();
          }, 120000);

        const buffsInterval =
          setInterval(() => {
            get().tickBuffs();
          }, 30000);

        set({
          metabolismInterval,
          buffsInterval,
        });

        return true;
      } catch (err) {
        console.error(
          'Сетевая ошибка авторизации:',
          err
        );

        set({
          loading: false,
          authError:
            'Не удалось связаться с сервером игры',
        });

        return false;
      }
    },

    logout: () => {
      if (get().metabolismInterval) {
        clearInterval(
          get().metabolismInterval
        );

        set({
          metabolismInterval: null,
        });
      }

      if (get().buffsInterval) {
        clearInterval(
          get().buffsInterval
        );

        set({
          buffsInterval: null,
        });
      }

      set({
        player: null,
        skills: [],
        licenses: [],
        activeVehicle: null,
        loading: true,
        needsRegistration: false,
        activeBuffs: [],
      });
    },

    processMetabolism: async () => {
      const {
        player,
        updateProfile,
      } = get();

      if (!player) return;

      const updates: PlayerProfileUpdates = {};

      if (
        typeof player.hunger === 'number' &&
        player.hunger > 0
      ) {
        updates.hunger = Math.max(
          0,
          player.hunger - 1
        );
      } else if (
        typeof player.hp === 'number' &&
        player.hp > 5
      ) {
        updates.hp = player.hp - 1;
      }

      if (
        Object.keys(updates).length > 0
      ) {
        await updateProfile(updates);
      }
    },

    updateProfile: async (
      updates
    ) => {
      const { player } = get();

      if (!player) return;

      set({
        player: {
          ...player,
          ...updates,
        },
      });

      const dbFields: Record<
        string,
        unknown
      > = {
        ...updates,
      };

      delete dbFields.rotation;
      delete dbFields.activeVehicle;

      if (
        Object.keys(dbFields).length > 0
      ) {
        const { error } =
          await supabase
            .from('profiles')
            .update(dbFields)
            .eq('id', player.id);

        return !error;
      }

      return true;
    },

    setLocalActiveVehicle: (
      veh
    ) => {
      set({
        activeVehicle: veh,
      });
    },

    addSkillProgress: async (
      skillName,
      amount
    ) => {
      const {
        player,
        skills,
      } = get();

      if (
        !player ||
        !skillName ||
        !amount
      ) {
        return;
      }

      const existing =
        skills.find(
          (skill) =>
            skill.skill_name ===
            skillName
        );

      const nextValue = Math.min(
        100,
        Math.round(
          (existing?.value || 0) +
            amount
        )
      );

      set({
        skills: existing
          ? skills.map((skill) =>
              skill.skill_name ===
              skillName
                ? {
                    ...skill,
                    value: nextValue,
                  }
                : skill
            )
          : [
              ...skills,
              {
                player_id: player.id,
                skill_name: skillName,
                value: nextValue,
                category: 'general',
              },
            ],
      });

      try {
        if (existing) {
          const { error } =
            await supabase
              .from('player_skills')
              .update({
                value: nextValue,
              })
              .eq(
                'player_id',
                player.id
              )
              .eq(
                'skill_name',
                skillName
              );

          if (error) {
            console.error(
              'Skill update error:',
              error
            );
          }
        } else {
          const { error } =
            await supabase
              .from('player_skills')
              .insert([
                {
                  player_id: player.id,
                  skill_name: skillName,
                  value: nextValue,
                  category: 'general',
                },
              ]);

          if (error) {
            console.error(
              'Skill insert error:',
              error
            );
          }
        }
      } catch (err) {
        console.error(
          'Failed to save skill progress:',
          err
        );
      }
    },

    loadBuffs: () => {
      try {
        const raw =
          localStorage.getItem(
            'player_active_buffs'
          );

        return raw
          ? (JSON.parse(
              raw
            ) as ActiveBuff[])
          : [];
      } catch {
        return [];
      }
    },

    saveBuffs: (
      buffs
    ) => {
      localStorage.setItem(
        'player_active_buffs',
        JSON.stringify(buffs)
      );
    },

    applyBuff: (
      buff
    ) => {
      const {
        player,
        activeBuffs,
      } = get();

      if (!player) return;

      const now = Date.now();

      const newBuff: ActiveBuff = {
        ...buff,
        id: `buff_${now}_${Math.random()
          .toString(36)
          .slice(2, 9)}`,
        appliedAt: now,
        expiresAt:
          now +
          (Number(
            buff.duration_minutes
          ) || 60) *
            60 *
            1000,
      };

      const updated = [
        ...activeBuffs,
        newBuff,
      ];

      set({
        activeBuffs: updated,
      });

      get().saveBuffs(updated);
    },

    removeBuff: (
      buffId
    ) => {
      const {
        activeBuffs,
      } = get();

      const updated =
        activeBuffs.filter(
          (buff) =>
            buff.id !== buffId
        );

      set({
        activeBuffs: updated,
      });

      get().saveBuffs(updated);
    },

    tickBuffs: async () => {
      const {
        player,
        activeBuffs,
      } = get();

      if (
        !player ||
        !activeBuffs.length
      ) {
        return;
      }

      const now = Date.now();

      const expired =
        activeBuffs.filter(
          (buff) =>
            buff.expiresAt <= now
        );

      const remaining =
        activeBuffs.filter(
          (buff) =>
            buff.expiresAt > now
        );

      if (expired.length > 0) {
        set({
          activeBuffs: remaining,
        });

        get().saveBuffs(
          remaining
        );
      }
    },

    getActiveBuffs: () => {
      const {
        activeBuffs,
      } = get();

      const now = Date.now();

      return activeBuffs.filter(
        (buff) =>
          buff.expiresAt > now
      );
    },

    finishRegistration: async (
      form
    ) => {
      const { player } = get();

      if (!player) return;

      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .update({
          first_name:
            form.firstName,
          last_name:
            form.lastName,
          gender:
            form.gender,
          username:
            `${form.firstName}_${form.lastName}`,
          registered_at:
            new Date().toISOString(),
          inv_slots: 12,
        })
        .eq('id', player.id)
        .select()
        .single();

      if (!error) {
        set({
          player: data as Player,
          needsRegistration: false,
        });
      }
    },
  })
);