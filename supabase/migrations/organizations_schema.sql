-- ==========================================
-- Универсальная система организаций
-- ==========================================

-- 1. Организации (фиксированный список)
create table if not exists organizations (
  id text primary key,                   -- org_id: lspd, city_hall, hospital, farm_org, band
  name text not null,                    -- ЛSPD, Мэрия, Больница, Ферма, Банда
  type text not null,                    -- police, government, medical, agriculture, gang
  description text,
  location_id text not null,             -- Привязка к локации
  balance bigint not null default 0,     -- Общий баланс организации
  max_members int not null default 10,
  created_at timestamptz not null default now()
);

/* Начальные данные: 6 организаций */
insert into organizations (id, name, type, description, location_id, max_members) values
  ('lspd', 'LSPD', 'police', 'Полиция штата Сан-Андреас. Патрулирование и борьба с преступностью.', 'lspd', 100),
  ('city_hall', 'Мэрия', 'government', 'Городская администрация. Управление муниципальными делами.', 'meriya', 50),
  ('hospital', 'Больница', 'medical', 'Госпиталь. Лечение и медицинская помощь.', 'hospital_1', 30),
  ('farm_org', 'Фермерский кооператив', 'agriculture', 'Управление сельскохозяйственными ресурсами.', 'farm', 40),
  ('tgd', 'TGD', 'gang', 'Уличный бандитский синдикат.', 'bar_1', 25),
  ('mafia', 'Мафия "Коза Ностра"', 'mafia', 'Секретная организация. Контроль торговли, перевозки и защита интересов.', 'mafia_hideout', 30)
on conflict (id) do nothing;

alter table organizations enable row level security;
drop policy if exists "Organizations visible to all" on organizations;
create policy "Organizations visible to all" on organizations for select using (true);

-- Все authenticated могут обновлять баланс (для зарплат и доходов)
drop policy if exists "Organizations updatable" on organizations;
create policy "Organizations updatable" on organizations for update using (true);

-- 2. Ранги в организациях
create table if not exists org_ranks (
  id bigint primary key generated always as identity,
  org_id text not null references organizations(id),
  rank_name text not null,
  rank_level int not null default 0,
  permissions jsonb not null default '{}',
  salary int not null default 0,
  created_at timestamptz not null default now(),
  unique(org_id, rank_name)
);

/* Стандартные ранги для каждой организации */
insert into org_ranks (org_id, rank_name, rank_level, permissions, salary) values
  -- LSPD
  ('lspd', 'Капитан', 100, '{"manage_members":true,"change_rank":true,"access_safe":true,"manage_vehicle":true,"set_salary":true}', 3000),
  ('lspd', 'Сержант', 75, '{"manage_members":true,"change_rank":false,"access_safe":true,"manage_vehicle":true,"set_salary":false}', 2000),
  ('lspd', 'Patrolman', 25, '{"manage_members":false,"change_rank":false,"access_safe":false,"manage_vehicle":false,"set_salary":false}', 1000),
  -- Мэрия
  ('city_hall', 'Мэр', 100, '{"manage_members":true,"change_rank":true,"access_safe":true,"manage_vehicle":true,"set_salary":true}', 4000),
  ('city_hall', 'Сотрудник', 75, '{"manage_members":true,"change_rank":false,"access_safe":true,"manage_vehicle":false,"set_salary":false}', 2000),
  ('city_hall', 'Стажёр', 25, '{"manage_members":false,"change_rank":false,"access_safe":false,"manage_vehicle":false,"set_salary":false}', 1000),
  -- Больница
  ('hospital', 'Главврач', 100, '{"manage_members":true,"change_rank":true,"access_safe":true,"manage_vehicle":true,"set_salary":true}', 3500),
  ('hospital', 'Доктор', 75, '{"manage_members":true,"change_rank":false,"access_safe":true,"manage_vehicle":false,"set_salary":false}', 2500),
  ('hospital', 'Медбрат', 25, '{"manage_members":false,"change_rank":false,"access_safe":false,"manage_vehicle":false,"set_salary":false}', 1500),
  -- Фермерский кооператив
  ('farm_org', 'Глава', 100, '{"manage_members":true,"change_rank":true,"access_safe":true,"manage_vehicle":true,"set_salary":true}', 3000),
  ('farm_org', 'Бригадир', 75, '{"manage_members":true,"change_rank":false,"access_safe":true,"manage_vehicle":true,"set_salary":false}', 2000),
  ('farm_org', 'Рабочий', 25, '{"manage_members":false,"change_rank":false,"access_safe":false,"manage_vehicle":false,"set_salary":false}', 1000),
  -- Банда
  ('tgd', 'Босс', 100, '{"manage_members":true,"change_rank":true,"access_safe":true,"manage_vehicle":true,"set_salary":true}', 5000),
  ('tgd', 'Зам', 75, '{"manage_members":true,"change_rank":false,"access_safe":true,"manage_vehicle":true,"set_salary":false}', 3000),
  ('tgd', 'Солдат', 25, '{"manage_members":false,"change_rank":false,"access_safe":false,"manage_vehicle":false,"set_salary":false}', 1000),
  -- Мафия
  ('mafia', 'Капо', 100, '{"manage_members":true,"change_rank":true,"access_safe":true,"manage_vehicle":true,"set_salary":true}', 6000),
  ('mafia', 'Солдат', 75, '{"manage_members":true,"change_rank":false,"access_safe":true,"manage_vehicle":false,"set_salary":false}', 3000),
  ('mafia', 'Вербуемый', 25, '{"manage_members":false,"change_rank":false,"access_safe":false,"manage_vehicle":false,"set_salary":false}', 1500)
on conflict (org_id, rank_name) do nothing;

alter table org_ranks enable row level security;

-- Уникальность ранга в организации
create unique index if not exists idx_org_ranks_unique on org_ranks (org_id, rank_name);

drop policy if exists "Ranks visible to all" on org_ranks;
create policy "Ranks visible to all" on org_ranks for select using (true);

-- 3. Участники организаций
create table if not exists org_members (
  id bigint primary key generated always as identity,
  org_id text not null references organizations(id),
  player_id uuid not null references profiles(id),
  rank_name text not null default 'Member',
  salary int not null default 0,
  next_salary_date timestamptz not null default (now() + interval '24 hours'),
  is_leader boolean not null default false,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(org_id, player_id)
);

create index idx_org_members_org on org_members(org_id);
create index idx_org_members_player on org_members(player_id);
create index idx_org_members_next_salary on org_members(next_salary_date);

alter table org_members enable row level security;
drop policy if exists "Org members visible to org members" on org_members;
create policy "Org members visible" on org_members for select using (true);

drop policy if exists "Org members can join via insert" on org_members;
create policy "Org members can insert" on org_members for insert with check (true);

drop policy if exists "Org members can update" on org_members;
create policy "Org members can update" on org_members for update using (true);

drop policy if exists "Org members can delete" on org_members;
create policy "Org members can delete" on org_members for delete using (true);

-- 4. Склад ресурсов организации
create table if not exists org_safe (
  org_id text primary key references organizations(id),
  crop_count int not null default 0,
  metal_count int not null default 0,
  part_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* Начальные строки для каждой организации */
insert into org_safe (org_id) values
  ('lspd'), ('city_hall'), ('hospital'), ('farm_org'), ('tgd'), ('mafia')
on conflict (org_id) do nothing;

alter table org_safe enable row level security;
drop policy if exists "Org safe visible to all" on org_safe;
create policy "Org safe visible" on org_safe for select using (true);

drop policy if exists "Org safe insertable" on org_safe;
create policy "Org safe insertable" on org_safe for insert with check (true);

drop policy if exists "Org safe updatable" on org_safe;
create policy "Org safe updatable" on org_safe for update using (true);

-- 5. Склад предметов организации (SQLite-style JSON)
create table if not exists org_items (
  id bigint primary key generated always as identity,
  org_id text not null references organizations(id),
  item_id text not null,
  quantity int not null default 1,
  created_at timestamptz not null default now(),
  unique(org_id, item_id)
);

create index idx_org_items_org on org_items(org_id);

-- Уникальность предмета в организации
create unique index if not exists idx_org_items_unique on org_items (org_id, item_id);

alter table org_items enable row level security;
drop policy if exists "Org items visible to all" on org_items;
create policy "Org items visible" on org_items for select using (true);

drop policy if exists "Org items insertable" on org_items;
create policy "Org items insertable" on org_items for insert with check (true);

drop policy if exists "Org items updatable" on org_items;
create policy "Org items updatable" on org_items for update using (true);

drop policy if exists "Org items deletable" on org_items;
create policy "Org items deletable" on org_items for delete using (true);

-- 6. Служебный транспорт организации
create table if not exists org_vehicles (
  id bigint primary key generated always as identity,
  org_id text not null references organizations(id),
  vehicle_type text not null,           -- patrol_car, van, truck
  purchased boolean not null default false,
  cost bigint not null default 0,
  assigned_player_id uuid references profiles(id),
  access_rank_ids bigint[] not null default '{}', -- ID рангов с доступом
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_org_vehicles_org on org_vehicles(org_id);

alter table org_vehicles enable row level security;
drop policy if exists "Org vehicles visible to all" on org_vehicles;
create policy "Org vehicles visible" on org_vehicles for select using (true);

drop policy if exists "Org vehicles insertable" on org_vehicles;
create policy "Org vehicles insertable" on org_vehicles for insert with check (true);

drop policy if exists "Org vehicles updatable" on org_vehicles;
create policy "Org vehicles updatable" on org_vehicles for update using (true);

-- 7. Лог зарплат
create table if not exists org_salary_log (
  id bigint primary key generated always as identity,
  org_id text not null references organizations(id),
  player_id uuid not null references profiles(id),
  amount bigint not null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_org_salary_log_org on org_salary_log(org_id);
create index idx_org_salary_log_player on org_salary_log(player_id);

alter table org_salary_log enable row level security;
drop policy if exists "Salary log visible to all" on org_salary_log;
create policy "Salary log visible" on org_salary_log for select using (true);

drop policy if exists "Salary log insertable" on org_salary_log;
create policy "Salary log insertable" on org_salary_log for insert with check (true);