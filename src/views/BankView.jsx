import React, { useState } from 'react';
import { X, Banknote, ArrowUpRight, ArrowDownRight, Smartphone } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useBankStore } from '../store/useBankStore';

export default function BankView({ onClose }) {
  const player = usePlayerStore(state => state.player);
  const depositToOwnAccount = useBankStore(state => state.depositToOwnAccount);
  const withdrawFromOwnAccount = useBankStore(state => state.withdrawFromOwnAccount);
  const transferToPhone = useBankStore(state => state.transferToPhone);

  const [activeTab, setActiveTab] = useState('overview');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

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
    if (success) {
      setTransferPhone('');
      setTransferAmount('');
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-[#020617]/95 backdrop-blur-xl flex items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-lg bg-transparent">
        <div className="bg-[#08101a] rounded-3xl p-4 shadow-2xl border border-white/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-teal-400 font-black uppercase text-[10px] tracking-widest mb-1">Банк штата</p>
              <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter leading-none">Центральный банк</h2>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X size={20}/></button>
          </div>

          {/* tabs */}
          <div className="mt-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button onClick={() => setActiveTab('overview')} className={`px-3 py-2 rounded-2xl font-black text-sm ${activeTab === 'overview' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-300'}`}>Обзор</button>
              <button onClick={() => setActiveTab('deposit')} className={`px-3 py-2 rounded-2xl font-black text-sm ${activeTab === 'deposit' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-300'}`}>Пополнение</button>
              <button onClick={() => setActiveTab('withdraw')} className={`px-3 py-2 rounded-2xl font-black text-sm ${activeTab === 'withdraw' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-300'}`}>Снятие</button>
              <button onClick={() => setActiveTab('transfer')} className={`px-3 py-2 rounded-2xl font-black text-sm ${activeTab === 'transfer' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-300'}`}>Перевод</button>
            </div>

            <div className="mt-4" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              <div className="overflow-y-auto no-scrollbar pr-2">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">На счёте</div>
                          <div className="text-3xl font-black mt-2">{player?.bank_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} ₽</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Наличные</div>
                          <div className="text-xl font-black mt-2">{player?.money?.toLocaleString() || '0'} ₽</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Пользователь</div>
                      <div className="text-lg font-black uppercase tracking-tight mt-2">{player?.username || 'Гражданин'}</div>
                      <div className="text-[9px] text-slate-400 mt-2">Номер телефона: {player?.phone_number || 'НЕ АКТИВИРОВАН'}</div>
                      <div className="text-[9px] text-slate-400 mt-1">Процент: 0.1%/час</div>
                    </div>
                  </div>
                )}

                {activeTab === 'deposit' && (
                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <ArrowUpRight className="text-green-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Пополнение</div>
                    </div>
                    <input
                      inputMode="decimal"
                      placeholder="Сумма"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-teal-400 transition-all mb-4"
                    />
                    <button onClick={handleDeposit} className="w-full bg-teal-500 hover:bg-teal-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Пополнить</button>
                  </div>
                )}

                {activeTab === 'withdraw' && (
                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <ArrowDownRight className="text-amber-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Снятие</div>
                    </div>
                    <input
                      inputMode="decimal"
                      placeholder="Сумма"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-amber-400 transition-all mb-4"
                    />
                    <button onClick={handleWithdraw} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Снять</button>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
