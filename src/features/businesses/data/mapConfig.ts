export interface MapConfig {
  width: number;
  height: number;
  minZoom: number;
  maxZoom: number;
}

export const MAP_CONFIG: MapConfig = {
  width: 6144,
  height: 6144,
  minZoom: 0.1, // Чтобы видеть всю карту на маленьком экране
  maxZoom: 3,   // Максимальное приближение
};