-- ==========================================
-- Таблица фермы (общий склад ресурсов)
-- ==========================================
create table if not exists farm (
  id bigint primary key default 1,  -- Singleton: одна строка для всей фермы
  crop_count int not null default 0, -- Количество урожая на складе
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Начальная строка
insert into farm (id, crop_count) values (1, 0)
on conflict (id) do nothing;

-- RLS (Row Level Security)
alter table farm enable row level security;

-- All authenticated users can read farm data
drop policy if exists "Farm is visible to all" on farm;
create policy "Farm is visible to all"
  on farm for select
  using (true);

-- All authenticated users can update farm data (for harvesting)
drop policy if exists "Farm can be updated by all" on farm;
create policy "Farm can be updated by all"
  on farm for update
  using (true);
