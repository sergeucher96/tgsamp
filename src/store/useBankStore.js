import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';

const BANK_INTEREST_RATE = 0.001; // 0.1% в час

export const useBankStore = create((set, get) => ({
  interestIntervalId: null,

  _normalizeAmount: (input) => {
    const amount = Number(input);
    if (Number.isNaN(amount) || amount <= 0) return null;
    return Math.round(amount * 100) / 100;
  },

  depositToOwnAccount: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (Number(player.money || 0) < amount) {
      alert('Недостаточно наличных для депозита.');
      return false;
    }

    return await updateProfile({
      money: Number(player.money || 0) - amount,
      bank_balance: Number((Number(player.bank_balance || 0) + amount).toFixed(2))
    });
  },

  withdrawFromOwnAccount: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (Number(player.bank_balance || 0) < amount) {
      alert('На банковском счету недостаточно средств.');
      return false;
    }

    return await updateProfile({
      money: Number(player.money || 0) + amount,
      bank_balance: Number((Number(player.bank_balance || 0) - amount).toFixed(2))
    });
  },

  transferToPhone: async (phoneNumber, amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (!phoneNumber || phoneNumber === player.phone_number) {
      alert('Введите корректный номер телефона получателя.');
      return false;
    }

    if (Number(player.bank_balance || 0) < amount) {
      alert('На банковском счету недостаточно средств для перевода.');
      return false;
    }

    const { data: recipient, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (findError) {
      console.error(findError);
      alert('Ошибка при поиске получателя. Попробуйте позже.');
      return false;
    }

    if (!recipient) {
      alert('Пользователь с таким номером не найден.');
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

      alert(`Перевод ${amount.toLocaleString()} ₽ выполнен на номер ${phoneNumber}.`);
      return true;
    } catch (err) {
      console.error(err);
      await supabase
        .from('profiles')
        .update({ bank_balance: player.bank_balance || 0 })
        .eq('id', player.id);
      alert('Не удалось совершить перевод. Попробуйте позже.');
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
