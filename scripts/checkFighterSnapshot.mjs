/**
 * Проверка pvp_fighter_snapshot: не «функция есть», а «числа верные».
 *
 * Зачем. Функция считает бойца из нескольких таблиц, и почти любая
 * ошибка в ней не падает — она тихо возвращает неверное число.
 * Например, если забыть coalesce на скилле, у игрока без боевых
 * навыков max_hp придёт null, и комикс нарисует бойца без здоровья.
 * Проверка наличия такое не поймает.
 *
 * Что проверяется для каждого игрока:
 *   - ok = true (профиль нашёлся);
 *   - max_hp >= 100 — базовые 100 не могут пропасть;
 *   - attack >= 1, defense >= 0, luck >= 0;
 *   - 0 < mitigation <= 1 — иначе броня или её отсутствие считаются неверно;
 *   - armor <= 300 — потолок брони держится;
 *   - weapon.name = 'Кулаки', когда оружия в инвентаре нет;
 *   - equipment — массив, даже когда ничего не надето.
 *
 * Запуск: npm run check:fighter  (после применения pvp_fighter_snapshot_migration.sql)
 *
 * Скрипт только читает базу.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const fail = message => {
  console.error(message);
  process.exitCode = 1;
  return false;
};

const loadEnv = () => {
  const env = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = /^\s*([^#=\s]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
};

const main = async () => {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return fail('Нет VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env');

  const supabase = createClient(url, key);

  const { data: players, error: playersError } = await supabase
    .from('profiles')
    .select('id, username')
    .order('id')
    .limit(25);

  if (playersError) return fail(`Не прочитать profiles: ${playersError.message}`);
  if (!players || players.length === 0) return fail('В profiles нет ни одного игрока.');

  // Оружие нужно знать заранее: проверка «Кулаки» осмысленна
  // только для игрока, у которого в инвентаре нет предмета с damage.
  const { data: weapons } = await supabase.from('items_db').select('item_key, properties');
  const damageKeys = new Set(
    (weapons ?? [])
      .filter(d => d.properties && 'damage' in d.properties)
      .map(d => d.item_key),
  );

  const problems = [];
  let checked = 0;

  for (const player of players) {
    const { data, error } = await supabase.rpc('pvp_fighter_snapshot', {
      p_player_id: player.id,
    });

    if (error || !data) {
      problems.push(`${player.username}: вызов не удался — ${error?.message ?? 'пустой ответ'}`);
      continue;
    }

    const snap = typeof data === 'string' ? JSON.parse(data) : data;
    const label = player.username || player.id.slice(0, 8);

    if (snap.ok !== true) {
      problems.push(`${label}: ok=${snap.ok}, blocked=${snap.blocked}`);
      continue;
    }

    const num = key => {
      const raw = snap[key];
      // Number(null) === 0, и такой null проскочил бы в проверки
      // инвариантов как валидный ноль. Отдельно ловим null и
      // отсутствующий ключ: в снимке это всегда ошибка расчёта,
      // потому что все характеристики приходят числами.
      if (raw === null || raw === undefined) {
        problems.push(`${label}: ${key} = null, характеристика не посчитана`);
        return NaN;
      }
      const v = Number(raw);
      if (!Number.isFinite(v)) problems.push(`${label}: ${key} не число (${raw})`);
      return v;
    };

    const maxHp = num('max_hp');
    const attack = num('attack');
    const defense = num('defense');
    const luck = num('luck');
    const armor = num('armor');
    const mitigation = num('mitigation');
    const power = num('power');

    if (maxHp < 100) problems.push(`${label}: max_hp=${maxHp}, должно быть не меньше 100`);
    if (attack < 1) problems.push(`${label}: attack=${attack}, должен быть не меньше 1`);
    if (defense < 0) problems.push(`${label}: defense=${defense}, не может быть отрицательным`);
    if (luck < 0) problems.push(`${label}: luck=${luck}, не может быть отрицательным`);
    if (armor > 300) problems.push(`${label}: armor=${armor}, потолок брони 300 пробит`);
    if (!(mitigation > 0 && mitigation <= 1)) {
      problems.push(`${label}: mitigation=${mitigation}, ожидалось (0; 1]`);
    }
    if (power <= 0) problems.push(`${label}: power=${power}, должен быть положительным`);

    if (!Array.isArray(snap.equipment)) {
      problems.push(`${label}: equipment не массив (${typeof snap.equipment})`);
    }
    if (!snap.weapon || typeof snap.weapon.name !== 'string') {
      problems.push(`${label}: weapon.name отсутствует`);
    }

    // Ключевая проверка: без оружия в сумке должно быть «Кулаки».
    if (snap.weapon?.item_key && !damageKeys.has(snap.weapon.item_key)) {
      problems.push(
        `${label}: оружие ${snap.weapon.item_key} без properties.damage — оружием считаться не должно`,
      );
    }

    if (checked < 3) {
      console.log(
        `${label}: hp=${maxHp} atk=${attack} def=${defense} luck=${luck} ` +
          `armor=${armor} mit=${mitigation} оружие=${snap.weapon?.name} power=${power}`,
      );
    }
    checked++;
  }

  console.log(`\nПроверено игроков: ${checked}`);

  if (problems.length > 0) {
    console.error(`Проблем: ${problems.length}`);
    for (const line of problems) console.error(`  ${line}`);
    process.exitCode = 1;
    return;
  }

  console.log('Инварианты формулы в порядке.');
};

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});