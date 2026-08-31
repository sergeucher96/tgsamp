-- ==========================================
-- Таблица завода (общий склад ресурсов)
-- ==========================================
create table if not exists factory (
  id bigint primary key default 1,
  metal_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into factory (id, metal_count) values (1, 0)
on conflict (id) do nothing;

alter table factory enable row level security;

drop policy if exists "Factory is visible to all" on factory;
create policy "Factory is visible to all"
  on factory for select
  using (true);

drop policy if exists "Factory can be updated by all" on factory;
create policy "Factory can be updated by all"
  on factory for update
  using (true);
