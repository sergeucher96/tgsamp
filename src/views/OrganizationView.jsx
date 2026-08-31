import React, { useEffect, useState } from 'react';
import { X, Users, DollarSign, Package, Car, LogOut, UserPlus, Crown, TrendingUp } from 'lucide-react';
import { useOrganizationStore, ORG_VEHICLE_TYPES } from '../store/useOrganizationStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { ORGANIZATIONS } from '../data/organizationsConfig';

// ————————————————— ———— Список организаций ————————————————— ————
export function OrganizationsList({ onClose }) {
  const { organizations, fetchOrganizations, joinOrganization, isLoading } = useOrganizationStore();
  const player = usePlayerStore(state => state.player);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleJoin = async (orgId) => {
    await joinOrganization(orgId);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-gray-800 to-gray-900 flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-lg font-black uppercase">Организации</h1>
          <div className="w-10" />
        </div>

        <div className="space-y-3">
          {organizations.map(org => {
            const config = ORGANIZATIONS.find(o => o.id === org.id);
            return (
              <button
                key={org.id}
                onClick={() => handleJoin(org.id)}
                disabled={isLoading || player?.organization_id}
                className={`w-full ${config?.color || 'bg-gray-600'} p-4 rounded-2xl text-left active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config?.icon || '🏢'}</span>
                  <div>
                    <div className="font-black text-lg">{org.name}</div>
                    <div className="text-xs opacity-80">
                      {config?.type ? config.type.charAt(0).toUpperCase() + config.type.slice(1) : ''}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {player?.organization_id && (
          <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl text-center">
            <div className="text-sm font-black text-yellow-400">Вы уже состоите в организации</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ————————————————— ———— Панель организации ————————————————— ————
export function OrganizationPanel({ orgId, onClose }) {
  const {
    organizations, members, ranks, safeResources, safeItems, orgVehicles, salaryLog,
    currentOrg, loadOrgData, leaveOrganization, removeMember, changeRank, setLeader,
    addBalance, getBalance, canManageMembers, paySalaries, getPlayerSalary,
    fetchMembers, fetchRanks, fetchOrgVehicles, fetchSafeResources, fetchSafeItems,
  } = useOrganizationStore();

  const player = usePlayerStore(state => state.player);
  const [tab, setTab] = useState('members');
  const [balance, setBalance] = useState(0);
  const [addAmount, setAddAmount] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [newRank, setNewRank] = useState('');

  useEffect(() => {
    loadOrgData(orgId);
    getBalance(orgId).then(setBalance);
  }, [orgId]);

  const org = organizations.find(o => o.id === orgId);
  const config = ORGANIZATIONS.find(o => o.id === orgId);
  const member = members.find(m => m.player_id === player?.id);
  const isLeader = member?.is_leader;
  const canManage = canManageMembers(orgId, player?.id);
  const { salary, nextSalaryDate } = getPlayerSalary(orgId);

  const handleAddBalance = async () => {
    const amount = parseInt(addAmount);
    if (!amount || amount <= 0) return;
    await addBalance(orgId, amount);
    const newBalance = await getBalance(orgId);
    setBalance(newBalance);
    setAddAmount('');
  };

  const handlePaySalaries = async () => {
    await paySalaries(orgId);
  };

  const handleLeave = async () => {
    if (confirm('Вы уверены, что хотите выйти из организации?')) {
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

  const tabs = [
    { id: 'members', label: 'Участники', icon: <Users size={16} /> },
    { id: 'finance', label: 'Финансы', icon: <DollarSign size={16} /> },
    { id: 'warehouse', label: 'Склад', icon: <Package size={16} /> },
    { id: 'vehicles', label: 'Транспорт', icon: <Car size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-gray-800 to-gray-900 flex-1 p-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">{org?.name || 'Организация'}</h1>
          <div className="w-10" />
        </div>

        {/* Org info */}
        <div className={`${config?.color || 'bg-gray-600'} p-4 rounded-2xl mb-4`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{config?.icon || '🏢'}</span>
            <div>
              <div className="font-black text-xl">{org?.name}</div>
              <div className="text-xs opacity-80">
                {member?.rank_name || 'Не участник'} • Участников: {members.length}
              </div>
            </div>
          </div>
          {salary > 0 && (
            <div className="text-xs opacity-90 mt-1">
              💰 Зарплата: ${salary.toLocaleString()}
              {nextSalaryDate && ` • След. выплата: ${new Date(nextSalaryDate).toLocaleDateString('ru-RU')}`}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                tab === t.id ? 'bg-white/20' : 'bg-white/5'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Members Tab */}
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
                      <div className="text-[10px] text-slate-400">{m.rank_name} • ${m.salary?.toLocaleString()}</div>
                    </div>
                  </div>
                  {canManage && !isMe && (
                    <div className="flex gap-1">
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

            {/* Rank change modal */}
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
                    <button onClick={handleChangeRank} className="flex-1 bg-blue-500 py-3 rounded-xl font-black">Сохранить</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Finance Tab */}
        {tab === 'finance' && (
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-4 rounded-2xl border border-green-500/20">
              <div className="text-xs text-green-400 mb-1">Баланс организации</div>
              <div className="text-3xl font-black">${balance.toLocaleString()}</div>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 mb-3">Пополнить баланс</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                  placeholder="Сумма"
                  className="flex-1 bg-white/10 p-3 rounded-xl outline-none focus:ring-1 focus:ring-green-400"
                />
                <button onClick={handleAddBalance} className="bg-green-500 px-6 py-3 rounded-xl font-black active:scale-95">
                  Добавить
                </button>
              </div>
            </div>

            {isLeader && (
              <button
                onClick={handlePaySalaries}
                className="w-full bg-blue-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95"
              >
                <DollarSign size={16} /> Выплатить зарплаты
              </button>
            )}

            {salaryLog.length > 0 && (
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

        {/* Warehouse Tab */}
        {tab === 'warehouse' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-500/20 p-3 rounded-xl text-center border border-green-500/20">
                <div className="text-2xl mb-1">🌾</div>
                <div className="text-xs text-slate-400">Культуры</div>
                <div className="font-black">{safeResources.crop_count}</div>
              </div>
              <div className="bg-gray-500/20 p-3 rounded-xl text-center border border-gray-500/20">
                <div className="text-2xl mb-1">⛏️</div>
                <div className="text-xs text-slate-400">Металл</div>
                <div className="font-black">{safeResources.metal_count}</div>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-xl text-center border border-blue-500/20">
                <div className="text-2xl mb-1">🔧</div>
                <div className="text-xs text-slate-400">Детали</div>
                <div className="font-black">{safeResources.part_count}</div>
              </div>
            </div>

            {safeItems.length > 0 && (
              <div className="bg-white/5 p-4 rounded-2xl">
                <div className="text-xs text-slate-400 mb-3">Предметы на складе</div>
                <div className="space-y-2">
                  {safeItems.map(item => (
                    <div key={item.item_id} className="flex justify-between text-sm">
                      <span>Предмет #{item.item_id}</span>
                      <span className="font-black">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vehicles Tab */}
        {tab === 'vehicles' && (
          <div className="space-y-3">
            {orgVehicles.map(v => (
              <div key={v.id} className="bg-white/5 p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car size={16} />
                    <div>
                      <div className="text-sm font-black">ID: {v.vehicle_id}</div>
                      <div className="text-[10px] text-slate-400">
                        {v.assigned_player_id ? `Назначен: ${members.find(m => m.player_id === v.assigned_player_id)?.username || 'Unknown'}` : 'Свободен'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-green-400">${v.cost?.toLocaleString()}</div>
                </div>
              </div>
            ))}

            {isLeader && orgVehicles.length < 3 && (
              <div className="bg-white/5 p-4 rounded-2xl">
                <div className="text-xs text-slate-400 mb-3">Купить транспорт</div>
                <div className="space-y-2">
                  {ORG_VEHICLE_TYPES.map(vt => (
                    <button
                      key={vt.modelId}
                      className="w-full flex items-center justify-between bg-white/5 p-3 rounded-xl active:scale-95"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{vt.icon}</span>
                        <span className="text-sm">{vt.modelId}</span>
                      </div>
                      <span className="text-sm font-black text-green-400">${vt.price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leave button */}
        <button
          onClick={handleLeave}
          className="w-full mt-6 bg-red-500/20 border border-red-500/30 py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-red-400 active:scale-95"
        >
          <LogOut size={16} /> Выйти из организации
        </button>
      </div>
    </div>
  );
}

export default OrganizationsList;