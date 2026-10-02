/**
 * Проба вызовов PvP-RPC анонимным ключом.
 *
 * Зачем отдельный скрипт. Клиент прячет ошибку за своей подсказкой
 * и не показывает текст PostgREST, поэтому по интерфейсу нельзя
 * понять, чего именно не хватает: функции, таблицы или прав.
 * Здесь видно код и текст каждого вызова.
 *
 * Запуск: node scripts/probePvpRpc.mjs
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

// Игрок для проверки: id нужен аргументом p_player_id.
// Таблица игроков называется profiles, не players.
const { data: players } = await supabase
  .from('profiles')
  .select('id, username')
  .limit(1);
const pid = players?.[0]?.id ?? null;
console.log(`Игрок для проб: ${players?.[0]?.username ?? 'нет'} (${pid ?? 'нет id'})\n`);

const calls = [
  ['pvp_queue_list', { p_player_id: pid }],
  ['pvp_queue_join', { p_player_id: pid }],
  ['pvp_queue_leave', { p_player_id: pid }],
  ['pvp_queue_take', { p_player_id: pid }],
  ['pvp_npc_available', { p_player_id: pid }],
  ['pvp_resolve_npc', { p_player_id: pid, p_npc_key: 'train_1' }],
];

for (const [fn, args] of calls) {
  // join/take меняют состояние, поэтому в пробе они только
  // проверяют существование: вызов идёт, но нам нужен код.
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.log(`FAIL ${fn}: ${error.code} / ${error.message}`);
    console.log(`     details=${JSON.stringify(error.details)} hint=${JSON.stringify(error.hint)}`);
  } else {
    console.log(`ok   ${fn}: ${JSON.stringify(data)}`);
  }
}

// Сама таблица очереди: RPC может быть нет, а таблица — есть.
const { data: q, error: tErr, count } = await supabase
  .from('pvp_queue')
  .select('*', { count: 'exact' }).limit(1);
console.log(`\npvp_queue: ${tErr ? `FAIL ${tErr.code} / ${tErr.message}` : `ok, строк ${count}`}`);
if (!tErr) {
  console.log(`колонки: ${Object.keys(q?.[0] ?? {}).join(', ') || 'не видно (пусто или нет доступа)'}`);
}