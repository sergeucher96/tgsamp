/**
 * Войны банд за территории, по модели SAMP.
 *
 * Как это работает:
 *   1. Банда с рангом 8+ объявляет войну на чужую или нейтральную
 *      территорию. Списывается WAR_CONFIG.cost из общего склада,
 *      территория переходит в статус WAR_ACTIVE на 5 минут.
 *   2. На карте у территории появляется значок войны. Клик по нему
 *      открывает окно с таймером и кнопкой «Участвовать».
 *   3. Каждое нажатие «Участвовать» открывает интервал в
 *      war_sessions. Кнопка «Выйти» его закрывает. Длительность
 *      считает представление war_session_scores на стороне БД.
 *   4. Очки банды = сумма (ранг участника × минуты участия).
 *   5. По истечении 5 минут побеждает банда с бо́льшим счётом.
 *      При равенстве побеждает атакующий, и территория переходит
 *      к ней.
 *
 * Про длительность участия: клиент присылает только факты входа и
 * выхода, а длительность считает сама база из своих timestamps.
 * Поэтому «побыть в войне 4 минуты» нельзя задекларировать.
 * Очки всё равно суммируются в SQL — см. fetchWarScores.
 */

import { supabase } from '../../services/supabase/client';
import { WAR_CONFIG, warPointsFor } from '../../features/gangs/data/organizationsConfig';

export interface War {
  id: number;
  territory_id: number;
  attacker_gang_id: string;
  defender_gang_id: string | null;
  status: 'WAR_ACTIVE' | 'ENDED' | 'CANCELLED';
  started_at: string | null;
  ends_at: string | null;
  /** Когда война закончилась по факту. Не совпадает с ends_at,
   *  если она завершилась досрочно. */
  ended_at: string | null;
  attacker_score: number;
  defender_score: number;
  started_by: string | null;
  winner_gang_id: string | null;
}

export interface WarSession {
  id: number;
  war_id: number;
  player_id: string;
  gang_id: string;
  rank_number: number;
  joined_at: string;
  left_at: string | null;
  seconds: number | string | null;
}

export interface GangScore {
  gang_id: string;
  score: number;
  seconds: number;
  players: number;
}

export interface WarScores {
  attacker: GangScore | null;
  defender: GangScore | null;
  /** У кого больше очков; при равенстве — атакующий */
  leader: string | null;
  isTie: boolean;
}

/**
 * Результат операции — плоский тип с необязательным reason.
 * Так проще, чем union с литеральным ok: суррогат считывает
 * result.reason сразу после проверки, без хрупкого сужения.
 */
export interface StartWarResult {
  ok: boolean;
  reason?: string;
  war?: War;
}

export interface JoinWarResult {
  ok: boolean;
  reason?: string;
}

const num = (value: number | string | null | undefined): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Сколько миллисекунд осталось до конца войны. */
export function warTimeLeftMs(war: Pick<War, 'ends_at'>, now = Date.now()): number {
  if (!war.ends_at) return 0;
  return Math.max(0, new Date(war.ends_at).getTime() - now);
}

export function isWarFinished(war: Pick<War, 'ends_at'>, now = Date.now()): boolean {
  return warTimeLeftMs(war, now) <= 0;
}

/**
 * Активные войны. Одновременно на Territory их быть не может,
 * поэтому вкладка в списке территорий и есть «значки войны».
 */
export async function fetchActiveWars(): Promise<War[]> {
  const { data, error } = await supabase
    .from('wars')
    .select('*')
    .eq('status', 'WAR_ACTIVE');

  if (error) {
    console.error('Не удалось загрузить войны:', error.message);
    return [];
  }
  return (data ?? []) as War[];
}

/**
 * Очки каждой стороны.
 *
 * Одна строка war_sessions — один заход. Заходов у игрока может
 * быть сколько угодно, очки каждого суммируются, поэтому
 * «зашёл-вышел-зашёл» не обнуляет уже набранное.
 */
export async function fetchWarScores(war: Pick<War, 'id' | 'attacker_gang_id' | 'defender_gang_id'>): Promise<WarScores> {
  // Читаем представление, а не таблицу: длительность участия
  // считает база. Генерируемой колонкой это сделать нельзя —
  // для GENERATED нужен IMMUTABLE, а now() им не является.
  const { data, error } = await supabase
    .from('war_session_scores')
    .select('gang_id, player_id, rank_number, seconds, points_per_min')
    .eq('war_id', war.id);

  if (error) {
    // Представление в базе ещё старое, без points_per_min: миграция
    // не применена. Запрос с этой колонкой не проходит, и без откатного
    // запроса война выглядела бы как полная ничья, потому что очки не
    // считали бы вообще.
    console.warn('Представление без points_per_min, считаю по номеру ранга:', error.message);
    const fallback = await supabase
      .from('war_session_scores')
      .select('gang_id, player_id, rank_number, seconds')
      .eq('war_id', war.id);
    if (fallback.error) {
      console.error('Не удалось посчитать очки войны:', fallback.error.message);
      return { attacker: null, defender: null, leader: null, isTie: false };
    }
    return sumWarScores(
      (fallback.data ?? []) as {
        gang_id: string;
        player_id: string;
        rank_number: number;
        seconds: number | string | null;
      }[],
      war
    );
  }

  const rows = (data ?? []) as {
    gang_id: string;
    player_id: string;
    rank_number: number;
    seconds: number | string | null;
    points_per_min: number | string | null;
  }[];

  return sumWarScores(rows, war);
}

/** Сложить очки по бандам. Множитель ранга берётся из представления, а
 *  при его отсутствии — из номера ранга, как считали до настройки. */
function sumWarScores(
  rows: {
    gang_id: string;
    player_id: string;
    rank_number: number;
    seconds: number | string | null;
    points_per_min?: number | string | null;
  }[],
  war: Pick<War, 'attacker_gang_id' | 'defender_gang_id'>
): WarScores {
  const perGang = new Map<string, { score: number; seconds: number; players: Set<string> }>();
  for (const row of rows) {
    const seconds = Math.max(0, num(row.seconds));
    const acc = perGang.get(row.gang_id) ?? { score: 0, seconds: 0, players: new Set<string>() };
    // Множитель задаёт редактор рангов и приходит из представления.
    // Если его нет — падаем на номер ранга, как считали раньше.
    const perMin = row.points_per_min === null || row.points_per_min === undefined
      ? row.rank_number
      : num(row.points_per_min);
    acc.score += warPointsFor(perMin, seconds);
    acc.seconds += seconds;
    acc.players.add(row.player_id);
    perGang.set(row.gang_id, acc);
  }

  const toScore = (gangId: string | null): GangScore | null => {
    if (!gangId) return null;
    const acc = perGang.get(gangId);
    if (!acc) return { gang_id: gangId, score: 0, seconds: 0, players: 0 };
    return { gang_id: gangId, score: acc.score, seconds: acc.seconds, players: acc.players.size };
  };

  const attacker = toScore(war.attacker_gang_id);
  const defender = toScore(war.defender_gang_id);

  const attackerScore = attacker?.score ?? 0;
  const defenderScore = defender?.score ?? 0;
  // При равенстве (в том числе когда не участвовал никто) побеждает
  // атакующий — так решили при проектировании.
  const isTie = attackerScore === defenderScore;
  const leader = isTie ? war.attacker_gang_id : attackerScore > defenderScore ? war.attacker_gang_id : war.defender_gang_id;

  return { attacker, defender, leader, isTie };
}

/** Номер ранга игрока в его банде, 1…10. 0 — ранга нет. */
export async function fetchPlayerRankNumber(gangId: string, rankName: string | null): Promise<number> {
  if (!rankName) return 0;
  const { data, error } = await supabase
    .from('org_ranks')
    .select('rank_number')
    .eq('org_id', gangId)
    .eq('rank_name', rankName)
    .maybeSingle();

  if (error) {
    console.error('Не удалось получить ранг игрока:', error.message);
    return 0;
  }
  return num((data as { rank_number: number | null } | null)?.rank_number);
}

/**
 * Сколько очков в минуту даёт ранг игрока.
 *
 * Это org_ranks.war_points_per_min — настраивается в редакторе
 * рангов. Если колонки ещё нет (миграция не применена), отдаём
 * номер ранга: раньше очки считались именно так, и молчаливые
 * нули сломали бы подсчёт очков у всех.
 */
export async function fetchPlayerWarPoints(gangId: string, rankName: string | null): Promise<number> {
  if (!rankName) return 0;
  const { data, error } = await supabase
    .from('org_ranks')
    .select('war_points_per_min, rank_number')
    .eq('org_id', gangId)
    .eq('rank_name', rankName)
    .maybeSingle();

  if (error) {
    // Колонки ещё нет — миграция не применена в этой базе. Запрос с ней
    // падает целиком, поэтому номер ранга берём отдельным запросом:
    // без этого очки в войне у всех были бы нулевыми, и война
    // заканчивалась бы вничью независимо от участия.
    console.warn('Не удалось получить множитель очков, беру номер ранга:', error.message);
    const fallback = await supabase
      .from('org_ranks')
      .select('rank_number')
      .eq('org_id', gangId)
      .eq('rank_name', rankName)
      .maybeSingle();
    if (fallback.error) {
      console.error('Не удалось получить и номер ранга:', fallback.error.message);
      return 0;
    }
    return num((fallback.data as { rank_number: number | null } | null)?.rank_number);
  }
  const row = data as { war_points_per_min: number | null; rank_number: number | null } | null;
  const points = num(row?.war_points_per_min);
  return points > 0 ? points : num(row?.rank_number);
}

/** Почему сервер отказал в объявлении войны. */
export type DeclareWarBlock =
  | 'unknown_player'
  | 'unknown_territory'
  | 'not_gang'
  | 'no_rank'
  | 'low_rank'
  | 'territory_busy'
  | 'own_territory'
  | 'cooldown'
  | 'not_enough_money'
  | 'unavailable';

const DECLARE_TEXTS: Record<DeclareWarBlock, string> = {
  unknown_player: 'Профиль не найден.',
  unknown_territory: 'Территория не найдена.',
  not_gang: 'Воевать могут только уличные банды.',
  no_rank: 'У вас не назначен ранг в банде.',
  low_rank: `Объявить войну может участник с рангом ${WAR_CONFIG.canStartWarMinRank} или выше.`,
  territory_busy: 'За эту территорию уже воюют. Дождитесь окончания текущей войны.',
  own_territory: 'Это уже ваша территория.',
  cooldown: 'По этой территории у банды недавно была война. Подождите окончания перезарядки.',
  not_enough_money: 'В общем складе банды недостаточно средств на войну.',
  unavailable: 'Не удалось объявить войну. Попробуйте позже.',
};

/**
 * Объявить войну за территорию.
 *
 * Всё решение принимает база (declare_war): ранг, деньги,
 * перезарядка и занятость территории. Отсюда приходят только
 * id игрока и id территории — банду и ранг база берёт из
 * org_members сама.
 *
 * Почему раньше было плохо. Проверки стояли здесь, в браузере,
 * и каждая была отдельным запросом: посмотреть занятость →
 * вставить строку войны → обновить зону. Два объявления,
 * отправленные почти одновременно (два лидера, две вкладки), оба
 * видели «занято 1 банду из maxGangsPerWar» и оба вставляли.
 * Дальше на зоне было две строки WAR_ACTIVE: два значка ⚔️ в
 * одной точке карты, интерфейс показывал счёт первой войны,
 * а считалась вторая, и владельца зоны назначал тот, кто дольше
 * грузил страницу. Плюс стоимость списывалась отдельным запросом
 * уже после вставки, так что при нехватке денег война всё равно
 * начиналась.
 *
 * Теперь проверка и вставка — одна транзакция с блокировкой
 * строки территории, а поверх стоит частичный уникальный индекс
 * idx_wars_single_active_per_territory. Обойти это из браузера
 * нельзя: RLS на wars открыт, но индекс проверяется базой всегда.
 */
export async function startWar(playerId: string, territoryId: number): Promise<StartWarResult> {
  const { data, error } = await supabase.rpc('declare_war', {
    p_player_id: playerId,
    p_territory_id: territoryId,
  });

  if (error || !data) {
    console.error('Не удалось объявить войну:', error?.message ?? 'пустой ответ');
    return { ok: false, reason: DECLARE_TEXTS.unavailable };
  }

  const res = data as { ok?: boolean; blocked?: string; rank?: number };

  if (!res.ok) {
    const code = res.blocked as DeclareWarBlock | undefined;
    const text = code && code in DECLARE_TEXTS ? DECLARE_TEXTS[code] : DECLARE_TEXTS.unavailable;

    // Свой ранг игрок знает и сам, а вот точную сумму недоступных
    // денег — нет: её считает сервер.
    if (code === 'low_rank') {
      return { ok: false, reason: `${text} У вас ранг ${res.rank ?? '—'}.` };
    }
    if (code === 'not_enough_money') {
      return { ok: false, reason: `Война стоит $${WAR_CONFIG.cost.toLocaleString()}. ${DECLARE_TEXTS.not_enough_money}` };
    }
    return { ok: false, reason: text };
  }

  return { ok: true };
}

/**
 * Открыть интервал участия.
 *
 * Длительность считает база: клиент не присылает ни секунд,
 * ни очков, только факт входа. Ранг тоже фиксируется здесь,
 * чтобы смена ранга посреди войны ничего не накручивала.
 */
export async function joinWar(warId: number, playerId: string, gangId: string, rankNumber: number): Promise<JoinWarResult> {
  if (rankNumber < 1) {
    return { ok: false, reason: 'У вас не назначен ранг в банде.' };
  }

  const { data: war } = await supabase
    .from('wars')
    .select('id, status, ends_at, attacker_gang_id, defender_gang_id')
    .eq('id', warId)
    .maybeSingle();

  if (!war) return { ok: false, reason: 'Война не найдена.' };
  if ((war as { status: string }).status !== 'WAR_ACTIVE') {
    return { ok: false, reason: 'Война уже закончилась.' };
  }
  if (isWarFinished(war as { ends_at: string })) {
    return { ok: false, reason: 'Война уже закончилась.' };
  }

  // Участвовать можно только в своей войне
  const w = war as { attacker_gang_id: string; defender_gang_id: string | null };
  if (gangId !== w.attacker_gang_id && gangId !== w.defender_gang_id) {
    return { ok: false, reason: 'Ваша банда не участвует в этой войне.' };
  }

  const { error } = await supabase.from('war_sessions').insert({
    war_id: warId,
    player_id: playerId,
    gang_id: gangId,
    rank_number: rankNumber,
  });

  // 23505 = уже есть незакрытая сессия, игрок уже участвует
  if (error && error.code !== '23505') {
    return { ok: false, reason: `Не удалось начать участие: ${error.message}` };
  }

  return { ok: true };
}

/** Закрыть интервал участия. Повторный вызов безопасен. */
export async function leaveWar(warId: number, playerId: string): Promise<JoinWarResult> {
  const { error } = await supabase
    .from('war_sessions')
    .update({ left_at: new Date().toISOString() })
    .eq('war_id', warId)
    .eq('player_id', playerId)
    .is('left_at', null);

  if (error) {
    return { ok: false, reason: `Не удалось выйти из войны: ${error.message}` };
  }
  return { ok: true };
}

/**
 * Закрывает все открытые сессии войны.
 *
 * Сессии закрывает база в settle_war — до подсчёта очков, иначе
 * открытая сессия посчиталась бы по now(), а закрытая по
 * left_at, и очки двух банд считались бы по разным моментам.
 * Эта функция осталась для выхода из участия вручную (leaveWar)
 * и как запасной путь, если RPC недоступен.
 */
export async function closeOpenSessions(warId: number): Promise<void> {
  await supabase
    .from('war_sessions')
    .update({ left_at: new Date().toISOString() })
    .eq('war_id', warId)
    .is('left_at', null);
}

export interface SettleWarResult {
  ok: boolean;
  winnerGangId: string | null;
  isTie: boolean;
  reason?: string;
}

/**
 * Подвести итоги войны и отдать территорию победителю.
 *
 * Теперь это делает база (settle_war): подсчёт очков, закрытие
 * сессий, смена владельца зоны и влияние — одна транзакция.
 *
 * Что было не так в клиентской версии:
 *
 *  * Итоги можно было подвести досрочно. ends_at присылал сам
 *    клиент вместе с войной, и проверка isWarFinished тоже
 *    выполнялась на его часах. Вызвав settleWar сразу после
 *    объявления, можно было получить победу с нулём очков.
 *    Теперь not_finished проверяет серверное now() против
 *    ends_at, который тоже записала база.
 *
 *  * Владельца зоны назначал последний по времени запрос. При
 *    двух войнах за одну территорию исход определяло то, кто дольше
 *    грузил страницу. Теперь запись войны защищена частичным
 *    уникальным индексом, а settle_war берёт строку войны на
 *    FOR UPDATE: двое подводящие итоги разом не могут посчитать
 *    очки по разным моментам.
 *
 *  * already_settled — нормальный исход, а не ошибка: тик у
 *    каждого клиента свой, и первым до финала дойдёт один.
 */
export async function settleWar(warId: number): Promise<SettleWarResult> {
  const { data, error } = await supabase.rpc('settle_war', { p_war_id: warId });

  if (error || !data) {
    console.error(`Не удалось подвести итоги войны #${warId}:`, error?.message ?? 'пустой ответ');
    return { ok: false, winnerGangId: null, isTie: false, reason: error?.message ?? 'нет ответа' };
  }

  const res = data as {
    ok?: boolean;
    blocked?: string;
    winner_gang_id?: string | null;
    is_tie?: boolean;
  };

  // already_settled и not_finished — не сбой. В первом случае
  // итоги уже подвёл другой клиент, во втором время ещё есть.
  // Оба случая сообщаем успехом с тем победителем, что вернула
  // база, чтобы показать игроку верный итог.
  if (!res.ok) {
    const settled = res.blocked === 'already_settled' || res.blocked === 'not_finished';
    return {
      ok: settled,
      winnerGangId: res.winner_gang_id ?? null,
      isTie: res.is_tie ?? false,
      reason: settled ? res.blocked : res.blocked ?? 'неизвестная ошибка',
    };
  }

  return {
    ok: true,
    winnerGangId: res.winner_gang_id ?? null,
    isTie: res.is_tie ?? false,
  };
}
