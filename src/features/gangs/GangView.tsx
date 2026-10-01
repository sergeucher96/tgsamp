import React, { useEffect, useMemo, useState } from 'react';
import { X, Crown, TrendingUp, ChevronUp, DollarSign, Package, Car, Users, UserPlus, MapPin, Hammer } from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useInventoryStore } from '../../stores/useInventoryStore';
import WeaponWorkbenchView from './WeaponWorkbenchView';
import { MATERIALS_ITEM_KEY } from './militaryBase';
import { useTerritoryStore } from '../../stores/useTerritoryStore';
import { useWarStore } from '../../stores/useWarStore';
import { useHouseStore } from '../../stores/useHouseStore';
import { useBusinessStore } from '../../stores/useBusinessStore';
import { FINAL_LOCATIONS } from '../../game/locations/locations';
import { countAssetsByTerritory } from '../../game/world/territoryAssets';
import { ORGANIZATIONS, getGang, WAR_CONFIG } from '../gangs/data/organizationsConfig';
import { gangIncome, TERRITORY_TAX } from '../gangs/data/territoryIncome';

interface GangViewProps { onClose: () => void; orgId: string; }

export default function GangView({ onClose, orgId }: GangViewProps) {
  const { player } = usePlayerStore();
  const { territories, fetchTerritories } = useTerritoryStore();
  const { declareWar, isBusy: warBusy, myRankNumber, refreshMyRank, getWarForTerritory } = useWarStore();
  const { dbHouses } = useHouseStore();
  const { businesses } = useBusinessStore();
  const {
    members, ranks, safeResources, safeItems, orgVehicles,
    joinOrganization, leaveOrganization,
    removeMember, changeRank, promoteMember, setLeader,
    addBalance, getBalance,
    fetchMembers, fetchRanks, fetchSafeResources, fetchSafeItems, fetchOrgVehicles,
    salaryLog, paySalaries,
  } = useOrganizationStore();

  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState('members');
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [newRank, setNewRank] = useState('');
  const [balance, setBalance] = useState(0);
  const [zoneMessage, setZoneMessage] = useState<{ text: string; kind: 'error' | 'info' } | null>(null);

  const org = ORGANIZATIONS.find(o => o.id === orgId);
  const gang = getGang(orgId);
  const config = org || { color: 'bg-gray-700', icon: '👤' };

  useEffect(() => {
    if (player?.id) {
      fetchMembers(orgId);
      fetchRanks(orgId);
      fetchSafeResources(orgId);
      fetchSafeItems(orgId);
      fetchOrgVehicles(orgId);
    }
  }, [player?.id, fetchMembers, fetchRanks, fetchSafeResources, fetchSafeItems, fetchOrgVehicles]);

  useEffect(() => {
    getBalance(orgId).then(setBalance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Зоны нужны вкладке «Зоны», а ранг — для проверки права на войну.
  useEffect(() => {
    fetchTerritories();
    refreshMyRank();
  }, [fetchTerritories, refreshMyRank]);

  const member = members.find(m => m.player_id === player?.id);
  const isMember = !!member;
  const isLeader = member?.is_leader;
  // Управлять бандой может лидер и ранги 8+ (rank_level = rank * 10),
  // а не по захардкоженным названиям: у разных банд ранги свои.
  const memberRankLevel = ranks.find(r => r.rank_name === member?.rank_name)?.rank_level ?? 0;
  const canManage = !!member && (isLeader || memberRankLevel >= 80);
  const salary = member?.salary || 0;

  // Доход с территорий: базовый плюс налог с купленных объектов внутри зон
  const territoryMoney = useMemo(() => {
    const owners: Record<string, string | null> = {};
    for (const h of dbHouses) owners[h.id_name] = h.owner_id;
    for (const b of businesses) owners[String(b.id)] = b.owner_id;

    const report = countAssetsByTerritory({
      locations: FINAL_LOCATIONS,
      territories,
      owners,
    });

    return gangIncome(report, territories, orgId);
  }, [territories, dbHouses, businesses, orgId]);

  const handleJoin = async () => {
    if (!player?.id || joining) return;
    setJoining(true);
    const ok = await joinOrganization(orgId);
    setJoining(false);
    if (ok) {
      setTab('members');
    } else {
      alert('Не удалось вступить. Попробуйте позже.');
    }
  };

  const handlePaySalaries = async () => {
    await paySalaries(orgId);
    getBalance(orgId).then(setBalance);
  };

  const handleLeave = async () => {
    if (confirm('Вы уверены, что хотите выйти из банды?')) {
      await leaveOrganization(orgId);
      onClose();
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (confirm('Уволить участника?')) {
      await removeMember(orgId, memberId);
    }
  };

  const handleChangeRank = async () => {
    if (selectedMember && newRank) {
      await changeRank(orgId, selectedMember.player_id, newRank);
      setSelectedMember(null);
      setNewRank('');
    }
  };

  const handleSetLeader = async (memberId) => {
    if (confirm('Назначить этого участника лидером?')) {
      await setLeader(orgId, memberId);
    }
  };

  const handlePromote = async (memberId) => {
    await promoteMember(orgId, memberId);
  };

  // Отладочная кнопка: мгновенно выдать себе максимальный ранг банды.
  const handleDevMaxRank = async () => {
    const top = [...ranks].sort((a, b) => b.rank_level - a.rank_level)[0];
    if (!top || !player?.id) return;
    await changeRank(orgId, player.id, top.rank_name);
  };

  // Войну объявляет банда ИГРОКА, а не той, чей хаб открыт. Поэтому
  // кнопка появляется только когда смотришь свою банду.
  const isOwnGang = player?.organization_id === orgId;
  const canDeclare = isOwnGang && myRankNumber >= WAR_CONFIG.canStartWarMinRank;

  const handleDeclareWar = async (territoryId: number) => {
    const result = await declareWar(territoryId);
    if (!result.ok) {
      setZoneMessage({ text: result.reason || 'Не удалось объявить войну', kind: 'error' });
      return;
    }
    setZoneMessage({ text: 'Война объявлена. Участие — на экране ⚔️', kind: 'info' });
  };

  const handleAddBalance = async () => {
    const amount = parseInt(addAmount);
    if (!amount || amount <= 0) return;
    const ok = await addBalance(orgId, amount);
    if (ok) {
      setAddAmount('');
      getBalance(orgId).then(setBalance);
    }
  };

  const tabs = [
    { id: 'zones', label: 'Зоны', icon: <MapPin size={16} /> },
    { id: 'members', label: 'Участники', icon: <Users size={16} /> },
    { id: 'finance', label: 'Финансы', icon: <DollarSign size={16} /> },
    { id: 'warehouse', label: 'Склад', icon: <Package size={16} /> },
    { id: 'vehicles', label: 'Транспорт', icon: <Car size={16} /> },
    { id: 'workbench', label: 'Верстак', icon: <Hammer size={16} /> },
  ];

  const safeRes = safeResources || { crop_count: 0, metal_count: 0, part_count: 0 };

  // Материалы нужны для подсказки на вкладке верстака. Считаем по
  // всем строкам сумки: стопок одного предмета может быть несколько.
  const playerMaterials = useInventoryStore((s) => s.items)
    .filter((i) => i.item_id === MATERIALS_ITEM_KEY)
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-[500] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-red-950/90 to-gray-900 flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">{gang?.name || org?.name || 'Банда'}</h1>
          <div className="w-10" />
        </div>

        <div className={`${config?.color || 'bg-red-900'} p-4 rounded-2xl mb-4`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{config?.icon || '👤'}</span>
            <div>
              <div className="font-black text-xl">{org?.name || gang?.name || 'Банда'}</div>
              <div className="text-xs opacity-80">
                {member?.rank_name || 'Не участник'}
                {' • '}
                Участников: {members.length}
              </div>
            </div>
          </div>
          {isMember && salary > 0 && (
            <div className="text-xs opacity-90 mt-1">
              {'💰'} Зарплата: ${salary.toLocaleString()}
            </div>
          )}
        </div>

        {!isMember ? (
          <>
            <div className="bg-gradient-to-br from-red-900/30 to-transparent border border-red-900/40 p-6 rounded-2xl">
              <div className="text-5xl text-center mb-4">{gang?.icon || config?.icon || '👤'}</div>
              <div className="text-[10px] uppercase tracking-widest text-red-400/70 font-black text-center mb-3">
                {gang?.name || org?.name || 'Банда'}
              </div>
              <div className="text-xs text-slate-300 space-y-2">
                <p>{gang?.description || 'Уличная банда, делящая Los Santos на районы.'}</p>
                <p className="text-[10px] text-slate-400">Как участник вы получите доступ к:</p>
                <ul className="text-[10px] text-slate-400 list-disc pl-4 space-y-1">
                  <li>Складу банды</li>
                  <li>Финансовому пулу</li>
                  <li>Транспортному парку</li>
                  <li>Ежедневной зарплате</li>
                  <li>Территориям и войне за районы</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-wider text-sm transition-all mt-4
                ${joining
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-red-800 hover:bg-red-700 active:scale-95 text-white shadow-lg shadow-red-900/40'
                }`}
            >
              {joining ? 'Вступаем...' : 'Вступить в банду'}
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    tab === t.id ? 'bg-red-900/60' : 'bg-white/5'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {tab === 'zones' && (
              <div className="space-y-2">
                {zoneMessage && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      zoneMessage.kind === 'error'
                        ? 'bg-red-900/30 border-red-700/40 text-red-300'
                        : 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
                    }`}
                  >
                    {zoneMessage.text}
                  </div>
                )}

                {territories.length === 0 && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400">
                    Зон пока нет. Их рисует редактор карты.
                  </div>
                )}

                {territories.map(t => {
                  const isMine = t.owner_gang_id === orgId;
                  const activeWar = getWarForTerritory(t.id);

                  return (
                    <div key={t.id} className="bg-white/5 border border-white/10 p-3 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: t.color || '#64748b' }}
                          />
                          <span className="text-sm font-black truncate">{t.name}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                            t.owner_gang_id ? getGang(t.owner_gang_id)?.color || 'bg-gray-600' : 'bg-gray-600'
                          }`}
                        >
                          {t.owner_gang_id ? getGang(t.owner_gang_id)?.name || t.owner_gang_id : 'Никто'}
                        </span>
                      </div>

                      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/70 transition-all duration-500"
                          style={{ width: `${t.control || 0}%` }}
                        />
                      </div>

                      {activeWar ? (
                        <div className="mt-2 w-full bg-yellow-900/20 border border-yellow-700/40 py-2 rounded-xl text-[10px] text-yellow-300 text-center">
                          Идёт война — на экране ⚔️
                        </div>
                      ) : isMine ? (
                        <div className="mt-2 w-full bg-white/5 border border-white/10 py-2 rounded-xl text-[10px] text-slate-400 text-center">
                          Зона вашей банды
                        </div>
                      ) : canDeclare ? (
                        <button
                          onClick={() => handleDeclareWar(t.id)}
                          disabled={warBusy}
                          className="mt-2 w-full bg-red-800/60 hover:bg-red-700/60 py-2 rounded-xl text-xs font-black active:scale-95 disabled:opacity-40"
                        >
                          Объявить войну · ${WAR_CONFIG.cost.toLocaleString()}
                        </button>
                      ) : (
                        <div className="mt-2 w-full bg-white/5 border border-white/10 py-2 rounded-xl text-[10px] text-slate-400 text-center">
                          {isOwnGang
                            ? `Нужен ранг ${WAR_CONFIG.canStartWarMinRank} или выше`
                            : `Объявить войну может только ${getGang(orgId)?.name}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'members' && (
              <div className="space-y-2">
                {members.map(m => {
                  const isMe = m.player_id === player?.id;
                  return (
                    <div key={m.player_id} className="bg-white/5 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.is_leader && <Crown size={14} className="text-yellow-400" />}
                        <div>
                           <div className="text-sm font-black">{m.player_id ? 'Игрок #' + m.player_id.slice(0, 8) : 'Unknown'} {isMe && '(вы)'}</div>
                          <div className="text-[10px] text-slate-400">{m.rank_name}{ ' • '}${m.salary?.toLocaleString()}</div>
                        </div>
                      </div>
                      {canManage && !isMe && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handlePromote(m.player_id)}
                            title="Повысить на один ранг"
                            className="p-1 bg-green-600/20 rounded-lg"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => { setSelectedMember(m); setNewRank(m.rank_name || ''); }}
                            className="p-1 bg-blue-500/20 rounded-lg"
                          >
                            <TrendingUp size={12} />
                          </button>
                          {isLeader && (
                            <>
                              <button onClick={() => handleSetLeader(m.player_id)} className="p-1 bg-yellow-500/20 rounded-lg">
                                <Crown size={12} />
                              </button>
                              <button onClick={() => handleRemoveMember(m.player_id)} className="p-1 bg-red-500/20 rounded-lg">
                                <UserPlus size={12} className="transform rotate-45" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {selectedMember && (
                  <div className="fixed inset-0 z-[600] bg-black/80 flex items-center justify-center p-6">
                    <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-sm">
                      <h3 className="font-black mb-4">Изменить ранг: {selectedMember.username}</h3>
                      <select
                        value={newRank}
                        onChange={e => setNewRank(e.target.value)}
                        className="w-full bg-white/10 p-3 rounded-xl mb-4 outline-none"
                      >
                        {ranks.map(r => (
                          <option key={r.rank_name} value={r.rank_name}>{r.rank_name} (${r.salary})</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedMember(null)} className="flex-1 bg-white/10 py-3 rounded-xl font-black">Отмена</button>
                        <button onClick={handleChangeRank} className="flex-1 bg-red-700 py-3 rounded-xl font-black">Сохранить</button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLeave}
                  className="w-full bg-red-900/30 border border-red-900/40 py-3 rounded-2xl font-black text-red-400 mt-4 active:scale-95"
                >
                  Выйти из банды
                </button>

                {import.meta.env.DEV && isMember && (
                  <button
                    onClick={handleDevMaxRank}
                    className="w-full bg-yellow-900/20 border border-yellow-700/40 py-3 rounded-2xl font-black text-yellow-400 mt-2 active:scale-95"
                  >
                    [DEV] Выдать себе максимальный ранг
                  </button>
                )}
              </div>
            )}

            {tab === 'finance' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-red-900/30 to-transparent p-4 rounded-2xl border border-red-900/30">
                  <div className="text-xs text-red-400 mb-1">Баланс организации</div>
                  <div className="text-3xl font-black">${balance.toLocaleString()}</div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-slate-400 mb-1">Доход с территорий в час</div>
                  <div className="text-2xl font-black text-emerald-400">
                    ${territoryMoney.income.total.toLocaleString()}
                  </div>
                  {territoryMoney.zones === 0 ? (
                    <div className="text-[11px] text-slate-500 mt-2">
                      У банды нет территорий. Захватите зону, чтобы получать доход.
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                      <div>
                        Зон: {territoryMoney.zones} · базовый доход ${territoryMoney.income.base.toLocaleString()}
                      </div>
                      <div>
                        Купленных объектов в зонах: {territoryMoney.income.objects} ·
                        налог ${(territoryMoney.income.taxFromHouses + territoryMoney.income.taxFromBusinesses).toLocaleString()}
                      </div>
                      <div className="text-slate-500">
                        Дом ${TERRITORY_TAX.perHouse} · бизнес ${TERRITORY_TAX.perBusiness} с каждого
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white/5 p-4 rounded-2xl">
                  <div className="text-xs text-slate-400 mb-3">Пополнить баланс</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={addAmount}
                      onChange={e => setAddAmount(e.target.value)}
                      placeholder="Сумма"
                      className="flex-1 bg-white/10 p-3 rounded-xl outline-none focus:ring-1 focus:ring-red-400"
                    />
                    <button onClick={handleAddBalance} className="bg-red-700 px-6 py-3 rounded-xl font-black active:scale-95">
                      Добавить
                    </button>
                  </div>
                </div>

                {isLeader && (
                  <button
                    onClick={handlePaySalaries}
                    className="w-full bg-red-800 py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95"
                  >
                    <DollarSign size={16} /> Выплатить зарплаты
                  </button>
                )}

                {salaryLog && salaryLog.length > 0 && (
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400 mb-3">История выплат</div>
                    <div className="space-y-2">
                      {salaryLog.slice(0, 10).map(entry => (
                        <div key={entry.id} className="flex justify-between text-xs">
                           <span>{entry.player_id ? 'Игрок #' + entry.player_id.slice(0, 8) : 'Unknown'}</span>
                          <span className={entry.paid ? 'text-green-400' : 'text-red-400'}>
                            ${entry.amount?.toLocaleString()} {entry.paid ? '✓' : '✗'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'warehouse' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-500/20 p-3 rounded-xl text-center border border-green-500/20">
                    <div className="text-2xl mb-1">🌾</div>
                    <div className="text-xs text-slate-400">Культуры</div>
                    <div className="font-black">{safeRes.crop_count}</div>
                  </div>
                  <div className="bg-orange-500/20 p-3 rounded-xl text-center border border-orange-500/20">
                    <div className="text-2xl mb-1">⛏️</div>
                    <div className="text-xs text-slate-400">Металл</div>
                    <div className="font-black">{safeRes.metal_count}</div>
                  </div>
                  <div className="bg-blue-500/20 p-3 rounded-xl text-center border border-blue-500/20">
                    <div className="text-2xl mb-1">⚙️</div>
                    <div className="text-xs text-slate-400">Детали</div>
                    <div className="font-black">{safeRes.part_count}</div>
                  </div>
                </div>

                {safeItems && safeItems.length > 0 && (
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400 mb-3">Предметы на складе</div>
                    <div className="space-y-2">
                      {safeItems.map(item => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span>{item.item_name}</span>
                          <span className="text-slate-400">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!safeItems || safeItems.length === 0) && (
                  <div className="text-center text-slate-500 text-xs py-8">Склад пуст</div>
                )}
              </div>
            )}

            {tab === 'vehicles' && (
              <div className="space-y-3">
                {orgVehicles && orgVehicles.length > 0 && (
                  <div className="space-y-2">
                    {orgVehicles.map(v => (
                      <div key={v.id} className="bg-white/5 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🚗</span>
                          <div>
                            <div className="text-sm font-black">{v.vehicles?.model_id || 'Автомобиль'}</div>
                            <div className="text-[10px] text-slate-400">
                              {v.status === 'available' ? '🟢 Доступен' : '🔴 В использовании'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400">
                          {(v.vehicles?.color || 'Белый')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!orgVehicles || orgVehicles.length === 0) && (
                  <div className="text-center text-slate-500 text-xs py-8">Транспортный парк пуст</div>
                )}
              </div>
            )}

            {tab === 'workbench' && (
              // Верстак открывается отдельной панелью: у неё своя
              // прокрутка и свой список рецептов, в общий поток хаба
              // он не вписывается.
              <div className="space-y-3">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔧</span>
                    <div>
                      <div className="text-sm font-black uppercase">Верстак для оружия</div>
                      <div className="text-[10px] text-slate-400">
                        Материал: {playerMaterials} шт. Рецепты задаёт автор.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWorkbench(true)}
                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase bg-red-700 active:scale-95"
                  >
                    Открыть верстак
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showWorkbench && <WeaponWorkbenchView onClose={() => setShowWorkbench(false)} />}
    </div>
  );
}