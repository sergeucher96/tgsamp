import React, { useEffect, useState, useMemo } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useItemCategoryStore } from '../store/useItemCategoryStore';
import InventoryGrid from '../components/InventoryGrid';
import ItemActionMenu from '../components/ItemActionMenu';
import { Briefcase, Zap, Search, Package, DollarSign, Trash2, UtensilsCrossed, Wrench, Shield, AlertTriangle, HeartPulse } from 'lucide-react';
import { ITEM_DATABASE } from '../data/items';
import { CLOTHING_DATABASE } from '../data/clothingConfig';
import { RESOURCE_PRICES } from '../data/economy';

export default function InventoryView() {
  const { player } = usePlayerStore();
  const { items, fetchPlayerInventory, useItem, removeItem } = useInventoryStore();
  const { items: dbItems } = useItemCategoryStore();
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPlayerInventory();
  }, []);

  const getItemInfo = (itemId) => {
    const dbItem = dbItems.find(i => i.item_key === itemId);
    const fallback = ITEM_DATABASE[itemId] || CLOTHING_DATABASE[itemId] || null;
    if (dbItem) {
      return {
        id: dbItem.item_key,
        name: dbItem.item_name,
        desc: dbItem.description || '',
        icon: dbItem.icon || '📦',
        type: dbItem.type || 'item',
        action: dbItem.action || fallback?.action || null,
        value: dbItem.action_value || 0,
        sellPrice: dbItem.sell_price || 0,
        stackable: dbItem.stackable || false,
      };
    }
    return fallback;
  };

  const getItemCategory = (item) => {
    const info = getItemInfo(item.item_id);
    if (!info) return 'other';
    if (info.type === 'food' || info.action === 'HEAL_ENERGY') return 'food';
    if (info.action === 'OPEN_PHONE' || info.action === 'ACTIVATE_SIM') return 'important';
    if (info.type === 'resource' || info.type === 'ingredient') return 'material';
    if (info.type === 'tool' || info.type === 'weapon') return 'tool';
    return 'other';
  };

  const filteredItems = useMemo(() => {
    let result = items;
    if (filter === 'food') result = items.filter(i => getItemCategory(i) === 'food');
    else if (filter === 'material') result = items.filter(i => getItemCategory(i) === 'material');
    else if (filter === 'tool') result = items.filter(i => getItemCategory(i) === 'tool');
    else if (filter === 'important') result = items.filter(i => getItemCategory(i) === 'important');
    if (search) {
      result = result.filter(i => {
        const info = getItemInfo(i.item_id);
        return info?.name?.toLowerCase().includes(search.toLowerCase());
      });
    }
    return result;
  }, [items, filter, search]);

  const stats = useMemo(() => ({
    totalItems: items.length,
    uniqueItems: new Set(items.map(i => i.item_id)).size,
    totalValue: items.reduce((sum, item) => {
      const info = getItemInfo(item.item_id);
      return sum + (info?.sellPrice || RESOURCE_PRICES[item.item_id] || 0) * (item.amount || 1);
    }, 0),
  }), [items]);

  const filterButtons = [
    { id: 'all', label: 'Все', icon: Package, color: 'white' },
    { id: 'food', label: 'Еда', icon: HeartPulse, color: 'amber' },
    { id: 'material', label: 'Мат. ', icon: UtensilsCrossed, color: 'orange' },
    { id: 'tool', label: 'Инструменты', icon: Wrench, color: 'sky' },
    { id: 'important', label: 'Важное', icon: Shield, color: 'rose' },
  ];

  return (
    <div className="min-h-full p-4 pb-40 animate-in fade-in duration-300">
      
      {selectedItem && (
        <ItemActionMenu 
          item={selectedItem}
          location="world"
          onClose={() => setSelectedItem(null)}
          onUse={async (it) => { await useItem(it); setSelectedItem(null); }}
          onDrop={(it) => { if(window.confirm("Выбросить предмет?")) removeItem(it.id, it.amount); setSelectedItem(null); }}
        />
      )}

      {/* === ШАПКА === */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Briefcase className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Инвентарь</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Сумка</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
            <Zap size={14} className="text-amber-400" fill="currentColor" />
            <span className="text-sm font-black text-amber-400">{player?.energy}%</span>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatCard icon={Package} label="Слоты" value={`${stats.totalItems}/${player?.inv_slots || 12}`} color="blue" />
          <StatCard icon={DollarSign} label="Стоимость" value={`$${stats.totalValue.toLocaleString()}`} color="emerald" />
          <StatCard icon={AlertTriangle} label="Уникал." value={stats.uniqueItems} color="purple" />
        </div>

        {/* Фильтры */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {filterButtons.map(fb => {
            const Icon = fb.icon;
            const isActive = filter === fb.id;
            return (
              <button
                key={fb.id}
                onClick={() => setFilter(fb.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-all ${
                  isActive
                    ? `bg-${fb.color === 'white' ? 'slate' : fb.color}-500/20 text-${fb.color === 'white' ? 'white' : fb.color}-300 border border-${fb.color === 'white' ? 'slate' : fb.color}-500/40 shadow-sm`
                    : 'bg-white/[0.03] text-slate-500 border border-white/5 active:text-white'
                }`}
              >
                <Icon size={12} />
                {fb.label}
              </button>
            );
          })}
        </div>

        {/* Поиск */}
        <div className="relative mt-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            placeholder="Поиск предметов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-[11px] text-white placeholder:text-slate-700 outline-none focus:border-blue-500/30 transition-all"
          />
        </div>
      </div>

      {/* СЕТКА */}
      <InventoryGrid 
        items={filteredItems} 
        slotsCount={player?.inv_slots || 12} 
        onAction={(it) => setSelectedItem(it)}
        label={null}
      />

      {filteredItems.length === 0 && items.length > 0 && (
        <div className="text-center py-8">
          <p className="text-slate-600 text-xs font-bold">Ничего не найдено</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const bgMap = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/15',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/15',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/15',
  };
  const textMap = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
  };
  const dimTextMap = {
    blue: 'text-blue-500/40',
    emerald: 'text-emerald-500/40',
    purple: 'text-purple-500/40',
  };
  return (
    <div className={`bg-gradient-to-br ${bgMap[color]} border rounded-xl p-2.5 text-center`}>
      <Icon size={12} className={`${textMap[color]} mx-auto mb-1`} />
      <p className={`text-[11px] font-black ${textMap[color]}`}>{value}</p>
      <p className={`text-[8px] font-bold uppercase ${dimTextMap[color]}`}>{label}</p>
    </div>
  );
}