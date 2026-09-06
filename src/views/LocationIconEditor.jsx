import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, Save, RotateCcw, Copy, Check } from 'lucide-react';
import { 
  DEFAULT_LOCATIONS, 
  saveLocationIcon, 
  resetLocationIcon, 
  resetAllLocationIcons, 
  loadLocationIcons,
  DEFAULT_LOCATION_ICONS 
} from '../data/locations';
import { isImageIcon } from '../utils/iconHelper';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { loadHouseIcons, saveHouseIcon, resetHouseIcon, resetAllHouseIcons } from '../data/houseStyles';

/**
 * Сжатие загружаемой иконки до компактного размера (96x96 px) в формате base64
 */
function compressImageBase64(base64, maxDim = 96, quality = 0.85) {
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
  const [copied, setCopied] = useState(false);
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

  // Загрузка файла иконки локации с конвертацией в Base64
  const handleFileChange = async (e, locId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const rawBase64 = ev.target.result;
        const compressed = await compressImageBase64(rawBase64, 96, 0.85);
        setIcons(prev => ({ ...prev, [locId]: compressed }));
        setPreviews(prev => ({ ...prev, [locId]: compressed }));
        setErrors(prev => ({ ...prev, [locId]: false }));
      } catch (err) {
        console.error('Ошибка загрузки иконки:', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTextChange = (locId, value) => {
    setIcons(prev => ({ ...prev, [locId]: value }));
    setPreviews(prev => ({ ...prev, [locId]: null }));
    setErrors(prev => ({ ...prev, [locId]: false }));
  };

  // Загрузка файла иконки дома
  const handleHouseFileChange = (key, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const rawBase64 = ev.target.result;
        const compressed = await compressImageBase64(rawBase64, 96, 0.85);
        setHouseIcons(prev => ({ ...prev, [key]: compressed }));
        setHousePreviews(prev => ({ ...prev, [key]: compressed }));
        setHouseErrors(prev => ({ ...prev, [key]: false }));
      } catch (err) {
        console.error('Ошибка загрузки иконки дома:', err);
      }
    };
    reader.readAsDataURL(file);
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
    alert('Иконки успешно сохранены в память браузера!');
  };

  // Экспорт готового объекта для вставки в locations.js (чтобы применить для Telegram)
  const handleCopyCode = () => {
    const activeIcons = {};
    Object.entries(icons).forEach(([k, v]) => {
      if (v) activeIcons[k] = v;
    });

    const code = `export const DEFAULT_LOCATION_ICONS = ${JSON.stringify(activeIcons, null, 2)};`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    alert('📋 Код иконок скопирован! Замените DEFAULT_LOCATION_ICONS в файле src/data/locations.js и запушьте в Git.');
  };

  const handleResetAll = async () => {
    if (!confirm('Сбросить все иконки локаций и домов к исходным?')) return;
    await resetAllLocationIcons();
    await resetAllHouseIcons();
    setIcons(DEFAULT_LOCATION_ICONS || {});
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
      {/* Верхняя панель управления */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 active:scale-95">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>
        <h2 className="text-sm font-black uppercase tracking-wider">Редактор иконок локаций</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopyCode} 
            className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95"
            title="Скопировать готовый код для locations.js"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Скопировано!' : 'Экспорт кода'}</span>
          </button>
          <button onClick={handleResetAll} className="px-3 py-2 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/50 text-xs font-black active:scale-95">
            Сбросить
          </button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black flex items-center gap-2 shadow-lg active:scale-95">
            <Save className="h-4 w-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="🔍 Поиск локаций по названию или ID..." 
          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm mb-4 outline-none focus:border-cyan-500" 
        />

        {/* Иконки домов */}
        <h3 className="text-xs font-black uppercase text-slate-400 mb-2">Иконки домов (по классу и статусу)</h3>
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
                        <img src={preview} className="w-8 h-8 object-contain" alt="" />
                      ) : hasError ? (
                        <span className="text-xl">🏠</span>
                      ) : isImageIcon(icon) ? (
                        <img src={icon} className="w-8 h-8 object-contain" onError={() => setHouseErrors(prev => ({ ...prev, [key]: true }))} alt="" />
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
                      placeholder="Эмодзи, URL или Base64"
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                    <input
                      ref={el => fileRefs.current[key] = el}
                      type="file"
                      accept="image/*"
                      onChange={e => handleHouseFileChange(key, e)}
                      className="hidden"
                    />
                    <button type="button" onClick={() => fileRefs.current[key]?.click()} className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 active:scale-90" title="Загрузить картинку">
                      <Upload className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleResetHouseOne(key)} className="p-2 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 active:scale-90" title="Сбросить">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Иконки локаций */}
        <h3 className="text-xs font-black uppercase text-slate-400 mb-2">Иконки городских локаций</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.filter(l => l.type !== 'house').map(loc => {
            const icon = icons[loc.id] || DEFAULT_LOCATION_ICONS[loc.id] || loc.icon || '';
            const preview = previews[loc.id];
            const hasError = errors[loc.id];
            return (
              <div key={loc.id} className="p-3 rounded-2xl border border-white/10 bg-white/5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center overflow-hidden shrink-0">
                    {preview ? (
                      <img src={preview} className="w-8 h-8 object-contain" alt="" />
                    ) : hasError ? (
                      <span className="text-xl">📌</span>
                    ) : isImageIcon(icon) ? (
                      <img src={icon} className="w-8 h-8 object-contain" onError={() => setErrors(prev => ({ ...prev, [loc.id]: true }))} alt="" />
                    ) : (
                      <span className="text-xl">{icon || '📌'}</span>
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
                    placeholder="Эмодзи, URL или Base64"
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    ref={el => fileRefs.current[loc.id] = el}
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileChange(e, loc.id)}
                    className="hidden"
                  />
                  <button type="button" onClick={() => fileRefs.current[loc.id]?.click()} className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 active:scale-90" title="Загрузить картинку">
                    <Upload className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleResetLocationOne(loc.id)} className="p-2 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 active:scale-90" title="Сбросить">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.filter(l => l.type !== 'house').length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">Локации не найдены</p>
        )}
      </div>
    </div>
  );
}