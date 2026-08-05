// src/data/miningConfig.js

export const MINING_LOOT = [
  { id: 'iron_ore', chance: 50, minSkill: 0, exp: 5, name: 'Железо' },
  { id: 'coal', chance: 30, minSkill: 0, exp: 3, name: 'Уголь' },
  { id: 'copper_ore', chance: 15, minSkill: 20, exp: 10, name: 'Медь' },
  { id: 'silver_ore', chance: 4, minSkill: 50, exp: 25, name: 'Серебро' },
  { id: 'gold_ore', chance: 1, minSkill: 80, exp: 50, name: 'Золото' },
];

export const MINING_SETTINGS = {
  energyCost: 8,         // Сколько тратит за один удар
  miningTime: 4000,      // Базовое время добычи (4 сек)
  skillChanceMultiplier: 0.1 // Каждые 10% навыка дают +1% к шансу редкой руды
};