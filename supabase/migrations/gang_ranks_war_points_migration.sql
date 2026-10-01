-- ============================================================
-- Миграция: очки в войне задаются для каждого ранга отдельно
--
-- Сейчас очки считаются как «номер ранга × минуты»:
--   warPointsFor(rankNumber, seconds) = rankNumber * seconds / 60
-- То есть ранг 1 даёт 1 очко в минуту, ранг 10 — 10. Связь
-- жёсткая, и настроить её в игре нельзя, только в коде.
--
-- Добавляем org_ranks.war_points_per_min — сколько очков в минуту
-- даёт ранг в войне за территорию. Правки делает редактор рангов
-- в админ-панели (только в dev-сборке).
--
-- Значение по умолчанию = rank_number, поэтому поведение не
-- меняется: до правок ранг N даёт N очков в минуту, как и раньше.
--
-- Множитель НЕ хранится в war_sessions намеренно: он подставляется
-- представлением по rank_number. Правка множителя задним числом
-- изменит очки только в ещё не начатых войнах — в уже идущих
-- пересчёта не будет, иначе можно было бы «подкрутить» исход войны.
-- ============================================================

begin;

alter table org_ranks add column if not exists war_points_per_min int;

-- Заполняем: ранг N даёт N очков в минуту, как было до этого.
update org_ranks
set war_points_per_min = rank_number
where war_points_per_min is null;

-- Дальше значение обязано быть заполнено: иначе ранг молча
-- начнёт приносить ноль очков, а это хуже, чем ошибка.
alter table org_ranks alter column war_points_per_min set default 0;

-- Представление пересобираем: добавляем points_per_min в конец,
-- чтобы порядок и типы уже существующих колонок не изменились
-- (иначе CREATE OR REPLACE откажется работать).
--
-- Join идёт не напрямую на org_ranks, а через distinct on: уникальности
-- по (org_id, rank_number) в таблице нет, только по (org_id, rank_name).
-- Если бы такой дубликат появился, обычный join размножил бы строки
-- сессии и завысил очки в войне — а это испортило бы результат боя.
create or replace view war_session_scores as
select
  ws.id,
  ws.war_id,
  ws.player_id,
  ws.gang_id,
  ws.rank_number,
  ws.joined_at,
  ws.left_at,
  extract(epoch from (coalesce(ws.left_at, now()) - ws.joined_at))::numeric as seconds,
  coalesce(r.war_points_per_min, ws.rank_number) as points_per_min
from war_sessions ws
left join (
  select distinct on (org_id, rank_number)
    org_id, rank_number, war_points_per_min
  from org_ranks
  where rank_number is not null
  order by org_id, rank_number, id
) r on r.org_id = ws.gang_id
   and r.rank_number = ws.rank_number;

commit;

-- Просим PostgREST перечитать схему, иначе новая колонка
-- не появится в ответе до перезапуска.
notify pgrst, 'reload schema';
