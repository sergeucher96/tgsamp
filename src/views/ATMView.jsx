import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useBankStore } from '../store/useBankStore';

export default function ATMView({ onClose }) {
  const player = usePlayerStore(state => state.player);
  const atmDeposit = useBankStore(state => state.atmDeposit);
  const atmWithdraw = useBankStore(state => state.atmWithdraw);

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleDeposit = async () => {
    if (!depositAmount) return;
    const success = await atmDeposit(depositAmount);
    if (success) setDepositAmount('');
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    const success = await atmWithdraw(withdrawAmount);
    if (success) setWithdrawAmount('');
  };

  const fee = withdrawAmount ? (Math.round(Number(withdrawAmount) * 0.03 * 100) / 100) : 0;

  return (
    <div className="fixed inset-0 z-[400] bg-[#020617] flex flex-col text-white font-sans">
      <div className="w-full bg-[#08101a] flex-1 overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-orange-400 font-black uppercase text-[10px] tracking-widest mb-1">Уличный банкомат</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter leading-none">🏧 Банкомат</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X size={20}/></button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Balance cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-3 rounded-xl">
              <div className="text-[8px] uppercase tracking-widest text-orange-400/70 font-black">Банковский счёт</div>
              <div className="text-lg font-black mt-1">{player?.bank_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} ₽</div>
            </div>
            <div className="bg-white/[0.03] border border-white/6 p-3 rounded-xl">
              <div className="text-[8px] uppercase tracking-widest text-slate-400 font-black">Наличные</div>
              <div className="text-lg font-black mt-1">{player?.money?.toLocaleString() || '0'} ₽</div>
            </div>
          </div>

          {/* Пополнить счёт */}
          <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <ArrowUpRight className="text-green-400" size={18} />
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Пополнить счёт (наличные)</div>
            </div>
            <div className="text-[9px] text-slate-400 mb-2">Доступно: {(player?.money || 0).toLocaleString()} ₽</div>
            <input
              inputMode="decimal"
              placeholder="Сумма"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-green-400 transition-all mb-3"
            />
            <button onClick={handleDeposit} className="w-full bg-green-500 hover:bg-green-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Пополнить</button>
          </div>

          {/* Снять */}
          <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <ArrowDownRight className="text-amber-400" size={18} />
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Снять (в наличные)</div>
            </div>
            <div className="text-[9px] text-slate-400 mb-1">Доступно на счёте: {(player?.bank_balance || 0).toLocaleString()} ₽</div>
            <div className="text-[9px] text-amber-400/70 mb-2">⚠ Комиссия 3%: {fee > 0 ? `снимете ${withdrawAmount} ₽ → получите ${Number(withdrawAmount - fee).toFixed(0)} ₽` : '—'}</div>
            <input
              inputMode="decimal"
              placeholder="Сумма"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-amber-400 transition-all mb-3"
            />
            <button onClick={handleWithdraw} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95">Снять</button>
          </div>

          {/* Info */}
          <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl">
            <div className="text-[9px] text-amber-400/70 font-black uppercase tracking-wider">Информация</div>
            <div className="text-[10px] text-slate-400 mt-2 space-y-1">
              <div>• Пополнение счёта — без комиссии</div>
              <div>• Снятие — комиссия 3% от суммы</div>
              <div>• Пример: снимаете 100 ₽ → получите 97 ₽</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}