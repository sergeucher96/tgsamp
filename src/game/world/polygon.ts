/**
 * Геометрия полигонов территорий.
 *
 * Координаты — целые числа в пикселях текстуры карты (0…6144),
 * ровно те же, что у WAYPOINTS в roads.ts и у bbox в таблице territories.
 */

export interface MapPoint {
  x: number;
  y: number;
}

export interface Bounds {
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
}

/** Осевой прямоугольник, описанный вокруг набора точек */
export function boundsFromPoints(points: MapPoint[]): Bounds {
  if (points.length === 0) {
    return { min_x: 0, max_x: 0, min_y: 0, max_y: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { min_x: minX, max_x: maxX, min_y: minY, max_y: maxY };
}

/** Площадь многоугника по формуле Гаусса */
export function polygonArea(points: MapPoint[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Попадает ли точка внутрь контура.
 * Используется луч вправо: считаем пересечения со сторонами.
 * Точки ровно на границе считаем попавшими — удобно для игрока.
 */
export function isInsidePolygon(x: number, y: number, points: MapPoint[]): boolean {
  if (points.length < 3) return false;

  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];

    // лежит ли точка на стороне
    const cross = (x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x);
    if (cross === 0 && x >= Math.min(a.x, b.x) && x <= Math.max(a.x, b.x)
      && y >= Math.min(a.y, b.y) && y <= Math.max(a.y, b.y)) {
      return true;
    }

    const intersects = (a.y > y) !== (b.y > y)
      && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** С какой стороны обхода контура мы находимся — для отсечения лишних точек */
export function signedArea(points: MapPoint[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Убирает соседние дубликаты точек, чтобы контур не «дребезжал» при кликах */
export function dedupePoints(points: MapPoint[], tolerance = 1): MapPoint[] {
  const out: MapPoint[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) <= tolerance && Math.abs(last.y - p.y) <= tolerance) {
      continue;
    }
    out.push(p);
  }
  return out;
}
