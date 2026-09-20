-- ==========================================
-- Item Category System
-- Categories, properties, effects, actions, tags, и items
-- ==========================================

-- ==========================================
-- 1. КАТЕГОРИИ (иерархическая система)
-- ==========================================
create table if not exists item_categories (
  id bigserial primary key,
  name text not null,
  key text not null unique,          -- например "food", "clothing"
  description text default '',
  icon text default '📦',
  parent_id bigint references item_categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table item_categories enable row level security;

drop policy if exists "item_categories select" on item_categories;
create policy "item_categories select"
  on item_categories for select using (true);

drop policy if exists "item_categories insert" on item_categories;
create policy "item_categories insert"
  on item_categories for insert with check (true);

drop policy if exists "item_categories update" on item_categories;
create policy "item_categories update"
  on item_categories for update using (true) with check (true);

drop policy if exists "item_categories delete" on item_categories;
create policy "item_categories delete"
  on item_categories for delete using (true);

create index if not exists idx_categories_parent on item_categories(parent_id);
create index if not exists idx_categories_key on item_categories(key);

-- ==========================================
-- 2. СВОЙСТВА (property definitions)
-- ==========================================
create table if not exists item_properties (
  id bigserial primary key,
  name text not null,
  key text not null unique,           -- например "weight", "stack_size"
  type text not null default 'number', -- number, string, boolean, date
  unit text default '',                -- кг, шт, etc.
  default_value jsonb default 'null',
  min_value jsonb default 'null',
  max_value jsonb default 'null',
  is_required boolean not null default false,
  is_recommended boolean not null default false,
  description text default '',
  created_at timestamptz not null default now()
);

alter table item_properties enable row level security;

drop policy if exists "item_properties select" on item_properties;
create policy "item_properties select" on item_properties for select using (true);

drop policy if exists "item_properties insert" on item_properties;
create policy "item_properties insert" on item_properties for insert with check (true);

drop policy if exists "item_properties update" on item_properties;
create policy "item_properties update" on item_properties for update using (true) with check (true);

drop policy if exists "item_properties delete" on item_properties;
create policy "item_properties delete" on item_properties for delete using (true);

create index if not exists idx_properties_key on item_properties(key);

-- ==========================================
-- 3. ЭФФЕКТЫ (effect definitions)
-- ==========================================
create table if not exists item_effects (
  id bigserial primary key,
  name text not null,
  key text not null unique,           -- например "heal_energy", "apply_bef"
  type text not null default 'stat',   -- stat, buff, debuff, action
  description text default '',
  created_at timestamptz not null default now()
);

alter table item_effects enable row level security;

drop policy if exists "item_effects select" on item_effects;
create policy "item_effects select" on item_effects for select using (true);

drop policy if exists "item_effects insert" on item_effects;
create policy "item_effects insert" on item_effects for insert with check (true);

drop policy if exists "item_effects update" on item_effects;
create policy "item_effects update" on item_effects for update using (true) with check (true);

drop policy if exists "item_effects delete" on item_effects;
create policy "item_effects delete" on item_effects for delete using (true);

create index if not exists idx_effects_key on item_effects(key);

-- ==========================================
-- 4. ДЕЙСТВИЯ (action definitions)
-- ==========================================
create table if not exists item_actions (
  id bigserial primary key,
  name text not null,
  key text not null unique,           -- например "consume", "equip", "use"
  description text default '',
  created_at timestamptz not null default now()
);

alter table item_actions enable row level security;

drop policy if exists "item_actions select" on item_actions;
create policy "item_actions select" on item_actions for select using (true);

drop policy if exists "item_actions insert" on item_actions;
create policy "item_actions insert" on item_actions for insert with check (true);

drop policy if exists "item_actions update" on item_actions;
create policy "item_actions update" on item_actions for update using (true) with check (true);

drop policy if exists "item_actions delete" on item_actions;
create policy "item_actions delete" on item_actions for delete using (true);

create index if not exists idx_actions_key on item_actions(key);

-- ==========================================
-- 5. ТЕГИ (tag definitions)
-- ==========================================
create table if not exists item_tags (
  id bigserial primary key,
  name text not null,
  key text not null unique,           -- например "food", "consumable", "weapon"
  description text default '',
  created_at timestamptz not null default now()
);

alter table item_tags enable row level security;

drop policy if exists "item_tags select" on item_tags;
create policy "item_tags select" on item_tags for select using (true);

drop policy if exists "item_tags insert" on item_tags;
create policy "item_tags insert" on item_tags for insert with check (true);

drop policy if exists "item_tags update" on item_tags;
create policy "item_tags update" on item_tags for update using (true) with check (true);

drop policy if exists "item_tags delete" on item_tags;
create policy "item_tags delete" on item_tags for delete using (true);

create index if not exists idx_tags_key on item_tags(key);

-- ==========================================
-- 6. СВЯЗКИ: КАТЕГОРИЯ → СВОЙСТВА
-- ==========================================
create table if not exists category_properties (
  id bigserial primary key,
  category_id bigint not null references item_categories(id) on delete cascade,
  property_id bigint not null references item_properties(id) on delete cascade,
  is_required boolean not null default false,   -- обязательное свойство
  default_value jsonb default 'null',           -- переопределение значения по умолчанию
  overridden boolean not null default false,    -- true если переопределено изменение типа (required/recommended)
  created_at timestamptz not null default now(),
  unique (category_id, property_id)
);

alter table category_properties enable row level security;
drop policy if exists "category_properties all" on category_properties;
create policy "category_properties all" on category_properties for all using (true) with check (true);

create index if not exists idx_cat_props_category on category_properties(category_id);
create index if not exists idx_cat_props_property on category_properties(property_id);

-- ==========================================
-- 7. СВЯЗКИ: КАТЕГОРИЯ → РАЗРЕШЁННЫЕ ЭФФЕКТЫ
-- ==========================================
create table if not exists category_effects_allowed (
  id bigserial primary key,
  category_id bigint not null references item_categories(id) on delete cascade,
  effect_id bigint not null references item_effects(id) on delete cascade,
  default_value jsonb default 'null',
  created_at timestamptz not null default now(),
  unique (category_id, effect_id)
);

alter table category_effects_allowed enable row level security;
drop policy if exists "category_effects_allowed all" on category_effects_allowed;
create policy "category_effects_allowed all" on category_effects_allowed for all using (true) with check (true);

create index if not exists idx_cat_eff_category on category_effects_allowed(category_id);

-- ==========================================
-- 8. СВЯЗКИ: КАТЕГОРИЯ → ЗАПРЕЩЁННЫЕ ЭФФЕКТЫ
-- ==========================================
create table if not exists category_effects_denied (
  id bigserial primary key,
  category_id bigint not null references item_categories(id) on delete cascade,
  effect_id bigint not null references item_effects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (category_id, effect_id)
);

alter table category_effects_denied enable row level security;
drop policy if exists "category_effects_denied all" on category_effects_denied;
create policy "category_effects_denied all" on category_effects_denied for all using (true) with check (true);

create index if not exists idx_cat_eff_denied_category on category_effects_denied(category_id);

-- ==========================================
-- 9. СВЯЗКИ: КАТЕГОРИЯ → ДЕЙСТВИЯ
-- ==========================================
create table if not exists category_actions_link (
  id bigserial primary key,
  category_id bigint not null references item_categories(id) on delete cascade,
  action_id bigint not null references item_actions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (category_id, action_id)
);

alter table category_actions_link enable row level security;
drop policy if exists "category_actions_link all" on category_actions_link;
create policy "category_actions_link all" on category_actions_link for all using (true) with check (true);

create index if not exists idx_cat_actions_category on category_actions_link(category_id);

-- ==========================================
-- 10. СВЯЗКИ: КАТЕГОРИЯ → ТЕГИ (автоматические / рекомендуемые)
-- ==========================================
create table if not exists category_tags_link (
  id bigserial primary key,
  category_id bigint not null references item_categories(id) on delete cascade,
  tag_id bigint not null references item_tags(id) on delete cascade,
  is_automatic boolean not null default false,  -- true = всегда добавляется, false = рекомендуемый
  created_at timestamptz not null default now(),
  unique (category_id, tag_id)
);

alter table category_tags_link enable row level security;
drop policy if exists "category_tags_link all" on category_tags_link;
create policy "category_tags_link all" on category_tags_link for all using (true) with check (true);

create index if not exists idx_cat_tags_category on category_tags_link(category_id);

-- ==========================================
-- 11. ПРЕДМЕТЫ (items table)
-- ==========================================
create table if not exists items_db (
  id bigserial primary key,
  item_key text not null unique,       -- например "burger", "phone", "cap_basic"
  category_id bigint references item_categories(id) on delete set null,
  name text not null,
  description text default '',
  icon text default '📦',
  price numeric not null default 0,
  sell_price numeric default 0,
  stackable boolean not null default true,
  max_stack integer not null default 1,
  properties jsonb default '{}',       -- { "weight": 0.1, "stack_size": 10 }
  effects jsonb default '[]',          -- [ { "effect_key": "heal_energy", "value": 25 } ]
  tags text[] not null default '{}',   -- ["food", "consumable"]
  production_resources jsonb default '{}',   -- {"oil": 2, "metal": 1} — ресурсы для производства
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Добавляем колонку production_resources если таблица уже существует
alter table items_db add column if not exists production_resources jsonb default '{}';

alter table items_db enable row level security;

drop policy if exists "items_db select" on items_db;
create policy "items_db select" on items_db for select using (true);

drop policy if exists "items_db insert" on items_db;
create policy "items_db insert" on items_db for insert with check (true);

drop policy if exists "items_db update" on items_db;
create policy "items_db update" on items_db for update using (true) with check (true);

drop policy if exists "items_db delete" on items_db;
create policy "items_db delete" on items_db for delete using (true);

create index if not exists idx_items_category on items_db(category_id);
create index if not exists idx_items_key on items_db(item_key);
create index if not exists idx_items_active on items_db(is_active);

-- ==========================================
-- 12. НАЧАЛЬНЫЕ ДАННЫЕ (seed data)
-- ==========================================

-- Свойства
insert into item_properties (name, key, type, unit, default_value) values
  ('Вес', 'weight', 'number', 'кг', '0.1'),
  ('Размер стопки', 'max_stack', 'number', 'шт', '1'),
  ('Срок годности', 'shelf_life', 'number', 'часы', 'null'),
  ('Прочность', 'durability', 'number', '%', '100'),
  ('Качество', 'quality', 'number', '', '1'),
  ('Размер порции', 'portion_size', 'number', '', 'null'),
  ('Октановое число', 'octane', 'number', '', 'null'),
  ('Тип топлива', 'fuel_type', 'text', '', 'null'),
  ('Объём', 'volume', 'number', 'л', 'null')
ON CONFLICT (key) DO NOTHING;

-- Эффекты
insert into item_effects (name, key, type) values
  ('Восстановление голода', 'heal_hunger', 'stat'),
  ('Восстановление жажды', 'heal_thirst', 'stat'),
  ('Восстановление энергии', 'heal_energy', 'stat'),
  ('Восстановление здоровья', 'heal_health', 'stat'),
  ('Добавление баффа', 'apply_buff', 'buff'),
  ('Бафф: Сила', 'buff_strength', 'buff'),
  ('Бафф: Выносливость', 'buff_stamina', 'buff'),
  ('Бафф: Регенерация энергии', 'buff_energy_regen', 'buff'),
  ('Бафф: Скорость', 'buff_speed', 'buff'),
  ('Бафф: Удача', 'buff_luck', 'buff'),
  ('Заправка транспорта', 'fuel_vehicle', 'action'),
  ('Добыча ресурса', 'mine_resource', 'action'),
  ('Ремонт', 'repair', 'action'),
  ('Строительство', 'build', 'action'),
  ('Выдача денег', 'give_money', 'action'),
  ('Телепортация', 'teleport', 'action'),
  ('Изменение недвижимости', 'modify_property', 'action')
ON CONFLICT (key) DO NOTHING;

-- Действия
insert into item_actions (name, key) values
  ('Съесть', 'consume'),
  ('Надеть', 'equip'),
  ('Снять', 'unequip'),
  ('Использовать', 'use'),
  ('Заправить', 'refuel'),
  ('Установить', 'install'),
  ('Починить', 'repair'),
  ('Передать', 'transfer'),
  ('Продать', 'sell'),
  ('Выбросить', 'discard'),
  ('Активировать', 'activate')
ON CONFLICT (key) DO NOTHING;

-- Теги
insert into item_tags (name, key) values
  ('Еда', 'food'),
  ('Потребляемое', 'consumable'),
  ('Оружие', 'weapon'),
  ('Транспорт', 'vehicle'),
  ('Недвижимость', 'property'),
  ('Одежда', 'clothing'),
  ('Инструмент', 'tool'),
  ('Топливо', 'fuel'),
  ('Продаваемое', 'sellable'),
  ('Подготовка', 'prepared_food'),
  ('Рецепт', 'crafting'),
  ('Ремонтируемое', 'repairable'),
  ('Здоровое', 'healthy'),
  ('Фастфуд', 'fast_food')
ON CONFLICT (key) DO NOTHING;

-- Категории
insert into item_categories (name, key, description, icon) values
  ('Еда', 'food', 'Предметы, которые можно употреблять в пищу.', '🍔'),
  ('Готовая еда', 'prepared_food', 'Готовые блюда, прошедшие термическую обработку.', '🍕'),
  ('Ингредиенты', 'ingredient', 'Сырые продукты для готовки.', '🧅'),
  ('Одежда', 'clothing', 'Предметы одежды и аксессуары.', '👕'),
  ('Оружие', 'weapon', 'Оружие и боеприпасы.', '🔫'),
  ('Топливо', 'fuel', 'Топливные материалы для транспорта.', '�'),
  ('Инструменты', 'tool', 'Инструменты для добычи и ремонта.', '🔧'),
  ('Автозапчасти', 'auto_part', 'Запчасти и компоненты для транспорта.', '🔩'),
  ('Ресурсы', 'resource', 'Сырьё и базовые материалы.', '🪨'),
  ('Прочее', 'item', 'Разные предметы.', '📦')
ON CONFLICT (key) DO NOTHING;

-- Устанавливаем иерархию
UPDATE item_categories 
SET parent_id = (SELECT id FROM item_categories WHERE key = 'food')
WHERE key IN ('prepared_food', 'ingredient')
  AND EXISTS (SELECT 1 FROM item_categories WHERE key = 'food');

-- Свойства для категории "Еда"
INSERT INTO category_properties (category_id, property_id, is_required, default_value)
SELECT c.id, p.id, true, '0.1'
FROM item_categories c, item_properties p
WHERE c.key = 'food' AND p.key = 'weight'
ON CONFLICT (category_id, property_id) DO NOTHING;

INSERT INTO category_properties (category_id, property_id, is_required, default_value)
SELECT c.id, p.id, false, '5'
FROM item_categories c, item_properties p
WHERE c.key = 'food' AND p.key = 'max_stack'
ON CONFLICT (category_id, property_id) DO NOTHING;

INSERT INTO category_properties (category_id, property_id, is_required, default_value)
SELECT c.id, p.id, false, '24'
FROM item_categories c, item_properties p
WHERE c.key = 'food' AND p.key = 'shelf_life'
ON CONFLICT (category_id, property_id) DO NOTHING;

-- Эффекты для "Еда" (разрешённые)
INSERT INTO category_effects_allowed (category_id, effect_id, default_value)
SELECT c.id, e.id, '25'
FROM item_categories c, item_effects e
WHERE c.key = 'food' AND e.key = 'heal_energy'
ON CONFLICT (category_id, effect_id) DO NOTHING;

INSERT INTO category_effects_allowed (category_id, effect_id, default_value)
SELECT c.id, e.id, '10'
FROM item_categories c, item_effects e
WHERE c.key = 'food' AND e.key = 'heal_hunger'
ON CONFLICT (category_id, effect_id) DO NOTHING;

INSERT INTO category_effects_allowed (category_id, effect_id, default_value)
SELECT c.id, e.id, 'null'
FROM item_categories c, item_effects e
WHERE c.key = 'food' AND e.key = 'heal_health'
ON CONFLICT (category_id, effect_id) DO NOTHING;

-- Запрещённые эффекты для "Еда"
INSERT INTO category_effects_denied (category_id, effect_id)
SELECT c.id, e.id
FROM item_categories c, item_effects e
WHERE c.key = 'food' AND e.key = 'teleport'
ON CONFLICT (category_id, effect_id) DO NOTHING;

INSERT INTO category_effects_denied (category_id, effect_id)
SELECT c.id, e.id
FROM item_categories c, item_effects e
WHERE c.key = 'food' AND e.key = 'give_money'
ON CONFLICT (category_id, effect_id) DO NOTHING;

-- Действия для "Еда"
INSERT INTO category_actions_link (category_id, action_id)
SELECT c.id, a.id
FROM item_categories c, item_actions a
WHERE c.key = 'food' AND a.key = 'consume'
ON CONFLICT (category_id, action_id) DO NOTHING;

INSERT INTO category_actions_link (category_id, action_id)
SELECT c.id, a.id
FROM item_categories c, item_actions a
WHERE c.key = 'food' AND a.key = 'transfer'
ON CONFLICT (category_id, action_id) DO NOTHING;

-- Теги для "Еда" (автоматические)
INSERT INTO category_tags_link (category_id, tag_id, is_automatic)
SELECT c.id, t.id, true
FROM item_categories c, item_tags t
WHERE c.key = 'food' AND t.key = 'food'
ON CONFLICT (category_id, tag_id) DO NOTHING;

INSERT INTO category_tags_link (category_id, tag_id, is_automatic)
SELECT c.id, t.id, true
FROM item_categories c, item_tags t
WHERE c.key = 'food' AND t.key = 'consumable'
ON CONFLICT (category_id, tag_id) DO NOTHING;

-- ==========================================
-- Пример предметов
-- ==========================================
insert into items_db (item_key, name, description, icon, price, sell_price, stackable, max_stack, properties, effects, tags) values
  ('burger', 'Бургер', 'Вкусный бургер. Восстанавливает 25 энергии.', '🍔', 500, 250, true, 5, '{"weight": 0.3, "max_stack": 5, "shelf_life": 12}', '[{"effect_key": "heal_energy", "value": 25}]', '{food, consumable, prepared_food, fast_food}'),
  ('pizza', 'Пицца', 'Горячая пицца. Восстанавливает 40 энергии.', '�', 800, 400, true, 5, '{"weight": 0.5, "max_stack": 5, "shelf_life": 8}', '[{"effect_key": "heal_energy", "value": 40}]', '{food, consumable, prepared_food}'),
  ('apple', 'Яблоко', 'Свежее яблоко. Восстанавливает 8 энергии.', '🍎', 50, 25, true, 10, '{"weight": 0.15, "max_stack": 10, "shelf_life": 72}', '[{"effect_key": "heal_energy", "value": 8}]', '{food, consumable, healthy}'),
  ('phone', 'Телефон', 'Смартфон для связи.', '📱', 1500, 700, false, 1, '{"weight": 0.2}', '[]', '{item}'),
  ('cap_basic', 'Бейсболка', 'Простая бейсболка.', '🧢', 800, 400, false, 1, '{"weight": 0.05}', '[]', '{clothing}'),
  ('gasoline', 'Бензин', 'Бензин для заправки.', '⛽', 200, 100, true, 20, '{"weight": 1.0, "volume": 1}', '[{"effect_key": "fuel_vehicle", "value": 10}]', '{fuel, consumable}')
ON CONFLICT (item_key) DO NOTHING;

-- Устанавливаем категории для предметов
UPDATE items_db 
SET category_id = CASE
  WHEN 'prepared_food' = ANY(tags) THEN (SELECT id FROM item_categories WHERE key = 'prepared_food')
  WHEN 'ingredient' = ANY(tags) THEN (SELECT id FROM item_categories WHERE key = 'ingredient')
  WHEN 'food' = ANY(tags) THEN (SELECT id FROM item_categories WHERE key = 'food')
  WHEN 'clothing' = ANY(tags) THEN (SELECT id FROM item_categories WHERE key = 'clothing')
  WHEN 'fuel' = ANY(tags) THEN (SELECT id FROM item_categories WHERE key = 'fuel')
  WHEN 'weapon' = ANY(tags) THEN (SELECT id FROM item_categories WHERE key = 'weapon')
  WHEN 'tool' = ANY(tags) THEN (SELECT id FROM item_categories WHERE key = 'tool')
  WHEN 'resource' = ANY(tags) THEN (SELECT id FROM item_categories WHERE key = 'resource')
  ELSE (SELECT id FROM item_categories WHERE key = 'item')
END
WHERE category_id IS NULL;
