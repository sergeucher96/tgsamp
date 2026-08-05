import { WAYPOINTS, ROAD_NETWORK } from '../data/roads';

export function findShortestPath(startNodeId, endNodeId) {
    const sId = startNodeId.toString();
    const eId = endNodeId.toString();

    if (!WAYPOINTS[sId] || !WAYPOINTS[eId]) {
        console.error("Ошибка навигации: Точки не найдены", { sId, eId });
        return [];
    }
    
    const nodes = Object.keys(WAYPOINTS);
    const distances = {};
    const previous = {};
    let queue = [...nodes];

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
        const neighbors = ROAD_NETWORK.filter(r => 
            r.from.toString() === shortestNode || r.to.toString() === shortestNode
        ).map(r => 
            // Если мы пришли со стороны 'from', значит сосед — это 'to', и наоборот
            r.from.toString() === shortestNode ? r.to.toString() : r.from.toString()
        );

        neighbors.forEach(neighbor => {
            if (!queue.includes(neighbor)) return;
            
            // Считаем реальное расстояние между точками (вес ребра)
            const weight = Math.hypot(
                WAYPOINTS[shortestNode].x - WAYPOINTS[neighbor].x, 
                WAYPOINTS[shortestNode].y - WAYPOINTS[neighbor].y
            );
            
            const alt = distances[shortestNode] + weight;
            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                previous[neighbor] = shortestNode;
            }
        });
    }

    // Восстанавливаем цепочку маршрута
    const path = [];
    let current = eId;
    while (current) {
        path.unshift(current);
        current = previous[current];
    }

    return path.length > 1 && path[0] === sId ? path : [];
}