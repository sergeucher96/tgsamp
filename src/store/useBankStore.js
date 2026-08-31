import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { useQuestStore } from './useQuestStore';
import { useHouseStore } from './useHouseStore';
import { HOUSE_CLASSES } from '../data/houseConfig';

const BANK_INTEREST_RATE = 0.001; // 0.1% в час (только на депозит)

export const useBankStore = create((set, get) => ({
  interestIntervalId: null,
  realtimeChannel: null,
  _lastBalance: 0,
  notifications: [],
  transactions: [],
  isUpdatingLocally: false,

  _normalizeAmount: (input) => {
    const amount = Number(input);
    if (Number.isNaN(amount) || amount <= 0) return null;
    return Math.round(amount * 100) / 100;
  },

  addNotification: (notification) => {
    const id = Date.now();
    set({ notifications: [...get().notifications, { ...notification, id }] });
    setTimeout(() => {
      set({ notifications: get().notifications.filter(n => n.id !== id) });
    }, 5000);
  },

  loadTransactions: async () => {
    const { player } = usePlayerStore.getState();
    if (!player) return;
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      set({ transactions: data });
    }
  },

  _addTransaction: async (type, amount, description, playerID) => {
    const { player } = usePlayerStore.getState();
    const targetID = playerID || (player ? player.id : null);
    if (!targetID) return;
    await supabase.from('bank_transactions').insert([{
      player_id: targetID,
      type,
      amount,
      description,
    }]);
    if (!playerID) {
      await get().loadTransactions();
    }
  },

  startRealtimeSubscription: () => {
    const { player } = usePlayerStore.getState();
    if (!player || get().realtimeChannel) return;

    set({ _lastBalance: Number(player.bank_balance || 0) });

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
          if (get().isUpdatingLocally) return;
          
          const newBalance = Number(payload.new.bank_balance || 0);
          const lastBalance = get()._lastBalance;
          
          if (newBalance > lastBalance) {
            const receivedAmount = Number((newBalance - lastBalance).toFixed(2));
            get().addNotification({
              type: 'transfer_received',
              amount: receivedAmount,
              message: `Вам поступил перевод +${receivedAmount.toLocaleString()} ₽`,
            });
            set({ _lastBalance: newBalance });
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
        message: 'Недостаточно наличных.',
      });
      return false;
    }

    set({ isUpdatingLocally: true });
    const newBalance = Number((Number(player.bank_balance || 0) + amount).toFixed(2));
    const success = await updateProfile({
      money: Number(player.money || 0) - amount,
      bank_balance: newBalance
    });
    setTimeout(() => set({ isUpdatingLocally: false }), 1000);
    
    if (success) {
      set({ _lastBalance: newBalance });
      useQuestStore.getState().registerEvent('deposit', amount);
      await get()._addTransaction('cash_in', amount, 'Пополнение с наличных');
      await get().loadTransactions();
      get().addNotification({
        type: 'success',
        message: `Пополнение ${amount.toLocaleString()} ₽ выполнено`,
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
        message: 'На счёте недостаточно средств.',
      });
      return false;
    }

    set({ isUpdatingLocally: true });
    const newBalance = Number((Number(player.bank_balance || 0) - amount).toFixed(2));
    const success = await updateProfile({
      money: Number(player.money || 0) + amount,
      bank_balance: newBalance
    });
    setTimeout(() => set({ isUpdatingLocally: false }), 1000);
    
    if (success) {
      set({ _lastBalance: newBalance });
      useQuestStore.getState().registerEvent('withdraw', amount);
      await get()._addTransaction('cash_out', amount, 'Снятие в наличные');
      await get().loadTransactions();
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

      set({ isUpdatingLocally: true });
      const success = await updateProfile({ bank_balance: Number(senderBankBalance.toFixed(2)) });
      setTimeout(() => set({ isUpdatingLocally: false }), 1000);
      
      if (!success) throw new Error('Не удалось списать средства со счета отправителя.');

      set({ _lastBalance: Number(senderBankBalance.toFixed(2)) });
      useQuestStore.getState().registerEvent('transfer', amount);
      await get()._addTransaction('transfer_in', amount, `Входящий перевод с ${player.phone_number}`, recipient.id);
      await get()._addTransaction('transfer_out', amount, `Перевод на ${phoneNumber}`);
      await get().loadTransactions();
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

  moveToDeposit: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (Number(player.bank_balance || 0) < amount) {
      get().addNotification({
        type: 'error',
        message: 'На счёте недостаточно средств.',
      });
      return false;
    }

    set({ isUpdatingLocally: true });
    const success = await updateProfile({
      bank_balance: Number((Number(player.bank_balance || 0) - amount).toFixed(2)),
      deposit_balance: Number((Number(player.deposit_balance || 0) + amount).toFixed(2)),
    });
    setTimeout(() => set({ isUpdatingLocally: false }), 1000);

    if (success) {
      await get()._addTransaction('deposit_in', amount, 'Перевод на депозит');
      await get().loadTransactions();
      get().addNotification({
        type: 'success',
        message: `${amount.toLocaleString()} ₽ переведено на депозит`,
      });
    }
    return success;
  },

  withdrawFromDeposit: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (Number(player.deposit_balance || 0) < amount) {
      get().addNotification({
        type: 'error',
        message: 'На депозите недостаточно средств.',
      });
      return false;
    }

    set({ isUpdatingLocally: true });
    const success = await updateProfile({
      bank_balance: Number((Number(player.bank_balance || 0) + amount).toFixed(2)),
      deposit_balance: Number((Number(player.deposit_balance || 0) - amount).toFixed(2)),
    });
    setTimeout(() => set({ isUpdatingLocally: false }), 1000);

    if (success) {
      await get()._addTransaction('deposit_out', amount, 'Снятие с депозита');
      await get().loadTransactions();
      get().addNotification({
        type: 'success',
        message: `${amount.toLocaleString()} ₽ снято с депозита`,
      });
    }
    return success;
  },

  accrueInterest: async () => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const deposit = Number(player.deposit_balance || 0);
    if (deposit <= 0) return false;

    const interest = Math.round(deposit * BANK_INTEREST_RATE * 100) / 100;
    if (interest <= 0) return false;

    set({ isUpdatingLocally: true });
    const success = await updateProfile({
      deposit_balance: Number((deposit + interest).toFixed(2))
    });
    setTimeout(() => set({ isUpdatingLocally: false }), 1000);

    if (success) {
      await get()._addTransaction('interest', interest, 'Начисление % на депозит');
      await get().loadTransactions();
    }
    return success;
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
  },

  // Банкомат: пополнение счёта (наличные → счёт, без комиссии)
  atmDeposit: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (Number(player.money || 0) < amount) {
      get().addNotification({
        type: 'error',
        message: 'Недостаточно наличных.',
      });
      return false;
    }

    set({ isUpdatingLocally: true });
    const newBalance = Number((Number(player.bank_balance || 0) + amount).toFixed(2));
    const success = await updateProfile({
      money: Number(player.money || 0) - amount,
      bank_balance: newBalance
    });
    setTimeout(() => set({ isUpdatingLocally: false }), 1000);

    if (success) {
      set({ _lastBalance: newBalance });
      await get()._addTransaction('atm_deposit', amount, 'Пополнение через банкомат');
      await get().loadTransactions();
      get().addNotification({
        type: 'success',
        message: `Банкомат: ${amount.toLocaleString()} ₽ пополнено`,
      });
    }
    return success;
  },

  // Банкомат: снятие со счёта (счёт → наличные, комиссия 3% вычитается из получаемой суммы)
  atmWithdraw: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    const fee = Math.round(amount * 0.03 * 100) / 100;
    const received = Number((amount - fee).toFixed(2));

    if (Number(player.bank_balance || 0) < amount) {
      get().addNotification({
        type: 'error',
        message: 'На счёте недостаточно средств.',
      });
      return false;
    }

    set({ isUpdatingLocally: true });
    const newBalance = Number((Number(player.bank_balance || 0) - amount).toFixed(2));
    const success = await updateProfile({
      money: Number((Number(player.money || 0) + received).toFixed(2)),
      bank_balance: newBalance
    });
    setTimeout(() => set({ isUpdatingLocally: false }), 1000);

    if (success) {
      set({ _lastBalance: newBalance });
      await get()._addTransaction('atm_withdraw', received, `Снятие через банкомат (комиссия ${fee.toLocaleString()} ₽)`);
      await get().loadTransactions();
      get().addNotification({
        type: 'success',
        message: `Банкомат: ${received.toLocaleString()} ₽ получено (комиссия ${fee.toLocaleString()} ₽)`,
      });
    }
    return success;
  },

  // Получение информации о налоговой задолженности по домам игрока
  getHouseTaxInfo: async () => {
    const { player } = usePlayerStore.getState();
    if (!player) return [];

    const { data: houses, error } = await supabase
      .from('houses')
      .select('*')
      .eq('owner_id', player.id);

    if (error || !houses) return [];

    return houses.map(house => {
      const hConfig = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
      const taxAmount = Math.round(hConfig.price * 0.01);
      const taxPaidUntil = house.tax_paid_until ? new Date(house.tax_paid_until) : null;
      const isPaid = taxPaidUntil && taxPaidUntil > new Date();
      const daysLeft = isPaid ? Math.ceil((taxPaidUntil - new Date()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: house.id_name,
        name: house.name || house.id_name,
        class: hConfig.name,
        taxAmount,
        isPaid,
        daysLeft,
        taxPaidUntil: isPaid ? taxPaidUntil.toLocaleDateString('ru-RU') : null
      };
    });
  },

  // Оплата налога (с банковского счета)
  payTax: async (amountInput) => {
    const { player, updateProfile } = usePlayerStore.getState();
    const amount = get()._normalizeAmount(amountInput);
    if (!player || amount === null) return false;

    if (Number(player.bank_balance || 0) < amount) {
      get().addNotification({
        type: 'error',
        message: 'На счёте недостаточно средств для оплаты налога.',
      });
      return false;
    }

    set({ isUpdatingLocally: true });
    const newBalance = Number((Number(player.bank_balance || 0) - amount).toFixed(2));
    const success = await updateProfile({
      bank_balance: newBalance
    });
    setTimeout(() => set({ isUpdatingLocally: false }), 1000);
    
    if (success) {
      set({ _lastBalance: newBalance });
      await get()._addTransaction('tax_payment', amount, 'Оплата налога');
      await get().loadTransactions();
      get().addNotification({
        type: 'success',
        message: `Налог ${amount.toLocaleString()} ₽ успешно оплачен`,
      });
    }
    return success;
  },

  // Оплата налога на дом (с банковского счета)
  payHouseTax: async (houseId) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    // Найти дом игрока
    const { data: house, error: houseError } = await supabase
      .from('houses')
      .select('*')
      .eq('id_name', houseId)
      .eq('owner_id', player.id)
      .single();

    if (houseError || !house) {
      get().addNotification({
        type: 'error',
        message: 'Дом не найден или принадлежит другому игроку.',
      });
      return false;
    }

    const hConfig = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
    const taxAmount = Math.round(hConfig.price * 0.01); // 1% от стоимости дома

    if (Number(player.bank_balance || 0) < taxAmount) {
      get().addNotification({
        type: 'error',
        message: `На счёте недостаточно средств. Нужно ${taxAmount.toLocaleString()} ₽ за налог на дом.`,
      });
      return false;
    }

    set({ isUpdatingLocally: true });
    const newBalance = Number((Number(player.bank_balance || 0) - taxAmount).toFixed(2));

    // Обновить баланс игрока
    const success = await updateProfile({ bank_balance: newBalance });
    if (!success) {
      setTimeout(() => set({ isUpdatingLocally: false }), 1000);
      return false;
    }

    // Обновить дату оплаты налога в доме
    const { error: updateError } = await supabase
      .from('houses')
      .update({ tax_paid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }) // +30 дней
      .eq('id_name', houseId);

    setTimeout(() => set({ isUpdatingLocally: false }), 1000);

    if (updateError) {
      console.error('Failed to update house tax:', updateError);
    }

    set({ _lastBalance: newBalance });
    await get()._addTransaction('tax_payment', taxAmount, `Налог на дом: ${house.name || house.id_name}`);
    await get().loadTransactions();
    await useHouseStore.getState().fetchDbHouses();
    get().addNotification({
      type: 'success',
      message: `Налог на дом ${house.name || house.id_name} оплачен: ${taxAmount.toLocaleString()} ₽ (на 30 дней)`,
    });
    return true;
  }
}));
