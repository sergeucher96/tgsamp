import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, X, Trophy, Swords } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

// ==========================================
// Боевая логика / архитектура
// ==========================================

// Универсальный интерфейс бойца — подходит и для NPC, и для будущих PvP-противников
// Сейчас используется только внутри BoxClubView, но вынесен для прозрачности.
export const createFighter = (base) => ({
  id: base.id,
  name: base.name,
  maxHp: base.maxHp,
  hp: base.maxHp,
  energy: base.maxEnergy || 100,
  attack: base.attack || 10,
  defense: base.defense || 5,
  luck: base.luck || 5,
  avatar: base.avatar || '👊',
  reward: base.reward || { money: 0, exp: 0 },
  difficulty: base.difficulty || 'easy',
});

export const calculateDamage = (attacker, defender, skillValue = 0) => {
  const base = Math.max(1, attacker.attack - defender.defense + skillValue);
  const variance = Math.floor(Math.random() * 5) - 2;
  const luckBonus = Math.random() < attacker.luck * 0.01 ? Math.floor(base * 0.3) : 0;
  return Math.max(1, base + variance + luckBonus);
};

export const calculateHeal = (_fighter, skillValue = 0) => {
  return Math.min(fighter.maxHp - fighter.hp, Math.floor(5 + skillValue * 0.5 + Math.random() * 3));
};

// ==========================================
// Конфиг противников
// ==========================================
export const OPPONENTS = [
  {
    id: 'rookie',
    name: 'Новичок',
    difficulty: 'easy',
    avatar: '👊',
    maxHp: 60,
    maxEnergy: 80,
    attack: 8,
    defense: 3,
    luck: 3,
    reward: { money: 500, exp: 15 },
    desc: 'Слабый противник для разминки.',
  },
  {
    id: 'amateur',
    name: 'Любитель',
    difficulty: 'medium',
    avatar: '🥊',
    maxHp: 90,
    maxEnergy: 100,
    attack: 12,
    defense: 5,
    luck: 6,
    reward: { money: 1500, exp: 35 },
    desc: 'Опытный боец, умеет защищаться.',
  },
  {
    id: 'champion',
    name: 'Чемпион',
    difficulty: 'hard',
    avatar: '🏆',
    maxHp: 130,
    maxEnergy: 120,
    attack: 17,
    defense: 8,
    luck: 10,
    reward: { money: 4000, exp: 80 },
    desc: 'Сильнейший боксёр клуба. Только для храбрецов.',
  },
];

// ==========================================
// Состояния боя
// ==========================================
export const STAGE = { MENU: 'menu', FIGHT: 'fight', RESULT: 'result', LEADERBOARD: 'leaderboard' };

export const ACTIONS = {
  PUNCH: { id: 'punch', label: 'Удар', icon: '👊', energy: 10 },
  HEAVY_PUNCH: { id: 'heavy_punch', label: 'Тяжёлый удар', icon: '💥', energy: 20 },
  BLOCK: { id: 'block', label: 'Блок', icon: '🛡️', energy: 5 },
  DODGE: { id: 'dodge', label: 'Уклон', icon: '💨', energy: 12 },
  REST: { id: 'rest', label: 'Отдых', icon: '🧘', energy: -15 },
};

// ==========================================
// Таблица рекордов (локальная, можно потом вынести в БД)
// ==========================================
const STORAGE_KEY = 'box_club_leaderboard';

const loadLeaderboard = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLeaderboard = (records) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
};

const addLeaderboardRecord = (playerName, opponentName, won, boxingExp) => {
  const records = loadLeaderboard();
  const record = {
    playerName,
    opponentName,
    won,
    boxingExp,
    date: new Date().toISOString(),
  };
  records.unshift(record);
  const trimmed = records.slice(0, 50);
  saveLeaderboard(trimmed);
  return trimmed;
};

// ==========================================
// Основной компонент
// ==========================================
export default function BoxClubView({ onClose }) {
  const { player, updateProfile, skills, addSkillProgress } = usePlayerStore();
  const [stage, setStage] = useState(STAGE.MENU);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [fightLog, setFightLog] = useState([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [fightResult, setFightResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState(() => loadLeaderboard());
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAction, setSelectedAction] = useState(null);
  const [playerFighter, setPlayerFighter] = useState(null);
  const [opponentFighter, setOpponentFighter] = useState(null);

  const timerRef = useRef(null);
  const roundTimeoutRef = useRef(null);

  const getSkillValue = useCallback(() => {
    const skill = (skills || []).find(s => s.skill_name === 'boxing');
    return skill ? skill.value : 0;
  }, [skills]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(10);
    setSelectedAction(null);
  };

  const startTimer = () => {
    resetTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const clearAllTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
  };

  useEffect(() => () => clearAllTimers(), []);

  const handleTimeout = () => {
    if (selectedAction) return;
    const restAction = ACTIONS.REST;
    executePlayerAction(restAction);
  };

  const startFight = (opponentTemplate) => {
    const skillValue = getSkillValue();
    const playerHp = player?.hp || 100;
    const playerEnergy = player?.energy || 100;

    const pFighter = createFighter({
      id: 'player',
      name: player?.username || 'Гражданин',
      maxHp: Math.max(80, playerHp + skillValue * 2),
      hp: playerHp,
      maxEnergy: Math.max(80, playerEnergy + skillValue),
      energy: playerEnergy,
      attack: 8 + Math.floor(skillValue / 5),
      defense: 3 + Math.floor(skillValue / 8),
      luck: 3 + Math.floor(skillValue / 10),
      reward: opponentTemplate.reward,
    });

    const oFighter = createFighter({
      id: opponentTemplate.id,
      name: opponentTemplate.name,
      maxHp: opponentTemplate.maxHp,
      hp: opponentTemplate.maxHp,
      maxEnergy: opponentTemplate.maxEnergy,
      energy: opponentTemplate.maxEnergy,
      attack: opponentTemplate.attack,
      defense: opponentTemplate.defense,
      luck: opponentTemplate.luck,
      reward: opponentTemplate.reward,
      difficulty: opponentTemplate.difficulty,
    });

    setPlayerFighter(pFighter);
    setOpponentFighter(oFighter);
    setSelectedOpponent(opponentTemplate);
    setFightLog([`Бой начался! Противник: ${opponentTemplate.name}`]);
    setRoundNumber(0);
    setFightResult(null);
    setStage(STAGE.FIGHT);
    startTimer();
  };

  const getOpponentAction = (fighter) => {
    const actions = Object.values(ACTIONS).filter(a => a.id !== 'rest');
    const r = Math.random();
    if (r < 0.55) return actions.find(a => a.id === 'punch');
    if (r < 0.75) return actions.find(a => a.id === 'heavy_punch');
    if (r < 0.88) return actions.find(a => a.id === 'block');
    return actions.find(a => a.id === 'dodge');
  };

  const executePlayerAction = (action) => {
    if (!playerFighter || !opponentFighter || selectedAction) return;
    if (playerFighter.energy < action.energy) {
      setFightLog(prev => [...prev, 'Недостаточно энергии!']);
      return;
    }

    clearAllTimers();
    setSelectedAction(action.id);

    const skillValue = getSkillValue();
    const newPlayerEnergy = Math.max(0, playerFighter.energy - action.energy);
    const updatedPlayer = { ...playerFighter, energy: newPlayerEnergy };
    setPlayerFighter(updatedPlayer);

    const opponentAction = getOpponentAction(opponentFighter);
    const updatedOpponent = { ...opponentFighter, energy: Math.max(0, opponentFighter.energy - opponentAction.energy) };

    let playerDamage = 0;
    let opponentDamage = 0;
    let logMessages = [];

    // Игрок атакует
    if (action.id === 'punch' || action.id === 'heavy_punch') {
      const baseDmg = calculateDamage(updatedPlayer, updatedOpponent, skillValue);
      const multiplier = action.id === 'heavy_punch' ? 1.6 : 1;
      playerDamage = Math.floor(baseDmg * multiplier);
      updatedOpponent.hp = Math.max(0, updatedOpponent.hp - playerDamage);
      logMessages.push(`Вы используете ${action.label} и наносите ${playerDamage} урона!`);
    } else if (action.id === 'rest') {
      const heal = calculateHeal(updatedPlayer, skillValue);
      updatedPlayer.hp = Math.min(updatedPlayer.maxHp, updatedPlayer.hp + heal);
      logMessages.push(`Вы отдыхаете и восстанавливаете ${heal} HP.`);
    } else if (action.id === 'block') {
      logMessages.push('Вы занимаете защитную позицию.');
    } else if (action.id === 'dodge') {
      logMessages.push('Вы пытаетесь уклониться.');
    }

    // NPC атакует
    if (opponentAction.id === 'punch' || opponentAction.id === 'heavy_punch') {
      const baseDmg = calculateDamage(updatedOpponent, updatedPlayer, 0);
      const multiplier = opponentAction.id === 'heavy_punch' ? 1.6 : 1;
      opponentDamage = Math.floor(baseDmg * multiplier);
      if (action.id === 'block') {
        opponentDamage = Math.floor(opponentDamage * 0.4);
        logMessages.push(`Вы блокируете удар! Получено ${opponentDamage} урона.`);
      } else if (action.id === 'dodge') {
        if (Math.random() < 0.5) {
          opponentDamage = 0;
          logMessages.push('Вы уклоняетесь от удара!');
        } else {
          logMessages.push(`Неудачный уклон. Получено ${opponentDamage} урона.`);
        }
      } else {
        logMessages.push(`${updatedOpponent.name} использует ${opponentAction.label} и наносит ${opponentDamage} урона!`);
      }
      updatedPlayer.hp = Math.max(0, updatedPlayer.hp - opponentDamage);
    } else if (opponentAction.id === 'rest') {
      const heal = calculateHeal(updatedOpponent, 0);
      updatedOpponent.hp = Math.min(updatedOpponent.maxHp, updatedOpponent.hp + heal);
      logMessages.push(`${updatedOpponent.name} отдыхает и восстанавливает ${heal} HP.`);
    } else if (opponentAction.id === 'block') {
      if (playerDamage > 0) {
        const reduced = Math.floor(playerDamage * 0.4);
        updatedOpponent.hp = Math.min(updatedOpponent.hp + (playerDamage - reduced), updatedOpponent.maxHp);
        playerDamage = reduced;
        logMessages.push(`${updatedOpponent.name} блокирует часть удара! Урон снижен до ${reduced}.`);
      }
    } else if (opponentAction.id === 'dodge') {
      if (Math.random() < 0.4 && playerDamage > 0) {
        playerDamage = 0;
        logMessages.push(`${updatedOpponent.name} уклоняется от вашего удара!`);
      }
    }

    setPlayerFighter(updatedPlayer);
    setOpponentFighter(updatedOpponent);
    setFightLog(prev => [...prev, ...logMessages]);
    setRoundNumber(r => r + 1);

    // Проверка KO
    if (updatedOpponent.hp <= 0 || updatedPlayer.hp <= 0) {
      endFight(updatedPlayer.hp > 0 ? 'win' : 'lose', updatedPlayer, updatedOpponent);
    } else {
      roundTimeoutRef.current = setTimeout(() => {
        resetTimer();
        startTimer();
      }, 800);
    }
  };

  const endFight = async (result, finalPlayer, finalOpponent) => {
    clearAllTimers();

    let moneyReward = 0;
    let expReward = 0;
    let hpLoss = 0;

    if (result === 'win') {
      const baseMoney = finalOpponent.reward?.money || 500;
      const baseExp = finalOpponent.reward?.exp || 15;
      const skillBonus = 1 + skillValue * 0.02;
      moneyReward = Math.floor(baseMoney * skillBonus);
      expReward = Math.floor(baseExp * skillBonus);
      hpLoss = Math.floor(Math.random() * 10) + 2;
    } else {
      moneyReward = 0;
      expReward = Math.floor((finalOpponent.reward?.exp || 15) * 0.3);
      hpLoss = Math.floor(Math.random() * 20) + 10;
    }

    const currentHp = Math.max(1, (player?.hp || 100) - hpLoss);
    await updateProfile({ hp: currentHp });
    if (expReward > 0) {
      await addSkillProgress('boxing', expReward);
    }

    const newRecord = addLeaderboardRecord(
      player?.username || 'Гражданин',
      finalOpponent.name,
      result === 'win',
      expReward
    );
    setLeaderboard(newRecord);

    setFightResult({
      result,
      moneyReward,
      expReward,
      hpLoss,
      playerHp: currentHp,
      opponentHp: finalOpponent.hp,
    });
    setStage(STAGE.RESULT);
  };

  const resetToMenu = () => {
    clearAllTimers();
    setStage(STAGE.MENU);
    setSelectedOpponent(null);
    setFightLog([]);
    setRoundNumber(0);
    setFightResult(null);
    setSelectedAction(null);
    setPlayerFighter(null);
    setOpponentFighter(null);
  };

  const openLeaderboard = () => {
    setLeaderboard(loadLeaderboard());
    setStage(STAGE.LEADERBOARD);
  };

  // ==========================================
  // РЕНДЕР
  // ==========================================
  if (stage === STAGE.MENU) {
    return (
      <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full bg-[#0a0f1a] border-t sm:border border-white/10 sm:rounded-3xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px]">
          <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Swords size={16} className="text-[#8cff4a]" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8cff4a]">Боксерский клуб</span>
            </div>
            <div className="flex gap-2">
              <button onClick={openLeaderboard} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
                <Trophy size={16} className="text-yellow-400" />
              </button>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
                <X size={18} className="text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Выберите противника</div>
            <div className="space-y-3">
              {OPPONENTS.map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => startFight(opp)}
                  className="w-full bg-white/[0.03] border border-white/6 p-4 rounded-2xl text-left active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-3xl">{opp.avatar}</div>
                    <div>
                      <div className="text-sm font-black uppercase italic text-white">{opp.name}</div>
                      <div className="text-[10px] text-slate-400">{opp.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-slate-400">
                    <span>HP: {opp.maxHp}</span>
                    <span>Урон: {opp.attack}</span>
                    <span>Защита: {opp.defense}</span>
                    <span className="text-yellow-400">${opp.reward.money}</span>
                    <span className="text-[#8cff4a]">+{opp.reward.exp} exp</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === STAGE.FIGHT && playerFighter && opponentFighter) {
    const skillValue = getSkillValue();
    const playerHpPercent = Math.max(0, (playerFighter.hp / playerFighter.maxHp) * 100);
    const opponentHpPercent = Math.max(0, (opponentFighter.hp / opponentFighter.maxHp) * 100);
    const playerEnergyPercent = Math.max(0, (playerFighter.energy / playerFighter.maxEnergy) * 100);

    return (
      <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={resetToMenu} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Раунд {roundNumber}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-black text-yellow-400">
            {timeLeft}с
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4">
          {/* Бойцы */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/[0.03] border border-white/6 rounded-2xl p-3">
              <div className="text-2xl text-center mb-2">{playerFighter.avatar}</div>
              <div className="text-[10px] font-black uppercase text-center text-white mb-2">{playerFighter.name}</div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${playerHpPercent}%` }} />
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${playerEnergyPercent}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>HP {Math.max(0, playerFighter.hp)}</span>
                <span>Energy {Math.max(0, playerFighter.energy)}</span>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/6 rounded-2xl p-3">
              <div className="text-2xl text-center mb-2">{opponentFighter.avatar}</div>
              <div className="text-[10px] font-black uppercase text-center text-white mb-2">{opponentFighter.name}</div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-1">
                <div className={`h-full rounded-full transition-all ${opponentHpPercent > 50 ? 'bg-red-500' : opponentHpPercent > 20 ? 'bg-amber-500' : 'bg-red-600'}`} style={{ width: `${opponentHpPercent}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>HP {Math.max(0, opponentFighter.hp)}</span>
                <span>Energy {Math.max(0, opponentFighter.energy)}</span>
              </div>
            </div>
          </div>

          {/* Лог боя */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 mb-4 h-32 overflow-y-auto no-scrollbar">
            {fightLog.slice(-6).map((msg, idx) => (
              <div key={idx} className="text-[11px] text-slate-300 mb-1 last:mb-0">{msg}</div>
            ))}
          </div>

          {/* Действия */}
          <div className="grid grid-cols-2 gap-2">
            {Object.values(ACTIONS).map((action) => {
              const canUse = playerFighter.energy >= action.energy && !selectedAction;
              return (
                <button
                  key={action.id}
                  disabled={!canUse}
                  onClick={() => executePlayerAction(action)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95 ${
                    canUse
                      ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                      : 'bg-white/[0.02] border border-white/5 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                  {action.energy > 0 && <span className="text-[9px] text-slate-500">-{action.energy}⚡</span>}
                  {action.energy < 0 && <span className="text-[9px] text-[#8cff4a]">+{Math.abs(action.energy)}⚡</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (stage === STAGE.RESULT && fightResult) {
    const won = fightResult.result === 'win';
    return (
      <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full bg-[#0a0f1a] border border-white/10 rounded-3xl p-6 text-center">
          <div className="text-5xl mb-3">{won ? '🏆' : '💀'}</div>
          <h2 className="text-xl font-black uppercase italic text-white mb-2">{won ? 'Победа!' : 'Поражение'}</h2>
          <p className="text-[11px] text-slate-400 mb-4">
            {won ? 'Вы нокаутировали соперника!' : 'Вы потеряли сознание...'}
          </p>

          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mb-4 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Деньги</span>
              <span className="text-yellow-400 font-black">+${fightResult.moneyReward.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Опыт бокса</span>
              <span className="text-[#8cff4a] font-black">+{fightResult.expReward}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Потеря HP</span>
              <span className="text-red-400 font-black">-{fightResult.hpLoss}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Ваш HP</span>
              <span className="text-white font-black">{fightResult.playerHp}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={resetToMenu}
              className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
            >
              В меню
            </button>
            <button
              onClick={() => selectedOpponent && startFight(selectedOpponent)}
              className="py-3 bg-[#8cff4a]/10 hover:bg-[#8cff4a]/20 border border-[#8cff4a]/30 text-[#8cff4a] rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
            >
              Реванш
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === STAGE.LEADERBOARD) {
    return (
      <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full bg-[#0a0f1a] border-t sm:border border-white/10 sm:rounded-3xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px]">
          <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-yellow-400">Рекорды</span>
            </div>
            <button onClick={() => setStage(STAGE.MENU)} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
              <X size={18} className="text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-4">
            {leaderboard.length === 0 ? (
              <div className="text-center text-slate-500 text-[11px] py-8">Пока нет записей. Выйдите на ринг!</div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((rec, idx) => (
                  <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-black w-5 text-center ${idx === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-white">{rec.playerName}</div>
                        <div className="text-[9px] text-slate-400">
                          vs {rec.opponentName} • {rec.won ? 'Победа' : 'Поражение'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-[#8cff4a]">+{rec.boxingExp} exp</div>
                      <div className="text-[9px] text-slate-500">
                        {new Date(rec.date).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
