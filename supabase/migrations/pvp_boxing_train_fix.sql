-- Патч: pvp_boxing_train падала с 42846 на каждом вызове.
--
-- Причина: 'cooldown_seconds', c_cooldown::integer — интервал
-- не приводится к integer напрямую. Ошибка возникала уже на
-- строке return, то есть после списания денег и записи в
-- pvp_boxing_sessions, поэтому тренировка не проходила никогда.
--
-- Что делать: вставить этот файл в Supabase SQL Editor и выполнить.
-- Полный pvp_boxing_migration.sql тоже можно применить заново —
-- он идемпотентен (create table if not exists, create or replace
-- function), опыт и деньги не пострадают.
create or replace function public.pvp_boxing_train(
  p_player_id  uuid,
  p_discipline text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_level_max   constant integer := 100;
  c_train_xp    constant bigint  := 90;
  c_money_base  constant bigint  := 250;
  c_money_step  constant bigint  := 60;
  c_cooldown    constant interval := interval '30 minutes';

  v_profile record;
  v_cost   bigint;
  v_last   timestamptz;
  v_result jsonb;
begin
  if p_player_id is null then
    raise exception 'РќРµ СѓРєР°Р·Р°РЅ РёРіСЂРѕРє' using errcode = 'null_value_not_allowed';
  end if;

  if p_discipline not in ('boxing', 'kickboxing', 'footwork') then
    raise exception 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РґРёСЃС†РёРїР»РёРЅР° "%"', p_discipline
      using errcode = 'check_violation';
  end if;

  select * into v_profile from profiles where id = p_player_id;
  if not found then
    raise exception 'РРіСЂРѕРє РЅРµ РЅР°Р№РґРµРЅ' using errcode = 'no_data_found';
  end if;

  -- РЈР¶Рµ С‚СЂРµРЅРёСЂРѕРІР°Р»СЃСЏ? РћС‚РєР°С‚ РЅР° РєР°Р¶РґСѓСЋ РґРёСЃС†РёРїР»РёРЅСѓ СЃРІРѕР№, С‡С‚РѕР±С‹
  -- РјРѕР¶РЅРѕ Р±С‹Р»Рѕ С‡РµСЂРµРґРѕРІР°С‚СЊ Р±РѕРєСЃ Рё СЂР°Р±РѕС‚Сѓ СЃ РЅРѕРіР°РјРё, Р° РЅРµ СЃРёРґРµС‚СЊ
  -- СЃ РѕРґРЅРёРј РѕС‚РєР°С‚РѕРј РїРѕ РІСЃРµРј СЃСЂР°Р·Сѓ.
  select max(created_at) into v_last
    from pvp_boxing_sessions
   where player_id = p_player_id
     and discipline = p_discipline;

  if v_last is not null and v_last > now() - c_cooldown then
    return jsonb_build_object(
      'ok', false,
      'reason', 'cooldown',
      -- РЎРµРєСѓРЅРґС‹, Р° РЅРµ РІСЂРµРјСЏ: РєР»РёРµРЅС‚Сѓ РЅСѓР¶РЅРѕ СЃС‡РёС‚Р°С‚СЊ РѕР±СЂР°С‚РЅС‹Р№
      -- РѕС‚СЃС‡С‘С‚, Р° РїР°СЂСЃРёС‚СЊ РґР°С‚Сѓ РІ РєР°Р¶РґРѕРј СЌРєСЂР°РЅРµ РЅРµС‡РµРіРѕ РґРµР»Р°С‚СЊ.
      'wait_seconds', greatest(1, ceil(extract(epoch from (v_last + c_cooldown - now()))))::integer
    );
  end if;

  v_cost := c_money_base + c_money_step * public.pvp_boxing_level(
    case p_discipline
      when 'boxing'     then coalesce((select boxing     from pvp_boxing_xp where player_id = p_player_id), 0)
      when 'kickboxing' then coalesce((select kickboxing from pvp_boxing_xp where player_id = p_player_id), 0)
      else                    coalesce((select footwork   from pvp_boxing_xp where player_id = p_player_id), 0)
    end
  );

  if coalesce(v_profile.money, 0) < v_cost then
    return jsonb_build_object('ok', false, 'reason', 'no_money', 'cost', v_cost);
  end if;

  if public.pvp_boxing_level(
       case p_discipline
         when 'boxing'     then coalesce((select boxing     from pvp_boxing_xp where player_id = p_player_id), 0)
         when 'kickboxing' then coalesce((select kickboxing from pvp_boxing_xp where player_id = p_player_id), 0)
         else                    coalesce((select footwork   from pvp_boxing_xp where player_id = p_player_id), 0)
       end
     ) >= c_level_max then
    return jsonb_build_object('ok', false, 'reason', 'max_level', 'level_max', c_level_max);
  end if;

  -- Р”РµРЅСЊРіРё СЃРїРёСЃС‹РІР°СЋС‚СЃСЏ С‚РѕР»СЊРєРѕ Р·РґРµСЃСЊ, РїРѕСЃР»Рµ РІСЃРµС… РїСЂРѕРІРµСЂРѕРє. Р Р°РЅСЊС€Рµ
  -- РёС… СЃРїРёСЃР°РЅРёРµ СЃС‚РѕРёР»Рѕ РїРµСЂРµРґ РїСЂРѕРІРµСЂРєРѕР№ РѕС‚РєР°С‚Р°, Рё РЅРµСѓРґР°С‡РЅР°СЏ
  -- РїРѕРїС‹С‚РєР° Р¶РіР»Р° РґРµРЅСЊРіРё РёРіСЂРѕРєР°.
  update profiles set money = money - v_cost where id = p_player_id;

  v_result := public.pvp_boxing_grant(p_player_id, p_discipline, c_train_xp);

  insert into pvp_boxing_sessions (player_id, discipline, xp_gain, money_cost)
  values (p_player_id, p_discipline, c_train_xp, v_cost);

  return v_result
    || jsonb_build_object(
      'ok', true,
      'cost', v_cost,
      'money', coalesce(v_profile.money, 0) - v_cost,
      -- РЎРµРєСѓРЅРґС‹, Р° РЅРµ РёРЅС‚РµСЂРІР°Р»: РїСЂРёРІРµСЃС‚Рё interval Рє integer РЅР°РїСЂСЏРјСѓСЋ
      -- РЅРµР»СЊР·СЏ, РѕС‚СЃСЋРґР° Р±С‹Р» 42846 РЅР° РєР°Р¶РґРѕРј РІС‹Р·РѕРІРµ С‚СЂРµРЅРёСЂРѕРІРєРё.
      -- Р§РµСЂРµР· extract(epoch ...) РїРѕР»СѓС‡Р°РµРј С‚Рµ Р¶Рµ 1800 СЃРµРєСѓРЅРґ РѕС‚РєР°С‚Р°,
      -- С‡С‚Рѕ Рё РІ pvp_boxing_progress.
      'cooldown_seconds', extract(epoch from c_cooldown)::integer
    );
end;
$$;

grant execute on function public.pvp_boxing_train(uuid, text) to anon, authenticated;

