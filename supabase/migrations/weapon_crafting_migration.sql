-- ============================================================
--  Верстак для оружия: рецепты и серверный крафт
-- ============================================================
--
--  Идея: автор заходит в редактор, задаёт для каждого оружия список
--  предметов и их количество, игрок на верстаке в хабе крафтит.
--
--  Почему своя таблица, а не кухонные рецепты (kitchenConfig +
--  localStorage): кухонные живут в браузере автора, поэтому у другого
--  игрока набор будет другим. Здесь рецепты лежат в базе — их видит
--  вся игра.
--
--  Почему крафт считает сервер: списание ингредиентов и выдача
--  оружия должны быть одной транзакцией. Если списать клиентом, а
--  выдача не пройдёт, игрок потеряет материалы; ещё и RLS в проекте
--  открыт, так что «серверная» проверка на клиенте не проверка.
--
--  Порядок применения: game_server_time_migration.sql,
--  materials_steal_migration.sql, затем этот файл.

-- ============================================================
--  1. ТАБЛИЦА РЕЦЕПТОВ
-- ============================================================

create table if not exists weapon_recipes (
  id               bigserial primary key,
  -- Ключ рецепта для редактора и для вызовов из кода
  recipe_key       text not null unique,
  name             text not null,
  icon             text not null default '🔫',
  description      text not null default '',
  -- Что получается на выходе: item_key из items_db
  result_item_key  text not null references items_db(item_key) on update cascade,
  result_amount    integer not null default 1 check (result_amount > 0),
  -- [{"item_key": "materials", "amount": 20}, ...]
  -- jsonb, а не отдельная таблица: рецепт всегда читается целиком
  -- и никогда не фильтруется по одному ингредиенту.
  ingredients      jsonb not null default '[]'::jsonb,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Список ингредиентов должен быть непустым: рецепт без
  -- ингредиентов — это просто бесплатная раздача оружия.
  check (jsonb_array_length(ingredients) > 0)
);

alter table weapon_recipes enable row level security;

drop policy if exists "weapon_recipes select" on weapon_recipes;
create policy "weapon_recipes select" on weapon_recipes
  for select using (true);

-- Авторские правки идут только через серверные функции, поэтому
-- политик на insert/update/delete здесь нет.

create index if not exists idx_weapon_recipes_active
  on weapon_recipes (is_active, name);

-- Автопроставление updated_at, как у business_products.
create or replace function weapon_recipes_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_weapon_recipes_updated_at on weapon_recipes;
create trigger trg_weapon_recipes_updated_at
  before update on weapon_recipes
  for each row execute function weapon_recipes_set_updated_at();

-- ============================================================
--  2. ТЕСТОВЫЕ ПРЕДМЕТЫ-ОРУЖИЕ
-- ============================================================
--
--  В каталоге не было ни одного оружия: WEAPON_CONFIG в
--  features/market/data/weaponConfig.ts — это параметры тира, не
--  предметы инвентаря. Без них крафт нечего выдавать, поэтому
--  заводим два, чтобы механику можно было проверить сразу.

insert into items_db (
  item_key, name, description, icon,
  price, sell_price, stackable, max_stack,
  properties, effects, tags, category_id, is_active
) values (
  'wep_pistol',
  'Пистолет .45',
  'Тяжёлый пистолет. Собирается на верстаке из материалов.',
  '🔫',
  0, 0, false, 1,
  '{"rarity": "uncommon", "weight": 1.5, "damage": 26}',
  '[]',
  '{weapon, crafted}',
  (select id from item_categories where key = 'weapon'),
  true
)
on conflict (item_key) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category_id = excluded.category_id,
  updated_at = now();

insert into items_db (
  item_key, name, description, icon,
  price, sell_price, stackable, max_stack,
  properties, effects, tags, category_id, is_active
) values (
  'wep_shotgun',
  'Обрез дробовика',
  'Двуствольный обрез. Собирается на верстаке из материалов.',
  '💥',
  0, 0, false, 1,
  '{"rarity": "rare", "weight": 4.0, "damage": 44}',
  '[]',
  '{weapon, crafted}',
  (select id from item_categories where key = 'weapon'),
  true
)
on conflict (item_key) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category_id = excluded.category_id,
  updated_at = now();

-- ============================================================
--  3. ТЕСТОВЫЕ РЕЦЕПТЫ
-- ============================================================

insert into weapon_recipes (
  recipe_key, name, icon, description,
  result_item_key, result_amount, ingredients, is_active
) values
  ('wep_pistol_basic', 'Пистолет .45', '🔫',
   'Простейший ствол: немного металла и терпения.',
   'wep_pistol', 1,
   '[{"item_key": "materials", "amount": 10}]'::jsonb,
   true),
  ('wep_shotgun', 'Обрез дробовика', '💥',
   'Тяжелее и дороже: нужен металл и кусок разобранного ствола.',
   'wep_shotgun', 1,
   '[{"item_key": "materials", "amount": 25}, {"item_key": "wep_pistol", "amount": 1}]'::jsonb,
   true)
on conflict (recipe_key) do update set
  name = excluded.name,
  description = excluded.description,
  ingredients = excluded.ingredients,
  result_item_key = excluded.result_item_key,
  updated_at = now();

-- ============================================================
--  4. СЕРВЕРНЫЙ КРАФТ
-- ============================================================
--
--  Гарантирует: ingredients списываются и результат выдаётся в одной
--  транзакции. Любая ошибка на любом шаге откатывает всё.
--
--  Про member_id и RLS — см. шапку materials_steal_migration.sql:
--  Supabase Auth в проекте не используется, id приходит параметром.

create or replace function public.craft_weapon(
  p_player_id uuid,
  p_recipe_id bigint,
  p_count      integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_text   text    := p_player_id::text;
  v_gang         text;
  v_count        integer := coalesce(p_count, 1);
  v_recipe       weapon_recipes%rowtype;
  v_ingredient   jsonb;
  v_need_key     text;
  v_need_amount  integer;
  v_have         numeric;
  v_left         numeric;
  v_row          record;
  v_max_stack    integer;
  -- id в inventory — uuid (создана вручную), не bigserial
  v_result_row   uuid;
  v_result_stored numeric;
  v_slots        integer;
  v_used_slots   integer;
  v_owner_is_uuid boolean;
begin
  if p_player_id is null then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_player');
  end if;

  if v_count < 1 then
    return jsonb_build_object('ok', false, 'blocked', 'bad_count');
  end if;

  -- 1. Верстак доступен только членам уличной банды: тот же список
  --    организаций, что и у кражи материалов на военной базе.
  select m.org_id into v_gang
  from org_members m
  join organizations o on o.id = m.org_id
  where m.player_id = p_player_id
    and o.type = 'gang'
  limit 1;

  if v_gang is null then
    return jsonb_build_object('ok', false, 'blocked', 'not_gang');
  end if;

  -- 2. Рецепт должен существовать и быть включён.
  select * into v_recipe from weapon_recipes where id = p_recipe_id;
  if not found then
    return jsonb_build_object('ok', false, 'blocked', 'no_recipe');
  end if;
  if not v_recipe.is_active then
    return jsonb_build_object('ok', false, 'blocked', 'no_recipe');
  end if;

  -- 3. Результат должен существовать в каталоге и быть активен:
  --    иначе игрок списал бы материалы в пустоту.
  select max_stack into v_max_stack
  from items_db
  where item_key = v_recipe.result_item_key and is_active;

  if v_max_stack is null then
    return jsonb_build_object('ok', false, 'blocked', 'no_item');
  end if;

  -- 4. Хватает ли ингредиентов. Считаем по всем строкам игрока:
  --    одного и того же предмета в сумке может быть несколько стопок.
  --    Сначала считаем без блокировок, чтобы быстро отказать.
  for v_ingredient in select * from jsonb_array_elements(v_recipe.ingredients) loop
    v_need_key    := v_ingredient ->> 'item_key';
    v_need_amount := coalesce((v_ingredient ->> 'amount')::integer, 0) * v_count;

    if v_need_key is null or v_need_amount <= 0 then
      return jsonb_build_object(
        'ok', false,
        'blocked', 'bad_recipe',
        'reason', 'ingredient без item_key или с amount <= 0'
      );
    end if;

    select coalesce(sum(coalesce(i.amount, 0)), 0) into v_have
    from inventory i
    where i.owner_id::text = v_owner_text
      and i.item_id = v_need_key
      and i.storage_type = 'player';

    if v_have < v_need_amount then
      -- Возвращаем и требование, и то, что есть: панели нужны оба
      -- числа, чтобы показать «есть 7 из 20».
      return jsonb_build_object(
        'ok', false,
        'blocked', 'not_enough',
        'item_key', v_need_key,
        'need', v_need_amount,
        'have', v_have
      );
    end if;
  end loop;

  -- 5. Ищем место под результат — ДО списания ингредиентов.
  --    Порядок обязателен: если слот занят и мы узнали бы об этом
  --    после списания, игрок потерял бы материалы, а оружие не
  --    получил бы. Откатить списание на клиенте нельзя.
  select i.id, coalesce(i.amount, 0)
    into v_result_row, v_result_stored
  from inventory i
  where i.owner_id::text = v_owner_text
    and i.item_id = v_recipe.result_item_key
    and i.storage_type = 'player'
    and coalesce(i.amount, 0) < v_max_stack
  order by i.amount desc
  limit 1
  for update;

  if v_result_row is null then
    -- Стопки нет или она полна — нужна новая строка, то есть слот.
    select coalesce(max((to_jsonb(p) ->> 'inv_slots')::integer), 12) into v_slots
    from profiles p where p.id = p_player_id;

    select count(*)::integer into v_used_slots
    from inventory i
    where i.owner_id::text = v_owner_text
      and i.storage_type = 'player';

    if v_used_slots >= v_slots then
      return jsonb_build_object('ok', false, 'blocked', 'no_space');
    end if;
  end if;

  -- 6. Блокируем строки ингредиентов и списываем. Блокировка нужна,
  --    чтобы два крафта из двух вкладок не списали по одному и тому
  --    же материалу дважды.
  for v_ingredient in select * from jsonb_array_elements(v_recipe.ingredients) loop
    v_need_key    := v_ingredient ->> 'item_key';
    v_need_amount := (v_ingredient ->> 'amount')::integer * v_count;
    v_left        := v_need_amount;

    for v_row in
      select i.id, coalesce(i.amount, 0) as amt
      from inventory i
      where i.owner_id::text = v_owner_text
        and i.item_id = v_need_key
        and i.storage_type = 'player'
        and coalesce(i.amount, 0) > 0
      order by i.amount asc
      for update
    loop
      exit when v_left <= 0;

      if v_row.amt <= v_left then
        -- Стока кончилась целиком — строку удаляем, иначе в сумке
        -- остаются нулевые остатки, которые занимают слот.
        delete from inventory where id = v_row.id;
        v_left := v_left - v_row.amt;
      else
        update inventory set amount = v_row.amt - v_left where id = v_row.id;
        v_left := 0;
      end if;
    end loop;

    -- Материал мог исчезнуть между проверкой и списанием (другая
    -- вкладка). Тогда списалось меньше, чем нужно, — откатываем всё
    -- и отказываем, игрок ничего не теряет.
    if v_left > 0 then
      return jsonb_build_object(
        'ok', false,
        'blocked', 'not_enough',
        'item_key', v_need_key,
        'need', v_need_amount
      );
    end if;
  end loop;

  -- 7. Выдаём результат. Место под него проверено на шаге 5.
  if v_result_row is not null then
    update inventory
    set amount = v_result_stored + v_recipe.result_amount * v_count
    where id = v_result_row;
  else
    -- Тип owner_id заранее неизвестен: таблица inventory создана
    -- вручную и миграции на неё нет.
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
      values (p_player_id, v_recipe.result_item_key, v_recipe.result_amount * v_count, 'player')
      returning id into v_result_row;
    else
      insert into inventory (owner_id, item_id, amount, storage_type)
      values (v_owner_text, v_recipe.result_item_key, v_recipe.result_amount * v_count, 'player')
      returning id into v_result_row;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'blocked', null,
    'recipe_key', v_recipe.recipe_key,
    'item_key', v_recipe.result_item_key,
    'amount', v_recipe.result_amount * v_count,
    'gang', v_gang
  );
end;
$$;

grant execute on function public.craft_weapon(uuid, bigint, integer) to anon, authenticated;

-- ============================================================
--  5. СОХРАНЕНИЕ РЕЦЕПТОВ ИЗ РЕДАКТОРА
-- ============================================================
--
--  Отдельная функция, а не прямая запись: автор меняет состав
--  рецепта, и это должно происходить через проверку структуры
--  ingredients, иначе опечатка в jsonb уронит крафт до конца игры.

create or replace function public.save_weapon_recipe(
  p_recipe_id      bigint,
  p_recipe_key     text,
  p_name           text,
  p_icon           text,
  p_description    text,
  p_result_item_key text,
  p_result_amount  integer,
  p_ingredients    jsonb,
  p_is_active      boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id       bigint;
  v_ingredient jsonb;
begin
  if p_recipe_key is null or btrim(p_recipe_key) = '' then
    return jsonb_build_object('ok', false, 'error', 'пустой recipe_key');
  end if;

  if p_result_item_key is null or not exists (
    select 1 from items_db where item_key = p_result_item_key
  ) then
    return jsonb_build_object('ok', false, 'error', 'result_item_key нет в каталоге');
  end if;

  if p_ingredients is null or jsonb_typeof(p_ingredients) <> 'array'
     or jsonb_array_length(p_ingredients) = 0 then
    return jsonb_build_object('ok', false, 'error', 'нужен непустой список ингредиентов');
  end if;

  for v_ingredient in select * from jsonb_array_elements(p_ingredients) loop
    if jsonb_typeof(v_ingredient) <> 'object'
       or v_ingredient ->> 'item_key' is null
       or coalesce((v_ingredient ->> 'amount')::integer, 0) <= 0 then
      return jsonb_build_object(
        'ok', false,
        'error', 'ингредиент должен быть вида {"item_key": "...", "amount": 2}'
      );
    end if;
    if not exists (select 1 from items_db where item_key = v_ingredient ->> 'item_key') then
      return jsonb_build_object(
        'ok', false,
        'error', 'ингредиент нет в каталоге: ' || (v_ingredient ->> 'item_key')
      );
    end if;
  end loop;

  insert into weapon_recipes (
    recipe_key, name, icon, description,
    result_item_key, result_amount, ingredients, is_active
  ) values (
    btrim(p_recipe_key),
    coalesce(nullif(btrim(p_name), ''), 'Без названия'),
    coalesce(nullif(btrim(p_icon), ''), '🔫'),
    coalesce(p_description, ''),
    p_result_item_key,
    greatest(coalesce(p_result_amount, 1), 1),
    p_ingredients,
    coalesce(p_is_active, true)
  )
  on conflict (recipe_key) do update set
    name            = excluded.name,
    icon            = excluded.icon,
    description     = excluded.description,
    result_item_key = excluded.result_item_key,
    result_amount   = excluded.result_amount,
    ingredients     = excluded.ingredients,
    is_active       = excluded.is_active,
    updated_at      = now()
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'recipe_key', btrim(p_recipe_key));
end;
$$;

grant execute on function public.save_weapon_recipe(
  bigint, text, text, text, text, text, integer, jsonb, boolean
) to anon, authenticated;

notify pgrst, 'reload schema';