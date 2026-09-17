import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { useTravelStore } from './useTravelStore';
import { FINAL_LOCATIONS } from '../game/locations/locations';
import { JOBS_DATABASE, type JobTask, type PayRange, type RandomStops, type RouteJob, type StationJob, type GarbageJob } from '../features/jobs/data/jobsConfig';
import { WAYPOINTS } from '../game/locations/roads';

interface Location {
  id: string;
  x: number;
  y: number;
  name?: string;
  icon?: string;
  color?: string;
  type?: string;
  desc?: string;
  class?: string;
  entrance_id?: string;
  category?: string;
}

const POI_TYPES = ['shop', 'bar', 'hotel', 'gym', 'clothes', 'nightclub', 'parking'] as const;

type JobKind = 'route' | 'station' | 'garbage';

type ShiftStatusRoute = 'assigned' | 'working' | 'driving' | 'arrived' | 'toBase' | 'returning';
type ShiftStatusGarbage = 'selecting' | 'driving_to_bin' | 'at_bin' | 'driving_to_base' | 'at_base' | 'full' | 'collecting' | 'unloading';
type ShiftStatusStation = 'working';

type ShiftStatus = ShiftStatusRoute | ShiftStatusGarbage | ShiftStatusStation;

const rand = ([min, max]: PayRange) => min + Math.floor(Math.random() * (max - min + 1));

const pickFrom = (list: Location[], exclude: string[] = []) => {
  const pool = list.filter((loc) => !exclude.includes(loc.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
};

const locationsByPool = (pool: string, base: Location | undefined) => {
  switch (pool) {
    case 'house':
      return FINAL_LOCATIONS.filter((l) => l.type === 'house');
    case 'poi':
      return FINAL_LOCATIONS.filter((l) => POI_TYPES.includes(l.type as typeof POI_TYPES[number]));
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

interface ShiftStop {
  location: Location;
  pay: number;
  exp: number;
  label: string;
}

interface BaseShift {
  jobId: string;
  kind: JobKind;
  status: ShiftStatus;
  earned: number;
  exp: number;
  tips: number;
  tasksDone: number;
  cargo: string | null;
  previousVehicle: any;
}

interface RouteShift extends BaseShift {
  kind: 'route';
  status: ShiftStatusRoute;
  stops: ShiftStop[];
  currentStop: number;
}

interface GarbageShift extends BaseShift {
  kind: 'garbage';
  status: ShiftStatusGarbage;
  activeBins: string[];
  selectedBinId: string | null;
  capacity: number;
  lastBinAmount: number;
  collecting: boolean;
  collectProgress: number;
  unloading: boolean;
  unloadProgress: number;
}

interface StationShift extends BaseShift {
  kind: 'station';
  status: ShiftStatusStation;
}

type ActiveShift = RouteShift | GarbageShift | StationShift;

interface JobState {
  activeShift: ActiveShift | null;
  isProcessing: boolean;
  jobMessage: string | null;
  taskProgress: number;
  lastTask: { name: string; pay: number; exp: number } | null;
  showUnloadConfirm: boolean;

  // Общие методы
  hasLicenseFor: (jobId: string) => boolean;
  skillValue: (jobId: string) => number;
  startShift: (jobId: string) => boolean;
  cancelShift: () => void;
  requestUnload: () => void;
  freeDrive: (targetLocId: string) => Promise<void>;
  cancelUnload: () => void;
  goToDump: () => Promise<void>;
  confirmUnload: () => Promise<void>;
  skipBin: () => void;
  selectBin: (binId: string) => Promise<void>;
  goToBase: () => Promise<void>;
  arriveAtBase: () => void;

  // Работы с поездками (route)
  goToCurrentStop: () => Promise<void>;
  arriveAtStop: () => void;
  completeStop: () => void;
  returnToBase: () => Promise<void>;
  finishShift: () => Promise<void>;

  // Мусорщик
  arriveAtBin: () => void;
  collectGarbage: () => Promise<void>;
  performUnload: (skipDrive?: boolean) => Promise<void>;
  finishGarbageShift: () => Promise<void>;

  // Станционные работы
  availableTasks: (jobId: string) => JobTask[];
  runTask: (taskId: string) => Promise<void>;
  endStationShift: () => void;
}

export const useJobStore = create<JobState>((set, get) => ({
  activeShift: null, // { jobId, kind, stops, currentStop, earned, exp, status, cargo }
  isProcessing: false,
  jobMessage: null,
  taskProgress: 0,
  lastTask: null,
  showUnloadConfirm: false,

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
    if (job.vehicle) usePlayerStore.getState().setLocalActiveVehicle(job.vehicle as any);

    let activeShift: ActiveShift;
    if (job.kind === 'garbage') {
      const garbageJob = job as GarbageJob;
      const baseWp = FINAL_LOCATIONS.find((l) => l.id === garbageJob.locationId)?.entrance_id || '1';
      const activeBins = generateBins(baseWp, 5);
      activeShift = {
        jobId,
        kind: 'garbage',
        status: 'selecting',
        activeBins,
        selectedBinId: null,
        capacity: 0,
        earned: 0,
        exp: 0,
        tips: 0,
        tasksDone: 0,
        cargo: null,
        previousVehicle,
        lastBinAmount: 0,
        collecting: false,
        collectProgress: 0,
        unloading: false,
        unloadProgress: 0,
      };
    } else if (job.kind === 'route') {
      const routeJob = job as RouteJob;
      activeShift = {
        jobId,
        kind: 'route',
        status: 'assigned',
        stops: buildStops(routeJob),
        currentStop: 0,
        earned: 0,
        exp: 0,
        tips: 0,
        tasksDone: 0,
        cargo: routeJob.cargo ? routeJob.cargo[Math.floor(Math.random() * routeJob.cargo.length)] : null,
        previousVehicle,
      };
    } else {
      activeShift = {
        jobId,
        kind: 'station',
        status: 'working',
        earned: 0,
        exp: 0,
        tips: 0,
        tasksDone: 0,
        cargo: null,
        previousVehicle,
      };
    }

    set({
      activeShift,
      jobMessage: null,
      lastTask: null,
    });
    return true;
  },

  cancelShift: () => {
    const shift = get().activeShift;
    if (!shift) return;
    usePlayerStore.getState().setLocalActiveVehicle(shift.previousVehicle || null);
    set({ activeShift: null, isProcessing: false, jobMessage: 'Смена отменена, оплата не начислена.', taskProgress: 0, showUnloadConfirm: false });
  },

  requestUnload: () => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'garbage' || shift.capacity <= 0 || get().isProcessing) return;
    set({ showUnloadConfirm: true });
  },

  // Свободное движение — игнорирует работу и едет куда угодно
  freeDrive: async (_targetLocId) => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'garbage' || get().isProcessing) return;
    useTravelStore.getState().stopRoute();
    set({ activeShift: { ...shift, status: 'selecting' } });
  },

  cancelUnload: () => {
    set({ showUnloadConfirm: false });
  },

  // Уехать на свалку/базу в любой момент смены мусорщика.
  // Прерывает текущий маршрут и либо разгружает кузов, либо просто едет на базу.
  goToDump: async () => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'garbage' || get().isProcessing) return;
    useTravelStore.getState().stopRoute();
    if (shift.capacity > 0) {
      await get().performUnload();
    } else {
      await get().returnToBase();
    }
  },

  confirmUnload: async () => {
    set({ showUnloadConfirm: false });
    await get().performUnload();
  },

  skipBin: () => {
    const shift = get().activeShift;
    if (!shift || shift.status !== 'at_bin') return;
    set({
      activeShift: {
        ...shift,
        selectedBinId: null,
        status: 'selecting',
        collecting: false,
        collectProgress: 0,
      },
      jobMessage: 'Контейнер пропущен.',
    });
  },

  selectBin: async (binId) => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'garbage' || shift.status !== 'selecting' || get().isProcessing) return;
    const job = JOBS_DATABASE[shift.jobId] as GarbageJob;

    if (shift.capacity >= job.capacity) {
      set({ activeShift: { ...shift, status: 'full' }, jobMessage: 'Мусоровоз полон! Возвращайтесь на базу для выгрузки.' });
      return;
    }

    if (!shift.activeBins.includes(binId)) return;

    set({ isProcessing: true, activeShift: { ...shift, status: 'driving_to_bin', selectedBinId: binId } });
    await useTravelStore.getState().startRoute(binId);
    set({ isProcessing: false });
    get().arriveAtBin();
  },

  // Поездка на базу мусорщиков — как к обычному контейнеру.
  // По прибытии открывается кнопка «Разгрузить» (status 'at_base').
  goToBase: async () => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'garbage' || get().isProcessing) return;
    const job = JOBS_DATABASE[shift.jobId] as GarbageJob;

    const baseLocation = FINAL_LOCATIONS.find((l) => l.id === job.locationId);
    const playerPos = usePlayerStore.getState().player;
    const baseWp = baseLocation ? (WAYPOINTS[baseLocation.entrance_id] || { x: baseLocation.x, y: baseLocation.y }) : null;
    const distToBase = playerPos && baseWp && baseLocation
      ? Math.min(
          Math.hypot((playerPos.pos_x || 0) - baseWp.x, (playerPos.pos_y || 0) - baseWp.y),
          Math.hypot((playerPos.pos_x || 0) - baseLocation.x, (playerPos.pos_y || 0) - baseLocation.y),
        )
      : Infinity;

    // Уже на базе — не «едем на ту же точку», сразу открываем разгрузку
    if (distToBase < 150) {
      useTravelStore.getState().stopRoute();
      get().arriveAtBase();
      return;
    }

    useTravelStore.getState().stopRoute();
    set({ isProcessing: true, activeShift: { ...shift, status: 'driving_to_base' } });
    await useTravelStore.getState().startRoute(job.locationId);
    set({ isProcessing: false });
    get().arriveAtBase();
  },

  arriveAtBase: () => {
    const shift = get().activeShift;
    if (!shift || shift.status !== 'driving_to_base') return;
    if (shift.capacity > 0) {
      set({
        activeShift: { ...shift, status: 'at_base' },
        jobMessage: 'База мусорщиков. Разгрузите мусоровоз.',
      });
    } else {
      set({
        activeShift: { ...shift, status: 'selecting' },
        jobMessage: 'Кузов пуст — соберите мусор у контейнеров.',
      });
    }
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
    const job = JOBS_DATABASE[shift.jobId] as RouteJob;
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
    if (!shift || get().isProcessing) return;

    if (shift.kind === 'garbage') {
      if (shift.status === 'driving_to_base') return;
      const job = JOBS_DATABASE[shift.jobId] as GarbageJob;
      set({ isProcessing: true, activeShift: { ...shift, status: 'driving_to_base' } });
      await useTravelStore.getState().startRoute(job.locationId);
      set({ isProcessing: false });
      if (shift.capacity > 0) {
        await get().performUnload(true); // skipDrive=true since we already drove
      } else {
        get().finishGarbageShift();
      }
      return;
    }

    if (shift.status !== 'toBase' || get().isProcessing) return;
    const job = JOBS_DATABASE[shift.jobId] as RouteJob;

    set({ isProcessing: true, activeShift: { ...shift, status: 'returning' } });
    await useTravelStore.getState().startRoute(job.locationId);
    await get().finishShift();
    set({ isProcessing: false });
  },

  finishShift: async () => {
    const shift = get().activeShift;
    if (!shift) return;
    const job = JOBS_DATABASE[shift.jobId] as RouteJob;
    const { player, updateProfile, setLocalActiveVehicle, addSkillProgress } = usePlayerStore.getState();

    const total = shift.earned + (job.bonusOnFinish || 0);

    await updateProfile({
      money: Number(player.money || 0) + total,
      energy: Math.max(0, (player.energy || 100) - job.energyCost),
    });
    await addSkillProgress(job.skillId, 1);

    setLocalActiveVehicle(shift.previousVehicle || null);
    set({
      activeShift: null,
      jobMessage: `Смена закрыта. Начислено ${total.toLocaleString()}$ и ${shift.exp} XP.`,
    });
  },

  // ---------- МУСОРЩИК ----------

  arriveAtBin: () => {
    const shift = get().activeShift;
    if (!shift || shift.status !== 'driving_to_bin') return;
    const job = JOBS_DATABASE[shift.jobId] as GarbageJob;
    const binAmount = rand(job.garbagePerBin);
    const realAmount = Math.min(binAmount, job.capacity - shift.capacity);
    set({
      activeShift: { ...shift, status: 'at_bin', lastBinAmount: binAmount, collecting: false, collectProgress: 0 },
      jobMessage: `Контейнер найден. В нём ${binAmount} кг. Можно собрать ${realAmount} кг.`,
    });
  },

  collectGarbage: async () => {
    const shift = get().activeShift;
    if (!shift || shift.status !== 'at_bin' || get().isProcessing) return;
    const job = JOBS_DATABASE[shift.jobId] as GarbageJob;

    set({ isProcessing: true, activeShift: { ...shift, collecting: true, collectProgress: 0 } as GarbageShift });
    const currentShift = get().activeShift as GarbageShift;

    await runProgress(5000, (value) => {
      const fresh = get().activeShift;
      if (fresh) {
        set({ activeShift: { ...fresh, collecting: true, collectProgress: value } as GarbageShift });
      }
    });

    const binAmount = currentShift.lastBinAmount || rand(job.garbagePerBin);
    const realAmount = Math.min(binAmount, job.capacity - currentShift.capacity);
    const newCapacity = currentShift.capacity + realAmount;
    const isFull = newCapacity >= job.capacity;

    let message = `Собрано ${realAmount} кг. В кузове ${newCapacity}/${job.capacity}.`;
    if (isFull) message = `Кузов полон (${newCapacity}/${job.capacity})!`;

    const baseWp = FINAL_LOCATIONS.find((l) => l.id === job.locationId)?.entrance_id || '1';
    const usedIds = new Set<string>(currentShift.activeBins);
    const newBin = generateSingleBin(baseWp, usedIds);
    const nextActiveBins = newBin
      ? [...currentShift.activeBins.filter(id => id !== currentShift.selectedBinId), newBin]
      : currentShift.activeBins.filter(id => id !== currentShift.selectedBinId);

    set({
      activeShift: {
        ...currentShift,
        activeBins: nextActiveBins,
        selectedBinId: null,
        capacity: newCapacity,
        status: 'selecting',
        collecting: false,
        collectProgress: 0,
      } as GarbageShift,
      jobMessage: message,
      isProcessing: false,
    });
  },

  performUnload: async (skipDrive = false) => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'garbage' || shift.capacity <= 0 || get().isProcessing) return;
    const job = JOBS_DATABASE[shift.jobId] as GarbageJob;

    // Прерываем текущую поездку (например, к контейнеру), чтобы можно было
    // уехать на свалку прямо в пути.
    useTravelStore.getState().stopRoute();

    const baseLocation = FINAL_LOCATIONS.find((l) => l.id === job.locationId);
    if (!baseLocation) return;

    // Если игрок уже у базы (приехал сам, кликнув локацию), едем не нужно
    const playerPos = usePlayerStore.getState().player;
    const baseWp = WAYPOINTS[baseLocation.entrance_id] || { x: baseLocation.x, y: baseLocation.y };
    const distToBase = playerPos
      ? Math.min(
          Math.hypot((playerPos.pos_x || 0) - baseWp.x, (playerPos.pos_y || 0) - baseWp.y),
          Math.hypot((playerPos.pos_x || 0) - baseLocation.x, (playerPos.pos_y || 0) - baseLocation.y),
        )
      : Infinity;
    const alreadyAtBase = distToBase < 150;

    if (!skipDrive && !alreadyAtBase) {
      set({ isProcessing: true, activeShift: { ...shift, status: 'driving_to_base' } as GarbageShift });
      await useTravelStore.getState().startRoute(job.locationId);
      set({ isProcessing: false });
    }

    // Запоминаем объём ДО очистки и сразу закрываем попап,
    // показывая видимый таймер разгрузки.
    const unloadCapacity = shift.capacity;
    set({
      activeShift: {
        ...get().activeShift,
        status: 'selecting',
        unloading: true,
        unloadProgress: 0,
      } as GarbageShift,
      isProcessing: true,
    });

    const player = usePlayerStore.getState().player;
    if (player) {
      try {
        await usePlayerStore.getState().updateProfile({ pos_x: baseWp.x, pos_y: baseWp.y, last_node_id: baseLocation.entrance_id });
      } catch (e) {
        console.error('Garbage unload position DB error:', e);
      }
    }

    // Таймер разгрузки (10 сек) с видимым прогрессом
    const DURATION = 10000;
    const startTime = Date.now();
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        const p = Math.min(100, ((Date.now() - startTime) / DURATION) * 100);
        set({ activeShift: { ...get().activeShift, unloadProgress: p } as GarbageShift });
        if (p >= 100) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });

    const currentShift = get().activeShift;
    const pay = unloadCapacity * job.payPerUnit;
    const exp = Math.floor(unloadCapacity / 50);
    const { updateProfile, addSkillProgress } = usePlayerStore.getState();
    const fresh = usePlayerStore.getState().player;

    try {
      await updateProfile({
        money: Number(fresh.money || 0) + pay,
        energy: Math.max(0, (fresh.energy || 100) - job.energyCost),
      });
      await addSkillProgress(job.skillId, 1);
    } catch (e) {
      // Ошибки БД не должны оставлять попап открытым
      console.error('Garbage unload DB error:', e);
    }

    // Всегда закрываем таймер и сбрасываем состояние, даже при ошибке БД
    set({
      activeShift: {
        ...currentShift,
        capacity: 0,
        status: 'selecting',
        unloading: false,
        unloadProgress: 0,
      } as GarbageShift,
      jobMessage: `Разгружено. Заработано ${pay.toLocaleString()}$, +${exp} XP.`,
      isProcessing: false,
    });
  },

  finishGarbageShift: async () => {
    const shift = get().activeShift as GarbageShift | null;
    if (!shift) return;
    const job = JOBS_DATABASE[shift.jobId] as GarbageJob;
    const { player, updateProfile, setLocalActiveVehicle, addSkillProgress } = usePlayerStore.getState();

    const pay = shift.capacity * job.payPerUnit;
    const exp = Math.floor(shift.capacity / 50);

    if (shift.capacity > 0) {
      await updateProfile({
        money: Number(player.money || 0) + pay,
        energy: Math.max(0, (player.energy || 100) - job.energyCost),
      });
      await addSkillProgress(job.skillId, 1);
    }

    setLocalActiveVehicle(shift.previousVehicle || null);
    set({
      activeShift: null,
      jobMessage: shift.capacity > 0
        ? `Смена закрыта. Выгружено ${shift.capacity} кг, заработано ${pay.toLocaleString()}$, +${exp} XP.`
        : 'Смена закрыта.',
      isProcessing: false,
    });
  },

  // ---------- РАБОТЫ НА МЕСТЕ (завод / СТО) ----------

  availableTasks: (jobId) => {
    const job = JOBS_DATABASE[jobId] as StationJob;
    const skill = get().skillValue(jobId);
    return (job?.tasks || []).filter((t) => skill >= t.minSkill);
  },

  runTask: async (taskId) => {
    const shift = get().activeShift;
    if (!shift || shift.kind !== 'station' || get().isProcessing) return;

    const job = JOBS_DATABASE[shift.jobId] as StationJob;
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

function runProgress(duration: number, onTick: (value: number) => void) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(((now - start) / duration) * 100, 100);
      onTick(progress);
      if (progress < 100) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function buildStops(job: RouteJob): ShiftStop[] {
  const base = FINAL_LOCATIONS.find((l) => l.id === job.locationId);
  const stops: ShiftStop[] = [];
  const used = [job.locationId];

  if (job.stops.type === 'fixed') {
    const found = job.stops.ids
      .map((id) => FINAL_LOCATIONS.find((l) => l.id === id))
      .filter((l) => l !== undefined);
    const available = found as Location[];
    for (let i = 0; i < job.stops.count; i += 1) {
      const location = pickFrom(available, used);
      if (!location) break;
      used.push(location.id);
      stops.push({ location, pay: rand(job.payPerStop), exp: rand(job.expPerStop), label: `Остановка ${i + 1}` });
    }
    return stops;
  }

  for (let i = 0; i < (job.stops as RandomStops).count; i += 1) {
    (job.stops as RandomStops).pools.forEach((pool, poolIndex) => {
      const location = pickFrom(locationsByPool(pool, base), used);
      if (!location) return;
      used.push(location.id);
      const isFinalLeg = poolIndex === (job.stops as RandomStops).pools.length - 1;
      stops.push({
        location,
        pay: isFinalLeg ? rand(job.payPerStop) : 0,
        exp: isFinalLeg ? rand(job.expPerStop) : 0,
        label: labelForPool(job, pool, i + 1),
      });
    });
  }

  return stops;
}

function labelForPool(job: RouteJob, pool: string, index: number): string {
  if (job.id === 'taxi_driver') return pool === 'house' ? `Подача к клиенту #${index}` : `Высадка пассажира #${index}`;
  if (job.id === 'trucker') return pool === 'warehouse' ? `Погрузка #${index}` : `Выгрузка #${index}`;
  return `Точка ${index}`;
}

function generateSingleBin(baseWaypointId: string, excludeIds: Set<string> = new Set()): string | null {
  const allIds = Object.keys(WAYPOINTS);
  const base = WAYPOINTS[baseWaypointId];
  let safety = 0;
  while (safety < allIds.length * 3) {
    safety++;
    const id = allIds[Math.floor(Math.random() * allIds.length)];
    if (excludeIds.has(id)) continue;
    const wp = WAYPOINTS[id];
    if (base && Math.hypot(wp.x - base.x, wp.y - base.y) < 300) continue;
    excludeIds.add(id);
    return id;
  }
  return null;
}

function generateBins(baseWaypointId: string, count: number): string[] {
  const used = new Set<string>();
  const bins: string[] = [];
  for (let i = 0; i < count; i++) {
    const bin = generateSingleBin(baseWaypointId, used);
    if (bin) bins.push(bin);
  }
  return bins;
}
