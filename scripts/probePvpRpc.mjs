/**
 * Смоук всех PvP-RPC анонимным ключом.
 *
 * Зачем отдельный скрипт. Клиент прячет текст ошибки за своей
 * подсказкой и в консоль выводит только HTTP-код: 400 не говорит,
 * это 42703 «нет колонки» или P0002 «игрок не найден». Проба в узком
 * месте стоила нескольких перезагрузок страницы, поэтому здесь
 * вызывается всё подряд и печатается код, сообщение и текст сервера.
 *
 * По умолчанию — только чтение: очередь не трогается, бой не
 * проводится, энергия не тратится. Изменяющие вызовы запускаются
 * лишь с флагом --mutate.
 *
 * Запуск:
 *   node scripts/probePvpRpc.mjs
 *   node scripts/probePvpRpc.mjs --mutate
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const MUTATE = process.argv.includes('--mutate');

const loadEnv = () => {
  const env = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([^#=\s]+)\s*=\s*(.*)$/.exec(line);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
};

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log('Нет VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env');
  process.exit(1);
}

const supabase = createClient(url, key);

// Игрок для проб: id нужен аргументом p_player_id.
// Таблица игроков называется profiles, не players.
const { data: players, error: pErr } = await supabase
  .from('profiles')
  .select('id, username, energy')
  .limit(5);

if (pErr) {
  console.log(`Профили не читаются: ${pErr.code} / ${pErr.message}`);
  process.exit(1);
}

const pid = players?.[0]?.id ?? null;
console.log(`Игрок для проб: ${players?.[0]?.username ?? 'нет'} (${pid ?? 'нет id'})`);
console.log(`Режим: ${MUTATE ? 'с изменением состояния' : 'только чтение'}\n`);

// Порядок повторяет порядок применения миграций: так первая
// сломанная функция указывает и на причину — не применённый предыдущий
// файл, а несовместимость версий.
const readOnly = [
  ['pvp_fighter_snapshot', { p_player_id: pid }],
  ['pvp_boxing_levels', { p_player_id: pid }],
  ['pvp_boxing_xp_for_level', { p_level: 1 }],
  ['pvp_boxing_level', { p_xp: 0 }],
  ['pvp_boxing_progress', { p_player_id: pid }],
  ['pvp_npc_available', { p_player_id: pid }],
  ['pvp_npc_snapshot', { p_npc_key: 'train_1' }],
  ['pvp_queue_list', { p_player_id: pid }],
];

const mutating = [
  ['pvp_queue_join', { p_player_id: pid }],
  ['pvp_queue_list', { p_player_id: pid }],
  ['pvp_queue_leave', { p_player_id: pid }],
  ['pvp_resolve_npc', { p_player_id: pid, p_npc_key: 'train_1' }],
  ['pvp_boxing_train', { p_player_id: pid, p_stat: 'agility' }],
];

let failed = 0;

const run = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    failed++;
    console.log(`FAIL ${fn}: ${error.code} / ${error.message}`);
    if (error.details || error.hint) {
      console.log(`     details=${JSON.stringify(error.details)} hint=${JSON.stringify(error.hint)}`);
    }
    return null;
  }
  const text = JSON.stringify(data);
  console.log(`ok   ${fn}: ${text.length > 220 ? `${text.slice(0, 220)}…` : text}`);
  return data;
};

for (const [fn, args] of readOnly) {
  await run(fn, args);
}

if (MUTATE) {
  console.log('\n--- изменяющие вызовы ---');
  for (const [fn, args] of mutating) {
    await run(fn, args);
  }
  console.log('\nВнимание: очередь и бой меняют состояние, тренировка тратит 8 энергии.');
} else {
  console.log('\nИзменяющие вызовы пропущены. Добавить: node scripts/probePvpRpc.mjs --mutate');
}

// Таблицы бокса напрямую клиенту недоступны: RLS включён, политик
// нет. Ошибка 42501 здесь — правильное поведение, а не поломка.
console.log('\nПроверка прямого доступа (42501 здесь — это ожидаемо):');
for (const t of ['pvp_boxing_xp', 'pvp_boxing_sessions']) {
  const { error } = await supabase.from(t).select('*').limit(1);
  console.log(`  ${t}: ${error ? `${error.code} (ожидаемо)` : 'ДОСТУПЕН — RLS не закрыт!'}`);
}

console.log(failed === 0 ? '\nВсе вызовы прошли.' : `\nПровалено вызовов: ${failed}.`);