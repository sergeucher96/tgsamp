import { supabase } from '../../services/supabase/client';
import {
  ACTIVITY_DECAY_CONFIG,
  INFLUENCE_DECAY_CONFIG,
  calculateActivityDecay,
  calculateInfluenceDecay,
} from '../../features/gangs/data/territoriesConfig';
import type {
  ActivityDecayConfig,
  GangContext,
  InfluenceDecayConfig,
  Territory,
  TerritoryInfluence,
} from '../../features/gangs/data/territoriesConfig';

interface SupabaseCollectionResult<T> {
  data: T[] | null;
  error: unknown | null;
}

interface SupabaseErrorResult {
  error: unknown | null;
}

type DecayUpdateType = 'activity' | 'influence';

let activityDecayInterval: ReturnType<typeof setInterval> | null = null;
let influenceDecayInterval: ReturnType<typeof setInterval> | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function fetchTerritories(): Promise<Territory[]> {
  const { data, error } = (await supabase.from('territories').select('*')) as SupabaseCollectionResult<Territory>;
  if (error || !data) return [];
  return data;
}

async function fetchInfluences(): Promise<TerritoryInfluence[]> {
  const { data, error } = (await supabase.from('territory_influence').select('*')) as SupabaseCollectionResult<TerritoryInfluence>;
  if (error || !data) return [];
  return data;
}

async function updateTerritoryActivity(territoryId: number, newActivity: number): Promise<void> {
  const { error } = (await supabase
    .from('territories')
    .update({ activity: clamp(newActivity, 0, 100), updated_at: new Date().toISOString() })
    .eq('id', territoryId)) as SupabaseErrorResult;

  if (error) {
    console.error('Failed to update territory activity:', error);
  }
}

async function updateTerritoryInfluence(
  territoryId: number,
  gangId: string,
  newInfluence: number,
): Promise<void> {
  const { error } = (await supabase
    .from('territory_influence')
    .upsert(
      {
        territory_id: territoryId,
        gang_id: gangId,
        influence: clamp(Math.round(newInfluence), 0, 100),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'territory_id,gang_id' }
    )) as SupabaseErrorResult;

  if (error) {
    console.error('Failed to update territory influence:', error);
  }
}

function getGangContext(territoryId: number, gangId: string, territories: Territory[]): GangContext {
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

export async function runActivityDecay(): Promise<void> {
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

export async function runInfluenceDecay(): Promise<void> {
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

export function startDecayIntervals(onUpdate?: (type: DecayUpdateType) => void): void {
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

export function stopDecayIntervals(): void {
  if (activityDecayInterval) {
    clearInterval(activityDecayInterval);
    activityDecayInterval = null;
  }

  if (influenceDecayInterval) {
    clearInterval(influenceDecayInterval);
    influenceDecayInterval = null;
  }
}

interface DecayConfig {
  activity: ActivityDecayConfig;
  influence: InfluenceDecayConfig;
}

export function getDecayConfig(): DecayConfig {
  return {
    activity: ACTIVITY_DECAY_CONFIG,
    influence: INFLUENCE_DECAY_CONFIG,
  };
}
