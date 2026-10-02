-- ============================================================
--  Снимок бойца для PvP
-- ============================================================
--
--  Считает характеристики игрока целиком на сервере и отдаёт
--  jsonb, из которого потом рисуется комикс.
--
--  ПОЧЕМУ СЧИТАЕТСЯ В БАЗЕ, А НЕ НА КЛИЕНТЕ
--  -----------------------------------------
--  Соблазн максимальный: getStats() (useEquipmentStore.ts:139)
--  уже умеет складывать одежду и баффы, и характеристики видны
--  игроку. Но RLS в проекте открыт (using (true)), поэтому
--  клиент может подделать всё, на чём считается бой:
--  profiles.torso_item, player_skills.value, player_buffs.amount.
--  Считать по этим данным на клиенте — значит считать по данным,
--  которые противник переписал сам себе.
--
--  ФОРМУЛЫ
--  -------
--  Все числа — в этом файле, в блоке констант ниже. Менять
--  баланс нужно здесь. Клиент их не знает и не должен: он
--  получает готовый снимок.
--
--    скилл боя  = max(бокс, кикбоксинг)   0..100
--    max_hp     = 100 + скилл/4 + выносливость/2
--    attack     = 8 + скилл/5 + урон оружия + сила/2
--    defense    = 3 + скилл/8 + выносливость/4
--    luck       = 3 + скилл/10 + удача снаряжения + luck профиля
--    armor      = броня одежды + бафф брони
--    mitigation = 100 / (100 + armor)
--
--  Деление целочисленное, поэтому /4 и /5 — это фактически
--  Math.floor, как в BoxClubView.tsx:251. Делители подобраны так,
--  чтобы потолок достигался навыком 100, но не проходился:
--  скилл 100 даёт attack 28 без оружия и брони.
--
--  Почему броня делит, а не вычитает
--  ---------------------------------
--  В BoxClubView урон — это max(1, attack - defense). Вычитание
--  без потолка ломается на броне: полный комплект даёт 53 брони,
--  и 25 урона пистолета превращаются в max(1, 25-53) = 1.
--  Броня стала бы полной неуязвимостью к любому оружию.
--  Деление 100/(100+armor) даёт 0.65 при 53 броне и никогда
--  не обнуляет урон, а ещё и смягчает рост брони: +10 брони
--  дают всё меньше, чем первые десять.
--
--  Почему броня не идёт в attack
--  ------------------------------
--  В первой версии формулы она туда попадала. Это плохо:
--  броня — защита, и если она же повышает урон, игрок
--  заинтересован надевать тяжёлое вместо лёгкого, а броня
--  перестаёт быть выбором. В attack идёт только сила.
--
--  ЧТО НЕ СЧИТАЕТСЯ И ПОЧЕМУ
--  -------------------------
--  * energy. В боксе это расход на действия; здесь действия
--    выбирает автомат, и энергия ушла бы в пустоту. Понадобится
--    позже, когда у боя появится лимит раундов по энергии.
--  * profiles.hp как здоровье для боя. hp — это текущее
--    состояние организма, а не показатель силы: игрок, пришедший
--    голодным с hp=40, в BoxClubView получает бойца с 40 HP из
--    134 возможных и проигрывает заранее (BoxClubView.tsx:255).
--    Здесь боец всегда входит полным, а hp как последствие
--    боя снимается с проигравшего отдельно.
--  * pvp_ratings. Рейтинг — про matchmaking, а не про силу
--    бойца. И таблица из pvp_fight_migration.sql может быть ещё
--    не применена: ссылка на неё уронила бы функцию при первом
--    вызове. Рейтинг подключит резолвер.
--
--  ТИП inventory.owner_id
--  ----------------------
--  Клиент всегда пишет owner_id строкой (useInventoryStore.ts:205),
--  но в базе колонка uuid. Обе миграции, которые пишут в
--  inventory, определяют это через pg_typeof по первой строке
--  (weapon_crafting_migration.sql:347). Так нельзя: на пустой
--  таблице pg_typeof не вернёт ничего, переменная останется
--  null, и вставка уйдёт как текст. Здесь тип берётся из
--  information_schema, который отвечает всегда.
--
--  ИДЕНТОЧНОСТЬ ИГРОКА. Supabase Auth не используется,
--  auth.uid() всегда null, id приходит параметром — подделать
--  можно. Лечится переводом входа на Supabase Auth.
--
--  ПРИМЕНЕНИЕ: идемпотентно. Зависит от clothing_stats (шаг 1);
--  если её нет, функция создастся, но броня будет нулевой —
--  снаряжение в jsonb тоже придёт пустым.
-- ============================================================

begin;

create or replace function public.pvp_fighter_snapshot(p_player_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  -- ------------------------------------------------------------
  --  Баланс. Меняешь здесь — меняешь во всём PvP.
  --  Клиент эти числа не знает.
  -- ------------------------------------------------------------
  c_base_hp      constant integer := 100;
  c_base_attack  constant integer := 8;
  c_base_defense constant integer := 3;
  c_base_luck    constant integer := 3;

  -- Потолок брони. Без него игрок с неограниченным числом
  -- предметов (а предметы выдаёт и крафт) собрал бы mitigation,
  -- близкий к нулю, и стал бы неуязвимым. 300 — примерно вдвое
  -- больше максимума из полного комплекта одежды (53).
  c_armor_cap    constant integer := 300;

  -- Из этих двоих берётся боевая характеристика. Кикбоксинг
  -- в игре пока не выдаётся (скилл есть в каталоге, но grant
  -- не вызывается ниоткуда), но если появится — подхватится
  -- сам, без правок здесь.
  v_skill        integer;

  v_profile      record;
  v_owner_is_uuid boolean;

  -- Снаряжение и баффы считаются раздельно, а потом складываются.
  -- Одним SELECT INTO перекрывать значения нельзя.
  v_gear_stamina integer := 0;
  v_gear_strength integer := 0;
  v_gear_speed   integer := 0;
  v_gear_luck    integer := 0;
  v_gear_armor   integer := 0;

  v_buff_stamina integer := 0;
  v_buff_strength integer := 0;
  v_buff_speed   integer := 0;
  v_buff_luck    integer := 0;
  v_buff_armor   integer := 0;

  v_stamina  integer;
  v_strength integer;
  v_speed    integer;
  v_gear_luck_total integer;
  v_armor    integer;

  v_weapon_key  text;
  v_weapon_name text;
  v_weapon_icon text;
  v_weapon_dmg  numeric := 0;

  v_max_hp     integer;
  v_attack     integer;
  v_defense    integer;
  v_luck       integer;
  v_mitigation numeric;

  v_equipment  jsonb := '[]'::jsonb;
begin
  if p_player_id is null then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_player');
  end if;

  -- Тип owner_id: information_schema отвечает и на пустой таблице.
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory'
      and column_name = 'owner_id' and data_type = 'uuid'
  ) into v_owner_is_uuid;

  -- ------------------------------------------------------------
  --  Профиль
  -- ------------------------------------------------------------
  select p.id, p.username,
         coalesce(p.lvl, 1) as lvl,
         coalesce(p.luck, 0) as prof_luck
    into v_profile
    from profiles p
   where p.id = p_player_id;

  if not found then
    return jsonb_build_object('ok', false, 'blocked', 'unknown_player');
  end if;

  -- Боевая характеристика: максимум из бокса и кикбоксинга.
  -- coalesce обязателен: без него у игрока без боевых скиллов
  -- v_skill будет null, и арифметика внизу даст null вместо
  -- числа — снимок уехал бы в клиент без нормальных stat'ов.
  select coalesce(max(value), 0) into v_skill
    from player_skills
   where player_id = p_player_id
     and skill_name in ('boxing', 'kickboxing');

  -- ------------------------------------------------------------
  --  Одежда
  --
  --  Статы берём из clothing_stats — единственного серверного
  --  источника. CLOTHING_DATABASE остаётся источником для клиента
  --  (описания, цены), и эти две правды сверяет
  --  npm run check:clothing.
  --
  --  Шесть колонок profiles разворачиваем в строки через union all,
  --  иначе сложение пришлось бы писать шесть раз.
  -- ------------------------------------------------------------
  with gear as (
    select 'head'   as slot, head_item   as item_key from profiles where id = p_player_id
    union all select 'neck',   neck_item   from profiles where id = p_player_id
    union all select 'torso',  torso_item  from profiles where id = p_player_id
    union all select 'hands',  hands_item  from profiles where id = p_player_id
    union all select 'legs',   legs_item   from profiles where id = p_player_id
    union all select 'feet',   feet_item   from profiles where id = p_player_id
  )
  select
    coalesce(sum(coalesce((cs.stats->>'stamina')::numeric, 0)), 0),
    coalesce(sum(coalesce((cs.stats->>'strength')::numeric, 0)), 0),
    coalesce(sum(coalesce((cs.stats->>'speed')::numeric, 0)), 0),
    coalesce(sum(coalesce((cs.stats->>'luck')::numeric, 0)), 0),
    coalesce(sum(coalesce((cs.stats->>'armor')::numeric, 0)), 0),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'slot',     g.slot,
          'item_key', g.item_key,
          'name',     coalesce(d.name, g.item_key),
          'icon',     coalesce(d.icon, '📦'),
          'armor',    coalesce((cs.stats->>'armor')::numeric, 0)
        ) order by g.slot
      ),
      '[]'::jsonb
    )
  into v_gear_stamina, v_gear_strength, v_gear_speed, v_gear_luck,
       v_gear_armor, v_equipment
    from gear g
    left join clothing_stats cs on cs.item_key = g.item_key
    left join items_db d       on d.item_key = g.item_key
   where g.item_key is not null;

  -- ------------------------------------------------------------
  --  Баффы
  --
  --  Ключи вида buff_armor; getStats() на клиенте снимает
  --  префикс той же подстановкой replace('buff_', '').
  --  Просроченные не считаем: expires_at в прошлом — баффа нет,
  --  даже если строка ещё не удалена (tickBuffs чистит раз в 30
  --  секунд, usePlayerStore.ts:436).
  -- ------------------------------------------------------------
  select
    coalesce(sum(case when b.effect_key = 'buff_stamina'  then b.amount else 0 end), 0),
    coalesce(sum(case when b.effect_key = 'buff_strength' then b.amount else 0 end), 0),
    coalesce(sum(case when b.effect_key = 'buff_speed'    then b.amount else 0 end), 0),
    coalesce(sum(case when b.effect_key = 'buff_luck'     then b.amount else 0 end), 0),
    coalesce(sum(case when b.effect_key = 'buff_armor'    then b.amount else 0 end), 0)
  into v_buff_stamina, v_buff_strength, v_buff_speed, v_buff_luck, v_buff_armor
    from player_buffs b
   where b.player_id = p_player_id
     and b.expires_at > now();

  -- ------------------------------------------------------------
  --  Оружие: сильнейшее в инвентаре
  --
  --  Берём по properties->>'damage'. В jsonb это текст, и приведение
  --  к numeric упало бы на мусоре, поэтому сперва проверяем, что
  --  строка вообще число. item_key, на который осталась одежда,
  --  тоже может попасть сюда, если автор повесит damage на
  --  предмет гардероба — это его решение, а не ошибка.
  -- ------------------------------------------------------------
  select i.item_id, d.name, d.icon,
         coalesce((d.properties->>'damage')::numeric, 0)
    into v_weapon_key, v_weapon_name, v_weapon_icon, v_weapon_dmg
    from inventory i
    join items_db d on d.item_key = i.item_id
   where (case
            when v_owner_is_uuid then i.owner_id::uuid = p_player_id
            else i.owner_id::text = p_player_id::text
          end)
     and coalesce(i.amount, 0) > 0
     and d.is_active
     and d.properties ? 'damage'
     and (d.properties->>'damage') ~ '^[0-9]+(\.[0-9]+)?$'
   order by 4 desc, d.price desc nulls last
   limit 1;

  -- SELECT INTO без строк присваивает всем целям NULL, затирая
  -- инициализацию выше: без этой проверки у бойца без оружия
  -- v_weapon_dmg становился null, и attack вместе с power
  -- тоже уходили в null (проверка npm run check:fighter это
  -- и поймала: attack приходил равным 1, power — нулём).
  if not found then
    v_weapon_key  := null;
    v_weapon_name := null;
    v_weapon_icon := null;
    v_weapon_dmg  := 0;
  end if;

  -- ------------------------------------------------------------
  --  Итоговые характеристики
  -- ------------------------------------------------------------
  v_stamina  := v_gear_stamina  + v_buff_stamina;
  v_strength := v_gear_strength + v_buff_strength;
  v_speed    := v_gear_speed    + v_buff_speed;
  v_gear_luck_total := v_gear_luck + v_buff_luck;
  v_armor    := least(v_gear_armor + v_buff_armor, c_armor_cap);

  v_max_hp  := c_base_hp + v_skill / 4 + v_stamina / 2;
  v_attack  := c_base_attack + v_skill / 5 + v_weapon_dmg::integer + v_strength / 2;
  v_defense := c_base_defense + v_skill / 8 + v_stamina / 4;
  v_luck    := c_base_luck + v_skill / 10 + v_gear_luck_total + v_profile.prof_luck;

  -- Броня режет входящий урон; выводится отдельным множителем,
  -- чтобы резолвер не делил сам и не разошёлся с этим числом.
  v_mitigation := 100.0 / (100.0 + v_armor);

  return jsonb_build_object(
    'ok', true,
    'blocked', null,
    'player_id', p_player_id,
    'username', v_profile.username,
    'lvl', v_profile.lvl,

    'skill',  v_skill,
    'max_hp', greatest(v_max_hp, 1),
    'attack', greatest(v_attack, 1),
    'defense', greatest(v_defense, 0),
    'luck', greatest(v_luck, 0),

    'armor',    v_armor,
    'stamina',  v_stamina,
    'strength', v_strength,
    'speed',    v_speed,

    'mitigation', round(v_mitigation, 4),

    'weapon', jsonb_build_object(
      'item_key', v_weapon_key,
      'name', coalesce(v_weapon_name, 'Кулаки'),
      'icon', coalesce(v_weapon_icon, '👊'),
      'damage', v_weapon_dmg
    ),
    'equipment', v_equipment,

    -- Оценка силы для списка целей. На исход боя не влияет:
    -- нужна, чтобы игрок понимал, во что ввязался.
    'power', greatest(v_max_hp, 1)
             + v_attack * 2
             + v_defense * 2
             + v_weapon_dmg::integer * 2
  );
end;
$$;

grant execute on function public.pvp_fighter_snapshot(uuid) to anon, authenticated;

commit;

notify pgrst, 'reload schema';