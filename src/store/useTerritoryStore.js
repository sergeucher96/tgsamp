import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { DEFAULT_TERRITORIES, DEFAULT_INFLUENCE } from '../data/territoriesConfig';
import { addInfluence } from '../utils/influenceService';
import {
  startDecayIntervals,
  stopDecayIntervals,
  runActivityDecay,
  runInfluenceDecay,
} from '../utils/territoryDecay';
import { usePlayerStore } from './usePlayerStore';

let stabilizationInterval = null;

async function runStabilization() {
  try {
    const territories = await supabase.from('territories').select('*');
    if (territories.error || !territories.data) return;

    const updates = territories.data.map(territory => {
      if (territory.status === 'OCCUPIED') {
        const newControl = Math.min(100, (territory.control || 50) + 5);
        if (newControl >= 100) {
          return { ...territory, status: 'STABILIZING', control: newControl };
        }
        return { ...territory, control: newControl };
      }

      if (territory.status === 'STABILIZING') {
        const newControl = Math.min(100, (territory.control || 50) + 5);
        if (newControl >= 100) {
          return { ...territory, status: 'CONTROLLED', control: 100 };
        }
        return { ...territory, control: newControl };
      }

      return territory;
    });

    const occupied = updates.filter(t => t.status === 'OCCUPIED' || t.status === 'STABILIZING');
    if (occupied.length > 0) {
      await Promise.all(
        occupied.map(t =>
          supabase
            .from('territories')
            .update({ status: t.status, control: t.control, updated_at: new Date().toISOString() })
            .eq('id', t.id)
        )
      );
    }
  } catch (err) {
    console.error('Stabilization failed:', err);
  }
}

export const useTerritoryStore = create((set, get) => ({
  territories: [],
  influences: [],
  selectedTerritory: null,
  isLoading: false,

  fetchTerritories: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.from('territories').select('*');
      if (!error && data) {
        set({ territories: data });
      } else if (error) {
        console.error('Territories table may not exist:', error.message);
        set({ territories: DEFAULT_TERRITORIES });
      }
    } catch (err) {
      console.error('Failed to fetch territories:', err);
      set({ territories: DEFAULT_TERRITORIES });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTerritory: async (territoryId) => {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('*')
        .eq('id', territoryId)
        .maybeSingle();
      if (!error && data) {
        set({ selectedTerritory: data });
      }
    } catch (err) {
      console.error('Failed to fetch territory:', err);
    }
  },

  createTerritory: async (territoryData) => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('territories')
        .insert([territoryData])
        .select()
        .single();

      if (error) {
        console.error('Create territory error:', error);
        return false;
      }

      if (data) {
        set(state => ({ territories: [...state.territories, data] }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to create territory:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateTerritory: async (territoryId, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('territories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', territoryId)
        .select()
        .single();

      if (error) {
        console.error('Update territory error:', error);
        return false;
      }

      if (data) {
        set(state => ({
          territories: state.territories.map(t => t.id === territoryId ? data : t),
          selectedTerritory: state.selectedTerritory?.id === territoryId ? data : state.selectedTerritory,
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update territory:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteTerritory: async (territoryId) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('territories')
        .delete()
        .eq('id', territoryId);

      if (error) {
        console.error('Delete territory error:', error);
        return false;
      }

      set(state => ({
        territories: state.territories.filter(t => t.id !== territoryId),
        selectedTerritory: state.selectedTerritory?.id === territoryId ? null : state.selectedTerritory,
      }));
      return true;
    } catch (err) {
      console.error('Failed to delete territory:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  captureTerritory: async (territoryId, gangId) => {
    const control = 50;
    const status = 'CONTROLLED';
    const ok = await get().updateTerritory(territoryId, {
      owner_gang_id: gangId,
      control,
      status,
      activity: 50,
    });

    if (ok) {
      await get().addInfluence(territoryId, gangId, 30, 'TERRITORY_EVENT');
    }

    return ok;
  },

  loseTerritory: async (territoryId) => {
    const territory = get().territories.find(t => t.id === territoryId);
    const ownerGangId = territory?.owner_gang_id;

    const ok = await get().updateTerritory(territoryId, {
      owner_gang_id: null,
      control: 0,
      status: 'NEUTRAL',
      activity: 0,
    });

    if (ok && ownerGangId) {
      await get().addInfluence(territoryId, ownerGangId, -20, 'TERRITORY_EVENT');
    }

    return ok;
  },

  updateControl: async (territoryId, controlDelta) => {
    const territory = get().territories.find(t => t.id === territoryId);
    if (!territory) return false;

    const newControl = Math.max(0, Math.min(100, (territory.control || 0) + controlDelta));
    return get().updateTerritory(territoryId, { control: newControl });
  },

  getGangTerritories: (gangId) => {
    return get().territories.filter(t => t.owner_gang_id === gangId);
  },

  getTerritoryIncome: (gangId) => {
    return get().territories
      .filter(t => t.owner_gang_id === gangId)
      .reduce((sum, t) => sum + (t.base_income || 0), 0);
  },

  selectTerritory: (territoryId) => {
    const territory = get().territories.find(t => t.id === territoryId);
    set({ selectedTerritory: territory || null });
  },

  loadTerritoryData: async () => {
    await get().fetchTerritories();
  },

  // === DECAY ===

  startDecay: (onUpdate) => {
    startDecayIntervals(onUpdate);
  },

  stopDecay: () => {
    stopDecayIntervals();
  },

  refreshTerritories: async () => {
    await runActivityDecay();
    await get().fetchTerritories();
  },

  refreshInfluences: async () => {
    await runInfluenceDecay();
    await get().fetchInfluences();
  },

  // === STABILIZATION ===

  startStabilization: () => {
    get().stopStabilization();
    stabilizationInterval = setInterval(async () => {
      await runStabilization();
    }, 60 * 60 * 1000);
  },

  stopStabilization: () => {
    if (stabilizationInterval) {
      clearInterval(stabilizationInterval);
      stabilizationInterval = null;
    }
  },

  // === ВЛИЯНИЕ ===

  fetchInfluences: async (territoryId) => {
    try {
      let query = supabase.from('territory_influence').select('*');
      if (territoryId) {
        query = query.eq('territory_id', territoryId);
      }
      const { data, error } = await query;
      if (!error && data) {
        set({ influences: data });
      } else if (error) {
        console.error('Territory influence table may not exist:', error.message);
        set({ influences: DEFAULT_INFLUENCE });
      }
    } catch (err) {
      console.error('Failed to fetch influences:', err);
      set({ influences: DEFAULT_INFLUENCE });
    }
  },

  getInfluencesForTerritory: (territoryId) => {
    return get().influences.filter(i => i.territory_id === territoryId);
  },

  setInfluence: async (territoryId, gangId, influence) => {
    set({ isLoading: true });
    try {
      const clampedInfluence = Math.max(0, Math.min(100, influence));
      const { data, error } = await supabase
        .from('territory_influence')
        .upsert(
          { territory_id: territoryId, gang_id: gangId, influence: clampedInfluence, updated_at: new Date().toISOString() },
          { onConflict: 'territory_id,gang_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Set influence error:', error);
        return false;
      }

      if (data) {
        set(state => {
          const existing = state.influences.findIndex(i => i.territory_id === territoryId && i.gang_id === gangId);
          const newInfluences = [...state.influences];
          if (existing >= 0) {
            newInfluences[existing] = data;
          } else {
            newInfluences.push(data);
          }
          return { influences: newInfluences };
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to set influence:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateInfluence: async (territoryId, gangId, delta) => {
    const current = get().influences.find(i => i.territory_id === territoryId && i.gang_id === gangId);
    const newInfluence = Math.max(0, Math.min(100, (current?.influence || 0) + delta));
    return get().setInfluence(territoryId, gangId, newInfluence);
  },

  addInfluence: async (territoryId, gangId, amount, reason) => {
    const result = await addInfluence(gangId, territoryId, amount, reason);

    if (result.success && result.influence !== undefined) {
      set(state => {
        const existing = state.influences.findIndex(i => i.territory_id === territoryId && i.gang_id === gangId);
        const newInfluences = [...state.influences];
        const influenceData = {
          id: existing >= 0 ? newInfluences[existing].id : Date.now(),
          territory_id: territoryId,
          gang_id: gangId,
          influence: result.influence,
          updated_at: new Date().toISOString(),
        };

        if (existing >= 0) {
          newInfluences[existing] = influenceData;
        } else {
          newInfluences.push(influenceData);
        }

        return { influences: newInfluences };
      });
    }

    return result;
  },

  getTerritoryOwner: (territoryId) => {
    const territory = get().territories.find(t => t.id === territoryId);
    return territory?.owner_gang_id || null;
  },
}));
