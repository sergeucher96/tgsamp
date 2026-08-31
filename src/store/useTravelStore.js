import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { useVehicleStore } from './useVehicleStore';
import { WAYPOINTS } from '../data/roads';
import { FINAL_LOCATIONS } from '../data/locations';
import { findShortestPath } from '../utils/pathfinder';
import { VEHICLE_DATABASE, HEALTH_WEAR_RATE } from '../data/vehicleConfig';

export const useTravelStore = create((set, get) => ({
  isMoving: false,
  remainingPath: [],
  routeTarget: null,
  animatedPosition: null,
  animatedRotation: 0,
  routePath: [],
  currentSegment: 0,
  routeToken: 0,

  startRoute: async (targetLocId) => {
    const { player, activeVehicle } = usePlayerStore.getState();
    let location = FINAL_LOCATIONS.find(l => l.id === targetLocId);

    if (!location && WAYPOINTS[targetLocId]) {
      const wp = WAYPOINTS[targetLocId];
      location = { id: targetLocId, x: wp.x, y: wp.y, entrance_id: targetLocId };
    }

    if (!player || get().isMoving || !location) return;

    const token = get().routeToken + 1;
    set({ routeToken: token, isMoving: true });

    const speedCfg = activeVehicle ? VEHICLE_DATABASE[activeVehicle.model_id] : VEHICLE_DATABASE['pedestrian'];
    const moveSpeed = speedCfg?.speed || 150;

    let startNodeId = player.last_node_id;
    if (!startNodeId) {
        let minD = Infinity;
        Object.entries(WAYPOINTS).forEach(([id, pt]) => {
            const d = Math.hypot(player.pos_x - pt.x, player.pos_y - pt.y);
            if (d < minD) { minD = d; startNodeId = id; }
        });
    }

    let endNodeId = location.entrance_id;
    if (!endNodeId || !WAYPOINTS[endNodeId]) {
      let minD = Infinity;
      Object.entries(WAYPOINTS).forEach(([id, pt]) => {
        const d = Math.hypot(location.x - pt.x, location.y - pt.y);
        if (d < minD) { minD = d; endNodeId = id; }
      });
    }

    const path = findShortestPath(startNodeId, endNodeId);
    if (path.length === 0) return;

    const routeCoordinates = path.map(id => WAYPOINTS[id]).filter(Boolean);
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

    // Calculate health loss if driving a vehicle
    // Health degrades proportionally to distance traveled
    let effectiveSpeed = moveSpeed;
    let vehicleId = null;
    if (activeVehicle) {
      vehicleId = activeVehicle.id;
      const currentHealth = activeVehicle.health || 100;

      // Apply health penalty to speed (before health degradation)
      if (currentHealth < 30) {
        effectiveSpeed = moveSpeed * 0.5;  // Below 30%: 50% slower
      } else if (currentHealth < 50) {
        effectiveSpeed = moveSpeed * 0.8;  // Below 50%: 20% slower
      }

      // Calculate average health for the trip (assuming linear degradation)
      // 1% health per 500 distance units
      const healthLoss = Math.min(currentHealth, totalDistance / 500);
      const newHealth = Math.max(0, currentHealth - healthLoss);

      // If health drops significantly during travel, use average speed penalty
      if (newHealth < 30 && currentHealth >= 50) {
        effectiveSpeed = moveSpeed * 0.7;  // Average penalty during transition
      } else if (newHealth < 30 && currentHealth < 50) {
        effectiveSpeed = moveSpeed * 0.65; // Mostly slow
      }

      useVehicleStore.getState().updateVehicleHealth(vehicleId, newHealth);
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

async function animateRoute(points, path, segmentLengths, moveSpeed, totalDistance, routeToken) {
  return new Promise(resolve => {
    const travelState = useTravelStore.getState();
    const startPos = travelState.animatedPosition || { x: points[0].x, y: points[0].y };
    const startRotation = travelState.animatedRotation || usePlayerStore.getState().player.rotation || 0;
    const totalTime = (totalDistance / moveSpeed) * 1000;
    const startTime = performance.now();

    // Precompute cumulative distances for O(log n) segment lookup
    const cumulativeLengths = [0];
    for (let i = 0; i < segmentLengths.length; i++) {
      cumulativeLengths.push(cumulativeLengths[i] + segmentLengths[i]);
    }

    // Binary search for segment index
    function getSegmentIndexAndFraction(distance) {
      let lo = 0, hi = segmentLengths.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cumulativeLengths[mid + 1] < distance) lo = mid + 1;
        else hi = mid;
      }
      const segStart = cumulativeLengths[lo];
      const fraction = segmentLengths[lo] > 0 ? Math.min((distance - segStart) / segmentLengths[lo], 1) : 1;
      return { index: lo, fraction };
    }

    function update(currentTime) {
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
