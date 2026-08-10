// src/data/clothingConfig.js

export const EQUIPMENT_SLOTS = {
  head: { id: 'head', name: 'Голова', icon: '🧢' },
  neck: { id: 'neck', name: 'Шея (цепи)', icon: '📿' },
  torso: { id: 'torso', name: 'Туловище', icon: '👕' },
  hands: { id: 'hands', name: 'Руки', icon: '🧤' },
  legs: { id: 'legs', name: 'Ноги', icon: '👖' },
  feet: { id: 'feet', name: 'Обувь', icon: '👟' },
};

export const CLOTHING_DATABASE = {
  // --- ГОЛОВА ---
  'cap_basic': {
    id: 'cap_basic',
    name: 'Бейсболка',
    desc: 'Обычная бейсболка.',
    icon: '🧢',
    slot: 'head',
    price: 800,
    stats: { charisma: 2 },
    type: 'clothing'
  },
  'helmet_tactical': {
    id: 'helmet_tactical',
    name: 'Тактический шлем',
    desc: 'Защитный шлем для опасных миссий.',
    icon: '⛑️',
    slot: 'head',
    price: 5000,
    stats: { armor: 15 },
    type: 'clothing'
  },

  // --- ШЕЯ (ЦЕПИ) ---
  'chain_silver': {
    id: 'chain_silver',
    name: 'Серебряная цепь',
    desc: 'Стильная серебряная цепь.',
    icon: '📿',
    slot: 'neck',
    price: 3000,
    stats: { charisma: 5 },
    type: 'clothing'
  },
  'chain_gold': {
    id: 'chain_gold',
    name: 'Золотая цепь',
    desc: 'Массивная золотая цепь.',
    icon: '📿',
    slot: 'neck',
    price: 12000,
    stats: { charisma: 10 },
    type: 'clothing'
  },
  'chain_diamond': {
    id: 'chain_diamond',
    name: 'Цепь с бриллиантами',
    desc: 'Роскошная цепь с бриллиантами.',
    icon: '💎',
    slot: 'neck',
    price: 50000,
    stats: { charisma: 20 },
    type: 'clothing'
  },

  // --- ТУЛОВИЩЕ ---
  'tshirt_basic': {
    id: 'tshirt_basic',
    name: 'Футболка',
    desc: 'Обычная футболка.',
    icon: '👕',
    slot: 'torso',
    price: 500,
    stats: { charisma: 1 },
    type: 'clothing'
  },
  'jacket_leather': {
    id: 'jacket_leather',
    name: 'Кожаная куртка',
    desc: 'Стильная кожаная куртка.',
    icon: '🧥',
    slot: 'torso',
    price: 8000,
    stats: { charisma: 8, armor: 5 },
    type: 'clothing'
  },
  'vest_tactical': {
    id: 'vest_tactical',
    name: 'Бронежилет',
    desc: 'Тактический жилет с бронепластинами.',
    icon: '🦺',
    slot: 'torso',
    price: 25000,
    stats: { armor: 30 },
    type: 'clothing'
  },

  // --- РУКИ ---
  'gloves_basic': {
    id: 'gloves_basic',
    name: 'Перчатки',
    desc: 'Обычные рабочие перчатки.',
    icon: '🧤',
    slot: 'hands',
    price: 600,
    stats: { stamina: 3 },
    type: 'clothing'
  },

  // --- НОГИ ---
  'pants_cargo': {
    id: 'pants_cargo',
    name: 'Карго-штаны',
    desc: 'Удобные штаны с карманами.',
    icon: '👖',
    slot: 'legs',
    price: 1200,
    stats: { stamina: 5, inv_slots: 2 },
    type: 'clothing'
  },

  // --- ОБУВЬ ---
  'sneakers_basic': {
    id: 'sneakers_basic',
    name: 'Кроссовки',
    desc: 'Удобные кроссовки для бега.',
    icon: '👟',
    slot: 'feet',
    price: 1500,
    stats: { speed: 3, stamina: 3 },
    type: 'clothing'
  },
  'boots_heavy': {
    id: 'boots_heavy',
    name: 'Ботинки',
    desc: 'Тяжёлые ботинки для работы.',
    icon: '🥾',
    slot: 'feet',
    price: 2500,
    stats: { armor: 3, stamina: 5 },
    type: 'clothing'
  },
};

// Все предметы одежды
export const ALL_CLOTHING = Object.values(CLOTHING_DATABASE);
