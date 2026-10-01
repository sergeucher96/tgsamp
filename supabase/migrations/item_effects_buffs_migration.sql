-- ============================================================
-- Миграция: эффекты предметов, баффы и модификаторы
--
-- Три класса эффектов (поле item_effects.type):
--   stat     — мгновенное восстановление (энергия, здоровье, ...)
--   buff     — усиление характеристики на время
--   modifier — системный множитель в процентах (опыт, доход, ...)
--   action   — разовое действие
--
-- Правила игры:
--   * одинаковый бафф второй раз — берётся сильнейшее значение,
--     время отсчитывается заново
--   * модификаторы складываются, потолок +100%
-- ============================================================

-- ------------------------------------------------------------
-- 1. Профиль: поля для восстановления сытости и жажды
--    Без них эффекты heal_hunger / heal_thirst некому писать
-- ------------------------------------------------------------
alter table profiles add column if not exists hunger numeric default 100;
alter table profiles add column if not exists thirst numeric default 100;

update profiles set hunger = 100 where hunger is null;
update profiles set thirst = 100 where thirst is null;

-- ------------------------------------------------------------
-- 2. Хранилище активных баффов игрока
--    localStorage больше не единственный источник:
--    бафф переживает смену устройства и не накручивается удалением ключа
-- ------------------------------------------------------------
create table if not exists player_buffs (
  id bigserial primary key,
  player_id uuid not null references profiles(id) on delete cascade,
  effect_key text not null,
  name text not null default '',
  amount numeric not null default 0,
  duration_minutes integer not null default 60,
  type text not null default 'buff',        -- buff | modifier
  source text,                             -- food | clothing | manual
  applied_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- один бафф на эффект: повторный приём заменяет, а не дублирует
  unique (player_id, effect_key)
);

alter table player_buffs enable row level security;

drop policy if exists "player_buffs select" on player_buffs;
create policy "player_buffs select" on player_buffs for select using (true);

drop policy if exists "player_buffs insert" on player_buffs;
create policy "player_buffs insert" on player_buffs for insert with check (true);

drop policy if exists "player_buffs update" on player_buffs;
create policy "player_buffs update" on player_buffs for update using (true) with check (true);

drop policy if exists "player_buffs delete" on player_buffs;
create policy "player_buffs delete" on player_buffs for delete using (true);

create index if not exists idx_player_buffs_player on player_buffs(player_id);
create index if not exists idx_player_buffs_expires on player_buffs(expires_at);

-- ------------------------------------------------------------
-- 3. Новые эффекты-модификаторы
-- ------------------------------------------------------------
insert into item_effects (name, key, type, description) values
  ('Опыт профессий', 'xp_gain_multiplier', 'modifier', 'Процент к получаемому опыту'),
  ('Доход',           'money_gain_multiplier', 'modifier', 'Процент к заработку'),
  ('Регенерация энергии (бонус)', 'energy_regen_multiplier', 'modifier', 'Процент к скорости восстановления энергии'),
  ('Удача добычи',    'drop_rate_multiplier', 'modifier', 'Процент к шансу выпадения ресурсов')
on conflict (key) do update
  set name = excluded.name,
      type = excluded.type,
      description = excluded.description;

-- Не хватало баффов этих характеристик
insert into item_effects (name, key, type, description) values
  ('Бафф: Харизма', 'buff_charisma', 'buff', 'Усиливает харизму'),
  ('Бафф: Броня',   'buff_armor',   'buff', 'Усиливает броню')
on conflict (key) do update
  set name = excluded.name,
      type = excluded.type,
      description = excluded.description;

-- ------------------------------------------------------------
-- 4. Разрешаем эффекты для категорий
-- ------------------------------------------------------------
insert into category_effects_allowed (category_id, effect_id, default_value)
select c.id, e.id, 'null'
from item_categories c, item_effects e
where c.key = 'food'
  and e.key in (
    'xp_gain_multiplier', 'money_gain_multiplier',
    'energy_regen_multiplier', 'drop_rate_multiplier',
    'buff_strength', 'buff_stamina', 'buff_speed', 'buff_luck',
    'buff_energy_regen', 'heal_thirst'
  )
on conflict (category_id, effect_id) do nothing;

-- Напитки — тоже еда, но без яда и телепорта
insert into category_effects_allowed (category_id, effect_id, default_value)
select c.id, e.id, 'null'
from item_categories c, item_effects e
where c.key in ('drink', 'drinks', 'beverage', 'alcohol')
  and e.key in ('heal_thirst', 'heal_energy', 'xp_gain_multiplier', 'money_gain_multiplier', 'drop_rate_multiplier')
on conflict (category_id, effect_id) do nothing;

-- ------------------------------------------------------------
-- 5. Чистка битых данных предметов
--
-- Старый редактор писал вместо effect_key/property.key числовые id,
-- из-за чего эффекты выглядели как {"1": 1, "3": 1} и не работали.
-- Такие записи не восстановимы — удаляем.
-- ------------------------------------------------------------
update items_db
set effects = '[]'::jsonb
where jsonb_typeof(effects) = 'object' and effects <> '{}'::jsonb;

update items_db
set effects = '[]'::jsonb
where effects is null;

update items_db
set properties = coalesce(properties, '{}'::jsonb)
where properties is null;

-- ------------------------------------------------------------
-- 6. Восстановление эффектов tomat и havka
--    В них был записан мусор вида {"1": 1, "3": 1} — числовые id
--    вместо effect_key. Формат: [{ "effect_key": ..., "value": ... }]
-- ------------------------------------------------------------
update items_db
set effects = '[{"effect_key":"heal_hunger","value":15},{"effect_key":"heal_energy","value":5}]'::jsonb
where item_key = 'tomat'
   or lower(name) = 'помидор';

update items_db
set effects = '[{"effect_key":"heal_energy","value":25},{"effect_key":"heal_hunger","value":10},{"effect_key":"buff_strength","value":10,"duration_minutes":30}]'::jsonb
where item_key = 'havka'
   or lower(name) in ('хавка', 'хлеб', 'буханка хлеба');

-- ------------------------------------------------------------
-- 7. Примеры: энэргетик с бонусом к опыту
--    Раскомментируйте/измените под свои нужды
-- ------------------------------------------------------------
-- update items_db
-- set effects = '[{"effect_key":"heal_energy","value":40},{"effect_key":"xp_gain_multiplier","value":10,"duration_minutes":120}]'::jsonb
-- where item_key = 'apelsinovyy_sok';
