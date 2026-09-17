import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { PATROL_ROUTES, PatrolRoute } from '../game/locations/patrolRoutes';
import { WAYPOINTS } from '../game/locations/roads';
import { findShortestPath } from '../game/world/pathfinder';
import { useTravelStore } from './useTravelStore';
import { usePlayerStore } from './usePlayerStore';

function loadPatrolRoutes(): PatrolRoute[] {
  const custom = (() => {
    try { return JSON.parse(localStorage.getItem('roadEditorPatrolRoutes') || '[]'); }
    catch { return []; }
  })();
  return [...PATROL_ROUTES, ...custom];
}

export interface LspdMember {
  player_id: string;
  rank: string;
  reputation: number;
  in_uniform: boolean;
  joined_at: string;
}

export interface LspdCamera {
  id: string;
  location_id: string;
  location_name: string;
  player_id: string;
  installed_at: string;
  expires_at: string;
}

interface LspdState {
  isMember: boolean;
  rank: string | null;
  reputation: number;
  isInUniform: boolean;
  onPatrol: boolean;
  patrolType: 'vehicle' | 'foot' | null;
  patrolArea: string | null;
  patrolRoute: PatrolRoute | null;
  patrolRoutes: PatrolRoute[];
  patrolRouteRunning: boolean;
  awaitingRepeat: boolean;
  patrolRouteTimer: ReturnType<typeof setTimeout> | null;
  patrolCheckCancelInterval: ReturnType<typeof setInterval> | null;
  lastVehicleQuery: number;
  lastPersonQuery: number;
  queryCooldown: number;
  loading: boolean;
  cameras: LspdCamera[];

  loadLspdStatus: (playerId: string) => Promise<void>;
  joinLspd: (playerId: string) => Promise<boolean>;
  putOnUniform: (playerId: string) => Promise<boolean>;
  takeOffUniform: (playerId: string) => Promise<boolean>;
  startPatrol: (type?: 'vehicle' | 'foot', area?: string | null, route?: PatrolRoute | null) => void;
  startPatrolRoute: (routeId: string) => Promise<boolean>;
  completePatrolRoute: () => void;
  repeatPatrolRoute: () => Promise<boolean>;
  stopPatrolRoute: () => void;
  endPatrol: () => void;
  getPatrolRoutes: () => PatrolRoute[];
  canQueryVehicle: () => boolean;
  canQueryPerson: () => boolean;
  getVehicleQueryCooldown: () => number;
  getPersonQueryCooldown: () => number;
  useVehicleQuery: () => void;
  usePersonQuery: () => void;
  updateReputation: (playerId: string, delta: number) => Promise<void>;
  loadCameras: () => Promise<void>;
  deleteExpiredCameras: () => Promise<void>;
  installCamera: (locationId: string, locationName: string, playerId: string) => Promise<boolean>;
  removeCamera: (cameraId: string) => Promise<boolean>;
}

export const useLspdStore = create<LspdState>((set, get) => ({
  isMember: false,
  rank: null,
  reputation: 0,
  isInUniform: false,
  onPatrol: false,
  patrolType: null,
  patrolArea: null,
  patrolRoute: null,
  patrolRoutes: loadPatrolRoutes(),
  patrolRouteRunning: false,
  awaitingRepeat: false,
  patrolRouteTimer: null,
  patrolCheckCancelInterval: null,
  lastVehicleQuery: 0,
  lastPersonQuery: 0,
  queryCooldown: 60000,
  loading: false,
  cameras: [],

  loadLspdStatus: async (playerId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('lspd_members')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) {
        console.error('LSPD load error (table may not exist):', error.message, error.code);
      }

      if (data && !error) {
        set({
          isMember: true,
          rank: data.rank || 'Patrolman',
          reputation: data.reputation || 0,
          isInUniform: data.in_uniform || false,
        });
        get().loadCameras();
      } else {
        set({ isMember: false, rank: null, reputation: 0, isInUniform: false });
      }
    } catch (err) {
      console.error('Failed to load LSPD status:', err);
      set({ isMember: false, rank: null, reputation: 0, isInUniform: false });
    }
    set({ loading: false });
  },

  joinLspd: async (playerId: string) => {
    try {
      const { data: existing } = await supabase
        .from('lspd_members')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (existing) {
        set({
          isMember: true,
          rank: existing.rank || 'Patrolman',
          reputation: existing.reputation || 0,
          isInUniform: existing.in_uniform || false,
        });
        get().loadCameras();
        return true;
      }

      const { data, error } = await supabase
        .from('lspd_members')
        .insert([{
          player_id: playerId,
          rank: 'Patrolman',
          in_uniform: false,
          reputation: 0,
          joined_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('LSPD join error:', error.message, error.details, error.hint, error.code);
        return false;
      }

      if (data) {
        set({
          isMember: true,
          rank: 'Patrolman',
          reputation: 0,
          isInUniform: false,
        });
        get().loadCameras();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to join LSPD:', (err as Error).message);
      alert(`Ошибка: ${(err as Error).message}`);
      return false;
    }
  },

  putOnUniform: async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('lspd_members')
        .update({ in_uniform: true })
        .eq('player_id', playerId);

      if (error) {
        console.error('Failed to update uniform:', error);
        return false;
      }
      set({ isInUniform: true });
      return true;
    } catch (err) {
      console.error('putOnUniform error:', err);
      return false;
    }
  },

  takeOffUniform: async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('lspd_members')
        .update({ in_uniform: false })
        .eq('player_id', playerId);

      if (error) {
        console.error('Failed to update uniform:', error);
        return false;
      }
      get().stopPatrolRoute();
      set({ isInUniform: false });
      return true;
    } catch (err) {
      console.error('takeOffUniform error:', err);
      return false;
    }
  },

  startPatrol: (type: 'vehicle' | 'foot' = 'vehicle', area: string | null = null, route: PatrolRoute | null = null) => {
    if (!get().isInUniform) return;
    set({ onPatrol: true, patrolType: type, patrolArea: area, patrolRoute: route });
  },

  startPatrolRoute: async (routeId: string) => {
    const { isInUniform } = get();
    if (!isInUniform) return false;
    if (get().patrolRouteRunning) return false;

    const allRoutes = loadPatrolRoutes();
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return false;

    const { player } = usePlayerStore.getState();
    if (!player) return false;

    let cancelled = false;

    set({
      onPatrol: true,
      patrolType: 'vehicle',
      patrolRoute: route,
      patrolRouteRunning: true,
      awaitingRepeat: false,
    });

    useTravelStore.setState({
      isMoving: true,
      animatedPosition: { x: player.pos_x, y: player.pos_y },
      animatedRotation: player.rotation || 0,
      remainingPath: [],
    });

    const timer = setTimeout(() => {
      if (!cancelled) get().completePatrolRoute();
    }, 5 * 60 * 1000);
    set({ patrolRouteTimer: timer });

    const travelAlongPatrol = async () => {
      try {
        if (cancelled) return;

        const firstStopId = route.stops[0];
        const firstWp = WAYPOINTS[firstStopId];
        if (firstWp) {
          useTravelStore.setState({
            animatedPosition: { x: firstWp.x, y: firstWp.y },
          });
          const { updateProfile } = usePlayerStore.getState();
          await updateProfile({ pos_x: firstWp.x, pos_y: firstWp.y, last_node_id: firstStopId });
        }
        if (cancelled || !get().patrolRouteRunning) return;

        const allPoints: { x: number; y: number }[] = [];
        const allPathIds: string[] = [];

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
              if (allPoints.length > 0 &&
                  allPoints[allPoints.length - 1].x === pt.x &&
                  allPoints[allPoints.length - 1].y === pt.y) {
                continue;
              }
              allPoints.push(pt);
              allPathIds.push(pid);
            }
          } else {
            allPoints.push(toWp);
            allPathIds.push(toStopId);
          }
        }

        if (allPoints.length < 2) {
          if (!cancelled && get().patrolRouteRunning) get().completePatrolRoute();
          return;
        }

        const allSegmentLengths = allPoints.slice(1).map((pt, idx) => {
          const prev = allPoints[idx];
          return Math.hypot(pt.x - prev.x, pt.y - prev.y);
        });

        const totalDistance = allSegmentLengths.reduce((sum, len) => sum + len, 0);
        const patrolSpeed = 250;

        await animatePatrolRoute(allPoints, allPathIds, allSegmentLengths, patrolSpeed, totalDistance);

        if (!cancelled && get().patrolRouteRunning && allPoints.length > 0) {
          const lastPt = allPoints[allPoints.length - 1];
          const lastId = allPathIds[allPathIds.length - 1];
          const { updateProfile } = usePlayerStore.getState();
          await updateProfile({ pos_x: lastPt.x, pos_y: lastPt.y, last_node_id: lastId });
        }
      } catch (err) {
        console.error('[LSPD] travelAlongPatrol error:', err);
      }
      if (!cancelled && get().patrolRouteRunning) get().completePatrolRoute();
    };

    const checkCancel = setInterval(() => {
      if (!get().patrolRouteRunning) {
        cancelled = true;
        clearInterval(checkCancel);
      }
    }, 500);
    set({ patrolCheckCancelInterval: checkCancel });

    travelAlongPatrol();
    return true;
  },

  completePatrolRoute: () => {
    const { patrolRouteTimer } = get();
    if (patrolRouteTimer) clearTimeout(patrolRouteTimer);

    useTravelStore.setState({
      isMoving: false,
      remainingPath: [],
      routePath: [],
      currentSegment: 0,
      routeTarget: null,
      animatedPosition: null,
      animatedRotation: 0,
    });

    const currentRoute = get().patrolRoute;
    const repGain = 10;

    const { player } = usePlayerStore.getState();

    set({
      patrolRouteRunning: false,
      awaitingRepeat: true,
      patrolRouteTimer: null,
      patrolRoute: currentRoute,
    });

    if (player?.id) {
      get().updateReputation(player.id, repGain);
    }
  },

  repeatPatrolRoute: async () => {
    const { patrolRoute } = get();
    if (!patrolRoute) return false;
    return get().startPatrolRoute(patrolRoute.id);
  },

  stopPatrolRoute: () => {
    const { patrolRouteTimer, patrolCheckCancelInterval } = get();
    if (patrolRouteTimer) clearTimeout(patrolRouteTimer);
    if (patrolCheckCancelInterval) clearInterval(patrolCheckCancelInterval);

    useTravelStore.setState({
      isMoving: false,
      remainingPath: [],
      routePath: [],
      currentSegment: 0,
      routeTarget: null,
      animatedPosition: null,
      animatedRotation: 0,
    });

    set({
      patrolRouteRunning: false,
      onPatrol: false,
      patrolType: null,
      patrolRoute: null,
      awaitingRepeat: false,
      patrolRouteTimer: null,
      patrolCheckCancelInterval: null,
    });
  },

  endPatrol: () => {
    set({ onPatrol: false, patrolType: null, patrolArea: null, patrolRoute: null });
  },

  getPatrolRoutes: () => loadPatrolRoutes(),

  canQueryVehicle: () => {
    return (Date.now() - get().lastVehicleQuery) >= get().queryCooldown;
  },

  canQueryPerson: () => {
    return (Date.now() - get().lastPersonQuery) >= get().queryCooldown;
  },

  getVehicleQueryCooldown: () => {
    const elapsed = Date.now() - get().lastVehicleQuery;
    const remaining = get().queryCooldown - elapsed;
    return Math.max(0, Math.ceil(remaining / 1000));
  },

  getPersonQueryCooldown: () => {
    const elapsed = Date.now() - get().lastPersonQuery;
    const remaining = get().queryCooldown - elapsed;
    return Math.max(0, Math.ceil(remaining / 1000));
  },

  useVehicleQuery: () => set({ lastVehicleQuery: Date.now() }),
  usePersonQuery: () => set({ lastPersonQuery: Date.now() }),

  updateReputation: async (playerId: string, delta: number) => {
    const { reputation, isMember } = get();
    if (!isMember || !playerId) return;
    const newRep = Math.max(0, reputation + delta);
    set({ reputation: newRep });
    try {
      await supabase
        .from('lspd_members')
        .update({ reputation: newRep })
        .eq('player_id', playerId);
    } catch (err) {
      console.error('Failed to update reputation:', err);
    }
  },

  loadCameras: async () => {
    try {
      await get().deleteExpiredCameras();

      const { data, error } = await supabase
        .from('lspd_cameras')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('installed_at', { ascending: false });

      if (!error && data) {
        set({ cameras: data });
      }
    } catch (err) {
      console.error('Failed to load cameras:', err);
    }
  },

  deleteExpiredCameras: async () => {
    try {
      await supabase
        .from('lspd_cameras')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (err) {
      console.error('Failed to delete expired cameras:', err);
    }
  },

  installCamera: async (locationId: string, locationName: string, playerId: string) => {
    const { isMember, isInUniform } = get();
    if (!isMember || !playerId || !isInUniform) return false;

    try {
      const now = new Date().toISOString();
      const { data: existing } = await supabase
        .from('lspd_cameras')
        .select('*')
        .eq('location_id', locationId)
        .gt('expires_at', now)
        .maybeSingle();

      if (existing) {
        const expiry = new Date(existing.expires_at);
        const minutesLeft = Math.ceil((expiry.getTime() - Date.now()) / 60000);
        alert(`Камера уже установлена на этой локации. Осталось: ${minutesLeft} мин`);
        return false;
      }

      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('lspd_cameras')
        .insert([{
          location_id: locationId,
          location_name: locationName,
          player_id: playerId,
          installed_at: now,
          expires_at: expiresAt
        }])
        .select()
        .single();

      if (!error && data) {
        set(state => ({ cameras: [data, ...state.cameras] }));
        get().updateReputation(playerId, 10);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to install camera:', err);
      return false;
    }
  },

  removeCamera: async (cameraId: string) => {
    const { isMember } = get();
    if (!isMember) return false;

    try {
      const { error } = await supabase
        .from('lspd_cameras')
        .delete()
        .eq('id', cameraId);

      if (!error) {
        set(state => ({
          cameras: state.cameras.filter(c => c.id !== cameraId)
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to remove camera:', err);
      return false;
    }
  },
}));

async function animatePatrolRoute(
  points: { x: number; y: number }[],
  path: string[],
  segmentLengths: number[],
  moveSpeed: number,
  totalDistance: number
) {
  return new Promise<void>(resolve => {
    const travelState = useTravelStore.getState();
    const startRotation = travelState.animatedRotation || usePlayerStore.getState().player.rotation || 0;
    const totalTime = (totalDistance / moveSpeed) * 1000;
    const startTime = performance.now();

    const cumDistances = new Float64Array(segmentLengths.length + 1);
    for (let i = 0; i < segmentLengths.length; i++) {
      cumDistances[i + 1] = cumDistances[i] + segmentLengths[i];
    }

    let smoothRotation = startRotation;
    let lastSegment = -1;

    function normalizeAngle(angle: number): number {
      while (angle > 180) angle -= 360;
      while (angle < -180) angle += 360;
      return angle;
    }

    function update(currentTime: number) {
      const lspdState = useLspdStore.getState();
      if (!lspdState.patrolRouteRunning) {
        resolve();
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / totalTime, 1);
      const traveled = totalDistance * progress;

      let lo = 0;
      let hi = segmentLengths.length - 1;
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

      const targetAngle = (pTo.x !== pFrom.x || pTo.y !== pFrom.y)
        ? Math.atan2(pTo.y - pFrom.y, pTo.x - pFrom.x) * (180 / Math.PI) + 90
        : smoothRotation;
      const diff = normalizeAngle(targetAngle - smoothRotation);
      smoothRotation += diff * 0.15;

      useTravelStore.setState({
        isMoving: true,
        animatedPosition: { x: interpolatedX, y: interpolatedY },
        animatedRotation: smoothRotation,
      });

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