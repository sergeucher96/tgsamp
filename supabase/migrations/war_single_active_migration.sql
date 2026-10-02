-- ============================================================
--  Одна активная война на территорию, объявление и итоги — на сервере
-- ============================================================
--
--  Что было не так
-- ----------------
--  startWar проверял занятость территории в браузере:
--
--    organizationsConfig.ts: maxGangsPerWar: 2
--    warService.ts: считаем busyGangs по активным wars и сравниваем
--
--  Проверка считывает одних и тех же строки, что и вставка, и
--  ничего между ними не блокирует. Два объявления, отправленные
--  почти одновременно (два лидера, две вкладки), оба видели
--  «занято 1 банду из 2» и оба вставляли. Итог — две строки
--  WAR_ACTIVE на одной территории:
--
--    * два значка ⚔️ в одной точке карты (WarMapLayer берёт
--      центр полигона, а не конкретную войну);
--    * getWarForTerritory возвращает первую попавшуюся, поэтому
--      интерфейс показывал счёт одной войны, а считалась другая;
--    * settleWar переводил в ENDED каждую войну отдельно, и
--      последняя по времени запись задавала владельца зоны —
--      то есть исход зависел от того, кто дольше грузил страницу.
--
--  И это ещё полбеды: RLS на wars открыт (using (true)),
--  поэтому проверку можно было обойти вообще — из консоли
--  браузера вставить строку WAR_ACTIVE сколько угодно раз.
--
--  Что делаем
-- ----------
--  1. Частичный уникальный индекс: не более одной строки
--     status = 'WAR_ACTIVE' на территорию. Это ограничение на
--     уровне базы, его не обойти ни из клиента, ни из консоли.
--
--  2. declare_war(...) — объявление войны целиком на сервере:
--     ранг, деньги, перезарядка и занятость территории в одной
--     транзакции. Стоимость списывается там же, поэтому война
--     не может начаться «в долг», как было раньше, когда клиент
--     сначала создавал строку, а потом отдельно списывал деньги.
--
--  3. settle_war(...) — итоги на сервере. Заодно чинит два бага
--     клиентской версии: войну можно было подвести досрочно
--     (клиент решал по своим часам, а ends_at он же и прислал),
--     а при двух войнах за зону исход зависел от порядка.
--
--  ПРОВЕРКА ПОЗИЦИИ И ТАЙМЗОНА. Время здесь серверное: now(),
--  а не Date.now() игрока. Часовой пояс в этом файле не нужен,
--  в отличие от materials_steal_migration.sql, где граница ночи
--  задаётся по UTC.
--
--  ИДЕНТИФИКАТОР ИГРОКА. Как и в остальных RPC проекта, id
--  приходит параметром: Supabase Auth не используется, вход
--  через Telegram, auth.uid() всегда null. Банду и ранг
--  функция тоже берёт из org_members сама, а не из параметров,
--  — иначе можно было бы объявить войну от имени чужой банды.
--  Ограничение честное, но не абсолютное: подделать можно
--  p_player_id. Лечится переводом входа на Supabase Auth.
--
--  Параметры войны (стоимость, длительность, минимальный ранг,
--  перезарядка) зашиты здесь числами. В WAR_CONFIG на клиенте
--  стоят те же значения — клиент нужен только чтобы показать
--  текст кнопки. Меняешь цифры — правь в обоих местах.
--
--  Порядок применения: этот файл можно применить в любой момент,
--  он зависит только от wars, war_sessions и territories.
-- ============================================================

begin;

-- ============================================================
--  1. Уборка: если уже есть дубли, оставляем самую раннюю войну
-- ============================================================

-- Старые войны без ended_at закрываем сразу, иначе история
-- врёт: ended_at для ENDED — это и есть момент финала.
update wars
set ended_at = coalesce(ended_at, updated_at, ends_at, started_at, now())
where status <> 'WAR_ACTIVE' and ended_at is null;

-- Дубликаты на одной территории. started_at может быть null,
-- поэтому сравниваем через coalesce: null в упорядочивании
-- Postgres уводит в конец, и «самая ранняя» война была бы не
-- той, за кого себя выдаёт.
update wars w
set status = 'ENDED',
    ended_at = coalesce(w.ended_at, now()),
    updated_at = now()
where w.status = 'WAR_ACTIVE'
  and exists (
    select 1
    from wars k
    where k.territory_id = w.territory_id
      and k.status = 'WAR_ACTIVE'
      and (coalesce(k.started_at, 'epoch'::timestamptz), k.id)
        < (coalesce(w.started_at, 'epoch'::timestamptz), w.id)
  );

-- Сессии закрытых войн закрываем, иначе они оставались висеть
-- открытыми и копили очки в уже подведённой войне.
update war_sessions ws
set left_at = coalesce(ws.left_at, now())
where ws.left_at is null
  and exists (
    select 1 from wars w
    where w.id = ws.war_id and w.status <> 'WAR_ACTIVE'
  );

-- ============================================================
--  2. Не более одной активной войны на территорию
-- ============================================================

-- Частичный индекс, а не check в самой таблице: условие
-- status = 'WAR_ACTIVE' в check нельзя, там нельзя ссылаться
-- на другие строки, а «единственная активная» — это как раз
-- условие про другие строки.
create unique index if not exists idx_wars_single_active_per_territory
  on wars (territory_id)
  where status = 'WAR_ACTIVE';

comment on index idx_wars_single_active_per_territory is
  'Одна территория — одна активная война. Обойти нельзя даже прямой вставкой в wars.';

-- ============================================================
--  3. Очки войны: общая формула для declare/settle и будущих RPC
-- ============================================================

-- warPointsFor на клиенте: floor(points_per_min * seconds / 60),
-- а ранги с множителем меньше minScoringRank не дают ничего.
-- Здесь то же самое, но по данным представления — длительность
-- участия считает база из своих timestamps, клиент её не влияет.
create or replace function public.war_scores(p_war_id bigint)
returns table (gang_id text, score bigint)
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select v.gang_id,
         coalesce(sum(
           case
             when coalesce(v.points_per_min, v.rank_number, 0) < 1 then 0
             else floor(coalesce(v.points_per_min, v.rank_number)
                        * greatest(coalesce(v.seconds, 0), 0) / 60)
           end
         ), 0)::bigint as score
  from war_session_scores v
  where v.war_id = p_war_id
  group by v.gang_id;
$$;

grant execute on function public.war_scores(bigint) to anon, authenticated;

-- ============================================================
--  4. Подведение итогов войны
-- ============================================================

create or replace function public.settle_war(p_war_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_war              wars%rowtype;
  v_prev_owner       text;
  v_attacker_score   bigint := 0;
  v_defender_score   bigint := 0;
  v_winner           text;
  v_control          integer;
  v_row              record;
  v_updated          integer;
begin
  if p_war_id is null then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_war');
  end if;

  -- Блокировка строки войны: подвести итоги могут несколько
  -- клиентов разом (тик у каждого своя), и без FOR UPDATE
  -- двое посчитали бы очки по разным моментам времени.
  select * into v_war from wars where id = p_war_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_war');
  end if;

  -- Уже рассчитана: это нормальный исход, а не ошибка.
  if v_war.status <> 'WAR_ACTIVE' then
    return jsonb_build_object(
      'ok', false,
      'blocked', 'already_settled',
      'war_id', v_war.id,
      'winner_gang_id', v_war.winner_gang_id,
      'attacker_score', v_war.attacker_score,
      'defender_score', v_war.defender_score
    );
  end if;

  -- Досрочный финал запрещён. Раньше эту проверку делал клиент
  -- по своим часам, а ends_at он же и присылал при создании
  -- войны: подведя итоги сразу после объявления, можно было
  -- забрать чужую территорию бесплатно.
  if v_war.ends_at is not null and now() < v_war.ends_at then
    return jsonb_build_object('ok', false, 'blocked', 'not_finished');
  end if;

  -- Сессии закрываем до подсчёта: у открытой сессии left_at
  -- пуст, и war_session_scores считает для неё now(). Если
  -- закрыть после, очки посчитались бы по разным моментам.
  update war_sessions
  set left_at = now()
  where war_id = p_war_id and left_at is null;

  for v_row in select * from public.war_scores(p_war_id) loop
    -- Два отдельных if, а не if/elsif: на нейтральной зоне
    -- атакующий и защитник совпадают, и оба счёта должны
    -- получить одно значение — так же считал клиент.
    if v_row.gang_id = v_war.attacker_gang_id then
      v_attacker_score := v_row.score;
    end if;
    if v_row.gang_id = v_war.defender_gang_id then
      v_defender_score := v_row.score;
    end if;
  end loop;

  -- При равенстве, включая «не участвовал никто», побеждает
  -- атакующий: так было решено при проектировании.
  if v_attacker_score >= v_defender_score then
    v_winner := v_war.attacker_gang_id;
  else
    v_winner := v_war.defender_gang_id;
  end if;

  -- Условный UPDATE: ровно одна попытка переводит войну в
  -- ENDED, остальные видят 0 строк и выходят.
  update wars
  set status = 'ENDED',
      winner_gang_id = v_winner,
      attacker_score = v_attacker_score::int,
      defender_score = v_defender_score::int,
      ended_at = now(),
      updated_at = now()
  where id = p_war_id and status = 'WAR_ACTIVE';
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'blocked', 'already_settled');
  end if;

  -- Владелец зоны. Уникальный индекс гарантирует, что другой
  -- активной войны на этой территории нет, а значит и конкуренции
  -- за запись зоны тоже нет.
  select owner_gang_id into v_prev_owner
  from territories where id = v_war.territory_id;

  if v_winner is not null then
    if v_attacker_score = 0 and v_defender_score = 0 then
      v_control := 50;
    else
      -- Контроль отражает разрыв: 50 при ничьей, 100 при разгоне.
      v_control := round(
        50 + abs(v_attacker_score - v_defender_score)::numeric
            / (v_attacker_score + v_defender_score) * 50
      )::integer;
    end if;

    v_control := greatest(0, least(100, v_control));

    update territories
    set owner_gang_id = v_winner,
        status = 'CONTROLLED',
        control = v_control,
        activity = 50,
        updated_at = now()
    where id = v_war.territory_id;

    -- Влияние. Upsert с клампингом: победитель прибавляет,
    -- проигравший теряет, но строку проигравшего мы не создаём
    -- с нулевым значением — так же поступал клиент.
    insert into territory_influence (territory_id, gang_id, influence)
    values (v_war.territory_id, v_winner, 30)
    on conflict (territory_id, gang_id) do update
      set influence = least(100, greatest(0, territory_influence.influence + 30)),
          updated_at = now();

    if v_prev_owner is not null and v_prev_owner <> v_winner then
      update territory_influence
      set influence = greatest(0, influence - 20),
          updated_at = now()
      where territory_id = v_war.territory_id and gang_id = v_prev_owner;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'blocked', null,
    'war_id', v_war.id,
    'territory_id', v_war.territory_id,
    'winner_gang_id', v_winner,
    'is_tie', v_attacker_score = v_defender_score,
    'attacker_score', v_attacker_score,
    'defender_score', v_defender_score
  );
end;
$$;

grant execute on function public.settle_war(bigint) to anon, authenticated;

-- ============================================================
--  5. Объявление войны
-- ============================================================

create or replace function public.declare_war(
  p_player_id   uuid,
  p_territory_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Те же значения, что в WAR_CONFIG (organizationsConfig.ts).
  -- Клиент читает их только для текста кнопки.
  v_cost        constant bigint    := 25000;
  v_min_rank    constant integer   := 8;
  v_duration    constant interval  := interval '5 minutes';
  v_cooldown    constant interval  := interval '10 minutes';

  v_gang        text;
  v_rank_name   text;
  v_rank_number integer;
  v_owner       text;
  v_stale       record;
  v_war_id      bigint;
begin
  if p_player_id is null then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_player');
  end if;

  if p_territory_id is null then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_territory');
  end if;

  -- Банду берём из org_members, а не из параметра: иначе войну
  -- можно было бы объявить от имени чужой банды. type = 'gang'
  -- отсекает LSPD и мэрию — воевать могут только уличные банды.
  select m.org_id, m.rank_name into v_gang, v_rank_name
  from org_members m
  join organizations o on o.id = m.org_id
  where m.player_id = p_player_id and o.type = 'gang'
  limit 1;

  if v_gang is null then
    return jsonb_build_object('ok', false, 'blocked', 'not_gang');
  end if;

  select rank_number into v_rank_number
  from org_ranks
  where org_id = v_gang and rank_name = v_rank_name;

  if v_rank_number is null then
    return jsonb_build_object('ok', false, 'blocked', 'no_rank');
  end if;

  if v_rank_number < v_min_rank then
    return jsonb_build_object(
      'ok', false,
      'blocked', 'low_rank',
      'rank', v_rank_number,
      'min_rank', v_min_rank
    );
  end if;

  -- Блокировка строки территории. Именно она делает проверку
  -- «свободна ли зона» и вставку войны атомарными: второе
  -- объявление встанет в очередь и после первого увидит
  -- занятую территорию. Без неё гонка остаётся, даже если
  -- всё остальное правильно.
  select owner_gang_id into v_owner
  from territories where id = p_territory_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_territory');
  end if;

  -- Истёкшие войны на этой зоне подводим сами. Иначе получится
  -- ловушка: уникальный индекс держит территорию занятой, пока
  -- статус WAR_ACTIVE, а менять его должны клиенты. Все выйдут
  -- из игры на середине войны — и зона заблокируется навсегда,
  -- воевать за неё будет нельзя никому.
  for v_stale in
    select id from wars
    where territory_id = p_territory_id and status = 'WAR_ACTIVE'
  loop
    perform public.settle_war(v_stale.id);
  end loop;

  -- Теперь смотрим, осталась ли активная война.
  if exists (
    select 1 from wars
    where territory_id = p_territory_id and status = 'WAR_ACTIVE'
  ) then
    return jsonb_build_object('ok', false, 'blocked', 'territory_busy');
  end if;

  if v_owner = v_gang then
    return jsonb_build_object('ok', false, 'blocked', 'own_territory');
  end if;

  -- Перезарядка: та же банда, та же территория, недавняя война.
  if exists (
    select 1 from wars
    where territory_id = p_territory_id
      and attacker_gang_id = v_gang
      and started_at is not null
      and started_at >= now() - v_cooldown
  ) then
    return jsonb_build_object('ok', false, 'blocked', 'cooldown');
  end if;

  -- Деньги. Списываем здесь же, в той же транзакции, что и
  -- создаём войну. Раньше это делал клиент отдельным запросом
  -- после вставки: не хватило денег — война уже началась.
  update organizations
  set balance = balance - v_cost
  where id = v_gang and balance >= v_cost;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'blocked', 'not_enough_money',
      'cost', v_cost
    );
  end if;

  -- На нейтральной зоне защитника нет, и очки начислять было бы
  -- некому: получилась бы война, которую всегда выигрывает
  -- атакующий. Поэтому атакующий становится и защитником,
  -- и на ничьей территория переходит под его контроль.
  insert into wars (
    territory_id, attacker_gang_id, defender_gang_id,
    status, started_at, ends_at, started_by
  ) values (
    p_territory_id, v_gang, coalesce(v_owner, v_gang),
    'WAR_ACTIVE', now(), now() + v_duration, p_player_id::text
  ) returning id into v_war_id;

  update territories
  set status = 'WAR_ACTIVE', updated_at = now()
  where id = p_territory_id;

  return jsonb_build_object(
    'ok', true,
    'blocked', null,
    'war_id', v_war_id,
    'territory_id', p_territory_id,
    'attacker_gang_id', v_gang,
    'defender_gang_id', coalesce(v_owner, v_gang),
    'ends_at', now() + v_duration,
    'cost', v_cost
  );
end;
$$;

grant execute on function public.declare_war(uuid, bigint) to anon, authenticated;

commit;

-- PostgREST кэширует список функций и индексов, поэтому без
-- этого новая функция не появится в API до перезапуска.
notify pgrst, 'reload schema';