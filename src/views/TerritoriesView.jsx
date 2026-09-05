import React, { useEffect, useState } from 'react';
import { X, Map, Shield, DollarSign, Crosshair, Swords, Activity } from 'lucide-react';
import { useTerritoryStore } from '../store/useTerritoryStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { ORGANIZATIONS } from '../data/organizationsConfig';
import { getControlLevel, TERRITORY_STATUSES } from '../data/territoriesConfig';

export default function TerritoriesView({ onClose }) {
  const { territories, influences, isLoading, selectedTerritory, fetchTerritories, fetchInfluences, captureTerritory, loseTerritory, selectTerritory } = useTerritoryStore();
  const { organizations } = useOrganizationStore();
  const [tab, setTab] = useState('map');
  const [attacking, setAttacking] = useState(false);

  useEffect(() => {
    fetchTerritories();
    fetchInfluences();
  }, [fetchTerritories, fetchInfluences]);

  const playerGang = organizations.find(o => o.type === 'gang' || o.type === 'mafia');
  const playerGangId = playerGang?.id;

  const getGangName = (gangId) => {
    if (!gangId) return 'Нет';
    const org = ORGANIZATIONS.find(o => o.id === gangId);
    return org?.name || gangId;
  };

  const getGangColor = (gangId) => {
    if (!gangId) return 'bg-gray-500';
    const org = ORGANIZATIONS.find(o => o.id === gangId);
    return org?.color || 'bg-gray-500';
  };

  const getGangIcon = (gangId) => {
    if (!gangId) return '⚪';
    const org = ORGANIZATIONS.find(o => o.id === gangId);
    return org?.icon || '👤';
  };

  const getTerritoryInfluences = (territoryId) => {
    return influences
      .filter(i => i.territory_id === territoryId)
      .sort((a, b) => (b.influence || 0) - (a.influence || 0));
  };

  const handleCapture = async (territoryId) => {
    if (!playerGangId) {
      alert('Вы не состоите в банде!');
      return;
    }
    setAttacking(true);
    const ok = await captureTerritory(territoryId, playerGangId);
    setAttacking(false);
    if (ok) {
      alert('Территория захвачена!');
    } else {
      alert('Не удалось захватить территорию.');
    }
  };

  const handleLose = async (territoryId) => {
    if (!confirm('Вы уверены, что хотите abandon эту территорию?')) return;
    const ok = await loseTerritory(territoryId);
    if (ok) {
      alert('Территория потеряна.');
    }
  };

  const getTotalIncome = (gangId) => {
    return territories
      .filter(t => t.owner_gang_id === gangId)
      .reduce((sum, t) => sum + (t.base_income || 0), 0);
  };

  const controlledByPlayer = territories.filter(t => t.owner_gang_id === playerGangId);
  const neutralTerritories = territories.filter(t => !t.owner_gang_id);
  const enemyTerritories = territories.filter(t => t.owner_gang_id && t.owner_gang_id !== playerGangId);

  return (
    <div className="fixed inset-0 z-[500] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-red-950/90 to-gray-900 flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">Карта территорий</h1>
          <div className="w-10" />
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setTab('map')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === 'map' ? 'bg-red-900/60' : 'bg-white/5'
            }`}
          >
            <Map size={16} /> Карта
          </button>
          <button
            onClick={() => setTab('my')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === 'my' ? 'bg-red-900/60' : 'bg-white/5'
            }`}
          >
            <Shield size={16} /> Мои ({controlledByPlayer.length})
          </button>
          <button
            onClick={() => setTab('neutral')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === 'neutral' ? 'bg-red-900/60' : 'bg-white/5'
            }`}
          >
            <Crosshair size={16} /> Нейтральные ({neutralTerritories.length})
          </button>
          <button
            onClick={() => setTab('enemy')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === 'enemy' ? 'bg-red-900/60' : 'bg-white/5'
            }`}
          >
            <Swords size={16} /> Вражеские ({enemyTerritories.length})
          </button>
        </div>

        {tab === 'map' && (
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-red-900/30 to-transparent p-4 rounded-2xl border border-red-900/30">
              <div className="text-xs text-red-400 mb-2">Общий доход всех банд</div>
              <div className="grid grid-cols-2 gap-2">
                {ORGANIZATIONS.filter(o => o.type === 'gang' || o.type === 'mafia').map(gang => (
                  <div key={gang.id} className="bg-white/5 p-3 rounded-xl flex items-center gap-2">
                    <span className="text-xl">{gang.icon}</span>
                    <div>
                      <div className="text-xs font-black">{gang.name}</div>
                      <div className="text-[10px] text-slate-400">${getTotalIncome(gang.id).toLocaleString()} / час</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {territories.map(t => {
                const controlLevel = getControlLevel(t.control);
                const statusConfig = TERRITORY_STATUSES[t.status] || TERRITORY_STATUSES.NEUTRAL;
                const isPlayerTerritory = t.owner_gang_id === playerGangId;
                const territoryInfluences = getTerritoryInfluences(t.id);

                return (
                  <div
                    key={t.id}
                    onClick={() => selectTerritory(t.id)}
                    className={`bg-white/5 p-3 rounded-xl border cursor-pointer transition-all ${
                      isPlayerTerritory ? 'border-green-500/30' : 'border-white/10'
                    } ${selectedTerritory?.id === t.id ? 'ring-2 ring-red-500' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏙️</span>
                        <div>
                          <div className="text-sm font-black">{t.name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg ${statusConfig.color} text-white font-black`}>
                              {statusConfig.icon} {statusConfig.label}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg ${controlLevel.color} text-white font-black`}>
                              {controlLevel.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Контроль</div>
                        <div className="text-lg font-black">{t.control}%</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${getGangColor(t.owner_gang_id)} text-white font-black`}>
                          {getGangName(t.owner_gang_id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-blue-400">
                          <Activity size={12} />
                          <span className="text-xs font-black">{t.activity}%</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-400">
                          <DollarSign size={12} />
                          <span className="text-xs font-black">${t.base_income}/ч</span>
                        </div>
                      </div>
                    </div>

                    {territoryInfluences.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {territoryInfluences.map(influence => (
                          <div key={influence.id} className="flex items-center gap-2">
                            <span className="text-xs">{getGangIcon(influence.gang_id)}</span>
                            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${getGangColor(influence.gang_id)}`}
                                style={{ width: `${influence.influence}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 w-8 text-right">{influence.influence}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${controlLevel.color}`}
                        style={{ width: `${t.control}%` }}
                      />
                    </div>

                    {isPlayerTerritory && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLose(t.id); }}
                        className="mt-2 w-full bg-red-900/30 border border-red-900/40 py-2 rounded-xl text-xs font-black text-red-400 active:scale-95"
                      >
                        Оставить территорию
                      </button>
                    )}

                    {!t.owner_gang_id && playerGangId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCapture(t.id); }}
                        disabled={attacking}
                        className="mt-2 w-full bg-red-700 hover:bg-red-600 py-2 rounded-xl text-xs font-black active:scale-95 disabled:opacity-50"
                      >
                        Захватить
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'my' && (
          <div className="space-y-2">
            {controlledByPlayer.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8">У вас нет территорий</div>
            )}
            {controlledByPlayer.map(t => {
              const controlLevel = getControlLevel(t.control);
              const statusConfig = TERRITORY_STATUSES[t.status] || TERRITORY_STATUSES.NEUTRAL;
              const territoryInfluences = getTerritoryInfluences(t.id);

              return (
                <div key={t.id} className="bg-white/5 p-3 rounded-xl border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏙️</span>
                      <div>
                        <div className="text-sm font-black">{t.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg ${statusConfig.color} text-white font-black`}>
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg ${controlLevel.color} text-white font-black`}>
                            {controlLevel.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Доход</div>
                      <div className="text-sm font-black text-green-400">${t.base_income}/ч</div>
                    </div>
                  </div>

                  {territoryInfluences.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {territoryInfluences.map(influence => (
                        <div key={influence.id} className="flex items-center gap-2">
                          <span className="text-xs">{getGangIcon(influence.gang_id)}</span>
                          <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${getGangColor(influence.gang_id)}`}
                              style={{ width: `${influence.influence}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{influence.influence}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${controlLevel.color}`}
                      style={{ width: `${t.control}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'neutral' && (
          <div className="space-y-2">
            {neutralTerritories.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8">Нет нейтральных территорий</div>
            )}
            {neutralTerritories.map(t => {
              const territoryInfluences = getTerritoryInfluences(t.id);

              return (
                <div key={t.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏙️</span>
                      <div>
                        <div className="text-sm font-black">{t.name}</div>
                        <div className="text-[10px] text-slate-400">Нейтральная зона</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Активность</div>
                      <div className="text-sm font-black text-blue-400">{t.activity}%</div>
                    </div>
                  </div>

                  {territoryInfluences.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {territoryInfluences.map(influence => (
                        <div key={influence.id} className="flex items-center gap-2">
                          <span className="text-xs">{getGangIcon(influence.gang_id)}</span>
                          <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${getGangColor(influence.gang_id)}`}
                              style={{ width: `${influence.influence}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{influence.influence}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">Потенциальный доход</div>
                    <div className="text-sm font-black text-green-400">${t.base_income}/ч</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'enemy' && (
          <div className="space-y-2">
            {enemyTerritories.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8">Нет вражеских территорий</div>
            )}
            {enemyTerritories.map(t => {
              const controlLevel = getControlLevel(t.control);
              const statusConfig = TERRITORY_STATUSES[t.status] || TERRITORY_STATUSES.NEUTRAL;
              const territoryInfluences = getTerritoryInfluences(t.id);

              return (
                <div key={t.id} className="bg-white/5 p-3 rounded-xl border border-red-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏙️</span>
                      <div>
                        <div className="text-sm font-black">{t.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg ${getGangColor(t.owner_gang_id)} text-white font-black`}>
                            {getGangName(t.owner_gang_id)}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg ${statusConfig.color} text-white font-black`}>
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Доход</div>
                      <div className="text-sm font-black text-green-400">${t.base_income}/ч</div>
                    </div>
                  </div>

                  {territoryInfluences.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {territoryInfluences.map(influence => (
                        <div key={influence.id} className="flex items-center gap-2">
                          <span className="text-xs">{getGangIcon(influence.gang_id)}</span>
                          <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${getGangColor(influence.gang_id)}`}
                              style={{ width: `${influence.influence}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{influence.influence}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${controlLevel.color}`}
                      style={{ width: `${t.control}%` }}
                    />
                  </div>
                  {playerGangId && (
                    <button
                      onClick={() => handleCapture(t.id)}
                      disabled={attacking}
                      className="mt-2 w-full bg-red-700 hover:bg-red-600 py-2 rounded-xl text-xs font-black active:scale-95 disabled:opacity-50"
                    >
                      Атаковать
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 z-[600] bg-black/60 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Загрузка территорий...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
