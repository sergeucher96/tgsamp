import React, { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useHouseStore } from '../store/useHouseStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { HOUSE_PREVIEWS_MAP, HOUSE_HOTSPOTS } from '../data/houseStyles';
import InventoryGrid from '../components/InventoryGrid';
import ItemActionMenu from '../components/ItemActionMenu';
import { LogOut, Wallet, ArrowLeft } from 'lucide-react';

export default function HouseInterior() {
  const { currentInterior, setInterior, setGarage } = useNavigationStore();
  const { dbHouses, manageSafe } = useHouseStore();
  const { items, houseItems, fetchHouseInventory, fetchPlayerInventory, transferItem, useItem, removeItem } = useInventoryStore();
  const player = usePlayerStore(state => state.player);

  const [selectedItem, setSelectedItem] = useState(null);
  const [houseImage, setHouseImage] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [mode, setMode] = useState('exterior');
  const [hotspotPositions, setHotspotPositions] = useState([]);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);

  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const houseData = dbHouses.find(h => h.id_name === currentInterior);
  const hConfig = HOUSE_CLASSES[houseData?.class] || HOUSE_CLASSES.economy;

  useEffect(() => {
    if (currentInterior) {
      fetchHouseInventory(currentInterior);
      fetchPlayerInventory();
    }
  }, [currentInterior]);

  useEffect(() => {
    if (!houseData) return;
    const cls = houseData.class;
    const imgIdx = houseData.image?.v || 1;
    const previews = HOUSE_PREVIEWS_MAP[cls]?.images || [];
    const img = previews.find(i => i.id === imgIdx);
    setHouseImage(img?.src || null);
    const hs = HOUSE_HOTSPOTS[cls]?.[imgIdx] || [];
    setHotspots(hs);
  }, [houseData]);

  /* Recalculate hotspot positions whenever the image/container size changes */
  useEffect(() => {
    if (mode !== 'exterior' || !imgRef.current || !containerRef.current) return;

    const recalc = () => {
      const img = imgRef.current;
      const container = containerRef.current;
      if (!img || !container || !img.complete) return;

      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const nW = img.naturalWidth;
      const nH = img.naturalHeight;
      if (nW === 0 || nH === 0) return;

      // object-cover scale: fills container, may crop
      const scale = Math.max(cW / nW, cH / nH);
      const drawW = nW * scale;
      const drawH = nH * scale;
      // centered
      const offsetX = (cW - drawW) / 2;
      const offsetY = (cH - drawH) / 2;

      const positions = hotspots.map(hs => {
        if (hs.type === 'rect') {
          return {
            id: hs.id,
            action: hs.action,
            label: hs.label || '',
            left: offsetX + (hs.x / 100) * nW * scale,
            top: offsetY + (hs.y / 100) * nH * scale,
            width: (hs.w / 100) * nW * scale,
            height: (hs.h / 100) * nH * scale,
          };
        }
        return null;
      }).filter(Boolean);
      setHotspotPositions(positions);
    };

    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [mode, hotspots, houseImage]);

  if (!houseData) return null;

  const handleSafeAction = (type) => {
    const msg = type === 'deposit' ? "Введите сумму для внесения в сейф:" : "Введите сумму, которую хотите забрать:";
    const val = window.prompt(msg);
    if (val === null || val.trim() === "") return;
    manageSafe(houseData.id_name, val, type);
  };

  const handleHotspotClick = (action) => {
    if (action === 'enter') {
      setMode('interior');
    } else if (action === 'garage') {
      setGarage(houseData.id_name);
    }
  };

  // ===== EXTERIOR VIEW =====
  if (mode === 'exterior') {
    return (
      <div className="h-full w-full bg-[#050814] text-white overflow-hidden font-sans relative">
        {/* Transparent header overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 shrink-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-left">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Моя недвижимость</p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{houseData.name}</h2>
          </div>
          <button onClick={() => setInterior(null)} className="p-4 bg-red-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all"><LogOut /></button>
        </div>

        {/* Fullscreen image — object-cover fills entire screen */}
        <div ref={containerRef} className="absolute inset-0 bg-black overflow-hidden">
          {houseImage && (
            <>
              <img
                ref={imgRef}
                src={houseImage}
                alt={houseData.name}
                className="absolute inset-0 w-full h-full object-cover"
                onLoad={() => {
                  if (imgRef.current && containerRef.current) {
                    const img = imgRef.current;
                    const container = containerRef.current;
                    const cW = container.clientWidth;
                    const cH = container.clientHeight;
                    const nW = img.naturalWidth;
                    const nH = img.naturalHeight;
                    if (nW === 0 || nH === 0) return;
                    const scale = Math.max(cW / nW, cH / nH);
                    const drawW = nW * scale;
                    const drawH = nH * scale;
                    const offsetX = (cW - drawW) / 2;
                    const offsetY = (cH - drawH) / 2;
                    const positions = hotspots.map(hs => {
                      if (hs.type === 'rect') {
                        return {
                          id: hs.id,
                          action: hs.action,
                          label: hs.label || '',
                          left: offsetX + (hs.x / 100) * nW * scale,
                          top: offsetY + (hs.y / 100) * nH * scale,
                          width: (hs.w / 100) * nW * scale,
                          height: (hs.h / 100) * nH * scale,
                        };
                      }
                      return null;
                    }).filter(Boolean);
                    setHotspotPositions(positions);
                  }
                }}
              />
              {/* Hotspot overlays — clickable zones with labels */}
              {hotspotPositions.map((pos) => (
                <div
                  key={pos.id}
                  style={{
                    position: 'absolute',
                    left: `${pos.left}px`,
                    top: `${pos.top}px`,
                    width: `${pos.width}px`,
                    height: `${pos.height}px`,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleHotspotClick(pos.action)}
                >
                  <div className={`w-full h-full flex items-center justify-center transition-all duration-200 ${hoveredHotspot === pos.id ? 'bg-white/20 rounded-2xl' : 'bg-white/10 rounded-2xl'}`}
                    onMouseEnter={() => setHoveredHotspot(pos.id)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                  >
                    <span className="text-sm font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center pointer-events-none select-none">
                      {pos.label}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  // ===== INTERIOR VIEW =====
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
          <button onClick={() => setMode('exterior')} className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1 active:opacity-70">
            <ArrowLeft size={14} /> Назад к дому
          </button>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Моя недвижимость</p>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{houseData.name}</h2>
        </div>
        <button onClick={() => setInterior(null)} className="p-4 bg-red-600 text-white rounded-3xl shadow-lg active:scale-90 transition-all"><LogOut /></button>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-6 pb-32">
          
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