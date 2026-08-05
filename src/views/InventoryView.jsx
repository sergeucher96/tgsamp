import React, { useEffect } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import InventoryGrid from '../components/InventoryGrid';
import ItemActionMenu from '../components/ItemActionMenu';
import { Briefcase, Info, Zap } from 'lucide-react';

export default function InventoryView() {
  const { player } = usePlayerStore();
  const { items, fetchPlayerInventory, useItem, removeItem } = useInventoryStore();
  const [selectedItem, setSelectedItem] = React.useState(null);

  useEffect(() => {
    fetchPlayerInventory();
  }, []);

  return (
    <div className="min-h-full p-6 pb-40 animate-in fade-in duration-500">
      
      {selectedItem && (
        <ItemActionMenu 
          item={selectedItem}
          location="world"
          onClose={() => setSelectedItem(null)}
          onUse={async (it) => { 
            await useItem(it); 
            setSelectedItem(null); 
          }}
          onDrop={(it) => { if(window.confirm("Выбросить?")) removeItem(it.id, it.amount); setSelectedItem(null); }}
        />
      )}

      {/* ШАПКА */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Briefcase className="text-white" size={24} />
            </div>
            <div className="text-left">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Сумка</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Личные вещи</p>
            </div>
        </div>
        
        {/* Виджет энергии в инвентаре */}
        <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-yellow-500 font-black italic">
                <Zap size={14} fill="currentColor" />
                {player?.energy}%
            </div>
            <span className="text-[7px] text-slate-600 font-black uppercase">Выносливость</span>
        </div>
      </div>

      <InventoryGrid 
        items={items} 
        slotsCount={player?.inv_slots || 12} 
        onAction={(it) => setSelectedItem(it)}
        label="Предметы в наличии"
      />

      <div className="mt-10 p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-[32px] flex gap-4">
        <Zap className="text-yellow-500 shrink-0" size={20} />
        <div className="text-left">
            <p className="text-[10px] text-white font-black uppercase italic">Совет штата:</p>
            <p className="text-[9px] text-slate-400 uppercase font-bold leading-relaxed mt-1">
                Следите за уровнем энергии. Если она упадет до нуля, вы начнете терять здоровье. Кушайте яблоки и бургеры вовремя.
            </p>
        </div>
      </div>
    </div>
  );
}