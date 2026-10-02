-- ============================================================
--  Бокс: очередь и подбор противника
-- ============================================================
--
--  Игрок нажимает «встать в очередь», попадает в список готовых
--  бойцов. Второй выбирает его и начинает бой. Результат видят
--  оба, после чего игрок выходит из списка.
--
--  ПОЧЕМУ ОТДЕЛЬНАЯ ТАБЛИЦА, А НЕ ФЛАГ В ПРОФИЛЕ
--  ----------------------------------------------
--  Очередь — это про запись, а не про игрока. Игрок один, записей
--  в очереди у него тоже одна, но очередь общая на всех: дергать
--  profiles ради «кто сейчас готов драться» означало бы писать в
--  профиль на каждом входе и выходе. Отдельная таблица с
--  первичным ключом по player_id даёт то же самое и позволяет
--  удалить игрока из очереди одним delete.
--
--  КАК ОБА ИГРОКА УВИДЯТ ОДИН И ТОТ ЖЕ БОЙ
--  -----------------------------------------
--  Считает вызывающий — у него уже есть готовый результат в ответе
--  RPC. Защитник узнаёт о бое из своей же строки очереди: атакующий
--  проставляет в ней fight_id, строка попадает в подписку realtime,
--  и защитник забирает бой функцией pvp_queue_take.
--
--  Поэтому fight_id лежит в строке очереди, а не рассылается
--  отдельным сообщением: ссылка на конкретный бой не теряется и не
--  перепутается, если вызовов было два.
--
--  ГОНКА ДВУХ ВЫЗЫВАЮЩИХ
--  ----------------------
--  На одного стоящего в очереди могут нажать одновременно. Поэтому
--  строка забирается атомарно:
--
--    update pvp_queue set status='fighting'
--     where player_id = ... and status='waiting';
--
--  и дальше проверяется число затронутых строк. Победитель ровно
--  один; второму достаётся «противник уже в бою». Если после этого
--  расчёт боя упадёт, откатится вся транзакция вместе с захватом —
--  строка вернётся в 'waiting' сама, чинить её не нужно.
--
--  ПОЧЕМУ МОЩНОСТЬ КЛАДЁТСЯ В СТРОКУ ОЧЕРЕДИ
--  -------------------------------------------
--  Чтобы показать силу бойца в списке, нужен снимок, а pvp_fighter_snapshot
--  считает его по шести таблицам. Считать его для каждого в очереди
--  при каждом открытии списка — заметная нагрузка, поэтому снимок
--  берётся один раз при входе в очередь.
--
--  Из этого следует известное ограничение: если игрок сменил броню,
--  пока стоял в очереди, в списке покажется прежняя мощь. Сам бой
--  снимок перечитывает заново, так что расчёт боя всегда по свежим
--  данным — расходится только надпись в списке. Это осознанно:
--  честный расчёт важнее, а надпись можно не совпасть.
--
--  ПРИМЕНЕНИЕ: зависит от pvp_fight_migration.sql, pvp_fighter_snapshot
--  и pvp_resolve_migration.sql. Порядок файлов — после них.
-- ============================================================

begin;

-- ============================================================
--  Снос старых перегрузок
-- ============================================================
--
--  `create or replace function` умеет менять тело, но не может
--  переименовать или переставить входные параметры: на расхождении
--  Postgres отвечает 42P13 и весь файл откатывается.
--
--  Подписи pvp_queue_fight и pvp_queue_take в базе не совпадают с
--  объявленными здесь, поэтому перечислять их вручную нельзя:
--  неизвестно, какие версии файлов применены раньше. Удаляются все
--  перегрузки сразу — каждая функция из списка создаётся заново ниже
--  по этому же файлу. Блокировки зависимостей не будет: тела
--  PL/pgSQL в pg_depend не попадают.
do $$
declare
  r record;
begin
  perform set_config('search_path', 'public, pg_temp', true);

  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'pvp_queue_join',
        'pvp_queue_leave',
        'pvp_queue_list',
        'pvp_queue_fight',
        'pvp_queue_take'
      ])
  loop
    execute format('drop function %s', r.sig);
  end loop;
end $$;

-- ============================================================
--  1. Очередь
-- ============================================================
--
--  Две фазы: waiting — ждёт вызова, fighting — вызван, ждёт, пока
--  клиент покажет модалку. Вторую фазу нельзя пропускать: строке
--  нужно место, чтобы хранить fight_id до просмотра.

create table if not exists pvp_queue (
  player_id uuid primary key references profiles(id) on delete cascade,

  joined_at   timestamptz not null default now(),
  status      text not null default 'waiting'
                check (status in ('waiting', 'fighting')),
  fight_id    bigint references pvp_fights(id) on delete set null,

  -- Проставлен, когда клиент забрал бой. Без него один и тот же
  -- бой показывался бы заново при каждом открытии меню.
  acknowledged_at timestamptz,

  -- Мощь на момент входа в очередь. См. пояснение в шапке.
  power integer
);

comment on table pvp_queue is
  'Очередь бокса: кто готов к бою. Строка на игрока, удаляется при выходе из боя.';

-- Индекс по времени входа: список бойцов всегда свежие сверху,
-- и без него база сортировала бы всю очередь ради первых строк.
create index if not exists idx_pvp_queue_joined on pvp_queue (joined_at desc);

alter table pvp_queue enable row level security;

-- Чтение открытое — и это не недосмотр. Проект входит через
-- Telegram HMAC, auth.uid() здесь не работает, отфильтровать
-- очередь по «своей» строке на уровне RLS нечем: игрок известен
-- только как параметр. К тому же очередь общедоступна по смыслу —
-- видеть, кто готов драться, и есть её назначение.
drop policy if exists pvp_queue_read on pvp_queue;
create policy pvp_queue_read on pvp_queue
  for select to anon, authenticated
  using (true);

-- Запись только через функции с security definer: anon получает
-- права на новые таблицы в public по умолчанию, и без revoke он
-- дописал бы в очередь мимо всех проверок.
revoke insert, update, delete on pvp_queue from anon, authenticated;

-- select выдаётся явно, а не в расчёте на то, что Supabase раздаёт
-- права на новые таблицы автоматически: без него подписка realtime
-- не доставит событие, и защитник узнает о бое только при
-- следующем открытии меню.
grant select on pvp_queue to anon, authenticated;


-- ============================================================
--  2. Вход и выход
-- ============================================================

create or replace function public.pvp_queue_join(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_ttl interval := interval '15 minutes';

  v_pending bigint;
  v_snap jsonb;
  v_power integer;
begin
  if p_player_id is null then
    raise exception 'Не указан игрок' using errcode = 'invalid_parameter_value';
  end if;

  select fight_id into v_pending
  from pvp_queue
  where player_id = p_player_id
    and fight_id is not null
    and acknowledged_at is null;

  -- Показывать бой важнее, чем вставать в очередь. Если
  -- затереть fight_id здесь, защитник его уже не увидит никогда.
  if v_pending is not null then
    raise exception 'Сначала посмотрите итог предыдущего боя'
      using errcode = 'check_violation';
  end if;

  -- Самоочистка: записи, висящие дольше TTL, принадлежат игрокам,
  -- которые закрыли игру. Уборка при входе — и очередь не растёт
  -- сама, и лишние записи удаляются без отдельного задания.
  delete from pvp_queue
   where status = 'waiting'
     and joined_at < now() - c_ttl
     and player_id <> p_player_id;

  -- max_hp лежит внутри jsonb, а не отдельной колонкой: функция
  -- отдаёт jsonb целиком. Пытаться выбрать из неё поле как из
  -- таблицы нельзя.
  select (public.pvp_fighter_snapshot(p_player_id) ->> 'max_hp')::integer into v_power;
  v_power := coalesce(v_power, 100);

  insert into pvp_queue (player_id, joined_at, status, fight_id, acknowledged_at, power)
  values (p_player_id, now(), 'waiting', null, null, v_power)
  on conflict (player_id) do update
    set joined_at = now(),
        status = 'waiting',
        fight_id = null,
        acknowledged_at = null,
        power = excluded.power;

  return jsonb_build_object('ok', true, 'power', v_power);
end;
$$;

grant execute on function public.pvp_queue_join(uuid) to anon, authenticated;


create or replace function public.pvp_queue_leave(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_player_id is null then
    raise exception 'Не указан игрок' using errcode = 'invalid_parameter_value';
  end if;

  delete from pvp_queue where player_id = p_player_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.pvp_queue_leave(uuid) to anon, authenticated;


-- ============================================================
--  3. Список готовых бойцов
-- ============================================================

create or replace function public.pvp_queue_list(p_player_id uuid)
returns table (
  player_id     uuid,
  username      text,
  lvl           integer,
  power         integer,
  rating        integer,
  waiting_since timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    q.player_id,
    coalesce(p.username, 'Боец'),
    p.lvl,
    coalesce(q.power, 0),
    coalesce(r.rating, 1000),
    q.joined_at
  from pvp_queue q
  join profiles p on p.id = q.player_id
  left join pvp_ratings r on r.player_id = q.player_id
  where q.status = 'waiting'
    and q.player_id is distinct from p_player_id
    -- Свежие сверху, но не древние: игрок мог выйти из игры.
    and q.joined_at >= now() - interval '15 minutes'
  order by q.joined_at
  limit 50;
$$;

grant execute on function public.pvp_queue_list(uuid) to anon, authenticated;


-- ============================================================
--  4. Бой с игроком из очереди
-- ============================================================
--
--  Возвращает результат с точки зрения вызывающего. Защитник
--  заберёт тот же бой через pvp_queue_take.

create or replace function public.pvp_queue_fight(
  p_challenger_id uuid,
  p_defender_id   uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claimed integer;
  v_result  jsonb;
  v_fight_id bigint;
begin
  if p_challenger_id is null or p_defender_id is null then
    raise exception 'Не указана сторона боя' using errcode = 'invalid_parameter_value';
  end if;

  if p_challenger_id = p_defender_id then
    raise exception 'Нельзя вызвать себя на бой' using errcode = 'check_violation';
  end if;

  -- Захват строки противника: условие status='waiting' делает
  -- проверку и захват одним выражением, без гонки между
  -- SELECT и UPDATE. Число затронутых строк и есть «свободен ли».
  update pvp_queue
     set status = 'fighting'
   where player_id = p_defender_id
     and status = 'waiting'
     and joined_at >= now() - interval '15 minutes';

  get diagnostics v_claimed = row_count;

  if v_claimed = 0 then
    raise exception 'Противник уже в бою или вышел из очереди'
      using errcode = 'check_violation';
  end if;

  v_result := public.pvp_resolve_player(p_challenger_id, p_defender_id);
  v_fight_id := (v_result->>'fight_id')::bigint;

  -- Ссылка на бой для защитника. Если он сейчас не в игре,
  -- разберёт её при следующем открытии меню.
  update pvp_queue
     set fight_id = v_fight_id,
         acknowledged_at = null
   where player_id = p_defender_id;

  -- Вызывающий больше не свободен: убираем его из очереди.
  delete from pvp_queue where player_id = p_challenger_id;

  return v_result
    || jsonb_build_object('my_side', 'a', 'won', (v_result->>'winner') = 'a');
end;
$$;

grant execute on function public.pvp_queue_fight(uuid, uuid) to anon, authenticated;


-- ============================================================
--  5. Забрать свой бой
-- ============================================================
--
--  Отдаёт бой один раз: acknowledged_at проставляется здесь же, иначе
--  клиент, упавший до отрисовки модалки, увидел бы тот же бой заново.
--  Потерять бой целиком нельзя, поэтому подтверждение происходит
--  только в момент успешной выдачи.

create or replace function public.pvp_queue_take(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fight_id bigint;
  v_result   jsonb;
  v_my_side  text;
  v_won      boolean;
  v_claimed  integer;
begin
  if p_player_id is null then
    raise exception 'Не указан игрок' using errcode = 'invalid_parameter_value';
  end if;

  select fight_id into v_fight_id
  from pvp_queue
  where player_id = p_player_id
    and fight_id is not null
    and acknowledged_at is null;

  if v_fight_id is null then
    return jsonb_build_object('ok', true, 'has_fight', false);
  end if;

  update pvp_queue
     set acknowledged_at = now()
   where player_id = p_player_id
     and fight_id = v_fight_id
     and acknowledged_at is null;

  get diagnostics v_claimed = row_count;

  -- ПОЧЕМУ ПРОВЕРЯЕМ ЧИСЛО СТРОК, А НЕ ПРОСТО ПИШЕМ
  -- Клиент зовёт take и по событию realtime, и при открытии
  -- меню, поэтому два вызова пересекаются почти всегда. Без
  -- этой проверки оба успевали прочитать fight_id до
  -- acknowledged_at и вернуть один и тот же бой — модалка
  -- показывалась бы дважды. Подтверждение в update отдаёт бой
  -- ровно одному: кто обновил строку, тот и забрал.
  if v_claimed = 0 then
    return jsonb_build_object('ok', true, 'has_fight', false);
  end if;

  -- row_to_json, а не select f.*: иначе v_result имеет тип record,
  -- у которого нет оператора ->>, и обращение к полю падает.
  select row_to_json(f) into v_result
  from pvp_fights f
  where f.id = v_fight_id;

  if not found then
    return jsonb_build_object('ok', true, 'has_fight', false);
  end if;

-- Сторона смотрится от лица игрока: журнал приходит в чужой
  -- системе координат, и без этого модалка показала бы чужой
  -- исход как свой.
  --
  -- Победитель лежит в winner_id. Ключа 'winner' в pvp_fights нет
  -- вообще, и обращение к нему молча давало null, а не «поражение».
  if v_result->>'challenger_id' = p_player_id::text then
    v_my_side := 'a';
  else
    v_my_side := 'd';
  end if;
  v_won := (v_result->>'winner_id') = p_player_id::text;

  return jsonb_build_object(
    'ok', true,
    'has_fight', true,
    'fight_id', v_fight_id,
    'my_side', v_my_side,
    'won', v_won,
    'seed', v_result->'seed',
    'rounds', v_result->'rounds',
    -- Остаток здоровья после боя. Без него защитник видел бы обе
    -- полные полоски: pvp_fights хранит attacker_hp/defender_hp, а
    -- pvp_queue_take их не отдавал, и presentFight подставлял вместо
    -- них максимум. Максимумы берутся из снимков (max_hp) — своих
    -- колонок у pvp_fights нет.
    'attacker_hp', v_result->'attacker_hp',
    'defender_hp', v_result->'defender_hp',
    'attacker_snapshot', v_result->'attacker_snapshot',
    'defender_snapshot', v_result->'defender_snapshot',
    'log', v_result->'log'
  );
end;
$$;

grant execute on function public.pvp_queue_take(uuid) to anon, authenticated;

commit;

notify pgrst, 'reload schema';

-- ============================================================
--  6. Realtime
-- ============================================================
--
--  Без строки в публикации защитник не узнает о бое, пока не
--  откроет меню заново. Публикация настраивается в панели Supabase,
--  поэтому шаг ручной — и идемпотентный, повторный прогон безопасен.
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pvp_queue'
  ) then
    alter publication supabase_realtime add table public.pvp_queue;
  end if;
end;
$$;