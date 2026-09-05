import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, Minus, Search, X, Copy } from 'lucide-react';
import { RECIPES as DEFAULT_RECIPES } from '../data/kitchenConfig';
import { useItemCategoryStore } from '../store/useItemCategoryStore';
import { CHARACTER_STATS, BUFF_STAT_KEYS } from '../data/characterStats';

const loadCustomItems = () => {
  try { const s = localStorage.getItem('recipe_editor_custom_items'); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
};
const saveCustomItems = (items) => localStorage.setItem('recipe_editor_custom_items', JSON.stringify(items));
const loadCustomRecipes = () => {
  try { const s = localStorage.getItem('recipe_editor_custom_recipes'); return s ? JSON.parse(s) : []; }
  catch { return []; }
};
const saveCustomRecipes = (r) => localStorage.setItem('recipe_editor_custom_recipes', JSON.stringify(r));

const TYPE_LABELS = { ingredient: '🥘 Ингредиенты', resource: '⛏️ Ресурсы', food: '🍽️ Блюда', tool: '🔧 Инструменты', other: '📦 Прочее' };
const GROUP_ORDER = ['ingredient', 'resource', 'food', 'tool', 'other'];
const ACTION_OPTIONS = [
  { value: '', label: 'Нет' },
  { value: 'HEAL_ENERGY', label: '💚 Восстановить энергию' },
  ...BUFF_STAT_KEYS.map(key => {
    const stat = CHARACTER_STATS.find(s => s.key === key);
    return { value: `buff_${key}`, label: `${stat?.icon || ''} Бафф: ${stat?.name || key}` };
  })
];
const EMOJI_LIST = ['🍔','🌮','🍕','🍛','🥗','🍝','🥘','🍗','🍖','🥪','🥙','🫔','🍣','🍤','🥫','🍙','🍚','🍘','🥟','🍠','🍡','🍧','🍨','🍦','🥧','🍰','🎂','🍮','🍭','🍬','🍫','🍯','☕','🍵','🥤'];

const groupItems = (items) => {
  const g = {}; items.forEach(i => { const t = i.type || 'other'; if (!g[t]) g[t] = []; g[t].push(i); }); return g;
};

const mapStoreItem = (item) => {
  const id = item.item_key || String(item.id);
  const props = typeof item.properties === 'object' ? item.properties : {};
  const effects = Array.isArray(item.effects) ? item.effects : [];
  const action = effects[0]?.effect_key || props.action || '';
  const value = effects[0]?.value || props.value || 0;
  return {
    id,
    name: item.name || id,
    desc: item.description || '',
    icon: item.icon || '📦',
    type: props.type || 'other',
    stackable: item.stackable !== false,
    maxStack: item.max_stack || 5,
    sellPrice: item.sell_price || 0,
    action,
    value: Number(value) || 0,
  };
};

export default function RecipeEditor({ onClose }) {
  const { items: storeItems, categories, properties, effects, actions, tags, loadAll, createItem, updateItem } = useItemCategoryStore();
  const [customRecipes, setCustomRecipes] = useState(() => loadCustomRecipes().map(r => ({ ...r, source: 'custom' })));
  const [defaultRecipes] = useState(() => {
    const ids = new Set(loadCustomRecipes().map(r => r.id));
    return DEFAULT_RECIPES.filter(r => !ids.has(r.id)).map(r => ({ ...r, source: 'default' }));
  });
  const recipes = [...defaultRecipes, ...customRecipes];

  const [showEditor, setShowEditor] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState([]);

  const [itemId, setItemId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemIcon, setItemIcon] = useState('🍔');
  const [itemDesc, setItemDesc] = useState('');
  const [itemAction, setItemAction] = useState('');
  const [itemValue, setItemValue] = useState(0);
  const [itemStackable, setItemStackable] = useState(true);
  const [itemMaxStack, setItemMaxStack] = useState(5);
  const [itemSellPrice, setItemSellPrice] = useState(0);
  const [resultAmount, setResultAmount] = useState(1);

  const [buffType, setBuffType] = useState('');
  const [buffDuration, setBuffDuration] = useState(60);
  const [buffAmount, setBuffAmount] = useState(10);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [itemProperties, setItemProperties] = useState({});
  const [itemEffects, setItemEffects] = useState([]);

  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState({ ingredient: true });
  const [showEmoji, setShowEmoji] = useState(false);

  const customItems = loadCustomItems();
  const storeMapped = (storeItems || []).map(mapStoreItem);
  const ALL_ITEMS_DB = { ...storeMapped.reduce((acc, item) => ({ ...acc, [item.id]: item }), {}), ...customItems };
  const ALL_ITEMS = Object.values(ALL_ITEMS_DB);

  const filtered = ALL_ITEMS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()));
  const grouped = groupItems(filtered);

  const say = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const preparedFoodCategory = categories.find(c => c.key === 'prepared_food') || categories.find(c => c.key === 'food');

  useEffect(() => {
    if (preparedFoodCategory && !selectedCategoryId) {
      setSelectedCategoryId(preparedFoodCategory.id);
    }
  }, [preparedFoodCategory, selectedCategoryId]);

  const categoryProperties = selectedCategoryId ? properties.filter(p => {
    const link = (window.__categoryProperties || []).find(cp => cp.category_id === selectedCategoryId && cp.property_id === p.id);
    return !!link;
  }) : [];

  const categoryEffects = selectedCategoryId ? effects.filter(e => {
    const link = (window.__categoryEffectsAllowed || []).find(ce => ce.category_id === selectedCategoryId && ce.effect_id === e.id);
    return !!link;
  }) : [];

  const startNew = () => {
    setEditIdx(null); setRecipeName(''); setIngredients([]);
    setItemId(`recipe_item_${Date.now()}`); setItemName(''); setItemIcon('🍔'); setItemDesc('');
    setItemAction(''); setItemValue(0); setItemStackable(true); setItemMaxStack(5); setItemSellPrice(0); setResultAmount(1);
    setBuffType(''); setBuffDuration(60); setBuffAmount(10);
    setSelectedCategoryId(preparedFoodCategory?.id || null);
    setItemProperties({});
    setItemEffects([]);
    setShowPicker(false); setShowEditor(true); setShowEmoji(false);
  };

  const editRecipe = (r) => {
    const idx = customRecipes.findIndex(c => c.id === r.id);
    setEditIdx(idx); setRecipeName(r.name);
    const ings = [], counts = {};
    r.ingredients?.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    Object.entries(counts).forEach(([id, a]) => { const it = ALL_ITEMS.find(i => i.id === id); if (it) ings.push({ itemId: id, amount: a }); });
    setIngredients(ings);
    const ci = loadCustomItems()[r.resultItem];
    setItemId(r.resultItem); setItemName(ci?.name || ''); setItemIcon(ci?.icon || '🍔'); setItemDesc(ci?.desc || '');
    setItemAction(ci?.action || ''); setItemValue(ci?.value || 0); setItemStackable(ci?.stackable !== false); setItemMaxStack(ci?.maxStack || 5); setItemSellPrice(ci?.sellPrice || 0);
    setResultAmount(r.resultAmount || 1); setShowPicker(false); setShowEditor(true); setShowEmoji(false);
    
    const buffEffect = ci?.effects?.find(e => e.effect_key?.startsWith('buff_'));
    if (buffEffect) {
      setBuffType(buffEffect.effect_key || '');
      setBuffAmount(Number(buffEffect.value) || 10);
      setBuffDuration(Number(buffEffect.duration_minutes) || 60);
    } else {
      setBuffType(''); setBuffDuration(60); setBuffAmount(10);
    }
  };

  const cancel = () => { setShowEditor(false); setEditIdx(null); setRecipeName(''); setIngredients([]); setShowEmoji(false); };

  const addIng = (item) => {
    const ex = ingredients.find(i => i.itemId === item.id);
    if (ex) setIngredients(ingredients.map(i => i.itemId === item.id ? { ...i, amount: i.amount + 1 } : i));
    else setIngredients([...ingredients, { itemId: item.id, amount: 1 }]);
    setShowPicker(false); setSearch('');
  };

  const save = async () => {
    if (!recipeName.trim()) { say('⚠️ Название рецепта'); return; }
    if (!itemName.trim()) { say('⚠️ Название блюда'); return; }
    if (ingredients.length === 0) { say('⚠️ Добавьте ингредиенты'); return; }

    const flat = []; ingredients.forEach(i => { for (let n = 0; n < i.amount; n++) flat.push(i.itemId); });

    const effectsList = Object.entries(itemEffects).map(([effectId, value]) => ({ effect_key: effectId, value: Number(value) || 0 }));
    if (itemAction && effectsList.length === 0) {
      if (itemAction.startsWith('buff_')) {
        effectsList.push({ effect_key: itemAction, value: Number(buffAmount) || 0, duration_minutes: Number(buffDuration) || 60 });
      } else {
        effectsList.push({ effect_key: itemAction, value: itemValue || 0 });
      }
    }

    const newItem = {
      item_key: itemId,
      name: itemName.trim(),
      description: itemDesc.trim(),
      icon: itemIcon,
      category_id: selectedCategoryId,
      properties: itemProperties,
      effects: effectsList,
      tags: ['food', 'prepared_food', 'consumable'],
      stackable: itemStackable,
      max_stack: itemMaxStack,
      sell_price: itemSellPrice,
    };

    let savedItem = null;
    const existing = (storeItems || []).find(i => i.item_key === itemId);
    if (existing) {
      savedItem = await updateItem(existing.id, newItem);
    } else {
      savedItem = await createItem(newItem);
    }

    if (!savedItem) {
      say('❌ Не удалось сохранить блюдо в БД');
      return;
    }

    const recipe = { id: editIdx !== null ? customRecipes[editIdx].id : `recipe_${Date.now()}`,
      name: recipeName.trim(), icon: itemIcon, ingredients: flat, resultItem: itemId, resultAmount: parseInt(resultAmount) || 1, source: 'custom' };
    const cr = loadCustomRecipes();
    if (editIdx !== null) cr[editIdx] = recipe; else cr.unshift(recipe);
    saveCustomRecipes(cr);
    setCustomRecipes([...loadCustomRecipes()].map(r => ({ ...r, source: 'custom' })));
    await loadAll();
    say('✅ Рецепт и блюдо сохранены!'); cancel();
  };

  const del = (id) => {
    if (!window.confirm('Удалить?')) return;
    const cr = loadCustomRecipes().filter(r => r.id !== id); saveCustomRecipes(cr);
    setCustomRecipes(cr.map(r => ({ ...r, source: 'custom' })));
    if (editIdx !== null && customRecipes[editIdx]?.id === id) cancel();
    say('🗑️ Удалён');
  };

  const dup = (r) => {
    const copy = { ...r, id: `recipe_${Date.now()}`, name: `${r.name} (копия)` };
    const cr = loadCustomRecipes(); cr.unshift(copy); saveCustomRecipes(cr);
    setCustomRecipes([...loadCustomRecipes()].map(x => ({ ...x, source: 'custom' })));
    say('📋 Скопирован');
  };

  return (
    <div className="h-full w-full bg-[#050814] text-white overflow-hidden font-sans relative flex flex-col">
      <div className="z-20 p-6 flex items-center bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="flex items-center gap-2 text-purple-400 text-[10px] font-black uppercase tracking-widest mb-1 active:opacity-70">
          <ArrowLeft size={14} /> Назад
        </button>
        <div className="text-left">
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">Редактор</p>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">🍳 Рецепты</h2>
        </div>
      </div>
      {msg && <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md border border-purple-500/30 rounded-2xl px-6 py-3">
        <p className="text-xs font-black uppercase text-center text-purple-300">{msg}</p></div>}

      {showPicker && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col p-6">
          <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-black uppercase italic text-purple-400">Ингредиент</h3>
            <button onClick={() => { setShowPicker(false); setSearch(''); }} className="p-2 bg-white/10 rounded-xl"><X size={14} /></button></div>
          <div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 font-black uppercase focus:outline-none focus:border-purple-500/50" autoFocus /></div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
            {GROUP_ORDER.filter(g => grouped[g]?.length).map(g => (
              <div key={g}><button onClick={() => setExpanded(p => ({ ...p, [g]: !p[g] }))}
                className="w-full text-left text-[10px] font-black uppercase text-slate-400 py-1.5 px-2 flex justify-between">
                <span>{TYPE_LABELS[g]}</span><span className="text-slate-600">{expanded[g] ? '▼' : '►'}</span></button>
                {expanded[g] && <div className="grid grid-cols-2 gap-1.5 mb-1">{grouped[g].map(i => (
                  <button key={i.id} onClick={() => addIng(i)} className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 flex items-center gap-2 active:scale-95">
                    <span className="text-2xl">{i.icon}</span><div><p className="text-[10px] font-black uppercase">{i.name}</p><p className="text-[8px] text-slate-500">{i.id}</p></div></button>
                ))}</div>}
              </div>))}
          </div></div>)}

      <div className="flex-1 overflow-y-auto no-scrollbar pt-20 px-6 pb-6">
        {showEditor ? (
          <div className="max-w-lg mx-auto space-y-4 pt-4">
            <h3 className="text-base font-black uppercase italic text-purple-400">{editIdx !== null ? '✏️ Редактировать' : '🍳 Новый рецепт + блюдо'}</h3>

            <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Название рецепта</label>
              <input type="text" value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Например: Сочный бургер..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white font-black uppercase focus:outline-none focus:border-purple-500/50" /></div>

            <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Ингредиенты ({ingredients.length})</label>
              <div className="space-y-1.5 mb-2">{ingredients.map((ing, idx) => { const item = ALL_ITEMS_DB[ing.itemId];
                return <div key={idx} className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-xl">{item?.icon || '❓'}</span><span className="text-xs font-black uppercase text-white">{item?.name || ing.itemId}</span></div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setIngredients(ingredients.map((i, n) => n !== idx ? i : { ...i, amount: Math.max(1, i.amount - 1) }))} className="p-1 bg-white/10 rounded w-6 h-6 flex items-center justify-center"><Minus size={10} /></button>
                    <span className="text-xs font-black w-5 text-center">{ing.amount}</span>
                    <button onClick={() => setIngredients(ingredients.map((i, n) => n !== idx ? i : { ...i, amount: i.amount + 1 }))} className="p-1 bg-white/10 rounded w-6 h-6 flex items-center justify-center"><Plus size={10} /></button>
                    <button onClick={() => setIngredients(ingredients.filter((_, n) => n !== idx))} className="p-1 bg-red-500/20 rounded text-red-400 w-6 h-6 flex items-center justify-center"><X size={10} /></button></div></div>}
              )}</div>
              <button onClick={() => { setShowPicker(true); setSearch(''); }} className="w-full bg-cyan-600/20 border border-cyan-500/30 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95"><Plus size={12} /> Добавить ингредиент</button></div>

            <div className="text-center text-purple-500 text-xl">↓ создаётся ↓</div>

            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black uppercase text-purple-400">🆕 Новое блюдо</p>
              <div className="flex gap-3 items-start">
                <button onClick={() => setShowEmoji(!showEmoji)} className="w-12 h-12 bg-white/10 rounded-xl text-2xl flex items-center justify-center border border-white/20 active:scale-90 flex-shrink-0">{itemIcon}</button>
                <div className="flex-1 space-y-2">
                  <div><label className="text-[10px] font-black uppercase text-slate-400">Имя блюда</label>
                    <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Домашний бургер..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-black uppercase focus:outline-none focus:border-purple-500/50" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-400">ID</label>
                    <input type="text" value={itemId} onChange={e => setItemId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[10px] text-slate-400 font-mono focus:outline-none focus:border-purple-500/50" /></div>
                </div></div>

              {showEmoji && <div className="grid grid-cols-10 gap-1 bg-black/50 rounded-xl p-2">
                {EMOJI_LIST.map(em => <button key={em} onClick={() => { setItemIcon(em); setShowEmoji(false); }} className="text-xl p-1 hover:bg-white/10 rounded">{em}</button>)}</div>}

              <div><label className="text-[10px] font-black uppercase text-slate-400">Описание</label>
                <input type="text" value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="Вкусное блюдо..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-black uppercase focus:outline-none focus:border-purple-500/50" /></div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Категория</label>
                <select value={selectedCategoryId || ''} onChange={e => setSelectedCategoryId(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-black uppercase focus:outline-none">
                  <option value="">— Выберите категорию —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name} ({c.key})</option>
                  ))}
                </select>
              </div>

              {categoryProperties.length > 0 && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Свойства</label>
                  <div className="space-y-1">
                    {categoryProperties.map(prop => (
                      <div key={prop.id} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-24 truncate">{prop.name || prop.key}</span>
                        <input type="text" value={itemProperties[prop.key] || ''} onChange={e => setItemProperties(prev => ({ ...prev, [prop.key]: e.target.value }))} placeholder="Значение" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {categoryEffects.length > 0 && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Эффекты</label>
                  <div className="space-y-1">
                    {categoryEffects.map(eff => (
                      <div key={eff.id} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-24 truncate">{eff.name || eff.key}</span>
                        <input type="number" value={itemEffects[eff.key] || 0} onChange={e => setItemEffects(prev => ({ ...prev, [eff.key]: e.target.value }))} placeholder="Значение" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-black uppercase text-slate-400">Действие</label>
                  <select value={itemAction} onChange={e => setItemAction(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-black uppercase focus:outline-none">
                    {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Значение</label>
                  <input type="number" value={itemValue} onChange={e => setItemValue(parseInt(e.target.value) || 0)} min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-black uppercase focus:outline-none" />
                  {itemAction === 'HEAL_ENERGY' && <p className="text-[8px] text-slate-500 mt-1">% энергии</p>}</div></div>

              {itemAction?.startsWith('buff_') && (
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] font-black uppercase text-slate-400">Длительность (мин)</label>
                    <input type="number" value={buffDuration} onChange={e => setBuffDuration(parseInt(e.target.value) || 60)} min="1"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-black uppercase focus:outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-400">Сила баффа</label>
                    <input type="number" value={buffAmount} onChange={e => setBuffAmount(parseInt(e.target.value) || 0)} min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-black uppercase focus:outline-none" /></div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] font-black uppercase text-slate-400">Стакаемый</label>
                  <select value={itemStackable} onChange={e => setItemStackable(e.target.value === 'true')} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-2 text-xs text-white font-black uppercase focus:outline-none">
                    <option value={true}>Да</option><option value={false}>Нет</option></select></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Макс стопка</label>
                  <input type="number" value={itemMaxStack} onChange={e => setItemMaxStack(parseInt(e.target.value) || 5)} min="1" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-2 text-sm text-white font-black uppercase focus:outline-none text-center" /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Цена продажи</label>
                  <input type="number" value={itemSellPrice} onChange={e => setItemSellPrice(parseInt(e.target.value) || 0)} min="0" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-2 text-sm text-white font-black uppercase focus:outline-none" /></div></div>

              <div><label className="text-[10px] font-black uppercase text-slate-400">Кол-во в результате</label>
                <input type="number" value={resultAmount} onChange={e => setResultAmount(Math.max(1, parseInt(e.target.value) || 1))} min="1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-black uppercase focus:outline-none text-center" /></div>
            </div>

            <div className="flex gap-2">
              <button onClick={cancel} className="flex-1 bg-white/10 py-2.5 rounded-xl text-[10px] font-black uppercase active:scale-95">Отмена</button>
              <button onClick={save} className="flex-1 bg-emerald-600 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95"><Save size={12} /> Сохранить</button></div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-4 pt-4">
            <button onClick={startNew} className="w-full bg-purple-600/20 border border-purple-500/30 py-3 px-4 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 active:scale-95"><Plus size={14} /> Новый рецепт</button>
            <div className="space-y-2">{recipes.map(recipe => {
              const ci = loadCustomItems(); const rd = ci[recipe.resultItem] || ALL_ITEMS_DB[recipe.resultItem];
              return <div key={recipe.id} className={`bg-white/[0.03] border rounded-2xl p-3.5 ${recipe.source === 'default' ? 'border-blue-500/20' : 'border-purple-500/20'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5"><span className="text-2xl">{rd?.icon || '🍽️'}</span>
                    <div><p className="text-xs font-black uppercase italic text-white">{recipe.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{recipe.ingredients?.length || 0} инг. → {rd?.name || recipe.resultItem}{recipe.source === 'custom' ? ' ✏️' : ' 🔒'}</p></div></div>
                  <div className="flex gap-1.5">
                    {recipe.source !== 'default' && (<>
                      <button onClick={() => editRecipe(recipe)} className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 active:scale-90">✏️</button>
                      <button onClick={() => dup(recipe)} className="p-1.5 bg-white/10 rounded-lg text-slate-400 active:scale-90"><Copy size={11} /></button>
                      <button onClick={() => del(recipe.id)} className="p-1.5 bg-red-500/20 rounded-lg text-red-400 active:scale-90"><Trash2 size={11} /></button>
                    </>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">{recipe.ingredients?.map((id, i) => { const it = ALL_ITEMS_DB[id]; return it ? <span key={i} className="inline-flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[9px] text-slate-300">{it.icon} {it.name}</span> : null; })}</div>
              </div>;
            })}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
