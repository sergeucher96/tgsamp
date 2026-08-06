import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';

const BANK_INTEREST_RATE = 0.001; // 0.1% в час

export const useBankStore = create((set, get) => ({
  interestIntervalId: null,
  realtimeChannel: null,
  notifications: [],

  _normalizeAmount: (input) => {
    const amount = Number(input);
    if (Number.isNaN(amount) || amount <= 0) return null;
    return Math.round(amount * 100) / 100;
  },

  addNotification: (notification) => {
    const id = Date.now();
    set({ notifications: [...get().notifications, { ...notification, id }] });
    // Auto remove after 5 seconds
    setTimeout(() => {
      set({ notifications: get().notifications.filter(n => n.id !== id) });
    }, 5000);
  },

  startRealtimeSubscription: () => {
    const { player } = usePlayerStore.getState();
    if (!player || get().realtimeChannel) return;

    const channel = supabase
      .channel('bank-transfers')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${player.id}`,
        },
        (payload) => {
          const newBalance = Number(payload.new.bank_balance || 0);
          const oldBalance = Number(player.bank_balance || 0);
          
          // If balance increased and it's not interest accrual
          if (newBalance > oldBalance && newBalance - oldBalance > 0.01) {
            const receivedAmount = Number((newBalance - oldBalance).toFixed(2));
            get().addNotification({
              type: 'transfer_received',
              amount: receivedAmount,
              message: `Вам поступил перевод ${receivedAmount.toLocaleString()} ₽`,
            });
            
            // Update local player balance
            usePlayerStore.getState().updateProfile({ bank_balance: newBalance });
          }
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  stopRealtimeSubscription: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ realtimeChannel: null });
    }
  },

  depositToOwnAccount: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (Number(player.money || 0) < amount) {
      get().addNotification({
        type: 'error',
        message: 'Недостаточно наличных для депозита.',
      });
      return false;
    }

    const success = await updateProfile({
      money: Number(player.money || 0) - amount,
      bank_balance: Number((Number(player.bank_balance || 0) + amount).toFixed(2))
    });
    
    if (success) {
      get().addNotification({
        type: 'success',
        message: `Депозит ${amount.toLocaleString()} ₽ выполнен`,
      });
    }
    return success;
  },

  withdrawFromOwnAccount: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (Number(player.bank_balance || 0) < amount) {
      get().addNotification({
        type: 'error',
        message: 'На банковском счету недостаточно средств.',
      });
      return false;
    }

    const success = await updateProfile({
      money: Number(player.money || 0) + amount,
      bank_balance: Number((Number(player.bank_balance || 0) - amount).toFixed(2))
    });
    
    if (success) {
      get().addNotification({
        type: 'success',
        message: `Снятие ${amount.toLocaleString()} ₽ выполнено`,
      });
    }
    return success;
  },

  transferToPhone: async (phoneNumber, amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (!phoneNumber || phoneNumber === player.phone_number) {
      get().addNotification({
        type: 'error',
        message: 'Введите корректный номер телефона получателя.',
      });
      return false;
    }

    if (Number(player.bank_balance || 0) < amount) {
      get().addNotification({
        type: 'error',
        message: 'На банковском счету недостаточно средств для перевода.',
      });
      return false;
    }

    const { data: recipient, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (findError) {
      console.error(findError);
      get().addNotification({
        type: 'error',
        message: 'Ошибка при поиске получателя. Попробуйте позже.',
      });
      return false;
    }

    if (!recipient) {
      get().addNotification({
        type: 'error',
        message: 'Пользователь с таким номером не найден.',
      });
      return false;
    }

    const recipientBankBalance = Number(recipient.bank_balance || 0) + amount;
    const senderBankBalance = Number(player.bank_balance || 0) - amount;

    try {
      const { error: recipientError } = await supabase
        .from('profiles')
        .update({ bank_balance: Number(recipientBankBalance.toFixed(2)) })
        .eq('id', recipient.id);

      if (recipientError) throw recipientError;

      const success = await updateProfile({ bank_balance: Number(senderBankBalance.toFixed(2)) });
      if (!success) throw new Error('Не удалось списать средства со счета отправителя.');

      get().addNotification({
        type: 'success',
        message: `Перевод ${amount.toLocaleString()} ₽ выполнен на номер ${phoneNumber}`,
      });
      return true;
    } catch (err) {
      console.error(err);
      await supabase
        .from('profiles')
        .update({ bank_balance: player.bank_balance || 0 })
        .eq('id', player.id);
      get().addNotification({
        type: 'error',
        message: 'Не удалось совершить перевод. Попробуйте позже.',
      });
      return false;
    }
  },

  accrueInterest: async () => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const balance = Number(player.bank_balance || 0);
    if (balance <= 0) return false;

    const interest = Math.round(balance * BANK_INTEREST_RATE * 100) / 100;
    if (interest <= 0) return false;

    return await updateProfile({
      bank_balance: Number((balance + interest).toFixed(2))
    });
  },

  startInterestAccrual: () => {
    if (get().interestIntervalId) return;
    const intervalId = setInterval(async () => {
      await get().accrueInterest();
    }, 3600000);
    set({ interestIntervalId: intervalId });
  },

  stopInterestAccrual: () => {
    const intervalId = get().interestIntervalId;
    if (intervalId) {
      clearInterval(intervalId);
      set({ interestIntervalId: null });
    }
  }
}));
