// src/data/items.js

export const ITEM_DATABASE = {
  // --- ИНСТРУМЕНТЫ ---
  'pickaxe': {
    id: 'pickaxe',
    name: 'Стальная кирка',
    desc: 'Инструмент для добычи ресурсов на шахте.',
    icon: '⛏️',
    stackable: false,
    type: 'tool'
  },

  // --- ЕДА ---
  'apple': {
    id: 'apple',
    name: 'Красное яблоко',
    desc: 'Восстанавливает 15 ед. энергии.',
    icon: '🍎',
    action: 'HEAL_ENERGY',
    value: 15,
    stackable: true,
    maxStack: 20
  },

  // --- ГАДЖЕТЫ И РАСХОДНИКИ ---
  'phone': {
    id: 'phone',
    name: 'Смартфон',
    desc: 'Доступ к связи, банку и навигации.',
    icon: '📱',
    action: 'OPEN_PHONE',
    stackable: false
  },
  'repair_kit': {
    id: 'repair_kit',
    name: 'Ремкомплект',
    desc: 'Набор инструментов для починки авто.',
    icon: '🔧',
    stackable: true,
    maxStack: 5
  },

  // --- РЕСУРСЫ ---
  'iron_ore': { 
    id: 'iron_ore', 
    name: 'Железная руда', 
    desc: 'Добытый ресурс. Можно продать.', 
    icon: '🪨', 
    stackable: true, 
    maxStack: 50, 
    type: 'resource' 
  },
  'coal': { 
    id: 'coal', 
    name: 'Уголь', 
    desc: 'Горючее ископаемое.', 
    icon: '⬛', 
    stackable: true, 
    maxStack: 50, 
    type: 'resource' 
  },
   'sim_card': {
    id: 'sim_card',
    name: 'SIM-карта',
    desc: 'Позволяет активировать новый уникальный номер телефона.',
    icon: '💳',
    type: 'item',
    action: 'ACTIVATE_SIM', // Уникальное действие
    stackable: false,
  },
};