-- ============================================================
--  Таблицы PvP: бои и рейтинг
-- ============================================================
--
--  Это только хранилище. Ни бой, ни награды здесь не считаются:
--  всё делают pvp_resolve_player() и pvp_resolve_npc() из
--  pvp_resolve_migration.sql, целиком в одной транзакции. По той же
--  причине клиенту тут писать нельзя вообще (см. RLS ниже).
--
--  ЧТО НЕ ДЕЛАЕМ И ПОЧЕМУ
--  ----------------------
--  В плане был кэш player_combat_stats с производными
--  характеристиками. От него отказались намеренно:
--
--  * экипировка меняется на клиенте мгновенно (useEquipmentStore
--    пишет profiles.torso_item напрямую), и кэш после смены
--    брони устареет — бой посчитается по старым статам;
--  * резолвер всё равно считает статы в своей транзакции, из
--    тех же таблиц. Кэш был бы вторым источником правды.
--
--  Вместо кэша снимок бойца пишется прямо в запись боя
--  (attacker_snapshot / defender_snapshot). Он и нужен для
--  показа комикса, и служит историей: по нему бой всегда можно
--  переиграть и проверить, даже если формулу потом поменяют.
--
--  ПОЧЕМУ НЕТ СТАТУСА PENDING
--  --------------------------
--  Бой считается сразу, в том же вызове, который его создаёт.
--  Состояния «создан, но ещё не посчитан» не существует: если
--  транзакция упала, не будет и записи. Промежуточный статус
--  потребовался бы отдельному обработчику, который рассчитывает
--  бои, оставшиеся в PENDING — а он тут не нужен, потому что
--  незакрытых записей не бывает по построению.
--
--  Защита от двойного списания HP — не этот индекс, а
--  player_action_cooldowns с блокировкой строки; он уже
--  существует (materials_steal_migration.sql:71).
--
--  RLS
--  ---
--  Здесь, в отличие от большинства таблиц проекта, RLS настроен
--  на чтение, а политик на запись нет вообще. Это осознанно:
--  запись боя напрямую ведёт к списанию HP и выдаче денег,
--  поэтому писать в неё может только security definer функция
--  (владелец таблицы обходит RLS). Клиент читает историю
--  боёв — ему это нужно для экрана результатов.
--
--  Прямая вставка из консоли браузера вернёт отказ по RLS, даже
--  несмотря на то что остальные таблицы открыты using (true).
--
--  ИДЕНТОЧНОСТЬ ИГРОКА. Supabase Auth не используется, auth.uid()
--  всегда null, поэтому id приходит параметром RPC. Уязвимость
--  та же, что у остальных функций проекта: подделать p_player_id
--  можно. Лечится переводом входа на Supabase Auth.
--
--  ПРИМЕНЕНИЕ: идемпотентно, зависит только от profiles.
-- ============================================================

begin;

-- ============================================================
--  1. Бои
-- ============================================================

create table if not exists pvp_fights (
  id bigserial primary key,

  -- Стороны. Разные обязательны: иначе можно «вызвать себя
  -- на бой» и получить очки за поражение.
  challenger_id uuid not null references profiles(id) on delete cascade,
  defender_id   uuid not null references profiles(id) on delete cascade,
  constraint pvp_fights_distinct_players check (challenger_id <> defender_id),

  -- 'FINISHED' — посчитан. 'CANCELLED' — создан, но не рассчитан;
  -- в норме не встречается и нужен для отката боя.
  status text not null default 'FINISHED'
    check (status in ('FINISHED', 'CANCELLED')),

  -- Сид боя. Раунды считаются от него, поэтому бой
  -- воспроизводится побайтово: тот же seed и тот же rules_version
  -- дают тот же log. Проверяемый и переигрываемый.
  seed bigint not null,

  -- Снимки сторон на момент начала. Считает резолвер, клиент
  -- их не присылает. Именно из них рисуется комикс.
  attacker_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(attacker_snapshot) = 'object'),
  defender_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(defender_snapshot) = 'object'),

  -- Раунд за раундом, готовый к отрисовке. Пишется целиком
  -- за один update, а не дописывается по ходу: незавершённого
  -- лога в базе быть не должно.
  log jsonb not null default '[]'::jsonb
    check (jsonb_typeof(log) = 'array'),

  winner_id      uuid references profiles(id) on delete set null,
  rounds         integer not null default 0 check (rounds >= 0),
  attacker_hp    integer not null default 0 check (attacker_hp >= 0),
  defender_hp    integer not null default 0 check (defender_hp >= 0),

  -- Версия правил. Если формулу урона поменяют, старые бои
  -- продолжают показываться по своему сохранённому log, а
  -- rules_version скажет, по каким правилам они посчитаны.
  rules_version integer not null default 1 check (rules_version > 0),

  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

comment on column pvp_fights.seed is
  'Сид боя. Раунды считаются от него — бой воспроизводится побайтово и может быть переигран для проверки.';
comment on column pvp_fights.attacker_snapshot is
  'Снимок характеристик бойца на момент начала: max_hp, attack, defense, luck, оружие, броня.';
comment on column pvp_fights.log is
  'Раунды боя по порядку. Каждая запись описывает одно событие и рисуется одним кадром комикса. Своё смещение at_ms от начала боя имеет каждый раунд — по нему клиент растягивает анимацию и не должен угадывать темп.';

-- История боёв: кому били («кто меня атаковал») и кем били.
-- Сортировка по убыванию времени, поэтому индекс идёт по
-- (играрок, время DESC) — иначе база сортировала бы весь
-- список игрока ради первых строк.
create index if not exists idx_pvp_fights_defender_recent
  on pvp_fights (defender_id, created_at desc);
create index if not exists idx_pvp_fights_challenger_recent
  on pvp_fights (challenger_id, created_at desc);

-- ============================================================
--  2. Рейтинг
-- ============================================================

-- Рейтинг нужен не для расчёта боя, а для подбора жертвы и для
-- ограничения «слабый не бьёт сильного и наоборот». Без него
-- новичка выгодно бить десять раз подряд, а топового игрока —
-- обходить стороной.
create table if not exists pvp_ratings (
  player_id uuid primary key references profiles(id) on delete cascade,
  rating     integer not null default 1000 check (rating > 0),
  -- Сколько боёв сыграно и сколько выиграно. Среднее сильнее
  -- работает, чем одно число: у новичка 1200 из двух побед
  -- ничего не значит.
  fights     integer not null default 0 check (fights >= 0),
  wins       integer not null default 0 check (wins >= 0),
  -- Дата последнего боя. Для подборки нужна свежесть: игрок,
  -- который не заходил месяц, не должен стоять первым в списке
  -- целей.
  last_fight_at timestamptz,
  updated_at timestamptz not null default now(),
  -- Имя не pvp_ratings_wins_check: безымянная проверка
  -- wins >= 0 выше уже получила авто-имя <таблица>_<колонка>_check,
  -- то есть именно pvp_ratings_wins_check. Явное имя совпало бы с ним,
  -- и вся миграция падала бы с 'constraint already exists' —
  -- причём падала бы всегда, на пустой базе, потому что обе
  -- проверки объявляются в одном create table.
  constraint pvp_ratings_wins_vs_fights_check check (wins <= fights)
);

-- Подбор целей: рейтинг вниз, свежесть вверх.
create index if not exists idx_pvp_ratings_pick
  on pvp_ratings (rating desc, last_fight_at desc nulls last);

-- ============================================================
--  3. RLS
-- ============================================================

-- На запись политик нет намеренно: без них выдача отклоняется
-- для всех ролей, кроме владельца таблицы. Владелец —
-- суперпользователь postgres, от имени которого выполняется
-- миграция, а он обходит RLS. Поэтому security definer функции
-- писать смогут, а клиент из консоли — нет.
alter table pvp_fights enable row level security;
alter table pvp_ratings enable row level security;

drop policy if exists pvp_fights_read on pvp_fights;
create policy pvp_fights_read on pvp_fights
  for select to anon, authenticated
  using (true);

drop policy if exists pvp_ratings_read on pvp_ratings;
create policy pvp_ratings_read on pvp_ratings
  for select to anon, authenticated
  using (true);

-- Явный запрет на запись. Политик выше нет, но и таблицу
-- дополнительно обезличиваем от прав INSERT/UPDATE/DELETE:
-- иначе anon-роль, которой Supabase выдаёт права на новые
-- таблицы в public по умолчанию, писала бы мимо RLS.
revoke insert, update, delete on pvp_fights from anon, authenticated;
revoke insert, update, delete on pvp_ratings from anon, authenticated;

grant select on pvp_fights to anon, authenticated;
grant select on pvp_ratings to anon, authenticated;

commit;

notify pgrst, 'reload schema';