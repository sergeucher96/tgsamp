import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, Save, RotateCcw, X } from 'lucide-react';
import { DEFAULT_LOCATIONS, saveLocationIcon, resetLocationIcon, resetAllLocationIcons, loadLocationIcons } from '../data/locations';
import { isImageIcon } from '../utils/iconHelper';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { loadHouseIcons, saveHouseIcon, resetHouseIcon, resetAllHouseIcons, getHouseIconKey } from '../data/houseStyles';

function compressImageBase64(base64, maxDim = 128, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export default function LocationIconEditor({ onClose }) {
  const [icons, setIcons] = useState({});
  const [houseIcons, setHouseIcons] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [previews, setPreviews] = useState({});
  const [housePreviews, setHousePreviews] = useState({});
  const [errors, setErrors] = useState({});
  const [houseErrors, setHouseErrors] = useState({});
  const fileRefs = useRef({});

  useEffect(() => {
    setIcons(loadLocationIcons());
    setHouseIcons(loadHouseIcons());
  }, []);

  const handleFileChange = async (e, locId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filename = file.name;
    const path = `/icons/locations/${filename}`;
    setIcons(prev => ({ ...prev, [locId]: path }));
    setPreviews(prev => ({ ...prev, [locId]: URL.createObjectURL(file) }));
    setErrors(prev => ({ ...prev, [locId]: false }));
    e.target.value = '';
  };

  const handleTextChange = (locId, value) => {
    setIcons(prev => ({ ...prev, [locId]: value }));
    setPreviews(prev => ({ ...prev, [locId]: null }));
    setErrors(prev => ({ ...prev, [locId]: false }));
  };

  const handleHouseFileChange = (key, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filename = file.name;
    const path = `/icons/locations/${filename}`;
    setHouseIcons(prev => ({ ...prev, [key]: path }));
    setHousePreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
    setHouseErrors(prev => ({ ...prev, [key]: false }));
    e.target.value = '';
  };

  const handleHouseTextChange = (key, value) => {
    setHouseIcons(prev => ({ ...prev, [key]: value }));
    setHousePreviews(prev => ({ ...prev, [key]: null }));
    setHouseErrors(prev => ({ ...prev, [key]: false }));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const loc of DEFAULT_LOCATIONS) {
      const icon = icons[loc.id] || '';
      await saveLocationIcon(loc.id, icon);
    }
    for (const [key, icon] of Object.entries(houseIcons)) {
      await saveHouseIcon(key, icon);
    }
    setSaving(false);
    alert('Иконки сохранены');
  };

  const handleResetAll = async () => {
    if (!confirm('Сбросить все иконки локаций и домов?')) return;
    await resetAllLocationIcons();
    await resetAllHouseIcons();
    setIcons({});
    setHouseIcons({});
    setPreviews({});
    setHousePreviews({});
    setErrors({});
    setHouseErrors({});
  };

  const handleResetLocationOne = async (locId) => {
    await resetLocationIcon(locId);
    setIcons(prev => {
      const next = { ...prev };
      delete next[locId];
      return next;
    });
    setPreviews(prev => {
      const next = { ...prev };
      delete next[locId];
      return next;
    });
    setErrors(prev => {
      const next = { ...prev };
      delete next[locId];
      return next;
    });
  };

  const handleResetHouseOne = async (key) => {
    await resetHouseIcon(key);
    setHouseIcons(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setHousePreviews(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setHouseErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const filtered = DEFAULT_LOCATIONS.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[600] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>
        <h2 className="text-sm font-black uppercase">Иконки локаций</h2>
        <div className="flex gap-2">
          <button onClick={handleResetAll} className="px-3 py-2 rounded-xl bg-red-900/30 text-red-400 text-xs font-black">Сбросить все</button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-2 rounded-xl bg-green-600 text-xs font-black flex items-center gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
      <div className="p-4 overflow-y-auto flex-1">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Поиск локаций..." className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm mb-4" />
        
        <h3 className="text-xs font-black uppercase text-slate-400 mb-2">Иконки домов (по классу и состоянию)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {Object.entries(HOUSE_CLASSES).flatMap(([clsKey, clsData]) =>
            ['free', 'player', 'occupied'].map(stateKey => {
              const key = `${clsKey}-${stateKey}`;
              const icon = houseIcons[key] || '';
              const preview = housePreviews[key];
              const hasError = houseErrors[key];
              const stateLabels = { free: 'Свободен', player: 'Игрока', occupied: 'Занят' };
              return (
                <div key={key} className="p-3 rounded-2xl border border-white/10 bg-white/5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center overflow-hidden shrink-0">
                      {preview ? (
                        <img src={preview} className="w-8 h-8 object-contain" />
                      ) : hasError ? (
                        <span className="text-xl">🏠</span>
                      ) : isImageIcon(icon) ? (
                        <img src={icon} className="w-8 h-8 object-contain" onError={() => setHouseErrors(prev => ({ ...prev, [key]: true }))} />
                      ) : (
                        <span className="text-xl">{icon || '🏠'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">{clsData.name}</p>
                      <p className="text-[10px] text-slate-400">{stateLabels[stateKey]}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={icon}
                      onChange={e => handleHouseTextChange(key, e.target.value)}
                      placeholder="Иконка (эмодзи или путь)"
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      ref={el => fileRefs.current[key] = el}
                      type="file"
                      accept="image/*"
                      onChange={e => handleHouseFileChange(key, e)}
                      className="hidden"
                    />
                    <button type="button" onClick={() => fileRefs.current[key]?.click()} className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 active:scale-90" title="Рекомендуемый размер: 64×64 или 128×128 px">
                      <Upload className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleResetHouseOne(key)} className="p-2 rounded-xl bg-red-900/20 text-red-400 border border-red-500/30 active:scale-90" title="Сбросить">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <h3 className="text-xs font-black uppercase text-slate-400 mb-2">Иконки остальных локаций</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.filter(l => l.type !== 'house').map(loc => {
            const icon = icons[loc.id] || '';
            const preview = previews[loc.id];
            const hasError = errors[loc.id];
            return (
              <div key={loc.id} className="p-3 rounded-2xl border border-white/10 bg-white/5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center overflow-hidden shrink-0">
                    {preview ? (
                      <img src={preview} className="w-8 h-8 object-contain" />
                    ) : hasError ? (
                      <span className="text-xl">📌</span>
                    ) : isImageIcon(icon) ? (
                      <img src={icon} className="w-8 h-8 object-contain" onError={() => setErrors(prev => ({ ...prev, [loc.id]: true }))} />
                    ) : (
                      <span className="text-xl">{icon || loc.icon || '📌'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{loc.name}</p>
                    <p className="text-[10px] text-slate-400">{loc.id} • {loc.type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={icon}
                    onChange={e => handleTextChange(loc.id, e.target.value)}
                    placeholder="Иконка (эмодзи или путь)"
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs"
                  />
                  <input
                    ref={el => fileRefs.current[loc.id] = el}
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileChange(e, loc.id)}
                    className="hidden"
                  />
                  <button type="button" onClick={() => fileRefs.current[loc.id]?.click()} className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 active:scale-90" title="Рекомендуемый размер: 64×64 или 128×128 px">
                    <Upload className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleResetLocationOne(loc.id)} className="p-2 rounded-xl bg-red-900/20 text-red-400 border border-red-500/30 active:scale-90" title="Сбросить">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.filter(l => l.type !== 'house').length === 0 && <p className="text-center text-slate-500 text-sm py-8">Нет локаций</p>}
      </div>
    </div>
  );
}
