import React, { useEffect, useState } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useHouseStore } from '../store/useHouseStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { HOUSE_CLASSES } from '../data/houseConfig';
import InventoryGrid from '../components/InventoryGrid';
import ItemActionMenu from '../components/ItemActionMenu';
import { LogOut, Wallet, Box, ShieldCheck, Landmark, CarFront, ArrowRight } from 'lucide-react';

export default function HouseInterior() {
  const { currentInterior, setInterior, setGarage } = useNavigationStore();
  const { dbHouses, manageSafe } = useHouseStore();
  const { items, houseItems, fetchHouseInventory, fetchPlayerInventory, transferItem, useItem, removeItem } = useInventoryStore();
  const player = usePlayerStore(state => state.player);

  const [selectedItem, setSelectedItem] = useState(null);

  const houseData = dbHouses.find(h => h.id_name === currentInterior);
  const hConfig = HOUSE_CLASSES[houseData?.class] || HOUSE_CLASSES.economy;

  useEffect(() => {
    if (currentInterior) {
      fetchHouseInventory(currentInterior);
      fetchPlayerInventory();
    }
  }, [currentInterior]);

  if (!houseData) return null;

  // Функция-обертка для безопасного ввода денег
  const handleSafeAction = (type) => {
    const msg = type === 'deposit' ? "Введите сумму для внесения в сейф:" : "Введите сумму, которую хотите забрать:";
    const val = window.prompt(msg);
    
    // Если нажали "Отмена" или ввели пустоту - выходим
    if (val === null || val.trim() === "") return;

    // Передаем значение в стор (там оно пройдет финальную проверку)
    manageSafe(houseData.id_name, val, type);
  };

  return (
    <div className="h-full w-full bg-[#050814] flex flex-col text-white overflow-hidden font-sans animate-in fade-in duration-500">
      
      {selectedItem && (
        <ItemActionMenu 
          item={selectedItem} location="house" onClose={() => setSelectedItem(null)}
          onUse={(it) => { useItem(it); setSelectedItem(null); }}
          onDrop={(it) => { if(window.confirm("Выбросить этот предмет?")) removeItem(it.id, it.amount); setSelectedItem(null); }}
          onTransfer={(it) => {
            const toType = it.storage_type === 'player' ? 'house' : 'player';
            const toOwner = it.storage_type === 'player' ? houseData.id_name : player.id;
            transferItem(it.id, toType, toOwner);
            setSelectedItem(null);
          }}
        />
      )}

      <div className="shrink-0 p-8 flex justify-between items-center bg-gradient-to-b from-blue-600/20 to-transparent border-b border-white/5">
        <div className="text-left">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Моя недвижимость</p>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{houseData.name}</h2>
        </div>
        <button onClick={() => setInterior(null)} className="p-4 bg-red-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all"><LogOut /></button>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-6 pb-32">
          
          <button onClick={() => setGarage(houseData.id_name)} className="w-full flex items-center justify-between bg-blue-600 p-6 rounded-[32px] shadow-lg active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white"><CarFront /></div>
              <div className="text-left">
                <span className="block font-black uppercase italic text-white text-sm">Перейти в гараж</span>
                <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Транспорт дома</span>
              </div>
            </div>
            <ArrowRight className="text-white" size={20} />
          </button>

          <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[32px] flex justify-between items-center shadow-xl">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500"><Wallet /></div>
                <div>
                  <span className="block font-black uppercase italic text-xs text-slate-400">Баланс сейфа</span>
                  <span className="text-xl font-black text-white">${houseData.safe_balance?.toLocaleString() || 0}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSafeAction('deposit')} className="bg-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic active:scale-90">Положить</button>
                <button onClick={() => handleSafeAction('withdraw')} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic active:scale-90 border border-white/10">Взять</button>
              </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white/[0.02] p-4 rounded-[32px] border border-white/5">
                <InventoryGrid label="Ваша сумка" items={items} slotsCount={player?.inv_slots || 12} onAction={(it) => setSelectedItem(it)} />
            </div>
            <div className="bg-white/[0.02] p-4 rounded-[32px] border border-white/5">
                <InventoryGrid label="Шкаф дома" items={houseItems} slotsCount={hConfig.wardrobe_slots} onAction={(it) => setSelectedItem(it)} />
            </div>
          </div>
          <div className="h-20 shrink-0"></div>
      </div>
    </div>
  );
}