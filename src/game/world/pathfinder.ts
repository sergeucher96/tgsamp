import { WAYPOINTS, ROAD_NETWORK } from '../locations/roads';

export type NodeId = string | number;

interface Waypoint {
  x: number;
  y: number;
}

interface Road {
  from: NodeId;
  to: NodeId;
}

type DistanceMap = Record<string, number>;
type PreviousMap = Record<string, string | null>;

const waypoints = WAYPOINTS as Record<string, Waypoint>;
const roadNetwork = ROAD_NETWORK as Road[];

export function findShortestPath(startNodeId: NodeId, endNodeId: NodeId): string[] {
    const sId = startNodeId.toString();
    const eId = endNodeId.toString();

    if (!waypoints[sId] || !waypoints[eId]) {
        console.error("Ошибка навигации: Точки не найдены", { sId, eId });
        return [];
    }

    const nodes = Object.keys(waypoints);
    const distances: DistanceMap = {};
    const previous: PreviousMap = {};
    let queue: string[] = [...nodes];

    nodes.forEach(node => {
        distances[node] = Infinity;
        previous[node] = null;
    });

    distances[sId] = 0;

    while (queue.length > 0) {
        // Находим узел в очереди с минимальным расстоянием
        let shortestNode = queue.reduce((minNode, node) =>
            distances[node] < distances[minNode] ? node : minNode, queue[0]);

        if (distances[shortestNode] === Infinity) break;
        if (shortestNode === eId) break;

        queue = queue.filter(n => n !== shortestNode);

        // --- ЛОГИКА ДВУСТОРОННЕГО ДВИЖЕНИЯ ---
        // Ищем все дороги, где наша точка указана как 'from' ИЛИ как 'to'
        const neighbors = roadNetwork.filter(r =>
            r.from.toString() === shortestNode || r.to.toString() === shortestNode
        ).map(r =>
            // Если мы пришли со стороны 'from', значит сосед — это 'to', и наоборот
            r.from.toString() === shortestNode ? r.to.toString() : r.from.toString()
        );

        neighbors.forEach(neighbor => {
            if (!queue.includes(neighbor)) return;
            
            // Считаем реальное расстояние между точками (вес ребра)
            const weight = Math.hypot(
                waypoints[shortestNode].x - waypoints[neighbor].x,
                waypoints[shortestNode].y - waypoints[neighbor].y
            );
            
            const alt = distances[shortestNode] + weight;
            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                previous[neighbor] = shortestNode;
            }
        });
    }

    // Восстанавливаем цепочку маршрута
    const path: string[] = [];
    let current: string | null = eId;
    while (current) {
        path.unshift(current);
        current = previous[current];
    }

    return path.length > 1 && path[0] === sId ? path : [];
}