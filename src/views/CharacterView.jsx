import React, { useEffect, useState } from 'react';
import { X, Star, Shield, Zap, Clock, HardDrive, Flame, Heart, Battery, Utensils, GlassWater, Wallet, PiggyBank } from 'lucide-react';
import { useEquipmentStore } from '../store/useEquipmentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { EQUIPMENT_SLOTS, CLOTHING_DATABASE } from '../data/clothingConfig';
import { CHARACTER_STATS, CHARACTER_STATS_MAP, BUFF_STAT_KEYS } from '../data/characterStats';

const BUFF_LABELS = CHARACTER_STATS.filter(s => BUFF_STAT_KEYS.includes(s.key)).reduce((acc, stat) => {
  acc[`buff_${stat.key}`] = { name: stat.name, icon: stat.icon, color: stat.color };
  return acc;
}, {});

export default function CharacterView({ onClose }) {
  const { equipment, fetchEquipment, equipItem, unequipItem, getStats } = useEquipmentStore();
  const { items } = useInventoryStore();
  const { player, activeBuffs } = usePlayerStore();
  const stats = getStats();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchEquipment();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [fetchEquipment]);

  const handleEquip = async (item_id) => {
    await equipItem(item_id);
  };

  const handleUnequip = async (slot) => {
    await unequipItem(slot);
  };

  const wearableItems = items.filter(item => CLOTHING_DATABASE[item.item_id]);
  const activeBuffsList = (activeBuffs || []).filter(b => b.expiresAt > now);

  const formatTime = (ms) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatColor = (value, max = 100) => {
    if (value >= max * 0.7) return 'text-emerald-400';
    if (value >= max * 0.3) return 'text-amber-400';
    return 'text-red-400';
  };

  const getStatBg = (value, max = 100) => {
    if (value >= max * 0.7) return 'bg-emerald-500';
    if (value >= max * 0.3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050814] flex flex-col text-white overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase italic">Персонаж</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Equipment & Stats</p>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <X size={20} />
        </button>
      </div>

      <div className="px-6 mb-6">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3">Основные характеристики</h3>
        <div className="space-y-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-red-400" />
                <span className="text-[10px] font-black uppercase text-slate-400">Здоровье</span>
              </div>
              <span className={`text-sm font-black ${getStatColor(player?.hp || 0, 100)}`}>{player?.hp || 0} / 100</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${getStatBg(player?.hp || 0, 100)}`} style={{ width: `${player?.hp || 0}%` }} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Battery size={14} className="text-yellow-400" />
                <span className="text-[10px] font-black uppercase text-slate-400">Энергия</span>
              </div>
              <span className={`text-sm font-black ${getStatColor(player?.energy || 0, 100)}`}>{player?.energy || 0}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${getStatBg(player?.energy || 0, 100)}`} style={{ width: `${player?.energy || 0}%` }} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Utensils size={14} className="text-orange-400" />
                <span className="text-[10px] font-black uppercase text-slate-400">Голод</span>
              </div>
              <span className={`text-sm font-black ${getStatColor(player?.hunger || 0, 100)}`}>{player?.hunger || 0}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${getStatBg(player?.hunger || 0, 100)}`} style={{ width: `${player?.hunger || 0}%` }} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <GlassWater size={14} className="text-blue-400" />
                <span className="text-[10px] font-black uppercase text-slate-400">Жажда</span>
              </div>
              <span className={`text-sm font-black ${getStatColor(player?.thirst || 0, 100)}`}>{player?.thirst || 0}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${getStatBg(player?.thirst || 0, 100)}`} style={{ width: `${player?.thirst || 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mb-6">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3">Финансы</h3>
        <div className="grid grid-cols-1 gap-2">
          <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase text-slate-400">Наличные</span>
            </div>
            <span className="text-sm font-black text-emerald-400">${Number(player?.money || 0).toLocaleString()}</span>
          </div>
          <div className="bg-teal-500/10 border border-teal-400/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank size={14} className="text-teal-400" />
              <span className="text-[10px] font-black uppercase text-slate-400">Банковский счёт</span>
            </div>
            <span className="text-sm font-black text-teal-400">{Number(player?.bank_balance || 0).toLocaleString()} ₽</span>
          </div>
          <div className="bg-purple-500/10 border border-purple-400/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank size={14} className="text-purple-400" />
              <span className="text-[10px] font-black uppercase text-slate-400">Депозит</span>
            </div>
            <span className="text-sm font-black text-purple-400">{Number(player?.deposit_balance || 0).toLocaleString()} ₽</span>
          </div>
        </div>
      </div>

      <div className="px-6 mb-6">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3">Характеристики</h3>
        <div className="grid grid-cols-2 gap-3">
          {CHARACTER_STATS.filter(s => s.key !== 'inv_slots').map(stat => (
            <div key={stat.key} className={`${stat.bg}/10 border ${stat.bg}/20 rounded-2xl p-4 text-center`}>
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className={`text-[9px] uppercase text-slate-400 font-black`}>{stat.name}</div>
              <div className={`text-xl font-black ${stat.color}`}>+{stats[stat.key] || 0}</div>
            </div>
          ))}
        </div>
        {stats.inv_slots > 0 && (
          <div className="mt-3 bg-cyan-500/10 border border-cyan-400/20 rounded-2xl p-3 text-center">
            <HardDrive size={14} className="mx-auto mb-1 text-cyan-400" />
            <div className="text-[9px] uppercase text-slate-400 font-black">Слоты инвентаря</div>
            <div className="text-lg font-black text-cyan-400">+{stats.inv_slots}</div>
          </div>
        )}
      </div>

      {activeBuffsList.length > 0 && (
        <div className="px-6 mb-6">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 flex items-center gap-2">
            <Flame size={12} className="text-orange-400" />
            Активные баффы
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {activeBuffsList.map(buff => {
              const info = BUFF_LABELS[buff.type] || { name: buff.type, icon: '✨', color: 'text-white' };
              const remaining = buff.expiresAt - now;
              return (
                <div key={buff.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <div className="text-xl mb-1">{info.icon}</div>
                  <div className={`text-xs font-black ${info.color}`}>{info.name}</div>
                  <div className="text-[10px] text-slate-400">+{buff.amount}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{formatTime(remaining)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-6 mb-6">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3">Экипировка</h3>
        <div className="space-y-2">
          {Object.entries(EQUIPMENT_SLOTS).map(([slotId, slotInfo]) => {
            const equippedItem_id = equipment[slotId];
            const equippedItem = equippedItem_id ? CLOTHING_DATABASE[equippedItem_id] : null;
            
            return (
              <div key={slotId} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{slotInfo.icon}</span>
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">{slotInfo.name}</div>
                      {equippedItem ? (
                        <>
                          <div className="text-sm font-black">{equippedItem.icon} {equippedItem.name}</div>
                          {equippedItem.stats && Object.entries(equippedItem.stats).length > 0 && (
                            <div className="text-[9px] text-slate-400">
                              {Object.entries(equippedItem.stats).map(([key, val]) => (
                                <span key={key}>+{val} {key} </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[10px] text-slate-600 italic">Пусто</div>
                      )}
                    </div>
                  </div>
                  {equippedItem && (
                    <button
                      onClick={() => handleUnequip(slotId)}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl text-[10px] font-black uppercase text-red-400 transition-all"
                    >
                      Снять
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {wearableItems.length > 0 && (
        <div className="px-6 pb-8">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3">В инвентаре</h3>
          <div className="grid grid-cols-2 gap-2">
            {wearableItems.map(item => {
              const itemData = CLOTHING_DATABASE[item.item_id];
              if (!itemData) return null;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleEquip(item.item_id)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 text-left transition-all active:scale-95"
                >
                  <div className="text-xl mb-1">{itemData.icon}</div>
                  <div className="text-[10px] font-black truncate">{itemData.name}</div>
                  {itemData.stats && Object.entries(itemData.stats).length > 0 && (
                    <div className="text-[8px] text-slate-400">
                      {Object.entries(itemData.stats).map(([key, val]) => (
                        <span key={key}>+{val}{key} </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
 
