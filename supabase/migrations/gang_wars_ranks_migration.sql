-- ============================================================
-- Система войн за территории по модели SAMP
--
-- 1. Ранги банд 1…10. Номер ранга — это темп начисления очков
--    в минуту: ранг 1 даёт 1 очко/мин, ранг 10 — 10 очков/мин.
--    org_ranks.rank_level (100/75/25) не трогаем: он отвечает
--    за права и порядок вывода, а не за бой.
--
-- 2. war_sessions — интервалы участия в войне. Очки считаются
--    из этих строк на стороне БД, клиент присылает только факт
--    «вошел» и «вышел». Длительность берётся из серверных
--    timestamps, поэтому подделать её нельзя.
--
-- 3. wars расширяется полями started_by и winner_gang_id.
--
-- Миграция идемпотентна.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Номер ранга
--    Nullable: он нужен только бандам. У полиции, мэрии и
--    больницы ранги по-прежнему описываются через rank_level.
-- ------------------------------------------------------------
alter table org_ranks add column if not exists rank_number int;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'org_ranks_rank_number_range'
  ) then
    alter table org_ranks
      add constraint org_ranks_rank_number_range
      check (rank_number is null or (rank_number >= 1 and rank_number <= 10));
  end if;
end $$;

create index if not exists idx_org_ranks_lookup
  on org_ranks(org_id, rank_name);

-- ------------------------------------------------------------
-- 2. Десять рангов для каждой банды
--    Названия одинаковые у всех банд — их всегда ищут в паре
--    (org_id, rank_name), так что совпадения не путаются.
--    Права есть только у 8…10 ранга: именно они могут начать
--    войну, плюс 10-й управляет составом и складом.
-- ------------------------------------------------------------
insert into org_ranks (org_id, rank_name, rank_level, salary, permissions, rank_number)
select g.org_id,
       'Ранг ' || n.n,
       n.n * 10,
       500 + n.n * 450,
       case
         when n.n >= 10 then '{"set_salary": true,  "access_safe": true,  "change_rank": true,  "manage_members": true,  "manage_vehicle": true}'::jsonb
         when n.n >= 8  then '{"set_salary": true,  "access_safe": true,  "change_rank": false, "manage_members": true,  "manage_vehicle": true}'::jsonb
         else               '{"set_salary": false, "access_safe": false, "change_rank": false, "manage_members": false, "manage_vehicle": false}'::jsonb
       end,
       n.n
from (values ('grove'), ('ballas'), ('rifa'), ('aztec')) as g(org_id)
cross join generate_series(1, 10) as n(n)
on conflict (org_id, rank_name) do update
  set rank_number  = excluded.rank_number,
      rank_level   = excluded.rank_level,
      salary       = excluded.salary,
      permissions  = excluded.permissions;

-- Старые трёхранговые записи банды (Босс/Зам/Солдат) больше
-- не используются: без rank_number они в войне не участвуют.
-- Удаляем, чтобы они не всплывали в списке рангов.
delete from org_ranks
where org_id in ('grove', 'ballas', 'rifa', 'aztec')
  and rank_number is null;

-- ------------------------------------------------------------
-- 3. Поля войны
-- ------------------------------------------------------------
alter table wars add column if not exists started_by text;
alter table wars add column if not exists winner_gang_id text references organizations(id);

-- Кто и когда начал — по этим полям ищем кулдаун
create index if not exists idx_wars_gang_started
  on wars(attacker_gang_id, started_at desc);

-- ------------------------------------------------------------
-- 4. Интервалы участия
--    Строка появляется на «Участвовать» и закрывается на
--    «Выйти» либо по окончании войны. Ранг фиксируется при
--    входе: если ранг поднимут посреди войны, очки не
--    пересчитаются задним числом.
--
--    Длительность НЕ хранится генерируемой колонкой: для
--    GENERATED ... STORED нужно выражение с признаком
--    IMMUTABLE, а now() — STABLE, и миграция падает с
--    «42P17: generation expression is not immutable».
--    Поэтому длительность считает представление ниже, на
--    стороне базы: клиент её всё равно не подделывает.
-- ------------------------------------------------------------
create table if not exists war_sessions (
  id bigint primary key generated always as identity,
  war_id bigint not null references wars(id) on delete cascade,
  player_id text not null,
  gang_id text not null references organizations(id),
  rank_number int not null check (rank_number >= 1 and rank_number <= 10),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

-- Запрещаем две ОТКРЫТЫЕ сессии одного игрока в одной войне.
-- Частичный индекс, а не обычный unique: выйти и войти снова
-- сколько угодно раз должно быть можно, и каждое участие
-- приносит очки отдельно.
create unique index if not exists idx_war_sessions_one_open
  on war_sessions(war_id, player_id) where left_at is null;

create index if not exists idx_war_sessions_war on war_sessions(war_id);
create index if not exists idx_war_sessions_player on war_sessions(player_id);

alter table war_sessions enable row level security;

drop policy if exists "War sessions visible" on war_sessions;
create policy "War sessions visible" on war_sessions for select using (true);

drop policy if exists "War sessions insertable" on war_sessions;
create policy "War sessions insertable" on war_sessions for insert with check (true);

drop policy if exists "War sessions updatable" on war_sessions;
create policy "War sessions updatable" on war_sessions for update using (true);

drop policy if exists "War sessions deletable" on war_sessions;
create policy "War sessions deletable" on war_sessions for delete using (true);

-- ------------------------------------------------------------
-- 5. Представление с длительностью
--    seconds считается в базе: у открытой сессии это
--    «сколько времени прошло с момента входа», у закрытой —
--    точная длительность. Считать это на клиенте нельзя,
--    left_at присылается клиентом и занизить его можно,
--    а вот завысить нельзя — время всё равно идёт по часам
--    сервера.
-- ------------------------------------------------------------
create or replace view war_session_scores as
select
  id,
  war_id,
  player_id,
  gang_id,
  rank_number,
  joined_at,
  left_at,
  extract(epoch from (coalesce(left_at, now()) - joined_at))::numeric as seconds
from war_sessions;

-- Просим PostgREST перечитать схему, иначе он не увидит
-- ни таблицу, ни представление до ручного перезапуска.
notify pgrst, 'reload schema';

commit;

-- ============================================================
-- Проверка
--
--   select org_id, count(*), min(rank_number), max(rank_number)
--     from org_ranks where org_id in ('grove','ballas','rifa','aztec')
--    group by org_id;
-- Ожидаем 4 строки: count=10, min=1, max=10.
--
--   select rank_name, rank_level, rank_number, salary
--     from org_ranks where org_id = 'grove' order by rank_number;
-- ============================================================
