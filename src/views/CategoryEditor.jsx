import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Save, X, ChevronRight, ChevronDown, Upload } from 'lucide-react';
import { useItemCategoryStore } from '../store/useItemCategoryStore';
import { RESOURCE_TYPES } from '../data/businessConfig';
import { isImageIcon } from '../utils/iconHelper';

export default function CategoryEditor({ onClose }) {
  const {
    categories, properties, effects, actions, tags, items,
    loadAll, loadCategoryDetails,
    createCategory, updateCategory, deleteCategory,
    addCategoryProperty, removeCategoryProperty,
    addCategoryEffectAllowed, removeCategoryEffectAllowed,
    addCategoryEffectDenied, removeCategoryEffectDenied,
    addCategoryAction, removeCategoryAction,
    addCategoryTag, removeCategoryTag,
    createItem, updateItem, deleteItem,
    getChildCategories,
    getInheritedProperties, getInheritedEffects, getInheritedActions, getInheritedTags,
  } = useItemCategoryStore();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [mainTab, setMainTab] = useState('categories');

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('�');
  const [parentId, setParentId] = useState('');

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (selectedCategory) loadCategoryDetails(selectedCategory.id); }, [selectedCategory]);

  const toggleExpand = (id) => setExpandedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const resetForm = () => { setName(''); setKey(''); setDescription(''); setIcon('�'); setParentId(''); setEditingCategory(null); };

  const handleCreate = async () => {
    if (!name || !key) return alert('Название и ID обязательны');
    setLoading(true);
    const result = await createCategory({ name, key, description, icon, parent_id: parentId || null });
    if (result) { setShowForm(false); resetForm(); } else alert('Ошибка');
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!name || !key) return alert('Название и ID обязательны');
    setLoading(true);
    const result = await updateCategory(editingCategory.id, { name, key, description, icon, parent_id: parentId || null });
    if (result) { setShowForm(false); resetForm(); setSelectedCategory(result); } else alert('Ошибка');
    setLoading(false);
  };

  const openEdit = (cat) => { setName(cat.name); setKey(cat.key); setDescription(cat.description || ''); setIcon(cat.icon || '�'); setParentId(cat.parent_id || ''); setEditingCategory(cat); setShowForm(true); };

  const rootCategories = categories.filter(c => !c.parent_id);
  const parentOptions = categories.filter(c => c.id !== selectedCategory?.id);
  const filteredRoots = search ? rootCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : rootCategories;

  const renderTree = (cats) => cats.map(cat => {
    const children = getChildCategories(cat.id);
    const isExpanded = expandedCats.has(cat.id);
    return (
      <div key={cat.id}>
        <button onClick={() => { if (children.length) toggleExpand(cat.id); setSelectedCategory(cat); }} className={`w-full flex items-center gap-2 p-3 rounded-xl text-left ${selectedCategory?.id === cat.id ? 'bg-[#7eff69]/20 border border-[#7eff69]/40' : 'hover:bg-white/5'}`}>
          {children.length ? (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <div className="w-4" />}
          <span className="text-xl">{cat.icon || '�'}</span>
          <span className="font-black text-[#d6ff9f] flex-1">{cat.name}</span>
          <span className="text-[10px] text-slate-400">{children.length}</span>
        </button>
        {isExpanded && renderTree(children.map(c => ({ ...c, _indent: true })))}
      </div>
    );
  });

  if (selectedCategory) {
    return <CategoryDetail
      category={selectedCategory}
      properties={properties} effects={effects} actions={actions} tags={tags} items={items}
      parentOptions={parentOptions}
      onBack={() => setSelectedCategory(null)}
      onEdit={openEdit} onDelete={() => { deleteCategory(selectedCategory.id); setSelectedCategory(null); }}
    />;
  }

  return (
    <div className="fixed inset-0 z-[600] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15">
        <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f]">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>
        <h2 className="text-lg font-black uppercase text-[#d6ff9f]">Категории</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-full bg-green-600 px-3 py-2 text-xs font-black">
          <Plus className="h-3 w-3" /> Добавить
        </button>
      </div>
      <div className="flex gap-1 px-4 py-2 border-b border-white/10 overflow-x-auto">
        {[
          { key: 'categories', label: 'Категории' },
          { key: 'allItems', label: `Все предметы (${items.length})` }
        ].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black whitespace-nowrap ${mainTab === t.key ? 'bg-[#7eff69]/20 text-[#7eff69]' : 'text-slate-400'}`}>
            {t.key === 'categories' ? '� ' : '� '}{t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {mainTab === 'allItems' && <AllItemsView items={items} categories={categories} onClose={onClose} />}
        {mainTab === 'categories' && (
        <>
        {showForm && (
          <div className="p-4 rounded-2xl border border-yellow-500/20 bg-[#1a1a0a]/80 mb-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-black text-yellow-400">{editingCategory ? 'Редактировать' : 'Новая категория'}</p>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Название" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="ID (food, tool, weapon)" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
            <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="Иконка" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
            <select value={parentId} onChange={e => setParentId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm">
              <option value="">Нет родителя</option>
              {parentOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={editingCategory ? handleUpdate : handleCreate} disabled={loading} className="w-full py-3 rounded-xl bg-green-600 font-black text-sm flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> {editingCategory ? 'Обновить' : 'Создать'}
            </button>
          </div>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="� Поиск..." className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm mb-4" />
        <div className="space-y-1">{renderTree(filteredRoots)}</div>
        {filteredRoots.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Нет категорий</p>}
        </>)}
      </div>
    </div>
  );
}

function CategoryDetail({ category, onBack, onEdit, onDelete, properties, effects, actions, tags, items }) {
  const [activeTab, setActiveTab] = useState('properties');
  const [newPropId, setNewPropId] = useState('');
  const inherited = useItemCategoryStore.getState().getInheritedProperties(category.id);

  // Item creation/editing state
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemKey, setItemKey] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemIcon, setItemIcon] = useState('�');
  const [itemStackable, setItemStackable] = useState(false);
  const [itemMaxStack, setItemMaxStack] = useState(10);
  const [itemProperties, setItemProperties] = useState({});
  const [itemEffects, setItemEffects] = useState({});
  const [itemTags, setItemTags] = useState('');
  const [itemResources, setItemResources] = useState({});
  const [savingItem, setSavingItem] = useState(false);
  const [itemImgErrors, setItemImgErrors] = useState({});
  const [itemIconPreview, setItemIconPreview] = useState(null);
  const fileInputRef = useRef(null);

  const resourceKeys = Object.keys(RESOURCE_TYPES);

  const handleItemIconUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filename = file.name;
    const path = `/icons/items/${filename}`;
    setItemIcon(path);
    setItemIconPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const { createItem, updateItem, deleteItem, getInheritedProperties, getInheritedEffects, getInheritedActions, getInheritedTags } = useItemCategoryStore();

  const catItems = items.filter(i => i.category_id === category.id);
  const filteredItems = itemSearch ? catItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.item_key?.toLowerCase().includes(itemSearch.toLowerCase())) : catItems;
  const inhProps = getInheritedProperties(category.id);
  const inhEffects = getInheritedEffects(category.id);
  const inhActions = getInheritedActions(category.id);
  const inhTags = getInheritedTags(category.id);

  const resetItemForm = () => {
    setItemName(''); setItemKey(''); setItemDescription('');
    setItemIcon('📦'); setItemIconPreview(null);
    setItemStackable(false); setItemMaxStack(10);
    const initProps = {};
    inhProps.forEach(p => { initProps[p.id] = p.defaultValue || ''; });
    setItemProperties(initProps);
    setItemEffects({});
    setItemTags('');
    setItemResources({});
    setEditingItem(null);
    setShowItemForm(false);
  };

  const openNewItem = () => {
    resetItemForm();
    setShowItemForm(true);
  };

  const openEditItem = (item) => {
    setItemName(item.name);
    setItemKey(item.item_key || '');
    setItemDescription(item.description || '');
    setItemIcon(item.icon || '📦');
    setItemIconPreview(item.icon?.startsWith('data:image') ? item.icon : null);
    setItemStackable(item.stackable || false);
    setItemMaxStack(item.max_stack || 10);
    setItemProperties(item.properties || {});
    setItemEffects(item.effects || {});
    setItemResources(item.production_resources || {});
    setItemTags(item.tags ? Array.isArray(item.tags) ? item.tags.join(', ') : item.tags.tags?.join(', ') || '' : '');
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleCreateItem = async () => {
    if (!itemName || !itemKey) return alert('Название и ID обязательны');
    setSavingItem(true);
    const tagsArr = itemTags.split(',').map(t => t.trim()).filter(Boolean);
    const resources = {};
    Object.entries(itemResources).forEach(([k, v]) => { if (Number(v) > 0) resources[k] = Number(v); });
    const result = await createItem({
      item_key: itemKey,
      name: itemName,
      description: itemDescription,
      icon: itemIcon,
      stackable: itemStackable,
      max_stack: itemMaxStack,
      category_id: category.id,
      properties: itemProperties,
      effects: itemEffects,
      tags: tagsArr,
      production_resources: resources,
    });
    if (result) { resetItemForm(); } else alert('Ошибка создания предмета');
    setSavingItem(false);
  };

  const handleUpdateItem = async () => {
    if (!itemName || !itemKey) return alert('Название и ID обязательны');
    setSavingItem(true);
    const tagsArr = itemTags.split(',').map(t => t.trim()).filter(Boolean);
    const resources = {};
    Object.entries(itemResources).forEach(([k, v]) => { if (Number(v) > 0) resources[k] = Number(v); });
    const result = await updateItem(editingItem.id, {
      item_key: itemKey,
      name: itemName,
      description: itemDescription,
      icon: itemIcon,
      stackable: itemStackable,
      max_stack: itemMaxStack,
      category_id: category.id,
      properties: itemProperties,
      effects: itemEffects,
      tags: tagsArr,
      production_resources: resources,
    });
    if (result) { resetItemForm(); } else alert('Ошибка обновления предмета');
    setSavingItem(false);
  };

  return (
    <div className="fixed inset-0 z-[600] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15">
        <button onClick={onBack} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f]">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>
        <h2 className="text-sm font-black uppercase text-[#d6ff9f]">{category.icon} {category.name}</h2>
        <div className="flex gap-2">
          <button onClick={() => onEdit(category)} className="p-2 rounded-lg bg-white/5">✏️</button>
          <button onClick={onDelete} className="p-2 rounded-lg bg-red-900/30 text-red-400"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      <div className="flex gap-1 px-4 py-2 border-b border-white/10 overflow-x-auto">
        {['properties', 'effects', 'actions', 'tags', 'items', 'preview'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1 rounded-lg text-xs font-black whitespace-nowrap ${activeTab === t ? 'bg-[#7eff69]/20 text-[#7eff69]' : 'text-slate-400'}`}>
            {t === 'properties' ? 'Свойства' : t === 'effects' ? 'Эффекты' : t === 'actions' ? 'Действия' : t === 'tags' ? 'Теги' : t === 'items' ? 'Предметы' : 'Превью'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'properties' && (
          <div className="space-y-2">
            {inherited.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span className="text-xs">{p.name}</span>
                <span className="text-[10px] text-slate-400">← {p.inheritedFrom}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <select value={newPropId} onChange={e => setNewPropId(e.target.value)} className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs">
                <option value="">Выберите свойство...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="px-3 py-2 rounded-xl bg-green-600 text-xs font-black">+</button>
            </div>
          </div>
        )}
                {activeTab === 'items' && (
          <div>
            {showItemForm && (
              <div className="p-4 rounded-2xl border border-yellow-500/20 bg-[#1a1a0a]/80 mb-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-black text-yellow-400">{editingItem ? 'Редактировать' : 'Новый предмет'}</p>
                  <button onClick={resetItemForm} className="p-1"><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Название" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                <input value={itemKey} onChange={e => setItemKey(e.target.value)} placeholder="ID (burger, phone, etc)" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                <input value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="Описание" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                <div className="flex gap-2 items-center">
                  <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center overflow-hidden shrink-0">
                    {itemIconPreview ? (
                      <img src={itemIconPreview} className="w-8 h-8 object-contain" />
                    ) : isImageIcon(itemIcon) ? (
                      <img src={itemIcon} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-xl">{itemIcon || '📦'}</span>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleItemIconUpload} className="hidden" />
                  <input value={itemIcon} onChange={e => setItemIcon(e.target.value)} placeholder="Иконка (эмодзи или путь)" className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 active:scale-90" title="Рекомендуемый размер: 64×64 или 128×128 px">
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={itemStackable} onChange={e => setItemStackable(e.target.checked)} /> Стопка
                  </label>
                  {itemStackable && <input type="number" value={itemMaxStack} onChange={e => setItemMaxStack(Number(e.target.value))} placeholder="Max" className="w-20 bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-xs" />}
                </div>

                {inhProps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Свойства (наследуется от категории)</p>
                    {inhProps.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2">
                        <span className="text-xs">{p.name} {p.isRequired && <span className="text-red-400">*</span>}</span>
                        <input type="text" value={itemProperties[p.id] || ''} onChange={e => setItemProperties(prev => ({ ...prev, [p.id]: e.target.value }))} className="w-24 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-center" />
                      </div>
                    ))}
                  </div>
                )}

                {inhEffects.allowed && inhEffects.allowed.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Эффекты</p>
                    {inhEffects.allowed.map((e, i) => (
                      <div key={i} className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2">
                        <span className="text-xs">{e.name}</span>
                        <input type="number" value={itemEffects[e.id] || 0} onChange={ev => setItemEffects(prev => ({ ...prev, [e.id]: Number(ev.target.value) }))} className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-center" />
                      </div>
                    ))}
                  </div>
                )}

                {inhTags.automatic && inhTags.automatic.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Автотеги (из категории)</p>
                    <div className="flex gap-1 flex-wrap mb-2">
                      {inhTags.automatic.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-purple-900/30">{t.value || t.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                <input value={itemTags} onChange={e => setItemTags(e.target.value)} placeholder="Доп. теги (через запятую)" className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Ресурсы для производства</p>
                  <div className="grid grid-cols-2 gap-2">
                    {resourceKeys.map(key => {
                      const res = RESOURCE_TYPES[key];
                      const qty = itemResources[key] || 0;
                      return (
                        <div key={key} className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2">
                          <span className="text-sm">{res.icon}</span>
                          <span className="text-[10px] text-slate-400 flex-1">{res.name}</span>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={e => setItemResources(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                            className="w-16 bg-black/50 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-center"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button onClick={editingItem ? handleUpdateItem : handleCreateItem} disabled={savingItem} className="w-full py-3 rounded-xl bg-green-600 font-black text-sm flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" /> {editingItem ? 'Обновить' : 'Создать'}
                </button>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="� Поиск предметов..." className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm" />
              <button onClick={openNewItem} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-600 text-xs font-black whitespace-nowrap">
                <Plus className="h-3 w-3" /> Добавить
              </button>
            </div>

            <div className="space-y-2">
              {filteredItems.map(item => (
                <div key={item.id} className="p-4 rounded-2xl border border-[#7eff67]/10 bg-[#0b1b0d]/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {itemImgErrors[item.id] ? (
                        <span className="text-xl">📦</span>
                      ) : isImageIcon(item.icon) ? (
                        <img src={item.icon} onError={() => setItemImgErrors(prev => ({ ...prev, [item.id]: true }))} className="w-8 h-8 object-contain rounded" />
                      ) : (
                        <span className="text-xl">{item.icon || '📦'}</span>
                      )}
                      <div>
                        <p className="font-black text-[#d6ff9f]">{item.name}</p>
                        <p className="text-[10px] text-slate-400">ID: {item.item_key}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditItem(item)} className="p-2 rounded-lg bg-white/5">✏️</button>
                      <button onClick={() => { if (confirm('Удалить предмет?')) deleteItem(item.id); }} className="p-2 rounded-lg bg-red-900/30 text-red-400"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  {inhTags.automatic && inhTags.automatic.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {inhTags.automatic.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-purple-900/30">{t.value || t.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filteredItems.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Нет предметов</p>}
            </div>
          </div>
        )}
        {activeTab === 'preview' && (
          <div className="p-4 rounded-2xl border border-[#7eff69]/20 bg-[#0b1b0d]/80">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{category.icon}</span>
              <div>
                <p className="font-black text-lg text-[#d6ff9f]">{category.name}</p>
                <p className="text-[10px] text-slate-400">ID: {category.key}</p>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Свойства</p>
            {inherited.map((p, i) => <p key={i} className="text-xs">• {p.name}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}

function AllItemsView({ items, categories, onClose }) {
  const { deleteItem } = useItemCategoryStore();
  const [itemSearch, setItemSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const filtered = items.filter(item => {
    const matchSearch = !itemSearch ||
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.item_key?.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(itemSearch.toLowerCase());
    const matchCat = !filterCategory || item.category_id === Number(filterCategory);
    return matchSearch && matchCat;
  });

  const getCategoryName = (catId) => {
    const cat = categories.find(c => c.id === Number(catId));
    return cat ? `${cat.icon || '�'} ${cat.name}` : 'Без категории';
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={itemSearch}
          onChange={e => setItemSearch(e.target.value)}
          placeholder="� Поиск по названию, ID, описанию..."
          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Все категории</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-2 text-xs text-slate-400">Всего: {items.length} • Показано: {filtered.length}</div>

      {filtered.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-8">
          {items.length === 0 ? 'Нет предметов. Выполните migrate_items_to_db.sql или создайте предмет вручную' : 'Ничего не найдено'}
        </p>
      )}

      <div className="space-y-2">
        {filtered.map(item => (
          <ItemRow key={item.id} item={item} getCategoryName={getCategoryName} deleteItem={deleteItem} categories={categories} />
        ))}
      </div>
    </div>
  );
}

function ItemRow({ item, getCategoryName, deleteItem, categories: _categories }) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  return (
    <div className="rounded-2xl border border-[#7eff67]/10 bg-[#0b1b0d]/80 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-3">
          {imgError ? (
            <span className="text-2xl">📦</span>
          ) : isImageIcon(item.icon) ? (
            <img src={item.icon} onError={() => setImgError(true)} className="w-8 h-8 object-contain rounded" />
          ) : (
            <span className="text-2xl">{item.icon || '📦'}</span>
          )}
          <div>
            <p className="font-black text-sm text-[#d6ff9f]">{item.name}</p>
            <p className="text-[10px] text-slate-400">ID: {item.item_key} • {getCategoryName(item.category_id)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? '▼' : '▶'}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/5">
          {item.description && <p className="text-xs text-slate-300 mt-2">{item.description}</p>}
          <div className="flex gap-4 text-[10px] text-slate-400">
            <span>Стопка: {item.stackable ? `до ${item.max_stack}` : 'Нет'}</span>
          </div>
          {item.properties && Object.keys(item.properties).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Свойства</p>
              {Object.entries(item.properties).map(([k, v]) => (
                <span key={k} className="inline-block mr-2 mb-1 text-[10px] px-2 py-1 rounded bg-white/5">{k}: {v}</span>
              ))}
            </div>
          )}
          {item.effects && item.effects.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Эффекты</p>
              {item.effects.map((e, i) => (
                <span key={i} className="inline-block mr-2 mb-1 text-[10px] px-2 py-1 rounded bg-white/5">{e.effect_key || e.key}: {e.value}</span>
              ))}
            </div>
          )}
          {item.tags && item.tags.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Теги</p>
              {item.tags.map((t, i) => (
                <span key={i} className="inline-block mr-1 mb-1 text-[10px] px-2 py-1 rounded-lg bg-purple-900/30">{t}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => { if (confirm('Удалить предмет?')) deleteItem(item.id); }} className="px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 text-xs font-black">Удалить</button>
          </div>
        </div>
      )}
    </div>
  );
}