export const WAR_SCORE_CONFIG = {
  eventScores: {
    ATTACK_WIN: 10,
    DEFENSE_WIN: 8,
    RECON_SUCCESS: 3,
    DRAW: 2,
    ATTACK_LOSS: -5,
    DEFENSE_LOSS: -3,
  },
  actionScores: {
    ATTACK: 6,
    DEFEND: 4,
    RECON: 2,
    SUPPORT: 3,
    RETREAT: 0,
  },
  gangStrength: {
    participantBase: 2,
    levelFactor: 0.5,
    randomMin: 1,
    randomMax: 6,
  },
  warEnd: {
    occupationControl: 50,
    stabilizingControlPerTick: 5,
    stabilizingIntervalMs: 60 * 60 * 1000,
  },
};

export function calculateGangStrength(participants, playerStats = []) {
  const count = participants.length;
  const levels = playerStats.reduce((sum, s) => sum + (s.level || 0), 0);
  const random = Math.floor(Math.random() * (WAR_SCORE_CONFIG.gangStrength.randomMax - WAR_SCORE_CONFIG.gangStrength.randomMin + 1)) + WAR_SCORE_CONFIG.gangStrength.randomMin;

  return count * WAR_SCORE_CONFIG.gangStrength.participantBase + levels * WAR_SCORE_CONFIG.gangStrength.levelFactor + random;
}

export function calculatePlayerContribution(action, playerLevel = 1) {
  const base = WAR_SCORE_CONFIG.actionScores[action] || 0;
  return base + Math.max(0, playerLevel - 1);
}

export function getEventScore(result) {
  return WAR_SCORE_CONFIG.eventScores[result] || 0;
}
