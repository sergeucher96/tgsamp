import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronRight, ChevronDown, Check, X, AlertTriangle, Search } from 'lucide-react';
import { BUSINESS_TYPES, RESOURCE_TYPES } from '../businesses/data/businessConfig';
import { FINAL_LOCATIONS } from '../../game/locations/locations';
import { supabase } from '../../services/supabase/client';
import { useItemCategoryStore, type Item as CategoryItemType } from '../../stores/useItemCategoryStore';
import { useBusinessStore, type BusinessProduct } from '../../stores/useBusinessStore';
import { type Location } from '../../stores/useTravelStore';
import { isImageIcon } from '../../utils/iconHelper';

interface BusinessItem {
  id: string;
  type: string;
  typeName: string;
  name: string;
  icon: string;
}

interface BusinessProductsEditorProps {
  onClose: () => void;
}

/** Черновик нового товара: то, что админ задаёт при добавлении */
interface Draft {
  price: number;
  resources: Record<string, number>;
}

const inputCls = 'w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#7eff69]/40';

const FALLBACK_ICON = '\u{1F4E6}';

export default function BusinessProductsEditor({ onClose }: BusinessProductsEditorProps) {
  const { items, categories, loadAll } = useItemCategoryStore();
  const { fetchBusinessProducts, updateBusinessProduct } = useBusinessStore();

  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [savingRow, setSavingRow] = useState<number | null>(null);

  useEffect(() => {
    const typeKeys = Object.keys(BUSINESS_TYPES);
    setBusinesses(
      FINAL_LOCATIONS
        .filter((loc: Location) => typeKeys.includes(loc.type))
        .map((loc: Location) => ({
          id: loc.id,
          type: loc.type,
          typeName: BUSINESS_TYPES[loc.type]?.name || loc.type,
          name: loc.name || loc.id,
          icon: loc.icon || BUSINESS_TYPES[loc.type]?.icon || '\u{1F3E2}',
        })),
    );
    loadAll().catch(() => {});
  }, [loadAll]);

  const refresh = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      setProducts(await fetchBusinessProducts(selectedBusiness));
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, fetchBusinessProducts]);

  useEffect(() => {
    setError('');
    setShowAdd(false);
    setExpandedItemId(null);
    setExpandedRow(null);
    setDrafts({});
    refresh();
  }, [selectedBusiness, refresh]);

  const selectedBiz = businesses.find(b => b.id === selectedBusiness) || null;

  const getCategoryName = (catId?: string | number | null) => {
    if (catId == null) return 'Без категории';
    const cat = categories.find(c => String(c.id) === String(catId));
    return cat ? `${cat.icon || '\u{1F4C2}'} ${cat.name}` : 'Без категории';
  };

  // ---------- Добавление ----------

  const buildDefaultDraft = (itemKey: string): Draft => {
    const item = items.find(i => i.item_key === itemKey);
    const resources: Record<string, number> = {};
    Object.entries(item?.production_resources || {}).forEach(([k, v]) => {
      const num = Number(v);
      if (Number.isFinite(num) && num > 0) resources[k] = num;
    });
    return { price: Number(item?.price) || 0, resources };
  };

  const getDraft = (itemKey: string): Draft => drafts[itemKey] || buildDefaultDraft(itemKey);

  const patchDraft = (itemKey: string, patch: Partial<Draft>) =>
    setDrafts(prev => ({
      ...prev,
      [itemKey]: { ...(prev[itemKey] || buildDefaultDraft(itemKey)), ...patch },
    }));

  const patchDraftResource = (itemKey: string, res: string, qty: number) =>
    setDrafts(prev => {
      const base = prev[itemKey] || buildDefaultDraft(itemKey);
      const next = { ...base.resources };
      if (qty > 0) next[res] = qty;
      else delete next[res];
      return { ...prev, [itemKey]: { ...base, resources: next } };
    });

  const assignedKeys = new Set(products.map(p => p.product_id));

  const availableItems = items.filter(item => {
    if (!item.item_key) return false;
    if (assignedKeys.has(item.item_key)) return false;
    if (filterCategory && String(item.category_id) !== String(filterCategory)) return false;
    if (!itemSearch.trim()) return true;
    const term = itemSearch.trim().toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
    return (
      item.name.toLowerCase().includes(term)
      || item.item_key.toLowerCase().includes(term)
      || (item.description || '').toLowerCase().includes(term)
      || tags.toLowerCase().includes(term)
    );
  });

  const handleAdd = async (item: CategoryItemType) => {
    if (!selectedBusiness || !selectedBiz) return;
    const draft = getDraft(item.item_key);
    setLoading(true);
    setError('');
    try {
      const { error: insErr } = await supabase.from('business_products').insert([{
        business_id: selectedBusiness,
        business_type: selectedBiz.type,
        product_id: item.item_key,
        product_name: item.name,
        icon: item.icon || '',
        price: Math.max(0, Number(draft.price) || 0),
        resources: draft.resources,
        enabled: false,
      }]);
      if (insErr) {
        setError(
          insErr.code === '23505'
            ? 'Такой товар уже есть в списке этого бизнеса'
            : 'Не удалось добавить товар: ' + insErr.message,
        );
        return;
      }
      setExpandedItemId(null);
      await refresh();
    } catch (e: unknown) {
      setError('Ошибка сети: ' + (e instanceof Error ? e.message : 'неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  // ---------- Редактирование ----------

  const handleDelete = async (row: BusinessProduct) => {
    if (!window.confirm(`Убрать «${row.name}» из списка бизнеса?`)) return;
    const { error: delErr } = await supabase.from('business_products').delete().eq('id', row.id);
    if (delErr) {
      setError('Не удалось удалить: ' + delErr.message);
      return;
    }
    await refresh();
  };

  const handleSaveRow = async (row: BusinessProduct, patch: { price?: number; resources?: Record<string, number> }) => {
    setSavingRow(row.id);
    setError('');
    try {
      const ok = await updateBusinessProduct(row.id, patch);
      if (!ok) {
        setError('Не удалось сохранить товар');
        return;
      }
      await refresh();
    } finally {
      setSavingRow(null);
    }
  };

  const renderIcon = (icon: string | null, cacheKey: string) => {
    const src = icon || '';
    if (!src || imgErrors[cacheKey]) return <span className="text-2xl">{FALLBACK_ICON}</span>;
    if (isImageIcon(src)) {
      return (
        <img
          src={src}
          onError={() => setImgErrors(p => ({ ...p, [cacheKey]: true }))}
          className="w-8 h-8 object-contain rounded"
          alt=""
        />
      );
    }
    return <span className="text-2xl">{src}</span>;
  };

  // ====== Список бизнесов ======
  if (!selectedBusiness) {
    return (
      <div className="fixed inset-0 z-[600] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15">
          <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f]">
            <ArrowLeft className="h-4 w-4" /> Назад
          </button>
          <h2 className="text-lg font-black uppercase text-[#d6ff9f]">Товары бизнеса</h2>
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] mb-1">Что бизнес умеет производить</p>
          <p className="text-[10px] text-slate-500 mb-4">
            Здесь настраивается список товаров бизнеса. Продавать из них владелец решает сам — во вкладке «Ассортимент».
          </p>
          <div className="space-y-2">
            {businesses.map(biz => (
              <button
                key={biz.id}
                onClick={() => setSelectedBusiness(biz.id)}
                className="w-full p-4 rounded-2xl border border-[#7eff67]/10 bg-[#0b1b0d]/80 text-left hover:bg-[#0f2412] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{biz.icon}</span>
                  <div className="min-w-0">
                    <p className="font-black text-[#d6ff9f]">{biz.name}</p>
                    <p className="text-[10px] text-[#aef06c]">{biz.typeName} • ID: {biz.id}</p>
                  </div>
                </div>
              </button>
            ))}
            {businesses.length === 0 && <p className="text-slate-500 text-sm">Нет бизнесов</p>}
          </div>
        </div>
      </div>
    );
  }

  const soldCount = products.filter(p => p.enabled).length;

  return (
    <div className="fixed inset-0 z-[600] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white">
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-[#7eff67]/15">
        <button onClick={() => setSelectedBusiness(null)} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f] shrink-0">
          <ArrowLeft className="h-4 w-4" /> Все
        </button>
        <div className="min-w-0 text-center">
          <h2 className="text-sm font-black uppercase text-[#d6ff9f] truncate">{selectedBiz?.name || selectedBusiness}</h2>
          <p className="text-[9px] text-slate-500">{soldCount} из {products.length} продаётся</p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(''); }}
          className="flex items-center gap-1 rounded-full bg-green-600 hover:bg-green-500 px-3 py-2 text-xs font-black shrink-0"
        >
          <Plus className="h-3 w-3" /> Добавить
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-[11px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {showAdd ? (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
              Товары из каталога — нажмите, чтобы добавить
            </p>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  placeholder="Поиск по названию, ID, тегам..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 pl-10 text-sm"
                />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm">
                <option value="">Все категории</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {availableItems.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">
                {items.length === 0 ? 'Каталог пуст — создайте предметы в разделе «Все предметы»' : 'Нет подходящих товаров'}
              </p>
            )}

            <div className="space-y-2">
              {availableItems.map((item: CategoryItemType) => {
                const expanded = expandedItemId === item.item_key;
                const draft = getDraft(item.item_key);
                return (
                  <div key={item.item_key} className="rounded-2xl border border-[#7eff67]/10 bg-[#0b1b0d]/80 overflow-hidden">
                    <button
                      onClick={() => setExpandedItemId(expanded ? null : item.item_key)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderIcon(item.icon, `add-${item.item_key}`)}
                        <div className="min-w-0">
                          <p className="font-black text-sm text-[#d6ff9f] truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.item_key} • {getCategoryName(item.category_id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-green-400">${draft.price}</span>
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                        {item.description && <p className="text-xs text-slate-300 mt-2">{item.description}</p>}

                        <label className="block">
                          <span className="text-[10px] uppercase text-slate-400">Цена продажи ($)</span>
                          <input
                            type="number"
                            min={0}
                            value={draft.price}
                            onChange={e => patchDraft(item.item_key, { price: Math.max(0, Number(e.target.value) || 0) })}
                            className={`${inputCls} mt-1`}
                          />
                        </label>

                        <div>
                          <span className="text-[10px] uppercase text-slate-400">Расход ресурсов на 1 шт.</span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                            {Object.entries(RESOURCE_TYPES).map(([resKey, res]) => (
                              <div key={resKey} className="flex items-center gap-2 bg-black/30 rounded-xl px-2.5 py-1.5">
                                <span className="text-sm">{res.icon}</span>
                                <span className="text-[10px] text-slate-400 flex-1 truncate">{res.name}</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={draft.resources[resKey] ?? 0}
                                  onChange={e => patchDraftResource(item.item_key, resKey, Math.max(0, Number(e.target.value) || 0))}
                                  className="w-14 bg-black/50 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-center"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1">
                            По умолчанию подставлены ресурсы из карточки предмета. 0 = не расходуется.
                          </p>
                        </div>

                        <button
                          onClick={() => handleAdd(item)}
                          disabled={loading}
                          className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 font-black text-xs flex items-center justify-center gap-2"
                        >
                          <Plus className="h-3 w-3" /> Добавить в список бизнеса
                        </button>
                        <p className="text-[9px] text-slate-500 text-center">
                          Товар добавится выключенным — владелец сам включит его в «Ассортименте».
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Список товаров ({products.length})
              </p>
              {loading && <span className="text-[10px] text-slate-500">обновление...</span>}
            </div>

            {products.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">
                Пусто. Нажмите «Добавить», чтобы выбрать товары из каталога.
              </p>
            )}

            <div className="space-y-2">
              {products.map(row => {
                const expanded = expandedRow === row.id;
                const saving = savingRow === row.id;
                return (
                  <div key={row.id} className="rounded-2xl border border-[#7eff67]/10 bg-[#0b1b0d]/80 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      {renderIcon(row.displayIcon, `row-${row.id}`)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-black text-sm text-[#d6ff9f] truncate">{row.name}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${
                            row.enabled ? 'bg-green-900/40 text-green-400' : 'bg-white/5 text-slate-500'
                          }`}>
                            {row.enabled ? 'продаётся' : 'выключен'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {row.product_id} • ${Number(row.price)}
                          {!row.inCatalog && <span className="text-amber-500"> • нет в каталоге</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedRow(expanded ? null : row.id)}
                        className="p-1.5 rounded-lg bg-white/5 shrink-0"
                      >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>

                    {!row.inCatalog && (
                      <div className="px-4 pb-2 flex items-start gap-2 text-[10px] text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                        <span>
                          Товара нет в каталоге предметов — показываются сохранённые данные. Создайте предмет с ID «{row.product_id}», чтобы он стал доступен.
                        </span>
                      </div>
                    )}

                    {expanded && (
                      <ProductRowEditor
                        row={row}
                        saving={saving}
                        onSave={handleSaveRow}
                        onDelete={handleDelete}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductRowEditorProps {
  row: BusinessProduct;
  saving: boolean;
  onSave: (row: BusinessProduct, patch: { price?: number; resources?: Record<string, number> }) => void;
  onDelete: (row: BusinessProduct) => void;
}

function ProductRowEditor({ row, saving, onSave, onDelete }: ProductRowEditorProps) {
  const [price, setPrice] = useState(Number(row.price) || 0);
  const [resources, setResources] = useState<Record<string, number>>(() => ({ ...(row.resources || {}) }));

  useEffect(() => {
    setPrice(Number(row.price) || 0);
    setResources({ ...(row.resources || {}) });
  }, [row.id, row.price, row.resources]);

  const setQty = (res: string, qty: number) =>
    setResources(prev => {
      const next = { ...prev };
      if (qty > 0) next[res] = qty;
      else delete next[res];
      return next;
    });

  const resourceEntries = Object.entries(RESOURCE_TYPES);
  const usedResources = Object.keys(resources).filter(k => Number(resources[k]) > 0);

  return (
    <div className="px-4 pb-4 pt-3 space-y-3 border-t border-white/5">
      <label className="block">
        <span className="text-[10px] uppercase text-slate-400">Цена продажи ($)</span>
        <input
          type="number"
          min={0}
          value={price}
          onChange={e => setPrice(Math.max(0, Number(e.target.value) || 0))}
          className={`${inputCls} mt-1`}
        />
      </label>

      <div>
        <span className="text-[10px] uppercase text-slate-400">Расход ресурсов на 1 шт.</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
          {resourceEntries.map(([resKey, res]) => (
            <div key={resKey} className="flex items-center gap-2 bg-black/30 rounded-xl px-2.5 py-1.5">
              <span className="text-sm">{res.icon}</span>
              <span className="text-[10px] text-slate-400 flex-1 truncate">{res.name}</span>
              <input
                type="number"
                min={0}
                value={resources[resKey] ?? 0}
                onChange={e => setQty(resKey, Math.max(0, Number(e.target.value) || 0))}
                className="w-14 bg-black/50 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-center"
              />
            </div>
          ))}
        </div>
        {usedResources.length === 0 && (
          <p className="text-[9px] text-slate-500 mt-1">Ресурсы не расходуются — товар продаётся без производства.</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave(row, { price, resources })}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 font-black text-xs flex items-center justify-center gap-2"
        >
          <Check className="h-3 w-3" /> {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          onClick={() => onDelete(row)}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-red-900/40 hover:bg-red-900/60 font-black text-xs flex items-center gap-2"
        >
          <Trash2 className="h-3 w-3" /> Убрать
        </button>
      </div>
    </div>
  );
}
