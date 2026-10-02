/**
 * Проверка таблиц PvP: структура и, главное, что RLS держит.
 *
 * Зачем проверять запись из клиента. pvp_fights защищена
 * read-only политиками и revoke — на это вся защита от
 * «записал себе победу прямо в таблицу». Утверждать, что так и
 * есть, нельзя: остальные таблицы проекта открыты using (true),
 * и если Supabase выдаёт anon права на новые таблицы по
 * умолчанию, то без revoke запись прошла бы молча.
 *
 * Поэтому скрипт действительно пытается вставить строку от
 * анонимного ключа — того же, что лежит в .env у игрока.
 * Если вставка вдруг прошла, это дыра: скрипт удаляет строку и
 * падает с громкой ошибкой.
 *
 * Запуск: npm run check:pvp  (после применения pvp_fight_migration.sql)
 *
 * Скрипт ничего не меняет: единственная возможная запись —
 * проверочная, и она удаляется в том же прогоне.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const loadEnv = () => {
  const env = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = /^\s*([^#=\s]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
};

const fail = message => {
  console.error(message);
  process.exitCode = 1;
  return false;
};

const REQUIRED_COLUMNS = {
  pvp_fights: [
    'id', 'challenger_id', 'defender_id', 'status', 'seed',
    'attacker_snapshot', 'defender_snapshot', 'log',
    'winner_id', 'rounds', 'attacker_hp', 'defender_hp',
    'rules_version', 'created_at', 'resolved_at',
  ],
  pvp_ratings: ['player_id', 'rating', 'fights', 'wins', 'last_fight_at', 'updated_at'],
};

const main = async () => {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return fail('Нет VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env');

  // Клиент без авторизации — ровно то, чем пользуется игрок.
  const supabase = createClient(url, key);

  let missingTable = false;

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const { data, error } = await supabase.from(table).select(columns.join(','));
    if (error) {
      console.error(`${table}: ${error.message}`);
      missingTable = true;
      continue;
    }
    console.log(`${table}: ${data.length} строк, все колонки на месте`);
  }

  if (missingTable) {
    return fail(
      'Таблиц нет. Примените supabase/migrations/pvp_fight_migration.sql, затем перезапустите проверку.',
    );
  }

  // ------------------------------------------------------------------
  // Главная проверка: запись должна быть закрыта
  // ------------------------------------------------------------------

  // Две настоящие строки из profiles. Ограничение
  // challenger_id <> defender_id соблюдаем — нам нужно проверить
  // именно RLS, а не нарушение check.
  const { data: players, error: playersError } = await supabase
    .from('profiles')
    .select('id')
    .limit(2);

  if (playersError || !players || players.length < 2) {
    return fail(
      'Нужны минимум два игрока в profiles, чтобы проверить запись. ' +
        `Ответ базы: ${playersError?.message ?? 'пришло ' + (players?.length ?? 0)}`,
    );
  }

  const probe = {
    challenger_id: players[0].id,
    defender_id: players[1].id,
    status: 'FINISHED',
    seed: 1,
    log: [],
  };

  const { data: inserted, error: insertError } = await supabase
    .from('pvp_fights')
    .insert(probe)
    .select('id')
    .maybeSingle();

  if (!insertError && inserted) {
    // Дыра. Убираем за собой и поднимаем тревогу.
    await supabase.from('pvp_fights').delete().eq('id', inserted.id);
    return fail(
      `RLS НЕ ЗАЩИЩАЕТ pvp_fights: анонимный клиент вставил строку #${inserted.id} ` +
        '(проверочная строка удалена). Проверь revoke и политики в pvp_fight_migration.sql.',
    );
  }

  console.log(`Запись в pvp_fights отклонена: ${insertError?.message ?? 'без текста ошибки'}`);

  // Тот же тест на обновление: даже если вставить нельзя,
  // RLS не должен пропускать и UPDATE — иначе можно было бы
  // переписать победителя в существующем бою.
  const { data: anyFight } = await supabase.from('pvp_fights').select('id').limit(1);
  if (anyFight && anyFight.length > 0) {
    const { error: updateError } = await supabase
      .from('pvp_fights')
      .update({ winner_id: players[1].id })
      .eq('id', anyFight[0].id);

    if (!updateError) {
      await supabase.from('pvp_fights').update({ winner_id: null }).eq('id', anyFight[0].id);
      return fail(
        `RLS НЕ ЗАЩИЩАЕТ pvp_fights: анонимный клиент изменил строку #${anyFight[0].id} ` +
          '(значение возвращено обратно).',
      );
    }
    console.log(`Изменение pvp_fights отклонено: ${updateError.message}`);
  } else {
    console.log('Боёв пока нет, проверка обновления пропущена.');
  }

  console.log('\nТаблицы на месте, запись закрыта.');
  return true;
};

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});