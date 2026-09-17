export interface License {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export const LICENSES_DATABASE: License[] = [
  { id: 'moto', name: 'Мотоциклы (A)', icon: '🏍️', desc: 'Мотоциклы' },
  { id: 'car', name: 'Вождение (B)', icon: '🚗', desc: 'Легковой транспорт' },
  { id: 'truck', name: 'Грузовые (C)', icon: '🚛', desc: 'Тяжелая техника' },
  { id: 'weapon', name: 'Оружие', icon: '🔫', desc: 'Разрешение на ствол' },
  { id: 'air', name: 'Авиация', icon: '🚁', desc: 'Вертолеты и самолеты' },
];