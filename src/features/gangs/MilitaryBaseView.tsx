import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, RotateCw } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useTimeStore, getGameTime } from '../../stores/useTimeStore';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { PHASE_ICON, PHASE_LABEL } from '../../game/time/gameClock';
import { GANGS } from './data/organizationsConfig';
import {
  MATERIALS_ITEM_KEY,
  checkStealMaterials,
  stealMaterials,
  type StealMaterialsResult,
} from './militaryBase';

interface MilitaryBaseViewProps {
  onClose: () => void;
}

/**
 * Панель военной базы — итог попытки ограбления.
 *
 * Добычу считает сервер: здесь только предварительная проверка (чтобы
 * не слать заведомо обречённый запрос) и вызов steal_materials.
 * Кнопка «Ещё раз» пересчитывает попытку на свежую минуту — ночь
 * приходит по игровым часам, и её можно дождаться прямо здесь.
 */
export default function MilitaryBaseView({ onClose }: MilitaryBaseViewProps) {
  const player = usePlayerStore((s) => s.player);
  const hour = useTimeStore((s) => s.hour);
  const minute = useTimeStore((s) => s.minute);
  const phase = useTimeStore((s) => s.phase);

  const inventoryItems = useInventoryStore((s) => s.items);
  const fetchPlayerInventory = useInventoryStore((s) => s.fetchPlayerInventory);

  const [result, setResult] = useState<StealMaterialsResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Флаг занятости держим в ref, а не в состоянии: от него зависел
  // бы useCallback, а значит и эффект ниже, и панель после каждой
  // попытки перезапускала бы сама себя — с запросом в базу по кругу.
  const busyRef = useRef(false);

  const gangId = player?.organization_id ?? null;
  const gang = GANGS.find((g) => g.id === gangId);

  // Сколько материалов уже в сумке: после кражи счётчик должен
  // поехать сразу, без ручного обновления инвентаря.
  const stored = useMemo(() => {
    const row = inventoryItems.find((i) => i.item_id === MATERIALS_ITEM_KEY);
    return row ? Number(row.amount) : 0;
  }, [inventoryItems]);

  const attempt = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);

    try {
      // Предварительно: без банды или не ночью сервер всё равно
      // откажет, а игрок получит ответ без похода в сеть.
      const local = checkStealMaterials(gangId, getGameTime());
      if (!local.ok) {
        setResult(local);
        return;
      }

      const res = await stealMaterials(player?.id);
      setResult(res);
      if (res.ok) await fetchPlayerInventory();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [gangId, player?.id, fetchPlayerInventory]);

  // Первая попытка — сразу при открытии: игрок нажал на хотспот,
  // значит уже хочет попробовать. Зависимость attempt стабильна,
  // поэтому эффект срабатывает один раз, а не после каждой отметки
  // времени.
  useEffect(() => {
    void attempt();
  }, [attempt]);

  const accent = result
    ? result.ok
      ? 'border-green-500/40'
      : result.blocked === 'not_night'
        ? 'border-amber-500/40'
        : 'border-red-500/40'
    : 'border-white/10';

  return (
    <div className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-6 font-sans">
      <div className={`w-full max-w-sm bg-[#0a0f1a] border ${accent} rounded-[32px] p-6 text-white shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-1">
              Военный объект
            </p>
            <h3 className="text-lg font-black uppercase italic leading-none">
              🪖 Склад материалов
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 rounded-2xl active:scale-90 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Обстановка на складе: без неё игрок не понимает,
            чего именно ему не хватает — банды или темноты. */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-3 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Сейчас</p>
            <p className="font-black text-lg">
              {PHASE_ICON[phase]} {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </p>
            <p className="text-[10px] font-black uppercase text-slate-500">{PHASE_LABEL[phase]}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-3 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Банда</p>
            <p className="font-black text-sm truncate">{gang ? gang.name : '—'}</p>
            <p className="text-[10px] font-black uppercase text-slate-500">
              {gang ? 'доступ есть' : 'нужна уличная банда'}
            </p>
          </div>
        </div>

        {result && (
          <div className={`mb-4 p-4 rounded-2xl border ${accent} bg-black/40`}>
            <p className="font-black uppercase italic text-sm mb-1">{result.title}</p>
            <p className="text-xs text-slate-300 leading-relaxed">{result.text}</p>
          </div>
        )}

        {/* Добыча видна сразу: игрок должен видеть, что материалы
            действительно пришли, а не просто «получилось». */}
        {result?.ok && (
          <div className="mb-4 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3">
            <span className="text-xs font-black uppercase text-emerald-300">🔩 В сумке</span>
            <span className="font-black text-xl">{stored} шт</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => void attempt()}
            disabled={busy}
            className="flex-1 py-3 rounded-[32px] text-sm font-black uppercase italic border border-white/10 bg-white/5 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RotateCw size={14} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Ломаем замок' : 'Ещё раз'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-[32px] text-sm font-black uppercase italic bg-green-600 active:scale-95"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}