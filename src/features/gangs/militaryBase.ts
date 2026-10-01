/**
 * militaryBase.ts — правила вылазки на военную базу.
 *
 * Источник истины — база: добыча и проверки выполняются в функции
 * steal_materials (materials_steal_migration.sql). Браузер отправляет
 * только id игрока и не решает ничего сам. Иначе ограничения не
 * работали бы: RLS в проекте открыт (using (true)), поэтому игрок
 * может вызвать supabase.rpc в консоли и обойти любое клиентское
 * условие.
 *
 * Клиентские проверки ниже — быстрый предварительный отказ и тексты.
 * Они экономят запрос там, где попытка всё равно невозможна, но
 * решение о выдаче всегда за сервером.
 */

import { supabase } from '../../services/supabase/client';
import { GANG_IDS } from './data/organizationsConfig';
import { PHASES, PHASE_LABEL, type GameTimeSnapshot } from '../../game/time/gameClock';

/** id локации. Тот же ключ в savedHotspots.json и в locations.ts. */
export const MILITARY_BASE_ID = 'military_base';

/** Действие хотспота «Воровать материалы» */
export const STEAL_MATERIALS_ACTION = 'steal_materials';

/** item_key предмета добычи */
export const MATERIALS_ITEM_KEY = 'materials';

/** Почему попытка не удалась */
export type StealMaterialsBlock =
  /** не в уличной банде (в том числе не в банде вовсе) */
  | 'not_gang'
  /** банда есть, но сейчас не ночь */
  | 'not_night'
  /** прошлый выход был недавно */
  | 'cooldown'
  /** нет места: сумка полна или стопка полна */
  | 'no_space'
  /** предмета нет в каталоге (чаще всего не применена миграция) */
  | 'no_item'
  /** не срослось с базой */
  | 'unavailable'
  /** у игрока нет профиля */
  | 'unknown_player';

export interface StealMaterialsResult {
  ok: boolean;
  /** null, когда попытка удалась */
  blocked: StealMaterialsBlock | null;
  /** Заголовок панели */
  title: string;
  /** Что игрок увидит в панели */
  text: string;
  /** Сколько забрали, если повезло */
  amount?: number;
}

/** Ночь для этого дела — с 19:00 до 05:00 */
const NIGHT_FROM = PHASES.night.from;
const NIGHT_TO = PHASES.night.to - 24;

/** «19:00» из числа игрового часа */
function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Человек ли игрок уличной банде. */
export function isStreetGang(gangId: string | null | undefined): boolean {
  return !!gangId && GANG_IDS.includes(gangId);
}

/**
 * Коды, которые сервер вправе вернуть. Нужны, чтобы отличить
 * «сервер сказал нельзя» от «сервер ответил чем-то новым».
 */
const KNOWN_BLOCKS = new Set<StealMaterialsBlock>([
  'not_gang',
  'not_night',
  'cooldown',
  'no_space',
  'no_item',
  'unavailable',
  'unknown_player',
]);

/** Тексты для всех отказов. Клиент и сервер отдают один код. */
export function describeBlocked(
  blocked: StealMaterialsBlock,
  opts: { retryInMinutes?: number } = {}
): { title: string; text: string } {
  switch (blocked) {
    case 'not_gang':
      return {
        title: 'Служба охраны не спит',
        text: 'Такое дело без банды за спиной не делают. Пока в группе — сюда не суются.',
      };
    case 'not_night':
      return {
        title: 'Приходите ночью',
        text: 'Сейчас не ночь: фонари, камеры и смена. Склад открыт с 19:00 до 05:00.',
      };
    case 'cooldown': {
      const minutes = opts.retryInMinutes ?? 0;
      const wait = minutes <= 1 ? 'меньше минуты' : `${minutes} мин`;
      return {
        title: 'Склад недавно обчистили',
        text: `Прошлый выход был недавно. Возвращайтесь через ${wait} — охрана заметит второй заход сразу.`,
      };
    }
    case 'no_space':
      return {
        title: 'Некуда спрятать',
        text: 'Сумка полна, а части находки уже не влезут. Освободите слот и попробуйте снова.',
      };
    case 'no_item':
      return {
        title: 'Склад пуст',
        text: 'Материалы не числятся в каталоге — вылазка пока ничего не принесёт.',
      };
    case 'unknown_player':
      return {
        title: 'Кто вы?',
        text: 'Профиль не найден. Перезайдите в игру и попробуйте снова.',
      };
    default:
      return {
        title: 'Склад недоступен',
        text: 'Не получилось связаться с базой. Попробуйте через минуту.',
      };
  }
}

/** Отказ с готовым текстом. */
function blocked(
  code: StealMaterialsBlock,
  opts: { retryInMinutes?: number } = {}
): StealMaterialsResult {
  return { ok: false, blocked: code, ...describeBlocked(code, opts) };
}

/**
 * Быстрая предварительная проверка без обращения к базе.
 *
 * Нужна, чтобы не слать запрос там, где попытка заведомо не пройдёт,
 * и чтобы игрок видел причину мгновенно. Решение о выдаче всё равно
 * принимает сервер — эта функция ничего не выдаёт.
 */
export function checkStealMaterials(
  gangId: string | null | undefined,
  time: GameTimeSnapshot
): StealMaterialsResult {
  if (!isStreetGang(gangId)) return blocked('not_gang');

  if (time.phase !== 'night') {
    // Ночь переходит через полночь: в PHASES у неё верхняя граница
    // 29, то есть 5 утра следующего дня. Считаем минуты до старта
    // ночи по модулю суток. Именно в минутах, а не в часах: в 18:30
    // до ночи полчаса, и «через час» игрока обмануло бы.
    const minutesNow = time.hour * 60 + time.minute;
    const minutesToNight = ((NIGHT_FROM * 60 - minutesNow) % 1440 + 1440) % 1440;
    const when =
      minutesToNight < 60
        ? 'меньше часа'
        : minutesToNight % 60 === 0
          ? `через ${minutesToNight / 60} ч`
          : `через ${Math.floor(minutesToNight / 60)} ч ${minutesToNight % 60} мин`;

    return {
      ok: false,
      blocked: 'not_night',
      title: 'Приходите ночью',
      text: `Сейчас ${PHASE_LABEL[time.phase].toLowerCase()}, ${time.label} — фонари, камеры и смена. Ночь начнётся в ${hourLabel(NIGHT_FROM)}, ${when}. Склад открыт с ${hourLabel(NIGHT_FROM)} до ${hourLabel(NIGHT_TO)}.`,
    };
  }

  return {
    ok: true,
    blocked: null,
    title: 'Склад вскрыт',
    text: 'Замок снят. Сколько именно удалось унести — покажет бд, забираем дальше.',
  };
}

/**
 * Отсутствие функции в схеме — это состояние базы, а не сбой попытки:
 * миграция ещё не применена. Такое сообщение полезно увидеть один раз,
 * а не на каждом нажатии, поэтому повторы заглушаем.
 */
let missingFunctionWarned = false;

/** Ответ базы — либо `ok: true` с количеством, либо код отказа из
 *  describeBlocked. Неизвестный код и ошибка сети дают 'unavailable':
 *  игроку незачем видеть текст ошибки PostgREST, а в консоль он
 *  попадёт для разбора.
 */
export async function stealMaterials(
  playerId: string | null | undefined
): Promise<StealMaterialsResult> {
  if (!playerId) return blocked('unknown_player');

  const { data, error } = await supabase.rpc('steal_materials', { p_player_id: playerId });

  if (error) {
    // PGRST202 / 404: PostgREST не нашёл функцию. Почти всегда это
    // значит, что materials_steal_migration.sql не применён.
    const code = (error as { code?: string }).code;
    if (code === 'PGRST202' || code === '404') {
      if (!missingFunctionWarned) {
        missingFunctionWarned = true;
        console.warn(
          '[militaryBase] Функция steal_materials не найдена в базе — примените ' +
            'supabase/migrations/materials_steal_migration.sql'
        );
      }
    } else {
      console.error('[militaryBase] Кража не сработала:', error);
    }
    return blocked('unavailable');
  }

  const res = (data ?? {}) as {
    ok?: boolean;
    blocked?: string;
    amount?: number;
    retry_in_minutes?: number;
  };

  if (!res.ok) {
    const code = res.blocked as StealMaterialsBlock | undefined;
    // Код, которого мы не знаем, — это расхождение версий клиента и
    // базы. Показывать 'unavailable' безопаснее, чем печатать в UI
    // строку, которую никто не переводил.
    return blocked(code && KNOWN_BLOCKS.has(code) ? code : 'unavailable', {
      retryInMinutes: res.retry_in_minutes,
    });
  }

  const amount = Number(res.amount ?? 0);
  return {
    ok: true,
    blocked: null,
    amount,
    title: 'Склад вскрыт',
    text: `Унесли ${amount} ${plural(amount, 'материал', 'материала', 'материалов')}. Теперь это пригодится банде на оружие.`,
  };
}

/** Русские окончания: 1 материал, 2 материала, 5 материалов. */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}