import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { usePlayerStore } from './usePlayerStore';
import { getActiveQuests, Quest, QuestConditionType, QUESTS_DATABASE } from '../features/gangs/data/questsConfig';

export interface QuestProgress {
  [questId: string]: number;
}

export interface QuestState {
  completedQuestIds: string[];
  questProgress: QuestProgress;
  checkedLocations: string[];
  totalEarned: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalTransferred: number;
  housesCount: number;
  vehiclesCount: number;
  intervalId: ReturnType<typeof setInterval> | null;

  loadProgress: () => Promise<void>;
  saveCompleted: (questId: string) => Promise<void>;
  registerEvent: (eventType: QuestConditionType | 'earn_money' | 'buy_house' | 'buy_vehicle' | 'visit', amount?: number) => void;
  startQuestTimer: () => void;
  stopQuestTimer: () => void;
  checkQuests: () => void;
  completeQuest: (quest: Quest) => Promise<void>;
  getQuestProgress: (quest: Quest) => number;
  getQuestsForUI: () => (Quest & { completed: boolean; progress: number })[];
}

export const useQuestStore = create<QuestState>((set, get) => ({
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
      console.log('Quest progress table not ready:', (err as Error).message);
    }
  },

  saveCompleted: async (questId: string) => {
    const { player } = usePlayerStore.getState();
    if (!player) return;

    try {
      await supabase
        .from('player_quests')
        .upsert({ player_id: player.id, quest_id: questId, completed: true });
    } catch (err) {
      console.log('Quest save error:', (err as Error).message);
    }
  },

  registerEvent: (eventType: QuestConditionType | 'earn_money' | 'buy_house' | 'buy_vehicle' | 'visit', amount: number = 0) => {
    switch (eventType) {
      case 'deposit':
        set({ totalDeposited: get().totalDeposited + amount });
        break;
      case 'withdraw':
        set({ totalWithdrawn: get().totalWithdrawn + amount });
        break;
      case 'transfer':
        set({ totalTransferred: get().totalTransferred + amount });
        break;
      case 'earn_money':
        set({ totalEarned: get().totalEarned + amount });
        break;
      case 'buy_house':
        set({ housesCount: get().housesCount + 1 });
        break;
      case 'buy_vehicle':
        set({ vehiclesCount: get().vehiclesCount + 1 });
        break;
      case 'visit':
        {
          const locId = String(amount);
          const newLocations = [...get().checkedLocations];
          if (!newLocations.includes(locId)) {
            newLocations.push(locId);
          }
          set({ checkedLocations: newLocations });
        }
        break;
      default:
        break;
    }
  },

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

  checkQuests: () => {
    const { completedQuestIds, totalDeposited, totalWithdrawn, totalTransferred, totalEarned, housesCount, vehiclesCount, checkedLocations } = get();
    const activeQuests = getActiveQuests(completedQuestIds);
    const newlyCompleted: Quest[] = [];

    for (const quest of activeQuests) {
      const cond = quest.condition;
      let isCompleted = false;

      switch (cond.type) {
        case 'deposit':
          isCompleted = totalDeposited >= (cond.amount || 0);
          break;
        case 'withdraw':
          isCompleted = totalWithdrawn >= (cond.amount || 0);
          break;
        case 'transfer':
          isCompleted = totalTransferred >= (cond.amount || 0);
          break;
        case 'earn_money':
          isCompleted = totalEarned >= (cond.amount || 0);
          break;
        case 'buy_house':
          isCompleted = housesCount >= 1;
          break;
        case 'buy_vehicle':
          isCompleted = vehiclesCount >= 1;
          break;
        case 'visit':
          isCompleted = checkedLocations.length >= (cond.count || 0);
          break;
        default:
          break;
      }

      if (isCompleted) {
        newlyCompleted.push(quest);
      }
    }

    for (const quest of newlyCompleted) {
      get().completeQuest(quest);
    }
  },

  completeQuest: async (quest: Quest) => {
    const { completedQuestIds } = get();
    set({ completedQuestIds: [...completedQuestIds, quest.id] });
    await get().saveCompleted(quest.id);

    if (quest.reward?.money) {
      usePlayerStore.getState().updateProfile({
        money: Number(usePlayerStore.getState().player?.money || 0) + quest.reward.money,
      });

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

  getQuestProgress: (quest: Quest) => {
    const { totalDeposited, totalWithdrawn, totalTransferred, totalEarned, housesCount, vehiclesCount, checkedLocations } = get();
    const cond = quest.condition;

    switch (cond.type) {
      case 'deposit':
        return Math.min(100, (totalDeposited / (cond.amount || 1)) * 100);
      case 'withdraw':
        return Math.min(100, (totalWithdrawn / (cond.amount || 1)) * 100);
      case 'transfer':
        return Math.min(100, (totalTransferred / (cond.amount || 1)) * 100);
      case 'earn_money':
        return Math.min(100, (totalEarned / (cond.amount || 1)) * 100);
      case 'buy_house':
        return housesCount >= 1 ? 100 : 0;
      case 'buy_vehicle':
        return vehiclesCount >= 1 ? 100 : 0;
      case 'visit':
        return Math.min(100, (checkedLocations.length / (cond.count || 1)) * 100);
      default:
        return 0;
    }
  },

  getQuestsForUI: () => {
    const { completedQuestIds } = get();
    return QUESTS_DATABASE.map(quest => {
      const isCompleted = completedQuestIds.includes(quest.id);
      const progress = isCompleted ? 100 : get().getQuestProgress(quest);
      return { ...quest, completed: isCompleted, progress };
    }).sort((a, b) => a.order - b.order);
  },
}));