-- Фабрика: склад металла и деталей
create table if not exists workshop (
  id bigint primary key default 1,
  metal_count int not null default 0,
  part_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into workshop (id, metal_count, part_count) values (1, 0, 0)
on conflict (id) do nothing;

alter table workshop enable row level security;
drop policy if exists "Workshop is visible to all" on workshop;
create policy "Workshop is visible to all" on workshop for select using (true);
drop policy if exists "Workshop can be updated by all" on workshop;
create policy "Workshop can be updated by all" on workshop for update using (true);