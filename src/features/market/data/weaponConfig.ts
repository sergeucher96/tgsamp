export type WeaponMechanic = 'precision' | 'close_range' | 'automatic';
export type TargetSize = 'small' | 'medium' | 'large';
export type FireRate = 'single' | 'burst' | 'rapid';

export interface WeaponConfig {
  id: string;
  name: string;
  icon: string;
  desc: string;
  price: number;
  mechanic: WeaponMechanic;
  targetSize: TargetSize;
  fireRate: FireRate;
  spread: number;
  ammoPerShot: number;
  maxLevel: number;
  xpPerHit: number;
  skillId: string;
}

export interface GunRangeSettings {
  entryFee: number;
  timeLimit: number;
  ammoLimit: number;
  weaponLicenseCost: number;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

export const WEAPON_CONFIG: Record<string, WeaponConfig> = {
  deagle: {
    id: 'deagle',
    name: 'Desert Eagle',
    icon: '🔫',
    desc: 'Точная стрельба. Маленькие мишени, одиночные выстрелы.',
    price: 5000,
    mechanic: 'precision',
    targetSize: 'small',
    fireRate: 'single',
    spread: 0,
    ammoPerShot: 1,
    maxLevel: 10,
    xpPerHit: 15,
    skillId: 'deagle',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Дробовик',
    icon: '🔫',
    desc: 'Ближний бой. Большие мишени, но близко и быстро.',
    price: 3000,
    mechanic: 'close_range',
    targetSize: 'large',
    fireRate: 'burst',
    spread: 3,
    ammoPerShot: 1,
    maxLevel: 10,
    xpPerHit: 10,
    skillId: 'shotgun',
  },
  carbine: {
    id: 'carbine',
    name: 'K2 Карабин',
    icon: '🔫',
    desc: 'Автоматическая стрельба. Серии выстрелов, средние мишени.',
    price: 8000,
    mechanic: 'automatic',
    targetSize: 'medium',
    fireRate: 'rapid',
    spread: 1,
    ammoPerShot: 1,
    maxLevel: 10,
    xpPerHit: 12,
    skillId: 'm4',
  },
};

export const GUN_RANGE_SETTINGS: GunRangeSettings = {
  entryFee: 200,
  timeLimit: 120,
  ammoLimit: 30,
  weaponLicenseCost: 10000,
};

export const DRIVING_TEST_QUESTIONS: QuizQuestion[] = [
  { q: 'Скорость в городе не более?', options: ['40', '60', '80', '100'], correct: 1 },
  { q: 'Пешеход имеет приоритет на зебре?', options: ['Да', 'Нет', 'Только с табличкой', 'Зависит от времени'], correct: 0 },
  { q: 'Зелёный мигающий означает?', options: ['Стоп', 'Скоро красный', 'Разрешён разворот', 'Можно парковаться'], correct: 1 },
  { q: 'Красный свет — можно ехать?', options: ['Нет', 'Да, медленно', 'Да, направо', 'Да, если пусто'], correct: 0 },
  { q: 'Ремень безопасности обязателен?', options: ['Да', 'Только на трассе', 'Только водитель', 'По желанию'], correct: 0 },
  { q: 'Правильный сигнал для поворота направо?', options: ['Левый', 'Правый', 'Аварийка', 'Поворот руля'], correct: 1 },
  { q: 'Уступить дорогу — это значит?', options: ['Проехать первым', 'Подождать', 'Поморгать', 'Посигналить'], correct: 1 },
  { q: 'Где парковаться в городе?', options: ['На тротуаре', 'На встречке', 'На парковке', 'Где удобно'], correct: 2 },
  { q: 'Штраф за проезд на красный?', options: ['Нет штрафа', 'Маленький', 'Серьёзный', 'Лишение прав'], correct: 2 },
  { q: 'ДТП — первое действие?', options: ['Уехать', 'Остановиться', 'Спорить', 'Звонить другу'], correct: 1 },
  { q: 'Приоритет у кого на перекрёстке?', options: ['У быстрого', 'У большого', 'У правого', 'У первого'], correct: 2 },
  { q: 'Можно ли разворот на пешеходном переходе?', options: ['Да', 'Нет', 'Только ночью', 'Только днём'], correct: 1 },
  { q: 'Что значит жёлтый ромб?', options: ['Парковка', 'Приоритетная дорога', 'Опасность', 'Тупик'], correct: 1 },
  { q: 'Скорость на трассе макс.?', options: ['60', '80', '100', '120'], correct: 3 },
  { q: 'Двигаться по встречке можно?', options: ['Да', 'Нет', 'Только ночью', 'Если пусто'], correct: 1 },
  { q: 'Знак "Стоп" обязывает?', options: ['Замедлиться', 'Полная остановка', 'Посмотреть', 'Посигналить'], correct: 1 },
  { q: 'Мигалка встречной — что делать?', options: ['Ускориться', 'Уступить', 'Игнорировать', 'Остановиться'], correct: 1 },
  { q: 'Реверсивное движение разрешено?', options: ['Да, всегда', 'Нет, никогда', 'По знакам', 'Только ночью'], correct: 2 },
  { q: 'Обгон на перекрёстке?', options: ['Разрешён', 'Запрещён', 'Только слева', 'Только справа'], correct: 1 },
  { q: 'Темные фары включают когда?', options: ['Лето', 'Зима', 'Темнота/туннель', 'По желанию'], correct: 2 },
  { q: 'Знак "Движение запрещено" значит?', options: ['Можно въехать', 'Въезд запрещён', 'Осторожно', 'Разворот'], correct: 1 },
  { q: 'Парковка у столба "Парковка запрещена"?', options: ['Можно', 'Нельзя', '5 минут', 'Только грузить'], correct: 1 },
  { q: 'Мотоциклист на дороге — приоритет?', options: ['Меньше', 'Равный', 'Больше', 'Зависит'], correct: 1 },
  { q: 'Грузовик обгоняет — что делать?', options: ['Ускориться', 'Замедлить и уступить', 'Тормозить резко', 'Игнорировать'], correct: 1 },
  { q: 'Экстренная остановка — куда?', options: ['На пешеходный', 'На перекрёсток', 'Обочину', 'Середину'], correct: 2 },
  { q: 'Скользкая дорога — скорость?', options: ['Обычная', 'Повысить', 'Снизить', 'Стоять'], correct: 2 },
  { q: 'Пешеход ждёт перехода — что делать?', options: ['Проехать', 'Подождать', 'Посигналить', 'Моргнуть'], correct: 1 },
  { q: 'Табличка "Тупик" — ехать?', options: ['Да', 'Нет пути', 'Разворот', 'Проезд грузовикам'], correct: 1 },
  { q: 'Разворот в тоннеле?', options: ['Разрешён', 'Запрещён', 'Только аварийный', 'По знакам'], correct: 1 },
  { q: 'Правильное зеркало — какое?', options: ['Любое', 'Регулированное', 'Убранное', 'Разбитое'], correct: 1 },
];

export const WEAPON_LICENSE_QUESTIONS: QuizQuestion[] = [
  { q: 'Оружие можно направлять на человека?', options: ['Да, если угроза', 'Нет, никогда', 'Только преступника', 'По ситуации'], correct: 1 },
  { q: 'Где хранить оружие?', options: ['В машине', 'Под подушкой', 'В сейфе', 'У друга'], correct: 2 },
  { q: 'Стрельба в городе разрешена?', options: ['Да', 'Только ночью', 'Только в тире', 'По желанию'], correct: 2 },
  { q: 'Алкоголь и оружие?', options: ['Совместимо', 'Несовместимо', 'Мало алкоголя — ок', 'Вино — ок'], correct: 1 },
  { q: 'Оружие при себе в баре?', options: ['Можно', 'Нельзя', 'Спрятать — ок', 'Только лицензия'], correct: 1 },
];
