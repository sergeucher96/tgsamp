-- ==========================================
-- Таблица ресурсов склада бизнеса
-- ==========================================
create table if not exists business_resources (
  business_id text not null,
  resource_type text not null,
  quantity numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (business_id, resource_type)
);

alter table business_resources enable row level security;

drop policy if exists "business_resources select" on business_resources;
create policy "business_resources select"
  on business_resources for select using (true);

drop policy if exists "business_resources insert" on business_resources;
create policy "business_resources insert"
  on business_resources for insert with check (true);

drop policy if exists "business_resources update" on business_resources;
create policy "business_resources update"
  on business_resources for update using (true) with check (true);

drop policy if exists "business_resources delete" on business_resources;
create policy "business_resources delete"
  on business_resources for delete using (true);

-- ==========================================
-- Таблица отчётов потребления ресурсов
-- ==========================================
create table if not exists business_reports (
  id bigserial primary key,
  business_id text not null,
  resource_type text not null,
  consumed_hour numeric not null default 0,
  consumed_day numeric not null default 0,
  consumed_week numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (business_id, resource_type)
);

alter table business_reports enable row level security;

drop policy if exists "business_reports select" on business_reports;
create policy "business_reports select"
  on business_reports for select using (true);

drop policy if exists "business_reports insert" on business_reports;
create policy "business_reports insert"
  on business_reports for insert with check (true);

drop policy if exists "business_reports update" on business_reports;
create policy "business_reports update"
  on business_reports for update using (true) with check (true);

-- ==========================================
-- Таблица заказов ресурсов
-- ==========================================
create table if not exists business_orders (
  id bigserial primary key,
  business_id text not null,
  resource_type text not null,
  quantity numeric not null,
  price_per_unit numeric not null,
  total_cost numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table business_orders enable row level security;

drop policy if exists "business_orders select" on business_orders;
create policy "business_orders select"
  on business_orders for select using (true);

drop policy if exists "business_orders insert" on business_orders;
create policy "business_orders insert"
  on business_orders for insert with check (true);

drop policy if exists "business_orders update" on business_orders;
create policy "business_orders update"
  on business_orders for update using (true) with check (true);

drop policy if exists "business_orders delete" on business_orders;
create policy "business_orders delete"
  on business_orders for delete using (true);

create index if not exists idx_business_orders_business_id on business_orders(business_id);
create index if not exists idx_business_orders_status on business_orders(status);

-- ==========================================
-- Добавляем business_balance для счёта бизнеса
-- ==========================================
alter table businesses add column if not exists business_balance numeric not null default 0;

-- ==========================================
-- Конфигурация доступных ресурсов (в JS, здесь импорт/seed не нужен)
-- Все ресурсы: crop, oil, metal, part, microchip
-- ==========================================

-- ==========================================
-- Товары бизнеса (конфигурируется разработчиком через бизнес-логику)
-- ==========================================
create table if not exists business_products (
  id bigserial primary key,
  business_id text not null,
  product_id text not null,
  business_type text not null,
  name text not null,
  icon text not null default '📦',
  price numeric not null,
  resources jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, product_id)
);

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

create index if not exists idx_business_products_business_id on business_products(business_id);
create index if not exists idx_business_products_business_type on business_products(business_type);

-- ==========================================
-- Таблица продаж (учёт потребления ресурсов при покупке товаров)
-- ==========================================
create table if not exists business_sales_log (
  id bigserial primary key,
  business_id text not null,
  product_id text not null,
  product_name text,
  player_id uuid,
  buyer_name text,
  resources_consumed jsonb not null default '{}',
  sale_price numeric not null,
  sale_amount numeric not null default 0,
  resource_changes jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table business_sales_log enable row level security;

drop policy if exists "business_sales_log select" on business_sales_log;
create policy "business_sales_log select"
  on business_sales_log for select using (true);

drop policy if exists "business_sales_log insert" on business_sales_log;
create policy "business_sales_log insert"
  on business_sales_log for insert with check (true);

create index if not exists idx_business_sales_log_business_id on business_sales_log(business_id);
create index if not exists idx_business_sales_log_date on business_sales_log(created_at);