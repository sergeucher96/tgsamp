// src/features/character/data/skills.ts

export interface Skill {
  id: string;
  name: string;
  category: 'job' | 'weapon' | 'combat';
  icon: string;
}

export const SKILLS_DATABASE: Skill[] = [
  // РАБОТЫ
  { id: 'taxi', name: 'Водитель Такси', category: 'job', icon: '🚖' },
  { id: 'trucker', name: 'Дальнобойщик', category: 'job', icon: '🚛' },
  { id: 'miner', name: 'Горное дело', category: 'job', icon: '⛏️' },
  { id: 'pizza', name: 'Доставка пиццы', category: 'job', icon: '🍕' },
  { id: 'bus', name: 'Водитель Автобуса', category: 'job', icon: '🚌' },
  { id: 'factory', name: 'Мастер на заводе', category: 'job', icon: '🏭' },
  { id: 'mechanic', name: 'Автомеханик', category: 'job', icon: '🔧' },
  { id: 'garbage', name: 'Мусорщик', category: 'job', icon: '🗑️' },

  // ОРУЖИЕ
  { id: 'deagle', name: 'Desert Eagle', category: 'weapon', icon: '🔫' },
  { id: 'm4', name: 'M4 Карабин', category: 'weapon', icon: '🔫' },
  { id: 'shotgun', name: 'Дробовик', category: 'weapon', icon: '🔫' },

  // БОЙ
  { id: 'boxing', name: 'Бокс', category: 'combat', icon: '🥊' },
  { id: 'kickboxing', name: 'Кикбоксинг', category: 'combat', icon: '🥋' },
];