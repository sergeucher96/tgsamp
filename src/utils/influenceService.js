import { supabase } from '../api/supabase';
import { INFLUENCE_REASONS, INFLUENCE_CONFIG, getInfluenceMultiplier, getInfluenceTierInfo } from '../data/influenceConfig';

function isInvalidGangId(gangId) {
  return !gangId || typeof gangId !== 'string' || gangId.trim() === '';
}

function isInvalidTerritoryId(territoryId) {
  return !territoryId || typeof territoryId !== 'number';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function fetchActionRecord(territoryId, gangId, reason) {
  const { data, error } = await supabase
    .from('territory_influence_actions')
    .select('*')
    .eq('territory_id', territoryId)
    .eq('gang_id', gangId)
    .eq('reason', reason)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch influence action record:', error);
    return null;
  }

  return data;
}

async function createActionRecord(territoryId, gangId, reason) {
  const { data, error } = await supabase
    .from('territory_influence_actions')
    .insert([{ territory_id: territoryId, gang_id: gangId, reason, action_count: 0 }])
    .select()
    .single();

  if (error) {
    console.error('Failed to create influence action record:', error);
    return null;
  }

  return data;
}

async function incrementActionCount(recordId, currentCount) {
  const newCount = (currentCount || 0) + 1;
  const { data, error } = await supabase
    .from('territory_influence_actions')
    .update({ action_count: newCount, updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .select()
    .single();

  if (error) {
    console.error('Failed to increment action count:', error);
    return null;
  }

  return data;
}

async function fetchCurrentInfluence(territoryId, gangId) {
  const { data, error } = await supabase
    .from('territory_influence')
    .select('influence')
    .eq('territory_id', territoryId)
    .eq('gang_id', gangId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch current influence:', error);
    return 0;
  }

  return data?.influence || 0;
}

async function upsertInfluence(territoryId, gangId, newInfluence) {
  const clamped = clamp(Math.round(newInfluence), 0, 100);
  const { data, error } = await supabase
    .from('territory_influence')
    .upsert(
      { territory_id: territoryId, gang_id: gangId, influence: clamped, updated_at: new Date().toISOString() },
      { onConflict: 'territory_id,gang_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert influence:', error);
    return null;
  }

  return data;
}

export async function addInfluence(gangId, territoryId, amount, reason) {
  if (isInvalidGangId(gangId)) {
    console.warn('addInfluence: invalid gangId', gangId);
    return { success: false, influence: 0, applied: 0, multiplier: 0, tier: null };
  }

  if (isInvalidTerritoryId(territoryId)) {
    console.warn('addInfluence: invalid territoryId', territoryId);
    return { success: false, influence: 0, applied: 0, multiplier: 0, tier: null };
  }

  const normalizedReason = (reason || '').toUpperCase();
  if (!Object.values(INFLUENCE_REASONS).includes(normalizedReason)) {
    console.warn('addInfluence: invalid reason', reason);
    return { success: false, influence: 0, applied: 0, multiplier: 0, tier: null };
  }

  const baseAmount = typeof amount === 'number' ? amount : INFLUENCE_CONFIG.defaultAmount;
  const clampedBaseAmount = Math.max(0, baseAmount);

  let record = await fetchActionRecord(territoryId, gangId, normalizedReason);
  const now = new Date();
  const periodStart = new Date(now.getTime() - INFLUENCE_CONFIG.resetPeriodMs);

  if (!record) {
    const created = await createActionRecord(territoryId, gangId, normalizedReason);
    if (!created) {
      return { success: false, influence: 0, applied: 0, multiplier: 0, tier: null };
    }
    record = created;
  } else if (new Date(record.period_start) < periodStart) {
    const { error: resetError } = await supabase
      .from('territory_influence_actions')
      .update({ action_count: 0, period_start: now.toISOString(), updated_at: now.toISOString() })
      .eq('id', record.id);

    if (resetError) {
      console.error('Failed to reset action period:', resetError);
      return { success: false, influence: 0, applied: 0, multiplier: 0, tier: null };
    }

    record.action_count = 0;
    record.period_start = now.toISOString();
  }

  const actionCount = record.action_count;
  const multiplier = getInfluenceMultiplier(actionCount);
  const appliedAmount = clampedBaseAmount * multiplier;

  if (appliedAmount <= 0) {
    const tier = INFLUENCE_CONFIG.tiers[INFLUENCE_CONFIG.tiers.length - 1];
    return {
      success: true,
      influence: await fetchCurrentInfluence(territoryId, gangId),
      applied: 0,
      multiplier: 0,
      tier: { label: `${tier.minActions}-∞`, multiplier: tier.multiplier, remaining: 0 },
    };
  }

  const currentInfluence = await fetchCurrentInfluence(territoryId, gangId);
  const newInfluence = clamp(currentInfluence + appliedAmount, 0, 100);

  const updated = await upsertInfluence(territoryId, gangId, newInfluence);
  if (!updated) {
    return { success: false, influence: currentInfluence, applied: 0, multiplier, tier: null };
  }

  const incremented = await incrementActionCount(record.id, record.action_count);
  if (!incremented) {
    return { success: false, influence: updated.influence, applied: 0, multiplier, tier: null };
  }

  const nextActionCount = incremented.action_count;
  const tierInfo = getInfluenceTierInfo(nextActionCount);

  return {
    success: true,
    influence: updated.influence,
    applied: appliedAmount,
    multiplier,
    tier: tierInfo,
  };
}

export { INFLUENCE_REASONS, INFLUENCE_CONFIG, getInfluenceMultiplier, getInfluenceTierInfo };
