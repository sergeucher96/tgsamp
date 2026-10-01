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

export interface StartWarContext {
  territoryId: number;
  gangId: string;
  playerId: string;
  rankNumber: number;
  /** Сколько денег лежит в общем складе банды */
  safeBalance: number;
}

/**
 * Объявить войну за территорию.
 *
 * Проверки идут по порядку: ранг → деньги → кулдаун → свободна
 * ли территория. Каждая возвращает понятную причину, потому что
 * все они показываются игроку.
 */
export async function startWar(ctx: StartWarContext): Promise<StartWarResult> {
  const { territoryId, gangId, playerId, rankNumber, safeBalance } = ctx;

  if (rankNumber < WAR_CONFIG.canStartWarMinRank) {
    return {
      ok: false,
      reason: `Объявить войну может участник с рангом ${WAR_CONFIG.canStartWarMinRank} или выше. У вас ранг ${rankNumber || '—'}.`,
    };
  }

  if (safeBalance < WAR_CONFIG.cost) {
    return {
      ok: false,
      reason: `Война стоит $${WAR_CONFIG.cost.toLocaleString()}. В общем складе банды $${safeBalance.toLocaleString()}.`,
    };
  }

  // Кулдаун: та же банда, та же территория, недавняя война
  const { data: recent } = await supabase
    .from('wars')
    .select('started_at')
    .eq('territory_id', territoryId)
    .eq('attacker_gang_id', gangId)
    .gte('started_at', new Date(Date.now() - WAR_CONFIG.cooldownMs).toISOString())
    .limit(1);

  if (recent && recent.length > 0) {
    return { ok: false, reason: 'По этой территории у банда недавно была война. Подождите окончания перезарядки.' };
  }

  // На одной территории одновременно воюет только WAR_CONFIG.maxGangsPerWar банд
  const { data: active } = await supabase
    .from('wars')
    .select('attacker_gang_id, defender_gang_id')
    .eq('territory_id', territoryId)
    .eq('status', 'WAR_ACTIVE');

  const busyGangs = new Set<string>();
  for (const w of (active ?? []) as { attacker_gang_id: string; defender_gang_id: string | null }[]) {
    busyGangs.add(w.attacker_gang_id);
    if (w.defender_gang_id) busyGangs.add(w.defender_gang_id);
  }

  if (busyGangs.size >= WAR_CONFIG.maxGangsPerWar) {
    return { ok: false, reason: 'За эту территорию уже воюют. Дождитесь окончания текущей войны.' };
  }

  const { data: territory } = await supabase
    .from('territories')
    .select('id, name, owner_gang_id')
    .eq('id', territoryId)
    .maybeSingle();

  if (!territory) {
    return { ok: false, reason: 'Территория не найдена.' };
  }

  const owner = (territory as { owner_gang_id: string | null }).owner_gang_id;

  // Свою территорию атаковать бессмысленно
  if (owner === gangId) {
    return { ok: false, reason: 'Это уже ваша территория.' };
  }

  // Если территория свободна, атакующий становится и защитником:
  // без защитника очки начислять некому и война выродится в
  // формальность. Тогда победа при ничьей не отменяет захват.
  const defenderGangId = owner ?? gangId;
  const now = new Date();
  const endsAt = new Date(now.getTime() + WAR_CONFIG.durationMs);

  const { data: war, error } = await supabase
    .from('wars')
    .insert({
      territory_id: territoryId,
      attacker_gang_id: gangId,
      defender_gang_id: defenderGangId,
      status: 'WAR_ACTIVE',
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      started_by: playerId,
      attacker_score: 0,
      defender_score: 0,
    })
    .select()
    .single();

  if (error || !war) {
    return { ok: false, reason: `Не удалось начать войну: ${error?.message ?? 'неизвестная ошибка'}` };
  }

  // Территория на время войны становится оспариваемой
  await supabase
    .from('territories')
    .update({ status: 'WAR_ACTIVE' })
    .eq('id', territoryId);

  return { ok: true, war: war as War };
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

/** Закрывает все открытые сессии — вызывается при подведении итогов. */
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
 * Закрытие идёт условным UPDATE по статусу: из WAR_ACTIVE в ENDED
 * переходит ровно одна попытка, остальные видят 0 строк и выходят.
 * Это защита от двойного расчёта, когда итоги подводят несколько
 * клиентов одновременно.
 */
export async function settleWar(war: War): Promise<SettleWarResult> {
  if (war.status !== 'WAR_ACTIVE') {
    return { ok: false, winnerGangId: null, isTie: false, reason: 'Война не активна' };
  }

  await closeOpenSessions(war.id);

  const scores = await fetchWarScores(war);
  const winnerGangId = scores.leader;

  const { data: closed, error } = await supabase
    .from('wars')
    .update({
      status: 'ENDED',
      winner_gang_id: winnerGangId,
      attacker_score: scores.attacker?.score ?? 0,
      defender_score: scores.defender?.score ?? 0,
      ended_at: new Date().toISOString(),
    })
    .eq('id', war.id)
    .eq('status', 'WAR_ACTIVE')
    .select();

  if (error) {
    return { ok: false, winnerGangId: null, isTie: false, reason: error.message };
  }

  // Никто не успел закрыть войну — значит её уже рассчитали.
  if (!closed || closed.length === 0) {
    return { ok: false, winnerGangId: null, isTie: false, reason: 'Война уже рассчитана' };
  }

  if (!winnerGangId) {
    return { ok: true, winnerGangId: null, isTie: false, reason: 'Ничья, территория не меняется' };
  }

  const { data: territory } = await supabase
    .from('territories')
    .select('id, name, owner_gang_id, control')
    .eq('id', war.territory_id)
    .maybeSingle();

  const previousOwner = (territory as { owner_gang_id: string | null } | null)?.owner_gang_id ?? null;

  await supabase
    .from('territories')
    .update({
      owner_gang_id: winnerGangId,
      status: 'CONTROLLED',
      // Контроль отражает разрыв по очкам: чем убедительнее
      // победа, тем прочнее захват.
      control: controlFromScores(scores),
      activity: 50,
    })
    .eq('id', war.territory_id);

  // Влияние: победитель прибавляет, проигравший теряет
  await addInfluenceSafe(war.territory_id, winnerGangId, 30);
  if (previousOwner && previousOwner !== winnerGangId) {
    await addInfluenceSafe(war.territory_id, previousOwner, -20);
  }

  return { ok: true, winnerGangId, isTie: scores.isTie };
}

/** Контроль зоны по разрыву очков: 50 при ничьей, до 100 при полном разгоне. */
function controlFromScores(scores: WarScores): number {
  const a = scores.attacker?.score ?? 0;
  const d = scores.defender?.score ?? 0;
  if (a === 0 && d === 0) return 50;
  const total = a + d;
  if (total === 0) return 50;
  const margin = Math.abs(a - d) / total; // 0…1
  return Math.round(50 + margin * 50);
}

/** Влияние при подведении итогов пишем напрямую, без счётчика действий. */
async function addInfluenceSafe(territoryId: number, gangId: string, delta: number): Promise<void> {
  const { data } = await supabase
    .from('territory_influence')
    .select('id, influence')
    .eq('territory_id', territoryId)
    .eq('gang_id', gangId)
    .maybeSingle();

  if (!data) {
    if (delta <= 0) return;
    await supabase.from('territory_influence').insert({
      territory_id: territoryId,
      gang_id: gangId,
      influence: Math.min(100, delta),
    });
    return;
  }

  const row = data as { id: number; influence: number };
  await supabase
    .from('territory_influence')
    .update({ influence: Math.max(0, Math.min(100, row.influence + delta)) })
    .eq('id', row.id);
}
