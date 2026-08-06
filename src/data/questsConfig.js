// Система квестов
// category: tutorial | main | side
// condition.type: deposit | withdraw | transfer | visit | buy_house | buy_vehicle | complete_job | reach_level | earn_money

export const QUESTS_DATABASE = [
  // === TUTORIAL QUESTS ===
  {
    id: 'tutorial_bank_deposit',
    title: 'Первый депозит',
    description: 'Пополните банковский счёт хотя бы на 100 $',
    category: 'tutorial',
    icon: '🏦',
    condition: { type: 'deposit', amount: 100 },
    reward: { money: 500 },
    rewardText: '500 $',
    order: 1,
    nextQuest: 'tutorial_bank_withdraw',
  },
  {
    id: 'tutorial_bank_withdraw',
    title: 'Снятие наличных',
    description: 'Снимите деньги с банковского счёта',
    category: 'tutorial',
    icon: '💸',
    condition: { type: 'withdraw', amount: 1 },
    reward: { money: 200 },
    rewardText: '200 $',
    order: 2,
    nextQuest: 'tutorial_earn_money',
  },
  {
    id: 'tutorial_earn_money',
    title: 'Первый заработок',
    description: 'Заработайте 1000 $ суммарно (работа, перевод и т.д.)',
    category: 'tutorial',
    icon: '💰',
    condition: { type: 'earn_money', amount: 1000 },
    reward: { money: 1000 },
    rewardText: '1 000 $',
    order: 3,
    nextQuest: 'tutorial_buy_house',
  },
  {
    id: 'tutorial_buy_house',
    title: 'Первая квартира',
    description: 'Купите свой первый дом',
    category: 'tutorial',
    icon: '🏠',
    condition: { type: 'buy_house' },
    reward: { money: 5000 },
    rewardText: '5 000 $',
    order: 4,
    nextQuest: 'tutorial_visit_5_locations',
  },
  {
    id: 'tutorial_visit_5_locations',
    title: 'Исследователь',
    description: 'Посетите 5 разных локаций в городе',
    category: 'tutorial',
    icon: '🗺️',
    condition: { type: 'visit', count: 5 },
    reward: { money: 1500 },
    rewardText: '1 500 $',
    order: 5,
    nextQuest: 'tutorial_transfer',
  },
  {
    id: 'tutorial_transfer',
    title: 'Щедрый друг',
    description: 'Переведите деньги другому игроку по номеру телефона',
    category: 'tutorial',
    icon: '📱',
    condition: { type: 'transfer', amount: 1 },
    reward: { money: 300 },
    rewardText: '300 $',
    order: 6,
    nextQuest: null,
  },
  // === MAIN QUESTS (for later) ===
  {
    id: 'main_earn_100k',
    title: 'Богатейший гражданин',
    description: 'Накопите 100 000 $ наличными',
    category: 'main',
    icon: '💎',
    condition: { type: 'earn_money', amount: 100000 },
    reward: { money: 10000 },
    rewardText: '10 000 $',
    order: 10,
    nextQuest: null,
  },
  {
    id: 'main_buy_vehicle',
    title: 'Автомобилист',
    description: 'Купите свой первый автомобиль',
    category: 'main',
    icon: '🚗',
    condition: { type: 'buy_vehicle' },
    reward: { money: 5000 },
    rewardText: '5 000 $',
    order: 11,
    nextQuest: null,
  },
];

export const getActiveQuests = (completedQuestIds = []) =>
  QUESTS_DATABASE.filter(q => !completedQuestIds.includes(q.id));

export const getTutorialQuests = () =>
  QUESTS_DATABASE.filter(q => q.category === 'tutorial').sort((a, b) => a.order - b.order);

export const getQuestsForUI = (completedQuestIds = [], questProgress = {}) => {
  return QUESTS_DATABASE
    .filter(q => !completedQuestIds.includes(q.id))
    .map(q => ({
      ...q,
      completed: completedQuestIds.includes(q.id),
      progress: questProgress[q.id] || 0,
    }));
};