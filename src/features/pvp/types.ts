/**
 * Типы боя и приведение ответа сервера к одному виду.
 *
 * Зачем нормализация. Один и тот же бой приходит тремя разными
 * вызовами, и поля в них разные:
 *
 *   pvp_resolve_player / pvp_queue_fight — имена и иконки лежат
 *     на верхнем уровне, health/max тоже;
 *   pvp_queue_take — вместо имён приходят целые снимки, из них
 *     берутся имена, иконки и max_hp.
 *
 * Если не привести это к одному виду, рисующий код пришлось бы
 * знать про все три вызова, и любое новое поле ломало бы их
 * по очереди.
 */

export type Actor = 'a' | 'd';
export type Action = 'attack' | 'heavy' | 'block' | 'dodge' | 'heal';

/** Один кадр журнала. Приходит с сервера уже посчитанным. */
export interface FightEvent {
  n: number;
  at_ms: number;
  actor: Actor;
  action: Action;
  damage: number;
  heal: number;
  crit: boolean;
  miss: boolean;
  blocked: boolean;
  a_hp: number;
  d_hp: number;
  a_energy: number;
  d_energy: number;
}

export interface Weapon {
  item_key: string | null;
  name: string;
  icon: string;
  damage: number;
}

export interface FighterSnapshot {
  ok: boolean;
  blocked?: string;
  player_id: string | null;
  username: string;
  lvl: number;
  skill?: number;
  max_hp: number;
  attack: number;
  defense: number;
  luck: number;
  armor: number;
  stamina?: number;
  strength?: number;
  speed?: number;
  mitigation: number;
  power: number;
  is_npc?: boolean;
  weapon: Weapon;
  equipment?: Array<{ slot: string; item_key: string; name: string; icon: string; armor: number }>;
}

/** Бой, готовый к отрисовке, с моей стороны от первого лица. */
export interface PresentedFight {
  mySide: Actor;
  won: boolean;
  rounds: number;
  seed: number;
  attacker: { name: string; icon: string };
  defender: { name: string; icon: string };
  aHp: number;
  dHp: number;
  aHpMax: number;
  dHpMax: number;
  log: FightEvent[];
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: unknown, fallback: string): string =>
  (typeof v === 'string' && v) || fallback;

/**
 * Приводит любой из ответов сервера к PresentedFight.
 *
 * Сторона и исход берутся из my_side/won, если сервер их прислал.
 * Если нет — выводим из winner и выбранной стороны вызова: без
 * этого модалка показала бы чужой исход как свой, а это хуже, чем
 * лишняя проверка.
 */
export function presentFight(raw: any, viewerSide?: Actor): PresentedFight {
  const snapA: FighterSnapshot | undefined = raw?.attacker_snapshot;
  const snapD: FighterSnapshot | undefined = raw?.defender_snapshot;
  const log: FightEvent[] = Array.isArray(raw?.log) ? (raw.log as FightEvent[]) : [];

  const mySide: Actor =
    raw?.my_side === 'a' || raw?.my_side === 'd' ? raw.my_side : (viewerSide ?? 'a');

  const aMax = num(raw?.attacker_hp_max, num(snapA?.max_hp, 100));
  const dMax = num(raw?.defender_hp_max, num(snapD?.max_hp, 100));

  const winner: Actor | null = raw?.winner === 'd' ? 'd' : raw?.winner === 'a' ? 'a' : null;

  // Победителя знает и winner ('a'/'d'), и winner_id (uuid). В
  // pvp_queue_take приходит только второй, поэтому он и нужен
  // как запасной путь.
  const won =
    typeof raw?.won === 'boolean'
      ? raw.won
      : winner
        ? winner === mySide
        : false;

  // ПОЧЕМУ ЗАПАСНОЙ ПУТЬ ЧЕРЕЗ ПОСЛЕДНИЙ КАДР
  // Сервер отдаёт остаток здоровья не в каждом вызове: у него
  // есть attacker_hp/defender_hp, но нет *_hp_max — максимум
  // лежит только в снимках. Подставлять вместо отсутствующего
  // поля максимум нельзя: получились бы две полные полоски,
  // то есть бой выглядел бы как не начавшийся. Последний кадр
  // журнала содержит то же самое здоровье, поэтому берём его.
  const last = log.length ? log[log.length - 1] : null;

  return {
    mySide,
    won,
    rounds: num(raw?.rounds),
    seed: num(raw?.seed),
    attacker: {
      name: str(raw?.attacker_name, snapA?.username ?? 'Боец'),
      icon: str(raw?.attacker_icon, snapA?.weapon?.icon ?? '👊'),
    },
    defender: {
      name: str(raw?.defender_name, snapD?.username ?? 'Боец'),
      icon: str(raw?.defender_icon, snapD?.weapon?.icon ?? '👊'),
    },
    aHp: num(raw?.attacker_hp, last ? last.a_hp : aMax),
    dHp: num(raw?.defender_hp, last ? last.d_hp : dMax),
    aHpMax: aMax,
    dHpMax: dMax,
    log,
  };
}

export const ACTION_LABEL: Record<Action, string> = {
  attack: 'удар',
  heavy: 'тяжёлый удар',
  block: 'блок',
  dodge: 'уклонение',
  heal: 'лечение',
};

export const ACTION_ICON: Record<Action, string> = {
  attack: '⚔️',
  heavy: '💥',
  block: '🛡️',
  dodge: '💨',
  heal: '💚',
};

/** Боец, ожидающий в очереди. */
export interface QueueFighter {
  player_id: string;
  username: string;
  lvl: number | null;
  power: number;
  rating: number;
  waiting_since: string;
}