import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle, RotateCcw, Loader2, Swords, FlaskConical } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { usePlayerStore } from '../../stores/usePlayerStore';
// Боевые типы и разбор кадра живут в types.ts, а рисование — в
// FightResultModal. Дублировать их здесь было бы ровно тем
// расхождением, из-за которого два экрана потом показывают разный
// бой одними и теми же данными.
import {
  presentFight,
  type Actor,
  type FighterSnapshot,
  type FightEvent,
} from './types';
import { FightComic } from './FightResultModal';

interface PvpTestMenuProps { onClose: () => void; }

/** Сырой ответ сервера: то, что приходит из RPC без обработки. */
interface FightResult {
  ok: boolean;
  seed: number;
  rounds: number;
  winner: Actor;
  attacker_name: string;
  defender_name: string;
  attacker_icon: string;
  defender_icon: string;
  attacker_hp: number;
  defender_hp: number;
  attacker_hp_max: number;
  defender_hp_max: number;
  log: FightEvent[];
  fight_id?: number;
  kind?: 'pvp' | 'npc';
  won?: boolean;
  npc_key?: string;
  attacker_snapshot?: FighterSnapshot;
  defender_snapshot?: FighterSnapshot;
}

interface NpcRow {
  key: string;
  username: string;
  tier: string;
  min_rating: number;
  lvl: number;
  weapon_name: string;
  weapon_icon: string;
  available: boolean;
  locked_reason: string | null;
}

interface ProbeResult {
  runs: number;
  wins_a: number;
  wins_d: number;
  win_rate_a: number;
  bias_margin: number;
  equivalent: boolean;
  avg_rounds: number;
  max_rounds: number;
  actions: { attack: number; heavy: number; block: number; dodge: number; heal: number };
  crits: number;
  misses: number;
  blocked: number;
  verdict: 'ok' | 'strength_differs' | 'side_bias_attacker' | 'side_bias_defender';
}

interface OpponentRow {
  id: string;
  username: string;
  lvl: number | null;
  rating: number | null;
}

/**
 * Инварианты снимка — те же, что проверяет npm run check:fighter.
 * Дублируются здесь сознательно: тот скрипт падает молча, если
 * миграция ещё не применена, и в меню результат виден сразу.
 */
const INVARIANTS: Array<{
  key: keyof FighterSnapshot;
  label: string;
  test: (v: number) => boolean;
  why: string;
}> = [
  { key: 'max_hp', label: 'max_hp >= 100', test: v => v >= 100, why: 'базовые 100 не могут пропасть' },
  { key: 'attack', label: 'attack >= 1', test: v => v >= 1, why: 'иначе боец не наносит урон' },
  { key: 'defense', label: 'defense >= 0', test: v => v >= 0, why: 'защита не бывает отрицательной' },
  { key: 'luck', label: 'luck >= 0', test: v => v >= 0, why: 'удача не бывает отрицательной' },
  { key: 'armor', label: 'armor <= 300', test: v => v <= 300, why: 'потолок брони в снимке' },
  { key: 'mitigation', label: 'mitigation в (0;1]', test: v => v > 0 && v <= 1, why: 'броня и её отсутствие' },
  { key: 'power', label: 'power > 0', test: v => v > 0, why: 'итоговая мощь считается' },
];

/** Синтетический боец для проверки честности боя. */
function synth(name: string): FighterSnapshot {
  return {
    ok: true,
    player_id: null,
    username: name,
    lvl: 1,
    skill: 0,
    max_hp: 100,
    attack: 10,
    defense: 3,
    luck: 3,
    armor: 0,
    stamina: 10,
    strength: 10,
    speed: 10,
    mitigation: 1,
    power: 100,
    weapon: { item_key: null, name: 'Кулаки', icon: '👊', damage: 0 },
    equipment: [],
  };
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-black text-slate-200">{value}</span>
    </div>
  );
}

export default function PvpTestMenu({ onClose }: PvpTestMenuProps) {
  const player = usePlayerStore((s) => s.player);
  const playerId = player?.id;

  const [tab, setTab] = useState<'me' | 'npc' | 'player' | 'balance' | 'log'>('me');

  const [snapshot, setSnapshot] = useState<FighterSnapshot | null>(null);
  const [npcs, setNpcs] = useState<NpcRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentRow[]>([]);
  const [result, setResult] = useState<FightResult | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [probeRuns, setProbeRuns] = useState(200);
  const [probeSeed, setProbeSeed] = useState(1);
  const [probeMode, setProbeMode] = useState<'equal' | 'mirror' | 'npc'>('equal');
  const [selectedNpc, setSelectedNpc] = useState<string>('');
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');

  const fail = (e: any, what: string) => {
    // Текст ошибки PostgREST различает «нет функции», «нет таблицы»
    // и «нет прав». Здесь это разные починенные вещи, поэтому
    // подсказку даём прямо в сообщении.
    const raw = e?.message ?? String(e);
    let hint = '';
    if (/does not exist/i.test(raw)) hint = ' — проверьте, что применены миграции pvp_*';
    else if (/permission denied|row-level security/i.test(raw)) hint = ' — нет прав на роль';
    setMessage({ text: `${what}: ${raw}${hint}`, kind: 'error' });
  };

  // ---------------------------------------------------------------- снимок

  const loadSnapshot = useCallback(async () => {
    if (!playerId) return;
    setBusy('me');
    setMessage(null);
    const { data, error } = await supabase.rpc('pvp_fighter_snapshot', { p_player_id: playerId });
    if (error) { fail(error, 'Не удалось посчитать снимок'); setSnapshot(null); }
    else setSnapshot((data ?? null) as FighterSnapshot | null);
    setBusy(null);
  }, [playerId]);

  const loadNpcs = useCallback(async () => {
    if (!playerId) return;
    const { data, error } = await supabase.rpc('pvp_npc_available', {
      p_player_id: playerId, p_tier: null,
    });
    if (error) fail(error, 'Не удалось получить список NPC');
    else {
      const list = (data ?? []) as NpcRow[];
      setNpcs(list);
      setSelectedNpc(prev => prev || list.find(n => n.available)?.key || list[0]?.key || '');
    }
  }, [playerId]);

  const loadOpponents = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, lvl')
      .neq('id', playerId ?? '')
      .order('username')
      .limit(60);
    if (error) { fail(error, 'Не удалось получить игроков'); return; }

    const list = (data ?? []) as Array<{ id: string; username: string; lvl: number | null }>;

    // Рейтинги читаются отдельно и могут быть недоступны: таблица
    // появится только после pvp_fight_migration.sql. Отсутствие
    // рейтинга — не повод не показывать соперников.
    let ratings: Record<string, number> = {};
    try {
      const r = await supabase.from('pvp_ratings').select('player_id, rating');
      if (!r.error && r.data) {
        ratings = Object.fromEntries(r.data.map(x => [x.player_id, x.rating]));
      }
    } catch { /* таблицы ещё нет — не мешает */ }

    const withRating: OpponentRow[] = list.map(p => ({
      id: p.id, username: p.username, lvl: p.lvl, rating: ratings[p.id] ?? null,
    }));
    setOpponents(withRating);
    setSelectedOpponent(prev => prev || withRating[0]?.id || '');
  }, [playerId]);

  const loadHistory = useCallback(async () => {
    if (!playerId) return;
    const rows: any[] = [];
    try {
      const pvp = await supabase
        .from('pvp_fights')
        .select('id, seed, winner_id, rounds, created_at, challenger_id, defender_id')
        .or(`challenger_id.eq.${playerId},defender_id.eq.${playerId}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!pvp.error && pvp.data) {
        rows.push(...pvp.data.map(r => ({
          kind: 'pvp', id: r.id, seed: r.seed, rounds: r.rounds,
          created_at: r.created_at,
          won: r.winner_id === playerId,
          foe: r.challenger_id === playerId ? r.defender_id : r.challenger_id,
        })));
      }
    } catch { /* pvp_fights может быть ещё нет */ }

    try {
      const npc = await supabase
        .from('pvp_npc_fights')
        .select('id, seed, rounds, created_at, npc_key, player_won')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!npc.error && npc.data) {
        rows.push(...npc.data.map(r => ({
          kind: 'npc', id: r.id, seed: r.seed, rounds: r.rounds,
          created_at: r.created_at, won: r.player_won, foe: r.npc_key,
        })));
      }
    } catch { /* pvp_npc_fights может быть ещё нет */ }

    rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    setHistory(rows);
  }, [playerId]);

  useEffect(() => {
    loadSnapshot();
    loadNpcs();
  }, [loadSnapshot, loadNpcs]);

  useEffect(() => {
    if (tab === 'player' && opponents.length === 0) loadOpponents();
    if (tab === 'log') loadHistory();
  }, [tab, opponents.length, loadOpponents, loadHistory]);

  // ------------------------------------------------------------------ бои

  const fightNpc = async () => {
    if (!playerId || !selectedNpc) return;
    setBusy('fight');
    setMessage(null);
    const { data, error } = await supabase.rpc('pvp_resolve_npc', {
      p_player_id: playerId, p_npc_key: selectedNpc,
    });
    if (error) fail(error, 'Бой не состоялся');
    else {
      setResult((data ?? null) as FightResult | null);
      setMessage({
        text: `Бой против NPC сыгран: ${data?.won ? 'победа' : 'поражение'}`,
        kind: 'ok',
      });
    }
    setBusy(null);
  };

  const fightPlayer = async () => {
    if (!playerId || !selectedOpponent) return;
    setBusy('fight');
    setMessage(null);
    const { data, error } = await supabase.rpc('pvp_resolve_player', {
      p_challenger_id: playerId, p_defender_id: selectedOpponent,
    });
    if (error) fail(error, 'Бой не состоялся');
    else {
      setResult((data ?? null) as FightResult | null);
      setMessage({ text: `Бой сыгран: ${data?.won ? 'победа' : 'поражение'}`, kind: 'ok' });
    }
    setBusy(null);
  };

  // --------------------------------------------------------------- баланс

  const runProbe = async () => {
    if (!snapshot) { setMessage({ text: 'Сначала почините снимок бойца', kind: 'error' }); return; }
    setBusy('probe');
    setMessage(null);
    setProbe(null);

    let a: FighterSnapshot;
    let b: FighterSnapshot;
    if (probeMode === 'equal') { a = synth('Боец А'); b = synth('Боец Б'); }
    else if (probeMode === 'mirror') { a = snapshot; b = { ...snapshot, player_id: null }; }
    else {
      const npc = npcs.find(n => n.key === selectedNpc);
      if (!npc) { setBusy(null); return; }
      const { data, error } = await supabase.rpc('pvp_npc_snapshot', { p_npc_key: npc.key });
      if (error) { fail(error, 'Не удалось получить снимок NPC'); setBusy(null); return; }
      a = snapshot;
      b = data as FighterSnapshot;
    }

    const { data, error } = await supabase.rpc('pvp_balance_probe', {
      p_attacker: a, p_defender: b, p_runs: probeRuns, p_base_seed: probeSeed,
    });
    if (error) fail(error, 'Прогон не выполнен');
    else {
      setProbe((data ?? null) as ProbeResult | null);
      const v = data?.verdict;
      setMessage({
        text: v === 'ok' ? 'Перекоса стороны нет'
          : v === 'strength_differs' ? 'Бойцы различаются по силе — доля побед ожидаема'
          : v === 'side_bias_attacker' ? 'Атакующий выигрывает чаще — перекос'
          : 'Защитник выигрывает чаще — перекос',
        kind: v === 'side_bias_attacker' || v === 'side_bias_defender' ? 'error' : 'ok',
      });
    }
    setBusy(null);
  };

  // ----------------------------------------------------------------- вид

  const broken = useMemo(() => {
    if (!snapshot) return [];
    return INVARIANTS.filter(inv => {
      const raw = snapshot[inv.key];
      // null проскочил бы в проверку как валидный ноль, поэтому
      // ловится отдельно — ровно как в check:fighter.
      if (raw === null || raw === undefined) return true;
      return !inv.test(Number(raw));
    });
  }, [snapshot]);

  const TABS: Array<{ id: typeof tab; label: string }> = [
    { id: 'me', label: 'Боец' },
    { id: 'npc', label: 'NPC' },
    { id: 'player', label: 'Игрок' },
    { id: 'balance', label: 'Баланс' },
    { id: 'log', label: 'Журнал' },
  ];

  return (
    <div className="fixed inset-0 z-[700] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-gray-900 to-black flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">Тест боёв</h1>
          <div className="w-10" />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-900/20 border border-amber-700/40 text-[11px] text-amber-200 mb-4">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            Инструмент для разработчика. Каждый бой пишется в базу и двигает рейтинг —
            настоящий, не тестовый. Тренировка против NPC рейтинг не трогает.
          </span>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap ${
                tab === t.id ? 'bg-amber-600' : 'bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {message && (
          <div className={`mb-3 p-3 rounded-xl border text-xs break-words ${
            message.kind === 'error'
              ? 'bg-red-900/30 border-red-700/40 text-red-300'
              : 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* ------------------------------------------------------ снимок */}
        {tab === 'me' && (
          <>
            {busy === 'me' ? (
              <div className="text-center text-xs text-slate-400 py-8 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Считаю снимок...
              </div>
            ) : !snapshot ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400">
                Снимок не получен. Проверьте, что применена миграция
                <code className="block mt-2 text-amber-300">pvp_fighter_snapshot_migration.sql</code>
              </div>
            ) : (
              <>
                {broken.length > 0 && (
                  <div className="mb-3 p-3 rounded-2xl bg-red-900/25 border border-red-700/40 text-[11px] text-red-300">
                    <div className="font-black mb-1">
                      Снимок не проходит {broken.length} из {INVARIANTS.length} инвариантов
                    </div>
                    {broken.map(inv => (
                      <div key={String(inv.key)}>• {inv.label} — {inv.why}</div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Swords size={14} className="text-amber-400" />
                    <span className="text-sm font-black">{snapshot.username}</span>
                    <span className="text-[10px] text-slate-500">ур. {snapshot.lvl}</span>
                    {broken.length === 0 && (
                      <span className="ml-auto text-[10px] font-black text-emerald-400">
                        инварианты в порядке
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <StatRow label="Здоровье" value={snapshot.max_hp} />
                    <StatRow label="Атака" value={snapshot.attack} />
                    <StatRow label="Защита" value={snapshot.defense} />
                    <StatRow label="Удача" value={snapshot.luck} />
                    <StatRow label="Броня" value={snapshot.armor} />
                    <StatRow label="Смягчение" value={snapshot.mitigation} />
                    <StatRow label="Мощь" value={snapshot.power} />
                    <StatRow label="Оружие" value={`${snapshot.weapon.icon} ${snapshot.weapon.name}`} />
                  </div>

                  {snapshot.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {snapshot.equipment.map((e, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          {e.icon} {e.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={loadSnapshot}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black flex items-center justify-center gap-2"
                >
                  <RotateCcw size={13} /> Пересчитать снимок
                </button>
              </>
            )}
          </>
        )}

        {/* --------------------------------------------------------- NPC */}
        {tab === 'npc' && (
          <>
            {npcs.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400">
                Список пуст. Проверьте, что применена миграция
                <code className="block mt-2 text-amber-300">pvp_resolve_migration.sql</code>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {npcs.map(n => (
                  <button
                    key={n.key}
                    disabled={!n.available}
                    onClick={() => setSelectedNpc(n.key)}
                    className={`w-full text-left p-3 rounded-2xl border ${
                      selectedNpc === n.key
                        ? 'bg-amber-900/30 border-amber-600/50'
                        : 'bg-white/5 border-white/10'
                    } ${n.available ? '' : 'opacity-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{n.weapon_icon}</span>
                      <span className="text-sm font-black">{n.username}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                        n.tier === 'real' ? 'bg-rose-900/60 text-rose-300' : 'bg-emerald-900/60 text-emerald-300'
                      }`}>
                        {n.tier === 'real' ? 'боевой' : 'тренировка'}
                      </span>
                      <span className="ml-auto text-[10px] text-slate-500">ур. {n.lvl}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {n.available ? `${n.weapon_name} · порог рейтинга ${n.min_rating}` : n.locked_reason}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={fightNpc}
              disabled={busy === 'fight' || !selectedNpc}
              className="w-full py-3 rounded-xl bg-amber-600 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'fight' ? <Loader2 size={15} className="animate-spin" /> : <Swords size={15} />}
              В бой
            </button>
          </>
        )}

        {/* ------------------------------------------------------ игрок */}
        {tab === 'player' && (
          <>
            {opponents.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">Загрузка игроков...</div>
            ) : (
              <div className="space-y-2 mb-3">
                {opponents.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOpponent(o.id)}
                    className={`w-full text-left p-3 rounded-2xl border ${
                      selectedOpponent === o.id
                        ? 'bg-amber-900/30 border-amber-600/50'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black">{o.username}</span>
                      <span className="ml-auto text-[10px] text-slate-400">
                        рейтинг {o.rating ?? '—'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={fightPlayer}
              disabled={busy === 'fight' || !selectedOpponent}
              className="w-full py-3 rounded-xl bg-amber-600 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'fight' ? <Loader2 size={15} className="animate-spin" /> : <Swords size={15} />}
              Вызвать на бой
            </button>
          </>
        )}

        {/* ---------------------------------------------------- баланс */}
        {tab === 'balance' && (
          <>
            <div className="space-y-2 mb-3">
              {([
                ['equal', 'Равные бойцы', 'Проверка честности: при равных статах никто не должен выигрывать чаще'],
                ['mirror', 'Я против копии себя', 'Показывает, как бой выглядит на ваших же характеристиках'],
                ['npc', 'Я против NPC', 'Реальный баланс против выбранного противника'],
              ] as const).map(([id, title, desc]) => (
                <button
                  key={id}
                  onClick={() => setProbeMode(id)}
                  className={`w-full text-left p-3 rounded-2xl border ${
                    probeMode === id
                      ? 'bg-amber-900/30 border-amber-600/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="text-xs font-black">{title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <label className="flex-1">
                <span className="text-[10px] text-slate-400 block mb-1">Прогонов</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={probeRuns}
                  onChange={e => setProbeRuns(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="w-full bg-white/10 p-2.5 rounded-xl text-sm outline-none"
                />
              </label>
              <label className="flex-1">
                <span className="text-[10px] text-slate-400 block mb-1">Базовый сид</span>
                <input
                  type="number"
                  value={probeSeed}
                  onChange={e => setProbeSeed(Number(e.target.value) || 1)}
                  className="w-full bg-white/10 p-2.5 rounded-xl text-sm outline-none"
                />
              </label>
            </div>

            <button
              onClick={runProbe}
              disabled={busy === 'probe'}
              className="w-full py-3 rounded-xl bg-amber-600 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'probe' ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
              Прогнать
            </button>

            {probe && (
              <div className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <StatRow label="Прогонов" value={probe.runs} />
                <StatRow label="Побед атакующего" value={`${probe.wins_a} (${(probe.win_rate_a * 100).toFixed(1)}%)`} />
                <StatRow label="Допуск шума ±" value={`${(probe.bias_margin * 100).toFixed(1)}%`} />
                <StatRow label="Среднее раундов" value={probe.avg_rounds} />
                <StatRow label="Максимум раундов" value={probe.max_rounds} />
                <div className="text-[10px] text-slate-400 mt-2 mb-1">Действия по прогону</div>
                <StatRow label="удары" value={probe.actions.attack} />
                <StatRow label="тяжёлые" value={probe.actions.heavy} />
                <StatRow label="блоки" value={probe.actions.block} />
                <StatRow label="уклонения" value={probe.actions.dodge} />
                <StatRow label="лечения" value={probe.actions.heal} />
                <StatRow label="криты" value={probe.crits} />
                <StatRow label="промахи" value={probe.misses} />
                <StatRow label="удары в блок" value={probe.blocked} />
              </div>
            )}
          </>
        )}

        {/* ---------------------------------------------------- журнал */}
        {tab === 'log' && (
          <>
            {history.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400">
                Боёв пока нет. Сыграйте первый на вкладке NPC или «Игрок».
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={`${h.kind}-${h.id}`} className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                        h.kind === 'npc' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-sky-900/60 text-sky-300'
                      }`}>
                        {h.kind === 'npc' ? 'NPC' : 'игрок'}
                      </span>
                      <span className={h.won ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                        {h.won ? 'победа' : 'поражение'}
                      </span>
                      <span className="ml-auto text-[10px] text-slate-500">
                        раундов {h.rounds}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      сид {h.seed} · {String(h.created_at).slice(0, 19).replace('T', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={loadHistory}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black flex items-center justify-center gap-2 mt-3"
            >
              <RotateCcw size={13} /> Обновить
            </button>
          </>
        )}

        {/* ------------------------------------------------ разбор боя */}
        {result && (
          <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10">
            {/* Разбор приводится к общему виду: в этом меню игрок всегда
                вызывает бой первым, поэтому он сторона 'a'. */}
            <FightComic fight={presentFight(result, 'a')} />
          </div>
        )}
      </div>
    </div>
  );
}