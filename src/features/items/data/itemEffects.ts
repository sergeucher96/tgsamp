import { type CharacterStatKey } from '../../character/data/characterStats';

export type ItemEffectKind = 'stat' | 'buff' | 'modifier' | 'action';

/** Поле профиля, которое восстанавливается мгновенным эффектом */
export type StatTarget = 'hp' | 'hunger' | 'energy' | 'thirst';

/** Системный модификатор — не характеристика персонажа */
export type ModifierKey = 'xp_gain' | 'money_gain' | 'energy_regen' | 'drop_rate';

export interface ItemEffectDef {
  key: string;
  name: string;
  icon: string;
  kind: ItemEffectKind;
  /** kind = 'stat': какое поле восстанавливаем */
  stat?: StatTarget;
  /** kind = 'buff': какую характеристику усиливаем */
  statKey?: CharacterStatKey;
  /** kind = 'modifier': какой системный множитель меняем */
  modifier?: ModifierKey;
  /** значение задаётся в процентах */
  percent?: boolean;
  description?: string;
}

/** Длительность баффа по умолчанию, если предмет её не задал */
export const DEFAULT_BUFF_MINUTES = 60;

/** Потолок суммарного бонуса от модификаторов, в процентах */
export const MAX_MODIFIER_PERCENT = 100;

/** Потолок здоровья/энергии при восстановлении */
export const STAT_MAX = 100;

export const MODIFIER_INFO: Record<ModifierKey, { name: string; icon: string; description: string }> = {
  xp_gain: { name: 'Опыт профессий', icon: '📈', description: 'Процент к получаемому опыту' },
  money_gain: { name: 'Доход', icon: '💰', description: 'Процент к заработку' },
  energy_regen: { name: 'Регенерация энергии', icon: '⚡', description: 'Процент к скорости восстановления энергии' },
  drop_rate: { name: 'Удача добычи', icon: '🍀', description: 'Процент к шансу выпадения ресурсов' },
};

const LIST: ItemEffectDef[] = [
  // --- Мгновенное восстановление ---
  { key: 'heal_energy', name: 'Восстановление энергии', icon: '⚡', kind: 'stat', stat: 'energy' },
  { key: 'heal_health', name: 'Восстановление здоровья', icon: '❤️', kind: 'stat', stat: 'hp' },
  { key: 'heal_hunger', name: 'Восстановление сытости', icon: '🍽️', kind: 'stat', stat: 'hunger' },
  { key: 'heal_thirst', name: 'Восстановление жажды', icon: '💧', kind: 'stat', stat: 'thirst' },

  // --- Усиление характеристик (для еды и одежды) ---
  { key: 'buff_strength', name: 'Сила', icon: '💪', kind: 'buff', statKey: 'strength', description: 'Усиливает силу' },
  { key: 'buff_stamina', name: 'Выносливость', icon: '🏃', kind: 'buff', statKey: 'stamina' },
  { key: 'buff_speed', name: 'Скорость', icon: '👟', kind: 'buff', statKey: 'speed' },
  { key: 'buff_luck', name: 'Удача', icon: '🍀', kind: 'buff', statKey: 'luck' },
  { key: 'buff_charisma', name: 'Харизма', icon: '⭐', kind: 'buff', statKey: 'charisma' },
  { key: 'buff_armor', name: 'Броня', icon: '🛡️', kind: 'buff', statKey: 'armor' },
  { key: 'buff_energy_regen', name: 'Регенерация энергии', icon: '🔋', kind: 'buff', statKey: 'energy_regen' },

  // --- Системные модификаторы (проценты) ---
  { key: 'xp_gain_multiplier', name: 'Опыт профессий', icon: '📈', kind: 'modifier', modifier: 'xp_gain', percent: true, description: 'Процент к получаемому опыту' },
  { key: 'money_gain_multiplier', name: 'Доход', icon: '💰', kind: 'modifier', modifier: 'money_gain', percent: true },
  { key: 'energy_regen_multiplier', name: 'Регенерация энергии', icon: '🔋', kind: 'modifier', modifier: 'energy_regen', percent: true },
  { key: 'drop_rate_multiplier', name: 'Удача добычи', icon: '🍀', kind: 'modifier', modifier: 'drop_rate', percent: true },

  // --- Разовые действия ---
  { key: 'fuel_vehicle', name: 'Заправить транспорт', icon: '⛽', kind: 'action' },
  { key: 'repair', name: 'Починить', icon: '🔧', kind: 'action' },
  { key: 'build', name: 'Построить', icon: '🏗️', kind: 'action' },
  { key: 'give_money', name: 'Выдать деньги', icon: '💵', kind: 'action' },
  { key: 'teleport', name: 'Телепортация', icon: '🌀', kind: 'action' },
  { key: 'modify_property', name: 'Изменение недвижимости', icon: '🏠', kind: 'action' },
  { key: 'mine_resource', name: 'Добыча ресурса', icon: '⛏️', kind: 'action' },
  { key: 'apply_buff', name: 'Применить бафф', icon: '✨', kind: 'action' },
];

export const EFFECT_DEFS: Record<string, ItemEffectDef> = LIST.reduce((acc, def) => {
  acc[def.key] = def;
  return acc;
}, {} as Record<string, ItemEffectDef>);

export const FALLBACK_EFFECT: ItemEffectDef = {
  key: 'unknown', name: 'Эффект', icon: '✨', kind: 'action',
};

export function getEffectDef(key: string): ItemEffectDef {
  return EFFECT_DEFS[key] || { ...FALLBACK_EFFECT, key };
}

/** Эффекты, которые имеет смысл предлагать в редакторе предмета */
export const CONFIGURED_EFFECT_KEYS = Object.keys(EFFECT_DEFS);

export const EFFECT_KIND_LABELS: Record<ItemEffectKind, { name: string; icon: string }> = {
  stat: { name: 'Мгновенное восстановление', icon: '✨' },
  buff: { name: 'Усиление характеристик', icon: '💪' },
  modifier: { name: 'Бонусы (проценты)', icon: '📈' },
  action: { name: 'Действия', icon: '⚙️' },
};

/** Все эффекты, сгруппированные по виду — для пикера в мастере предмета */
export const EFFECTS_BY_KIND: { kind: ItemEffectKind; name: string; icon: string; defs: ItemEffectDef[] }[] =
  (['stat', 'buff', 'modifier', 'action'] as ItemEffectKind[]).map(kind => ({
    kind,
    name: EFFECT_KIND_LABELS[kind].name,
    icon: EFFECT_KIND_LABELS[kind].icon,
    defs: LIST.filter(d => d.kind === kind),
  }));
