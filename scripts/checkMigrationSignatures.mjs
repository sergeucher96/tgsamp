/**
 * Проверка подписей внутри самих миграций.
 *
 * Зачем. Кроме `create or replace function` подпись повторяется ещё в
 * трёх местах: `comment on function`, `grant execute on function` и
 * в вызовах. `comment on function` требует, чтобы функция уже
 * существовала, поэтому расхождение в аргументах падает с 42883
 * сразу после успешного создания — выглядит как загадочная ошибка
 * на безобидной строке.
 *
 * Расхождение такого рода уже случалось: у pvp_pick_action в
 * `comment on function` осталось 11 аргументов, пока объявлялось 12.
 * Находить такие места глазами бесполезно — их ровно столько же,
 * сколько функций, и заметить несовпадение счетчиков трудно.
 *
 * Скрипт сравнивает последовательность типов в объявлении с той же
 * последовательностью в comment и grant. Работает офлайн, база не
 * нужна.
 *
 * Запуск: node scripts/checkMigrationSignatures.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';

const dir = 'supabase/migrations';

// Типы приводятся к каноническому виду, потому что в разных местах
// они записаны по-разному: `double precision` против `precision`.
const normalizeType = (t) => t.trim().toLowerCase().replace(/\s+/g, ' ');

// Типы из объявления: каждый кусок между запятыми выглядит как
// `имя тип [default значение]`. Тип может состоять из двух слов
// (`double precision`), а значение по умолчанию — из любого числа,
// поэтому тип заканчивается на слове `default` либо на конце куска.
const declaredTypes = (raw) =>
  raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const tokens = part.toLowerCase().split(/\s+/).filter(Boolean);
      const def = tokens.indexOf('default');
      const end = def === -1 ? tokens.length : def;
      return normalizeType(tokens.slice(1, end).join(' '));
    });

// Типы из подписи: там пишут только типы, по одному куску на запятую.
const usedTypes = (raw) =>
  raw
    .split(',')
    .map((part) => normalizeType(part))
    .filter(Boolean);

// Имя функции и последовательность типов из `name(types)` в подписи.
const parseSignature = (text) => {
  const m = /^\s*(\w+)\s*\(([^)]*)\)/.exec(text);
  if (!m) return null;
  return { name: m[1], types: splitArgs(m[2]) };
};

const problems = [];

for (const file of readdirSync(dir)) {
  if (!/^pvp.*_migration\.sql$/.test(file)) continue;
  // Строковые комментарии вырезаются: иначе `p_score numeric -- 1 —
  // победа` внутри списка аргументов ломает разбор подписи.
  const text = readFileSync(`${dir}/${file}`, 'utf8').replace(/--[^\n]*/g, '');

  // Объявления: create or replace function public.NAME(params)
  const declared = new Map();
  const declRe = /create or replace function\s+public\.(pvp_\w+)\s*\(([^)]*)\)/g;
  for (const m of text.matchAll(declRe)) {
    declared.set(m[1], declaredTypes(m[2]));
  }

  // Повторы подписи: comment on function и grant execute on function.
  const useRe = /(comment on function|grant execute on function)\s+public\.(pvp_\w+)\s*\(([^)]*)\)/g;
  for (const m of text.matchAll(useRe)) {
    const [, kind, name, rawTypes] = m;
    const declaredTypes = declared.get(name);
    if (!declaredTypes) {
      problems.push(`${file}: ${kind} на ${name}, но объявления функции в файле нет`);
      continue;
    }

    const used = usedTypes(rawTypes);
    if (used.length !== declaredTypes.length || used.some((t, i) => t !== declaredTypes[i])) {
      problems.push(
        `${file}: ${kind} для ${name}\n` +
          `        в объявлении: ${declaredTypes.join(', ')}\n` +
          `        в подписи:     ${used.join(', ')}`
      );
    }
  }
}

if (problems.length === 0) {
  console.log('Подписи согласованы: comment и grant совпадают с объявлениями.');
} else {
  console.log(`Расхождений: ${problems.length}\n`);
  for (const p of problems) console.log(p);
  process.exitCode = 1;
}