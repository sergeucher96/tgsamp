-- ============================================================
--  Характеристики одежды в базе
-- ============================================================
--
--  Зачем
-- -----
--  Вся система одежды сейчас живёт только в коде:
--
--    clothingConfig.ts:29   CLOTHING_DATABASE — 13 предметов со stats
--    ShopView.tsx:79        магазин продаёт оттуда
--    useEquipmentStore.ts:61  экипировка читает оттуда
--    useEquipmentStore.ts:147 getStats() складывает статы оттуда
--
--  То есть сервер посчитать броню игрока не может: в базе из
--  13 предметов одежды лежит только cap_basic, и даже у него
--  в properties только вес.
--
--  Почему отдельная таблица, а не items_db.properties
--  --------------------------------------------------
--  Очевидное решение — дописать статы в items_db. Но это ломает
--  разделение источников:
--
--  * 11 отсутствующих предметов появились бы в админ-каталоге
--    предметов (ItemCatalog.tsx), где автор может их отредактировать.
--    Правка в UI и в clothingConfig.ts разошлись бы, и редактор
--    начал бы показывать одно, а игра считать другое.
--  * Магазин (ShopView.tsx:79) берёт цену и описание из кода,
--    а не из items_db. Появление строк в каталоге не дало бы
--    им продаваться, но создало бы две не связанные правды.
--
--  Отдельная таблица ничего из этого не затрагивает: её читает
--  только сервер, её никто не редактирует из интерфейса, а
--  клиент по-прежнему берёт описания из кода. Источник боевых
--  характеристик один, и он серверный.
--
--  Пока это не причина отказываться от кода: одежду по-прежнему
--  покупают и надевают через CLOTHING_DATABASE, таблица нужна
--  именно серверному подсчёту брони для PvP.
--
--  ИДЕНТОЧНОСТЬ ИГРОКА. Как и в остальных RPC, id приходит
--  параметром — Supabase Auth не используется, auth.uid() null.
--  Здесь функции чтения нет: таблица открыта на чтение, писать
--  в неё будет только боевая функция, и то не из клиента.
--
--  ПРИМЕНЕНИЕ: файл идемпотентен, можно применить повторно.
--  Зависит только от items_db (для проверки существования).
-- ============================================================

begin;

create table if not exists clothing_stats (
  item_key   text primary key,
  slot       text not null,
  stats      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint clothing_stats_slot_check
    check (slot in ('head', 'neck', 'torso', 'hands', 'legs', 'feet'))
);

comment on table clothing_stats is
  'Боевые и бытовые характеристики одежды. Источник для серверного подсчёта статов: клиент читает CLOTHING_DATABASE, сервер — эту таблицу. Расхождение между ними означает ошибку.';

-- Ключи, которые влияют на бой, отделяем от остальных.
-- Сейчас это armor, но таблица хранит весь набор: inv_slots
-- из pants_cargo серверу тоже понадобится, когда починим
-- лимит сумки (useInventoryStore.ts:198 его сейчас игнорирует).
create or replace function public.clothing_stats_keys()
returns text[]
language sql immutable
as $$ select array['armor','strength','stamina','speed','charisma','luck','inv_slots']; $$;

-- ============================================================
--  Данные — ровно те же, что в clothingConfig.ts
-- ============================================================

insert into clothing_stats (item_key, slot, stats) values
  ('cap_basic',       'head',  '{"charisma": 2}'::jsonb),
  ('helmet_tactical', 'head',  '{"armor": 15}'::jsonb),
  ('chain_silver',    'neck',  '{"charisma": 5}'::jsonb),
  ('chain_gold',      'neck',  '{"charisma": 10}'::jsonb),
  ('chain_diamond',   'neck',  '{"charisma": 20}'::jsonb),
  ('tshirt_basic',    'torso', '{"charisma": 1}'::jsonb),
  ('jacket_leather',  'torso', '{"charisma": 8, "armor": 5}'::jsonb),
  ('vest_tactical',   'torso', '{"armor": 30}'::jsonb),
  ('gloves_basic',    'hands', '{"stamina": 3}'::jsonb),
  ('pants_cargo',     'legs',  '{"stamina": 5, "inv_slots": 2}'::jsonb),
  ('sneakers_basic',  'feet',  '{"speed": 3, "stamina": 3}'::jsonb),
  ('boots_heavy',     'feet',  '{"armor": 3, "stamina": 5}'::jsonb)
on conflict (item_key) do update
  set slot = excluded.slot,
      stats = excluded.stats,
      updated_at = now();

-- ============================================================
--  Сверка: предметы, о которых база не знает
-- ============================================================
--
--  Соответствие между кодом и базой держится вручную: новый
--  предмет в CLOTHING_DATABASE без строки здесь получит
--  server-side статы 0 — то есть броня молча не применится.
--  Такую проверку стоит выполнять при сборке, а пока ловим
--  хотя бы сам факт расхождения.
--
--  Полный список предметов из кода сюда не скопирован намеренно:
--  он и так единственный источник, а дублировать 13 строк в
--  трёх местах — значит получить ещё одно расхождение.
create or replace function public.clothing_stats_missing(p_expected text[])
returns table (item_key text, reason text)
language sql stable
as $$
  -- Предмет ожидается, но строки нет.
  select e.item_key, 'нет строки в clothing_stats'::text
  from unnest(p_expected) as e(item_key)
  where not exists (
    select 1 from clothing_stats cs where cs.item_key = e.item_key
  )
  union all
  -- Строка есть, а предмета в коде уже нет.
  select cs.item_key, 'предмет удалён из CLOTHING_DATABASE'::text
  from clothing_stats cs
  where not (cs.item_key = any(p_expected));
$$;

grant execute on function public.clothing_stats_missing(text[]) to anon, authenticated;

commit;

notify pgrst, 'reload schema';