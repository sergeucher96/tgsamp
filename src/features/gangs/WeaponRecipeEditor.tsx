import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { useItemCategoryStore } from '../../stores/useItemCategoryStore';
import { fetchWeaponRecipes, type WeaponIngredient, type WeaponRecipe } from './weaponWorkbench';
import { supabase } from '../../services/supabase/client';

interface WeaponRecipeEditorProps {
  onClose: () => void;
}

/** Черновик рецепта в форме редактора */
interface Draft {
  id: number | null;
  recipe_key: string;
  name: string;
  icon: string;
  description: string;
  result_item_key: string;
  result_amount: number;
  ingredients: WeaponIngredient[];
  is_active: boolean;
}

const EMPTY: Draft = {
  id: null,
  recipe_key: '',
  name: '',
  icon: '🔫',
  description: '',
  result_item_key: '',
  result_amount: 1,
  ingredients: [],
  is_active: true,
};

/**
 * Редактор рецептов верстака.
 *
 * Показывает и выключенные рецепты: автору нужно видеть всё, что он
 * нарисовал, а не только то, что сейчас видно игрокам.
 *
 * Сохраняет через save_weapon_recipe — она проверяет, что предметы
 * существуют в каталоге и у каждого ингредиента есть количество.
 * Опечатка в jsonb иначе уронила бы крафт до конца игры.
 */
export default function WeaponRecipeEditor({ onClose }: WeaponRecipeEditorProps) {
  const catalogItems = useItemCategoryStore((s) => s.items);

  const [recipes, setRecipes] = useState<WeaponRecipe[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickerFor, setPickerFor] = useState<'result' | 'ingredient' | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'ok' } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRecipes(await fetchWeaponRecipes(true));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Каталог нужен и для пикера, и для показа имён: если он пуст,
  // предметы не найдутся — подсказываем это, а не молчим.
  const catalog = useMemo(
    () =>
      catalogItems
        .map((i) => ({ key: i.item_key || i.key, name: i.name, icon: i.icon || '📦' }))
        .filter((i) => !!i.key),
    [catalogItems]
  );

  const itemName = useCallback(
    (key: string) => catalog.find((i) => i.key === key)?.name ?? key,
    [catalog]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((i) => i.name.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
  }, [catalog, search]);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.rpc('save_weapon_recipe', {
      p_recipe_id: draft.id,
      p_recipe_key: draft.recipe_key,
      p_name: draft.name,
      p_icon: draft.icon,
      p_description: draft.description,
      p_result_item_key: draft.result_item_key,
      p_result_amount: draft.result_amount,
      p_ingredients: draft.ingredients,
      p_is_active: draft.is_active,
    });

    setSaving(false);

    if (error) {
      setMessage({ text: error.message, kind: 'error' });
      return;
    }
    setMessage({ text: `Сохранено: ${draft.name}`, kind: 'ok' });
    setDraft(null);
    await load();
  }, [draft, load]);

  const remove = useCallback(
    async (recipe: WeaponRecipe) => {
      // Удаление идёт напрямую: отдельной функции нет, а для автора
      // это разовая операция из редактора.
      const { error } = await supabase.from('weapon_recipes').delete().eq('id', recipe.id);
      if (error) {
        setMessage({ text: error.message, kind: 'error' });
        return;
      }
      await load();
    },
    [load]
  );

  const pick = (key: string) => {
    if (!draft || !pickerFor) return;
    if (pickerFor === 'result') {
      setDraft({ ...draft, result_item_key: key });
    } else {
      // Один и тот же ингредиент дважды не добавляем: количество
      // задаётся в единственной строке, иначе сервер спишет его дважды.
      if (draft.ingredients.some((i) => i.item_key === key)) {
        setMessage({ text: 'Этот предмет уже в списке.', kind: 'error' });
      } else {
        setDraft({ ...draft, ingredients: [...draft.ingredients, { item_key: key, amount: 1 }] });
      }
    }
    setPickerFor(null);
    setSearch('');
  };

  return (
    <div className="fixed inset-0 z-[800] bg-[#050814] text-white font-sans flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-purple-400 text-[10px] font-black uppercase"
        >
          <ArrowLeft size={14} /> Назад
        </button>
        <h1 className="text-sm font-black uppercase">Рецепты верстака</h1>
        <button
          onClick={() => {
            setDraft({ ...EMPTY });
            setMessage(null);
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-[10px] font-black uppercase active:scale-95"
        >
          <Plus size={12} /> Новый
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 max-w-2xl mx-auto w-full space-y-3">
        {message && (
          <div
            className={`rounded-xl border p-2.5 text-[10px] font-black uppercase ${
              message.kind === 'ok'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {catalog.length === 0 && (
          <p className="text-[10px] text-amber-400">
            Каталог предметов пуст — откройте «Каталог предметов» и добавьте оружие.
          </p>
        )}

        {recipes.map((r) => (
          <div key={r.id} className="border border-white/10 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black uppercase truncate">
                  {r.icon} {r.name}
                </p>
                <p className="text-[10px] text-slate-500">
                  {r.recipe_key} → {itemName(r.result_item_key)} ×{r.result_amount}
                  {!r.is_active ? ' • выключен' : ''}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() =>
                    setDraft({
                      id: r.id,
                      recipe_key: r.recipe_key,
                      name: r.name,
                      icon: r.icon,
                      description: r.description,
                      result_item_key: r.result_item_key,
                      result_amount: r.result_amount,
                      ingredients: r.ingredients,
                      is_active: r.is_active,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-white/10 text-[10px] font-black uppercase active:scale-95"
                >
                  Изменить
                </button>
                <button
                  onClick={() => void remove(r)}
                  className="p-2 rounded-xl bg-red-500/20 text-red-400 active:scale-90"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 flex flex-wrap gap-1.5">
              {r.ingredients.map((ing) => (
                <span key={ing.item_key} className="bg-white/5 rounded-lg px-2 py-1">
                  {itemName(ing.item_key)} ×{ing.amount}
                </span>
              ))}
            </div>
          </div>
        ))}

        {draft && (
          <div className="border-2 border-purple-500/40 rounded-2xl p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-500">Ключ</span>
                <input
                  value={draft.recipe_key}
                  onChange={(e) => setDraft({ ...draft, recipe_key: e.target.value })}
                  placeholder="wep_pistol"
                  className="w-full mt-1 bg-white/5 rounded-xl px-3 py-2 text-xs"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-500">Иконка</span>
                <input
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  className="w-full mt-1 bg-white/5 rounded-xl px-3 py-2 text-xs"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-500">Название</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full mt-1 bg-white/5 rounded-xl px-3 py-2 text-xs"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-500">Описание</span>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                className="w-full mt-1 bg-white/5 rounded-xl px-3 py-2 text-xs resize-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPickerFor('result')}
                className="px-3 py-2 rounded-xl bg-white/10 text-[10px] font-black uppercase text-left"
              >
                Результат:{' '}
                <span className="text-emerald-300">
                  {draft.result_item_key ? itemName(draft.result_item_key) : 'выбрать'}
                </span>
              </button>
              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-500">Кол-во</span>
                <input
                  type="number"
                  min={1}
                  value={draft.result_amount}
                  onChange={(e) =>
                    setDraft({ ...draft, result_amount: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-full mt-1 bg-white/5 rounded-xl px-3 py-2 text-xs"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Ингредиенты ({draft.ingredients.length})
                </span>
                <button
                  onClick={() => setPickerFor('ingredient')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-[10px] font-black uppercase active:scale-95"
                >
                  <Plus size={12} /> Добавить
                </button>
              </div>

              {draft.ingredients.map((ing, index) => (
                <div key={ing.item_key} className="flex items-center gap-2">
                  <span className="flex-1 text-xs bg-white/5 rounded-xl px-3 py-2">
                    {itemName(ing.item_key)}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={ing.amount}
                    onChange={(e) => {
                      const next = [...draft.ingredients];
                      next[index] = { ...ing, amount: Math.max(1, Number(e.target.value) || 1) };
                      setDraft({ ...draft, ingredients: next });
                    }}
                    className="w-20 bg-white/5 rounded-xl px-3 py-2 text-xs"
                  />
                  <button
                    onClick={() =>
                      setDraft({
                        ...draft,
                        ingredients: draft.ingredients.filter((_, i) => i !== index),
                      })
                    }
                    className="p-2 rounded-xl bg-red-500/20 text-red-400 active:scale-90"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-[10px] font-black uppercase">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              Рецепт включён
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => void save()}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-[10px] font-black uppercase active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={14} /> {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button
                onClick={() => setDraft(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-[10px] font-black uppercase active:scale-95"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Пикер предметов: один на результат и ингредиенты. */}
        {pickerFor && (
          <div className="fixed inset-0 z-[850] bg-black/90 backdrop-blur flex flex-col p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setPickerFor(null)} className="text-[10px] font-black uppercase text-purple-400">
                <ArrowLeft size={14} /> Отмена
              </button>
              <span className="text-[10px] font-black uppercase text-slate-500">
                {pickerFor === 'result' ? 'Что получается' : 'Что нужно'}
              </span>
            </div>

            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск предмета…"
              className="w-full mb-3 bg-white/5 rounded-xl px-3 py-2.5 text-xs"
            />

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map((i) => (
                <button
                  key={i.key}
                  onClick={() => pick(i.key)}
                  className="w-full flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 text-left active:scale-[0.99]"
                >
                  <span className="text-xl">{i.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{i.name}</p>
                    <p className="text-[9px] text-slate-500">{i.key}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}