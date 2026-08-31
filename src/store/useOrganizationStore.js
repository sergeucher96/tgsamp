import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { ORGANIZATIONS, DEFAULT_RANKS } from '../data/organizationsConfig';
import { VEHICLE_DATABASE } from '../data/vehicleConfig';

export const ORG_VEHICLE_TYPES = [
  { modelId: 'clover', price: 45000, icon: '🚗' },
  { modelId: 'sentinel', price: 180000, icon: '🚙' },
  { modelId: 'infernus', price: 800000, icon: '🏎️' },
];

export const useOrganizationStore = create((set, get) => ({
  organizations: ORGANIZATIONS,
  members: [],
  ranks: [],
  isLoading: false,
  currentOrg: null,
  salaryLog: [],
  safeResources: { crop_count: 0, metal_count: 0, part_count: 0 },
  safeItems: [],
  orgVehicles: [],
  salaryPaid: false,

  // Загрузить организации
  fetchOrganizations: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.from('organizations').select('*');
      if (!error && data) set({ organizations: data });
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // Загрузить участников
  fetchMembers: async (orgId) => {
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select('*')
        .eq('org_id', orgId);
      if (!error && data) {
        const result = data.map(m => ({
          ...m,
          username: m.username,
          avatar_url: m.avatar_url
        }));
        set({ members: result });
      }
    } catch (err) {
      console.error('Failed to fetch org members:', err);
    }
  },

  // Загрузить ранги
  fetchRanks: async (orgId) => {
    try {
      const { data, error } = await supabase.from('org_ranks').select('*').eq('org_id', orgId);
      if (!error && data) set({ ranks: data });
    } catch (err) {
      console.error('Failed to fetch org ranks:', err);
    }
  },

  // Вступить
  joinOrganization: async (orgId) => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;
    if (player.organization_id) {
      alert('Вы уже состоите в другой организации!');
      return false;
    }

    set({ isLoading: true });
    try {
      const org = ORGANIZATIONS.find(o => o.id === orgId);
      if (!org) return false;

      const { data: ranks } = await supabase
        .from('org_ranks').select('*').eq('org_id', orgId)
        .order('rank_level', { ascending: false });

      const startingRank = ranks?.length ? ranks[ranks.length - 1] : { rank_name: 'Member' };
      const salary = startingRank.salary || 0;

      const { error } = await supabase.from('org_members').insert([{
        org_id: orgId, player_id: player.id,
        rank_name: startingRank.rank_name,
        salary, is_leader: false,
      }]);

      if (error) {
        if (error.code === '23505') alert('Вы уже состоите в этой организации!');
        else alert('Ошибка при вступлении!');
        return false;
      }

      await usePlayerStore.getState().updateProfile({
        organization_id: orgId,
        organization_rank: startingRank.rank_name,
      });

      await get().fetchMembers(orgId);
      await get().fetchRanks(orgId);
      set({ currentOrg: orgId });
      return true;
    } catch (err) {
      console.error('Failed to join organization:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Выйти
  leaveOrganization: async (orgId) => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;

    set({ isLoading: true });
    try {
      const { data: leader } = await supabase
        .from('org_members').select('*').eq('org_id', orgId).eq('is_leader', true).single();

      if (leader?.player_id === player.id) {
        alert('Лидер не может выйти! Передайте лидерство другому участнику.');
        return false;
      }

      const { error } = await supabase.from('org_members').delete()
        .eq('org_id', orgId).eq('player_id', player.id);

      if (error) { alert('Ошибка при выходе!'); return false; }

      await usePlayerStore.getState().updateProfile({
        organization_id: null, organization_rank: null,
      });

      await get().fetchMembers(orgId);
      set({ currentOrg: null });
      return true;
    } catch (err) {
      console.error('Failed to leave organization:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Пригласить
  acceptInvitation: async (orgId, targetPlayerId, rankName = 'Member') => {
    try {
      const { data: ranks } = await supabase
        .from('org_ranks').select('salary').eq('org_id', orgId).eq('rank_name', rankName);
      const salary = ranks?.find(r => r.rank_name === rankName)?.salary || 0;

      const { error } = await supabase.from('org_members').insert([{
        org_id: orgId, player_id: targetPlayerId,
        rank_name: rankName, salary,
      }]);
      if (error) { console.error('Invite error:', error); return false; }
      await get().fetchMembers(orgId);
      return true;
    } catch (err) {
      console.error('Failed to invite member:', err);
      return false;
    }
  },

  // Уволить
  removeMember: async (orgId, targetPlayerId) => {
    try {
      const { error } = await supabase.from('org_members').delete()
        .eq('org_id', orgId).eq('player_id', targetPlayerId);
      if (error) {
        alert('Ошибка при увольнении!');
        return false;
      }
      await get().fetchMembers(orgId);
      return true;
    } catch (err) {
      console.error('Failed to remove member:', err);
      return false;
    }
  },

  // Изменить ранг
  changeRank: async (orgId, targetPlayerId, newRankName) => {
    try {
      const { data: rankInfo } = await supabase
        .from('org_ranks').select('salary')
        .eq('org_id', orgId).eq('rank_name', newRankName).single();

      const { error } = await supabase.from('org_members').update({
        rank_name: newRankName,
        salary: rankInfo?.salary || 0,
      }).eq('org_id', orgId).eq('player_id', targetPlayerId);

      if (error) { alert('Ошибка при изменении ранга!'); return false; }
      await get().fetchMembers(orgId);
      return true;
    } catch (err) {
      console.error('Failed to change rank:', err);
      return false;
    }
  },

  // Назначить лидера
  setLeader: async (orgId, newLeaderId) => {
    try {
      const { error: err1 } = await supabase.from('org_members')
        .update({ is_leader: false }).eq('org_id', orgId);
      if (err1) throw err1;

      const { error: err2 } = await supabase.from('org_members')
        .update({ is_leader: true }).eq('org_id', orgId).eq('player_id', newLeaderId);
      if (err2) throw err2;

      await get().fetchMembers(orgId);
      return true;
    } catch (err) {
      console.error('Failed to set leader:', err);
      return false;
    }
  },

  // Баланс
  addBalance: async (orgId, amount) => {
    try {
      const { data } = await supabase.from('organizations').select('balance').eq('id', orgId).single();
      if (!data?.balance !== undefined) return false;

      const { error } = await supabase.from('organizations')
        .update({ balance: (data.balance || 0) + amount }).eq('id', orgId);
      return !error;
    } catch { return false; }
  },

  deductBalance: async (orgId, amount) => {
    try {
      const { data } = await supabase.from('organizations').select('balance').eq('id', orgId).single();
      if (!data || (data.balance || 0) < amount) {
        alert('Недостаточно средств на счёте организации!');
        return false;
      }

      const { error } = await supabase.from('organizations')
        .update({ balance: (data.balance || 0) - amount }).eq('id', orgId);
      return !error;
    } catch { return false; }
  },

  getBalance: async (orgId) => {
    try {
      const { data } = await supabase.from('organizations').select('balance').eq('id', orgId).single();
      return data?.balance || 0;
    } catch (err) { console.error('Failed to get balance:', err); return 0; }
  },

  // Склад — ресурсы
  fetchSafeResources: async (orgId) => {
    try {
      const { data, error } = await supabase
        .from('org_safe').select('crop_count, metal_count, part_count')
        .eq('org_id', orgId).single();
      if (!error && data) {
        set({ safeResources: { crop_count: data.crop_count || 0, metal_count: data.metal_count || 0, part_count: data.part_count || 0 } });
      } else if (!data) {
        try {
          await supabase.from('org_safe').insert([{ org_id: orgId }]).maybeSingle();
        } catch (e) {
          console.warn('org_safe insert skipped:', e);
        }
        set({ safeResources: { crop_count: 0, metal_count: 0, part_count: 0 } });
      }
    } catch (err) { console.error('Failed to fetch safe resources:', err); }
  },

  fetchSafeItems: async (orgId) => {
    try {
      const { data, error } = await supabase.from('org_items').select('*').eq('org_id', orgId);
      if (!error) set({ safeItems: data || [] });
    } catch (err) { console.error('Failed to fetch safe items:', err); }
  },

  addSafeResource: async (orgId, resourceType, amount) => {
    try {
      const current = get().safeResources[resourceType] || 0;
      const newCount = current + amount;
      const { data, error } = await supabase
        .from('org_safe').update({ [resourceType]: newCount }).eq('org_id', orgId).select().single();
      if (!error && data) {
        set({ safeResources: { crop_count: data.crop_count || 0, metal_count: data.metal_count || 0, part_count: data.part_count || 0 } });
        return true;
      }
      return false;
    } catch { return false; }
  },

  removeSafeResource: async (orgId, resourceType, amount) => {
    try {
      const current = get().safeResources[resourceType] || 0;
      if (current < amount) { alert('Недостаточно ресурса на складе!'); return false; }
      const newCount = current - amount;
      const { data, error } = await supabase
        .from('org_safe').update({ [resourceType]: newCount }).eq('org_id', orgId).select().single();
      if (!error && data) {
        set({ safeResources: { crop_count: data.crop_count || 0, metal_count: data.metal_count || 0, part_count: data.part_count || 0 } });
        return true;
      }
      return false;
    } catch { return false; }
  },

  addItemToSafe: async (orgId, itemId, quantity = 1) => {
    try {
      const { error } = await supabase.from('org_items')
        .upsert({ org_id: orgId, item_id: itemId, quantity }, { onConflict: 'org_id,item_id' });
      if (!error) { await get().fetchSafeItems(orgId); return true; }
      return false;
    } catch { return false; }
  },

  removeItemFromSafe: async (orgId, itemId) => {
    try {
      const { error } = await supabase.from('org_items').delete().eq('org_id', orgId).eq('item_id', itemId);
      if (!error) { await get().fetchSafeItems(orgId); return true; }
      return false;
    } catch { return false; }
  },

  // Права
  canManageMembers: (orgId, playerId) => {
    const member = get().members.find(m => m.player_id === playerId);
    if (!member) return false;
    const rank = get().ranks.find(r => r.rank_name === member.rank_name);
    return rank?.permissions?.manage_members || member.is_leader;
  },

  // === ЗАРПЛАТЫ ===

  /** Выплата зарплат (лидер — списывает с баланса организации) */
  paySalaries: async (orgId) => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;
    const member = get().members.find(m => m.player_id === player?.id);
    if (!member?.is_leader) {
      alert('Только лидер может выплачивать зарплаты!');
      return false;
    }

    try {
      const { data: currentMembers, error: err1 } = await supabase
        .from('org_members').select('player_id, salary, next_salary_date').eq('org_id', orgId);
      if (err1 || !currentMembers || currentMembers.length === 0) return false;

      const now = new Date();
      const eligible = currentMembers.filter(m => {
        const next = m.next_salary_date ? new Date(m.next_salary_date) : now;
        return next <= now;
      });

      if (eligible.length === 0) {
        alert('Пока нет просроченных зарплат!');
        return false;
      }

      const totalSalary = eligible.reduce((sum, m) => sum + (m.salary || 0), 0);
      if (totalSalary <= 0) {
        alert('Нет начисленных зарплат.');
        return false;
      }

      const deductSuccess = await get().deductBalance(orgId, totalSalary);
      if (!deductSuccess) return false;

      const nextPayment = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const promises = eligible.map(m => {
        if (m.salary > 0) {
          return Promise.all([
            supabase.from('org_members').update({ next_salary_date: nextPayment })
              .eq('org_id', orgId).eq('player_id', m.player_id),
            supabase.from('org_salary_log').insert([{
              org_id: orgId, player_id: m.player_id, amount: m.salary, paid: true,
            }]),
          ]);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      await get().fetchMembers(orgId);
      await get().fetchSalaryLog(orgId);
      alert(`Зарплаты выплачены! Списано $${totalSalary.toLocaleString()} (${eligible.length} участн.)`);
      return { paid: eligible.length, total: totalSalary, failed: false };
    } catch (err) {
      console.error('Failed to pay salaries:', err);
      return false;
    }
  },

  /** Загрузить логи зарплат */
  fetchSalaryLog: async (orgId) => {
    try {
      const { data, error } = await supabase
        .from('org_salary_log')
        .select('*')
        .eq('org_id', orgId)
        .order('paid_at', { ascending: false })
        .limit(50);
      if (!error) set({ salaryLog: data || [] });
    } catch (err) { console.error('Failed to fetch salary log:', err); }
  },

  /** Получить зарплату игрока */
  getPlayerSalary: (orgId) => {
    const { player } = usePlayerStore.getState();
    if (!player) return { salary: 0, nextSalaryDate: null };
    const member = get().members.find(m => m.player_id === player.id);
    if (!member) return { salary: 0, nextSalaryDate: null };
    return { salary: member.salary || 0, nextSalaryDate: member.next_salary_date };
  },

  // === ТРАНСПОРТ ===

  fetchOrgVehicles: async (orgId) => {
    try {
      const { data, error } = await supabase.from('org_vehicles').select('*').eq('org_id', orgId);
      if (!error) set({ orgVehicles: data || [] });
    } catch (err) { console.error('Failed to fetch org vehicles:', err); }
  },

  buyOrgVehicle: async (orgId, vehicleModelId, color = 'white') => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;

    const orgConfig = ORG_VEHICLE_TYPES.find(v => v.modelId === vehicleModelId);
    if (!orgConfig) { alert('Неизвестный тип транспорта!'); return false; }
    if (get().orgVehicles.length >= 3) { alert('Максимум 3 машины!'); return false; }

    const cost = orgConfig.price;
    const success = await get().deductBalance(orgId, cost);
    if (!success) return false;

    try {
      const { data: vehicle, error: err1 } = await supabase.from('vehicles').insert([{
        owner_id: player.id, model_id: vehicleModelId, color,
        fuel: 50, max_fuel: 50, fuel_type: '92',
        plate: `ORG-${Math.floor(100 + Math.random() * 899)}`,
        engine_stage: 0, suspension_stage: 0, brakes_stage: 0,
        health: 100,
      }]).select().single();

      if (err1 || !vehicle) return false;

      const { error: err2 } = await supabase.from('org_vehicles').insert([{
        org_id: orgId, vehicle_id: vehicle.id, purchased: true,
        cost, access_rank_ids: [],
      }]);

      if (err2) return false;
      await get().fetchOrgVehicles(orgId);
      return true;
    } catch { return false; }
  },

  assignVehicle: async (orgId, orgVehicleId, playerId) => {
    try {
      const { error } = await supabase.from('org_vehicles')
        .update({ assigned_player_id: playerId })
        .eq('org_id', orgId).eq('id', orgVehicleId);
      if (!error) await get().fetchOrgVehicles(orgId);
      return !error;
    } catch { return false; }
  },

  unassignVehicle: async (orgId, orgVehicleId) => {
    try {
      const { error } = await supabase.from('org_vehicles')
        .update({ assigned_player_id: null })
        .eq('org_id', orgId).eq('id', orgVehicleId);
      if (!error) await get().fetchOrgVehicles(orgId);
      return !error;
    } catch { return false; }
  },

  canUseVehicle: (orgId, orgVehicleId, playerId) => {
    const vehicle = get().orgVehicles.find(v => v.id === orgVehicleId);
    if (!vehicle) return false;
    if (vehicle.assigned_player_id === playerId) return true;
    const member = get().members.find(m => m.player_id === playerId);
    if (member?.is_leader) return true;
    if (!member) return false;
    const rankIds = vehicle.access_rank_ids || [];
    const rank = get().ranks.find(r => r.rank_name === member.rank_name);
    return rankIds.includes(rank?.id);
  },

  // Загрузить всё при открытии
  loadOrgData: async (orgId) => {
    await Promise.all([
      get().fetchMembers(orgId),
      get().fetchRanks(orgId),
      get().fetchOrgVehicles(orgId),
      get().fetchSafeResources(orgId),
      get().fetchSafeItems(orgId),
      get().fetchSalaryLog(orgId),
    ]);
    set({ currentOrg: orgId });
  },
}));