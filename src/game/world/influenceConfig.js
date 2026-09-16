export const INFLUENCE_REASONS = {
  TAXI: 'TAXI',
  JOB: 'JOB',
  CARGO: 'CARGO',
  GANG_MISSION: 'GANG_MISSION',
  GANG_EVENT: 'GANG_EVENT',
  PVP: 'PVP',
  TERRITORY_EVENT: 'TERRITORY_EVENT',
  DEFENSE: 'DEFENSE',
  SPECIAL_EVENT: 'SPECIAL_EVENT',
  TEST_ADD_INFLUENCE: 'TEST_ADD_INFLUENCE',
  OTHER: 'OTHER',
};

export const INFLUENCE_CONFIG = {
  tiers: [
    { minActions: 0, maxActions: 20, multiplier: 1.0 },
    { minActions: 21, maxActions: 50, multiplier: 0.7 },
    { minActions: 51, maxActions: 100, multiplier: 0.4 },
    { minActions: 101, maxActions: Infinity, multiplier: 0.15 },
  ],
  resetPeriodMs: 24 * 60 * 60 * 1000,
  defaultAmount: 1,
};

export function getInfluenceMultiplier(actionCount) {
  const tier = INFLUENCE_CONFIG.tiers.find(t => actionCount >= t.minActions && actionCount <= t.maxActions);
  return tier ? tier.multiplier : 0;
}

export function getInfluenceTierInfo(actionCount) {
  const tier = INFLUENCE_CONFIG.tiers.find(t => actionCount >= t.minActions && actionCount <= t.maxActions);
  if (!tier) return { label: 'Максимум', multiplier: 0, remaining: 0 };
  const remaining = tier.maxActions === Infinity ? Infinity : tier.maxActions - actionCount;
  return {
    label: `${tier.minActions}-${tier.maxActions === Infinity ? '∞' : tier.maxActions}`,
    multiplier: tier.multiplier,
    remaining: remaining === Infinity ? '∞' : remaining,
  };
}
