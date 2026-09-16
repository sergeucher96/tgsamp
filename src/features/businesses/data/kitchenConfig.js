// src/data/kitchenConfig.js
// Recipes for the kitchen cooking system
export const RECIPES = [
  {
    id: 'meat_fish',
    name: 'Мясной суп с рыбой',
    icon: '🍲',
    ingredients: ['meat', 'fish_small', 'vegetables', 'potato'],
    resultItem: 'fish_soup',
  },
  {
    id: 'fried_fish',
    name: 'Жареная рыба',
    icon: '🐟',
    ingredients: ['fish_small', 'vegetables'],
    resultItem: 'fried_fish',
  },
  {
    id: 'omelette',
    name: 'Омлет',
    icon: '🍳',
    ingredients: ['egg', 'egg', 'milk'],
    resultItem: 'omelette',
  },
  {
    id: 'steak',
    name: 'Стейк с картофелем',
    icon: '🥩',
    ingredients: ['meat', 'potato', 'vegetables'],
    resultItem: 'steak',
  },
  {
    id: 'pizza',
    name: 'Пицца',
    icon: '�',
    ingredients: ['flour', 'tomato', 'cheese', 'meat'],
    resultItem: 'pizza',
  },
  {
    id: 'burger',
    name: 'Домашний бургер',
    icon: '🍔',
    ingredients: ['cucumber', 'tomato', 'salt', 'salt'],
    resultItem: 'burger',
  },
  {
    id: 'cake',
    name: 'Торт',
    icon: '🎂',
    ingredients: ['flour', 'egg', 'sugar', 'milk'],
    resultItem: 'cake',
  },
];