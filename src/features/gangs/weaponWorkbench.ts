/**
 * weaponWorkbench.ts — рецепты верстака и вызов крафта.
 *
 * Рецепты читаются из таблицы weapon_recipes, поэтому их видит вся
 * игра: в отличие от кухонных рецептов, которые живут в браузере
 * автора. Правятся они редактором (WeaponRecipeEditor).
 *
 * Сам крафт считает база (craft_weapon): списание материалов и
 * выдача оружия должны быть одной транзакцией, а клиентская
 * проверка при открытом RLS ничего не защищает.
 */

import { supabase } from '../../services/supabase/client';

export interface WeaponIngredient {
  item_key: string;
  amount: number;
}

export interface WeaponRecipe {
  id: number;
  recipe_key: string;
  name: string;
  icon: string;
  description: string;
  result_item_key: string;
  result_amount: number;
  ingredients: WeaponIngredient[];
  is_active: boolean;
}

/** Почему крафт не прошёл */
export type CraftBlock =
  | 'not_gang'
  | 'no_recipe'
  | 'not_enough'
  | 'no_space'
  | 'bad_recipe'
  | 'bad_count'
  | 'no_item'
  | 'unavailable';

export interface CraftResult {
  ok: boolean;
  blocked: CraftBlock | null;
  /** Текст для игрока */
  text: string;
  /** Что получилось */
  itemKey?: string;
  amount?: number;
  /** Для блокировки not_enough: чего не хватило */
  need?: number;
  have?: number;
}

const TEXTS: Record<CraftBlock, string> = {
  not_gang: 'Верстак доступен только членам банды.',
  no_recipe: 'Такого рецепта больше нет.',
  not_enough: 'Не хватает материалов.',
  no_space: 'Сумка полна — освободите слот под оружие.',
  bad_recipe: 'Рецепт задан неверно, обратитесь к автору.',
  bad_count: 'Нельзя скрафтить столько за раз.',
  no_item: 'Предмета нет в каталоге.',
  unavailable: 'Верстак не отвечает. Попробуйте позже.',
};

function result(
  blocked: CraftBlock,
  extra: Partial<CraftResult> = {}
): CraftResult {
  return {
    ok: false,
    blocked,
    text: extra.text ?? TEXTS[blocked] ?? TEXTS.unavailable,
    ...extra,
  };
}

/** Все рецепты, включая выключенные — их показывает редактор. */
export async function fetchWeaponRecipes(includeInactive = false): Promise<WeaponRecipe[]> {
  const query = supabase.from('weapon_recipes').select('*').order('name');
  const { data, error } = includeInactive ? await query : await query.eq('is_active', true);

  if (error) {
    console.error('[weaponWorkbench] Рецепты не загрузились:', error);
    return [];
  }

  return (data ?? []).map((r) => ({
    ...r,
    // ingredients приходит как jsonb: массив объектов. Если автор
    // оставил мусор, пустой массив безопаснее падения на .map.
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
  })) as WeaponRecipe[];
}

/**
 * Сколько игрок имеет по каждому предмету.
 *
 * Одного предмета в сумке может быть несколько стопок, поэтому
 * складываем количество по всем строкам — так же считает сервер,
 * иначе панель показывала бы «есть 3» при фактических 10.
 */
export function countInventory(
  items: Array<{ item_id: string; amount: number }>
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of items ?? []) {
    totals[row.item_id] = (totals[row.item_id] ?? 0) + Number(row.amount ?? 0);
  }
  return totals;
}

/** Не хватает ингредиентов для одного рецепта. */
export function missingIngredients(
  recipe: WeaponRecipe,
  totals: Record<string, number>
): WeaponIngredient[] {
  return recipe.ingredients.filter((ing) => (totals[ing.item_key] ?? 0) < ing.amount);
}

/**
 * Список нехватки в виде текста: «Материалы 7 из 20».
 * itemNames приходит из каталога, чтобы не показывать item_key.
 */
export function describeMissing(
  recipe: WeaponRecipe,
  totals: Record<string, number>,
  itemNames: Record<string, string>
): string {
  return missingIngredients(recipe, totals)
    .map((ing) => `${itemNames[ing.item_key] ?? ing.item_key}: ${totals[ing.item_key] ?? 0} из ${ing.amount}`)
    .join(', ');
}

/** Крафт. Решение принимает база, здесь только разбор ответа. */
export async function craftWeapon(
  playerId: string | null | undefined,
  recipeId: number,
  count = 1
): Promise<CraftResult> {
  if (!playerId) return result('bad_count', { text: 'Профиль не найден.' });

  const { data, error } = await supabase.rpc('craft_weapon', {
    p_player_id: playerId,
    p_recipe_id: recipeId,
    p_count: count,
  });

  if (error) {
    console.error('[weaponWorkbench] Крафт не сработал:', error);
    return result('unavailable');
  }

  const res = (data ?? {}) as {
    ok?: boolean;
    blocked?: string;
    item_key?: string;
    amount?: number;
    need?: number;
    have?: number;
  };

  if (!res.ok) {
    const code = res.blocked as CraftBlock | undefined;
    return result(code && code in TEXTS ? code : 'unavailable', {
      need: res.need,
      have: res.have,
    });
  }

  return {
    ok: true,
    blocked: null,
    itemKey: res.item_key,
    amount: res.amount,
    text: 'Готово.',
  };
}