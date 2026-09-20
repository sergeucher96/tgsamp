-- ==========================================
-- Таблица нефтяной вышки (общий склад ресурсов)
-- ==========================================
create table if not exists oil_rig (
  id bigint primary key default 1,  -- Singleton: одна строка для всей вышки
  oil_count int not null default 0, -- Количество нефти на складе
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Начальная строка
insert into oil_rig (id, oil_count) values (1, 0)
on conflict (id) do nothing;

-- RLS (Row Level Security)
alter table oil_rig enable row level security;

-- All authenticated users can read oil rig data
drop policy if exists "Oil rig is visible to all" on oil_rig;
create policy "Oil rig is visible to all"
  on oil_rig for select
  using (true);

-- All authenticated users can update oil rig data (for extracting)
drop policy if exists "Oil rig can be updated by all" on oil_rig;
create policy "Oil rig can be updated by all"
  on oil_rig for update
  using (true);
