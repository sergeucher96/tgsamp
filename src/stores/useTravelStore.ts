import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { useVehicleStore, Vehicle } from './useVehicleStore';
import { WAYPOINTS } from '../game/locations/roads';
import { getMergedLocations, refreshFinalLocations } from '../game/locations/locations';
import { findShortestPath, type NodeId } from '../game/world/pathfinder';
import { VEHICLE_DATABASE } from '../features/vehicles/data/vehicleConfig';
import { applyWear, getPerformanceMultiplier } from '../features/vehicles/utils/vehicleWear';

export interface Location {
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

interface Waypoint {
  x: number;
  y: number;
}

interface RouteTarget {
  x: number;
  y: number;
}

interface TravelState {
  isMoving: boolean;
  remainingPath: string[];
  routeTarget: RouteTarget | null;
  animatedPosition: { x: number; y: number } | null;
  animatedRotation: number;
  routePath: string[];
  currentSegment: number;
  routeToken: number;

  startRoute: (targetLocId: string) => Promise<void>;
  stopRoute: () => void;
}

const waypoints = WAYPOINTS as Record<string, Waypoint>;

export const useTravelStore = create<TravelState>((set, get) => ({
  isMoving: false,
  remainingPath: [],
  routeTarget: null,
  animatedPosition: null,
  animatedRotation: 0,
  routePath: [],
  currentSegment: 0,
  routeToken: 0,

  startRoute: async (targetLocId: string) => {
    refreshFinalLocations();
    const { player, activeVehicle } = usePlayerStore.getState();
    const locations = getMergedLocations() as Location[];
    let location = locations.find(l => l.id === targetLocId);

    if (!location && waypoints[targetLocId]) {
      const wp = waypoints[targetLocId];
      location = { id: targetLocId, x: wp.x, y: wp.y, entrance_id: targetLocId };
    }

    if (!player || get().isMoving || !location) return;

    const token = get().routeToken + 1;
    set({ routeToken: token, isMoving: true });

    const speedCfg = activeVehicle ? VEHICLE_DATABASE[activeVehicle.model_id] : { speed: 150 };
    const moveSpeed = speedCfg?.speed || 150;

    let startNodeId = player.last_node_id;
    if (!startNodeId) {
      let minD = Infinity;
      Object.entries(waypoints).forEach(([id, pt]) => {
        const d = Math.hypot(player.pos_x - pt.x, player.pos_y - pt.y);
        if (d < minD) { minD = d; startNodeId = id; }
      });
    }

    let endNodeId = location.entrance_id;
    if (!endNodeId || !waypoints[endNodeId]) {
      let minD = Infinity;
      Object.entries(waypoints).forEach(([id, pt]) => {
        const d = Math.hypot(location.x - pt.x, location.y - pt.y);
        if (d < minD) { minD = d; endNodeId = id; }
      });
    }

    const path = findShortestPath(startNodeId as NodeId, endNodeId as NodeId);
    if (path.length === 0) return;

    const routeCoordinates = path.map(id => waypoints[id]).filter(Boolean);
    const fullRoute = [{ x: player.pos_x, y: player.pos_y }, ...routeCoordinates, { x: location.x, y: location.y }];
    const segmentLengths = fullRoute.slice(1).map((to, index) => {
      const from = fullRoute[index];
      return Math.hypot(to.x - from.x, to.y - from.y);
    });
    const totalDistance = segmentLengths.reduce((sum, len) => sum + len, 0);

    set({
      isMoving: true,
      routeToken: token,
      remainingPath: path,
      routePath: path,
      routeTarget: { x: location.x, y: location.y },
      currentSegment: 0,
      animatedPosition: { x: player.pos_x, y: player.pos_y },
      animatedRotation: player.rotation || 0,
    });

    // Apply wear system
    let effectiveSpeed = moveSpeed;
    let vehicleId: string | null = null;
    if (activeVehicle) {
      vehicleId = activeVehicle.id;
      const vehicleUpdates = applyWear(activeVehicle as Vehicle, totalDistance);
      const condition = vehicleUpdates.condition || 100;
      const perf = getPerformanceMultiplier(condition);
      effectiveSpeed = Math.round(moveSpeed * perf.speed);

      // Apply speed penalty based on condition
      if (condition < 30) {
        effectiveSpeed = moveSpeed * 0.5;
      } else if (condition < 50) {
        effectiveSpeed = moveSpeed * 0.8;
      }

      // Also update health backwards-compat (health = condition)
      const newHealth = Math.max(0, condition);

      useVehicleStore.getState().updateVehicleHealth(vehicleId, newHealth);
      // Save wear data to DB
      const { supabase } = await import('../services/supabase/client');
      const { error } = await supabase
        .from('vehicles')
        .update(vehicleUpdates)
        .eq('id', vehicleId);

      if (!error) {
        const vehicles = useVehicleStore.getState().myVehicles.map(v =>
          v.id === vehicleId ? { ...v, ...vehicleUpdates } : v
        );
        useVehicleStore.setState({ myVehicles: vehicles });
        const updatedActiveVehicle = { ...activeVehicle, ...vehicleUpdates, health: newHealth };
        usePlayerStore.getState().setLocalActiveVehicle(updatedActiveVehicle);
      }
    }

    await animateRoute(fullRoute, path, segmentLengths, effectiveSpeed, totalDistance, token);

    if (get().routeToken !== token) return;

    await usePlayerStore.getState().updateProfile({ pos_x: location.x, pos_y: location.y, last_node_id: location.entrance_id });
    set({ isMoving: false, remainingPath: [], routePath: [], currentSegment: 0, routeTarget: null, animatedPosition: null, animatedRotation: 0, routeToken: get().routeToken });
  },

  stopRoute: () => {
    set({ isMoving: false, remainingPath: [], routePath: [], currentSegment: 0, routeTarget: null, animatedPosition: null, animatedRotation: 0, routeToken: get().routeToken + 1 });
  }
}));

async function animateRoute(
  points: { x: number; y: number }[],
  path: string[],
  segmentLengths: number[],
  moveSpeed: number,
  totalDistance: number,
  routeToken: number
) {
  return new Promise<void>(resolve => {
    const travelState = useTravelStore.getState();
    const startRotation = travelState.animatedRotation || usePlayerStore.getState().player.rotation || 0;
    const totalTime = (totalDistance / moveSpeed) * 1000;
    const startTime = performance.now();

    // Precompute cumulative distances for O(log n) segment lookup
    const cumulativeLengths = [0];
    for (let i = 0; i < segmentLengths.length; i++) {
      cumulativeLengths.push(cumulativeLengths[i] + segmentLengths[i]);
    }

    // Binary search for segment index
    function getSegmentIndexAndFraction(distance: number): { index: number; fraction: number } {
      let lo = 0;
      let hi = segmentLengths.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cumulativeLengths[mid + 1] < distance) lo = mid + 1;
        else hi = mid;
      }
      const segStart = cumulativeLengths[lo];
      const fraction = segmentLengths[lo] > 0 ? Math.min((distance - segStart) / segmentLengths[lo], 1) : 1;
      return { index: lo, fraction };
    }

    function update(currentTime: number) {
      if (useTravelStore.getState().routeToken !== routeToken) {
        resolve();
        return;
      }
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / totalTime, 1);
      const traveled = totalDistance * progress;
      const { index: segmentIndex, fraction: segmentFraction } = getSegmentIndexAndFraction(traveled);
      const segmentStart = points[segmentIndex];
      const segmentEnd = points[segmentIndex + 1] || segmentStart;

      const nextX = segmentStart.x + (segmentEnd.x - segmentStart.x) * segmentFraction;
      const nextY = segmentStart.y + (segmentEnd.y - segmentStart.y) * segmentFraction;
      const angle = Math.atan2(segmentEnd.y - segmentStart.y, segmentEnd.x - segmentStart.x) * (180 / Math.PI) + 90;
      const diff = ((angle - startRotation + 180) % 360) - 180;
      const finalRotation = startRotation + (diff < -180 ? diff + 360 : diff);
      const nextRotation = startRotation + (finalRotation - startRotation) * progress;

      useTravelStore.setState({ animatedPosition: { x: nextX, y: nextY }, animatedRotation: nextRotation });
      if (progress < 1) requestAnimationFrame(update);
      else resolve();
    }

    requestAnimationFrame(update);
  });
}