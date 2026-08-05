// src/data/vehicleStyles.js

// Список доступных цветов и их HEX-кодов для интерфейса
export const VEHICLE_COLORS = [
  { id: 'white', name: 'Белый', hex: '#FFFFFF' },
  { id: 'black', name: 'Черный', hex: '#1A1A1A' },
  { id: 'red',   name: 'Красный', hex: '#EF4444' },
  { id: 'blue',  name: 'Синий', hex: '#3B82F6' },
  { id: 'green', name: 'Зеленый', hex: '#10B981' }
];

// Функция получения картинки
export const getVehicleImage = (modelId, colorId) => {
  // Если модель или цвет не переданы, ставим стандарт
  const model = modelId || 'clover';
  const color = colorId || 'white';
  
  return `/vehicles/${model}_${color}.webp`;
};