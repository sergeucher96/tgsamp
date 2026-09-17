import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { usePlayerStore } from './usePlayerStore';
import { GunRangeSettings } from '../features/market/data/weaponConfig';

export type WeaponType = 'deagle' | 'shotgun' | 'carbine';
export type LicenseType = 'weapon' | 'moto' | 'car' | 'truck';

export interface WeaponState {
  level: number;
  owned: boolean;
}

export interface WeaponsMap {
  deagle: WeaponState;
  shotgun: WeaponState;
  carbine: WeaponState;
}

export interface DBLicense {
  player_id: string;
  license_type: string;
  expires_at: string;
}

export interface DrivingExamAttempts {
  moto: number;
  car: number;
  truck: number;
}

interface WeaponStoreState {
  weapons: WeaponsMap;
  weaponLicense: boolean;
  drivingExamAttempts: DrivingExamAttempts;
  gunRangeAttempts: number;
  loading: boolean;

  fetchWeapons: () => Promise<void>;
  buyWeapon: (weaponType: WeaponType) => Promise<boolean>;
  upgradeWeapon: (weaponType: WeaponType, xpGained: number) => Promise<boolean>;
  buyWeaponLicense: () => Promise<boolean>;
  takeDrivingExam: (licenseType: LicenseType) => Promise<boolean>;
  getDrivingLicense: (licenseType: LicenseType) => Promise<boolean>;
  startGunRangeSession: () => Promise<boolean>;
  hasDrivingLicense: (licenseType: LicenseType) => boolean;
}

const initialWeapons: WeaponsMap = {
  deagle: { level: 0, owned: false },
  shotgun: { level: 0, owned: false },
  carbine: { level: 0, owned: false },
};

const initialDrivingExamAttempts: DrivingExamAttempts = {
  moto: 0,
  car: 0,
  truck: 0,
};

export const useWeaponStore = create<WeaponStoreState>((set, get) => ({
  weapons: initialWeapons,
  weaponLicense: false,
  drivingExamAttempts: initialDrivingExamAttempts,
  gunRangeAttempts: 0,
  loading: true,

  fetchWeapons: async () => {
    const player = usePlayerStore.getState().player;
    if (!player) return;

    set({ loading: true });
    try {
      const { data: weaponData } = await supabase
        .from('player_weapons')
        .select('*')
        .eq('player_id', player.id);

      const weapons = { ...initialWeapons };

      (weaponData || []).forEach(w => {
        if (w.weapon_type in weapons) {
          weapons[w.weapon_type as WeaponType] = {
            level: w.level || 0,
            owned: w.owned || false,
          };
        }
      });

      const licenses = usePlayerStore.getState().licenses;
      const hasWeaponLicense = licenses.some(l => l.license_type === 'weapon');

      const drivingExamAttempts = { ...initialDrivingExamAttempts };
      if (player.driving_exam_attempts) {
        drivingExamAttempts.moto = player.driving_exam_attempts.moto || 0;
        drivingExamAttempts.car = player.driving_exam_attempts.car || 0;
        drivingExamAttempts.truck = player.driving_exam_attempts.truck || 0;
      }

      set({
        weapons,
        weaponLicense: hasWeaponLicense,
        drivingExamAttempts,
        gunRangeAttempts: player.gun_range_attempts || 0,
        loading: false,
      });
    } catch (err) {
      console.error('Error fetching weapons:', err);
      set({ loading: false });
    }
  },

  buyWeapon: async (weaponType: WeaponType) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const { weapons, weaponLicense } = get();

    if (!player) return false;
    if (!weaponLicense) {
      alert('Нужна лицензия на оружие!');
      return false;
    }
    if (weapons[weaponType]?.owned) {
      alert('У вас уже есть это оружие!');
      return false;
    }

    const { WEAPON_CONFIG } = await import('../features/market/data/weaponConfig');
    const weaponConfig = WEAPON_CONFIG[weaponType];
    if (!weaponConfig) return false;

    if (Number(player.money) < weaponConfig.price) {
      alert(`Недостаточно денег! Нужно $${weaponConfig.price}`);
      return false;
    }

    try {
      await updateProfile({ money: Number(player.money) - weaponConfig.price });

      await supabase.from('player_weapons').upsert({
        player_id: player.id,
        weapon_type: weaponType,
        level: 0,
        owned: true,
      });

      set(state => ({
        weapons: {
          ...state.weapons,
          [weaponType]: { level: 0, owned: true },
        },
      }));

      return true;
    } catch (err) {
      console.error('Error buying weapon:', err);
      return false;
    }
  },

  upgradeWeapon: async (weaponType: WeaponType, xpGained: number) => {
    const { weapons } = get();
    if (!weapons[weaponType]?.owned) return false;

    const { WEAPON_CONFIG } = await import('../features/market/data/weaponConfig');
    const weaponConfig = WEAPON_CONFIG[weaponType];
    const currentLevel = weapons[weaponType].level;
    const maxLevel = weaponConfig.maxLevel;

    if (currentLevel >= maxLevel) {
      alert('Максимальный уровень достигнут!');
      return false;
    }

    const xpNeeded = (currentLevel + 1) * 50;
    if (xpGained < xpNeeded) return false;

    const newLevel = currentLevel + 1;

    try {
      const player = usePlayerStore.getState().player;
      if (!player) return false;

      await supabase
        .from('player_weapons')
        .update({ level: newLevel })
        .eq('player_id', player.id)
        .eq('weapon_type', weaponType);

      await usePlayerStore.getState().addSkillProgress(weaponConfig.skillId, 10);

      set(state => ({
        weapons: {
          ...state.weapons,
          [weaponType]: { ...state.weapons[weaponType], level: newLevel },
        },
      }));

      return true;
    } catch (err) {
      console.error('Error upgrading weapon:', err);
      return false;
    }
  },

  buyWeaponLicense: async () => {
    const { player, updateProfile } = usePlayerStore.getState();
    const { weaponLicense } = get();

    if (!player) return false;
    if (weaponLicense) {
      alert('У вас уже есть лицензия на оружие!');
      return false;
    }

    const { GUN_RANGE_SETTINGS } = await import('../features/market/data/weaponConfig') as { GUN_RANGE_SETTINGS: GunRangeSettings };

    if (Number(player.money) < GUN_RANGE_SETTINGS.weaponLicenseCost) {
      alert(`Недостаточно денег! Нужно $${GUN_RANGE_SETTINGS.weaponLicenseCost}`);
      return false;
    }

    try {
      await updateProfile({ money: Number(player.money) - GUN_RANGE_SETTINGS.weaponLicenseCost });

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await supabase.from('player_licenses').insert({
        player_id: player.id,
        license_type: 'weapon',
        expires_at: expiresAt.toISOString(),
      });

      set({ weaponLicense: true });

      const { licenses } = usePlayerStore.getState();
      usePlayerStore.setState({
        licenses: [...licenses, { player_id: player.id, license_type: 'weapon', expires_at: expiresAt.toISOString() } as DBLicense],
      });

      return true;
    } catch (err) {
      console.error('Error buying weapon license:', err);
      return false;
    }
  },

  takeDrivingExam: async (licenseType: LicenseType) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const { drivingExamAttempts } = get();
    const attempts = drivingExamAttempts[licenseType] || 0;

    if (attempts > 0) {
      if (Number(player.money) < 500) {
        alert('Недостаточно денег! Экзамен стоит 500$');
        return false;
      }
      await updateProfile({ money: Number(player.money) - 500 });
    }

    const newAttempts = attempts + 1;
    set(state => ({
      drivingExamAttempts: { ...state.drivingExamAttempts, [licenseType]: newAttempts },
    }));

    await updateProfile({
      driving_exam_attempts: { ...drivingExamAttempts, [licenseType]: newAttempts },
    });

    return true;
  },

  getDrivingLicense: async (licenseType: LicenseType) => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;

    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await supabase.from('player_licenses').insert({
        player_id: player.id,
        license_type: licenseType,
        expires_at: expiresAt.toISOString(),
      });

      const { licenses } = usePlayerStore.getState();
      usePlayerStore.setState({
        licenses: [...licenses, { player_id: player.id, license_type: licenseType, expires_at: expiresAt.toISOString() } as DBLicense],
      });

      return true;
    } catch (err) {
      console.error('Error getting driving license:', err);
      return false;
    }
  },

  startGunRangeSession: async () => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const { GUN_RANGE_SETTINGS } = await import('../features/market/data/weaponConfig') as { GUN_RANGE_SETTINGS: GunRangeSettings };

    if (Number(player.money) < GUN_RANGE_SETTINGS.entryFee) {
      alert(`Недостаточно денег! Вход стоит $${GUN_RANGE_SETTINGS.entryFee}`);
      return false;
    }

    try {
      await updateProfile({ money: Number(player.money) - GUN_RANGE_SETTINGS.entryFee });

      set(state => ({ gunRangeAttempts: state.gunRangeAttempts + 1 }));

      await updateProfile({ gun_range_attempts: get().gunRangeAttempts + 1 });

      return true;
    } catch (err) {
      console.error('Error starting gun range session:', err);
      return false;
    }
  },

  hasDrivingLicense: (licenseType: LicenseType) => {
    const licenses = usePlayerStore.getState().licenses as DBLicense[];
    return licenses.some(l => l.license_type === licenseType);
  },
}));