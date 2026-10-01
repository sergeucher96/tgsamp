-- ============================================================
--  Материалы с военной базы + серверные правила кражи
-- ============================================================
--
--  Зачем это отдельным файлом:
--
--  1. Предмет «Материалы» нужен как будущее сырьё для крафта
--     оружия в банде. Сейчас он просто копится в инвентаре.
--
--  2. Само ограбление проверяется здесь, на сервере, а не в
--     браузере. Клиент отправляет только id игрока — что он
--     нажал, где находится и какое сейчас время, решает база.
--     Проверка в браузере ничего не защищает: RLS в проекте
--     открыт (using (true)), поэтому игрок может вставить
--     строку в inventory и напрямую из консоли браузера.
--
--  Порядок применения: game_server_time_migration.sql
--  (обязателен — игра считает игровое время через game_server_now),
--  затем этот файл.

-- ============================================================
--  1. ПРЕДМЕТ «МАТЕРИАЛЫ»
-- ============================================================

-- Тег 'resource' в словаре не заведён, а без него предмет в
-- интерфейсе не попадёт в фильтр «Ресурсы».
insert into item_tags (name, key, description) values
  ('Ресурс', 'resource', 'Сырьё и базовые материалы для производства и крафта.')
on conflict (key) do nothing;

-- Категория «Ресурсы» (key = 'resource') уже создаётся в
-- item_category_schema.sql. Если её нет — создаём, чтобы
-- миграция была самостоятельной.
insert into item_categories (name, key, description, icon) values
  ('Ресурсы', 'resource', 'Сырьё и базовые материалы.', '🪨')
on conflict (key) do nothing;

insert into items_db (
  item_key, name, description, icon,
  price, sell_price, stackable, max_stack,
  properties, effects, tags, category_id, is_active
) values (
  'materials',
  'Материалы',
  'Стальные листы и арматура с военного склада. Пойдут на крафт оружия в банде.',
  '🔩',
  0, 0, true, 500,
  '{"rarity": "uncommon", "weight": 2.5, "base_cost": 250, "stolen_from": "military_base"}',
  '[]',
  '{resource, crafting}',
  (select id from item_categories where key = 'resource'),
  true
)
on conflict (item_key) do update set
  name        = excluded.name,
  description = excluded.description,
  icon        = excluded.icon,
  category_id = excluded.category_id,
  tags        = excluded.tags,
  updated_at  = now();

-- ============================================================
--  2. КУЛДАУНЫ ДЕЙСТВИЙ
-- ============================================================
--
--  Своя таблица вместо колонок last_* в profiles: заведётся
--  ровно под те действия, где нужен откат по времени, и не
--  требует правок profiles на каждую новую механику.
--  Стиль — как у player_buffs: составной ключ и expires_at.

create table if not exists player_action_cooldowns (
  player_id    uuid not null references profiles(id) on delete cascade,
  action_key   text not null,
  last_used_at timestamptz not null default now(),
  primary key (player_id, action_key)
);

create index if not exists idx_player_action_cooldowns_recent
  on player_action_cooldowns (action_key, last_used_at desc);

alter table player_action_cooldowns enable row level security;

drop policy if exists "player_action_cooldowns select" on player_action_cooldowns;
create policy "player_action_cooldowns select" on player_action_cooldowns
  for select using (true);

-- Запись в таблицу идёт только из security definer функции, поэтому
-- отдельной политики на insert здесь нет.

-- ============================================================
--  3. КРАЖА МАТЕРИАЛОВ
-- ============================================================
--
--  Игровые часы совпадают с UTC: gameClock.ts считает время от
--  полуночи UTC (GAME_EPOCH), поэтому ночь на сервере — это
--  19:00–05:00 по now() at time zone 'utc'. Если когда-нибудь
--  придётся перенести отсчёт на другой часовой пояс, менять
--  придётся только этот кусок и gameClock.ts.
--
--  ИДЕНТИФИКАТОР ИГРОКА НЕ ДОВЕРЯЕМ. В проекте Supabase Auth не
--  используется (клиент анонимный, вход через Telegram), поэтому
--  auth.uid() всегда null и взять id из сессии нельзя. Здесь id
--  приходит параметром — как в startWar (warService). Следствие:
--  игрок технически может вызвать функцию с чужим id. Лечится это
--  не миграцией, а переводом входа на Supabase Auth либо подписью
--  Telegram (HMAC) в api/auth.js; тогда здесь появится проверка
--  подписи, и параметр уйдёт совсем. До этого ограничение честное,
--  но не абсолютное.
--
--  Позиция игрока тоже не проверяется: pos_x/pos_y игрок шлёт сам,
--  серверной правды о том, где он стоит, в базе нет.
--
--  Сумма добычи считается здесь же: игрок задаёт только факт
--  попытки. Иначе он передавал бы p_amount = 999999.

create or replace function public.steal_materials(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item_key   constant text    := 'materials';
  v_cooldown            interval := interval '20 minutes';
  v_hour         integer;
  v_gang         text;
  v_last_used    timestamptz;
  v_max_stack    integer;
  v_owner_text   text    := p_player_id::text;
  -- id в inventory — uuid (создана вручную), не bigserial
  v_row_id       uuid;
  v_stored       numeric;
  v_amount       numeric;
  v_slots        integer;
  v_used_slots   integer;
  v_owner_is_uuid boolean;
begin
  if p_player_id is null then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_player');
  end if;

  -- 1. Только ночь. Порядок проверок не важен для безопасности,
  --    но сообщения игроку полезнее начинать с банды: без банды
  --    ночь ничего не меняет.
  v_hour := extract(hour from now() at time zone 'utc')::integer;
  if not (v_hour >= 19 or v_hour < 5) then
    return jsonb_build_object(
      'ok', false,
      'blocked', 'not_night',
      'hour', v_hour
    );
  end if;

  -- 2. Членство в уличной банде. Смотрим org_members, а не
  --    profiles.organization_id: в проекте эти две таблицы
  --    пишутся разными запросами (useOrganizationStore), и
  --    без транзакции они могли разойтись. Канонична org_members,
  --    а type = 'gang' отсекает LSPD и мэрию. Старые tgd и mafia
  --    удалены миграцией four_gangs_migration.
  select m.org_id into v_gang
  from org_members m
  join organizations o on o.id = m.org_id
  where m.player_id = p_player_id
    and o.type = 'gang'
  limit 1;

  if v_gang is null then
    return jsonb_build_object('ok', false, 'blocked', 'not_gang');
  end if;

  -- 3. Кулдаун. Время только серверное: клиентский Date.now()
  --    игрок подкручивает системными часами и обходит откат.
  select last_used_at into v_last_used
  from player_action_cooldowns
  where player_id = p_player_id
    and action_key = 'steal_materials';

  if v_last_used is not null and now() - v_last_used < v_cooldown then
    return jsonb_build_object(
      'ok', false,
      'blocked', 'cooldown',
      'retry_in_minutes', ceil(extract(epoch from (v_last_used + v_cooldown - now())) / 60)::integer
    );
  end if;

  -- 4. Предмет должен существовать и быть активен. Без этого
  --    игрок украдёт несуществующий item_key и сломанные
  --    строки инвентаря поедут дальше по игре.
  select max_stack into v_max_stack
  from items_db
  where item_key = v_item_key and is_active;

  if v_max_stack is null then
    return jsonb_build_object('ok', false, 'blocked', 'no_item');
  end if;

  -- 5. Ищем стопку. owner_id в inventory бывает текстом (клиент
  --    пишет player.id.toString()), поэтому сравниваем через
  --    приведение к тексту — так работает в обоих случаях.
  select i.id, coalesce(i.amount, 0)
    into v_row_id, v_stored
  from inventory i
  where i.owner_id::text = v_owner_text
    and i.item_id = v_item_key
    and i.storage_type = 'player'
    and coalesce(i.amount, 0) < v_max_stack
  order by i.amount desc
  limit 1
  for update;

  -- Добыча 3–6 единиц: достаточно, чтобы копить на крафт, но
  -- мало, чтобы один выход заменял работу. Рандом здесь, на
  -- сервере: клиент подсказку о том, сколько выпало, не угадывает.
  v_amount := 3 + floor(random() * 4);

  if v_row_id is not null then
    -- В стопке есть место — уменьшаем, сколько влезет.
    v_amount := least(v_amount, v_max_stack - v_stored);
  end if;

  if v_amount < 1 then
    return jsonb_build_object('ok', false, 'blocked', 'no_space');
  end if;

  if v_row_id is null then
    -- Новая стопка — нужен свободный слот в сумке.
    -- inv_slots читаем через to_jsonb, а не как колонку: колонки
    -- в profiles нет в миграциях, она заводилась вручную вместе
    -- с остальными. Прямое обращение к отсутствующей колонке не дало бы
    -- создать функцию вовсе — ошибка возникает на этапе компиляции
    -- тела, а не при вызове.
    select coalesce(max((to_jsonb(p) ->> 'inv_slots')::integer), 12) into v_slots
    from profiles p where p.id = p_player_id;

    select count(*)::integer into v_used_slots
    from inventory i
    where i.owner_id::text = v_owner_text
      and i.storage_type = 'player';

    if v_used_slots >= v_slots then
      return jsonb_build_object('ok', false, 'blocked', 'no_space');
    end if;

    -- Тип owner_id заранее неизвестен: таблица inventory создана
    -- вручную и миграции на неё нет. Определяем тип на месте,
    -- иначе вставка падала бы на uuid-колонке.
    select (pg_typeof(i.owner_id) = 'uuid'::regtype) into v_owner_is_uuid
    from inventory i limit 1;

    if v_owner_is_uuid is null then
      select (data_type = 'uuid') into v_owner_is_uuid
      from information_schema.columns
      where table_schema = 'public' and table_name = 'inventory'
        and column_name = 'owner_id';
    end if;

    if v_owner_is_uuid then
      insert into inventory (owner_id, item_id, amount, storage_type)
      values (p_player_id, v_item_key, v_amount, 'player')
      returning id into v_row_id;
    else
      insert into inventory (owner_id, item_id, amount, storage_type)
      values (v_owner_text, v_item_key, v_amount, 'player')
      returning id into v_row_id;
    end if;
  else
    update inventory
    set amount = coalesce(amount, 0) + v_amount
    where id = v_row_id;
  end if;

  -- 6. Кулдаун ставим в той же транзакции, что и выдачу: если
  --    выдача прошла, а откат не записался — игрок добыл бы
  --    бесконечно.
  insert into player_action_cooldowns (player_id, action_key, last_used_at)
  values (p_player_id, 'steal_materials', now())
  on conflict (player_id, action_key) do update set last_used_at = now();

  return jsonb_build_object(
    'ok', true,
    'blocked', null,
    'item_key', v_item_key,
    'amount', v_amount,
    'gang', v_gang
  );
end;
$$;

-- Функцию зовёт анонимный клиент из браузера: грант нужен
-- обязательно, без него PostgREST вернёт отказ до проверки политик.
grant execute on function public.steal_materials(uuid) to anon, authenticated;

-- PostgREST кэширует список функций, поэтому без этого новая
-- функция не появится в API до перезапуска.
notify pgrst, 'reload schema';