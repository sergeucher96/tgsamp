import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Smartphone, History, TrendingUp, TrendingDown, DollarSign, Clock, FileText, Home, CheckCircle, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useBankStore } from '../store/useBankStore';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { useHouseStore } from '../store/useHouseStore';
import { BUSINESS_TYPES } from '../data/businessConfig';
import { useBusinessStore } from '../store/useBusinessStore';

export default function BankView({ onClose }) {
  const player = usePlayerStore(state => state.player);
  const depositToOwnAccount = useBankStore(state => state.depositToOwnAccount);
  const withdrawFromOwnAccount = useBankStore(state => state.withdrawFromOwnAccount);
  const transferToPhone = useBankStore(state => state.transferToPhone);
  const moveToDeposit = useBankStore(state => state.moveToDeposit);
  const withdrawFromDeposit = useBankStore(state => state.withdrawFromDeposit);
  const payTax = useBankStore(state => state.payTax);
  const payHouseTax = useBankStore(state => state.payHouseTax);
  const transactions = useBankStore(state => state.transactions);
  const loadTransactions = useBankStore(state => state.loadTransactions);
  const dbHouses = useHouseStore(state => state.dbHouses);
  const businesses = useBusinessStore(state => state.businesses);

  const [activeTab, setActiveTab] = useState('overview');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [depositInAmount, setDepositInAmount] = useState('');
  const [depositOutAmount, setDepositOutAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [isPayingHouseTax, setIsPayingHouseTax] = useState(null);

  // Расчет общей суммы налога
  const calculateTotalTax = () => {
    let totalTax = 0;
    
    // Налог за дома (1% от цены дома в день)
    if (player && dbHouses) {
      dbHouses.forEach(house => {
        if (house.owner_id === player.id) {
          const houseClass = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
          totalTax += Math.round(houseClass.price * 0.001);
        }
      });
    }
    
    // Налог за бизнес (2% от дохода в день)
    if (player && businesses) {
      businesses.forEach(biz => {
        if (biz.owner_id === player.id && biz.purchased) {
          totalTax += Math.round((biz.daily_earnings || 0) * 0.02);
        }
      });
    }
    
    return totalTax;
  };

  const totalTax = calculateTotalTax();

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

  const handlePayTax = async (customAmount) => {
    const amount = customAmount || taxAmount || totalTax;
    if (!amount) return;
    const success = await payTax(amount);
    if (success) setTaxAmount('');
  };

  const handlePayHouseTax = async (houseId) => {
    setIsPayingHouseTax(houseId);
    const success = await payHouseTax(houseId);
    if (success) {
      useHouseStore.getState().fetchDbHouses();
    }
    setIsPayingHouseTax(null);
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
      case 'tax_payment': return <FileText className="text-yellow-400" size={16} />;
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
      case 'tax_payment': return 'Оплата налога';
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
            <button onClick={() => setActiveTab('tax')} className={`px-3 py-2 rounded-2xl font-black text-sm shrink-0 whitespace-nowrap ${activeTab === 'tax' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-400'}`}>Налог</button>
            <button onClick={() => setActiveTab('house_tax')} className={`px-3 py-2 rounded-2xl font-black text-sm shrink-0 whitespace-nowrap ${activeTab === 'house_tax' ? 'bg-white/5 text-white' : 'bg-white/3 text-slate-400'}`}>Налог на дом</button>
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

              {activeTab === 'house_tax' && (
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="text-yellow-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-yellow-400/70 font-black">Налог на дом</div>
                    </div>
                    <div className="text-4xl font-black mt-2">
                      {player && dbHouses && dbHouses
                        .filter(h => h.owner_id === player.id)
                        .reduce((sum, house) => {
                          const houseClass = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
                          return sum + Math.round(houseClass.price * 0.001);
                        }, 0).toLocaleString()} ₽
                    </div>
                    <div className="text-[9px] text-yellow-300/50 mt-1">Ежемесячный налог (0.1% от стоимости)</div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-3">Ваши дома</div>
                    <div className="space-y-3">
                      {player && dbHouses && dbHouses.filter(h => h.owner_id === player.id).length > 0 ? (
                        dbHouses
                          .filter(h => h.owner_id === player.id)
                          .map((house, idx) => {
                            const houseClass = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
                            const taxAmount = Math.round(houseClass.price * 0.001);
                            const taxPaidUntil = house.tax_paid_until ? new Date(house.tax_paid_until) : null;
                            const isTaxPaid = taxPaidUntil && taxPaidUntil > new Date();
                            const daysLeft = isTaxPaid ? Math.ceil((taxPaidUntil - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                            
                            return (
                              <div key={idx} className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <div className="text-xs font-black">{house.name || `Дом #${house.id_name.replace('h_', '')}`}</div>
                                    <div className="text-[9px] text-slate-400">{houseClass.name}</div>
                                  </div>
                                  <div className={`text-xs font-black ${isTaxPaid ? 'text-green-400' : 'text-red-400'}`}>
                                    {isTaxPaid ? `Оплачен (${daysLeft} дн.)` : 'Не оплачен'}
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[11px] text-slate-400">Стоимость:</span>
                                  <span className="text-[11px] font-black">{houseClass.price.toLocaleString()} ₽</span>
                                </div>
                                
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[11px] text-slate-400">Ежемесячный налог (0.1%):</span>
                                  <span className="text-[11px] font-black">{taxAmount.toLocaleString()} ₽</span>
                                </div>
                                
                                {isTaxPaid && (
                                  <div className="text-[9px] text-slate-500 mb-3">
                                    Остается дней: {daysLeft}
                                  </div>
                                )}
                                
                                <button
                                  onClick={() => handlePayHouseTax(house.id_name)}
                                  disabled={isTaxPaid}
                                  className={`w-full py-2 rounded-2xl text-sm font-black uppercase transition-all ${
                                    isTaxPaid
                                      ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                                      : 'bg-yellow-500 hover:bg-yellow-400 text-black active:scale-95'
                                  }`}
                                >
                                  {isTaxPaid ? 'Уже оплачен' : `Оплатить ${taxAmount.toLocaleString()} ₽`}
                                </button>
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-[11px] text-slate-500 text-center py-4">Нет недвижимости</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="text-[9px] text-slate-400">
                      <div className="font-black text-slate-300 mb-1">Информация:</div>
                      • Налог на дом составляет 0.1% от стоимости ежемесячно<br />
                      • Оплата производится с банковского счета<br />
                      • Неоплата налога может привести к штрафным санкциям
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tax' && (
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="text-yellow-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-yellow-400/70 font-black">Налоговый счёт</div>
                    </div>
                    <div className="text-4xl font-black mt-2">{totalTax.toLocaleString()} ₽</div>
                    <div className="text-[9px] text-yellow-300/50 mt-1">К оплате в день</div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-3">Детали расчета</div>
                    <div className="space-y-2">
                      {player && dbHouses && dbHouses.filter(h => h.owner_id === player.id).length > 0 ? (
                        dbHouses
                          .filter(h => h.owner_id === player.id)
                          .map((house, idx) => {
                            const houseClass = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
                            const houseTax = Math.round(houseClass.price * 0.001);
                            const taxPaidUntil = house.tax_paid_until ? new Date(house.tax_paid_until) : null;
                            const taxPaid = taxPaidUntil && taxPaidUntil > new Date();
                            return (
                              <div key={idx} className="flex flex-col gap-1 p-2 bg-white/5 rounded-lg">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-400">Дом #{house.id.replace('h_', '')} ({houseClass.name})</span>
                                  <span className="text-white font-black">{houseTax.toLocaleString()} ₽</span>
                                </div>
                                {taxPaid && (
                                  <div className="text-[9px] text-green-400">
                                    Налог оплачен до {taxPaidUntil.toLocaleDateString('ru-RU')}
                                  </div>
                                )}
                                <button
                                  onClick={() => payHouseTax(house.id_name)}
                                  disabled={taxPaid}
                                  className={`text-[10px] px-2 py-1 rounded font-black uppercase transition-all ${
                                    taxPaid
                                      ? 'bg-green-500/20 text-green-400 cursor-default'
                                      : 'bg-yellow-500 hover:bg-yellow-400 text-black active:scale-95'
                                  }`}
                                >
                                  {taxPaid ? 'Оплачено' : 'Оплатить налог'}
                                </button>
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-[11px] text-slate-500">Нет недвижимости</div>
                      )}
                      
                      {player && businesses && businesses.filter(b => b.owner_id === player.id && b.purchased).length > 0 ? (
                        businesses
                          .filter(b => b.owner_id === player.id && b.purchased)
                          .map((biz, idx) => {
                            const bizTax = Math.round((biz.daily_earnings || 0) * 0.02);
                            const bizType = biz.id.split('_')[0];
                            const bizName = BUSINESS_TYPES[bizType]?.name || biz.id;
                            return (
                              <div key={idx} className="flex justify-between text-[11px]">
                                <span className="text-slate-400">{bizName}</span>
                                <span className="text-white font-black">{bizTax.toLocaleString()} ₽</span>
                              </div>
                            );
                          })
                      ) : null}
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="text-yellow-400" size={18} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Оплатить налог</div>
                    </div>
                    <div className="text-[9px] text-slate-400 mb-3">Доступно на счёте: {(player?.bank_balance || 0).toLocaleString()} ₽</div>
                    <div className="text-[9px] text-slate-400 mb-3">Минимальная сумма: {totalTax.toLocaleString()} ₽</div>
                    <input
                      inputMode="decimal"
                      placeholder={`Сумма (мин. ${totalTax.toLocaleString()})`}
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-yellow-400 transition-all mb-4"
                    />
                    <button 
                      onClick={() => handlePayTax(totalTax)} 
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase py-3 rounded-2xl transition-all active:scale-95 mb-3"
                    >
                      Оплатить {totalTax.toLocaleString()} ₽
                    </button>
                    <button 
                      onClick={handlePayTax} 
                      className="w-full bg-white/10 hover:bg-white/20 text-white font-black uppercase py-3 rounded-2xl transition-all active:scale-95"
                    >
                      оплатить другую сумму
                    </button>
                  </div>

                  <div className="bg-white/[0.03] border border-white/6 p-4 rounded-2xl">
                    <div className="text-[9px] text-slate-400">
                      <div className="font-black text-slate-300 mb-1">Как рассчитывается налог:</div>
                      • Недвижимость: 0.1% от стоимости дома в день
                      <br />• Бизнес: 2% от ежедневного дохода
                    </div>
                  </div>
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