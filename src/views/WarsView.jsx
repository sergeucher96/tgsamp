import React, { useEffect, useState } from 'react';
import { X, Swords, Crosshair, Clock, Users, MapPin } from 'lucide-react';
import { useWarStore } from '../store/useWarStore';
import { useTerritoryStore } from '../store/useTerritoryStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { ORGANIZATIONS, CRIMINAL_ORGANIZATIONS } from '../data/organizationsConfig';
import { WAR_STATUSES, EVENT_TYPES, EVENT_RESULTS } from '../store/useWarStore';
import { getAvailableActions } from '../utils/warScoring';

export default function WarsView({ onClose, territoryId }) {
  const {
    wars,
    events,
    participants,
    selectedWar,
    selectedEvent,
    isLoading,
    fetchWars,
    fetchEvents,
    fetchParticipants,
    createWar,
    startWar,
    endWar,
    createEvent,
    performPlayerAction,
  } = useWarStore();
  const { territories, fetchTerritories } = useTerritoryStore();
  const { organizations } = useOrganizationStore();
  const { player } = usePlayerStore();
  const [tab, setTab] = useState('wars');
  const [creatingWar, setCreatingWar] = useState(false);

  useEffect(() => {
    fetchTerritories();
    fetchWars(territoryId);
  }, [fetchTerritories, fetchWars, territoryId]);

  useEffect(() => {
    if (selectedWar) {
      fetchEvents(selectedWar.id);
      fetchParticipants(selectedWar.id, null);
    }
  }, [selectedWar, fetchEvents, fetchParticipants]);

  const playerGang = player?.organization_id ? CRIMINAL_ORGANIZATIONS.find(o => o.id === player.organization_id) : null;
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

  const getTerritoryName = (territoryId) => {
    const territory = territories.find(t => t.id === territoryId);
    return territory?.name || `Территория #${territoryId}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case WAR_STATUSES.WAR_PREPARATION:
        return 'Подготовка к войне';
      case WAR_STATUSES.WAR_ACTIVE:
        return 'Активная война';
      case WAR_STATUSES.ENDED:
        return 'Завершена';
      default:
        return status;
    }
  };

  const getEventTypeLabel = (type) => {
    switch (type) {
      case EVENT_TYPES.SHOOTOUT:
        return 'Уличная перестрелка';
      case EVENT_TYPES.AMBUSH:
        return 'Засада';
      case EVENT_TYPES.STREET_FIGHT:
        return 'Уличный бой';
      case EVENT_TYPES.RECON:
        return 'Разведка';
      case EVENT_TYPES.DEFENSE:
        return 'Оборона';
      case EVENT_TYPES.ATTACK:
        return 'Атака';
      case EVENT_TYPES.SUPPLY:
        return 'Снабжение';
      default:
        return type;
    }
  };

  const getResultLabel = (result) => {
    switch (result) {
      case EVENT_RESULTS.ATTACKER_WIN:
        return 'Победа атакующих';
      case EVENT_RESULTS.DEFENDER_WIN:
        return 'Победа защитников';
      case EVENT_RESULTS.DRAW:
        return 'Ничья';
      default:
        return result || 'В процессе';
    }
  };

  const formatTimeLeft = (endsAt) => {
    if (!endsAt) return '--:--';
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end - now;
    if (diff <= 0) return '00:00';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleDeclareWar = async (territoryId, attackerGangId, defenderGangId) => {
    setCreatingWar(true);
    const war = await createWar(territoryId, attackerGangId, defenderGangId);
    setCreatingWar(false);
    if (war) {
      alert('Война объявлена! Подготовка началась.');
    } else {
      alert('Не удалось объявить войну.');
    }
  };

  const handleStartWar = async (warId) => {
    const ok = await startWar(warId);
    if (ok) {
      alert('Война началась!');
    } else {
      alert('Не удалось начать войну.');
    }
  };

  const handleEndWar = async (warId) => {
    if (!confirm('Завершить войну?')) return;
    const ok = await endWar(warId);
    if (ok) {
      alert('Война завершена.');
    } else {
      alert('Не удалось завершить войну.');
    }
  };

  const handleCreateEvent = async (warId, territoryId, type) => {
    const war = wars.find(w => w.id === warId);
    if (!war) return;
    const event = await createEvent(warId, territoryId, type, war.attacker_gang_id, war.defender_gang_id);
    if (event) {
      alert('Событие создано!');
    } else {
      alert('Не удалось создать событие.');
    }
  };

  const handlePlayerAction = async (event, action) => {
    if (!playerGangId || !player?.id) {
      alert('Вы не состоите в банде или не авторизованы!');
      return;
    }

    const isInvolved = event.attacker_gang_id === playerGangId || event.defender_gang_id === playerGangId;
    if (!isInvolved) {
      alert('Ваша банда не участвует в этом событии.');
      return;
    }

    const result = await performPlayerAction(event.id, selectedWar.id, event.territory_id, player.id, playerGangId, action);
    if (result?.outcome) {
      alert(`Действие "${action}" выполнено. Исход: ${getResultLabel(result.outcome.result)}`);
    } else if (result) {
      alert(`Действие "${action}" выполнено. Вклад: ${result.contribution}`);
    } else {
      alert('Не удалось выполнить действие.');
    }
  };

  const activeWars = wars.filter(w => w.status === WAR_STATUSES.WAR_ACTIVE);
  const preparationWars = wars.filter(w => w.status === WAR_STATUSES.WAR_PREPARATION);

  return (
    <div className="fixed inset-0 z-[500] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-red-950/90 to-gray-900 flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">Войны</h1>
          <div className="w-10" />
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setTab('wars')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === 'wars' ? 'bg-red-900/60' : 'bg-white/5'
            }`}
          >
            <Swords size={16} /> Войны
          </button>
          <button
            onClick={() => setTab('events')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === 'events' ? 'bg-red-900/60' : 'bg-white/5'
            }`}
          >
            <Crosshair size={16} /> События
          </button>
          <button
            onClick={() => setTab('participants')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === 'participants' ? 'bg-red-900/60' : 'bg-white/5'
            }`}
          >
            <Users size={16} /> Участники
          </button>
        </div>

        {tab === 'wars' && (
          <div className="space-y-3">
            {territories.filter(t => {
              const ownerGangId = t.owner_gang_id;
              if (!ownerGangId || ownerGangId === playerGangId) return false;
              return CRIMINAL_ORGANIZATIONS.some(org => org.id === ownerGangId);
            }).map(t => {
              const territoryWars = wars.filter(w => w.territory_id === t.id);
              const hasActiveWar = territoryWars.some(w => w.status === WAR_STATUSES.WAR_ACTIVE);
              const hasPreparation = territoryWars.some(w => w.status === WAR_STATUSES.WAR_PREPARATION);

              return (
                <div key={t.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-red-400" />
                      <div>
                        <div className="text-sm font-black">{t.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {getGangName(t.owner_gang_id)} • Контроль {t.control}%
                        </div>
                      </div>
                    </div>
                    {!hasActiveWar && !hasPreparation && playerGangId && (
                      <button
                        onClick={() => handleDeclareWar(t.id, playerGangId, t.owner_gang_id)}
                        disabled={creatingWar}
                        className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-xl text-[10px] font-black active:scale-95 disabled:opacity-50"
                      >
                        Объявить войну
                      </button>
                    )}
                  </div>

                  {territoryWars.map(war => (
                    <div key={war.id} className="mt-2 bg-black/20 p-2 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Swords size={14} className="text-red-400" />
                          <span className="text-xs font-black">Война #{war.id}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${
                          war.status === WAR_STATUSES.WAR_ACTIVE ? 'bg-red-500' :
                          war.status === WAR_STATUSES.WAR_PREPARATION ? 'bg-orange-500' :
                          'bg-gray-500'
                        } text-white font-black`}>
                          {getStatusLabel(war.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${getGangColor(war.attacker_gang_id)} text-white font-black`}>
                          {getGangIcon(war.attacker_gang_id)} {getGangName(war.attacker_gang_id)}
                        </span>
                        <span className="text-[10px] text-slate-400">vs</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${getGangColor(war.defender_gang_id)} text-white font-black`}>
                          {getGangIcon(war.defender_gang_id)} {getGangName(war.defender_gang_id)}
                        </span>
                      </div>
                      {war.status === WAR_STATUSES.WAR_ACTIVE && (
                        <div className="flex items-center gap-1 text-red-400 mb-1">
                          <Clock size={12} />
                          <span className="text-[10px] font-black">Осталось: {formatTimeLeft(war.ends_at)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] text-slate-400">
                          Счёт: {war.attacker_score} - {war.defender_score}
                        </div>
                        {war.status === WAR_STATUSES.WAR_PREPARATION && (
                          <button
                            onClick={() => handleStartWar(war.id)}
                            className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded-lg text-[10px] font-black active:scale-95"
                          >
                            Начать войну
                          </button>
                        )}
                        {war.status === WAR_STATUSES.WAR_ACTIVE && (
                          <button
                            onClick={() => handleEndWar(war.id)}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-[10px] font-black active:scale-95"
                          >
                            Завершить
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {!playerGangId && (
              <div className="text-center text-slate-500 text-xs py-8">
                Войны доступны только для криминальных организаций.
              </div>
            )}
            {playerGangId && preparationWars.length === 0 && activeWars.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8">
                Нет активных войн. Объявите войну вражеской территории.
              </div>
            )}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-3">
            {selectedWar ? (
              <>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 mb-3">
                  <div className="text-xs font-black mb-2">Создать событие</div>
                  <div className="flex gap-2 overflow-x-auto">
                    {Object.values(EVENT_TYPES).map(type => (
                      <button
                        key={type}
                        onClick={() => handleCreateEvent(selectedWar.id, selectedWar.territory_id, type)}
                        className="px-3 py-2 bg-red-900/30 border border-red-900/40 rounded-xl text-[10px] font-black whitespace-nowrap active:scale-95"
                      >
                        {getEventTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>

                {events.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-8">
                    Нет событий. Создайте первое боевое событие.
                  </div>
                ) : (
                  events.map(event => (
                    <div key={event.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Crosshair size={16} className="text-red-400" />
                          <div>
                            <div className="text-sm font-black">{getEventTypeLabel(event.type)}</div>
                            <div className="text-[10px] text-slate-400">
                              {getTerritoryName(event.territory_id)}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${
                          event.status === 'ACTIVE' ? 'bg-red-500' : 'bg-gray-500'
                        } text-white font-black`}>
                          {event.status === 'ACTIVE' ? 'Активно' : 'Завершено'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${getGangColor(event.attacker_gang_id)} text-white font-black`}>
                          {getGangIcon(event.attacker_gang_id)} {getGangName(event.attacker_gang_id)}
                        </span>
                        <span className="text-[10px] text-slate-400">vs</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${getGangColor(event.defender_gang_id)} text-white font-black`}>
                          {getGangIcon(event.defender_gang_id)} {getGangName(event.defender_gang_id)}
                        </span>
                      </div>

                      {event.status === 'ACTIVE' && (
                        <div className="flex items-center gap-1 text-red-400 mb-2">
                          <Clock size={12} />
                          <span className="text-[10px] font-black">До конца: {formatTimeLeft(event.ends_at)}</span>
                        </div>
                      )}

                      {event.result && (
                        <div className="text-[10px] text-slate-400 mb-2">
                          Результат: {getResultLabel(event.result)}
                        </div>
                      )}

                      {event.status === 'ACTIVE' && (
                        <div className="flex gap-2 flex-wrap">
                          {getAvailableActions(event.type).map(action => {
                            const isSupported = event.attacker_gang_id === playerGangId || event.defender_gang_id === playerGangId;
                            const labels = {
                              ATTACK: 'Атаковать',
                              DEFEND: 'Защищать',
                              RECON: 'Разведка',
                              SUPPORT: 'Поддержать',
                              RETREAT: 'Отступить',
                            };
                            return (
                              <button
                                key={action}
                                onClick={() => handlePlayerAction(event, action)}
                                disabled={!isSupported}
                                className={`px-2 py-1.5 rounded-xl text-[10px] font-black active:scale-95 ${
                                  isSupported
                                    ? 'bg-red-700 hover:bg-red-600 text-white'
                                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {labels[action] || action}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            ) : (
              <div className="text-center text-slate-500 text-xs py-8">
                Выберите войну для просмотра событий.
              </div>
            )}
          </div>
        )}

        {tab === 'participants' && (
          <div className="space-y-3">
            {selectedEvent ? (
              <>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 mb-3">
                  <div className="text-xs font-black mb-1">
                    Участники события: {getEventTypeLabel(selectedEvent.type)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {getTerritoryName(selectedEvent.territory_id)}
                  </div>
                </div>

                {participants.filter(p => p.event_id === selectedEvent.id).length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-8">
                    Нет участников.
                  </div>
                ) : (
                  participants
                    .filter(p => p.event_id === selectedEvent.id)
                    .map(participant => (
                      <div key={participant.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-blue-400" />
                            <div>
                              <div className="text-xs font-black">Игрок #{participant.player_id}</div>
                              <div className={`text-[10px] px-2 py-0.5 rounded-lg ${getGangColor(participant.gang_id)} text-white font-black inline-block mt-1`}>
                                {getGangName(participant.gang_id)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black">Вклад: {participant.contribution}</div>
                            {participant.result && (
                              <div className="text-[10px] text-slate-400">
                                {getResultLabel(participant.result)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </>
            ) : (
              <div className="text-center text-slate-500 text-xs py-8">
                Выберите событие для просмотра участников.
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 z-[600] bg-black/60 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Загрузка...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
