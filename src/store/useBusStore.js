import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { WAYPOINTS } from '../data/roads';
import { findShortestPath } from '../utils/pathfinder';
import { useTravelStore } from './useTravelStore';
import { supabase } from '../api/supabase';

const BASE_ROUTES = [
  { id: 'route_1', name: 'Центральный круг', stops: ['404','405','406','254','407','408','330','409','329','410','411','383','403','404'], pay: 750, exp: 10, description: 'Центр города через главные магистрали', busStops: {} },
  { id: 'route_2', name: 'Западный экспресс', stops: ['373','374','375','376','107','377','378','379','380','381','382','308','383','396','395','309','394','393','378','377','376','375','374','373'], pay: 1000, exp: 15, description: 'Западный район промышленных зон', busStops: {} },
  { id: 'route_3', name: 'Южный маршрут', stops: ['350','351','352','353','354','355','356','288','357','358','359','360','361','291','362','363','364','365','279','196','197','198','279','281','280','279','291','361','360','359','358','357','288','356','355','354','353','352','351','350'], pay: 1250, exp: 20, description: 'Юг города — длинные расстояния, высокая оплата', busStops: {} },
  { id: 'route_4', name: 'Восточная петля', stops: ['466','467','468','469','470','471','472','468','467','466'], pay: 650, exp: 8, description: 'Короткий маршрут восточного района', busStops: {} },
];

const BUS_DEPOT = { x: 5252, y: 4982 };
const BONUS_PER_ROUTE = 50;
const STOP_DURATION = 10000;

async function loadBusRoutes() {
  let customSupabase = [];
  try {
    const { data } = await supabase.from('bus_routes').select('*').order('created_at', { ascending: true });
    if (data) customSupabase = data.map(r => {
      const busStops = r.bus_stops || {};
      return { id: r.id, name: r.name, stops: typeof r.stops === 'string' ? JSON.parse(r.stops) : r.stops, pay: r.pay, exp: r.exp || 10, description: r.description || '', busStops: typeof busStops === 'object' && !Array.isArray(busStops) ? busStops : {} };
    });
  } catch (e) { console.warn('[Bus] Failed to load routes:', e); }
  return [...BASE_ROUTES, ...customSupabase];
}

export const useBusStore = create((set, get) => ({
  currentRoute: null, routeRunning: false, awaitingRepeat: false, sessionActive: false,
  sessionEarned: 0, sessionRoutesCompleted: 0, currentStopName: '', nextStopName: '',
  message: null, routeTimer: null, checkCancelInterval: null, showRoutePopup: false,
  currentStopIndex: 0, totalStops: 0,

  getAvailableRoutes: async () => await loadBusRoutes(),

  startSession: async (routeId) => {
    if (get().sessionActive) { set({ message: 'Смена уже активна.' }); return false; }
    const { player } = usePlayerStore.getState();
    if (!player) return false;
    const route = (await loadBusRoutes()).find(r => r.id === routeId);
    if (!route) return false;
    set({ sessionActive: true, sessionEarned: 0, sessionRoutesCompleted: 0, currentRoute: route, message: `Смена начата! Маршрут "${route.name}".` });
    return get().startRoute(routeId);
  },

  endSession: () => {
    const { routeTimer, checkCancelInterval } = get();
    if (routeTimer) clearTimeout(routeTimer);
    if (checkCancelInterval) clearInterval(checkCancelInterval);
    usePlayerStore.getState().updateProfile({ pos_x: BUS_DEPOT.x, pos_y: BUS_DEPOT.y });
    useTravelStore.setState({ isMoving: false, remainingPath: [], routePath: [], currentSegment: 0, routeTarget: null, animatedPosition: null, animatedRotation: 0 });
    set({ sessionActive: false, sessionEarned: 0, sessionRoutesCompleted: 0, currentRoute: null, routeRunning: false, awaitingRepeat: false, showRoutePopup: false, routeTimer: null, checkCancelInterval: null, currentStopIndex: 0, totalStops: 0, currentStopName: '', nextStopName: '', message: `Смена завершена! Заработано: ${get().sessionEarned}$, маршрутов: ${get().sessionRoutesCompleted}.` });
  },

  startRoute: async (routeId) => {
    if (!get().sessionActive) { set({ message: 'Сначала начните смену.' }); return false; }
    if (get().routeRunning) { set({ message: 'Маршрут уже выполняется.' }); return false; }
    const route = (await loadBusRoutes()).find(r => r.id === routeId);
    if (!route) return false;
    const { player } = usePlayerStore.getState();
    const isRepeat = get().sessionRoutesCompleted > 0;
    if ((player?.energy || 0) < (isRepeat ? 2 : 5)) { set({ message: 'Недостаточно энергии.' }); return false; }
    let cancelled = false;
    const getStopName = (r, idx) => { const wpId = r.stops[idx]; return (r.busStops && r.busStops[wpId]) || `Точка ${idx + 1}`; };
    set({ currentRoute: route, routeRunning: true, awaitingRepeat: false, showRoutePopup: false, currentStopIndex: 0, totalStops: route.stops.length, currentStopName: '🚌 Автовокзал', nextStopName: getStopName(route, 0), message: `Маршрут "${route.name}" начат.` });
    useTravelStore.setState({ isMoving: true, animatedPosition: { x: player.pos_x, y: player.pos_y }, animatedRotation: player.rotation || 0, remainingPath: [] });
    if (!isRepeat) usePlayerStore.getState().updateProfile({ energy: Math.max(0, (player.energy || 100) - 5) });

    const travel = async () => {
      try {
        if (cancelled) return;
        const firstWp = WAYPOINTS[route.stops[0]];
        if (firstWp) {
          const dist = Math.hypot(firstWp.x - BUS_DEPOT.x, firstWp.y - BUS_DEPOT.y);
          await animRoute([BUS_DEPOT, firstWp], [null, route.stops[0]], [0, dist], 250, dist);
          if (cancelled) return;
          useTravelStore.setState({ animatedPosition: { x: firstWp.x, y: firstWp.y } });
          usePlayerStore.getState().updateProfile({ pos_x: firstWp.x, pos_y: firstWp.y, last_node_id: route.stops[0] });
        }
        for (let i = 0; i < route.stops.length - 1; i++) {
          if (cancelled) break;
          const from = WAYPOINTS[route.stops[i]], to = WAYPOINTS[route.stops[i + 1]];
          if (!from || !to) continue;
          set({ currentStopIndex: i + 1, currentStopName: getStopName(route, i), nextStopName: getStopName(route, i + 1) });
          const path = findShortestPath(route.stops[i], route.stops[i + 1]);
          let pts, lens, ids;
          if (path && path.length > 0) {
            pts = [from, ...path.map(id => WAYPOINTS[id]).filter(Boolean), to];
            lens = []; for (let j = 1; j < pts.length; j++) lens.push(Math.hypot(pts[j].x - pts[j-1].x, pts[j].y - pts[j-1].y));
            ids = [route.stops[i], ...path, route.stops[i + 1]];
          } else {
            pts = [from, to]; lens = [0, Math.hypot(to.x - from.x, to.y - from.y)]; ids = [route.stops[i], route.stops[i + 1]];
          }
          await animRoute(pts, ids, lens, 250, lens.reduce((a,b) => a+b, 0));
          if (cancelled || !get().routeRunning) return;
          usePlayerStore.getState().updateProfile({ pos_x: to.x, pos_y: to.y, last_node_id: route.stops[i + 1] });
          if (route.stops[i + 1] in (route.busStops || {})) { await new Promise(r => setTimeout(r, STOP_DURATION)); if (cancelled) return; }
        }
      } catch (err) { console.error('[Bus] travel error:', err); }
      if (!cancelled && get().routeRunning) get().completeRoute();
    };
    const checkCancel = setInterval(() => { if (!get().routeRunning) { cancelled = true; clearInterval(checkCancel); } }, 500);
    set({ checkCancelInterval: checkCancel });
    travel();
    return true;
  },

  completeRoute: () => {
    const { routeTimer } = get(); if (routeTimer) clearTimeout(routeTimer);
    useTravelStore.setState({ isMoving: false, remainingPath: [], routePath: [], currentSegment: 0, routeTarget: null, animatedPosition: null, animatedRotation: 0 });
    const route = get().currentRoute; if (!route) return;
    const pay = route.pay || 500; const total = pay + BONUS_PER_ROUTE;
    const ps = usePlayerStore.getState();
    ps.updateProfile({ money: Number(ps.player.money) + total, exp: (ps.player.exp || 0) + (route.exp || 10) });
    if (ps.addSkillProgress) ps.addSkillProgress('bus', 1);
    set({ routeRunning: false, awaitingRepeat: true, showRoutePopup: true, routeTimer: null, currentStopIndex: 0, totalStops: 0, currentStopName: '', nextStopName: '', sessionEarned: get().sessionEarned + total, sessionRoutesCompleted: get().sessionRoutesCompleted + 1, message: `Маршрут "${route.name}" завершён! +${pay}$ + ${BONUS_PER_ROUTE}$ бонус.` });
  },

  repeatRoute: () => {
    const { currentRoute, sessionActive } = get();
    if (!currentRoute || !sessionActive) return false;
    const ps = usePlayerStore.getState();
    if ((ps.player?.energy || 0) < 2) { set({ message: 'Недостаточно энергии (нужно 2%).' }); return false; }
    ps.updateProfile({ energy: Math.max(0, (ps.player.energy || 100) - 2) });
    set({ awaitingRepeat: false, showRoutePopup: false, message: `Маршрут "${currentRoute.name}" повторяется...` });
    return get().startRoute(currentRoute.id);
  },

  dismissRoutePopup: () => set({ showRoutePopup: false }),
}));

async function animRoute(pts, ids, lens, speed, totalDist) {
  return new Promise(resolve => {
    const tr = useTravelStore.getState();
    const rot0 = tr.animatedRotation || usePlayerStore.getState().player.rotation || 0;
    const t0 = performance.now(); const tt = (totalDist / speed) * 1000;
    const cum = new Float64Array(lens.length + 1);
    for (let i = 0; i < lens.length; i++) cum[i+1] = cum[i] + lens[i];
    let sr = rot0, ls = -1;
    function norm(a) { while(a>180)a-=360; while(a<-180)a+=360; return a; }
    function up(t) {
      if (!useBusStore.getState().routeRunning) { resolve(); return; }
      const p = Math.min((t-t0)/tt, 1), trav = totalDist * p;
      let lo=0, hi=lens.length-1; while(lo<hi){const m=(lo+hi)>>1;if(cum[m+1]<=trav)lo=m+1;else hi=m;}
      const f = lens[lo]>0 ? Math.min((trav-cum[lo])/lens[lo],1) : 0;
      const A=pts[lo], B=pts[lo+1]||A;
      sr += norm((B.x!==A.x||B.y!==A.y ? Math.atan2(B.y-A.y,B.x-A.x)*(180/Math.PI)+90 : sr) - sr) * 0.15;
      useTravelStore.setState({ isMoving: true, animatedPosition: { x:A.x+(B.x-A.x)*f, y:A.y+(B.y-A.y)*f }, animatedRotation: sr });
      if (lo!==ls){ls=lo; useTravelStore.setState({ remainingPath: ids.slice(lo) });}
      if (p<1) requestAnimationFrame(up); else resolve();
    }
    requestAnimationFrame(up);
  });
}