-- ============================================================
-- Миграция: замена TGD и Мафии на четыре уличные банды
--
--   tgd   → grove   (Grove Street)
--   mafia → ballas  (Ballas)
--   + новые: rifa (Varios Los Aztecas), aztec (Aztécas)
--
-- Порядок важен: organizations.id — родитель для 12 таблиц.
-- Сначала создаём новые организации, потом переносим ссылки,
-- и только в конце удаляем старые.
--
-- Миграция идемпотентна: можно запускать повторно.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Новые организации
--    type у всех 'gang' — отдельный тип 'mafia' больше не нужен
--    и не должен появляться снова в фильтрах интерфейса.
-- ------------------------------------------------------------
insert into organizations (id, name, type, description, location_id, max_members) values
  ('grove',  'Grove Street',         'gang', 'Старейший район на юго-западе. Своя школа, свой двор, своя территория.',        'grove_hideout',  25),
  ('ballas', 'Ballas',               'gang', 'Молодые и многочисленные. Держат Los Santos численностью и силой.',            'ballas_hideout', 30),
  ('rifa',   'Varios Los Aztecas',   'gang', 'Старые вооружённые ветераны. Держатся особняком на холме.',                'rifa_hideout',   20),
  ('aztec',  'Aztécas',              'gang', 'Портовая банда. Торгуют всем подряд и бьются за каждый контейнер.',         'aztec_hideout',  25)
on conflict (id) do update
  set name        = excluded.name,
      type        = excluded.type,
      description = excluded.description,
      location_id = excluded.location_id,
      max_members = excluded.max_members;

-- ------------------------------------------------------------
-- 2. Ранги
--    Уровень определяет права: 100 — лидер, 75+ — зам, 25 — рядовой.
--    Ключи permissions — те же, что и у существующих организаций
--    (set_salary, access_safe, change_rank, manage_members, manage_vehicle),
--    иначе интерфейс не увидит прав вообще.
--    Списки названий различаются, чтобы банды не выглядели клонами.
-- ------------------------------------------------------------
insert into org_ranks (org_id, rank_name, rank_level, salary, permissions) values
  ('grove',  'Старейшина', 100, 5000, '{"set_salary": true,  "access_safe": true,  "change_rank": true,  "manage_members": true,  "manage_vehicle": true}'::jsonb),
  ('grove',  'Зам',          75, 3000, '{"set_salary": true,  "access_safe": true,  "change_rank": false, "manage_members": true,  "manage_vehicle": true}'::jsonb),
  ('grove',  'Солдат',       25, 1000, '{"set_salary": false, "access_safe": true,  "change_rank": false, "manage_members": false, "manage_vehicle": false}'::jsonb),
  ('ballas', 'Босс',        100, 6000, '{"set_salary": true,  "access_safe": true,  "change_rank": true,  "manage_members": true,  "manage_vehicle": true}'::jsonb),
  ('ballas', 'Зам',          75, 3000, '{"set_salary": true,  "access_safe": true,  "change_rank": false, "manage_members": true,  "manage_vehicle": true}'::jsonb),
  ('ballas', 'Старший',      25, 1200, '{"set_salary": false, "access_safe": true,  "change_rank": false, "manage_members": false, "manage_vehicle": false}'::jsonb),
  ('rifa',   'Дон',         100, 7000, '{"set_salary": true,  "access_safe": true,  "change_rank": true,  "manage_members": true,  "manage_vehicle": true}'::jsonb),
  ('rifa',   'Капитан',      75, 3500, '{"set_salary": true,  "access_safe": true,  "change_rank": false, "manage_members": true,  "manage_vehicle": true}'::jsonb),
  ('rifa',   'Ветеран',      25, 1500, '{"set_salary": false, "access_safe": true,  "change_rank": false, "manage_members": false, "manage_vehicle": false}'::jsonb),
  ('aztec',  'Лидер',       100, 5500, '{"set_salary": true,  "access_safe": true,  "change_rank": true,  "manage_members": true,  "manage_vehicle": true}'::jsonb),
  ('aztec',  'Инспектор',    75, 2800, '{"set_salary": true,  "access_safe": true,  "change_rank": false, "manage_members": true,  "manage_vehicle": true}'::jsonb),
  ('aztec',  'Грузчик',      25, 1100, '{"set_salary": false, "access_safe": true,  "change_rank": false, "manage_members": false, "manage_vehicle": false}'::jsonb)
on conflict (org_id, rank_name) do update
  set rank_level = excluded.rank_level,
      salary     = excluded.salary;

-- ------------------------------------------------------------
-- 3. Склады
-- ------------------------------------------------------------
insert into org_safe (org_id)
select t.org_id
from unnest(array['grove','ballas','rifa','aztec']) as t(org_id)
on conflict (org_id) do nothing;

-- ------------------------------------------------------------
-- 4. Перенос членов
--    unique(org_id, player_id): если игрок состоял сразу в обеих
--    старых фракциях, после переноса он окажется в grove и ballas —
--    это разные организации, конфликта не будет.
-- ------------------------------------------------------------
update org_members set org_id = 'grove'  where org_id = 'tgd';
update org_members set org_id = 'ballas' where org_id = 'mafia';

update profiles set organization_id = 'grove'  where organization_id = 'tgd';
update profiles set organization_id = 'ballas' where organization_id = 'mafia';

-- ------------------------------------------------------------
-- 5. Ранги, которых больше нет
--    У мафии были «Капо» и «Вербуемый» — в новых бандах таких нет.
--    Опускаем таких участников до самой низкой планки их банды.
-- ------------------------------------------------------------
update org_members m
set rank_name = (
  select r.rank_name from org_ranks r
  where r.org_id = m.org_id
  order by r.rank_level asc
  limit 1
)
where m.org_id in ('grove','ballas','rifa','aztec')
  and not exists (
    select 1 from org_ranks r
    where r.org_id = m.org_id and r.rank_name = m.rank_name
  );

update profiles p
set organization_rank = (
  select m.rank_name from org_members m
  where m.org_id = p.organization_id and m.player_id = p.id
  limit 1
)
where p.organization_id in ('grove','ballas','rifa','aztec')
  and p.organization_rank is not null
  and not exists (
    select 1 from org_ranks r
    where r.org_id = p.organization_id and r.rank_name = p.organization_rank
  );

-- ------------------------------------------------------------
-- 6. Территории
--
--     В базе все 10 зон висели на tgd, кроме нейтрального Idlewood,
--     поэтому тупое «tgd -> grove» отдало бы grove весь город,
--     а rifa и aztec остались бы вообще без земли.
--
--     Раскладка ниже — ровно та, что в игровом конфиге
--     src/features/gangs/data/territoriesConfig.ts (DEFAULT_TERRITORIES):
--       grove  — Ganton (старый оплот) и Market (напряжение)
--       ballas — Idlewood
--       rifa   — Glen Park
--       aztec  — Los Santos Docks (порт)
--       нейтрально остальное — за него банды будут бороться
-- ------------------------------------------------------------
update territories t
set owner_gang_id = v.owner_gang_id,
    status         = v.status,
    control        = v.control
from (values
  ( 1, 'grove'::text,  'CONTROLLED'::text, 82),
  ( 2, 'ballas'::text, 'CONTROLLED'::text, 71),
  ( 3, null::text,     'NEUTRAL'::text,     0),
  ( 4, 'rifa'::text,   'CONTROLLED'::text, 58),
  ( 5, null::text,     'NEUTRAL'::text,     0),
  ( 6, null::text,     'NEUTRAL'::text,     0),
  ( 7, 'grove'::text,  'TENSION'::text,     45),
  ( 8, null::text,     'NEUTRAL'::text,     0),
  ( 9, null::text,     'NEUTRAL'::text,     0),
  (10, 'aztec'::text,  'CONTROLLED'::text, 64)
) as v(id, owner_gang_id, status, control)
where t.id = v.id;

-- ------------------------------------------------------------
-- 7. Влияние
--
--     Пересобираем таблицу под DEFAULT_INFLUENCE из конфига кода,
--     а не правим существующие строки: в базе influence=30 лежал
--     у tgd на Jefferson, Glen Park, Marina и Vinewood, из-за чего
--     grove получал бы влияние на чужих и нейтральных зонах.
--
--     unique(territory_id, gang_id) — отсюда on conflict.
-- ------------------------------------------------------------
delete from territory_influence
where (territory_id, gang_id::text) not in (
  (1, 'grove'::text), (1, 'ballas'::text),
  (2, 'ballas'::text), (2, 'grove'::text),
  (4, 'rifa'::text),
  (7, 'grove'::text), (7, 'ballas'::text),
  (10, 'aztec'::text)
);

insert into territory_influence (territory_id, gang_id, influence) values
  (1,  'grove',  85),
  (1,  'ballas', 10),
  (2,  'ballas', 78),
  (2,  'grove',  15),
  (4,  'rifa',   62),
  (7,  'grove',  60),
  (7,  'ballas', 35),
  (10, 'aztec',  68)
on conflict (territory_id, gang_id) do update set influence = excluded.influence;

update territory_influence_actions set gang_id = 'grove'  where gang_id = 'tgd';
update territory_influence_actions set gang_id = 'ballas' where gang_id = 'mafia';

-- ------------------------------------------------------------
-- 8. Войны
--    Исторические войны со старыми id просто переводим на новые,
--    иначе они остались бы в базе с несуществующими фракциями.
-- ------------------------------------------------------------
update wars              set attacker_gang_id = 'grove'  where attacker_gang_id = 'tgd';
update wars              set defender_gang_id = 'grove'  where defender_gang_id = 'tgd';
update wars              set attacker_gang_id = 'ballas' where attacker_gang_id = 'mafia';
update wars              set defender_gang_id = 'ballas' where defender_gang_id = 'mafia';

update war_events        set attacker_gang_id = 'grove'  where attacker_gang_id = 'tgd';
update war_events        set defender_gang_id = 'grove'  where defender_gang_id = 'tgd';
update war_events        set attacker_gang_id = 'ballas' where attacker_gang_id = 'mafia';
update war_events        set defender_gang_id = 'ballas' where defender_gang_id = 'mafia';

update war_participants  set gang_id = 'grove'  where gang_id = 'tgd';
update war_participants  set gang_id = 'ballas' where gang_id = 'mafia';

-- ------------------------------------------------------------
-- 9. Прочее имущество организаций
-- ------------------------------------------------------------
update org_items     set org_id = 'grove'  where org_id = 'tgd';
update org_items     set org_id = 'ballas' where org_id = 'mafia';
update org_vehicles  set org_id = 'grove'  where org_id = 'tgd';
update org_vehicles  set org_id = 'ballas' where org_id = 'mafia';
update org_salary_log set org_id = 'grove'  where org_id = 'tgd';
update org_salary_log set org_id = 'ballas' where org_id = 'mafia';

-- ------------------------------------------------------------
-- 10. Подчищаем всё, что ещё держит ссылку на tgd/mafia
--
--     Выше мы перенесли всё, что имеет смысл переносить
--     (участники, профили, зоны, влияние, войны, имущество).
--     Но остаются служебные записи, которые переносить некуда:
--     например, org_ranks со старыми названиями «Капо»/«Солдат»
--     и org_safe. Если их не убрать, delete из organizations
--     падает с 23503 — ровно то, на что мы уже наступили.
--
--     Список таблиц берём из самого каталога PostgreSQL, а не
--     перечисляем руками: так чистка не развалится, если в базе
--     есть таблицы, которых нет в наших миграциях.
--
--     К этому моменту осмысленные данные уже переехали в grove/ballas,
--     поэтому трогаются только действительно осиротевшие строки.
--
--     Nullable-ссылки обнуляем, а не удаляем: иначе зона владения
--     territories.owner_gang_id потеряла бы саму территорию.
--     NOT NULL-ссылки (org_ranks, org_safe, ...) — удаляем.
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tbl,
           a.attname            as col,
           a.attnotnull         as required
    from pg_constraint c
    join unnest(c.conkey) as k(attnum) on true
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum   = k.attnum
    where c.contype   = 'f'
      and c.confrelid = 'organizations'::regclass
      and c.conrelid  <> 'organizations'::regclass
      -- только одиночные FK: составной ключ потребовал бы сравнения
      -- сразу по двум колонкам, а таких ссылок на organizations нет
      and array_length(c.conkey, 1) = 1
    group by c.conrelid, a.attname, a.attnotnull
  loop
    if r.required then
      execute format(
        'delete from %s where %I = any (array[''tgd'',''mafia''])',
        r.tbl, r.col
      );
    else
      execute format(
        'update %s set %I = null where %I = any (array[''tgd'',''mafia''])',
        r.tbl, r.col, r.col
      );
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 11. Удаляем старые фракции
--     К этому моменту ссылок на них не осталось ни в одной таблице.
-- ------------------------------------------------------------
delete from organizations where id in ('tgd', 'mafia');

-- ------------------------------------------------------------
-- 12. Цвета зон на карте
--     Цвет ставим только зонам с владельцем. У нейтральных зон
--     color = null: карта отрисует их по статусу, иначе все
--     спорные районы слились бы в один жёлтый.
-- ------------------------------------------------------------
update territories set color = '#22c55e' where owner_gang_id = 'grove';
update territories set color = '#a855f7' where owner_gang_id = 'ballas';
update territories set color = '#eab308' where owner_gang_id = 'rifa';
update territories set color = '#06b6d4' where owner_gang_id = 'aztec';
update territories set color = null      where owner_gang_id is null;

commit;

-- ============================================================
-- Проверка после выполнения
--
--   select id, name, type from organizations order by id;
--
--   select name, owner_gang_id, status, control, color
--     from territories order by id;
--
-- Должно быть 8 организаций (4 штатные + 4 банды) и ни одной ссылки
-- на 'tgd' или 'mafia':
--
--   select 'territories' as t, count(*) from territories
--     where owner_gang_id in ('tgd','mafia')
--   union all
--   select 'influence', count(*) from territory_influence
--     where gang_id in ('tgd','mafia')
--   union all
--   select 'members', count(*) from org_members
--     where org_id in ('tgd','mafia');
-- ============================================================
