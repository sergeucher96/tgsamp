import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { getActiveQuests } from '../data/questsConfig';

export const useQuestStore = create((set, get) => ({
  completedQuestIds: [],
  questProgress: {},
  checkedLocations: [],
  totalEarned: 0,
  totalDeposited: 0,
  totalWithdrawn: 0,
  totalTransferred: 0,
  housesCount: 0,
  vehiclesCount: 0,
  intervalId: null,

  // Загрузка прогресса из БД
  loadProgress: async () => {
    const { player } = usePlayerStore.getState();
    if (!player) return;

    try {
      const { data } = await supabase
        .from('player_quests')
        .select('quest_id, completed')
        .eq('player_id', player.id);
      
      if (data) {
        const completed = data.filter(q => q.completed).map(q => q.quest_id);
        set({ completedQuestIds: completed });
      }
    } catch (err) {
      // Таблица может ещё не существовать
      console.log('Quest progress table not ready:', err.message);
    }
  },

  // Сохранение завершения квеста в БД
  saveCompleted: async (questId) => {
    const { player } = usePlayerStore.getState();
    if (!player) return;

    try {
      await supabase
        .from('player_quests')
        .upsert({ player_id: player.id, quest_id: questId, completed: true });
    } catch (err) {
      console.log('Quest save error:', err.message);
    }
  },

  // Регистрация события (вызывается из банковских операций, покупки дома и т.д.)
  registerEvent: (eventType, amount = 0) => {
    const state = get();
    const newState = { ...state.questProgress };

    switch (eventType) {
      case 'deposit':
        set({ totalDeposited: state.totalDeposited + amount });
        break;
      case 'withdraw':
        set({ totalWithdrawn: state.totalWithdrawn + amount });
        break;
      case 'transfer':
        set({ totalTransferred: state.totalTransferred + amount });
        break;
      case 'earn_money':
        set({ totalEarned: state.totalEarned + amount });
        break;
      case 'buy_house':
        set({ housesCount: state.housesCount + 1 });
        break;
      case 'buy_vehicle':
        set({ vehiclesCount: state.vehiclesCount + 1 });
        break;
      case 'visit':
        const locId = amount;
        const newLocations = [...get().checkedLocations];
        if (!newLocations.includes(locId)) {
          newLocations.push(locId);
        }
        set({ checkedLocations: newLocations });
        break;
      default:
        break;
    }
  },

  // Таймер проверяет условия квестов каждые 10 секунд
  startQuestTimer: () => {
    if (get().intervalId) return;
    const intervalId = setInterval(() => {
      get().checkQuests();
    }, 10000);
    set({ intervalId });
  },

  stopQuestTimer: () => {
    const intervalId = get().intervalId;
    if (intervalId) {
      clearInterval(intervalId);
      set({ intervalId: null });
    }
  },

  // Проверка всех активных квестов
  checkQuests: () => {
    const { completedQuestIds, totalDeposited, totalWithdrawn, totalTransferred, totalEarned, housesCount, vehiclesCount, checkedLocations } = get();
    const activeQuests = getActiveQuests(completedQuestIds);
    const newlyCompleted = [];

    for (const quest of activeQuests) {
      const cond = quest.condition;
      let isCompleted = false;

      switch (cond.type) {
        case 'deposit':
          isCompleted = totalDeposited >= cond.amount;
          break;
        case 'withdraw':
          isCompleted = totalWithdrawn >= cond.amount;
          break;
        case 'transfer':
          isCompleted = totalTransferred >= cond.amount;
          break;
        case 'earn_money':
          isCompleted = totalEarned >= cond.amount;
          break;
        case 'buy_house':
          isCompleted = housesCount >= 1;
          break;
        case 'buy_vehicle':
          isCompleted = vehiclesCount >= 1;
          break;
        case 'visit':
          isCompleted = checkedLocations.length >= cond.count;
          break;
        default:
          break;
      }

      if (isCompleted) {
        newlyCompleted.push(quest);
      }
    }

    // Выполняем награды
    for (const quest of newlyCompleted) {
      get().completeQuest(quest);
    }
  },

  // Завершение квеста + выдача награды
  completeQuest: async (quest) => {
    const { completedQuestIds } = get();
    set({ completedQuestIds: [...completedQuestIds, quest.id] });
    await get().saveCompleted(quest.id);

    // Выдаём награду
    if (quest.reward?.money) {
      usePlayerStore.getState().updateProfile({
        money: Number(usePlayerStore.getState().player?.money || 0) + quest.reward.money,
      });
      
      // Уведомление
      try {
        const { useBankStore } = await import('./useBankStore');
        useBankStore.getState().addNotification({
          type: 'success',
          message: `🏆 Квест "${quest.title}" выполнен! +${quest.reward.money.toLocaleString()} $`,
        });
      } catch (e) {
        console.log('Notification error:', e);
      }
    }
  },

  // Получение прогресса по конкретному квесту (0-100)
  getQuestProgress: (quest) => {
    const { totalDeposited, totalWithdrawn, totalTransferred, totalEarned, housesCount, vehiclesCount, checkedLocations } = get();
    const cond = quest.condition;
    
    switch (cond.type) {
      case 'deposit':
        return Math.min(100, (totalDeposited / cond.amount) * 100);
      case 'withdraw':
        return Math.min(100, (totalWithdrawn / cond.amount) * 100);
      case 'transfer':
        return Math.min(100, (totalTransferred / cond.amount) * 100);
      case 'earn_money':
        return Math.min(100, (totalEarned / cond.amount) * 100);
      case 'buy_house':
        return housesCount >= 1 ? 100 : 0;
      case 'buy_vehicle':
        return vehiclesCount >= 1 ? 100 : 0;
      case 'visit':
        return Math.min(100, (checkedLocations.length / cond.count) * 100);
      default:
        return 0;
    }
  },

  // Получить активные и завершенные квесты с прогрессом
  getQuestsForUI: () => {
    const { completedQuestIds } = get();
    return QUESTS_DATABASE.map(quest => {
      const isCompleted = completedQuestIds.includes(quest.id);
      const progress = isCompleted ? 100 : get().getQuestProgress(quest);
      return { ...quest, completed: isCompleted, progress };
    }).sort((a, b) => a.order - b.order);
  },
}));