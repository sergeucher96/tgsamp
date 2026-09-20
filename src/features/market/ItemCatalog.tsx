import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Trash2, Plus, Save, ChevronLeft, ChevronRight, Upload, Check, AlertCircle, Package, Tag, Layers, Eye, Image as ImageIcon } from 'lucide-react';
import { useItemCategoryStore, type Item, type ItemRarity, RARITY_CONFIG } from '../../stores/useItemCategoryStore';
import { isImageIcon } from '../../utils/iconHelper';
import { RESOURCE_TYPES } from '../businesses/data/businessConfig';

const REPLACEMENT_CHAR = '\uFFFD';

interface ItemCatalogProps {
  onClose: () => void;
}

function getDisplayIcon(icon?: string | null): string | null {
  if (!icon) return null;
  const trimmed = icon.trim();
  if (!trimmed || trimmed === REPLACEMENT_CHAR || trimmed.includes(REPLACEMENT_CHAR)) {
    return null;
  }
  return icon;
}

const ItemIcon: React.FC<{ icon?: string | null; className?: string }> = ({ icon, className = 'text-2xl' }) => {
  const [broken, setBroken] = useState(false);
  const display = getDisplayIcon(icon);
  if (!display || broken) return <span className={className}>📦</span>;
  if (isImageIcon(display)) {
    return <img src={display} onError={() => setBroken(true)} alt="icon" className="w-8 h-8 object-contain rounded bg-black/30" />;
  }
  return <span className={className}>{display}</span>;
};

function getItemRarity(item: Item): ItemRarity {
  return item.rarity || (item.properties?.rarity as ItemRarity | undefined) || 'common';
}

const ItemCatalog: React.FC<ItemCatalogProps> = ({ onClose }) => {
  const { items, categories, loading, loadAll, deleteItem } = useItemCategoryStore();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | number>('');
  const [filterRarity, setFilterRarity] = useState<ItemRarity | 'all'>('all');

  useEffect(() => {
    if (items.length === 0) {
      loadAll().catch(() => {});
    }
  }, [items.length, loadAll]);

  useEffect(( ) => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filtered = (items || []).filter(item => {
    const term = search.toLowerCase();
    const matchSearch = !term ||
      (item.name || '').toLowerCase().includes(term) ||
      (item.item_key || item.key || '').toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term) ||
      (item.tags || []).join(',').toLowerCase().includes(term);
    const matchCat = !filterCategory || String(item.category_id) === String(filterCategory);
    const rarity = getItemRarity(item);
    const matchRarity = filterRarity === 'all' || rarity === filterRarity;
    return matchSearch && matchCat && matchRarity;
  });

  const getCategoryName = (catId?: string | number): string => {
    if (catId == null) return 'Без категории';
    const cat = categories.find(c => String(c.id) === String(catId));
    return cat ? `${cat.icon || '📂'} ${cat.name}` : 'Без категории';
  };

  const resetFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterRarity('all');
  };

  return (
    <div className="fixed inset-0 z-[700] bg-[#020617]/95 backdrop-blur-xl flex flex-col text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#7eff67]/15 shrink-0">
        <div className="flex items-center gap-2">
          <p className="text-[#d6ff9f] font-black uppercase text-sm">📋 Все предметы</p>
          <span className="text-[10px] text-slate-500 font-black">({filtered.length})</span>
          {(search || filterCategory || filterRarity !== 'all') && (
            <button onClick={resetFilters} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 hover:bg-white/10">Сброс</button>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-300">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 shrink-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Поиск по названию, ID, тегам..."
            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 pl-10 text-sm focus:outline-none focus:border-[#7eff67]/40"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Все категории</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon || '📂'} {c.name}</option>
            ))}
          </select>
          <select
            value={filterRarity}
            onChange={e => setFilterRarity(e.target.value as ItemRarity | 'all')}
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <option value="all">Вся редкость</option>
            {(Object.keys(RARITY_CONFIG) as ItemRarity[]).map(r => (
              <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4">
        {loading && items.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">Загрузка предметов…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">Нет предметов в базе</p>
        )}
        {!loading && filtered.length === 0 && items.length > 0 && (
          <p className="text-center text-slate-400 text-sm py-8">Ничего не найдено</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} getCategoryName={getCategoryName} deleteItem={deleteItem} />
          ))}
        </div>
      </div>
    </div>
  );
};

function ItemCard({ item, getCategoryName, deleteItem }: {
  item: Item;
  getCategoryName: (catId?: string | number) => string;
  deleteItem: (id: string | number) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const rarity = getItemRarity(item);
  const cfg = RARITY_CONFIG[rarity];

  const effects = (item.effects || []) as Array<{ effect_key?: string; key?: string; value?: number }>;
  const properties = item.properties || {};
  const resources = item.production_resources || {};

  return (
    <div className={`rounded-2xl border overflow-hidden bg-[#0b1b0d]/80 ${cfg.border} ${cfg.bg}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <ItemIcon icon={item.icon} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-black text-sm text-[#d6ff9f] truncate">{item.name || item.item_key || item.key || '?'}</p>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">{item.item_key || item.key || ''}</p>
          <p className="text-[10px] text-slate-500">{getCategoryName(item.category_id)}</p>
        </div>
        <span className="text-slate-400 text-xl">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 text-[11px] text-slate-300">
          {item.description && <p className="text-slate-300">{item.description}</p>}

          <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
            <span>Стопка: {item.stackable ? `до ${item.max_stack ?? 1}` : 'Нет'}</span>
            {item.price != null && <span>Цена: ${Number(item.price)}</span>}
            {item.sell_price != null && <span>Продажа: ${Number(item.sell_price)}</span>}
            {item.base_cost != null && <span>Себестоймость: ${Number(item.base_cost)}</span>}
          </div>

          {Object.keys(properties).length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Свойства</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(properties).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-2 py-1 rounded bg-white/5">{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                ))}
              </div>
            </div>
          )}

          {effects.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Эффекты</p>
              <div className="flex flex-wrap gap-1">
                {effects.map((e, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded bg-white/5">
                    {(e.effect_key || e.key || '?') as string}: {e.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Теги</p>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-purple-900/30">{t}</span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(resources).length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Ресурсы производства</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(resources).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-2 py-1 rounded bg-white/5">{k}: {Number(v)}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={async () => {
              if (confirm(`Удалить предмет «${item.name || item.item_key}»?`)) {
                await deleteItem(item.id);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 text-[10px] font-black"
          >
            <Trash2 className="w-3 h-3" /> Удалить
          </button>
        </div>
      )}
    </div>
  );
}

export default ItemCatalog;
