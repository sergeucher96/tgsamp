-- ==========================================
-- Таблица товаров для бизнесов (конфиг от разработчика)
-- Связь: бизнес (id) -> товар -> ресурсы для производства
-- ==========================================
create table if not exists business_products (
  id bigserial primary key,
  business_id text not null,            -- например shop_24_7, clothes_1
  business_type text not null,          -- shop, clothes, bar, gas etc.
  product_id text not null,             -- matches items.js ID or custom
  product_name text not null,
  icon text,
  price numeric not null,
  resources jsonb default '{}',         -- { "oil": 5, "microchip": 2 }
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Добавляем колонки если таблица создана старым скриптом (каждая колонка проверяется отдельно)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='business_products' and column_name='business_id') then
    alter table business_products add column business_id text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='business_products' and column_name='business_type') then
    alter table business_products add column business_type text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='business_products' and column_name='product_id') then
    alter table business_products add column product_id text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='business_products' and column_name='product_name') then
    alter table business_products add column product_name text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='business_products' and column_name='icon') then
    alter table business_products add column icon text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='business_products' and column_name='resources') then
    alter table business_products add column resources jsonb default '{}';
  end if;
end $$;

alter table business_products enable row level security;

drop policy if exists "business_products select" on business_products;
create policy "business_products select"
  on business_products for select using (true);

drop policy if exists "business_products insert" on business_products;
create policy "business_products insert"
  on business_products for insert with check (true);

drop policy if exists "business_products update" on business_products;
create policy "business_products update"
  on business_products for update using (true) with check (true);

drop policy if exists "business_products delete" on business_products;
create policy "business_products delete"
  on business_products for delete using (true);

create index if not exists idx_business_products_id on business_products(business_id);
create index if not exists idx_business_products_type on business_products(business_type);
create unique index if not exists idx_business_products_unique on business_products(business_id, product_id);

-- Пример данных
insert into business_products (business_id, business_type, product_id, product_name, icon, price, resources) values
  ('shop_24_7', 'shop', 'phone', 'Телефон', '📱', 1500, '{"oil": 5, "microchip": 2}'),
  ('shop_24_7', 'shop', 'sim_card', 'SIM-карта', '💳', 100, '{"microchip": 1}'),
  ('shop_24_7', 'shop', 'repair_kit', 'Ремонтный набор', '🔧', 500, '{"metal": 2, "oil": 1}'),
  ('shop_24_7', 'shop', 'apple', 'Яблоко', '🍎', 50, '{"crop": 1}'),
  ('shop_24_7', 'shop', 'cucumber', 'Огурец', '🥒', 100, '{"crop": 1}'),
  ('shop_24_7', 'shop', 'tomato', 'Помидор', '🍅', 100, '{"crop": 1}'),
  ('shop_24_7', 'shop', 'salt', 'Соль', '🧂', 50, '{}'),
  ('clothes_1', 'clothes', 'cap_basic', 'Бейсболка', '🧢', 800, '{"crop": 3}'),
  ('clothes_1', 'clothes', 'tshirt_basic', 'Футболка', '👕', 500, '{"crop": 2}'),
  ('clothes_1', 'clothes', 'pants_cargo', 'Карго штаны', '👖', 1200, '{"crop": 5}'),
  ('clothes_1', 'clothes', 'sneakers_basic', 'Кроссовки', '👟', 1500, '{"oil": 3, "crop": 2}'),
  ('clothes_1', 'clothes', 'helmet_tactical', 'Тактический шлем', '🪖', 5000, '{"metal": 5, "part": 2}'),
  ('clothes_1', 'clothes', 'chain_silver', 'Серебряная цепь', '📿', 3000, '{"metal": 3}'),
  ('clothes_1', 'clothes', 'chain_gold', 'Золотая цепь', '⛓', 12000, '{"metal": 10}'),
  ('clothes_1', 'clothes', 'chain_diamond', 'Алмазная цепь', '💎', 50000, '{"metal": 20, "microchip": 5}'),
  ('clothes_1', 'clothes', 'jacket_leather', 'Кожаная куртка', '🧥', 8000, '{"crop": 10, "metal": 3}'),
  ('clothes_1', 'clothes', 'vest_tactical', 'Тактическая жилетка', '🦺', 25000, '{"metal": 8, "part": 3}'),
  ('clothes_1', 'clothes', 'gloves_basic', 'Перчатки', '🧤', 600, '{"crop": 2}'),
  ('clothes_1', 'clothes', 'boots_heavy', 'Тяжёлые ботинки', '🥾', 2500, '{"crop": 4, "oil": 2}')
ON CONFLICT (business_id, product_id) DO NOTHING;
