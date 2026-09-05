-- ==========================================
-- Система территорий
-- ==========================================

-- 1. Таблица территорий
create table if not exists territories (
  id bigint primary key generated always as identity,
  name text not null unique,
  owner_gang_id text references organizations(id),
  status text not null default 'NEUTRAL',
  activity int not null default 0 check (activity >= 0 and activity <= 100),
  base_income int not null default 0,
  control int not null default 0 check (control >= 0 and control <= 100),
  min_x double precision not null default 0,
  max_x double precision not null default 0,
  min_y double precision not null default 0,
  max_y double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_territories_owner on territories(owner_gang_id);
create index if not exists idx_territories_status on territories(status);

alter table territories enable row level security;

drop policy if exists "Territories visible" on territories;
drop policy if exists "Territories visible to all" on territories;
create policy "Territories visible" on territories for select using (true);

drop policy if exists "Territories insertable" on territories;
create policy "Territories insertable" on territories for insert with check (true);

drop policy if exists "Territories updatable" on territories;
create policy "Territories updatable" on territories for update using (true);

drop policy if exists "Territories deletable" on territories;
create policy "Territories deletable" on territories for delete using (true);

-- 2. Таблица влияния банд на территории
create table if not exists territory_influence (
  id bigint primary key generated always as identity,
  territory_id bigint not null references territories(id) on delete cascade,
  gang_id text not null references organizations(id),
  influence int not null default 0 check (influence >= 0 and influence <= 100),
  updated_at timestamptz not null default now(),
  unique(territory_id, gang_id)
);

create index if not exists idx_territory_influence_territory on territory_influence(territory_id);
create index if not exists idx_territory_influence_gang on territory_influence(gang_id);

alter table territory_influence enable row level security;

drop policy if exists "Territory influence visible" on territory_influence;
drop policy if exists "Territory influence visible to all" on territory_influence;
create policy "Territory influence visible" on territory_influence for select using (true);

drop policy if exists "Territory influence insertable" on territory_influence;
create policy "Territory influence insertable" on territory_influence for insert with check (true);

drop policy if exists "Territory influence updatable" on territory_influence;
create policy "Territory influence updatable" on territory_influence for update using (true);

drop policy if exists "Territory influence deletable" on territory_influence;
create policy "Territory influence deletable" on territory_influence for delete using (true);

-- 3. Стартовые данные
insert into territories (name, owner_gang_id, status, activity, base_income, control, min_x, max_x, min_y, max_y) values
  ('Ganton', 'tgd', 'CONTROLLED', 75, 1200, 82, 5450, 5850, 5050, 5450),
  ('Idlewood', 'mafia', 'CONTROLLED', 68, 950, 71, 5250, 5650, 4450, 4850),
  ('Jefferson', null, 'NEUTRAL', 30, 800, 0, 5100, 5500, 4750, 5150),
  ('Glen Park', null, 'NEUTRAL', 25, 600, 0, 4900, 5300, 5150, 5550),
  ('Verona Beach', null, 'NEUTRAL', 40, 1000, 0, 5350, 5750, 4250, 4650),
  ('East Los Santos', null, 'NEUTRAL', 35, 900, 0, 5550, 5950, 4650, 5050),
  ('Market', 'tgd', 'TENSION', 55, 1500, 45, 5250, 5650, 4550, 4950),
  ('Marina', null, 'NEUTRAL', 20, 700, 0, 5050, 5450, 4250, 4650),
  ('Vinewood', null, 'NEUTRAL', 60, 1800, 0, 5150, 5550, 4050, 4450),
  ('Los Santos Docks', null, 'NEUTRAL', 15, 2000, 0, 5050, 5450, 5550, 5950)
on conflict (name) do nothing;

insert into territory_influence (territory_id, gang_id, influence) values
  (1, 'tgd', 85),
  (1, 'mafia', 10),
  (2, 'mafia', 78),
  (2, 'tgd', 15),
  (7, 'tgd', 60),
  (7, 'mafia', 35)
on conflict (territory_id, gang_id) do nothing;
