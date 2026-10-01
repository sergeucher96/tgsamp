-- ============================================================
-- Миграция: полигоны территорий для редактора карты
--
-- territories уже хранит осевой прямоугольник (min_x/max_x/min_y/max_y),
-- но этого мало: кривая зона не помещается в прямоугольник, и игрок
-- может оказаться «внутри» участка, который на карте не занят.
--
-- Добавляем points — точный контур в координатах карты.
--   формат: [{ "x": 5450, "y": 5050 }, { "x": 5650, "y": 4850 }, ...]
--
-- bbox НЕ удаляем: он остаётся заполненным, потому что от него
-- зависит territoryService.isInsideTerritory и куча существующего кода.
-- Приложение переведёт проверку на полигон позже, когда появится нужда.
-- ============================================================

alter table territories add column if not exists points jsonb;

-- ------------------------------------------------------------
-- Заполняем контур по имеющемуся прямоугольнику,
-- чтобы старые территории не остались «без формы».
-- ------------------------------------------------------------
update territories
set points = jsonb_build_array(
  jsonb_build_object('x', min_x, 'y', min_y),
  jsonb_build_object('x', max_x, 'y', min_y),
  jsonb_build_object('x', max_x, 'y', max_y),
  jsonb_build_object('x', min_x, 'y', max_y)
)
where points is null
  and (min_x <> 0 or max_x <> 0 or min_y <> 0 or max_y <> 0);

-- ------------------------------------------------------------
-- У страницы территорий теперь есть цвет контура — так зоны видно на карте
-- ------------------------------------------------------------
alter table territories add column if not exists color text;

update territories
set color = case
  when owner_gang_id = 'mafia' then '#ef4444'
  when owner_gang_id is not null then '#22c55e'
  else '#eab308'
end
where color is null;

-- ------------------------------------------------------------
-- Защита от мусора: контур должен быть массивом точек
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'territories_points_is_array'
  ) then
    alter table territories
      add constraint territories_points_is_array
      check (points is null or jsonb_typeof(points) = 'array');
  end if;
end
$$;
