import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { useTravelStore } from './useTravelStore';
import { FINAL_LOCATIONS } from '../data/locations';
import { JOBS_DATABASE } from '../data/jobsConfig';

const POI_TYPES = ['shop', 'bar', 'hotel', 'gym', 'clothes', 'nightclub', 'parking'];

const rand = ([min, max]) => min + Math.floor(Math.random() * (max - min + 1));

const pickFrom = (list, exclude = []) => {
  const pool = list.filter((loc) => !exclude.includes(loc.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
};

const locationsByPool = (pool, base) => {
  switch (pool) {
    case 'house':
      return FINAL_LOCATIONS.filter((l) => l.type === 'house');
    case 'poi':
      return FINAL_LOCATIONS.filter((l) => POI_TYPES.includes(l.type));
    case 'warehouse':
      return FINAL_LOCATIONS.filter((l) => l.type === 'warehouse' || l.id === 'port_ls');
    case 'far': {
      const far = FINAL_LOCATIONS.filter(
        (l) => l.type !== 'house' && l.id !== base?.id && Math.hypot(l.x - (base?.x || 0), l.y - (base?.y || 0)) > 700,
      );
      return far.length ? far : FINAL_LOCATIONS.filter((l) => l.type !== 'house');
    }
    default:
      return FINAL_LOCATIONS.filter((l) => l.type !== 'house');
  }
};

// Строит список остановок смены: [{ location, pay, exp, label }]
const buildStops = (job) => {
  const base = FINAL_LOCATIONS.find((l) => l.id === job.locationId);
  const stops = [];
  const used = [job.locationId];

  if (job.stops.type === 'fixed') {
    const available = job.stops.ids
      .map((id) => FINAL_LOCATIONS.find((l) => l.id === id))
      .filter(Boolean);
    for (let i = 0; i < job.stops.count; i += 1) {
      const location = pickFrom(available, used);
      if (!location) break;
      used.push(location.id);
      stops.push({ location, pay: rand(job.payPerStop), exp: rand(job.expPerStop), label: `Остановка ${i + 1}` });
    }
    return stops;
  }

  for (let i = 0; i < job.stops.count; i += 1) {
    job.stops.pools.forEach((pool, poolIndex) => {
      const location = pickFrom(locationsByPool(pool, base), used);
      if (!location) return;
      used.push(location.id);
      const isFinalLeg = poolIndex === job.stops.pools.length - 1;
      stops.push({
        location,
        pay: isFinalLeg ? rand(job.payPerStop) : 0,
        exp: isFinalLeg ? rand(job.expPerStop) : 0,
        label: labelForPool(job, pool, i + 1),
      });
    });
  }

  return stops;
};

const labelForPool = (job, pool, index) => {
  if (job.id === 'taxi_driver') return pool === 'house' ? `Подача к клиенту #${index}` : `Высадка пассажира #${index}`;
  if (job.id === 'trucker') return pool === 'warehouse' ? `Погрузка #${index}` : `Выгрузка #${index}`;
  return `Точка ${index}`;
};

export const useJobStore = create((set, get) => ({
  activeShift: null, // { jobId, kind, stops, currentStop, earned, exp, status, cargo }
  isProcessing: false,
  jobMessage: null,
  taskProgress: 0,
  lastTask: null,

  // ---------- ОБЩЕЕ ----------

  hasLicenseFor: (jobId) => {
    const job = JOBS_DATABASE[jobId];
    if (!job?.license) return true;
    const licenses = usePlayerStore.getState().licenses || [];
    return licenses.some((l) => l.license_type === job.license);
  },

  skillValue: (jobId) => {
    const job = JOBS_DATABASE[jobId];
    const skills = usePlayerStore.getState().skills || [];
    return skills.find((s) => s.skill_name === job?.skillId)?.value || 0;
  },

  startShift: (jobId) => {
    const job = JOBS_DATABASE[jobId];
    const { player } = usePlayerStore.getState();
    if (!job || !player || get().activeShift) return false;

    if ((player.energy || 0) < job.minEnergy) {
      set({ jobMessage: `Нужно минимум ${job.minEnergy}% энергии для смены.` });
      return false;
    }

    if (!get().hasLicenseFor(jobId)) {
      set({ jobMessage: 'Нет нужной лицензии для этой работы.' });
      return false;
    }

    const previousVehicle = usePlayerStore.getState().activeVehicle;
    if (job.vehicle) usePlayerStore.getState().setLocalActiveVehicle(job.vehicle);

    set({
      activeShift: {
        jobId,
        kind: job.kind,
        status: job.kind === 'route' ? 'assigned' : 'working',
        stops: job.kind === 'route' ? buildStops(job) : [],
        currentStop: 0,
        earned: 0,
        exp: 0,
        tips: 0,
        tasksDone: 0,
        cargo: job.cargo ? job.cargo[Math.floor(Math.random() * job.cargo.length)] : null,
        previousVehicle,
      },
      jobMessage: null,
      lastTask: null,
    });
    return true;
  },

  cancelShift: () => {
    const shift = get().activeShift;
    if (!shift) return;
    usePlayerStore.getState().setLocalActiveVehicle(shift.previousVehicle || null);
    set({ activeShift: null, isProcessing: false, jobMessage: 'Смена отменена, оплата не начислена.', taskProgress: 0 });
  },

  // ---------- РАБОТЫ С ПОЕЗДКАМИ (автобус / такси / дальнобой) ----------

  goToCurrentStop: async () => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'route' || get().isProcessing) return;
    const stop = shift.stops[shift.currentStop];
    if (!stop) return;

    set({ isProcessing: true, activeShift: { ...shift, status: 'driving' } });
    await useTravelStore.getState().startRoute(stop.location.id);
    set({ isProcessing: false });
    get().arriveAtStop();
  },

  arriveAtStop: () => {
    const shift = get().activeShift;
    if (!shift || shift.status !== 'driving') return;
    const stop = shift.stops[shift.currentStop];
    set({
      activeShift: { ...shift, status: 'arrived' },
      jobMessage: `Прибытие: ${stop.label}. Подтвердите выполнение.`,
    });
  },

  completeStop: () => {
    const shift = get().activeShift;
    if (!shift || shift.status !== 'arrived') return;
    const job = JOBS_DATABASE[shift.jobId];
    const stop = shift.stops[shift.currentStop];

    let tip = 0;
    if (job.tip && stop.pay > 0 && Math.random() < job.tip.chance) {
      tip = rand([job.tip.min, job.tip.max]);
    }

    const nextStop = shift.currentStop + 1;
    const isLast = nextStop >= shift.stops.length;

    set({
      activeShift: {
        ...shift,
        currentStop: isLast ? shift.currentStop : nextStop,
        earned: shift.earned + stop.pay + tip,
        exp: shift.exp + stop.exp,
        tips: shift.tips + tip,
        status: isLast ? 'toBase' : 'assigned',
      },
      jobMessage: isLast
        ? 'Все точки пройдены. Возвращайтесь на базу за расчётом.'
        : `${stop.label} выполнена.${tip ? ` Чаевые ${tip}$.` : ''}`,
    });
  },

  returnToBase: async () => {
    const shift = get().activeShift;
    if (!shift || shift.status !== 'toBase' || get().isProcessing) return;
    const job = JOBS_DATABASE[shift.jobId];

    set({ isProcessing: true, activeShift: { ...shift, status: 'returning' } });
    await useTravelStore.getState().startRoute(job.locationId);
    await get().finishShift();
    set({ isProcessing: false });
  },

  finishShift: async () => {
    const shift = get().activeShift;
    if (!shift) return;
    const job = JOBS_DATABASE[shift.jobId];
    const { player, updateProfile, setLocalActiveVehicle, addSkillProgress } = usePlayerStore.getState();

    const total = shift.earned + (job.bonusOnFinish || 0);

    await updateProfile({
      money: Number(player.money || 0) + total,
      exp: (player.exp || 0) + shift.exp,
      energy: Math.max(0, (player.energy || 100) - job.energyCost),
    });
    await addSkillProgress(job.skillId, 1);

    setLocalActiveVehicle(shift.previousVehicle || null);
    set({
      activeShift: null,
      jobMessage: `Смена закрыта. Начислено ${total.toLocaleString()}$ и ${shift.exp} XP.`,
    });
  },

  // ---------- РАБОТЫ НА МЕСТЕ (завод / СТО) ----------

  availableTasks: (jobId) => {
    const job = JOBS_DATABASE[jobId];
    const skill = get().skillValue(jobId);
    return (job?.tasks || []).filter((t) => skill >= t.minSkill);
  },

  runTask: async (taskId) => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'station' || get().isProcessing) return;

    const job = JOBS_DATABASE[shift.jobId];
    const task = job.tasks.find((t) => t.id === taskId);
    const { player } = usePlayerStore.getState();
    if (!task) return;

    if ((player.energy || 0) < job.energyCost) {
      set({ jobMessage: 'Не хватает энергии для наряда.' });
      return;
    }

    set({ isProcessing: true, taskProgress: 0, lastTask: null });
    await runProgress(job.taskTime, (value) => set({ taskProgress: value }));

    const skill = get().skillValue(shift.jobId);
    const pay = Math.round(rand(task.pay) * (1 + skill / 200)); // навык дает до +50% к оплате
    const exp = task.exp;

    const { updateProfile, addSkillProgress } = usePlayerStore.getState();
    const fresh = usePlayerStore.getState().player;
    await updateProfile({
      money: Number(fresh.money || 0) + pay,
      exp: (fresh.exp || 0) + exp,
      energy: Math.max(0, (fresh.energy || 100) - job.energyCost),
    });
    await addSkillProgress(job.skillId, 1);

    const current = get().activeShift;
    set({
      isProcessing: false,
      taskProgress: 0,
      lastTask: { name: task.name, pay, exp },
      jobMessage: `${task.name}: +${pay.toLocaleString()}$, +${exp} XP.`,
      activeShift: current
        ? { ...current, earned: current.earned + pay, exp: current.exp + exp, tasksDone: current.tasksDone + 1 }
        : current,
    });
  },

  endStationShift: () => {
    const shift = get().activeShift;
    if (!shift) return;
    set({
      activeShift: null,
      taskProgress: 0,
      jobMessage: `Смена окончена. Выполнено нарядов: ${shift.tasksDone}, заработано ${shift.earned.toLocaleString()}$.`,
    });
  },
}));

function runProgress(duration, onTick) {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(((now - start) / duration) * 100, 100);
      onTick(progress);
      if (progress < 100) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
