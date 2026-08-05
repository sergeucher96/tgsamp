import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { WAYPOINTS } from '../data/roads';
import { FINAL_LOCATIONS } from '../data/locations';
import { findShortestPath } from '../utils/pathfinder';
import { VEHICLE_DATABASE } from '../data/vehicleConfig';

export const useTravelStore = create((set, get) => ({
  isMoving: false,
  remainingPath: [],
  routeTarget: null,
  animatedPosition: null,
  animatedRotation: 0,
  routePath: [],
  currentSegment: 0,

  startRoute: async (targetLocId) => {
    const { player, activeVehicle } = usePlayerStore.getState();
    const location = FINAL_LOCATIONS.find(l => l.id === targetLocId);
    if (!player || get().isMoving || !location) return;

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

    const path = findShortestPath(startNodeId, location.entrance_id);
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
      remainingPath: path,
      routePath: path,
      routeTarget: { x: location.x, y: location.y },
      currentSegment: 0,
      animatedPosition: { x: player.pos_x, y: player.pos_y },
      animatedRotation: player.rotation || 0,
    });

    await animateRoute(fullRoute, path, segmentLengths, moveSpeed, totalDistance);

    await usePlayerStore.getState().updateProfile({ pos_x: location.x, pos_y: location.y, last_node_id: location.entrance_id });
    set({ isMoving: false, remainingPath: [], routePath: [], currentSegment: 0, routeTarget: null, animatedPosition: null, animatedRotation: 0 });
  }
}));

async function animateRoute(points, path, segmentLengths, moveSpeed, totalDistance) {
  return new Promise(resolve => {
    const travelState = useTravelStore.getState();
    const startPos = travelState.animatedPosition || { x: points[0].x, y: points[0].y };
    const startRotation = travelState.animatedRotation || usePlayerStore.getState().player.rotation || 0;
    const totalTime = (totalDistance / moveSpeed) * 1000;
    const startTime = performance.now();

    function getSegmentIndex(distance) {
      let cumulative = 0;
      for (let i = 0; i < segmentLengths.length; i++) {
        cumulative += segmentLengths[i];
        if (distance <= cumulative) return i;
      }
      return segmentLengths.length - 1;
    }

    let activeSegment = 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / totalTime, 1);
      const traveled = totalDistance * progress;
      const segmentIndex = getSegmentIndex(traveled);
      const segmentStart = points[segmentIndex];
      const segmentEnd = points[segmentIndex + 1];
      const segmentCumulative = segmentLengths.slice(0, segmentIndex).reduce((sum, len) => sum + len, 0);
      const segmentTravel = traveled - segmentCumulative;
      const segmentFraction = segmentLengths[segmentIndex] > 0 ? segmentTravel / segmentLengths[segmentIndex] : 1;

      const nextX = segmentStart.x + (segmentEnd.x - segmentStart.x) * segmentFraction;
      const nextY = segmentStart.y + (segmentEnd.y - segmentStart.y) * segmentFraction;
      const angle = Math.atan2(segmentEnd.y - segmentStart.y, segmentEnd.x - segmentStart.x) * (180 / Math.PI) + 90;
      const diff = ((angle - startRotation + 180) % 360) - 180;
      const finalRotation = startRotation + (diff < -180 ? diff + 360 : diff);
      const nextRotation = startRotation + (finalRotation - startRotation) * progress;

      if (segmentIndex !== activeSegment) {
        activeSegment = segmentIndex;
        useTravelStore.setState({ remainingPath: path.slice(activeSegment) });
      }

      useTravelStore.setState({ animatedPosition: { x: nextX, y: nextY }, animatedRotation: nextRotation });
      if (progress < 1) requestAnimationFrame(update);
      else resolve();
    }

    requestAnimationFrame(update);
  });
}
