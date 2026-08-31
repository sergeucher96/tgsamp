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

  // --- РЫБАЛКА ---
  'fishing_rod': {
    id: 'fishing_rod',
    name: 'Удочка',
    desc: 'Инструмент для ловли рыбы.',
    icon: '🎣',
    stackable: false,
    type: 'tool'
  },
  'fish_small': {
    id: 'fish_small',
    name: 'Небольшая рыба',
    desc: 'Мелкая пресноводная рыба.',
    icon: '🐟',
    stackable: true,
    maxStack: 20,
    type: 'resource',
    weightRange: [1, 3]
  },
  'fish_medium': {
    id: 'fish_medium',
    name: 'Рыба',
    desc: 'Средняя по размеру рыба.',
    icon: '�',
    stackable: true,
    maxStack: 20,
    type: 'resource',
    weightRange: [3, 7]
  },
  'fish_large': {
    id: 'fish_large',
    name: 'Крупная рыба',
    desc: 'Крупная редкая рыба.',
    icon: '🐡',
    stackable: true,
    maxStack: 20,
    type: 'resource',
    weightRange: [7, 10]
  },
  'treasure_map': {
    id: 'treasure_map',
    name: 'Карта сокровищ',
    desc: 'Найдена в бутылке. Что-то интересное ждёт...',
    icon: '🗺️',
    stackable: false,
    type: 'special'
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
    action: 'ACTIVATE_SIM',
    stackable: false,
  },

  // --- КУХНЯ / ИНГРЕДИЕНТЫ ---
  'flour': {
    id: 'flour',
    name: 'Мука',
    desc: 'Пшеничная мука для выпечки.',
    icon: '🌾',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },
  'egg': {
    id: 'egg',
    name: 'Яйцо',
    desc: 'Свежее куриное яйцо.',
    icon: '🥚',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },
  'milk': {
    id: 'milk',
    name: 'Молоко',
    desc: 'Свежее молоко.',
    icon: '🥛',
    stackable: true,
    maxStack: 5,
    type: 'ingredient'
  },
  'meat': {
    id: 'meat',
    name: 'Мясо',
    desc: 'Кусок сырого мяса.',
    icon: '🥩',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },
  'vegetables': {
    id: 'vegetables',
    name: 'Овощи',
    desc: 'Свежие овощи.',
    icon: '🥬',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },
  'sugar': {
    id: 'sugar',
    name: 'Сахар',
    desc: 'Белый сахар.',
    icon: '🧂',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },
  'tomato': {
    id: 'tomato',
    name: 'Помидоры',
    desc: 'Спелые помидоры.',
    icon: '🍅',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },
  'cheese': {
    id: 'cheese',
    name: 'Сыр',
    desc: 'Нарезанный сыр.',
    icon: '🧀',
    stackable: true,
    maxStack: 5,
    type: 'ingredient'
  },
  'cucumber': {
    id: 'cucumber',
    name: 'Огурец',
    desc: 'Свежий огурец.',
    icon: '🥒',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },
  'salt': {
    id: 'salt',
    name: 'Соль',
    desc: 'Столовая соль.',
    icon: '🧂',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },
  'potato': {
    id: 'potato',
    name: 'Картофель',
    desc: 'Картошка.',
    icon: '�',
    stackable: true,
    maxStack: 10,
    type: 'ingredient'
  },

  // --- ГОТОВЫЕ БЛЮДА ---
  'fried_fish': {
    id: 'fried_fish',
    name: 'Жареная рыба',
    desc: 'Аппетитная жареная рыба. Восстанавливает 40 энергии.',
    icon: '🐟',
    action: 'HEAL_ENERGY',
    value: 40,
    stackable: true,
    maxStack: 5,
    type: 'food',
    sellPrice: 500
  },
  'fish_soup': {
    id: 'fish_soup',
    name: 'Рыбный суп',
    desc: 'Горячий рыбный суп. Восстанавливает 55 энергии.',
    icon: '🍲',
    action: 'HEAL_ENERGY',
    value: 55,
    stackable: true,
    maxStack: 5,
    type: 'food',
    sellPrice: 800
  },
  'pizza': {
    id: 'pizza',
    name: 'Пицца',
    desc: 'Вкусная домашняя пицца. Восстанавливает 60 энергии.',
    icon: '🍕',
    action: 'HEAL_ENERGY',
    value: 60,
    stackable: true,
    maxStack: 5,
    type: 'food',
    sellPrice: 900
  },
  'omelette': {
    id: 'omelette',
    name: 'Омлет',
    desc: 'Пышный омлет. Восстанавливает 30 энергии.',
    icon: '�',
    action: 'HEAL_ENERGY',
    value: 30,
    stackable: true,
    maxStack: 5,
    type: 'food',
    sellPrice: 350
  },
  'steak': {
    id: 'steak',
    name: 'Стейк с картофелем',
    desc: 'Сочный стейк. Восстанавливает 70 энергии.',
    icon: '🥩',
    action: 'HEAL_ENERGY',
    value: 70,
    stackable: true,
    maxStack: 5,
    type: 'food',
    sellPrice: 1200
  },
  'burger': {
    id: 'burger',
    name: 'Домашний бургер',
    desc: 'Самодельный бургер. Восстанавливает 70 энергии.',
    icon: '🍔',
    action: 'HEAL_ENERGY',
    value: 70,
    stackable: true,
    maxStack: 5,
    type: 'food',
    sellPrice: 600
  },
  'cake': {
    id: 'cake',
    name: 'Торт',
    desc: 'Сладкий торт. Восстанавливает 45 энергии.',
    icon: '🎂',
    action: 'HEAL_ENERGY',
    value: 45,
    stackable: true,
    maxStack: 5,
    type: 'food',
    sellPrice: 700
  },
};