/**
 * Сверка подписей развёрнутых RPC с миграциями.
 *
 * Зачем. `create or replace function` умеет менять тело, но не может
 * переименовать или переставить входные параметры: на расхождении
 * Postgres отвечает 42P13 и вся миграция откатывается. Ловить это
 * приходилось по одной попытке на пользователя, потому что неизвестно,
 * какие версии файлов уже применены.
 *
 * Почему не схема PostgREST. Корневой OpenAPI-документ требует
 * service_role и под анонимным ключом отдаёт 401, поэтому перечислить
 * функции напрямую нельзя.
 *
 * Как обходимся. PostgREST в подсказке к PGRST202 называет искомую
 * подпись целиком, но только если хотя бы одно имя аргумента близко
 * к настоящему. Поэтому каждой функции подставляется первое имя
 * параметра из миграции — и этого достаточно, чтобы подсказка
 * появилась. Сравнение имён идёт по позициям: перестановка аргументов
 * для вызова незаметна (PostgREST сопоставляет по именам), зато
 * ломает `create or replace`.
 *
 * Запуск: node scripts/checkPvpSchema.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';

const loadEnv = () => {
  const env = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([^#=\s]+)\s*=\s*(.*)$/.exec(line);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
};

// Подпись из миграции: имя функции, имена параметров по позициям
// и первый аргумент для пробного вызова.
const readMigrations = () => {
  const dir = 'supabase/migrations';
  const found = new Map();

  for (const file of readdirSync(dir)) {
    if (!/^pvp.*_migration\.sql$/.test(file)) continue;
    const text = readFileSync(`${dir}/${file}`, 'utf8');

    const re = /create or replace function\s+public\.(pvp_\w+)\s*\(([^)]*)\)/g;
    for (const m of text.matchAll(re)) {
      const [, name, rawParams] = m;
      const params = rawParams
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const parts = p.split(/\s+/);
          return parts.length >= 2 ? parts[0] : parts[0];
        });

      if (!found.has(name)) {
        found.set(name, { file, params });
      }
    }
  }

  return found;
};

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log('Нет VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env');
  process.exit(1);
}

const supabase = (await import('@supabase/supabase-js')).createClient(url, key);

const HINT = /Perhaps you meant to call the function (public\.\w+\([^)]*\))/;

const migrations = readMigrations();
const names = [...migrations.keys()].sort();

console.log(`Проверяю ${names.length} pvp-функций из миграций.\n`);

let mismatches = 0;
let unreadable = 0;

for (const name of names) {
  const { file, params } = migrations.get(name);
  const [firstParam] = params;

  // Подставляем только первое имя: остальные не важны, нужен факт
  // существования функции и её настоящая подпись в подсказке.
  const { error } = await supabase.rpc(name, { [firstParam]: null });

  if (!error) {
    console.log(`ok    ${name}(${params.join(', ')})`);
    continue;
  }

  const hint =
    error.hint?.match(HINT)?.[1] ??
    error.details?.match(HINT)?.[1] ??
    error.message?.match(HINT)?.[1];

  if (!hint) {
    // Подсказки нет — это НЕ доказательство отсутствия функции:
    // с выдуманным именем PostgREST молчит и для существующей тоже.
    unreadable++;
    console.log(`?     ${name}: подпись не читается (${file})`);
    continue;
  }

  const deployed = hint
    .replace('public.', '')
    .replace(/^\w+\(/, '')
    .replace(/\)$/, '')
    .split(',')
    .map((s) => s.trim());

  const same =
    deployed.length === params.length &&
    deployed.every((d, i) => d === params[i]);

  if (same) {
    console.log(`ok    ${name}(${params.join(', ')})`);
  } else {
    mismatches++;
    console.log(`РАСХ  ${name}`);
    console.log(`        в базе:     ${deployed.join(', ')}`);
    console.log(`        в миграции: ${params.join(', ')}`);
    console.log(`        добавь '${name}' в список сноса в ${file}`);
  }
}

console.log(
  `\nИтог: расхождений ${mismatches}, подпись не читается ${unreadable}.`
);
console.log('Нечитаемые подписи тоже могут расходиться — проверяй по факту применения.');