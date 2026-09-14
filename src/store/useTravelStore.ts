import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { useVehicleStore } from './useVehicleStore';
import { WAYPOINTS } from '../data/roads';
import { getMergedLocations, refreshFinalLocations } from '../data/locations';
import { findShortestPath } from '../utils/pathfinder';
import {
  VEHICLE_DATABASE,
  type VehicleModelId,
} from '../data/vehicleConfig';
import {
  applyWear,
  getPerformanceMultiplier,
  type VehicleWearData,
} from '../utils/vehicleWear';

interface Point {
  x: number;
  y: number;
}

interface Location {
  id: string;
  x: number;
  y: number;
  entrance_id?: string;
}

type Waypoint = Point;

type WaypointsMap = Record<string, Waypoint>;

interface PlayerTravelData {
  pos_x: number;
  pos_y: number;
  rotation?: number;
  last_node_id?: string | null;
}

interface ActiveVehicle extends VehicleWearData {
  id: string;
  model_id: VehicleModelId;
  health?: number;
}

interface TravelState {
  isMoving: boolean;
  remainingPath: string[];
  routeTarget: Point | null;
  animatedPosition: Point | null;
  animatedRotation: number;
  routePath: string[];
  currentSegment: number;
  routeToken: number;

  startRoute: (targetLocId: string) => Promise<void>;
  stopRoute: () => void;
}

const waypoints = WAYPOINTS as WaypointsMap;

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

    const {
      player,
      activeVehicle,
    } = usePlayerStore.getState() as {
      player: PlayerTravelData | null;
      activeVehicle: ActiveVehicle | null;
    };

    const locations = getMergedLocations() as Location[];

    let location = locations.find(
      (item) => item.id === targetLocId
    );

    if (!location && waypoints[targetLocId]) {
      const wp = waypoints[targetLocId];

      location = {
        id: targetLocId,
        x: wp.x,
        y: wp.y,
        entrance_id: targetLocId,
      };
    }

    if (!player || get().isMoving || !location) {
      return;
    }

    const token = get().routeToken + 1;

    set({
      routeToken: token,
      isMoving: true,
    });

    const speedCfg = activeVehicle
      ? VEHICLE_DATABASE[activeVehicle.model_id]
      : undefined;

    const moveSpeed = speedCfg?.speed || 150;

    let startNodeId = player.last_node_id;

    if (!startNodeId) {
      let minD = Infinity;

      Object.entries(waypoints).forEach(([id, pt]) => {
        const d = Math.hypot(
          player.pos_x - pt.x,
          player.pos_y - pt.y
        );

        if (d < minD) {
          minD = d;
          startNodeId = id;
        }
      });
    }

    if (!startNodeId) {
      return;
    }

    let endNodeId = location.entrance_id;

    if (!endNodeId || !waypoints[endNodeId]) {
      let minD = Infinity;

      Object.entries(waypoints).forEach(([id, pt]) => {
        const d = Math.hypot(
          location!.x - pt.x,
          location!.y - pt.y
        );

        if (d < minD) {
          minD = d;
          endNodeId = id;
        }
      });
    }

    if (!endNodeId) {
      return;
    }

    const path = findShortestPath(
      startNodeId,
      endNodeId
    ) as string[];

    if (path.length === 0) {
      return;
    }

    const routeCoordinates = path
      .map((id) => waypoints[id])
      .filter((point): point is Waypoint => Boolean(point));

    const fullRoute: Point[] = [
      {
        x: player.pos_x,
        y: player.pos_y,
      },
      ...routeCoordinates,
      {
        x: location.x,
        y: location.y,
      },
    ];

    const segmentLengths = fullRoute
      .slice(1)
      .map((to, index) => {
        const from = fullRoute[index];

        return Math.hypot(
          to.x - from.x,
          to.y - from.y
        );
      });

    const totalDistance = segmentLengths.reduce(
      (sum, len) => sum + len,
      0
    );

    set({
      isMoving: true,
      routeToken: token,
      remainingPath: path,
      routePath: path,
      routeTarget: {
        x: location.x,
        y: location.y,
      },
      currentSegment: 0,
      animatedPosition: {
        x: player.pos_x,
        y: player.pos_y,
      },
      animatedRotation: player.rotation || 0,
    });

    // Apply wear system
    let effectiveSpeed = moveSpeed;
    let vehicleId: string | null = null;

    if (activeVehicle) {
      vehicleId = activeVehicle.id;

      const vehicleUpdates = applyWear(
        activeVehicle,
        totalDistance
      );

      const condition = vehicleUpdates.condition || 100;
      const perf = getPerformanceMultiplier(condition);

      effectiveSpeed = Math.round(
        moveSpeed * perf.speed
      );

      // Apply speed penalty based on condition
      if (condition < 30) {
        effectiveSpeed = moveSpeed * 0.5;
      } else if (condition < 50) {
        effectiveSpeed = moveSpeed * 0.8;
      }

      // Also update health backwards-compat
      const newHealth = Math.max(0, condition);

      useVehicleStore
        .getState()
        .updateVehicleHealth(
          vehicleId,
          newHealth
        );

      // Save wear data to DB
      const { supabase } = await import(
        '../api/supabase'
      );

      const { error } = await supabase
        .from('vehicles')
        .update(vehicleUpdates)
        .eq('id', vehicleId);

      if (!error) {
        const vehicles =
          useVehicleStore
            .getState()
            .myVehicles
            .map((vehicle) =>
              vehicle.id === vehicleId
                ? {
                    ...vehicle,
                    ...vehicleUpdates,
                  }
                : vehicle
            );

        useVehicleStore.setState({
          myVehicles: vehicles,
        });

        const updatedActiveVehicle = {
          ...activeVehicle,
          ...vehicleUpdates,
          health: newHealth,
        };

        usePlayerStore
          .getState()
          .setLocalActiveVehicle(
            updatedActiveVehicle
          );
      }
    }

    await animateRoute(
      fullRoute,
      path,
      segmentLengths,
      effectiveSpeed,
      totalDistance,
      token
    );

    if (get().routeToken !== token) {
      return;
    }

    await usePlayerStore
      .getState()
      .updateProfile({
        pos_x: location.x,
        pos_y: location.y,
        last_node_id: location.entrance_id,
      });

    set({
      isMoving: false,
      remainingPath: [],
      routePath: [],
      currentSegment: 0,
      routeTarget: null,
      animatedPosition: null,
      animatedRotation: 0,
      routeToken: get().routeToken,
    });
  },

  stopRoute: () => {
    set({
      isMoving: false,
      remainingPath: [],
      routePath: [],
      currentSegment: 0,
      routeTarget: null,
      animatedPosition: null,
      animatedRotation: 0,
      routeToken: get().routeToken + 1,
    });
  },
}));

async function animateRoute(
  points: Point[],
  _path: string[],
  segmentLengths: number[],
  moveSpeed: number,
  totalDistance: number,
  routeToken: number
): Promise<void> {
  return new Promise((resolve) => {
    const travelState =
      useTravelStore.getState();

    const player = usePlayerStore.getState().player as
      | PlayerTravelData
      | null;

    const startPos =
      travelState.animatedPosition || {
        x: points[0].x,
        y: points[0].y,
      };

    const startRotation =
      travelState.animatedRotation ||
      player?.rotation ||
      0;

    const totalTime =
      (totalDistance / moveSpeed) * 1000;

    const startTime = performance.now();

    // Precompute cumulative distances for O(log n) segment lookup
    const cumulativeLengths = [0];

    for (
      let i = 0;
      i < segmentLengths.length;
      i++
    ) {
      cumulativeLengths.push(
        cumulativeLengths[i] +
          segmentLengths[i]
      );
    }

    // Binary search for segment index
    function getSegmentIndexAndFraction(
      distance: number
    ): {
      index: number;
      fraction: number;
    } {
      let lo = 0;
      let hi = segmentLengths.length - 1;

      while (lo < hi) {
        const mid = (lo + hi) >> 1;

        if (
          cumulativeLengths[mid + 1] <
          distance
        ) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }

      const segStart =
        cumulativeLengths[lo];

      const fraction =
        segmentLengths[lo] > 0
          ? Math.min(
              (distance - segStart) /
                segmentLengths[lo],
              1
            )
          : 1;

      return {
        index: lo,
        fraction,
      };
    }

    function update(currentTime: number): void {
      if (
        useTravelStore.getState()
          .routeToken !== routeToken
      ) {
        resolve();
        return;
      }

      const elapsed =
        currentTime - startTime;

      const progress = Math.min(
        elapsed / totalTime,
        1
      );

      const traveled =
        totalDistance * progress;

      const {
        index: segmentIndex,
        fraction: segmentFraction,
      } =
        getSegmentIndexAndFraction(
          traveled
        );

      const segmentStart =
        points[segmentIndex];

      const segmentEnd =
        points[segmentIndex + 1] ||
        segmentStart;

      const nextX =
        segmentStart.x +
        (segmentEnd.x -
          segmentStart.x) *
          segmentFraction;

      const nextY =
        segmentStart.y +
        (segmentEnd.y -
          segmentStart.y) *
          segmentFraction;

      const angle =
        Math.atan2(
          segmentEnd.y -
            segmentStart.y,
          segmentEnd.x -
            segmentStart.x
        ) *
          (180 / Math.PI) +
        90;

      const diff =
        ((angle -
          startRotation +
          180) %
          360) -
        180;

      const finalRotation =
        startRotation +
        (diff < -180
          ? diff + 360
          : diff);

      const nextRotation =
        startRotation +
        (finalRotation -
          startRotation) *
          progress;

      useTravelStore.setState({
        animatedPosition: {
          x: nextX,
          y: nextY,
        },
        animatedRotation:
          nextRotation,
      });

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        resolve();
      }
    }

    // Preserve original starting position variable
    void startPos;

    requestAnimationFrame(update);
  });
}