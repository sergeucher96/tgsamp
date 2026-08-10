import React, { useEffect } from 'react';
import { X, Star, Shield, Zap, Clock, HardDrive } from 'lucide-react';
import { useEquipmentStore } from '../store/useEquipmentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { EQUIPMENT_SLOTS, CLOTHING_DATABASE } from '../data/clothingConfig';

export default function CharacterView({ onClose }) {
  const { equipment, fetchEquipment, equipItem, unequipItem, getStats } = useEquipmentStore();
  const { items } = useInventoryStore();
  const stats = getStats();

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleEquip = async (item_id) => {
    await equipItem(item_id);
  };

  const handleUnequip = async (slot) => {
    await unequipItem(slot);
  };

  const wearableItems = items.filter(item => CLOTHING_DATABASE[item.item_id]);

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
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-500/10 border border-purple-400/20 rounded-2xl p-4 text-center">
            <Star size={16} className="mx-auto mb-1 text-purple-400" />
            <div className="text-[9px] uppercase text-slate-400 font-black">Харизма</div>
            <div className="text-xl font-black text-purple-400">+{stats.charisma}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-4 text-center">
            <Shield size={16} className="mx-auto mb-1 text-blue-400" />
            <div className="text-[9px] uppercase text-slate-400 font-black">Броня</div>
            <div className="text-xl font-black text-blue-400">+{stats.armor}</div>
          </div>
          <div className="bg-green-500/10 border border-green-400/20 rounded-2xl p-4 text-center">
            <Zap size={16} className="mx-auto mb-1 text-green-400" />
            <div className="text-[9px] uppercase text-slate-400 font-black">Выносливость</div>
            <div className="text-xl font-black text-green-400">+{stats.stamina}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-4 text-center">
            <Clock size={16} className="mx-auto mb-1 text-amber-400" />
            <div className="text-[9px] uppercase text-slate-400 font-black">Скорость</div>
            <div className="text-xl font-black text-amber-400">+{stats.speed}</div>
          </div>
        </div>
        {stats.inv_slots > 0 && (
          <div className="mt-3 bg-cyan-500/10 border border-cyan-400/20 rounded-2xl p-3 text-center">
            <HardDrive size={14} className="mx-auto mb-1 text-cyan-400" />
            <div className="text-[9px] uppercase text-slate-400 font-black">Слоты инвентаря</div>
            <div className="text-lg font-black text-cyan-400">+{stats.inv_slots}</div>
          </div>
        )}
      </div>

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
 
