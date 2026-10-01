import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, Trash2, Plus, Save, Upload, Check, AlertCircle, ChevronLeft, ChevronRight,
  Layers, Package, Sparkles, Eye,
} from 'lucide-react';
import {
  useItemCategoryStore,
  type Item,
  type ItemRarity,
  RARITY_CONFIG,
} from '../../stores/useItemCategoryStore';
import { isImageIcon } from '../../utils/iconHelper';
import { getEffectDef, DEFAULT_BUFF_MINUTES, EFFECTS_BY_KIND } from '../items/data/itemEffects';
import { RESOURCE_TYPES } from '../businesses/data/businessConfig';

const REPLACEMENT_CHAR = '\uFFFD';
const FALLBACK_ICON = '\u{1F4E6}';
const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

interface ItemCatalogProps {
  onClose: () => void;
}

type WizardStep = 0 | 1 | 2 | 3;

const WIZARD_STEPS: Array<{ label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { label: 'Категория', icon: Layers },
  { label: 'Основное', icon: Package },
  { label: 'Игровые данные', icon: Sparkles },
  { label: 'Проверка', icon: Eye },
];

function getDisplayIcon(icon?: string | null): string | null {
  if (!icon) return null;
  const trimmed = icon.trim();
  if (!trimmed || trimmed.includes(REPLACEMENT_CHAR)) return null;
  return icon;
}

const ItemIcon: React.FC<{ icon?: string | null; className?: string }> = ({ icon, className = 'text-2xl' }) => {
  const [broken, setBroken] = useState(false);
  const display = getDisplayIcon(icon);
  if (!display || broken) return <span className={className}>{FALLBACK_ICON}</span>;
  if (isImageIcon(display)) {
    return (
      <img
        src={display}
        onError={() => setBroken(true)}
        alt=""
        className="w-8 h-8 object-contain rounded bg-black/30"
      />
    );
  }
  return <span className={className}>{display}</span>;
};

function getItemRarity(item: Item): ItemRarity {
  const raw = item.rarity || (item.properties?.rarity as ItemRarity | undefined) || 'common';
  return RARITY_CONFIG[raw] ? raw : 'common';
}

function slugify(value: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya',
  };
  return value
    .toLowerCase()
    .split('')
    .map(ch => (map[ch] !== undefined ? map[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function sanitizeTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  raw.split(',').forEach(part => {
    const tag = slugify(part);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  });
  return out;
}

const ItemCatalog: React.FC<ItemCatalogProps> = ({ onClose }) => {
  const { items, categories, loading, loadAll, deleteItem } = useItemCategoryStore();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterRarity, setFilterRarity] = useState<ItemRarity | 'all'>('all');
  const [showNewItem, setShowNewItem] = useState(false);

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNewItem) setShowNewItem(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, showNewItem]);

  const filtered = (items || []).filter(item => {
    const term = search.trim().toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags.join(',') : '';
    const matchSearch = !term
      || (item.name || '').toLowerCase().includes(term)
      || (item.item_key || '').toLowerCase().includes(term)
      || (item.description || '').toLowerCase().includes(term)
      || tags.toLowerCase().includes(term);
    const matchCat = !filterCategory || String(item.category_id) === String(filterCategory);
    const matchRarity = filterRarity === 'all' || getItemRarity(item) === filterRarity;
    return matchSearch && matchCat && matchRarity;
  });

  const getCategoryName = (catId?: string | number | null): string => {
    if (catId == null) return 'Без категории';
    const cat = categories.find(c => String(c.id) === String(catId));
    return cat ? `${getDisplayIcon(cat.icon) || '\u{1F4C2}'} ${cat.name}` : 'Без категории';
  };

  const hasFilters = !!search || !!filterCategory || filterRarity !== 'all';
  const resetFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterRarity('all');
  };

  return (
    <div className="fixed inset-0 z-[700] bg-[#020617]/95 backdrop-blur-xl flex flex-col text-white">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#7eff67]/15 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[#d6ff9f] font-black uppercase text-sm truncate">Все предметы</p>
          <span className="text-[10px] text-slate-500 font-black shrink-0">({filtered.length})</span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 hover:bg-white/10 shrink-0"
            >
              Сброс
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowNewItem(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-[11px] font-black uppercase shadow-lg shadow-green-900/40"
          >
            <Plus className="w-4 h-4" /> Новый предмет
          </button>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 shrink-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, ID, описанию, тегам..."
            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 pl-10 text-sm focus:outline-none focus:border-[#7eff67]/40"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Все категории</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterRarity}
            onChange={e => setFilterRarity(e.target.value as ItemRarity | 'all')}
            className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <option value="all">Вся редкость</option>
            {(Object.keys(RARITY_CONFIG) as ItemRarity[]).map(r => (
              <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
        {loading && items.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">Загрузка предметов...</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">В базе пока нет предметов</p>
        )}
        {!loading && filtered.length === 0 && items.length > 0 && (
          <p className="text-center text-slate-400 text-sm py-8">Ничего не найдено</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              getCategoryName={getCategoryName}
              onDelete={deleteItem}
            />
          ))}
        </div>
      </div>

      {showNewItem && <NewItemWizard onClose={() => setShowNewItem(false)} />}
    </div>
  );
};

interface ItemCardProps {
  item: Item;
  getCategoryName: (catId?: string | number | null) => string;
  onDelete: (id: string | number) => Promise<boolean>;
}

function ItemCard({ item, getCategoryName, onDelete }: ItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rarity = getItemRarity(item);
  const cfg = RARITY_CONFIG[rarity];

  const effects = Array.isArray(item.effects) ? item.effects : [];
  const properties = (item.properties && typeof item.properties === 'object') ? item.properties : {};
  const resources = item.production_resources || {};
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const propertyEntries = Object.entries(properties).filter(([k]) => k !== 'rarity' && k !== 'base_cost');

  return (
    <div className={`rounded-2xl border overflow-hidden bg-[#0b1b0d]/80 ${cfg.border}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left"
      >
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${cfg.border} ${cfg.bg}`}>
          <ItemIcon icon={item.icon} className="text-2xl" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-[12px] text-[#d6ff9f] truncate">{item.name}</p>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono truncate">{item.item_key || 'без id'}</p>
          <p className="text-[10px] text-slate-500 truncate">{getCategoryName(item.category_id)}</p>
        </div>
        <span className="text-slate-500 text-xs shrink-0">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-white/5 text-[11px] text-slate-300">
          {item.description && <p className="text-slate-300 leading-snug">{item.description}</p>}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
            <span>Стопка: {item.stackable ? `до ${item.max_stack ?? 1}` : 'нет'}</span>
            {item.price != null && <span>Цена: {Number(item.price)}</span>}
            {item.sell_price != null && <span>Продажа: {Number(item.sell_price)}</span>}
            {item.max_stack != null && !item.stackable && <span>В слоте: 1</span>}
          </div>

          {propertyEntries.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Свойства</p>
              <div className="flex flex-wrap gap-1">
                {propertyEntries.map(([k, v]) => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 break-all">
                    {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {effects.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Эффекты</p>
              <div className="flex flex-wrap gap-1">
                {effects.map((e, i) => {
                  const rec = e as Record<string, unknown>;
                  const key = String(rec.effect_key ?? rec.key ?? '?');
                  const value = rec.value ?? 0;
                  const duration = rec.duration_minutes;
                  const def = getEffectDef(key);
                  const isPercent = def.percent;
                  return (
                    <span key={`${key}-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300">
                      {def.icon} {def.name}{isPercent ? ` +${String(value)}%` : ` +${String(value)}`}{duration ? ` (${String(duration)} мин)` : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Теги</p>
              <div className="flex flex-wrap gap-1">
                {tags.map((t, i) => (
                  <span key={`${t}-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300">{t}</span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(resources).length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Производство</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(resources).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">
                    {RESOURCE_TYPES[k] ? `${RESOURCE_TYPES[k].icon} ${RESOURCE_TYPES[k].name}` : k}: {Number(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (window.confirm(`Удалить предмет «${item.name}»?`)) onDelete(item.id);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-[10px] font-black"
          >
            <Trash2 className="w-3 h-3" /> Удалить
          </button>
        </div>
      )}
    </div>
  );
}

interface NewItemWizardProps {
  onClose: () => void;
}

function NewItemWizard({ onClose }: NewItemWizardProps) {
  const {
    items, categories, properties, categoryProperties,
    loadCategoryLinksFor, createItem,
    getInheritedProperties, getInheritedEffects, getInheritedActions, getInheritedTags,
  } = useItemCategoryStore();

  const [step, setStep] = useState<WizardStep>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [itemKey, setItemKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(FALLBACK_ICON);
  const [isActive, setIsActive] = useState(true);

  const [stackable, setStackable] = useState(true);
  const [maxStack, setMaxStack] = useState(1);
  const [price, setPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [rarity, setRarity] = useState<ItemRarity>('common');
  const [baseCost, setBaseCost] = useState(0);
  const [weight, setWeight] = useState(0);
  const [action, setAction] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [propValues, setPropValues] = useState<Record<string, string>>({});
  const [effectValues, setEffectValues] = useState<Record<string, number>>({});
  const [effectDurations, setEffectDurations] = useState<Record<string, number>>({});
  const [effectPickerOpen, setEffectPickerOpen] = useState(false);
  const [resourceValues, setResourceValues] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!categoryId) return;
    loadCategoryLinksFor(categoryId).catch(() => {});
  }, [categoryId, loadCategoryLinksFor]);

  useEffect(() => {
    if (!name.trim() || keyTouched) return;
    setItemKey(slugify(name));
  }, [name, keyTouched]);

  const selectedCategory = categories.find(c => String(c.id) === String(categoryId)) || null;

  const inhProps = categoryId ? getInheritedProperties(categoryId) : [];
  const inhEffects = categoryId ? getInheritedEffects(categoryId) : { allowed: [], denied: [] };
  const inhActions = categoryId ? getInheritedActions(categoryId) : [];
  const inhTags = categoryId ? getInheritedTags(categoryId) : { automatic: [], recommended: [] };

  const selectedEffectKeys = Object.keys(effectValues).filter(k => effectValues[k] !== 0 || k in effectValues);

  const addEffect = (key: string) => {
    setEffectValues(prev => (key in prev ? prev : { ...prev, [key]: 0 }));
    setEffectDurations(prev => (key in prev ? prev : { ...prev, [key]: DEFAULT_BUFF_MINUTES }));
  };

  const removeEffect = (key: string) => {
    setEffectValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEffectDurations(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    if (!categoryId) return;
    const nextProps: Record<string, string> = {};
    getInheritedProperties(categoryId).forEach(p => {
      const def = p.defaultValue;
      nextProps[p.key] = def === null || def === undefined ? '' : String(def);
    });
    setPropValues(nextProps);
    setEffectValues({});
    setEffectDurations({});
  }, [categoryId, getInheritedProperties, properties, categories, categoryProperties]);

  const duplicate = hasDuplicateKey(items, itemKey);

  const stepValid = (target: WizardStep): string => {
    if (target === 0) {
      if (!categoryId) return 'Выберите категорию';
      return '';
    }
    if (target === 1) {
      if (!name.trim()) return 'Введите название предмета';
      if (!itemKey.trim()) return 'Введите ID предмета';
      if (!KEY_PATTERN.test(itemKey)) return 'ID: только латиница в нижнем регистре, цифры, дефис и подчёркивание';
      if (duplicate) return `Предмет с ID «${itemKey}» уже существует`;
      if (!getDisplayIcon(icon)) return 'Иконка содержит недопустимый символ';
      return '';
    }
    if (target === 2) {
      if (stackable && maxStack < 1) return 'Максимальный размер стопки должен быть не меньше 1';
      if (price < 0 || sellPrice < 0 || baseCost < 0) return 'Цены не могут быть отрицательными';
      for (const p of inhProps) {
        if (p.isRequired && !String(propValues[p.key] ?? '').trim()) {
          return `Заполните обязательное свойство «${p.name}»`;
        }
      }
      return '';
    }
    return '';
  };

  const goNext = () => {
    const message = stepValid(step);
    if (message) { setError(message); return; }
    setError('');
    setStep(s => Math.min(3, s + 1) as WizardStep);
  };

  const goBack = () => {
    setError('');
    setStep(s => Math.max(0, s - 1) as WizardStep);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Иконка должна быть изображением'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) setIcon(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const finalTags = (): string[] => {
    const auto = inhTags.automatic.map(t => t.key);
    const manual = sanitizeTags(tagsInput);
    const seen = new Set<string>();
    return [...auto, ...manual].filter(tag => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
  };

  const buildPayload = () => {
    const mergedProperties: Record<string, unknown> = {};
    inhProps.forEach(p => {
      const raw = String(propValues[p.key] ?? '').trim();
      if (raw === '') return;
      mergedProperties[p.key] = p.type === 'number' ? Number(raw) : raw;
    });
    if (weight > 0) mergedProperties.weight = weight;
    if (action) mergedProperties.action = action;
    mergedProperties.rarity = rarity;
    mergedProperties.base_cost = baseCost;

    const mergedEffects = Object.entries(effectValues)
      .filter(([, v]) => Number.isFinite(v))
      .map(([effect_key, value]) => {
        const kind = getEffectDef(effect_key).kind;
        const duration = Number(effectDurations[effect_key]) || 0;
        return (kind === 'buff' || kind === 'modifier') && duration > 0
          ? { effect_key, value, duration_minutes: duration }
          : { effect_key, value };
      });

    const resources: Record<string, number> = {};
    Object.entries(resourceValues).forEach(([k, v]) => {
      const num = Math.max(0, Number(v) || 0);
      if (num > 0) resources[k] = num;
    });

    return {
      item_key: itemKey.trim(),
      name: name.trim(),
      description: description.trim(),
      icon,
      category_id: selectedCategory ? selectedCategory.id : categoryId,
      is_active: isActive,
      price,
      sell_price: sellPrice,
      stackable,
      max_stack: stackable ? Math.max(1, maxStack) : 1,
      properties: mergedProperties,
      effects: mergedEffects,
      tags: finalTags(),
      production_resources: resources,
    };
  };

  const handleSave = async () => {
    for (const s of [0, 1, 2] as WizardStep[]) {
      const message = stepValid(s);
      if (message) { setError(message); setStep(s); return; }
    }
    setSaving(true);
    setError('');
    try {
      const result = await createItem(buildPayload());
      if (!result) {
        setError('Не удалось сохранить предмет. Проверьте уникальность ID и попробуйте снова.');
        setSaving(false);
        return;
      }
      setSaving(false);
      onClose();
    } catch {
      setError('Ошибка сети при сохранении предмета');
      setSaving(false);
    }
  };

  const payloadPreview = buildPayload();

  return (
    <div className="fixed inset-0 z-[720] bg-[#020617]/99 backdrop-blur-xl flex flex-col text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#7eff67]/15 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[#d6ff9f] font-black uppercase text-sm truncate">Новый предмет</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-300 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-1.5 px-4 py-2.5 border-b border-white/10 overflow-x-auto shrink-0 no-scrollbar">
        {WIZARD_STEPS.map((s, i) => {
          const active = step === i;
          const done = step > i;
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => { if (i < step) { setStep(i as WizardStep); setError(''); } }}
              disabled={i > step}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap shrink-0 transition-colors ${
                active ? 'bg-[#7eff69]/20 text-[#7eff69] border border-[#7eff69]/40'
                  : done ? 'text-emerald-600 hover:bg-white/5'
                  : 'text-slate-600'
              }`}
            >
              {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              {i + 1}. {s.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {step === 0 && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Шаг 1 — категория</p>
            <p className="text-xs text-slate-400">
              Категория определяет доступные свойства, эффекты, действия и автотеги. Выберите ту, к которой относится предмет.
            </p>
            {categories.length === 0 && (
              <p className="text-xs text-amber-400">Категории не загружены. Обновите страницу.</p>
            )}
            <div className="space-y-1.5">
              {categories.map(c => {
                const active = String(c.id) === String(categoryId);
                return (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryId(String(c.id)); setError(''); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      active ? 'border-[#7eff69]/50 bg-[#7eff69]/10' : 'border-white/10 bg-black/40 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-2xl">{getDisplayIcon(c.icon) || '\u{1F4C2}'}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-black text-[#d6ff9f] text-sm">{c.name}</span>
                      <span className="block text-[10px] text-slate-500 font-mono">{c.key}</span>
                    </span>
                    {active && <Check className="w-4 h-4 text-[#7eff69] shrink-0" />}
                  </button>
                );
              })}
            </div>
            {selectedCategory && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-300 space-y-1">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Будет применено от категории</p>
                <p>Свойства: {inhProps.length ? inhProps.map(p => p.name).join(', ') : 'нет'}</p>
                <p>Эффекты: {inhEffects.allowed.length ? inhEffects.allowed.map(e => e.name).join(', ') : 'нет'}</p>
                <p>Действия: {inhActions.length ? inhActions.map(a => a.name).join(', ') : 'нет'}</p>
                <p>Автотеги: {inhTags.automatic.length ? inhTags.automatic.map(t => t.key).join(', ') : 'нет'}</p>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Шаг 2 — основное</p>

            <label className="block">
              <span className="text-[10px] text-slate-400 uppercase">Название *</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например: Апельсиновый сок"
                className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#7eff67]/40"
              />
            </label>

            <label className="block">
              <span className="text-[10px] text-slate-400 uppercase">ID (item_key) *</span>
              <input
                value={itemKey}
                onChange={e => { setItemKey(e.target.value.toLowerCase()); setKeyTouched(true); }}
                placeholder="orange_juice"
                className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#7eff67]/40"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Латиница в нижнем регистре, цифры, дефис и подчёркивание. Используется в инвентаре и рецептах.
              </span>
              {duplicate && <span className="text-[10px] text-red-400 block mt-0.5">Такой ID уже занят</span>}
            </label>

            <label className="block">
              <span className="text-[10px] text-slate-400 uppercase">Описание</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Что это и как используется"
                className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#7eff67]/40 resize-y"
              />
            </label>

            <div>
              <span className="text-[10px] text-slate-400 uppercase">Иконка</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center shrink-0 overflow-hidden">
                  <ItemIcon icon={icon} className="text-2xl" />
                </div>
                <input
                  value={icon.startsWith('data:image') ? '' : icon}
                  onChange={e => setIcon(e.target.value)}
                  placeholder="Эмодзи или путь к файлу"
                  className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#7eff67]/40"
                />
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 shrink-0"
                  title="Загрузить изображение"
                >
                  <Upload className="w-4 h-4" />
                </button>
                {icon.startsWith('data:image') && (
                  <button
                    type="button"
                    onClick={() => setIcon(FALLBACK_ICON)}
                    className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 shrink-0"
                    title="Убрать изображение"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Рекомендуемый размер: 64x64 или 128x128 px</p>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Активен (доступен в игре)
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Шаг 3 — игровые данные</p>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={stackable} onChange={e => setStackable(e.target.checked)} />
                  Стопка
                </label>
                <div className="flex-1 flex items-center justify-end gap-2">
                  <span className="text-[10px] text-slate-400">Макс. в стопке</span>
                  <input
                    type="number"
                    min={1}
                    value={maxStack}
                    disabled={!stackable}
                    onChange={e => setMaxStack(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-center disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] text-slate-400 uppercase">Цена продажи</span>
                <input
                  type="number" min={0} value={price}
                  onChange={e => setPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-400 uppercase">Закупочная цена</span>
                <input
                  type="number" min={0} value={sellPrice}
                  onChange={e => setSellPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase">Редкость</span>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {(Object.keys(RARITY_CONFIG) as ItemRarity[]).map(r => {
                  const cfg = RARITY_CONFIG[r];
                  const active = rarity === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRarity(r)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-colors ${
                        active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-black/50 border border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] text-slate-400 uppercase">Себестоимость</span>
                <input
                  type="number" min={0} value={baseCost}
                  onChange={e => setBaseCost(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-400 uppercase">Вес, кг</span>
                <input
                  type="number" min={0} step="0.01" value={weight}
                  onChange={e => setWeight(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            {inhProps.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 uppercase">
                  Свойства категории {inhProps.length ? '' : ''}
                </p>
                {inhProps.map(p => (
                  <div key={String(p.id)} className="flex items-center gap-3 bg-black/30 rounded-xl px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-slate-200">
                        {p.name}{p.isRequired && <span className="text-red-400 ml-1">*</span>}
                      </span>
                      <span className="block text-[9px] text-slate-500">из «{p.inheritedFrom}»</span>
                    </div>
                    <input
                      type={p.type === 'number' ? 'number' : 'text'}
                      value={propValues[p.key] ?? ''}
                      placeholder={p.type === 'number' ? '0' : 'значение'}
                      onChange={e => setPropValues(prev => ({ ...prev, [p.key]: e.target.value }))}
                      className="w-28 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-center shrink-0"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400 uppercase">Эффекты и бонусы</p>
                {inhEffects.allowed.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEffectPickerOpen(o => !o)}
                    className="text-[10px] text-[#7eff67] hover:underline"
                  >
                    {effectPickerOpen ? 'Скрыть список' : `Все эффекты (${EFFECTS_BY_KIND.reduce((n, g) => n + g.defs.length, 0)})`}
                  </button>
                )}
              </div>

              {inhEffects.allowed.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {inhEffects.allowed.map(e => {
                    const def = getEffectDef(e.key);
                    return (
                      <button
                        key={String(e.id)}
                        type="button"
                        onClick={() => addEffect(e.key)}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                          effectValues[e.key] !== undefined
                            ? 'border-[#7eff67]/60 bg-emerald-900/40 text-emerald-200'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-[#7eff67]/40'
                        }`}
                        title={def.description || e.name}
                      >
                        {def.icon} {e.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {(effectPickerOpen || inhEffects.allowed.length === 0) && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {EFFECTS_BY_KIND.map(group => (
                    <div key={group.kind} className="space-y-1.5">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">
                        {group.icon} {group.name}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {group.defs.map(def => {
                          const denied = inhEffects.denied.some(d => d.key === def.key);
                          const on = effectValues[def.key] !== undefined;
                          return (
                            <button
                              key={def.key}
                              type="button"
                              disabled={denied}
                              onClick={() => (on ? removeEffect(def.key) : addEffect(def.key))}
                              title={denied ? `Запрещён категорией «${inhEffects.denied.find(d => d.key === def.key)?.inheritedFrom}»` : (def.description || def.name)}
                              className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                                denied
                                  ? 'border-red-900/40 bg-red-950/20 text-red-400/60 cursor-not-allowed'
                                  : on
                                    ? 'border-[#7eff67]/60 bg-emerald-900/40 text-emerald-200'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-[#7eff67]/40'
                              }`}
                            >
                              {def.icon} {def.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedEffectKeys.length > 0 && (
                <div className="space-y-2">
                  {selectedEffectKeys.map(k => {
                    const def = getEffectDef(k);
                    const timed = def.kind === 'buff' || def.kind === 'modifier';
                    return (
                      <div key={k} className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-200">{def.icon} {def.name}</span>
                          <span className="block text-[9px] text-slate-500 font-mono">{k}</span>
                        </div>
                        {timed && (
                          <input
                            type="number"
                            min={1}
                            value={effectDurations[k] ?? ''}
                            placeholder="мин"
                            title="Длительность в минутах"
                            onChange={ev => setEffectDurations(prev => ({ ...prev, [k]: Number(ev.target.value) || 0 }))}
                            className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-center shrink-0"
                          />
                        )}
                        <input
                          type="number"
                          value={effectValues[k] ?? ''}
                          placeholder="0"
                          onChange={ev => setEffectValues(prev => ({ ...prev, [k]: Number(ev.target.value) || 0 }))}
                          className="w-24 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-center shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => removeEffect(k)}
                          title="Убрать эффект"
                          className="p-1.5 rounded-lg bg-red-900/30 text-red-400 shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {inhActions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 uppercase">Действия</p>
                <select
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">Без действия</option>
                  {inhActions.map(a => (
                    <option key={String(a.id)} value={a.key}>{a.name} ({a.key})</option>
                  ))}
                </select>
                {action && (
                  <p className="text-[10px] text-amber-400">
                    Действие «{action}» будет записано в свойства предмета.
                  </p>
                )}
              </div>
            )}

            <label className="block">
              <span className="text-[10px] text-slate-400 uppercase">
                Дополнительные теги
              </span>
              <input
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="через запятую: fast_food, healthy"
                className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#7eff67]/40"
              />
              {inhTags.automatic.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[9px] text-slate-500">Авто:</span>
                  {inhTags.automatic.map(t => (
                    <span key={String(t.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300">{t.key}</span>
                  ))}
                </div>
              )}
              {inhTags.recommended.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[9px] text-slate-500">Рекомендуемые:</span>
                  {inhTags.recommended.map(t => (
                    <span key={String(t.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{t.key}</span>
                  ))}
                </div>
              )}
            </label>

            <div>
              <p className="text-[10px] text-slate-400 uppercase mb-1">Ресурсы для производства</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(RESOURCE_TYPES).map(([key, res]) => (
                  <div key={key} className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2">
                    <span className="text-sm">{res.icon}</span>
                    <span className="text-[10px] text-slate-400 flex-1">{res.name}</span>
                    <input
                      type="number" min={0} value={resourceValues[key] ?? 0}
                      onChange={e => setResourceValues(prev => ({ ...prev, [key]: Math.max(0, Number(e.target.value) || 0) }))}
                      className="w-16 bg-black/50 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Шаг 4 — проверка</p>
            <div className="p-3 rounded-2xl border border-[#7eff67]/20 bg-[#0b1b0d]/80 flex gap-3">
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shrink-0 ${RARITY_CONFIG[rarity].border} ${RARITY_CONFIG[rarity].bg}`}>
                <ItemIcon icon={icon} className="text-3xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-[#d6ff9f]">{name || 'Без названия'}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${RARITY_CONFIG[rarity].color} ${RARITY_CONFIG[rarity].bg} ${RARITY_CONFIG[rarity].border}`}>
                    {RARITY_CONFIG[rarity].label}
                  </span>
                  {!isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400">выключен</span>}
                </div>
                <p className="text-[10px] font-mono text-slate-400">{itemKey}</p>
                <p className="text-[10px] text-slate-500">{selectedCategory ? selectedCategory.name : 'Без категории'}</p>
                {description && <p className="text-[11px] text-slate-300 mt-1.5">{description}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <p className="text-[9px] uppercase text-slate-500">Стопка</p>
                <p className="text-slate-200">{stackable ? `до ${payloadPreview.max_stack}` : 'нет'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                <p className="text-[9px] uppercase text-slate-500">Цены</p>
                <p className="text-slate-200">Прод. {price} / Закуп. {sellPrice}</p>
              </div>
            </div>

            {Object.keys(payloadPreview.properties).filter(k => k !== 'rarity' && k !== 'base_cost').length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Свойства</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(payloadPreview.properties)
                    .filter(([k]) => k !== 'rarity' && k !== 'base_cost')
                    .map(([k, v]) => (
                      <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">{k}: {String(v)}</span>
                    ))}
                </div>
              </div>
            )}

            {payloadPreview.effects.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Эффекты</p>
                <div className="flex flex-wrap gap-1">
                  {payloadPreview.effects.map((e, i) => {
                    const def = getEffectDef(e.effect_key);
                    return (
                      <span key={`${e.effect_key}-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300">
                        {def.icon} {def.name}{def.percent ? ` +${e.value}%` : ` +${e.value}`}
                        {e.duration_minutes ? ` (${e.duration_minutes} мин)` : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {payloadPreview.tags.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Теги</p>
                <div className="flex flex-wrap gap-1">
                  {payloadPreview.tags.map((t, i) => (
                    <span key={`${t}-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(payloadPreview.production_resources).length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Производство</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(payloadPreview.production_resources).map(([k, v]) => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">
                      {RESOURCE_TYPES[k] ? `${RESOURCE_TYPES[k].icon} ${RESOURCE_TYPES[k].name}` : k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 shrink-0">
        <button
          onClick={step === 0 ? onClose : goBack}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase disabled:opacity-40"
        >
          {step === 0 ? <X className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {step === 0 ? 'Отмена' : 'Назад'}
        </button>
        <div className="flex-1" />
        {step < 3 ? (
          <button
            onClick={goNext}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-[11px] font-black uppercase"
          >
            Далее <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-[11px] font-black uppercase disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Сохранение...' : 'Создать предмет'}
          </button>
        )}
      </div>
    </div>
  );
}

function hasDuplicateKey(items: Item[], key: string): boolean {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return false;
  return items.some(i => (i.item_key || '').toLowerCase() === normalized);
}

export default ItemCatalog;
