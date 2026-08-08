import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Smartphone, History, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useBankStore } from '../store/useBankStore';

export default function BankView({ onClose }) {
  const player = usePlayerStore(state => state.player);
  const depositToOwnAccount = useBankStore(state => state.depositToOwnAccount);
  const withdrawFromOwnAccount = useBankStore(state => state.withdrawFromOwnAccount);
  const transferToPhone = useBankStore(state => state.transferToPhone);
  const moveToDeposit = useBankStore(state => state.moveToDeposit);
  const withdrawFromDeposit = useBankStore(state => state.withdrawFromDeposit);
  const transactions = useBankStore(state => state.transactions);
  const loadTransactions = useBankStore(state => state.loadTransactions);

  const [activeTab, setActiveTab] = useState('overview');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [depositInAmount, setDepositInAmount] = useState('');
  const [depositOutAmount, setDepositOutAmount] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleDeposit = async () => {
    if (!depositAmount) return;
    const success = await depositToOwnAccount(depositAmount);
    if (success) setDepositAmount('');
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    const success = await withdrawFromOwnAccount(withdrawAmount);
    if (success) setWithdrawAmount('');
  };

  const handleTransfer = async () => {
    if (!transferPhone || !transferAmount) return;
    const success = await transferToPhone(transferPhone, transferAmount);
    if (success) { setTransferPhone(''); setTransferAmount(''); }
  };

  const handleMoveToDeposit = async () => {
    if (!depositInAmount) return;
    const success = await moveToDeposit(depositInAmount);
    if (success) setDepositInAmount('');
  };

  const handleWithdrawFromDeposit = async () => {
    if (!depositOutAmount) return;
    const success = await withdrawFromDeposit(depositOutAmount);
    if (success) setDepositOutAmount('');
  };

  const txIcon = (type) => {
    switch (type) {
      case 'cash_in': return <ArrowUpRight className="text-green-400" size={16} />;
      case 'cash_out': return <ArrowDownRight className="text-amber-400" size={16} />;
      case 'transfer_in': return <Smartphone className="text-blue-400" size={16} />;
      case 'transfer_out': return <Smartphone className="text-blue-300" size={16} />;
      case 'deposit_in': return <TrendingUp className="text-purple-400" size={16} />;
      case 'deposit_out': return <TrendingDown className="text-orange-400" size={16} />;
      case 'interest': return <DollarSign className="text-teal-400" size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const txTypeLabel = (type) => {
    switch (type) {
      case 'cash_in': return 'Пополнение';
      case 'cash_out': return 'Снятие';
      case 'transfer_in': return 'Входящий перевод';
      case 'transfer_out': return 'Исходящий перевод';
      case 'deposit_in': return 'На депозит';
      case 'deposit_out': return 'С депозита';
      case 'interest': return 'Проценты';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-[#020617] flex flex-col text-white font-sans">
      <div className="w-full bg-[#08101a] flex-1 overflow-y-auto p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-teal-400 font-black uppercase text-[10px] tracking-widest mb-1">Банк штата</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter leading-none">Центральный банк</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X size={20}/></button>
        </div>

        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setActiveTab('overview')} className={`px-3 py-2 rounded-2xl font-black text-sm shrink-0 whitespace-nowrap ${activeTab === 'overview' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-400'}`}>Обзор</button>
            <button onClick={() => setActiveTab('deposit')} className={`px-3 py-2 rounded-2xl font-black text-sm shrink-0 whitespace-nowrap ${activeTab === 'deposit' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-400'}`}>Депозит</button>
            <button onClick={() => setActiveTab('transfer')} className={`px-3 py-2 rounded-2xl font-black text-sm shrink-0 whitespace-nowrap ${activeTab === 'transfer' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-400'}`}>Перевод</button>
            <button onClick={() => setActiveTab('history')} className={`px-3 py-2 rounded-2xl font-black text-sm shrink-0 whitespace-nowrap ${activeTab === 'history' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-400'}`}>История</button>
          </div>

          <div className="mt-4" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <div className="overflow-y-auto no-scrollbar pr-2">

              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-500/20 p-5 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-teal-400/70 font-black">Текущий счёт</div>
                    <div className="text-4xl font-black mt-2">{player?.bank_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} ₽</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-5 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-purple-400/70 font-black">Депозитный счёт</div>
                    <div className="text-4xl font-black mt-2">{player?.deposit_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} ₽</div>
                    <div className="text-[9px] text-purple-300/50 mt-1">+0.1% / час</div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Наличные</div>
                        <div className="text-2xl font-black mt-2">{player?.money?.toLocaleString() || '0'} ₽</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Пользователь</div>
                        <div className="text-lg font-black mt-2">{player?.username || 'Гражданин'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="text-[9px] text-slate-400">Телефон: {player?.phone_number || 'НЕ АКТИВИРОВАН'}</div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <ArrowUpRight className="text-green-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Пополнить счёт (наличные)</div>
                    </div>
                    <div className="text-[9px] text-slate-400 mb-3">Доступно: {(player?.money || 0).toLocaleString()} ₽</div>
                    <input
                      inputMode="decimal"
                      placeholder="Сумма"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-green-400 transition-all mb-4"
                    />
                    <button onClick={handleDeposit} className="w-full bg-green-500 hover:bg-green-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Пополнить счёт</button>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <ArrowDownRight className="text-red-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Снять (счёт → наличные)</div>
                    </div>
                    <div className="text-[9px] text-slate-400 mb-3">Доступно на счёте: {(player?.bank_balance || 0).toLocaleString()} ₽</div>
                    <input
                      inputMode="decimal"
                      placeholder="Сумма"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-red-400 transition-all mb-4"
                    />
                    <button onClick={handleWithdraw} className="w-full bg-red-500 hover:bg-red-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Снять</button>
                  </div>
                </div>
              )}

              {activeTab === 'deposit' && (
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-5 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-purple-400/70 font-black">Депозитный счёт</div>
                    <div className="text-4xl font-black mt-2">{player?.deposit_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} ₽</div>
                    <div className="text-[9px] text-purple-300/50 mt-1">+0.1% / час</div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="text-purple-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">На депозит (со счёта)</div>
                    </div>
                    <div className="text-[9px] text-slate-400 mb-3">Доступно на счёте: {(player?.bank_balance || 0).toLocaleString()} ₽</div>
                    <input
                      inputMode="decimal"
                      placeholder="Сумма"
                      value={depositInAmount}
                      onChange={(e) => setDepositInAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-purple-400 transition-all mb-4"
                    />
                    <button onClick={handleMoveToDeposit} className="w-full bg-purple-500 hover:bg-purple-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Перевести на депозит</button>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingDown className="text-orange-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Снять с депозита (на счёт)</div>
                    </div>
                    <div className="text-[9px] text-slate-400 mb-3">Доступно на депозите: {(player?.deposit_balance || 0).toLocaleString()} ₽</div>
                    <input
                      inputMode="decimal"
                      placeholder="Сумма"
                      value={depositOutAmount}
                      onChange={(e) => setDepositOutAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-orange-400 transition-all mb-4"
                    />
                    <button onClick={handleWithdrawFromDeposit} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Снять с депозита</button>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <DollarSign className="text-teal-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Начисление процентов</div>
                    </div>
                    <div className="text-[9px] text-slate-400 mb-2">Ставка: +0.1% в час на сумму депозита</div>
                    <div className="text-xs text-teal-400 font-black">
                      {((player?.deposit_balance || 0) * 0.001).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽ / час
                    </div>
                    <div className="text-[9px] text-slate-500 mt-2">~{((player?.deposit_balance || 0) * 0.001 * 24).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽ / день</div>
                  </div>
                </div>
              )}

              {activeTab === 'transfer' && (
                <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Smartphone className="text-blue-400" size={18} />
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Перевод по номеру</div>
                  </div>
                  <input
                    type="text"
                    placeholder="Номер телефона"
                    value={transferPhone}
                    onChange={(e) => setTransferPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-blue-400 transition-all mb-3"
                  />
                  <input
                    inputMode="decimal"
                    placeholder="Сумма"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-blue-400 transition-all mb-4"
                  />
                  <button onClick={handleTransfer} className="w-full bg-blue-600 hover:bg-blue-500 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Перевести</button>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="mb-4">
                  {transactions.length === 0 ? (
                    <div className="bg-white/[0.03] border border-white/6 p-8 rounded-2xl text-center">
                      <History className="text-slate-500 mx-auto mb-3" size={32} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Нет операций</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl flex items-center gap-3">
                          <div className="shrink-0">{txIcon(tx.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black">{txTypeLabel(tx.type)}</div>
                            <div className="text-[9px] text-slate-400 truncate">{tx.description || ''}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-sm font-black ${
                              ['cash_in', 'transfer_in', 'interest', 'deposit_in'].includes(tx.type) ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {['cash_in', 'transfer_in', 'interest', 'deposit_in'].includes(tx.type) ? '+' : '-'}
                              {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                            </div>
                            <div className="text-[8px] text-slate-500 mt-0.5">
                              {new Date(tx.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}