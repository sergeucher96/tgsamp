import React, { useEffect, useState } from 'react';
import { X, Crown, TrendingUp, DollarSign, Package, Car, Users, UserPlus } from 'lucide-react';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { ORGANIZATIONS } from '../data/organizationsConfig';

const ORG_ID = 'mafia';

export default function MafiaView({ onClose }) {
  const { player } = usePlayerStore();
  const {
    members, ranks, safeResources, safeItems, orgVehicles,
    joinOrganization, leaveOrganization,
    removeMember, changeRank, setLeader,
    addBalance, getBalance,
    fetchMembers, fetchRanks, fetchSafeResources, fetchSafeItems, fetchOrgVehicles,
    salaryLog, paySalaries,
  } = useOrganizationStore();

  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState('members');
  const [addAmount, setAddAmount] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [newRank, setNewRank] = useState('');
  const [balance, setBalance] = useState(0);

  const org = ORGANIZATIONS.find(o => o.id === ORG_ID);
  const config = org || { color: 'bg-red-900', icon: '🕴️' };

  useEffect(() => {
    if (player?.id) {
      fetchMembers(ORG_ID);
      fetchRanks(ORG_ID);
      fetchSafeResources(ORG_ID);
      fetchSafeItems(ORG_ID);
      fetchOrgVehicles(ORG_ID);
    }
  }, [player?.id, fetchMembers, fetchRanks, fetchSafeResources, fetchSafeItems, fetchOrgVehicles]);

  useEffect(() => {
    getBalance(ORG_ID).then(setBalance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const member = members.find(m => m.player_id === player?.id);
  const isMember = !!member;
  const isLeader = member?.is_leader;
  const canManage = member && ['Капо', 'Солдат'].includes(member.rank_name);
  const salary = member?.salary || 0;

  const handleJoin = async () => {
    if (!player?.id || joining) return;
    setJoining(true);
    const ok = await joinOrganization(ORG_ID);
    setJoining(false);
    if (ok) {
      setTab('members');
    } else {
      alert('Не удалось вступить. Попробуйте позже.');
    }
  };

  const handlePaySalaries = async () => {
    await paySalaries(ORG_ID);
    getBalance(ORG_ID).then(setBalance);
  };

  const handleLeave = async () => {
    if (confirm('Вы уверены, что хотите выйти из мафии?')) {
      await leaveOrganization(ORG_ID);
      onClose();
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (confirm('Уволить участника?')) {
      await removeMember(ORG_ID, memberId);
    }
  };

  const handleChangeRank = async () => {
    if (selectedMember && newRank) {
      await changeRank(ORG_ID, selectedMember.player_id, newRank);
      setSelectedMember(null);
      setNewRank('');
    }
  };

  const handleSetLeader = async (memberId) => {
    if (confirm('Назначить этого участника лидером?')) {
      await setLeader(ORG_ID, memberId);
    }
  };

  const handleAddBalance = async () => {
    const amount = parseInt(addAmount);
    if (!amount || amount <= 0) return;
    const ok = await addBalance(ORG_ID, amount);
    if (ok) {
      setAddAmount('');
      getBalance(ORG_ID).then(setBalance);
    }
  };

  const tabs = [
    { id: 'members', label: 'Участники', icon: <Users size={16} /> },
    { id: 'finance', label: 'Финансы', icon: <DollarSign size={16} /> },
    { id: 'warehouse', label: 'Склад', icon: <Package size={16} /> },
    { id: 'vehicles', label: 'Транспорт', icon: <Car size={16} /> },
  ];

  const safeRes = safeResources || { crop_count: 0, metal_count: 0, part_count: 0 };

  return (
    <div className="fixed inset-0 z-[500] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full bg-gradient-to-b from-red-950/90 to-gray-900 flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
          <h1 className="text-sm font-black uppercase">Коза Ностра</h1>
          <div className="w-10" />
        </div>

        <div className={`${config?.color || 'bg-red-900'} p-4 rounded-2xl mb-4`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{config?.icon || '🕴️'}</span>
            <div>
              <div className="font-black text-xl">{org?.name || 'Мафия'}</div>
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
              <div className="text-5xl text-center mb-4">🕴️</div>
              <div className="text-[10px] uppercase tracking-widest text-red-400/70 font-black text-center mb-3">
                Коза Ностра
              </div>
              <div className="text-xs text-slate-300 space-y-2">
                <p>Коза Ностра - секретная организация. Мы контролируем торговлю, организуем перевозки грузов и защищаем наши интересы любыми средствами.</p>
                <p className="text-[10px] text-slate-400">Как участник вы получите доступ к:</p>
                <ul className="text-[10px] text-slate-400 list-disc pl-4 space-y-1">
                  <li>Секретному складу организации</li>
                  <li>Финансовому пулу</li>
                  <li>Транспортному парку</li>
                  <li>Ежедневной зарплате</li>
                  <li>Защитой от полиции (скоро)</li>
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
              {joining ? 'Вступаем...' : 'Вступить в семью'}
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
                  Выйти из семьи
                </button>
              </div>
            )}

            {tab === 'finance' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-red-900/30 to-transparent p-4 rounded-2xl border border-red-900/30">
                  <div className="text-xs text-red-400 mb-1">Баланс организации</div>
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
          </>
        )}
      </div>
    </div>
  );
}