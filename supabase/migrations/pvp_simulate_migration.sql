-- ============================================================
--  Симуляция боя: чистая функция
-- ============================================================
--
--  Считает весь бой и возвращает готовый лог для комикса.
--  НЕ ходит ни в одну таблицу: только снимки на входе.
--
--  ПОЧЕМУ ОДНА ФУНКЦИЯ НА ВСЕХ
--  --------------------------
--  Бой игрок-против-игрока и бой против NPC должны считаться
--  одним и тем же кодом. Если у NPC будет своя ветка расчёта,
--  проверка на NPC ничего не скажет о реальных боях: через
--  месяц они разойдутся, и баг останется только в PvP, где
--  воспроизвести его дорого. Один код — одна точка правки.
--
--  ЧИСТОТА И ДЕТЕРМИНИРОВАННОСТЬ
--  -----------------------------
--  Ни одного обращения к таблицам и ни одного random(): весь
--  «случай» берётся из pvp_rand(p_seed, шаг). Поэтому:
--
--  * один и тот же сид даёт байт-в-байт одинаковый бой;
--  * бой можно переиграть и проверить, не доверяя клиенту;
--  * симуляцию можно прогнать тысячу раз в тестах.
--
--  Время боя (at_ms) считается накоплением задержек кадров, а
--  не от now(): иначе лог не был бы воспроизводимым, а комикс
--  зависел бы от скорости сервера.
--
--  БАЛАНС
--  ------
--  Константы — в блоке c_* ниже. Снимки приходят из
--  pvp_fighter_snapshot (или из таблицы NPC), поэтому формула
--  урона опирается ровно на те поля, что там считаются:
--  attack, defense, luck, mitigation, max_hp.
--
--  Почему defense вычитается половиной, а не целиком
--  ---------------------------------------------------
--  Урон режется двумя разными способами: множителем
--  (mitigation — это броня) и вычитанием (defense). При
--  вычитании defense целиком attack 26 против defense 15 даёт
--  урон в ноль, и бой упирается в пол. Половина оставляет
--  ощутимую разницу между бойцами, но не обнуляет урон ни
--  при какой защите.
--
--  Почему есть энергия
--  -------------------
--  Без неё лечение повторяется бесконечно, и бой двух
--  осторожных бойцов не кончится никогда. Энергия делает
--  лечение ресурсом. Потолок раундов остаётся страховкой на
--  случай, если энергия почему-то не помогла.
--
--  Почему блок и уклонение хранятся флагом
--  -----------------------------------------
--  Раньше (в первой версии) они были «ходом в пустоту»: боец
--  тратил кадр, ничего не получая, а журнал всё равно писал
--  miss=false и crit=false. Теперь блок и уклонение ставят флаг
--  на следующий удар противника, и действие что-то значит.
--
--  ИДЕНТОЧНОСТЬ ИГРОКА. Здесь не нужна: функция не знает, кто
--  бьётся, и работает только с переданными числами. Всё, что
--  связывает бой с игроком, делает вызывающая функция.
--
--  ПРИМЕНЕНИЕ: идемпотентно, ни от чего не зависит.
-- ============================================================

begin;

-- ============================================================
--  pvp_rand — детерминированное число в [0; 1)
-- ============================================================
--
--  md5 от «сид:шаг». Значение для любого шага считается
--  напрямую, без хранения состояния.
--
--  Почему не setseed(): он меняет состояние сессии, и тот же
--  бой в соседнем вызове дал бы другой результат.
--  Почему не LCG с переменной состояния: пришлось бы
--  проигрывать цикл от начала до нужного шага, и любой второй
--  вызов считал бы заново. Здесь шаг адресуемый — именно это и
--  нужно для воспроизводимости.

create or replace function public.pvp_rand(p_seed bigint, p_step integer)
returns double precision
language sql
immutable
as $$
  select (
    ('x' || substr(md5(p_seed::text || ':' || p_step::text), 1, 8))::bit(32)::bigint
    / 4294967296.0
  )::double precision;
$$;

comment on function public.pvp_rand(bigint, integer) is
  'Детерминированное число в [0;1) от сида и номера шага. Вместо random(): бой должен воспроизводиться.';

grant execute on function public.pvp_rand(bigint, integer) to anon, authenticated;


-- ============================================================
--  pvp_damage — урон одного удара
-- ============================================================
--
--  p_roll_damage — разброс, p_roll_crit — проверка крита.
--  Разделены, чтобы вызывающий код мог их взять на разных
--  шагах генератора и крит попал в журнал отдельным флагом.
--
--  Порядок именно такой: сначала урон доводится до минимума в
--  1, и только потом умножается на разброс. Иначе отрицательный
--  остаток от defense, умноженный на 0.85, дал бы 0 после
--  округления — и удар «прошёл бы» вхолостую.

create or replace function public.pvp_damage(
  p_attack    integer,
  p_mult      double precision,
  p_defense   integer,
  p_mitig     double precision,
  p_roll_damage double precision,
  p_roll_crit   double precision,
  p_luck      integer
)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  c_variance  constant double precision := 0.15;
  c_def_scale constant double precision := 0.5;
  c_crit_mult constant double precision := 1.5;
  c_crit_rate constant double precision := 0.01;

  v_base  double precision;
  v_dmg   double precision;
  v_crit  boolean;
begin
  v_base := p_attack * p_mult * greatest(p_mitig, 0.0);
  v_base := greatest(v_base - p_defense * c_def_scale, 1.0);

  -- Разброс ±15%: roll-0.5 даёт [-0.5; 0.5), умножение на 2
  -- растягивает до [-1; 1).
  v_dmg := v_base * (1.0 + (p_roll_damage - 0.5) * 2.0 * c_variance);

  v_crit := p_roll_crit < p_luck * c_crit_rate;
  if v_crit then
    v_dmg := v_dmg * c_crit_mult;
  end if;

  return jsonb_build_object(
    'damage', greatest(round(v_dmg), 1)::integer,
    'crit', v_crit
  );
end;
$$;

comment on function public.pvp_damage(integer, double precision, integer, double precision, double precision, double precision, integer) is
  'Урон одного удара: attack*mult*mitigation - defense/2, с разбросом и критом.';

grant execute on function public.pvp_damage(integer, double precision, integer, double precision, double precision, double precision, integer) to anon, authenticated;


-- ============================================================
--  pvp_pick_action — выбор действия
-- ============================================================
--
--  Веса зависят от состояния: раненый чаще лечится, крепкий —
--  бьёт. Порядок розыгрыша фиксирован (attack, heavy, block,
--  dodge, heal), чтобы один и тот же вес всегда давал одно и
--  то же действие.
--
--  Тяжёлый удар при нехватке энергии тихо становится обычным.
--  Раньше для этого бросался второй шанс поверх уже выбранного
--  действия, из-за чего тяжёлый удар то срабатывал, то нет при
--  одном и том же состоянии — боец «мигал» без видимой причины.

create or replace function public.pvp_pick_action(
  p_attack  integer,
  p_defense integer,
  p_luck    integer,
  p_hp      integer,
  p_hp_max  integer,
  p_energy  integer,
  p_heal_cost integer,
  p_seed    bigint,
  p_step    integer
)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  w_attack double precision := 50;
  w_heavy  double precision;
  w_block  double precision;
  w_dodge  double precision;
  w_heal   double precision := 0;
  w_total  double precision;
  r        double precision;
  v_action text;
begin
  w_heavy := 20 + greatest(p_attack, 1) * 0.5;
  w_block := 4 + greatest(p_defense, 0) * 2.0;
  w_dodge := 4 + greatest(p_luck, 0) * 0.8;

  if p_hp < p_hp_max / 2 and p_energy >= p_heal_cost then
    w_heal := 28;
  end if;

  w_total := w_attack + w_heavy + w_block + w_dodge + w_heal;
  r := public.pvp_rand(p_seed, p_step) * w_total;

  if r < w_attack then                        v_action := 'attack';
  elsif r < w_attack + w_heavy then           v_action := 'heavy';
  elsif r < w_attack + w_heavy + w_block then v_action := 'block';
  elsif r < w_attack + w_heavy + w_block + w_dodge then v_action := 'dodge';
  else v_action := 'heal';
  end if;

  -- Энергии на тяжёлый удар нет — бьём обычным, но только если
  -- выбрали именно тяжёлый. Иначе боец без энергии вовсе перестал
  -- бы наносить урон.
  if v_action = 'heavy' and p_energy < p_heal_cost then
    v_action := 'attack';
  end if;

  return v_action;
end;
$$;

comment on function public.pvp_pick_action(integer, integer, integer, integer, integer, integer, integer, bigint, integer) is
  'Выбор действия по состоянию бойца. Тяжёлый удар деградирует до обычного при нехватке энергии.';

grant execute on function public.pvp_pick_action(integer, integer, integer, integer, integer, integer, integer, bigint, integer) to anon, authenticated;


-- ============================================================
--  pvp_simulate — весь бой
-- ============================================================

create or replace function public.pvp_simulate(
  p_attacker jsonb,
  p_defender jsonb,
  p_seed     bigint
)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  -- ------------------------------------------------------------
  --  Баланс
  -- ------------------------------------------------------------
  c_max_rounds      constant integer := 40;   -- страховка от зацикливания
  c_heavy_mult      constant double precision := 1.6;
  c_block_reduction constant double precision := 0.45;
  c_energy_max      constant integer := 100;
  c_energy_start    constant integer := 60;
  c_energy_regen    constant integer := 12;
  c_heal_cost       constant integer := 25;
  c_heal_amount     constant integer := 8;

  -- Темп комикса. Клиент рисует по at_ms, поэтому база задаёт
  -- длительность каждого кадра одинаково для всех бойцов.
  c_ms_attack       constant integer := 420;
  c_ms_heavy        constant integer := 620;
  c_ms_block        constant integer := 300;
  c_ms_dodge        constant integer := 340;
  c_ms_heal         constant integer := 500;

  -- Боец 1 — атакующий, боец 2 — защитник.
  v_hp       integer[];
  v_hp_max   integer[];
  v_energy   integer[];
  v_atk      integer[];
  v_defense  integer[];
  v_mitig    double precision[];
  v_luck     integer[];
  v_evade    boolean[];
  v_block    boolean[];

  v_round    integer := 0;
  v_step     integer := 0;
  v_at_ms    integer := 0;
  v_winner   integer;          -- NULL, пока бой не решён
  v_done     boolean := false;
  v_events   jsonb := '[]'::jsonb;

  v_side     integer;
  v_turn     integer;
  v_first    integer;
  v_foe      integer;
  v_action   text;
  v_dmg      integer := 0;
  v_crit     boolean := false;
  v_missed   boolean := false;
  v_blocked  boolean := false;
  v_healed   integer := 0;
  v_ms       integer;
  v_res      jsonb;
begin
  if p_attacker is null or p_defender is null then
    raise exception 'pvp_simulate: снимок бойца не передан';
  end if;

  v_hp      := array[
    greatest(coalesce((p_attacker->>'max_hp')::integer, 100), 1),
    greatest(coalesce((p_defender->>'max_hp')::integer, 100), 1)
  ];
  v_hp_max  := v_hp;
  v_energy  := array[c_energy_start, c_energy_start];
  v_atk     := array[
    greatest(coalesce((p_attacker->>'attack')::integer, 1), 1),
    greatest(coalesce((p_defender->>'attack')::integer, 1), 1)
  ];
  v_defense := array[
    coalesce((p_attacker->>'defense')::integer, 0),
    coalesce((p_defender->>'defense')::integer, 0)
  ];
  v_mitig   := array[
    coalesce((p_attacker->>'mitigation')::double precision, 1),
    coalesce((p_defender->>'mitigation')::double precision, 1)
  ];
  v_luck    := array[
    greatest(coalesce((p_attacker->>'luck')::integer, 0), 0),
    greatest(coalesce((p_defender->>'luck')::integer, 0), 0)
  ];
  v_evade   := array[false, false];
  v_block   := array[false, false];

  while v_round < c_max_rounds and not v_done loop
    v_round := v_round + 1;

    -- Кто ходит первым в раунде, решает жребий.
    --
    -- Почему не фиксированный порядок: пока атакующий бил первым
    -- в каждом раунде, при равных бойцах он выигрывал 69% боёв
    -- вместо ~50%. Обеим сторонам нужно одинаковое число ударов,
    -- а первым добивает именно тот, кто ходит первым, — то есть
    -- перекос был не «преимуществом первого хода», а гарантией.
    if public.pvp_rand(p_seed, v_step) < 0.5 then
      v_first := 1;
    else
      v_first := 2;
    end if;
    v_step := v_step + 1;

    for v_turn in 1..2 loop
      v_side := case when v_turn = 1 then v_first else 3 - v_first end;
      v_foe := 3 - v_side;
      exit when v_hp[v_foe] <= 0;

      v_dmg := 0; v_crit := false; v_missed := false;
      v_blocked := false; v_healed := 0; v_ms := 0;

      v_action := public.pvp_pick_action(
        v_atk[v_side], v_defense[v_side], v_luck[v_side],
        v_hp[v_side], v_hp_max[v_side], v_energy[v_side],
        c_heal_cost, p_seed, v_step
      );
      v_step := v_step + 1;

      if v_action = 'heal' then
        v_healed := least(c_heal_amount, v_hp_max[v_side] - v_hp[v_side]);
        v_hp[v_side] := v_hp[v_side] + v_healed;
        v_energy[v_side] := v_energy[v_side] - c_heal_cost;
        v_ms := c_ms_heal;

      elsif v_action = 'dodge' then
        -- Уклонение не отменяет удар само по себе: оно ставит
        -- флаг, который погасит следующую атаку противника.
        v_evade[v_side] := true;
        v_ms := c_ms_dodge;

      elsif v_action = 'block' then
        v_block[v_side] := true;
        v_ms := c_ms_block;

      else
        v_energy[v_side] := v_energy[v_side] - c_heal_cost;
        if v_action = 'heavy' then
          v_ms := c_ms_heavy;
        else
          v_ms := c_ms_attack;
        end if;

        v_res := public.pvp_damage(
          v_atk[v_side],
          case when v_action = 'heavy' then c_heavy_mult else 1.0 end,
          v_defense[v_foe], v_mitig[v_foe],
          public.pvp_rand(p_seed, v_step),
          public.pvp_rand(p_seed, v_step + 1),
          v_luck[v_side]
        );
        v_step := v_step + 2;
        v_dmg := (v_res->>'damage')::integer;
        v_crit := (v_res->>'crit')::boolean;

        if v_evade[v_foe] then
          -- Уклонение сработало: удар целиком проходит мимо,
          -- флаг гасится.
          v_missed := true;
          v_dmg := 0;
          v_crit := false;
          v_evade[v_foe] := false;
        elsif v_block[v_foe] then
          v_blocked := true;
          v_dmg := greatest(round(v_dmg * c_block_reduction), 1)::integer;
          v_block[v_foe] := false;
        end if;

        v_hp[v_foe] := greatest(v_hp[v_foe] - v_dmg, 0);
      end if;

      v_at_ms := v_at_ms + v_ms;

      v_events := v_events || jsonb_build_object(
        'n', v_round,
        'at_ms', v_at_ms,
        'actor', case when v_side = 1 then 'a' else 'd' end,
        'action', v_action,
        'damage', v_dmg,
        'heal', v_healed,
        'crit', v_crit,
        'miss', v_missed,
        'blocked', v_blocked,
        'a_hp', v_hp[1],
        'd_hp', v_hp[2],
        'a_energy', v_energy[1],
        'd_energy', v_energy[2]
      );

      if v_hp[v_foe] <= 0 then
        v_winner := v_side;
        v_done := true;
        exit;
      end if;
    end loop;

    -- Энергия восстанавливается в конце раунда у обоих.
    v_energy[1] := least(v_energy[1] + c_energy_regen, c_energy_max);
    v_energy[2] := least(v_energy[2] + c_energy_regen, c_energy_max);
  end loop;

  -- Потолок раундов: сравниваем по доле оставшегося здоровья,
  -- а не по абсолютному HP — у бойцов разный запас, и при равном
  -- HP проигравшим выглядел бы просто слабый. При полном равенстве
  -- побеждает атакующий, как и в войне за территорию.
  if v_winner is null then
    if v_hp[1]::double precision / v_hp_max[1] > v_hp[2]::double precision / v_hp_max[2] then
      v_winner := 1;
    else
      v_winner := 2;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'seed', p_seed,
    'rounds', v_round,
    'winner', case when v_winner = 1 then 'a' else 'd' end,
    'attacker_name', coalesce(p_attacker->>'username', 'Боец'),
    'defender_name', coalesce(p_defender->>'username', 'Боец'),
    'attacker_icon', coalesce(p_attacker->'weapon'->>'icon', '👊'),
    'defender_icon', coalesce(p_defender->'weapon'->>'icon', '👊'),
    'attacker_hp', v_hp[1],
    'defender_hp', v_hp[2],
    'attacker_hp_max', v_hp_max[1],
    'defender_hp_max', v_hp_max[2],
    'log', v_events
  );
end;
$$;

comment on function public.pvp_simulate(jsonb, jsonb, bigint) is
  'Детерминированный авто-бой по двум снимкам. Без обращений к таблицам: общий код для PvP и NPC.';

grant execute on function public.pvp_simulate(jsonb, jsonb, bigint) to anon, authenticated;


-- ============================================================
--  pvp_balance_probe — прогон боёв пачкой
-- ============================================================
--
--  Считает p_runs боёв на одних и тех же снимках и отдаёт сводку.
--
--  Зачем отдельная функция, если можно вызвать pvp_simulate
--  дважды: прогон с клиента — это десятки последовательных
--  запросов, то есть секунды ожидания на одну проверку. Здесь
--  весь прогон — один round trip.
--
--  Главное, ради чего это нужно: перекос стороны. Пока атакующий
--  бил первым в каждом раунде, при равных бойцах он выигрывал
--  69% боёв. На глаз это в одном бою не видно — нужен прогон и
--  сравнение с 50%.
--
--  Порог перекоса берётся статистическим, а не «на глаз»:
--  для честной монетки 95% доверительный интервал доли равен
--  1.96*sqrt(0.25/n). Выход за него означает настоящую
--  несимметричность, а не шум малой выборки.
--
--  Иммутабельна: базы не касается, только считает.

create or replace function public.pvp_balance_probe(
  p_attacker  jsonb,
  p_defender  jsonb,
  p_runs      integer,
  p_base_seed bigint
)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  c_max_runs constant integer := 500;

  v_runs   integer := least(greatest(coalesce(p_runs, 50), 1), c_max_runs);
  v_base   bigint  := coalesce(p_base_seed, 1);
  v_i      integer;
  v_seed   bigint;
  v_res    jsonb;
  -- Кадр журнала: именно jsonb, а не record. У record нет
  -- оператора ->>, и объявление v_e record ломало функцию на
  -- первом же разборе журнала.
  v_frame  jsonb;
  v_action text;

  v_wins_a integer := 0;
  v_rounds_sum integer := 0;
  v_max_rounds  integer := 0;
  -- Порядок действий фиксирован: attack, heavy, block, dodge, heal.
  v_act    integer[] := array[0, 0, 0, 0, 0];
  v_crit   integer := 0;
  v_miss   integer := 0;
  v_blocked integer := 0;

  v_rate   double precision;
  v_margin double precision;
  -- Перекос имеет смысл ловить только на равных бойцах. Если один
  -- сильнее, атакующий и должен выигрывать чаще — иначе вердикт
  -- ругался бы на любую разницу в силе.
  v_same   boolean;
begin
  if p_attacker is null or p_defender is null then
    raise exception 'pvp_balance_probe: снимок бойца не передан';
  end if;

  v_same :=
       coalesce((p_attacker->>'max_hp')::numeric, 0)    = coalesce((p_defender->>'max_hp')::numeric, 0)
    and coalesce((p_attacker->>'attack')::numeric, 0)    = coalesce((p_defender->>'attack')::numeric, 0)
    and coalesce((p_attacker->>'defense')::numeric, 0)   = coalesce((p_defender->>'defense')::numeric, 0)
    and coalesce((p_attacker->>'luck')::numeric, 0)      = coalesce((p_defender->>'luck')::numeric, 0)
    and coalesce((p_attacker->>'mitigation')::numeric, 0) = coalesce((p_defender->>'mitigation')::numeric, 0);

  for v_i in 1..v_runs loop
    -- Сиды идут подряд, но от базы: каждый прогон воспроизводим,
    -- и два разных прогона не совпадут случайно.
    v_seed := v_base + v_i;
    v_res := public.pvp_simulate(p_attacker, p_defender, v_seed);

    if (v_res->>'winner') = 'a' then
      v_wins_a := v_wins_a + 1;
    end if;

    v_rounds_sum := v_rounds_sum + (v_res->>'rounds')::integer;
    if (v_res->>'rounds')::integer > v_max_rounds then
      v_max_rounds := (v_res->>'rounds')::integer;
    end if;

    for v_frame in select value from jsonb_array_elements(v_res->'log') loop
      v_action := v_frame->>'action';
      case v_action
        when 'attack' then v_act[1] := v_act[1] + 1;
        when 'heavy'  then v_act[2] := v_act[2] + 1;
        when 'block'  then v_act[3] := v_act[3] + 1;
        when 'dodge'  then v_act[4] := v_act[4] + 1;
        when 'heal'   then v_act[5] := v_act[5] + 1;
        else null;
      end case;

      if (v_frame->>'crit')::boolean then   v_crit := v_crit + 1; end if;
      if (v_frame->>'miss')::boolean then   v_miss := v_miss + 1; end if;
      if (v_frame->>'blocked')::boolean then v_blocked := v_blocked + 1; end if;
    end loop;
  end loop;

  v_rate := v_wins_a::double precision / v_runs;
  -- 95% интервал для доли 0.5 при честной монетке.
  v_margin := 1.96 * sqrt(0.25 / v_runs);

  return jsonb_build_object(
    'runs', v_runs,
    'base_seed', v_base,
    'wins_a', v_wins_a,
    'wins_d', v_runs - v_wins_a,
    'win_rate_a', round(v_rate::numeric, 4),
    'bias_margin', round(v_margin::numeric, 4),
    -- Снимки равны по всем боевым статам: только тогда доля побед
    -- говорит о честности боя, а не о разнице в силе.
    'equivalent', v_same,
    'avg_rounds', round((v_rounds_sum::double precision / v_runs)::numeric, 2),
    'max_rounds', v_max_rounds,
    'actions', jsonb_build_object(
      'attack', v_act[1], 'heavy', v_act[2], 'block', v_act[3],
      'dodge', v_act[4], 'heal', v_act[5]
    ),
    'crits', v_crit,
    'misses', v_miss,
    'blocked', v_blocked,
    -- null, когда отклонение в пределах шума: малый прогон не
    -- должен показывать красное там, где всё в порядке.
    'verdict', case
      when not v_same then 'strength_differs'
      when v_rate > 0.5 + v_margin then 'side_bias_attacker'
      when v_rate < 0.5 - v_margin then 'side_bias_defender'
      else 'ok'
    end
  );
end;
$$;

grant execute on function public.pvp_balance_probe(jsonb, jsonb, integer, bigint) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
