import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Hammer, ChevronLeft } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { useItemCategoryStore } from '../../stores/useItemCategoryStore';
import {
  craftWeapon,
  countInventory,
  describeMissing,
  fetchWeaponRecipes,
  missingIngredients,
  type CraftResult,
  type WeaponRecipe,
} from './weaponWorkbench';

interface WeaponWorkbenchViewProps {
  onClose: () => void;
}

/**
 * Верстак для оружия.
 *
 * Показывает рецепты из базы и позволяет собрать ствол, если
 * материалов хватает. Итог приходит из craft_weapon: если сервер
 * отказал, панель показывает причину, а не повторяет попытку.
 */
export default function WeaponWorkbenchView({ onClose }: WeaponWorkbenchViewProps) {
  const player = usePlayerStore((s) => s.player);
  const inventoryItems = useInventoryStore((s) => s.items);
  const fetchPlayerInventory = useInventoryStore((s) => s.fetchPlayerInventory);
  const catalogItems = useItemCategoryStore((s) => s.items);

  const [recipes, setRecipes] = useState<WeaponRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<CraftResult | null>(null);

  const totals = useMemo(() => countInventory(inventoryItems), [inventoryItems]);

  // Имена предметов нужны и ингредиентам, и результату: в списке
  // показываем человеческие названия, а не item_key.
  const itemNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of catalogItems) {
      const key = item.item_key || item.key;
      if (key) map[key] = item.name;
    }
    return map;
  }, [catalogItems]);

  const load = useCallback(async () => {
    setLoading(true);
    setRecipes(await fetchWeaponRecipes());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const craft = useCallback(
    async (recipe: WeaponRecipe) => {
      if (busyId !== null) return;
      setBusyId(recipe.id);
      setMessage(null);

      try {
        const res = await craftWeapon(player?.id, recipe.id);
        setMessage(res);
        if (res.ok) await fetchPlayerInventory();
      } finally {
        setBusyId(null);
      }
    },
    [busyId, player?.id, fetchPlayerInventory]
  );

  return (
    <div className="fixed inset-0 z-[650] bg-[#0a0505] flex flex-col text-white font-sans">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-white/10">
        <div>
          <p className="text-[10px] font-black uppercase text-red-500/70 tracking-[0.35em]">
            Оружейная
          </p>
          <h1 className="text-lg font-black uppercase italic">Верстак для оружия</h1>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {message && (
          <div
            className={`mb-3 rounded-2xl border p-3 text-xs font-black uppercase ${
              message.ok
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            {message.ok
              ? `Готово: ${itemNames[message.itemKey ?? ''] ?? message.itemKey} ×${message.amount}`
              : message.text}
          </div>
        )}

        {loading && <p className="text-xs text-slate-500">Загружаем рецепты…</p>}

        {!loading && recipes.length === 0 && (
          <p className="text-xs text-slate-500">
            Рецептов пока нет. Автор добавляет их в редакторе.
          </p>
        )}

        <div className="space-y-3">
          {recipes.map((recipe) => {
            const missing = missingIngredients(recipe, totals);
            const ready = missing.length === 0;
            const busy = busyId === recipe.id;
            const resultName = itemNames[recipe.result_item_key] ?? recipe.result_item_key;

            return (
              <div
                key={recipe.id}
                className={`rounded-2xl border p-3 ${
                  ready ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-black/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{recipe.icon || '🔫'}</span>
                  <div className="min-w-0">
                    <p className="font-black text-sm uppercase truncate">{recipe.name}</p>
                    <p className="text-[10px] text-slate-500">
                      → {resultName} ×{recipe.result_amount}
                    </p>
                  </div>
                </div>

                {recipe.description && (
                  <p className="text-[11px] text-slate-400 mb-2">{recipe.description}</p>
                )}

                <div className="space-y-1 mb-3">
                  {recipe.ingredients.map((ing) => {
                    const have = totals[ing.item_key] ?? 0;
                    const enough = have >= ing.amount;
                    return (
                      <div
                        key={ing.item_key}
                        className={`flex items-center justify-between text-[11px] ${
                          enough ? 'text-emerald-300' : 'text-red-300'
                        }`}
                      >
                        <span>{itemNames[ing.item_key] ?? ing.item_key}</span>
                        <span className="font-black">
                          {have} / {ing.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => void craft(recipe)}
                  disabled={!ready || busy || busyId !== null}
                  className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 ${
                    ready
                      ? 'bg-red-700 active:bg-red-600'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  <Hammer size={14} />
                  {busy ? 'Собираем…' : ready ? 'Собрать' : 'Не хватает материалов'}
                </button>

                {!ready && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    {describeMissing(recipe, totals, itemNames)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onClose}
        className="m-4 py-3 rounded-xl text-[10px] font-black uppercase bg-white/10 active:scale-95 flex items-center justify-center gap-2"
      >
        <ChevronLeft size={14} /> Вернуться в хаб
      </button>
    </div>
  );
}