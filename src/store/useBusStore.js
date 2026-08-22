import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { WAYPOINTS } from '../data/roads';
import { findShortestPath } from '../utils/pathfinder';
import { useTravelStore } from './useTravelStore';

/* Маршруты автобуса — каждый маршрут это последовательность road waypoint ID-шников.
   Точки подобраны из roads.js — они связаны между собой edges. */

const BASE_ROUTES = [
  {
    id: 'route_1',
    name: 'Центральный круг',
    stops: ['404', '405', '406', '254', '407', '408', '330', '409', '329', '410', '411', '383', '403', '404'],
    pay: [600, 900],
    exp: 10,
    description: 'Центр города через главные магистрали',
  },
  {
    id: 'route_2',
    name: 'Западный экспресс',
    stops: ['373', '374', '375', '376', '107', '377', '378', '379', '380', '381', '382', '308', '383', '396', '395', '309', '394', '393', '378', '377', '376', '375', '374', '373'],
    pay: [800, 1200],
    exp: 15,
    description: 'Западный район промышленных зон',
  },
  {
    id: 'route_3',
    name: 'Южный маршрут',
    stops: ['350', '351', '352', '353', '354', '355', '356', '288', '357', '358', '359', '360', '361', '291', '362', '363', '364', '365', '279', '196', '197', '198', '279', '281', '280', '279', '291', '361', '360', '359', '358', '357', '288', '356', '355', '354', '353', '352', '351', '350'],
    pay: [1000, 1500],
    exp: 20,
    description: 'Юг города — длинные расстояния, высокая оплата',
  },
  {
    id: 'route_4',
    name: 'Восточная петля',
    stops: ['466', '467', '468', '469', '470', '471', '472', '468', '467', '466'],
    pay: [500, 800],
    exp: 8,
    description: 'Короткий маршрут восточного района',
  },
];

function loadBusRoutes() {
  const custom = (() => {
    try { return JSON.parse(localStorage.getItem('roadEditorBusRoutes') || '[]'); }
    catch { return []; }
  })();
  return [...BASE_ROUTES, ...custom];
}

const BUS_ROUTES = loadBusRoutes();

const RENT_COST = 500;
const RENT_DURATION = 10 * 60 * 1000;  // 10 минут
const ROUTE_DURATION = 3 * 60 * 1000;  // 3 минуты на маршрут

export const useBusStore = create((set, get) => ({
  state: {
    isEmployed: false,
    isBusRented: false,
    rentEndTime: null,
    currentRoute: null,
    routeStartTime: null,
    routeRunning: false,
    earnedToday: 0,
    routesCompleted: 0,
    message: null,
    rentTimer: null,
    routeTimer: null,
  },

  isEmployed: false,
  isBusRented: false,
  rentEndTime: null,
  currentRoute: null,
  routeStartTime: null,
  routeRunning: false,
  awaitingRepeat: false,
  earnedToday: 0,
  routesCompleted: 0,
  message: null,
  rentTimer: null,
  routeTimer: null,

  checkCancelInterval: null,

  showRoutePopup: false,

  employ: () => {
    if (get().isEmployed) return true;
    set({ isEmployed: true, message: 'Добро пожаловать в Автобусный парк! Арендуйте автобус для начала работы.' });
    return true;
  },

  rentBus: () => {
    if (!get().isEmployed) {
      set({ message: 'Сначала устройтесь на работу в автобусный парк.' });
      return false;
    }
    if (get().isBusRented) {
      set({ message: 'Автобус уже арендован.' });
      return false;
    }
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player || (player.money || 0) < RENT_COST) {
      set({ message: `Недостаточно средств. Нужно ${RENT_COST}$.` });
      return false;
    }
    updateProfile({ money: Number(player.money) - RENT_COST });
    const endTime = Date.now() + RENT_DURATION;
    set({ isBusRented: true, rentEndTime: endTime, message: 'Автобус арендован на 10 минут. Выберите маршрут!' });
    const interval = setInterval(() => {
      if (Date.now() >= get().rentEndTime) get().returnBus();
    }, 1000);
    set({ rentTimer: interval });
    return true;
  },

  getRentTimeLeft: () => {
    if (!get().rentEndTime) return 0;
    return Math.max(0, get().rentEndTime - Date.now());
  },

  returnBus: () => {
    const { rentTimer, routeTimer, checkCancelInterval } = get();
    if (rentTimer) clearInterval(rentTimer);
    if (routeTimer) clearTimeout(routeTimer);
    if (checkCancelInterval) clearInterval(checkCancelInterval);
    set({
      isBusRented: false,
      rentEndTime: null,
      currentRoute: null,
      routeStartTime: null,
      routeRunning: false,
      awaitingRepeat: false,
      showRoutePopup: false,
      rentTimer: null,
      routeTimer: null,
      checkCancelInterval: null,
      message: 'Автобус возвращён. Аренда окончена.',
    });
    // Also clean up travel store
    useTravelStore.setState({
      isMoving: false,
      remainingPath: [],
      routePath: [],
      currentSegment: 0,
      routeTarget: null,
      animatedPosition: null,
      animatedRotation: 0,
    });
  },

  startRoute: async (routeId) => {
    if (!get().isBusRented) {
      set({ message: 'Сначала арендуйте автобус.' });
      return false;
    }
    if (get().routeRunning) {
      set({ message: 'Маршрут уже выполняется.' });
      return false;
    }
    if (get().getRentTimeLeft() <= 0) {
      get().returnBus();
      set({ message: 'Аренда истекла.' });
      return false;
    }
    const allRoutes = loadBusRoutes();
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return false;

    const { player } = usePlayerStore.getState();
    if ((player?.energy || 0) < 5) {
      set({ message: 'Недостаточно энергии (нужно 5%).' });
      return false;
    }

    const routeStartTime = Date.now();
    let cancelled = false;
    set({
      currentRoute: route,
      routeStartTime,
      routeRunning: true,
      awaitingRepeat: false,
      showRoutePopup: false,
      message: `Маршрут "${route.name}" начат. Автобус едет по маршруту...`,
    });

    // Initialize travel store so camera follows the bus immediately
    useTravelStore.setState({
      isMoving: true,
      animatedPosition: { x: player.pos_x, y: player.pos_y },
      animatedRotation: player.rotation || 0,
      remainingPath: [],
    });

    // Таймер окончания маршрута (3 мин)
    const timer = setTimeout(() => {
      if (!cancelled) get().completeRoute();
    }, ROUTE_DURATION);
    set({ routeTimer: timer });

    // Двигаться по маршруту через дороги — собрать все сегменты и анимировать одним pass
    const travelAlongRoute = async () => {
      try {
        if (cancelled) return;

        // Сначала телепортируем к первой остановке
        const firstStopId = route.stops[0];
        const firstWp = WAYPOINTS[firstStopId];
        if (firstWp) {
          useTravelStore.setState({
            animatedPosition: { x: firstWp.x, y: firstWp.y },
          });
          const { updateProfile } = usePlayerStore.getState();
          await updateProfile({ pos_x: firstWp.x, pos_y: firstWp.y, last_node_id: firstStopId });
        }
        if (cancelled || !get().routeRunning) return;

        // Собрать все сегменты маршрута в один непрерывный путь
        const allPoints = [];
        const allPathIds = [];

        for (let i = 0; i < route.stops.length - 1; i++) {
          if (cancelled) break;

          const fromStopId = route.stops[i];
          const toStopId = route.stops[i + 1];
          const fromWp = WAYPOINTS[fromStopId];
          const toWp = WAYPOINTS[toStopId];

          if (!fromWp || !toWp) continue;

          const path = findShortestPath(fromStopId, toStopId);

          if (path && path.length > 0) {
            const routeCoordinates = path.map(id => WAYPOINTS[id]).filter(Boolean);
            const segmentPoints = [fromWp, ...routeCoordinates];
            const segmentPathIds = [fromStopId, ...path];

            for (let j = 0; j < segmentPoints.length; j++) {
              const pt = segmentPoints[j];
              const pid = segmentPathIds[j];
              // Skip duplicates: skip if same coords as last added point
              if (allPoints.length > 0 &&
                  allPoints[allPoints.length - 1].x === pt.x &&
                  allPoints[allPoints.length - 1].y === pt.y) {
                continue;
              }
              allPoints.push(pt);
              allPathIds.push(pid);
            }
          } else {
            // Если путь не найден, добавляем прямую линию
            allPoints.push(toWp);
            allPathIds.push(toStopId);
          }
        }

        if (allPoints.length < 2) {
          if (!cancelled && get().routeRunning) get().completeRoute();
          return;
        }

        // Calculate segment lengths from merged points
        const allSegmentLengths = allPoints.slice(1).map((pt, idx) => {
          const prev = allPoints[idx];
          return Math.hypot(pt.x - prev.x, pt.y - prev.y);
        });

        const totalDistance = allSegmentLengths.reduce((sum, len) => sum + len, 0);
        const busSpeed = 250;

        // Обновить позицию только в конце всего маршрута
        await animateBusRoute(allPoints, allPathIds, allSegmentLengths, busSpeed, totalDistance);

        // Обновить финальную позицию
        if (!cancelled && get().routeRunning && allPoints.length > 0) {
          const lastPt = allPoints[allPoints.length - 1];
          const lastId = allPathIds[allPathIds.length - 1];
          const { updateProfile } = usePlayerStore.getState();
          await updateProfile({ pos_x: lastPt.x, pos_y: lastPt.y, last_node_id: lastId });
        }
      } catch (err) {
        console.error('[Bus] travelAlongRoute error:', err);
      }
      if (!cancelled && get().routeRunning) get().completeRoute();
    };

    // Если маршрут завершён или аренда истекла — отменяем езду
    const checkCancel = setInterval(() => {
      if (!get().routeRunning) {
        cancelled = true;
        clearInterval(checkCancel);
      }
    }, 500);
    set({ checkCancelInterval: checkCancel });

    travelAlongRoute();
    return true;
  },

  completeRoute: () => {
    const { routeTimer, routeRunning } = get();
    if (routeTimer) clearTimeout(routeTimer);

    // Clean up travel store animation
    useTravelStore.setState({
      isMoving: false,
      remainingPath: [],
      routePath: [],
      currentSegment: 0,
      routeTarget: null,
      animatedPosition: null,
      animatedRotation: 0,
    });

    if (routeRunning && !get().currentRoute) return;
    if (!get().routeRunning && get().currentRoute === null) return;

    const currentRoute = get().currentRoute || BUS_ROUTES[0];
    const pay = Math.floor(Math.random() * (currentRoute.pay[1] - currentRoute.pay[0] + 1)) + currentRoute.pay[0];
    const exp = currentRoute.exp;

    const { player, updateProfile, addSkillProgress } = usePlayerStore.getState();
    if (player) {
      // Keep player at current bus position (do not teleport back to bus depot)
      updateProfile({
        money: Number(player.money) + pay,
        energy: Math.max(0, (player.energy || 100) - 5),
        exp: (player.exp || 0) + exp,
      });
    }
    addSkillProgress('bus', 1);

    set({
      currentRoute: currentRoute,
      routeStartTime: null,
      routeRunning: false,
      awaitingRepeat: true,
      showRoutePopup: true,
      routeTimer: null,
      earnedToday: get().earnedToday + pay,
      routesCompleted: get().routesCompleted + 1,
      message: `Маршрут "${currentRoute.name}" завершён! +${pay}$, +${exp} XP. Едем ещё раз?`,
    });
  },

  repeatRoute: () => {
    const { currentRoute, isBusRented, getRentTimeLeft } = get();
    if (!currentRoute) {
      set({ message: 'Нет активного маршрута.' });
      return false;
    }
    if (!isBusRented || getRentTimeLeft() <= 0) {
      set({ message: 'Аренда автобуса истекла.' });
      return false;
    }
    const { player } = usePlayerStore.getState();
    if ((player?.energy || 0) < 2) {
      set({ message: 'Недостаточно энергии для повторного маршрута (нужно 2%).' });
      return false;
    }
    // Списать 2% энергии
    usePlayerStore.getState().updateProfile({
      energy: Math.max(0, (player.energy || 100) - 2),
    });
    set({ awaitingRepeat: false, showRoutePopup: false, message: `Маршрут "${currentRoute.name}" повторяется...` });
    // Запустить маршрут заново
    return get().startRoute(currentRoute.id);
  },

  stopRoute: () => {
    // Clear the route timeout if active
    const { routeTimer, checkCancelInterval } = get();
    if (routeTimer) clearTimeout(routeTimer);
    if (checkCancelInterval) clearInterval(checkCancelInterval);
    set({
      routeRunning: false,
      currentRoute: null,
      routeStartTime: null,
      awaitingRepeat: false,
      showRoutePopup: false,
      routeTimer: null,
      checkCancelInterval: null,
      message: 'Работа окончена.',
    });
    useTravelStore.setState({
      isMoving: false,
      remainingPath: [],
      routePath: [],
      currentSegment: 0,
      routeTarget: null,
      animatedPosition: null,
      animatedRotation: 0,
    });
  },

  resetSession: () => {
    set({ earnedToday: 0, routesCompleted: 0, message: 'Сессия сброшена.' });
  },

  getAvailableRoutes: () => {
    if (!get().isBusRented || get().getRentTimeLeft() <= 0) return [];
    return loadBusRoutes();
  },

  dismissRoutePopup: () => {
    set({ showRoutePopup: false });
  },
}));

// Анимация движения автобуса по маршруту (по дорогам)
async function animateBusRoute(points, path, segmentLengths, moveSpeed, totalDistance) {
  return new Promise(resolve => {
    const travelState = useTravelStore.getState();
    const startPos = travelState.animatedPosition || { x: points[0].x, y: points[0].y };
    const startRotation = travelState.animatedRotation || usePlayerStore.getState().player.rotation || 0;
    const endTime = performance.now();
    const totalTime = (totalDistance / moveSpeed) * 1000;
    const startTime = endTime;
    const checkInterval = 5000;
    let lastCheck = 0;

    // Precompute cumulative distances for O(log n) lookup
    const cumDistances = new Float64Array(segmentLengths.length + 1);
    for (let i = 0; i < segmentLengths.length; i++) {
      cumDistances[i + 1] = cumDistances[i] + segmentLengths[i];
    }

    let smoothRotation = startRotation;
    let lastSegment = -1;

    function normalizeAngle(angle) {
      while (angle > 180) angle -= 360;
      while (angle < -180) angle += 360;
      return angle;
    }

    function update(currentTime) {
      const busState = useBusStore.getState();
      if (!busState.routeRunning) {
        resolve();
        return;
      }

      const elapsed = currentTime - startTime;
      
      // Check rent expiry every few seconds instead of every frame
      if (elapsed - lastCheck > checkInterval) {
        lastCheck = elapsed;
        if (!busState.isBusRented || busState.getRentTimeLeft() <= 0) {
          resolve();
          return;
        }
      }

      const progress = Math.min(elapsed / totalTime, 1);
      const traveled = totalDistance * progress;

      // Binary search for segment index
      let lo = 0, hi = segmentLengths.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cumDistances[mid + 1] <= traveled) lo = mid + 1;
        else hi = mid;
      }

      const segLen = segmentLengths[lo];
      const frac = segLen > 0 ? Math.min((traveled - cumDistances[lo]) / segLen, 1) : 0;

      const pFrom = points[lo];
      const pTo = points[lo + 1] || pFrom;
      const interpolatedX = pFrom.x + (pTo.x - pFrom.x) * frac;
      const interpolatedY = pFrom.y + (pTo.y - pFrom.y) * frac;

      // Smooth rotation with lerp
      const targetAngle = (pTo.x !== pFrom.x || pTo.y !== pFrom.y)
        ? Math.atan2(pTo.y - pFrom.y, pTo.x - pFrom.x) * (180 / Math.PI) + 90
        : smoothRotation;
      const diff = normalizeAngle(targetAngle - smoothRotation);
      smoothRotation += diff * 0.15;

      // Always update state every frame for smooth animation
      useTravelStore.setState({
        isMoving: true,
        animatedPosition: { x: interpolatedX, y: interpolatedY },
        animatedRotation: smoothRotation,
      });

      // Update remainingPath when segment changes
      if (lo !== lastSegment) {
        lastSegment = lo;
        useTravelStore.setState({ remainingPath: path.slice(lo) });
      }

      if (progress < 1) requestAnimationFrame(update);
      else resolve();
    }

    requestAnimationFrame(update);
  });
}