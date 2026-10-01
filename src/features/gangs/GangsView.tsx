import React, { useMemo, useState } from 'react';
import { X, MapPin, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useTerritoryStore } from '../../stores/useTerritoryStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { GANGS, getGang } from './data/organizationsConfig';
import GangView from './GangView';

interface GangsViewProps { onClose: () => void; }

// Экран-хаб: список всех банд со сводкой, а для члена банды — вход в её панель.
export default function GangsView({ onClose }: GangsViewProps) {
  const { player } = usePlayerStore();
  const { territories } = useTerritoryStore();
  const { organizations, joinOrganization, fetchMembers } = useOrganizationStore();
  const [joining, setJoining] = useState<string | null>(null);
  const [openOrgId, setOpenOrgId] = useState<string | null>(null);

  // Только банды: остальные организации (LSPD, мэрия) в этот список не попадают.
  const myGangId = GANGS.some(g => g.id === player?.organization_id)
    ? player?.organization_id
    : null;
  const inOtherOrg = !!player?.organization_id && !myGangId;

  const zonesByGang = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of territories) {
      if (!t.owner_gang_id) continue;
      counts[t.owner_gang_id] = (counts[t.owner_gang_id] || 0) + 1;
    }
    return counts;
  }, [territories]);

  const handleJoin = async (orgId: string) => {
    if (joining) return;
    setJoining(orgId);
    const ok = await joinOrganization(orgId);
    setJoining(null);
    if (ok) {
      await fetchMembers(orgId);
      setOpenOrgId(orgId);
    }
  };

  if (openOrgId) {
    return <GangView orgId={openOrgId} onClose={() => setOpenOrgId(null)} />;
  }

  return (
    <div className="fixed inset-0 z-[500] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-red-950/90 to-gray-900 flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">Банды</h1>
          <div className="w-10" />
        </div>

        {myGangId && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-900/30 border border-emerald-700/40 text-xs text-emerald-200">
            Вы состоите в банде «{getGang(myGangId)?.name}». Чтобы сменить банду, выйдите из текущей.
          </div>
        )}

        {inOtherOrg && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-900/30 border border-amber-700/40 text-xs text-amber-200">
            Вы работаете в «{organizations.find(o => o.id === player?.organization_id)?.name}».
            Чтобы вступить в банду, сначала уйдите из текущей организации.
          </div>
        )}

        <div className="space-y-3">
          {GANGS.map(gang => {
            const isMine = gang.id === myGangId;
            const zones = zonesByGang[gang.id] || 0;

            return (
              <div
                key={gang.id}
                className={`rounded-2xl overflow-hidden border ${
                  isMine ? 'border-emerald-600/60 bg-emerald-950/30' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-11 h-11 rounded-xl ${gang.color} flex items-center justify-center text-xl`}>
                      {gang.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-black">{gang.name}{isMine && ' — ваша банда'}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin size={10} /> зон: {zones}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{gang.description}</p>
                </div>

                {isMine ? (
                  <button
                    onClick={() => setOpenOrgId(gang.id)}
                    className="w-full py-3 bg-emerald-800/60 font-black text-sm flex items-center justify-center gap-1 active:scale-95"
                  >
                    Открыть панель банды <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoin(gang.id)}
                    disabled={!!myGangId || inOtherOrg || !!joining}
                    className={`w-full py-3 font-black text-sm active:scale-95 ${
                      myGangId || inOtherOrg
                        ? 'bg-white/5 text-slate-500'
                        : joining === gang.id
                          ? 'bg-white/10 text-slate-400'
                          : 'bg-red-800/60 hover:bg-red-700/60'
                    }`}
                  >
                    {joining === gang.id ? 'Вступление...' : 'Вступить'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
