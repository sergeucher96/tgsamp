import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { BUSINESS_TYPES, RESOURCE_TYPES } from '../data/businessConfig';
import { FINAL_LOCATIONS } from '../data/locations';
import { supabase } from '../api/supabase';
import { useItemCategoryStore } from '../store/useItemCategoryStore';
import { isImageIcon } from '../utils/iconHelper';

export default function BusinessProductsEditor({ onClose }) {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [bizProducts, setBizProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);

  const { items, categories, loadAll, loadItems } = useItemCategoryStore();

  const [expandedItemData, setExpandedItemData] = useState({});
  const [itemImgErrors, setItemImgErrors] = useState({});

  const getExpandedData = (itemId) =>
    expandedItemData[itemId] || {
      price: items.find(i => i.id === itemId)?.price || 0,
    };

  const setExpandedData = (itemId, data) =>
    setExpandedItemData(prev => ({ ...prev, [itemId]: { ...getExpandedData(itemId), ...data } }));

  const handleAddItem = async (item) => {
    const data = getExpandedData(item.id);

    // Берём ресурсы из production_resources предмета, если не заданы вручную
    let resources = {};
    const itemResources = item.production_resources || {};
    Object.entries(itemResources).forEach(([k, v]) => { if (Number(v) > 0) resources[k] = Number(v); });

    setLoading(true);
    try {
      const bizType = Object.keys(BUSINESS_TYPES).find(t => selectedBusiness.startsWith(t)) || 'shop';
      const { error } = await supabase
        .from('business_products')
        .insert([{
          business_id: selectedBusiness,
          business_type: bizType,
          product_id: item.item_key,
          product_name: item.name,
          icon: item.icon || '📦',
          price: Number(data.price) || item.price || 0,
          resources: resources,
        }]);
      if (error) throw error;
      await loadBizProducts(selectedBusiness);
      setExpandedItemId(null);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const [itemSearch, setItemSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    fetchBusinesses();
    loadAll();
    loadItems();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      loadBizProducts(selectedBusiness);
    }
  }, [selectedBusiness]);

  const fetchBusinesses = async () => {
    const businessTypeKeys = Object.keys(BUSINESS_TYPES);
    const allBizLocs = FINAL_LOCATIONS
      .filter(loc => businessTypeKeys.includes(loc.type))
      .map(loc => ({
        id: loc.id,
        type: loc.type,
        typeName: BUSINESS_TYPES[loc.type]?.name || loc.type,
        name: loc.name || loc.id,
        icon: loc.icon || BUSINESS_TYPES[loc.type]?.icon || '🏢',
      }));
    setBusinesses(allBizLocs);
  };

  const loadBizProducts = async (businessId) => {
    const { data, error } = await supabase
      .from('business_products')
      .select('*')
      .eq('business_id', businessId);
    if (error) {
      console.error('loadBizProducts error:', error);
    }
    setBizProducts(data || []);
  };

  const getAvailableItems = () => {
    const assignedIds = new Set(bizProducts.map(bp => bp.product_id));
    let filtered = items.filter(it => !assignedIds.has(it.item_key));
    if (itemSearch) {
      const s = itemSearch.toLowerCase();
      filtered = filtered.filter(it =>
        it.name.toLowerCase().includes(s) ||
        it.item_key?.toLowerCase().includes(s) ||
        (it.description || '').toLowerCase().includes(s)
      );
    }
    if (filterCategory) {
      filtered = filtered.filter(it => it.category_id === Number(filterCategory));
    }
    return filtered;
  };

  const getCategoryName = (catId) => {
    const cat = categories.find(c => c.id === Number(catId));
    return cat ? `${cat.icon || '📂'} ${cat.name}` : 'Без категории';
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить товар из этого бизнеса?')) return;
    const { error } = await supabase.from('business_products').delete().eq('id', id);
    if (!error) await loadBizProducts(selectedBusiness);
  };

  const handleUpdatePrice = async (bizProduct) => {
    const newPrice = prompt('Новая цена:', bizProduct.price);
    if (newPrice === null) return;
    const { error } = await supabase
      .from('business_products')
      .update({ price: Number(newPrice), resources: bizProduct.resources || {}, updated_at: new Date().toISOString() })
      .eq('id', bizProduct.id);
    if (!error) await loadBizProducts(selectedBusiness);
    else alert('Ошибка: ' + error.message);
  };

  // ====== Main: Business List ======
  if (!selectedBusiness) {
    return (
      <div className="fixed inset-0 z-[600] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15">
          <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f]">
            <ArrowLeft className="h-4 w-4" /> Назад
          </button>
          <h2 className="text-lg font-black uppercase text-[#d6ff9f]">Товары бизнеса</h2>
          <div />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] mb-4">Выберите бизнес</p>
          <div className="space-y-2">
            {businesses.map(biz => (
              <button
                key={biz.id}
                onClick={() => setSelectedBusiness(biz.id)}
                className="w-full p-4 rounded-2xl border border-[#7eff67]/10 bg-[#0b1b0d]/80 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{biz.icon}</span>
                  <div>
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

  const selectedBiz = businesses.find(b => b.id === selectedBusiness);
  const availableItems = getAvailableItems();
  const getItemByKey = (key) => items.find(i => i.item_key === key);

  return (
    <div className="fixed inset-0 z-[600] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15">
        <button onClick={() => setSelectedBusiness(null)} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f]">
          <ArrowLeft className="h-4 w-4" /> Все
        </button>
        <h2 className="text-sm font-black uppercase text-[#d6ff9f]">{selectedBiz?.name || selectedBusiness}</h2>
        <button
          onClick={() => { setShowAssign(!showAssign); setItemSearch(''); setFilterCategory(''); }}
          className="flex items-center gap-1 rounded-full bg-green-600 px-3 py-2 text-xs font-black"
        >
          <Plus className="h-3 w-3" /> Добавить
        </button>
      </div>

      <div className="flex gap-1 px-4 py-2 border-b border-white/10 overflow-x-auto">
        <button onClick={() => setShowAssign(false)} className={`px-3 py-1 rounded-lg text-xs font-black whitespace-nowrap ${!showAssign ? 'bg-[#7eff69]/20 text-[#7eff69]' : 'text-slate-400'}`}>
          Каталог ({bizProducts.length})
        </button>
        <button onClick={() => setShowAssign(true)} className={`px-3 py-1 rounded-lg text-xs font-black whitespace-nowrap ${showAssign ? 'bg-[#7eff69]/20 text-[#7eff69]' : 'text-slate-400'}`}>
          Добавить ({availableItems.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showAssign && (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="🔍 Поиск предмета..."
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

            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
              Доступные предметы ({availableItems.length})
            </p>

            {availableItems.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">Все предметы уже добавлены или ничего не найдено</p>
            )}

            <div className="space-y-2">
              {availableItems.map(item => {
                const expanded = expandedItemId === item.id;
                return (
                  <div key={item.id} className="rounded-2xl border border-[#7eff67]/10 bg-[#0b1b0d]/80 overflow-hidden">
                    <button onClick={() => setExpandedItemId(expanded ? null : item.id)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <div className="flex items-center gap-3">
                        {itemImgErrors[item.id] ? (
                          <span className="text-2xl">📦</span>
                        ) : isImageIcon(item.icon) ? (
                          <img src={item.icon} onError={() => setItemImgErrors(prev => ({ ...prev, [item.id]: true }))} className="w-8 h-8 object-contain rounded" />
                        ) : (
                          <span className="text-2xl">{item.icon || '📦'}</span>
                        )}
                        <div>
                          <p className="font-black text-sm text-[#d6ff9f]">{item.name}</p>
                          <p className="text-[10px] text-slate-400">ID: {item.item_key} • {getCategoryName(item.category_id)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-400">${item.price || 0}</span>
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                        {item.description && <p className="text-xs text-slate-300 mt-2">{item.description}</p>}
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-slate-400 whitespace-nowrap">Цена:</label>
                          <input
                            type="number"
                            value={getExpandedData(item.id).price}
                            onChange={e => setExpandedData(item.id, { price: Number(e.target.value) })}
                            className="w-24 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-center"
                          />
                        </div>
                        {item.production_resources && Object.keys(item.production_resources).length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Ресурсы (из конфига предмета)</p>
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(item.production_resources).map(([res, qty]) => (
                                <span key={res} className="text-[10px] px-2 py-1 rounded-lg bg-white/5">
                                  {(RESOURCE_TYPES[res] || {}).icon || ''} {(RESOURCE_TYPES[res] || {}).name || res}: {qty}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => handleAddItem(item)}
                          disabled={loading}
                          className="w-full py-2 rounded-xl bg-green-600 font-black text-xs flex items-center justify-center gap-2"
                        >
                          <Plus className="h-3 w-3" /> Добавить в каталог
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>




          </div>
        )}

        {!showAssign && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
              Каталог товаров ({bizProducts.length})
            </p>

            {bizProducts.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">Нет товаров. Нажмите "Добавить"</p>
            )}

            <div className="space-y-2">
              {bizProducts.map(bp => {
                const item = getItemByKey(bp.product_id);
                return (
                  <div key={bp.id} className="p-4 rounded-2xl border border-[#7eff67]/10 bg-[#0b1b0d]/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {itemImgErrors[bp.id] ? (
                          <span className="text-2xl">📦</span>
                        ) : (() => {
                          const iconSrc = item?.icon || bp.icon || '';
                          return isImageIcon(iconSrc) ? (
                            <img src={iconSrc} onError={() => setItemImgErrors(prev => ({ ...prev, [bp.id]: true }))} className="w-8 h-8 object-contain rounded" />
                          ) : (
                            <span className="text-2xl">{iconSrc || '📦'}</span>
                          );
                        })()}
                        <div>
                          <p className="font-black text-[#d6ff9f]">{item?.name || bp.product_name}</p>
                          <p className="text-[10px] text-slate-400">${bp.price} • {item ? getCategoryName(item.category_id) : ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdatePrice(bp)} className="p-2 rounded-lg bg-white/5 text-xs">💲</button>
                        <button onClick={() => handleDelete(bp.id)} className="p-2 rounded-lg bg-red-900/30 text-red-400"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                    {bp.resources && typeof bp.resources === 'object' && Object.keys(bp.resources).length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {Object.entries(bp.resources).map(([res, qty]) => (
                          <span key={res} className="text-[10px] px-2 py-1 rounded-lg bg-white/5">
                            {res}: {qty}
                          </span>
                        ))}
                      </div>
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
