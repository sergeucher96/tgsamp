import { calculateGangStrength, calculatePlayerContribution, getEventScore, WAR_SCORE_CONFIG } from '../data/warConfig';

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function resolveEventOutcome(attackerParticipants, defenderParticipants, _eventType) {
  const attackerStrength = calculateGangStrength(attackerParticipants);
  const defenderStrength = calculateGangStrength(defenderParticipants);

  const attackerRoll = roll(1, 20);
  const defenderRoll = roll(1, 20);

  const attackerTotal = attackerStrength + attackerRoll;
  const defenderTotal = defenderStrength + defenderRoll;

  if (attackerTotal > defenderTotal) {
    return {
      result: 'ATTACKER_WIN',
      attackerScore: getEventScore('ATTACK_WIN'),
      defenderScore: getEventScore('ATTACK_LOSS'),
      details: { attackerStrength, defenderStrength, attackerRoll, defenderRoll },
    };
  }

  if (defenderTotal > attackerTotal) {
    return {
      result: 'DEFENDER_WIN',
      attackerScore: getEventScore('ATTACK_LOSS'),
      defenderScore: getEventScore('DEFENSE_WIN'),
      details: { attackerStrength, defenderStrength, attackerRoll, defenderRoll },
    };
  }

  return {
    result: 'DRAW',
    attackerScore: getEventScore('DRAW'),
    defenderScore: getEventScore('DRAW'),
    details: { attackerStrength, defenderStrength, attackerRoll, defenderRoll },
  };
}

export function calculateWarResult(attackerScore, defenderScore) {
  if (attackerScore > defenderScore) return 'ATTACKER_WIN';
  if (defenderScore > attackerScore) return 'DEFENDER_WIN';
  return 'DRAW';
}

export function applyWarResultToTerritory(territory, result, winnerGangId) {
  if (result === 'DRAW') {
    return {
      ...territory,
      status: 'OCCUPIED',
      owner_gang_id: territory.owner_gang_id,
      control: WAR_SCORE_CONFIG.warEnd.occupationControl,
    };
  }

  return {
    ...territory,
    status: 'OCCUPIED',
    owner_gang_id: winnerGangId,
    control: WAR_SCORE_CONFIG.warEnd.occupationControl,
  };
}

export function getAvailableActions(eventType) {
  switch (eventType) {
    case 'SHOOTOUT':
    case 'AMBUSH':
    case 'STREET_FIGHT':
      return ['ATTACK', 'DEFEND', 'RETREAT'];
    case 'RECON':
      return ['RECON', 'SUPPORT', 'RETREAT'];
    case 'DEFENSE':
      return ['DEFEND', 'SUPPORT', 'RETREAT'];
    case 'ATTACK':
      return ['ATTACK', 'SUPPORT', 'RETREAT'];
    case 'SUPPLY':
      return ['SUPPORT', 'RETREAT'];
    default:
      return ['ATTACK', 'DEFEND', 'SUPPORT', 'RETREAT'];
  }
}

export { calculatePlayerContribution, getEventScore, WAR_SCORE_CONFIG };
