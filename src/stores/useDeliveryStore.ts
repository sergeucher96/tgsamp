import { create } from 'zustand';
import { usePlayerStore, type Profile } from './usePlayerStore';
import { type Vehicle } from './useVehicleStore';
import { useTravelStore } from './useTravelStore';
import { FINAL_LOCATIONS } from '../game/locations/locations';
import { type Location } from './useTravelStore';

const getRandomHouse = (): Location | null => {
  const houses = FINAL_LOCATIONS.filter((loc) => loc.type === 'house');
  return houses.length > 0 ? houses[Math.floor(Math.random() * houses.length)] : null;
};

export interface DeliveryJob {
  targetHouse: Location;
  status: 'assigned' | 'toCustomer' | 'arrived' | 'delivered' | 'returning';
  baseEarnings: number;
  earnings: number;
  exp: number;
  tipAmount: number;
  previousVehicle: Vehicle | null;
  pickupId: string;
}

interface DeliveryStoreState {
  activeDeliveryJob: DeliveryJob | null;
  isProcessing: boolean;
  deliveryMessage: string | null;

  startPizzaDelivery: () => void;
  goToCustomer: () => Promise<void>;
  arriveAtCustomer: () => void;
  deliverPizza: () => void;
  returnToPizzeria: () => Promise<void>;
  completeDelivery: () => Promise<void>;
  cancelDelivery: () => void;
}

export const useDeliveryStore = create<DeliveryStoreState>((set, get) => ({
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
      color: 11, // yellow
    } as any);

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