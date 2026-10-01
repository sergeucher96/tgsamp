import React, { useEffect, useState } from 'react';
import { X, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { GANGS, GANG_RANKS, WAR_CONFIG } from './data/organizationsConfig';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useWarStore } from '../../stores/useWarStore';

interface GangRanksEditorProps { onClose: () => void; }

/** Строка из org_ranks. */
interface RankRow {
  id: number;
  rank_number: number;
  rank_level: number;
  rank_name: string;
  war_points_per_min: number | null;
  salary: number;
}

interface Draft {
  rank_name: string;
  war_points_per_min: number;
}

/** Длительность войны в минутах — для прикидки очков прямо в редакторе. */
const WAR_DURATION_MIN = Math.round(WAR_CONFIG.durationMs / 60000);

/**
 * Редактор рангов для разработчика.
 *
 * Позволяет переименовать ранги банды и задать, сколько очков в
 * минуту даёт ранг в войне за территорию. Раньше множитель был
 * жёстко равен номеру ранга, и поменять его можно было только
 * в коде.
 *
 * Ранги правятся по id, а не по имени: переименование не должно
 * ломать уже записанные war_sessions.
 */
export default function GangRanksEditor({ onClose }: GangRanksEditorProps) {
  const fetchMembers = useOrganizationStore((s) => s.fetchMembers);
  const refreshMyRank = useWarStore((s) => s.refreshMyRank);

  const [orgId, setOrgId] = useState(GANGS[0].id);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [draft, setDraft] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null);

  const load = async (targetOrgId: string) => {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from('org_ranks')
      .select('id, rank_number, rank_level, rank_name, war_points_per_min, salary')
      .eq('org_id', targetOrgId)
      .order('rank_number', { ascending: true });

    if (error) {
      // Колонка war_points_per_min появляется только после миграции.
      setMessage({ text: `Не удалось загрузить ранги: ${error.message}`, kind: 'error' });
      setRows([]);
      setDraft({});
    } else {
      const list = (data ?? []) as RankRow[];
      setRows(list);
      setDraft(Object.fromEntries(list.map(r => [
        r.id,
        {
          rank_name: r.rank_name,
          // До применения миграции колонка придёт null — показываем
          // номер ранга, как считали раньше.
          war_points_per_min: r.war_points_per_min ?? r.rank_number,
        },
      ])));
    }

    setLoading(false);
  };

  useEffect(() => {
    load(orgId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const dirty = rows.some(r => {
    const d = draft[r.id];
    if (!d) return false;
    return d.rank_name !== r.rank_name || d.war_points_per_min !== r.war_points_per_min;
  });

  const setField = (id: number, field: keyof Draft, value: string) => {
    setDraft(prev => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          [field]: field === 'war_points_per_min' ? Math.max(0, Math.min(999, Number(value) || 0)) : value,
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const values = rows.map(r => draft[r.id]).filter(Boolean);
    if (values.some(d => !d.rank_name.trim())) {
      setMessage({ text: 'Название ранга не может быть пустым', kind: 'error' });
      setSaving(false);
      return;
    }

    // Имена уникальны внутри банды: два одинаковых нарушат
    // unique(org_id, rank_name), и всё сохранение упадёт.
    const names = values.map(d => d.rank_name.trim().toLowerCase());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) {
      setMessage({ text: `Название повторяется: «${dup}»`, kind: 'error' });
      setSaving(false);
      return;
    }

    for (const r of rows) {
      const d = draft[r.id];
      const { error } = await supabase
        .from('org_ranks')
        .update({ rank_name: d.rank_name.trim(), war_points_per_min: d.war_points_per_min })
        .eq('id', r.id);

      if (error) {
        setMessage({ text: `Ранг ${r.rank_number} не сохранён: ${error.message}`, kind: 'error' });
        setSaving(false);
        return;
      }
    }

    // Имя ранга хранится ещё в org_members и profiles. Обновив только
    // справочник, мы оставим игроков с рангом, которого больше нет,
    // и проверки прав в GangView перестанут их находить.
    await syncRankNames(orgId, rows, draft);

    setSaving(false);
    setMessage({ text: 'Сохранено', kind: 'ok' });
    await load(orgId);
    fetchMembers(orgId);
    refreshMyRank();
  };

  const handleReset = async () => {
    if (!confirm('Вернуть ранги «Ранг 1…10» и очки, равные номеру ранга?')) return;

    for (const r of rows) {
      const fallback = GANG_RANKS[r.rank_number - 1];
      await supabase
        .from('org_ranks')
        .update({
          rank_name: fallback ? fallback.rank_name : `Ранг ${r.rank_number}`,
          war_points_per_min: r.rank_number,
        })
        .eq('id', r.id);
    }
    await load(orgId);
    setMessage({ text: 'Возвращены ранги по умолчанию', kind: 'ok' });
  };

  const activeGang = GANGS.find(g => g.id === orgId);

  return (
    <div className="fixed inset-0 z-[700] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-gray-900 to-black flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">Ранги банд</h1>
          <div className="w-10" />
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {GANGS.map(g => (
            <button
              key={g.id}
              onClick={() => setOrgId(g.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap ${
                orgId === g.id ? g.color : 'bg-white/5'
              }`}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-900/20 border border-amber-700/40 text-[11px] text-amber-200 mb-4">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            Инструмент для разработчика. Очки в минуту влияют только на войны,
            начатые после сохранения: у уже идущих войн очки не пересчитываются.
          </span>
        </div>

        {message && (
          <div className={`mb-3 p-3 rounded-xl border text-xs ${
            message.kind === 'error'
              ? 'bg-red-900/30 border-red-700/40 text-red-300'
              : 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center text-xs text-slate-400 py-8">Загрузка рангов...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400">
            Ранги не найдены. Проверьте, что применена миграция
            <code className="block mt-2 text-amber-300">gang_ranks_war_points_migration.sql</code>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {rows.map(r => {
                const d = draft[r.id];
                if (!d) return null;
                return (
                  <div key={r.id} className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        Ранг {r.rank_number}
                      </span>
                      <span className="text-[10px] text-slate-500">уровень {r.rank_level}</span>
                    </div>

                    <div className="flex gap-2 items-end">
                      <label className="flex-1">
                        <span className="text-[10px] text-slate-400 block mb-1">Название</span>
                        <input
                          value={d.rank_name}
                          onChange={e => setField(r.id, 'rank_name', e.target.value)}
                          className="w-full bg-white/10 p-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50"
                        />
                      </label>

                      <label className="w-28">
                        <span className="text-[10px] text-slate-400 block mb-1">Очки/мин</span>
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={d.war_points_per_min}
                          onChange={e => setField(r.id, 'war_points_per_min', e.target.value)}
                          className="w-full bg-white/10 p-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50"
                        />
                      </label>
                    </div>

                    <div className="mt-1.5 text-[10px] text-slate-500">
                      За {WAR_DURATION_MIN} мин войны даст{' '}
                      <span className="text-emerald-400 font-black">
                        {d.war_points_per_min * WAR_DURATION_MIN}
                      </span>{' '}
                      очков · зарплата ${r.salary}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 font-black text-xs active:scale-95 disabled:opacity-40"
              >
                <RotateCcw size={14} /> Сброс
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-emerald-700 font-black text-sm active:scale-95 disabled:opacity-40"
              >
                {saving ? 'Сохранение...' : <><Save size={14} /> Сохранить</>}
              </button>
            </div>

            {dirty && (
              <div className="mt-2 text-center text-[10px] text-amber-400">
                Есть несохранённые изменения
              </div>
            )}

            {activeGang && (
              <div className="mt-4 text-[10px] text-slate-500 text-center">
                Банда: {activeGang.name}. Ранги применяются только к ней.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Проставляет новые имена рангов участникам банды и их профилям.
 *
 * Список берём из org_ranks ДО переименования (rows), а новые имена —
 * из draft, поэтому старое имя известно и его можно заменить.
 */
async function syncRankNames(
  orgId: string,
  rows: RankRow[],
  draft: Record<number, Draft>
) {
  for (const r of rows) {
    const newName = draft[r.id]?.rank_name.trim();
    if (!newName || newName === r.rank_name) continue;

    await supabase
      .from('org_members')
      .update({ rank_name: newName })
      .eq('org_id', orgId)
      .eq('rank_name', r.rank_name);

    await supabase
      .from('profiles')
      .update({ organization_rank: newName })
      .eq('organization_id', orgId)
      .eq('organization_rank', r.rank_name);
  }
}
