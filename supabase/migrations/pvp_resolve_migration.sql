-- ============================================================
--  PvP-резолвер и NPC
-- ============================================================
--
--  Считает бой, сохраняет результат и отдаёт журнал для комикса.
--  Расчёт ведёт pvp_simulate — та же чистая функция, что и для
--  NPC, поэтому тренировочный бой честно показывает, чего стоит
--  настоящий.
--
--  ПОЧЕМУ NPC ЖИВУТ В ОТДЕЛЬНОЙ ТАБЛИЦЕ
--  -------------------------------------
--  pvp_fights.defender_id — not null со ссылкой на profiles и
--  проверкой «стороны разные». Эта проверка — единственное, что
--  мешает вызвать самого себя и получить очки за поражение.
--  Чтобы вписать NPC, пришлось бы снять not null и ослабить
--  проверку, то есть разрушить гарантию ради удобства.
--
--  Поэтому pvp_npc_fights отдельная: у NPC нет player_id в
--  profiles, и таблица честно говорит, что этот бой — против
--  бота, а не против игрока.
--
--  СИД
--  ---
--  Берётся из отдельной последовательности и пишется в базу.
--  Сид не обязан быть «красивым»: он обязан быть разным у
--  разных боёв и сохраняться, чтобы бой можно было
--  переиграть pvp_simulate и получить тот же журнал.
--
--  ПОЧЕМУ ТРЕНИРОВКА НЕ ТРОГАЕТ РЕЙТИНГ
--  -------------------------------------
--  Иначе новичок спустит рейтинг в ноль, натренировавшись на
--  ботах, и PvP станет недоступен именно тем, ради кого он и
--  сделан. Рейтинг двигают только настоящие игроки.
--
--  ПРИМЕНЕНИЕ: зависит от pvp_simulate и pvp_fighter_snapshot.
--  Порядок файлов: simulate → snapshot → этот.
-- ============================================================

begin;

-- ============================================================
--  1. NPC
-- ============================================================
--
--  Характеристики хранятся теми же именами, что и поля
--  снимка игрока, и переводятся в снимок той же формулой
--  (mitigation = 100/(100+armor)). Если завтра формулу сдвинут
--  в pvp_fighter_snapshot, NPC обязан ехать вместе с ней —
--  поэтому перевод сосредоточен в pvp_npc_snapshot, а не
--  размазан по резолверу.

create table if not exists pvp_npcs (
  id serial primary key,

  key text not null unique,
  username text not null,

  -- 'training' — всегда доступен, рейтинга не двигает.
  -- 'real'    — открывается с порога рейтинга.
  tier text not null default 'training'
    check (tier in ('training', 'real')),

  -- Порог доступа для tier='real': рейтинг игрока должен быть
  -- не меньше этого значения.
  min_rating integer not null default 1100 check (min_rating >= 0),

  lvl       integer not null default 1 check (lvl > 0),
  max_hp    integer not null check (max_hp > 0),
  attack    integer not null check (attack > 0),
  defense   integer not null default 0 check (defense >= 0),
  luck      integer not null default 0 check (luck >= 0),
  -- Броня в тех же единицах, что у игрока; mitigation из неё
  -- считает pvp_npc_snapshot.
  armor     integer not null default 0 check (armor >= 0),

  weapon_key   text,
  weapon_name  text not null default 'Кулаки',
  weapon_icon  text not null default '👊',
  weapon_damage integer not null default 0,

  enabled boolean not null default true
);

comment on table pvp_npcs is
  'Противники-боты. Тренировочные доступны всем и не двигают рейтинг, боевые — с порога min_rating.';

alter table pvp_npcs enable row level security;

-- Запись отзываем явно. RLS без политик и так не пускает, но anon
-- по умолчанию получает права на новые таблицы в public, и мимо
-- RLS дописал бы строки. То же сделано в pvp_fight_migration.sql.
revoke insert, update, delete on pvp_npcs from anon, authenticated;

create index if not exists idx_pvp_npcs_available
  on pvp_npcs (tier, min_rating, lvl) where enabled;


-- ============================================================
--  2. Сид боя
-- ============================================================
--
--  Отдельная последовательность, а не random(): у random() нет
--  возвращаемого значения, которое можно было бы записать в
--  базу и потом переиграть.

create sequence if not exists pvp_seed_seq;

grant usage on sequence pvp_seed_seq to anon, authenticated;


-- ============================================================
--  3. Бои против NPC
-- ============================================================

create table if not exists pvp_npc_fights (
  id bigserial primary key,
  player_id uuid not null references profiles(id) on delete cascade,
  npc_key   text not null,
  -- Оба снимка, а не только снимок NPC: сид хранится ради
  -- воспроизводимости, и без снимка игрока бой не переиграть.
  -- В pvp_fights по той же причине их два.
  player_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(player_snapshot) = 'object'),
  npc_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(npc_snapshot) = 'object'),

  seed bigint not null,
  log  jsonb not null default '[]'::jsonb
    check (jsonb_typeof(log) = 'array'),

  player_won boolean not null,
  rounds integer not null default 0 check (rounds >= 0),
  player_hp integer not null default 0 check (player_hp >= 0),
  npc_hp    integer not null default 0 check (npc_hp >= 0),

  rules_version integer not null default 1 check (rules_version > 0),
  created_at timestamptz not null default now()
);

comment on table pvp_npc_fights is
  'Бои против NPC. Отдельно от pvp_fights: у бота нет player_id в profiles, и подменять им игрока нельзя. Хранит оба снимка, поэтому бой переигрывается pvp_simulate по сохранённому seed.';

create index if not exists idx_pvp_npc_fights_recent
  on pvp_npc_fights (player_id, created_at desc);

alter table pvp_npc_fights enable row level security;

-- Историю тренировок надо показывать — это и есть «повтор боя»,
-- ради которого журнал сохраняется. Читаем открыто, как pvp_fights.
drop policy if exists pvp_npc_fights_read on pvp_npc_fights;
create policy pvp_npc_fights_read on pvp_npc_fights
  for select to anon, authenticated
  using (true);

revoke insert, update, delete on pvp_npc_fights from anon, authenticated;
grant select on pvp_npc_fights to anon, authenticated;


-- ============================================================
--  4. Снимок NPC
-- ============================================================
--
--  Собирает jsonb той же формы, что отдаёт
--  pvp_fighter_snapshot. Общий симулятор читает только эту
--  форму, поэтому настоящий игрок и бот для него неотличимы.

create or replace function public.pvp_npc_snapshot(p_npc_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_npc pvp_npcs%rowtype;
begin
  select * into v_npc
  from pvp_npcs
  where key = p_npc_key and enabled;

  if not found then
    raise exception 'NPC "%" не найден или выключен', p_npc_key using errcode = 'no_data_found';
  end if;

  return jsonb_build_object(
    'player_id', null,
    'username', v_npc.username,
    'lvl', v_npc.lvl,
    'max_hp', v_npc.max_hp,
    'attack', v_npc.attack,
    'defense', v_npc.defense,
    'luck', v_npc.luck,
    'armor', v_npc.armor,
    'stamina', 0,
    'strength', 0,
    'speed', 0,
    -- Та же формула, что и у игрока: 100/(100+armor).
    -- Расхождение здесь означало бы, что бот в тренировке
    -- получает другую броню, чем игрок в реальном бою.
    'mitigation', round((100.0 / (100.0 + v_npc.armor))::numeric, 4),
    'weapon', jsonb_build_object(
      'item_key', v_npc.weapon_key,
      'name', v_npc.weapon_name,
      'icon', v_npc.weapon_icon,
      'damage', v_npc.weapon_damage
    ),
    'equipment', jsonb_build_object(
      'slot', 'weapon',
      'item_key', v_npc.weapon_key,
      'name', v_npc.weapon_name,
      'icon', v_npc.weapon_icon,
      'armor', v_npc.armor
    ),
    'is_npc', true
  );
end;
$$;

grant execute on function public.pvp_npc_snapshot(text) to anon, authenticated;


-- ============================================================
--  5. Доступность NPC
-- ============================================================
--
--  Рейтинг читается из pvp_ratings, где у новичка его может
--  вообще не быть: строка создаётся первым же боем. Поэтому
--  берём coalesce с тем же значением, что стоит в default
--  колонки, — иначе новый игрок выглядел бы как с рейтингом 0
--  и не попал бы даже в тренировку.

create or replace function public.pvp_npc_available(
  p_player_id uuid,
  p_tier      text default null
)
returns table (
  key text,
  username text,
  tier text,
  min_rating integer,
  lvl integer,
  weapon_name text,
  weapon_icon text,
  available boolean,
  locked_reason text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select coalesce((select r.rating from pvp_ratings r where r.player_id = p_player_id), 1000) as rating
  )
  select
    n.key,
    n.username,
    n.tier,
    n.min_rating,
    n.lvl,
    n.weapon_name,
    n.weapon_icon,
    me.rating >= n.min_rating,
    case
      when me.rating >= n.min_rating then null
      else 'Нужен рейтинг ' || n.min_rating
    end
  from pvp_npcs n
  cross join me
  where n.enabled
    and (p_tier is null or n.tier = p_tier)
  order by n.tier, n.min_rating, n.lvl;
$$;

grant execute on function public.pvp_npc_available(uuid, text) to anon, authenticated;


-- ============================================================
--  6. Обновление рейтинга
-- ============================================================
--
--  Эло с K=32.
--
--  Почему передаётся рейтинг СОПЕРНИКА отдельным аргументом
--  -------------------------------------------------------
--  Функция обновляет одну строку, поэтому не может увидеть
--  вторую. Раньше она брала только свой счёт и делала
--  rating + 32*score — то есть шаг не зависел от силы
--  соперника вовсе: победа над новичком стоила столько же,
--  сколько победа над лидером. Для Эло это нужно ожидаемое
--  значение, а оно требует чужого рейтинга.
--
--  Порядок вызовов важен: оба рейтинга читаются ДО первой
--  записи. Иначе второй игрок посчитал бы ожидание уже по
--  изменённому числу, и суммарное изменение плавало бы.
--
--  p_opponent_rating — рейтинг противника на момент боя.

create or replace function public.pvp_apply_rating(
  p_player_id      uuid,
  p_opponent_rating integer,
  p_score          numeric   -- 1 — победа, 0 — поражение
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_k constant double precision := 32.0;

  v_rating integer;
  v_fights integer;
  v_wins   integer;
  v_expect double precision;
begin
  select rating, fights, wins
  into v_rating, v_fights, v_wins
  from pvp_ratings
  where player_id = p_player_id
  for update;

  if not found then
    -- Первая строка: значения как в default колонок.
    v_rating := 1000;
    v_fights := 0;
    v_wins   := 0;
  end if;

  -- Ожидаемая доля победы: чем выше соперник, тем меньше
  -- очков приносит победа и тем больше — поражение.
  v_expect := 1.0 / (
    1.0 + power(10.0, (p_opponent_rating - v_rating)::double precision / 400.0)
  );

  insert into pvp_ratings (player_id, rating, fights, wins, last_fight_at)
  values (
    p_player_id,
    greatest(round(v_rating + c_k * (p_score - v_expect)), 1)::integer,
    v_fights + 1,
    v_wins + (case when p_score = 1 then 1 else 0 end),
    now()
  )
  on conflict (player_id) do update
    set rating = excluded.rating,
        fights = excluded.fights,
        wins = excluded.wins,
        last_fight_at = excluded.last_fight_at,
        updated_at = now();
end;
$$;

grant execute on function public.pvp_apply_rating(uuid, integer, numeric) to anon, authenticated;


-- ============================================================
--  7. Резолвер: игрок против игрока
-- ============================================================
--
--  Снимки берёт сервер. Клиент их не присылает — иначе игрок
--  подставил бы себе attack 999 и выиграл что угодно.

create or replace function public.pvp_resolve_player(
  p_challenger_id uuid,
  p_defender_id   uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_rules_version constant integer := 1;

  v_snap_a jsonb;
  v_snap_d jsonb;
  v_seed   bigint := nextval('pvp_seed_seq');
  v_result jsonb;
  v_fight_id bigint;
  v_a_won boolean;
  v_ra integer;
  v_rd integer;
begin
  if p_challenger_id is null or p_defender_id is null then
    raise exception 'Не указана сторона боя' using errcode = 'invalid_parameter_value';
  end if;

  if p_challenger_id = p_defender_id then
    -- Дубликат гарантии в pvp_fights, но с проверкой раньше:
    -- дешевле отказать, чем заводить строку ради отката.
    raise exception 'Нельзя вызвать себя на бой' using errcode = 'check_violation';
  end if;

  v_snap_a := public.pvp_fighter_snapshot(p_challenger_id);
  v_snap_d := public.pvp_fighter_snapshot(p_defender_id);

  -- Проверка обоих снимков до симуляции и до insert. Причина та
  -- же, что в pvp_resolve_npc: негодный снимок доходит до
  -- записи и роняет запрос на ограничении not null, а с
  -- валидным-но-несуществующим uuid бой записался бы вслепую.
  if coalesce((v_snap_a ->> 'ok')::boolean, false) is not true then
    raise exception 'Вызывающий не готов к бою: %',
      coalesce(v_snap_a ->> 'blocked', 'игрок не найден')
      using errcode = 'check_violation';
  end if;

  if coalesce((v_snap_d ->> 'ok')::boolean, false) is not true then
    raise exception 'Защитник не готов к бою: %',
      coalesce(v_snap_d ->> 'blocked', 'игрок не найден')
      using errcode = 'check_violation';
  end if;

  v_result := public.pvp_simulate(v_snap_a, v_snap_d, v_seed);
  v_a_won := (v_result->>'winner') = 'a';

  insert into pvp_fights (
    challenger_id, defender_id, status, seed,
    attacker_snapshot, defender_snapshot, log,
    winner_id, rounds, attacker_hp, defender_hp,
    rules_version, resolved_at
  )
  values (
    p_challenger_id, p_defender_id, 'FINISHED', v_seed,
    v_snap_a, v_snap_d, v_result->'log',
    case when v_a_won then p_challenger_id else p_defender_id end,
    (v_result->>'rounds')::integer,
    (v_result->>'attacker_hp')::integer,
    (v_result->>'defender_hp')::integer,
    c_rules_version, now()
  )
  returning id into v_fight_id;

  -- Оба рейтинга читаются до первой записи, иначе второй
  -- посчитал бы ожидание уже по изменённому числу.
  select coalesce((select r.rating from pvp_ratings r where r.player_id = p_challenger_id), 1000),
         coalesce((select r.rating from pvp_ratings r where r.player_id = p_defender_id), 1000)
  into v_ra, v_rd;

  perform public.pvp_apply_rating(p_challenger_id, v_rd, case when v_a_won then 1 else 0 end);
  perform public.pvp_apply_rating(p_defender_id,   v_ra, case when v_a_won then 0 else 1 end);

  return v_result
    || jsonb_build_object(
      'fight_id', v_fight_id,
      'kind', 'pvp',
      'challenger_id', p_challenger_id,
      'defender_id', p_defender_id,
      'won', case when v_a_won then true else false end,
      'attacker_snapshot', v_snap_a,
      'defender_snapshot', v_snap_d,
      'rules_version', c_rules_version
    );
end;
$$;

grant execute on function public.pvp_resolve_player(uuid, uuid) to anon, authenticated;


-- ============================================================
--  8. Резолвер: игрок против NPC
-- ============================================================
--
--  Расчёт идёт через тот же pvp_simulate. Отличие одно:
--  рейтинг не трогается, иначе тренировка была бы фармом.

create or replace function public.pvp_resolve_npc(
  p_player_id uuid,
  p_npc_key   text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_rules_version constant integer := 1;

  v_rating integer;
  v_npc    pvp_npcs%rowtype;
  v_snap_a jsonb;
  v_snap_n jsonb;
  v_seed   bigint := nextval('pvp_seed_seq');
  v_result jsonb;
  v_fight_id bigint;
  v_won boolean;
begin
  select * into v_npc
  from pvp_npcs
  where key = p_npc_key and enabled;

  if not found then
    raise exception 'NPC "%" не найден или выключен', p_npc_key using errcode = 'no_data_found';
  end if;

  select coalesce((select r.rating from pvp_ratings r where r.player_id = p_player_id), 1000)
  into v_rating;

  -- Порог проверяется здесь, а не только в pvp_npc_available:
--  список показывает «закрыто», но прямой вызов функции иначе
  --  обошёл бы его.
  if v_rating < v_npc.min_rating then
    raise exception 'Нужен рейтинг % для этого противника', v_npc.min_rating
      using errcode = 'check_violation';
  end if;

  v_snap_a := public.pvp_fighter_snapshot(p_player_id);
  v_snap_n := public.pvp_npc_snapshot(p_npc_key);

  -- ПОЧЕМУ ПРОВЕРКА ЗДЕСЬ, А НЕ ПОСЛЕ СИМУЛЯЦИИ
  -- Снимок бывает негодным: игрока нет, оружия нет, не тот
  -- уровень. Раньше такой запрос всё равно доходил до insert в
  -- pvp_npc_fights и падал там на player_id not null — игрок
  -- видел сырую ошибку ограничения вместо отказа. А если бы
  -- uuid был валидным, но игрока за ним не было, бой записался
  -- бы в историю вслепую и считался бы по пустому бойцу.
  if p_player_id is null or coalesce((v_snap_a ->> 'ok')::boolean, false) is not true then
    raise exception 'Боец не готов к бою: %',
      coalesce(v_snap_a ->> 'blocked', 'игрок не найден')
      using errcode = 'check_violation';
  end if;

  v_result := public.pvp_simulate(v_snap_a, v_snap_n, v_seed);
  v_won := (v_result->>'winner') = 'a';

  insert into pvp_npc_fights (
    player_id, npc_key, player_snapshot, npc_snapshot, seed, log,
    player_won, rounds, player_hp, npc_hp, rules_version
  )
  values (
    p_player_id, p_npc_key, v_snap_a, v_snap_n, v_seed, v_result->'log',
    v_won,
    (v_result->>'rounds')::integer,
    (v_result->>'attacker_hp')::integer,
    (v_result->>'defender_hp')::integer,
    c_rules_version
  )
  returning id into v_fight_id;

  -- Рейтинг намеренно не меняется.
  return v_result
    || jsonb_build_object(
      'fight_id', v_fight_id,
      'kind', 'npc',
      'npc_key', p_npc_key,
      'won', v_won,
      'attacker_snapshot', v_snap_a,
      'defender_snapshot', v_snap_n,
      'rules_version', c_rules_version
    );
end;
$$;

grant execute on function public.pvp_resolve_npc(uuid, text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';

-- ============================================================
--  9. NPC по умолчанию
-- ============================================================
--
--  Вне транзакции: on conflict do nothing идемпотентно, поэтому
--  повторный прогон файла ничего не ломает, а существующие
--  правки NPC не затираются.
--
--  Тренировочные слабее игрока-новичка (max_hp 70..90 против
--  базовых 100), чтобы бой был выигрываем и учил приёмам, а не
--  был наказанием за новичка. Боевые — на уровне игрока с
--  рейтингом около 1100.

insert into pvp_npcs
  (key, username, tier, min_rating, lvl, max_hp, attack, defense, luck, armor,
   weapon_key, weapon_name, weapon_icon, weapon_damage)
values
  ('train_1', 'Рукойка', 'training', 0, 1, 70, 6, 2, 2, 0,
   'fists', 'Кулаки', '👊', 0),
  ('train_2', 'Дворовый Го', 'training', 0, 3, 85, 9, 3, 3, 10,
   'bat', 'Бита', '🏏', 4),
  ('train_3', 'Боксёр Тень', 'training', 0, 6, 90, 13, 4, 4, 20,
   'brass_knuckles', 'Кастеты', '🥊', 8),
  ('real_1', 'Серый Волк', 'real', 1100, 8, 105, 16, 5, 4, 30,
   'machete', 'Мачете', '🔪', 12),
  ('real_2', 'Кочевник', 'real', 1200, 11, 115, 20, 7, 5, 45,
   'sabre', 'Сабля', '🗡️', 16),
  ('real_3', 'Железный Лев', 'real', 1300, 14, 125, 24, 9, 5, 60,
   'rifle', 'Винтовка', '🔫', 20)
on conflict (key) do nothing;

-- Прямого grant на select здесь нет намеренно: RLS включён без
-- политик, поэтому anon/authenticated всё равно ничего не видят.
-- Клиент получает список только через pvp_npc_available —
-- security definer, она отдаёт уже отфильтрованные по порогу
-- строки. Выдача таблицы целиком обошла бы порог и показала
-- закрытых противников.
