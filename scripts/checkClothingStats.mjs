/**
 * Сверка одежды: CLOTHING_DATABASE в коде против clothing_stats в базе.
 *
 * Зачем. Одежду покупают, надевают и считают по коду
 * (clothingConfig.ts, ShopView.tsx, useEquipmentStore.ts), но
 * серверный подсчёт брони для PvP читает таблицу clothing_stats.
 * Расхождение не падает: предмет без строки в базе просто получает
 * статы 0, и броня молча не применится. Этот скрипт превращает
 * такую ошибку в явный вывод в консоль и ненулевой код возврата.
 *
 * Запуск: npm run check:clothing
 *
 * Скрипт только читает базу и ничего не меняет.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CLOTHING_CONFIG = 'src/features/character/data/clothingConfig.ts';

// Ключи, влияющие на бой и сумку. Должны совпадать с
// public.clothing_stats_keys() в supabase/migrations/clothing_stats_migration.sql.
const BATTLE_KEYS = ['armor', 'strength', 'stamina', 'speed', 'charisma', 'luck', 'inv_slots'];

const loadEnv = () => {
  const env = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = /^\s*([^#=\s]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
};

/**
 * Разбор CLOTHING_DATABASE из TypeScript.
 *
 * Регуляркой, а не импортом: файл тянет за собой lucide-react и
 * tsconfig-пути, из-за чего обычный node его не загрузит. Формат
 * литерала стабильный (ключ в одинарных кавычках, stats — объект),
 * и рядом лежит код, который его ломает при изменении.
 */
const parseClothingConfig = source => {
  const items = new Map();

  // Сначала список всех записей каталога. Если разбор ниже пропустит
  // хоть одну, сверка это покажет: молча пропущенный предмет выглядел
  // бы так же, как его отсутствие в базе, и проверка дала бы
  // ложное «проблем нет».
  const ids = [...source.matchAll(/^\s{2}'([a-z0-9_]+)':\s*\{/gm)].map(m => m[1]);

  // Границы одной записи: id в одинарных кавычках ... следующий
  // такой же id или конец объекта.
  const recordRe = /'([a-z0-9_]+)'\s*:\s*\{([\s\S]*?)\n\s{2}\},/g;
  let match;
  while ((match = recordRe.exec(source))) {
    const [, id, body] = match;
    const slot = /slot:\s*'([a-z]+)'/.exec(body)?.[1];
    const statsBlock = /stats:\s*\{([\s\S]*?)\}/.exec(body)?.[1];
    if (!slot || statsBlock === undefined) continue;

    const stats = {};
    const statRe = /(\w+)\s*:\s*(-?\d+)/g;
    let stat;
    while ((stat = statRe.exec(statsBlock))) stats[stat[1]] = Number(stat[2]);

    items.set(id, { slot, stats });
  }

  return { items, ids };
};

/**
 * Ненулевой код возврата.
 *
 * Именно process.exitCode, а не process.exit(): у supabase-клиента
 * остаются открытые libuv-хендлы, и на Windows принудительный выход
 * роняет node с "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)"
 * прямо во время печати результата. Код возврата выставится при
 * обычном завершении, когда хендлы закроются сами.
 */
const fail = message => {
  console.error(message);
  process.exitCode = 1;
  return false;
};

const main = async () => {
  const { items: code, ids } = parseClothingConfig(readFileSync(CLOTHING_CONFIG, 'utf8'));
  console.log(`Код: записей в CLOTHING_DATABASE — ${ids.length}, разобрано — ${code.size}`);
  if (ids.length === 0 || code.size === 0) {
    return fail('Не удалось разобрать CLOTHING_DATABASE — формат изменился.');
  }

  // Расхождение между числом записей и числом разобранных означает,
  // что регулярка отстала от формата. Продолжать бессмысленно:
  // дальше она отметит «нет строки в базе» для предмета, который
  // на самом деле есть в коде.
  if (code.size !== ids.length) {
    const missing = ids.filter(id => !code.has(id));
    return fail(
      `Разобрано ${code.size} из ${ids.length} записей. Не разобраны: ${missing.join(', ')}\n` +
        'Формат CLOTHING_DATABASE изменился — правь parseClothingConfig.',
    );
  }

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return fail('Нет VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env');
  }

  const supabase = createClient(url, key);

  // Таблица появляется после применения clothing_stats_migration.sql.
  const { data, error } = await supabase.from('clothing_stats').select('item_key, slot, stats');
  if (error) {
    return fail(
      'clothing_stats недоступна. Примените supabase/migrations/clothing_stats_migration.sql\n' +
        `  ${error.message}`,
    );
  }

  const db = new Map((data ?? []).map(row => [row.item_key, { slot: row.slot, stats: row.stats ?? {} }]));
  console.log(`База: строк в clothing_stats — ${db.size}`);

  const problems = [];

  for (const [id, { slot, stats }] of code) {
    const row = db.get(id);
    if (!row) {
      problems.push(`${id}: нет строки в clothing_stats — сервер посчитает статы 0`);
      continue;
    }
    if (row.slot !== slot) {
      problems.push(`${id}: слот в коде ${slot}, в базе ${row.slot}`);
    }
    for (const statKey of BATTLE_KEYS) {
      const codeValue = stats[statKey] ?? 0;
      const dbValue = Number(row.stats?.[statKey] ?? 0);
      if (codeValue !== dbValue) {
        problems.push(`${id}: ${statKey} в коде ${codeValue}, в базе ${dbValue}`);
      }
    }
  }

  for (const id of db.keys()) {
    if (!code.has(id)) {
      problems.push(`${id}: строка в базе, но предмета в CLOTHING_DATABASE нет`);
    }
  }

  if (problems.length > 0) {
    console.error(`\nРасхождений: ${problems.length}`);
    for (const line of problems) console.error(`  ${line}`);
    console.error('\nИсправь миграцию clothing_stats_migration.sql или clothingConfig.ts.');
    process.exitCode = 1;
    return;
  }

  const armor = [...code.values()].reduce((sum, item) => sum + (item.stats.armor ?? 0), 0);
  console.log(`Совпадает. Максимум брони из всей одежды: ${armor}`);
};

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});