export type CharacterStatKey =
  | 'charisma'
  | 'armor'
  | 'stamina'
  | 'speed'
  | 'strength'
  | 'luck'
  | 'energy_regen'
  | 'inv_slots';

export interface CharacterStat {
  key: CharacterStatKey;
  name: string;
  icon: string;
  color: string;
  bg: string;
}

export const CHARACTER_STATS: CharacterStat[] = [
  { key: 'charisma', name: 'Харизма', icon: '⭐', color: 'text-purple-400', bg: 'bg-purple-500' },
  { key: 'armor', name: 'Броня', icon: '🛡️', color: 'text-blue-400', bg: 'bg-blue-500' },
  { key: 'stamina', name: 'Выносливость', icon: '🏃', color: 'text-green-400', bg: 'bg-green-500' },
  { key: 'speed', name: 'Скорость', icon: '👟', color: 'text-amber-400', bg: 'bg-amber-500' },
  { key: 'strength', name: 'Сила', icon: '💪', color: 'text-red-400', bg: 'bg-red-500' },
  { key: 'luck', name: 'Удача', icon: '🍀', color: 'text-emerald-400', bg: 'bg-emerald-500' },
  { key: 'energy_regen', name: 'Регенерация энергии', icon: '⚡', color: 'text-yellow-400', bg: 'bg-yellow-500' },
  { key: 'inv_slots', name: 'Слоты инвентаря', icon: '💾', color: 'text-cyan-400', bg: 'bg-cyan-500' },
];

export const CHARACTER_STATS_MAP: Record<CharacterStatKey, CharacterStat> = CHARACTER_STATS.reduce(
  (acc, stat) => {
    acc[stat.key] = stat;
    return acc;
  },
  {} as Record<CharacterStatKey, CharacterStat>
);

export const BUFF_STAT_KEYS: CharacterStatKey[] = CHARACTER_STATS
  .map(stat => stat.key)
  .filter(key => key !== 'inv_slots');
