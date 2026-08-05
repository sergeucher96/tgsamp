import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';

export const useWeaponStore = create((set, get) => ({
  // Состояние оружия игрока
  weapons: {
    deagle: { level: 0, owned: false },
    shotgun: { level: 0, owned: false },
    carbine: { level: 0, owned: false },
  },
  weaponLicense: false, // Лицензия на оружие
  drivingExamAttempts: {}, // { moto: 0, car: 0, truck: 0 }
  gunRangeAttempts: 0, // Количество попыток в тире (для ограничения)
  loading: true,

  // Загрузка данных оружия из Supabase
  fetchWeapons: async () => {
    const player = usePlayerStore.getState().player;
    if (!player) return;
    
    set({ loading: true });
    try {
      // Загружаем оружие из таблицы player_weapons
      const { data: weaponData } = await supabase
        .from('player_weapons')
        .select('*')
        .eq('player_id', player.id);
      
      // Инициализируем оружие
      const weapons = {
        deagle: { level: 0, owned: false },
        shotgun: { level: 0, owned: false },
        carbine: { level: 0, owned: false },
      };
      
      // Применяем данные из БД
      (weaponData || []).forEach(w => {
        weapons[w.weapon_type] = {
          level: w.level || 0,
          owned: w.owned || false,
        };
      });
      
      // Проверяем лицензию на оружие в player_licenses
      const licenses = usePlayerStore.getState().licenses || [];
      const hasWeaponLicense = licenses.some(l => l.license_type === 'weapon');
      
      // Загружаем количество попыток экзаменов из profiles
      const drivingExamAttempts = { moto: 0, car: 0, truck: 0 };
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

  // Покупка оружия
  buyWeapon: async (weaponType) => {
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
    
    const weaponConfig = await import('../data/weaponConfig').then(m => m.WEAPON_CONFIG[weaponType]);
    if (!weaponConfig) return false;
    
    if (player.money < weaponConfig.price) {
      alert(`Недостаточно денег! Нужно $${weaponConfig.price}`);
      return false;
    }
    
    try {
      // Списываем деньги
      await updateProfile({ money: Number(player.money) - weaponConfig.price });
      
      // Сохраняем в БД
      await supabase.from('player_weapons').upsert({
        player_id: player.id,
        weapon_type: weaponType,
        level: 0,
        owned: true,
      });
      
      // Обновляем локальное состояние
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

  // Повышение уровня оружия
  upgradeWeapon: async (weaponType, xpGained) => {
    const { weapons } = get();
    if (!weapons[weaponType]?.owned) return false;
    
    const weaponConfig = await import('../data/weaponConfig').then(m => m.WEAPON_CONFIG[weaponType]);
    const currentLevel = weapons[weaponType].level;
    const maxLevel = weaponConfig.maxLevel;
    
    if (currentLevel >= maxLevel) {
      alert('Максимальный уровень достигнут!');
      return false;
    }
    
    // XP needed for next level (прогрессивная шкала)
    const xpNeeded = (currentLevel + 1) * 50;
    if (xpGained < xpNeeded) return false;
    
    const newLevel = currentLevel + 1;
    
    try {
      // Обновляем в БД
      await supabase
        .from('player_weapons')
        .update({ level: newLevel })
        .eq('player_id', usePlayerStore.getState().player.id)
        .eq('weapon_type', weaponType);
      
      // Обновляем навыки через playerStore
      await usePlayerStore.getState().addSkillProgress(weaponConfig.skillId, 10);
      
      // Обновляем локальное состояние
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

  // Покупка лицензии на оружие
  buyWeaponLicense: async () => {
    const { player, updateProfile } = usePlayerStore.getState();
    const { weaponLicense } = get();
    
    if (!player) return false;
    if (weaponLicense) {
      alert('У вас уже есть лицензия на оружие!');
      return false;
    }
    
    const { GUN_RANGE_SETTINGS } = await import('../data/weaponConfig');
    
    if (player.money < GUN_RANGE_SETTINGS.weaponLicenseCost) {
      alert(`Недостаточно денег! Нужно $${GUN_RANGE_SETTINGS.weaponLicenseCost}`);
      return false;
    }
    
    try {
      // Списываем деньги
      await updateProfile({ money: Number(player.money) - GUN_RANGE_SETTINGS.weaponLicenseCost });
      
      // Сохраняем лицензию в player_licenses (1 год)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      await supabase.from('player_licenses').insert({
        player_id: player.id,
        license_type: 'weapon',
        expires_at: expiresAt.toISOString(),
      });
      
      // Обновляем локальное состояние
      set({ weaponLicense: true });
      
      // Обновляем лицензии в playerStore
      const { licenses } = usePlayerStore.getState();
      usePlayerStore.setState({
        licenses: [...licenses, { player_id: player.id, license_type: 'weapon', expires_at: expiresAt.toISOString() }],
      });
      
      return true;
    } catch (err) {
      console.error('Error buying weapon license:', err);
      return false;
    }
  },

  // Сдача экзамена на вождение
  takeDrivingExam: async (licenseType) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;
    
    const { drivingExamAttempts } = get();
    const attempts = drivingExamAttempts[licenseType] || 0;
    
    // Первый раз бесплатно, повтор за 500$
    if (attempts > 0) {
      if (player.money < 500) {
        alert('Недостаточно денег! Экзамен стоит 500$');
        return false;
      }
      await updateProfile({ money: Number(player.money) - 500 });
    }
    
    // Увеличиваем счётчик попыток
    const newAttempts = attempts + 1;
    set(state => ({
      drivingExamAttempts: { ...state.drivingExamAttempts, [licenseType]: newAttempts },
    }));
    
    // Сохраняем в БД (JSON field)
    await updateProfile({
      driving_exam_attempts: { ...drivingExamAttempts, [licenseType]: newAttempts },
    });
    
    return true;
  },

  // Получение лицензии на вождение
  getDrivingLicense: async (licenseType) => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;
    
    try {
      // Сохраняем лицензию в player_licenses (1 год)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      await supabase.from('player_licenses').insert({
        player_id: player.id,
        license_type: licenseType,
        expires_at: expiresAt.toISOString(),
      });
      
      // Обновляем лицензии в playerStore
      const { licenses } = usePlayerStore.getState();
      usePlayerStore.setState({
        licenses: [...licenses, { player_id: player.id, license_type: licenseType, expires_at: expiresAt.toISOString() }],
      });
      
      return true;
    } catch (err) {
      console.error('Error getting driving license:', err);
      return false;
    }
  },

  // Начать сессию в тире
  startGunRangeSession: async () => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;
    
    const { GUN_RANGE_SETTINGS } = await import('../data/weaponConfig');
    
    if (player.money < GUN_RANGE_SETTINGS.entryFee) {
      alert(`Недостаточно денег! Вход стоит $${GUN_RANGE_SETTINGS.entryFee}`);
      return false;
    }
    
    try {
      // Списываем деньги за вход
      await updateProfile({ money: Number(player.money) - GUN_RANGE_SETTINGS.entryFee });
      
      // Увеличиваем счётчик попыток
      set(state => ({ gunRangeAttempts: state.gunRangeAttempts + 1 }));
      
      await updateProfile({ gun_range_attempts: get().gunRangeAttempts + 1 });
      
      return true;
    } catch (err) {
      console.error('Error starting gun range session:', err);
      return false;
    }
  },

  // Проверка, имеет ли игрок транспортную лицензию
  hasDrivingLicense: (licenseType) => {
    const licenses = usePlayerStore.getState().licenses || [];
    return licenses.some(l => l.license_type === licenseType);
  },
}));