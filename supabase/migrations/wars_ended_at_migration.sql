-- ============================================================
-- Миграция: wars.ended_at
--
-- В wars уже есть ends_at — это когда война ДОЛЖНА закончиться.
-- А settleWar писал ended_at — когда она закончилась ПОФАКТУ.
-- Колонки не совпадали, и PostgREST отвечал на подведение
-- итогов 400 Bad Request:
--
--   PATCH /rest/v1/wars?id=eq.2&status=eq.WAR_ACTIVE
--   {"code":"PGRST204","message":"Could not find the 'ended_at' column"}
--
-- ends_at для этого не годится: война может завершиться досрочно,
-- и тогда ends_at врёт. Поэтому добавляем отдельную колонку.
-- ============================================================

begin;

alter table wars add column if not exists ended_at timestamptz;

-- Уже завершённые войны: проставляем время окончания задним
-- числом, чтобы в истории не осталось пустых значений.
-- updated_at — точная замена, updated_at двигает триггер при
-- каждой записи, так что для ENDED он и есть момент финала.
update wars
set ended_at = coalesce(ended_at, updated_at, ends_at)
where status = 'ENDED' and ended_at is null;

commit;

-- Просим PostgREST перечитать схему, иначе он продолжит
-- отдавать 400 до перезапуска.
notify pgrst, 'reload schema';
