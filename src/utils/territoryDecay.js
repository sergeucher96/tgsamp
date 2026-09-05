import { supabase } from '../api/supabase';
import {
  ACTIVITY_DECAY_CONFIG,
  INFLUENCE_DECAY_CONFIG,
  calculateActivityDecay,
  calculateInfluenceDecay,
} from '../data/territoriesConfig';

let activityDecayInterval = null;
let influenceDecayInterval = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function fetchTerritories() {
  const { data, error } = await supabase.from('territories').select('*');
  if (error || !data) return [];
  return data;
}

async function fetchInfluences() {
  const { data, error } = await supabase.from('territory_influence').select('*');
  if (error || !data) return [];
  return data;
}

async function updateTerritoryActivity(territoryId, newActivity) {
  const { error } = await supabase
    .from('territories')
    .update({ activity: clamp(newActivity, 0, 100), updated_at: new Date().toISOString() })
    .eq('id', territoryId);

  if (error) {
    console.error('Failed to update territory activity:', error);
  }
}

async function updateTerritoryInfluence(territoryId, gangId, newInfluence) {
  const { error } = await supabase
    .from('territory_influence')
    .upsert(
      {
        territory_id: territoryId,
        gang_id: gangId,
        influence: clamp(Math.round(newInfluence), 0, 100),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'territory_id,gang_id' }
    );

  if (error) {
    console.error('Failed to update territory influence:', error);
  }
}

function getGangContext(territoryId, gangId, territories) {
  const territory = territories.find(t => t.id === territoryId);
  if (!territory) return {};

  const isOwner = territory.owner_gang_id === gangId;

  return {
    hasHeadquarters: isOwner,
    controlledProperties: isOwner ? 1 : 0,
    activePlayers: Math.floor(Math.random() * 3),
    upgrades: isOwner ? 1 : 0,
  };
}

export async function runActivityDecay() {
  try {
    const territories = await fetchTerritories();
    const promises = territories.map(async (territory) => {
      const newActivity = calculateActivityDecay(territory.activity || 0);
      if (newActivity !== territory.activity) {
        await updateTerritoryActivity(territory.id, newActivity);
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('Activity decay failed:', err);
  }
}

export async function runInfluenceDecay() {
  try {
    const [territories, influences] = await Promise.all([fetchTerritories(), fetchInfluences()]);

    const promises = influences.map(async (influence) => {
      const gangContext = getGangContext(influence.territory_id, influence.gang_id, territories);
      const newInfluence = calculateInfluenceDecay(influence.influence || 0, gangContext);

      if (newInfluence !== influence.influence) {
        await updateTerritoryInfluence(influence.territory_id, influence.gang_id, newInfluence);
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('Influence decay failed:', err);
  }
}

export function startDecayIntervals(onUpdate) {
  stopDecayIntervals();

  activityDecayInterval = setInterval(async () => {
    await runActivityDecay();
    onUpdate?.('activity');
  }, ACTIVITY_DECAY_CONFIG.intervalMs);

  influenceDecayInterval = setInterval(async () => {
    await runInfluenceDecay();
    onUpdate?.('influence');
  }, INFLUENCE_DECAY_CONFIG.intervalMs);
}

export function stopDecayIntervals() {
  if (activityDecayInterval) {
    clearInterval(activityDecayInterval);
    activityDecayInterval = null;
  }

  if (influenceDecayInterval) {
    clearInterval(influenceDecayInterval);
    influenceDecayInterval = null;
  }
}

export function getDecayConfig() {
  return {
    activity: ACTIVITY_DECAY_CONFIG,
    influence: INFLUENCE_DECAY_CONFIG,
  };
}
