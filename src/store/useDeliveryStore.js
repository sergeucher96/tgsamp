import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { useTravelStore } from './useTravelStore';
import { FINAL_LOCATIONS } from '../data/locations';

const getRandomHouse = () => {
  const houses = FINAL_LOCATIONS.filter((loc) => loc.type === 'house');
  return houses[Math.floor(Math.random() * houses.length)];
};

export const useDeliveryStore = create((set, get) => ({
  activeDeliveryJob: null,
  isProcessing: false,
  deliveryMessage: null,

  startPizzaDelivery: () => {
    const player = usePlayerStore.getState().player;
    if (!player) return;

    const targetHouse = getRandomHouse();
    if (!targetHouse) return;

    const previousVehicle = player.activeVehicle;
    usePlayerStore.getState().setLocalActiveVehicle({
      model_id: 'scooter',
      color: 'yellow',
      name: 'Скутер доставки',
    });

    const earnings = 1200 + Math.floor(Math.random() * 800);
    const exp = 15 + Math.floor(Math.random() * 18);

    set({
      activeDeliveryJob: {
        targetHouse,
        status: 'assigned',
        baseEarnings: earnings,
        earnings,
        exp,
        tipAmount: 0,
        previousVehicle,
        pickupId: 'pizzeria_1',
      },
      deliveryMessage: null,
    });
  },

  goToCustomer: async () => {
    const job = get().activeDeliveryJob;
    if (!job || job.status !== 'assigned') return;

    set({ isProcessing: true, activeDeliveryJob: { ...job, status: 'toCustomer' } });
    await useTravelStore.getState().startRoute(job.targetHouse.id);
    set({ isProcessing: false });
    get().arriveAtCustomer();
  },

  arriveAtCustomer: () => {
    const job = get().activeDeliveryJob;
    if (!job || job.status !== 'toCustomer') return;

    set({
      activeDeliveryJob: {
        ...job,
        status: 'arrived',
      },
      deliveryMessage: 'Вы прибыли к дому. Нажмите «Доставить пиццу», чтобы завершить заказ.',
    });
  },

  deliverPizza: () => {
    const job = get().activeDeliveryJob;
    if (!job || job.status !== 'arrived') return;

    const tipChance = 0.35;
    const tipAmount = Math.random() < tipChance ? 50 + Math.floor(Math.random() * 201) : 0;
    const totalEarnings = job.earnings + tipAmount;

    set({
      activeDeliveryJob: {
        ...job,
        status: 'delivered',
        tipAmount,
        earnings: totalEarnings,
      },
      deliveryMessage: tipAmount
        ? `Пицца доставлена! Клиент оставил чаевые ${tipAmount}$.
Вернитесь в пиццерию за следующим заказом.`
        : 'Пицца доставлена! Чаевых не было. Вернитесь в пиццерию за следующим заказом.',
    });
  },

  returnToPizzeria: async () => {
    const job = get().activeDeliveryJob;
    if (!job || job.status !== 'delivered') return;

    set({ isProcessing: true, activeDeliveryJob: { ...job, status: 'returning' } });
    await useTravelStore.getState().startRoute(job.pickupId);
    await get().completeDelivery();
    set({ isProcessing: false });
  },

  completeDelivery: async () => {
    const job = get().activeDeliveryJob;
    if (!job) return;

    const { player, updateProfile, setLocalActiveVehicle } = usePlayerStore.getState();
    await updateProfile({
      money: Number(player.money || 0) + job.earnings,
      exp: (player.exp || 0) + job.exp,
      energy: Math.max(0, (player.energy || 100) - 10),
    });
    setLocalActiveVehicle(job.previousVehicle);
    set({ activeDeliveryJob: null, deliveryMessage: null });
  },

  cancelDelivery: () => {
    const job = get().activeDeliveryJob;
    if (!job) return;
    usePlayerStore.getState().setLocalActiveVehicle(job.previousVehicle);
    set({ activeDeliveryJob: null, isProcessing: false, deliveryMessage: null });
  },
}));