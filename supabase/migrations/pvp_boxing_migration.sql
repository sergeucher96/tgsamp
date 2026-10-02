-- ============================================================
--  Бокс: три характеристики, тренировка за энергию
-- ============================================================
--
--  Модель взята из Punch Club. Там ровно три характеристики:
--
--      СИЛ    — урон
--      ЛОВ    — точность и уклонение
--      ВЫН    — восстановление энергии и поглощение урона
--
--  Главное отличие от прежней версии — ресурс. В Punch Club
--  тренировка тратит энергию, и тренироваться можно, пока она не
--  кончится: запас на сутки это несколько подходов, а не одна
--  кнопка с откатом в полчаса. Энергия уже есть в profiles и уже
--  расходуется от голода, поэтому новой валюты не заводилось.
--
--  Денег за тренировку больше нет. Деньги в этой системе покупают
--  еду, а еда восстанавливает энергию, — то есть тренировка и
--  сытость связаны напрямую, как в оригинале.
--
--  Порядок применения: после pvp_fight и pvp_fighter_snapshot.
--  Файл идемпотентен: его можно применять повторно.
--

-- ============================================================
--  1. Таблицы и колонки profiles
-- ============================================================
--
--  Статы живут в колонках-числах, а не в строках-дисциплинах:
--  их ровно три и они известны наперёд, а со строками пришлось бы
--  ещё и вручную удалять их при появлении четвёртой.

create table if not exists pvp_boxing_xp (
  player_id  uuid primary key references profiles(id) on delete cascade,

  strength   bigint not null default 0 check (strength >= 0),
  agility    bigint not null default 0 check (agility  >= 0),
  stamina    bigint not null default 0 check (stamina  >= 0),

  updated_at timestamptz not null default now()
);

comment on table pvp_boxing_xp is
  'Опыт трёх боевых характеристик. Клиент не имеет доступа: только чтение снимком и запись через функции.';

-- Отдельный пул спорт-энергии в profiles.
-- Восстановление: 5 в час (1 каждые 12 минут), рассчитывается при чтении
-- через pvp_sport_energy_current. Максимум 100, подход — 8.
alter table profiles
  add column if not exists sport_energy integer not null default 100
    check (sport_energy between 0 and 100);
alter table profiles
  add column if not exists sport_energy_updated_at timestamptz not null default now();

-- Таблица могла остаться от версии с дисциплинами, а
-- `create table if not exists` не добавляет в неё колонки. Без
-- этих строк в базе оказывается таблица вообще без опыта, и любая
-- функция падает с 42703 «record has no field "strength"».
--
-- Все три характеристики добавляются явно, а не только agility:
-- старые колонки boxing/kickboxing/footwork/speed удаляются ниже, и
-- если не добавить новые, таблица остаётся пустой.
alter table pvp_boxing_xp
  add column if not exists strength bigint not null default 0;
alter table pvp_boxing_xp
  add column if not exists agility  bigint not null default 0;
alter table pvp_boxing_xp
  add column if not exists stamina  bigint not null default 0;

-- Старые дисциплины. Удаляются явно, а не остаются мёртвыми
-- колонками: мёртвая колонка в схеме — это приглашение забыть
-- про неё и посчитать не то.
alter table pvp_boxing_xp drop column if exists boxing;
alter table pvp_boxing_xp drop column if exists kickboxing;
alter table pvp_boxing_xp drop column if exists footwork;
alter table pvp_boxing_xp drop column if exists speed;

-- Ограничения неотрицательности именуются явно: в старой таблице
-- они были безымянными, и автоматически созданное имя пришлось бы
-- угадывать, чтобы заменить набор проверок.
alter table pvp_boxing_xp drop constraint if exists pvp_boxing_xp_strength_check;
alter table pvp_boxing_xp drop constraint if exists pvp_boxing_xp_agility_check;
alter table pvp_boxing_xp drop constraint if exists pvp_boxing_xp_stamina_check;
alter table pvp_boxing_xp
  add constraint pvp_boxing_xp_strength_check check (strength >= 0);
alter table pvp_boxing_xp
  add constraint pvp_boxing_xp_agility_check  check (agility  >= 0);
alter table pvp_boxing_xp
  add constraint pvp_boxing_xp_stamina_check  check (stamina  >= 0);

-- Журнал тренировок. Нужен для истории и для разбора спорных
-- начислений; ограничителем служит энергия, а не журнал.
create table if not exists pvp_boxing_sessions (
  id         bigserial primary key,
  player_id  uuid not null references profiles(id) on delete cascade,
  stat       text not null,
  xp_gain    bigint not null,
  energy_cost integer not null,
  created_at timestamptz not null default now()
);

-- Старые строки журнала описывают дисциплины, которых в новой модели
-- нет. Удаляются целиком: журнал нужен для истории, а не для правды,
-- и переносить в него выдуманные значения было бы враньём.
delete from pvp_boxing_sessions;

-- `create table if not exists` не добавляет колонки в уже созданную
-- таблицу: у кого миграция применялась раньше, там остались
-- discipline и money_cost вместо stat и energy_cost. Без этих строк
-- дальше падает либо ограничение, либо индекс — сначала ровно на
-- `column "stat" does not exist`.
alter table pvp_boxing_sessions
  add column if not exists stat text not null default 'strength';
alter table pvp_boxing_sessions
  add column if not exists energy_cost integer not null default 0;
alter table pvp_boxing_sessions drop column if exists discipline;
alter table pvp_boxing_sessions drop column if exists money_cost;

-- Имя ограничения задано явно: иначе Postgres назвал бы его
-- по-разному при разных порядках создания таблицы, и
-- `drop ... if exists` перестал бы его находить.
alter table pvp_boxing_sessions
  drop constraint if exists pvp_boxing_sessions_stat_check;
alter table pvp_boxing_sessions
  drop constraint if exists pvp_boxing_sessions_discipline_check;
alter table pvp_boxing_sessions
  add constraint pvp_boxing_sessions_stat_check
  check (stat in ('strength', 'agility', 'stamina'));

-- Индекс создаётся после удаления колонок: старый индекс висел на
-- discipline и убрался бы вместе с ней, а `if not exists` иначе
-- молча пропустил бы создание нового.
create index if not exists idx_pvp_boxing_sessions
  on pvp_boxing_sessions (player_id, stat, created_at desc);

-- ============================================================
--  2. RLS
-- ============================================================
--
--  Ни одной политики: клиент не видит ни прогресса, ни журнала.
--  Иначе правка опыта была бы такой же простой, как у player_skills.

alter table pvp_boxing_xp enable row level security;
alter table pvp_boxing_sessions enable row level security;

revoke all on pvp_boxing_xp from anon, authenticated;
revoke all on pvp_boxing_sessions from anon, authenticated;


-- ============================================================
--  Снос старых перегрузок
-- ============================================================
--
--  `create or replace function` умеет менять тело, но не может
--  переименовать или переставить входные параметры: на расхождении
--  Postgres отвечает 42P13 и миграция падает.
--
--  Перечислять старые подписи в `drop function` здесь нельзя. Подписи
--  менялись вместе с переходом от дисциплин к силе, ловкости и
--  выносливости, причём порядок аргументов местами менялся целиком:
--  pvp_boxing_train развёрнута как (text, uuid), а нужна как
--  (uuid, text). Назвать такую подпись по памяти невозможно, а одна
--  ошибка в списке даёт ровно ту же 42P13, что и пустой список.
--
--  Поэтому удаляются все перегрузки сразу, без сравнения подписей:
--  каждая функция из списка создаётся заново ниже по этому же файлу.
--  Блокировки зависимостей не будет — тела PL/pgSQL в pg_depend не
--  попадают, а pvp_resolve_player вызывает pvp_boxing_award_fight уже
--  из пересозданной версии.
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
        'pvp_boxing_xp_for_level',
        'pvp_boxing_level',
        'pvp_boxing_levels',
        'pvp_boxing_grant',
        'pvp_boxing_award_fight',
        'pvp_boxing_train',
        'pvp_boxing_progress'
      ])
  loop
    execute format('drop function %s', r.sig);
  end loop;
end $$;


-- ============================================================
--  Вспомогательная: текущая спорт-энергия с автовосстановлением
-- ============================================================
--
--  Восстановление: 5 в час = 5/3600 в секунду.
--  Функция читает сохранённое значение и timestamp, прибавляет
--  накопленное, клипает до 100 и возвращает. Не пишет в БД —
--  запись происходит только при трате (тренировка) или явном обновлении.
--  Это дешевле и безопаснее, чем крон: нет гонок, работает сразу.
create or replace function public.pvp_sport_energy_current(p_player_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  c_max   constant integer := 100;
  c_rate  constant numeric := 5.0 / 3600.0;  -- 5 в час, в секунду
  v_row   record;
  v_elapsed interval;
  v_gain  integer;
begin
  select sport_energy, sport_energy_updated_at
    into v_row
    from profiles
   where id = p_player_id;
  if not found then
    return 0;
  end if;

  v_elapsed := now() - coalesce(v_row.sport_energy_updated_at, now());
  v_gain := floor(extract(epoch from v_elapsed) * c_rate)::integer;

  return least(c_max, greatest(0, coalesce(v_row.sport_energy, 0)) + v_gain);
end;
$$;

grant execute on function public.pvp_sport_energy_current(uuid) to anon, authenticated;


-- ============================================================
--  3. Кривая уровней
-- ============================================================
--
--  Стоимость перехода с уровня L на L+1:
--
--      120 + 40 * L        (120, потом 160, 200, ...)
--
--  Ранние уровни набираются быстро, поздние — заметно дольше.
--  Линейная кривая утомляет, экспоненциальная недостижима за
--  разумное время игры.
--
--  Формула ниже — сумма этого ряда:
--      xp(L) = 120*L + 20*L*(L-1)

create or replace function public.pvp_boxing_xp_for_level(p_level integer)
returns bigint
language sql
immutable
as $$
  select case
    when coalesce(p_level, 0) <= 0 then 0::bigint
    else (120::bigint * p_level) + (20::bigint * p_level * (p_level - 1))
  end;
$$;

comment on function public.pvp_boxing_xp_for_level(integer) is
  'Сколько всего опыта нужно, чтобы получить уровень p_level.';

grant execute on function public.pvp_boxing_xp_for_level(integer) to anon, authenticated;

-- Обратная задача: уровень по опыту. Циклом, а не решением
-- квадратного уравнения: при округлении вниз на границе уровня
-- уравнение дало бы L-1, и игрок терял бы уровень из-за одного
-- очка опыта.
create or replace function public.pvp_boxing_level(p_xp bigint)
returns integer
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  c_level_max constant integer := 20;
  v_level integer := 0;
  v_xp    bigint := greatest(coalesce(p_xp, 0), 0);
begin
  while v_level < c_level_max
        and v_xp >= public.pvp_boxing_xp_for_level(v_level + 1)
  loop
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

comment on function public.pvp_boxing_level(bigint) is
  'Уровень характеристики по накопленному опыту. Потолок — 20.';

grant execute on function public.pvp_boxing_level(bigint) to anon, authenticated;


-- ============================================================
--  4. Уровни для снимка бойца
-- ============================================================
--
--  Читает три уровня одним вызовом: pvp_fighter_snapshot дергает эту
--  функцию один раз за бой, а не три раза по колонке.

create or replace function public.pvp_boxing_levels(p_player_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  select * into r from pvp_boxing_xp where player_id = p_player_id;

  return jsonb_build_object(
    'strength', public.pvp_boxing_level(coalesce(r.strength, 0)),
    'agility',  public.pvp_boxing_level(coalesce(r.agility,  0)),
    'stamina',  public.pvp_boxing_level(coalesce(r.stamina,  0))
  );
end;
$$;

comment on function public.pvp_boxing_levels(uuid) is
  'Уровни трёх характеристик для снимка. Отсутствие строки — нулевые уровни.';

grant execute on function public.pvp_boxing_levels(uuid) to anon, authenticated;


-- ============================================================
--  5. Начисление опыта
-- ============================================================
--
--  Намеренно НЕ выдаётся anon и authenticated: вызывать её могут
--  только security definer функции резолверов — то есть бой, а не
--  игрок. Иначе опыт начислялся бы запросом из консоли.

create or replace function public.pvp_boxing_grant(
  p_player_id uuid,
  p_stat      text,
  p_xp        bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row      pvp_boxing_xp%rowtype;
  v_old_xp   bigint;
  v_old_lvl  integer;
  v_total    bigint;
  v_level    integer;
  v_next     bigint;
begin
  if p_player_id is null or p_xp = 0 then
    return jsonb_build_object('ok', false, 'reason', 'nothing_to_grant');
  end if;

  if p_stat not in ('strength', 'agility', 'stamina') then
    raise exception 'Неизвестная характеристика "%"', p_stat
      using errcode = 'check_violation';
  end if;

  -- Строка могла не появиться: игрок ни разу не тренировался.
  insert into pvp_boxing_xp (player_id) values (p_player_id)
  on conflict (player_id) do nothing;

  select * into v_row from pvp_boxing_xp where player_id = p_player_id;

  -- Уровень ДО начисления: повышение определяется сравнением
  -- «было/стало», а не текущим уровнем, который к этому моменту
  -- уже перешагнул порог.
  v_old_xp := case p_stat
                when 'strength' then v_row.strength
                when 'agility'  then v_row.agility
                else                v_row.stamina
              end;
  v_old_lvl := public.pvp_boxing_level(v_old_xp);

  -- Ходячее имя колонки подставлять нельзя: p_stat приходит
  -- снаружи, и ident || ' = ...' выполнил бы произвольное
  -- выражение. Поэтому явные update.
  if p_stat = 'strength' then
    update pvp_boxing_xp set strength = strength + p_xp, updated_at = now()
     where player_id = p_player_id returning * into v_row;
  elsif p_stat = 'agility' then
    update pvp_boxing_xp set agility = agility + p_xp, updated_at = now()
     where player_id = p_player_id returning * into v_row;
  else
    update pvp_boxing_xp set stamina = stamina + p_xp, updated_at = now()
     where player_id = p_player_id returning * into v_row;
  end if;

  v_total := case p_stat
               when 'strength' then v_row.strength
               when 'agility'  then v_row.agility
               else                v_row.stamina
             end;

  v_level := public.pvp_boxing_level(v_total);
  v_next  := public.pvp_boxing_xp_for_level(v_level + 1);

  return jsonb_build_object(
    'ok', true,
    'stat', p_stat,
    'xp_added', p_xp,
    'xp_total', v_total,
    'xp_in_level', v_total - public.pvp_boxing_xp_for_level(v_level),
    'xp_need', v_next - public.pvp_boxing_xp_for_level(v_level),
    'level', v_level,
    'level_max', 20,
    'levelled_up', v_level > v_old_lvl,
    'old_level', v_old_lvl
  );
end;
$$;

comment on function public.pvp_boxing_grant(uuid, text, bigint) is
  'Начисляет опыт характеристике. Не выдаётся клиенту.';


-- ============================================================
--  6. Опыт за бой
-- ============================================================
--
--  В оригинале бой сам по себе двигает прогресс: от него идут и
--  очки умений, и опыт навыкам. Здесь опыт раскладывается по трём
--  характеристикам по тому, чем боец реально пользовался:
--
--      СИЛ  — удары, которые он нанёс;
--      ЛОВ  — блоки и уклонения;
--      ВЫН  — просто дошёл до конца боя.
--
--  Доли считаются от числа случаев, а не от одной базы: база одна,
--  а вклад каждой характеристики разный.

create or replace function public.pvp_boxing_award_fight(
  p_player_id uuid,
  p_actor      text,
  p_log       jsonb,
  p_won       boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_xp_win  constant bigint := 140;
  c_xp_lose constant bigint := 50;

  v_base    bigint;
  v_total   integer := 0;
  v_strength integer := 0;
  v_agility  integer := 0;
  v_stamina  integer := 0;
  v_kick    bigint;
  v_foot    bigint;
  v_box     bigint;
  v_ev      jsonb;
  v_actor   text;
  v_action  text;
  v_missed  boolean;
  v_blocked boolean;
begin
  if p_player_id is null then
    return;
  end if;

  -- Журнал может быть пустым у боя, который не начался.
  if p_log is null or jsonb_typeof(p_log) <> 'array' then
    return;
  end if;

  for v_ev in select * from jsonb_array_elements(p_log)
  loop
    v_actor   := v_ev->>'actor';
    v_action  := v_ev->>'action';
    v_missed  := coalesce((v_ev->>'miss')::boolean, false);
    v_blocked := coalesce((v_ev->>'blocked')::boolean, false);

    if v_actor is distinct from p_actor then
      continue;
    end if;

    v_total := v_total + 1;

    if v_action = 'attack' or v_action = 'heavy' then
      -- Уклонение и заблокированный удар в счёт не идут: сила
      -- должна расти за попадания, а не за попытки.
      if not v_missed and not v_blocked then
        v_strength := v_strength + 1;
      end if;

    elsif v_action = 'block' then
      v_agility := v_agility + 1;

    elsif v_action = 'dodge' then
      v_agility := v_agility + 1;
    end if;

    -- Выносливость растёт за каждый пережитый раунд: это и есть
    -- «дошёл до конца», измеряемое числом.
    v_stamina := v_stamina + 1;
  end loop;

  if v_total = 0 then
    perform public.pvp_boxing_grant(p_player_id, 'stamina', c_xp_lose / 2);
    return;
  end if;

  v_base := case when p_won then c_xp_win else c_xp_lose end;

  v_kick := (v_base * v_strength  / v_total);
  v_foot := (v_base * v_agility   / v_total);
  v_box  := v_base - v_kick - v_foot;

  -- Сила начисляется всегда, даже если вышел ноль: тогда в неё
  -- уходит вся база, и пустой вызов grant ничего не сделает.
  perform public.pvp_boxing_grant(p_player_id, 'strength', v_kick);
  perform public.pvp_boxing_grant(p_player_id, 'agility',  v_foot);
  perform public.pvp_boxing_grant(p_player_id, 'stamina',  v_box);
end;
$$;

comment on function public.pvp_boxing_award_fight(uuid, text, jsonb, boolean) is
  'Раскладывает опыт боя по трём характеристикам по тому, чем боец пользовался. Не выдаётся клиенту.';


-- ============================================================
--  7. Тренировка
-- ============================================================
--
--  Платит энергией, а не деньгами, и не имеет отката. Ограничитель
-- один — запас энергии: полная шкала это примерно
--  c_train_energy-подходов, и дальше нужно либо ждать, либо есть.
--
--  Энергия и опыт меняются в одной транзакции: иначе цену можно
--  было бы списать, а опыт не начислить.

create or replace function public.pvp_boxing_train(
  p_player_id uuid,
  p_stat      text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_level_max    constant integer := 20;
  c_train_xp     constant integer := 30;
  c_train_energy constant integer := 8;
  c_energy_max   constant integer := 100;

  v_profile record;
  v_cur_xp  bigint;
  v_energy  integer;
  v_result  jsonb;
begin
  if p_player_id is null then
    raise exception 'Не указан игрок' using errcode = 'null_value_not_allowed';
  end if;

  if p_stat not in ('strength', 'agility', 'stamina') then
    raise exception 'Неизвестная характеристика "%"', p_stat
      using errcode = 'check_violation';
  end if;

  select * into v_profile from profiles where id = p_player_id;
  if not found then
    raise exception 'Игрок не найден' using errcode = 'no_data_found';
  end if;

  v_energy := public.pvp_sport_energy_current(p_player_id);
  if v_energy < c_train_energy then
    return jsonb_build_object(
      'ok', false,
      'reason', 'no_energy',
      'energy', v_energy,
      'need', c_train_energy
    );
  end if;

  v_cur_xp := case p_stat
                when 'strength' then coalesce((select strength from pvp_boxing_xp where player_id = p_player_id), 0)
                when 'agility'  then coalesce((select agility  from pvp_boxing_xp where player_id = p_player_id), 0)
                else                coalesce((select stamina  from pvp_boxing_xp where player_id = p_player_id), 0)
              end;

  if public.pvp_boxing_level(v_cur_xp) >= c_level_max then
    return jsonb_build_object('ok', false, 'reason', 'max_level', 'level_max', c_level_max);
  end if;

  -- Спорт-энергия списывается здесь, после всех проверок. Обновляем
  -- и значение, и timestamp, чтобы восстановление считалось от текущего момента.
  update profiles
     set sport_energy = sport_energy - c_train_energy,
         sport_energy_updated_at = now()
   where id = p_player_id;

  v_result := public.pvp_boxing_grant(p_player_id, p_stat, c_train_xp);

  insert into pvp_boxing_sessions (player_id, stat, xp_gain, energy_cost)
  values (p_player_id, p_stat, c_train_xp, c_train_energy);

  return v_result
    || jsonb_build_object(
      'ok', true,
      'xp_gain', c_train_xp,
      'energy_cost', c_train_energy,
      'energy', v_energy - c_train_energy
    );
end;
$$;

grant execute on function public.pvp_boxing_train(uuid, text) to anon, authenticated;


-- ============================================================
--  8. Прогресс для экрана тренировки
-- ============================================================
--
--  Отдаёт всё, что нужно нарисовать, включая остаток энергии:
--  клиенту не нужно ни считать кривую уровней, ни ходить в профиль
--  за отдельным запросом.

create or replace function public.pvp_boxing_progress(p_player_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  c_level_max    constant integer := 20;
  c_train_xp     constant integer := 30;
  c_train_energy constant integer := 8;
  c_energy_max   constant integer := 100;

  v_profile record;
  v_row     pvp_boxing_xp%rowtype;
  v_energy  integer := 0;
  v_items   jsonb := '[]'::jsonb;
  v_item    record;
  v_level   integer;
  v_base    bigint;
  v_next    bigint;
  v_left    integer;
begin
  select * into v_profile from profiles where id = p_player_id;
  if not found then
    raise exception 'Игрок не найден' using errcode = 'no_data_found';
  end if;

  v_energy := public.pvp_sport_energy_current(p_player_id);

  select * into v_row from pvp_boxing_xp where player_id = p_player_id;

  -- Разбор по строкам, а не три одинаковых блока: характеристики
  -- может стать четыре, и тогда понадобится править одно место.
  for v_item in
    select * from (values
      ('strength', coalesce(v_row.strength, 0), 'Сила',           '💪',
       'Урон: каждый удар бьёт сильнее'),
      ('agility',  coalesce(v_row.agility,  0), 'Ловкость',       '🦶',
       'Уклонение: чаще уходишь с линии удара'),
      ('stamina',  coalesce(v_row.stamina,  0), 'Выносливость',   '🫀',
       'Энергия: дольше держишься и крепче стоишь')
    ) as t(stat, xp, title, icon, effect)
  loop
    v_level := public.pvp_boxing_level(v_item.xp);
    v_base  := public.pvp_boxing_xp_for_level(v_level);
    v_next  := public.pvp_boxing_xp_for_level(v_level + 1);

    v_items := v_items || jsonb_build_object(
      'stat',          v_item.stat,
      'title',         v_item.title,
      'icon',          v_item.icon,
      'effect',        v_item.effect,
      'level',         v_level,
      'level_max',     c_level_max,
      'xp',            v_item.xp,
      'xp_in_level',   v_item.xp - v_base,
      'xp_need',       v_next - v_base,
      'train_xp',      c_train_xp,
      'max_level',     v_level >= c_level_max,
      'affordable',    v_energy >= c_train_energy and v_level < c_level_max
    );
  end loop;

  -- Подходов на полной шкале: столько раз игрок успеет нажать
  -- «тренировать», пока энергия не кончится.
  v_left := v_energy / c_train_energy;

  return jsonb_build_object(
    'ok', true,
    'energy', v_energy,
    'energy_max', c_energy_max,
    'energy_cost', c_train_energy,
    'sessions_left', v_left,
    'level_max', c_level_max,
    'items', v_items
  );
end;
$$;

grant execute on function public.pvp_boxing_progress(uuid) to anon, authenticated;
