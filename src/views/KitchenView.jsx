import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Flame, RotateCcw, Trash2, Settings2 } from 'lucide-react';
import { ITEM_DATABASE as DEFAULT_ITEMS } from '../data/items';
import { useInventoryStore } from '../store/useInventoryStore';
import RecipeEditor from './RecipeEditor';
import { isImageIcon } from '../utils/iconHelper';

const loadCustomItems = () => {
  try { const s = localStorage.getItem('recipe_editor_custom_items'); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
};
const ITEM_DATABASE = { ...DEFAULT_ITEMS, ...loadCustomItems() };
import { RECIPES } from '../data/kitchenConfig';
import { supabase } from '../api/supabase';
import { usePlayerStore } from '../store/usePlayerStore';

export default function KitchenView({ onClose, houseId }) {
  const { items, houseItems, fetchPlayerInventory } = useInventoryStore();
  const [slots, setSlots] = useState([null, null, null, null]); // 4 ingredient slots
  const [cooking, setCooking] = useState(false);
  const [cookingProgress, setCookingProgress] = useState(0);
  const [resultItem, setResultItem] = useState(null);
  const [message, setMessage] = useState('');
  const [showPlayerInv, setShowPlayerInv] = useState(false);
  const [showHouseInv, setShowHouseInv] = useState(false);
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);

  // Load custom recipes and merge with defaults
  const allRecipes = useCallback(() => {
    try {
      const saved = localStorage.getItem('recipe_editor_custom_recipes');
      const custom = saved ? JSON.parse(saved) : [];
      const customIds = new Set(custom.map(r => r.id));
      const defaults = RECIPES.filter(r => !customIds.has(r.id));
      return [...defaults, ...custom];
    } catch { return RECIPES; }
  }, []);

  const playerItems = items || [];
  const houseInvItems = houseItems || [];

  // Get available ingredients from player inventory
  const playerIngredients = playerItems.filter(item => {
    const itemData = ITEM_DATABASE[item.item_id];
    return itemData && itemData.type === 'ingredient';
  });

  const houseIngredients = houseInvItems.filter(item => {
    const itemData = ITEM_DATABASE[item.item_id];
    return itemData && itemData.type === 'ingredient';
  });

  // Place ingredient into a slot
  const placeIngredient = (item, source) => {
    const emptyIdx = slots.findIndex(s => s === null);
    if (emptyIdx === -1) {
      setMessage('Все слоты заполнены! Уберите ингредиент.');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const itemData = ITEM_DATABASE[item.item_id];
    setSlots(prev => {
      const next = [...prev];
      next[emptyIdx] = {
        id: item.id,
        item_id: item.item_id,
        storage_id: item.storage_type === 'player' ? source : (source === 'player' ? 'house' : 'house'),
        storage_type: item.storage_type,
        name: itemData?.name || item.item_id,
        icon: itemData?.icon || '�',
      };
      return next;
    });
    setMessage('');
  };

  // Remove ingredient from slot (returns to inventory)
  const removeIngredient = (slotIndex) => {
    setSlots(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    setMessage('');
  };

  // Check if current slots match any recipe
  const checkRecipe = useCallback(() => {
    // Sort slots by item_id for comparison (order doesn't matter, only the set of ingredients)
    const filledSlots = slots.filter(s => s !== null).map(s => s.item_id).sort();
    const countMap = {};
    filledSlots.forEach(id => { countMap[id] = (countMap[id] || 0) + 1; });

    for (const recipe of allRecipes()) {
      const recipeCounts = {};
      recipe.ingredients.forEach(id => { recipeCounts[id] = (recipeCounts[id] || 0) + 1; });
      const currentCounts = {};
      filledSlots.forEach(id => { currentCounts[id] = (currentCounts[id] || 0) + 1; });

      const recipeKeys = Object.keys(recipeCounts).sort();
      const currentKeys = Object.keys(currentCounts).sort();

      if (recipeKeys.length !== currentKeys.length) continue;
      const match = recipeKeys.every((k, i) =>
        currentKeys[i] === k && recipeCounts[k] === currentCounts[k]
      );

      if (match) return recipe;
    }
    return null;
  }, [slots]);

  // Cook the dish
  const cook = async () => {
    const recipe = checkRecipe();
    if (!recipe) {
      setMessage('Неверные ингредиенты!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const filledSlots = slots.filter(s => s !== null);
    if (filledSlots.length === 0) {
      setMessage('Сначала поместите ингредиенты!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    setCooking(true);
    setCookingProgress(0);

    // Animation over 3 seconds
    const duration = 3000;
    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setCookingProgress((elapsed / duration) * 100);
      if (elapsed >= duration) {
        clearInterval(timer);
        finishCooking(recipe, filledSlots);
      }
    }, interval);
  };

  const finishCooking = async (recipe, usedSlots) => {
    const player = usePlayerStore.getState().player;
    if (!player) return;

    // Remove used ingredients from inventory
    for (const slot of usedSlots) {
      const { error } = await supabase
        .from('inventory')
        .update({ amount: Math.max(0, (parseInt(getCurrentItemAmount(slot)) - 1)) })
        .eq('id', slot.id)
        .eq('amount', '>', 0);
      
      // If amount becomes 0, delete instead
      try {
        const { data: currentItem } = await supabase
          .from('inventory')
          .select('amount')
          .eq('id', slot.id)
          .single();
        
        if (currentItem && parseInt(currentItem.amount) <= 0) {
          await supabase.from('inventory').delete().eq('id', slot.id);
        }
      } catch(e) {
        // Item was already deleted
      }
    }

    // Add result item to player inventory
    const itemData = ITEM_DATABASE[recipe.resultItem];
    const { error } = await supabase.from('inventory').insert([{
      owner_id: player.id.toString(),
      item_id: recipe.resultItem,
      amount: 1,
      storage_type: 'player'
    }]);

    if (!error) {
      setResultItem(itemData);
      setMessage(`✅ Готово: ${itemData?.name || recipe.resultItem}!`);
      setTimeout(() => setMessage(''), 3000);
      await fetchPlayerInventory();
    } else {
      setMessage('� Не удалось сохранить блюдо!');
      setTimeout(() => setMessage(''), 3000);
    }

    setSlots([null, null, null, null]);
    setCooking(false);
    setCookingProgress(0);
  };

  const getCurrentItemAmount = (slot) => {
    const item = [...playerItems, ...houseInvItems].find(i => i.id === slot.id);
    return item?.amount || 1;
  };

  // Clear all slots without consuming ingredients
  const clearSlots = () => {
    setSlots([null, null, null, null]);
    setMessage('');
    setResultItem(null);
  };

  const matchedRecipe = checkRecipe();

  return (
    <div className="h-full w-full bg-[#050814] text-white overflow-hidden font-sans relative flex flex-col">
      {showRecipeEditor ? (
        <RecipeEditor onClose={() => setShowRecipeEditor(false)} />
      ) : (
        <>

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-left">
              <button onClick={onClose} className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1 active:opacity-70">
                <ArrowLeft size={14} /> Назад
              </button>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Кухня</p>
            </div>
            <button onClick={() => setShowRecipeEditor(true)}
              className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 active:scale-90"
              title="Редактор рецептов">
              <Settings2 size={16} />
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-2xl px-6 py-3">
              <p className="text-xs font-black uppercase text-center text-amber-300">{message}</p>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 pt-20 pb-6">
            {/* Result dish */}
            <div className="relative">
              <div className={`w-40 h-40 rounded-3xl flex items-center justify-center border-2 ${
                resultItem ? 'border-emerald-500 bg-emerald-500/20' :
                matchedRecipe ? 'border-amber-500 bg-amber-500/20 animate-pulse' :
                'border-white/10 bg-white/[0.03]'
              }`}>
                {resultItem ? (
                  <>
                    <span className="text-6xl mb-2">{resultItem.icon}</span>
                    <p className="text-[10px] font-black uppercase text-emerald-300">{resultItem.name}</p>
                  </>
                ) : matchedRecipe ? (
                  <>
                    <Flame className="w-12 h-12 text-amber-400 animate-pulse mt-2 mb-2" />
                    <p className="text-[10px] font-black uppercase text-amber-300">{matchedRecipe.name}</p>
                  </>
                ) : (
                  <>
                    <span className="text-4xl text-slate-600">?</span>
                    <p className="text-[9px] font-black uppercase text-slate-600 mt-1">Блюдо</p>
                  </>
                )}
              </div>
              {resultItem && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600/80 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full whitespace-nowrap">
                  +{resultItem.value || 0} энергии
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="text-amber-500 text-2xl">◀</div>

            {/* 4 Ingredient slots */}
            <div className="grid grid-cols-2 gap-4">
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  className={`w-32 h-32 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    slot ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-dashed border-white/20 bg-white/[0.02]'
                  }`}
                  onClick={() => slot && removeIngredient(idx)}
                >
                  {slot ? (
                    <>
                      <span className="text-4xl">{slot.icon}</span>
                      <p className="text-[10px] font-black uppercase mt-1 text-cyan-300">{slot.name}</p>
                    </>
                  ) : (
                    <p className="text-[10px] font-black uppercase text-slate-600">Слот {idx + 1}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Recipe hint */}
            {
            slots[0] && ITEM_DATABASE[slots[0].item_id]?.id && ITEM_DATABASE[slots[0].item_id]?.name && slots[0] ?
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-black uppercase">
                Текущие ингредиенты: {slots.filter(s => s !== null).map(s => `${s.icon} ${s.name}`).join(', ')}
              </p>
            </div> : ''}

            {/* Cook button */}
            <button
              onClick={cook}
              disabled={cooking || slots.filter(s => s !== null).length === 0}
              className={`px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                cooking
                  ? 'bg-amber-600 cursor-wait'
                  : slots.filter(s => s !== null).length === 0
                  ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-600 active:scale-95'
              }`}
            >
              <Flame size={18} />
              {cooking ? `Готовлю... ${Math.round(cookingProgress)}%` : 'Приготовить!'}
            </button>

            {/* Cooking progress bar */}
            {cooking && (
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${cookingProgress}%` }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={() => setShowPlayerInv(!showPlayerInv)}
                className="bg-blue-600/20 border border-blue-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95">
                🎒 Мой инвентарь
              </button>
              <button onClick={() => setShowHouseInv(!showHouseInv)}
                className="bg-purple-600/20 border border-purple-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95">
                🏠 Дом. шкаф
              </button>
              <button onClick={clearSlots}
                className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 flex items-center gap-1">
                <RotateCcw size={12} /> Очистить
              </button>
            </div>
          </div>

          {/* Player inventory panel */}
          {showPlayerInv && (
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#0a0f1a]/95 backdrop-blur-md border-t border-blue-500/30 max-h-56 overflow-y-auto p-4">
              <p className="text-[10px] font-black uppercase text-blue-400 mb-2">Выберите ингредиент:</p>
              <div className="grid grid-cols-4 gap-2">
                {playerIngredients.map(item => {
                  const itemData = ITEM_DATABASE[item.item_id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => { placeIngredient(item, 'player'); setShowPlayerInv(false); }}
                      disabled={!itemData}
                      className="bg-white/[0.03] rounded-xl p-2 flex flex-col items-center gap-1 active:scale-95 disabled:opacity-30"
                    >
                      {isImageIcon(itemData?.icon) ? (
                        <img src={itemData.icon} className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span className="text-2xl">{itemData?.icon || '❓'}</span>
                      )}
                      <p className="text-[9px] font-black uppercase text-center leading-tight">{itemData?.name || item.item_id}</p>
                      <p className="text-[8px] text-slate-400">×{item.amount}</p>
                    </button>
                  );
                })}
                {playerIngredients.length === 0 && (
                  <p className="col-span-4 text-center text-[10px] text-slate-600 font-black uppercase py-4">Нет ингредиентов</p>
                )}
              </div>
              <button onClick={() => setShowPlayerInv(false)} className="w-full mt-2 py-2 text-[10px] font-black uppercase text-slate-400 active:opacity-70">
                Закрыть
              </button>
            </div>
          )}

          {/* House inventory panel */}
          {showHouseInv && (
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#0a0f1a]/95 backdrop-blur-md border-t border-purple-500/30 max-h-56 overflow-y-auto p-4">
              <p className="text-[10px] font-black uppercase text-purple-400 mb-2">Выберите ингредиент:</p>
              <div className="grid grid-cols-4 gap-2">
                {houseIngredients.map(item => {
                  const itemData = ITEM_DATABASE[item.item_id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => { placeIngredient(item, 'house'); setShowHouseInv(false); }}
                      disabled={!itemData}
                      className="bg-white/[0.03] rounded-xl p-2 flex flex-col items-center gap-1 active:scale-95 disabled:opacity-30"
                    >
                      {isImageIcon(itemData?.icon) ? (
                        <img src={itemData.icon} className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span className="text-2xl">{itemData?.icon || '❓'}</span>
                      )}
                      <p className="text-[9px] font-black uppercase text-center leading-tight">{itemData?.name || item.item_id}</p>
                      <p className="text-[8px] text-slate-400">×{item.amount}</p>
                    </button>
                  );
                })}
                {houseIngredients.length === 0 && (
                  <p className="col-span-4 text-center text-[10px] text-slate-600 font-black uppercase py-4">Нет ингредиентов</p>
                )}
              </div>
              <button onClick={() => setShowHouseInv(false)} className="w-full mt-2 py-2 text-[10px] font-black uppercase text-slate-400 active:opacity-70">
                Закрыть
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}