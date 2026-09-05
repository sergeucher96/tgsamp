import React, { useEffect, useState } from 'react';
import { ArrowLeft, Package, BarChart2, ShoppingCart, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useBusinessStore } from '../store/useBusinessStore';
import { BUSINESS_TYPES, RESOURCE_TYPES } from '../data/businessConfig';
import { FINAL_LOCATIONS } from '../data/locations';

export default function BusinessView({ businessId, onClose }) {
  const player = usePlayerStore(state => state.player);
  const { businesses, fetchBusinesses, getBusinessState, buyBusiness, isPlayerOwner, getDailyEarnings, getLocationType,
           loadBusinessData, getResources, getReports, getSalesHistory, placeOrder, isProcessing, depositToBusiness, withdrawFromBusiness } = useBusinessStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState('overview');
  const [orderResource, setOrderResource] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderPrice, setOrderPrice] = useState(10);
  const [showOrderMenu, setShowOrderMenu] = useState(false);
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');

  useEffect(() => {
    fetchBusinesses();
    loadBusinessData(businessId);
  }, [businessId]);

  useEffect(() => {
    const state = getBusinessState(businessId);
    if (state.purchased) {
      loadBusinessData(businessId);
    }
  }, [businessId, refreshKey, businesses]);

  const state = getBusinessState(businessId);
  const owner = isPlayerOwner(businessId);
  const locType = getLocationType(businessId);
  const bizType = BUSINESS_TYPES[locType];
  const dailyEarnings = getDailyEarnings(businessId);
  const resources = getResources(businessId);
  const reports = getReports(businessId);
  const salesHistory = getSalesHistory(businessId);
  const locInfo = FINAL_LOCATIONS?.find(l => l.id === businessId);
  const bizName = locInfo?.name || businessId;
  const bizIcon = locInfo?.icon || bizType?.icon || '🏢';

  const handleBuy = async () => {
    const success = await buyBusiness(businessId);
    if (success) {
      setRefreshKey(k => k + 1);
      setTab('overview');
    }
  };

  const handlePlaceOrder = async () => {
    if (!orderResource || orderQuantity < 1 || orderPrice < 1) return;
    const success = await placeOrder(businessId, orderResource, orderQuantity, orderPrice);
    if (success) {
      setShowOrderMenu(false);
      setOrderQuantity(1);
      setOrderPrice(10);
      setRefreshKey(k => k + 1);
    }
  };

  const handleDeposit = async () => {
    const amount = parseInt(balanceAmount);
    if (!amount || amount <= 0) return;
    const success = await depositToBusiness(businessId, amount);
    if (success) {
      setShowBalanceMenu(false);
      setBalanceAmount('');
      setRefreshKey(k => k + 1);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(balanceAmount);
    if (!amount || amount <= 0) return;
    const success = await withdrawFromBusiness(businessId, amount);
    if (success) {
      setShowBalanceMenu(false);
      setBalanceAmount('');
      setRefreshKey(k => k + 1);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'completed': return 'Выполнен';
      case 'failed': return 'Не выполнен';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#020617]/98 backdrop-blur-xl flex flex-col text-white font-sans animate-in fade-in duration-300 overflow-hidden">
      <div className="w-full h-full bg-[#051009]/100 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15 bg-gradient-to-b from-[#0a1f0a] to-transparent">
          <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f] hover:bg-[#152013]/90 transition">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>
          <div className="min-w-0 text-right">
            <p className="text-[8px] uppercase tracking-[0.35em] text-[#9eff52] font-black">Business</p>
            <h2 className="text-xl font-black uppercase tracking-[0.12em] text-[#d6ff9f]">{bizName}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">

          {/* Business Info Card */}
          <div className="mb-4 rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{bizIcon}</span>
              <div>
                <p className="font-black text-lg text-[#d6ff9f]">{bizType?.name || locType}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Ежедневный доход</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Стоимость</p>
                <p className="font-black text-xl text-[#def1b8]">${(bizType?.purchasePrice || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Доход/день</p>
                <p className="font-black text-xl text-[#7eff67]">${(bizType?.dailyIncome || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Not purchased — buy button */}
          {!state.purchased && (
            <div className="mb-4 rounded-3xl border border-yellow-500/20 bg-[#1a1a0a]/80 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400 font-black mb-2">Бизнес продаётся</p>
              <p className="text-sm text-slate-300 mb-3">Станьте владельцем и получайте пассивный доход!</p>
              <button
                onClick={handleBuy}
                disabled={isProcessing}
                className="w-full rounded-3xl bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition"
              >
                Купить за ${(bizType?.purchasePrice || 0).toLocaleString()}
              </button>
            </div>
          )}

          {/* Owner panel */}
          {state.purchased && owner && (
            <div className="mb-4 rounded-3xl border border-[#7eff67]/20 bg-[#0a1a0a]/80 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">👑</span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#7eff67] font-black">Вы — владелец</p>
                  <p className="text-[9px] text-slate-400">Управление бизнесом</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Доход/день</p>
                  <p className="font-black text-xl text-[#7eff67]">${dailyEarnings.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Баланс</p>
                  <button
                    onClick={() => setShowBalanceMenu(true)}
                    className="font-black text-xl text-[#def1b8] hover:text-white transition w-full text-left"
                  >
                    ${Number(state.business_balance || 0).toLocaleString()}
                  </button>
                </div>
              </div>
              {state.purchased_at && (
                <p className="text-[9px] text-slate-500">
                  Куплен: {new Date(state.purchased_at).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          )}

          {/* Purchased by someone else */}
          {state.purchased && !owner && (
            <div className="mb-4 rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] font-black mb-2">Этот бизнес имеет владельца</p>
              <p className="text-sm text-[#b8e8a3]">Вы можете использовать услуги этого бизнеса.</p>
            </div>
          )}

          {/* Owner tabs */}
          {state.purchased && owner && (
            <>
              <div className="flex gap-2 mb-4 overflow-x-auto">
                <button
                  onClick={() => setTab('overview')}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    tab === 'overview' ? 'bg-[#7eff67]/20 text-[#7eff67]' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  Обзор
                </button>
                <button
                  onClick={() => setTab('warehouse')}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    tab === 'warehouse' ? 'bg-[#7eff67]/20 text-[#7eff67]' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Package size={14} /> Склад
                </button>
                <button
                  onClick={() => setTab('reports')}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    tab === 'reports' ? 'bg-[#7eff67]/20 text-[#7eff67]' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <BarChart2 size={14} /> Отчёты
                </button>
              </div>

              {/* Warehouse tab */}
              {tab === 'warehouse' && (
                <div className="space-y-3">
                  {/* Order button */}
                  <button
                    onClick={() => setShowOrderMenu(!showOrderMenu)}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-3xl bg-[#7eff67] hover:bg-[#6ee559] disabled:opacity-40 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#020617] transition"
                  >
                    <ShoppingCart size={16} /> Заказать ресурсы
                    {showOrderMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {/* Order form */}
                  {showOrderMenu && (
                    <div className="rounded-3xl border border-[#7eff67]/20 bg-[#0a1a0a]/80 p-4 space-y-3">
                      <select
                        value={orderResource}
                        onChange={e => setOrderResource(e.target.value)}
                        className="w-full bg-[#0b1b0d] border border-[#7eff67]/10 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="">Выберите ресурс</option>
                        {Object.entries(RESOURCE_TYPES).map(([key, val]) => (
                          <option key={key} value={key}>{val.icon} {val.name}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1">Количество</p>
                          <input
                            type="number"
                            min="1"
                            value={orderQuantity}
                            onChange={e => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-[#0b1b0d] border border-[#7eff67]/10 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1">Цена за 1 ед. ($)</p>
                          <input
                            type="number"
                            min="1"
                            value={orderPrice}
                            onChange={e => setOrderPrice(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-[#0b1b0d] border border-[#7eff67]/10 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Итого:</span>
                        <span className="font-black text-lg text-[#7eff67]">${(orderQuantity * orderPrice).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={isProcessing || !orderResource}
                        className="w-full rounded-3xl bg-[#7eff67] hover:bg-[#6ee559] disabled:opacity-40 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#020617] transition"
                      >
                        Подтвердить заказ
                      </button>
                    </div>
                  )}

                  {/* Resources list */}
                  <div className="rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] font-black mb-3">Склад</p>
                    <div className="space-y-2">
                      {Object.entries(RESOURCE_TYPES).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{val.icon}</span>
                            <span className="text-sm font-black">{val.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg" style={{ color: val.color }}>
                              {Number(resources[key] || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500">ед.</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Orders list */}
                  <div className="rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] font-black mb-3">Заказы</p>
                    {(() => {
                      const orders = useBusinessStore.getState().orders[businessId] || [];
                      if (orders.length === 0) {
                        return <p className="text-xs text-slate-500 text-center py-4">Нет заказов</p>;
                      }
                      return (
                        <div className="space-y-2">
                          {orders.map(order => (
                            <div key={order.id} className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span>{RESOURCE_TYPES[order.resource_type]?.icon || '📦'}</span>
                                  <span className="text-xs font-black">{RESOURCE_TYPES[order.resource_type]?.name || order.resource_type}</span>
                                  <span className="text-xs text-slate-400">× {Number(order.quantity)}</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${
                                  order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                  order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {getStatusLabel(order.status)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-slate-400">
                                  ${Number(order.price_per_unit)}/ед • ${Number(order.total_cost).toLocaleString()}
                                </span>
                                <span className="text-[9px] text-slate-500">
                                  {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Reports tab */}
              {tab === 'reports' && (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] font-black mb-3">Потребление ресурсов</p>
                    <div className="space-y-3">
                      {Object.entries(RESOURCE_TYPES).map(([key, val]) => {
                        const report = reports[key] || { consumed_hour: 0, consumed_day: 0, consumed_week: 0 };
                        return (
                          <div key={key} className="rounded-2xl bg-[#0b1b0d]/90 border border-[#7eff67]/10 overflow-hidden">
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{val.icon}</span>
                                <span className="text-sm font-black">{val.name}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-[#7eff67]/10">
                              <div className="p-2 text-center">
                                <p className="text-[9px] text-slate-400 uppercase">За час</p>
                                <p className="font-black text-sm" style={{ color: val.color }}>
                                  {Number(report.consumed_hour).toLocaleString()}
                                </p>
                              </div>
                              <div className="p-2 text-center">
                                <p className="text-[9px] text-slate-400 uppercase">За день</p>
                                <p className="font-black text-sm" style={{ color: val.color }}>
                                  {Number(report.consumed_day).toLocaleString()}
                                </p>
                              </div>
                              <div className="p-2 text-center">
                                <p className="text-[9px] text-slate-400 uppercase">За неделю</p>
                                <p className="font-black text-sm" style={{ color: val.color }}>
                                  {Number(report.consumed_week).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sales history */}
                  <div className="rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] font-black mb-3">История покупок</p>
                    {salesHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">Пока нет продаж</p>
                    ) : (
                      <div className="space-y-2">
                        {salesHistory.map(sale => (
                          <div key={sale.id} className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span>🛒</span>
                                <span className="text-xs font-black">{sale.product_name}</span>
                                <span className="text-xs text-slate-400">— {sale.buyer_name}</span>
                              </div>
                              <span className="text-xs font-black text-[#7eff67]">
                                +${Number(sale.sale_price || sale.sale_amount || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              {(() => {
                                const rc = sale.resources_consumed || sale.resource_changes;
                                if (!rc) return null;
                                const entries = typeof rc === 'string' ? Object.entries(JSON.parse(rc)) : Object.entries(rc);
                                if (entries.length === 0) return null;
                                return (
                                  <div className="flex gap-2">
                                    {entries.map(([res, qty]) => (
                                      <span key={res} className="text-[9px] text-red-400">
                                        {RESOURCE_TYPES[res]?.icon || ''} {RESOURCE_TYPES[res]?.name || res}: {qty}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
                              <span className="text-[9px] text-slate-500">
                                {new Date(sale.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Hotel special button */}
          {locType === 'hotel' && state.purchased && owner && (
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('openHotelView', { detail: businessId }));
              }}
              className="w-full mb-4 rounded-3xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition"
            >
              🏨 Управление отелем (комнаты)
            </button>
          )}
        </div>

        {/* Balance menu modal */}
        {showBalanceMenu && (
          <div className="fixed inset-0 z-[600] bg-black/80 flex items-center justify-center p-6" onClick={() => setShowBalanceMenu(false)}>
            <div
              className="bg-[#0a1a0a] border border-[#7eff67]/20 rounded-3xl p-6 w-full max-w-sm space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-[#d6ff9f]">Счёт бизнеса</h3>
                <button onClick={() => setShowBalanceMenu(false)} className="p-2 rounded-xl bg-white/5">
                  <Plus size={16} className="rotate-45" />
                </button>
              </div>

              {/* Current balance */}
              <div className="rounded-2xl bg-[#0b1b0d]/90 p-4 border border-[#7eff67]/10 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Баланс</p>
                <p className="font-black text-3xl text-[#def1b8]">${Number(state.business_balance || 0).toLocaleString()}</p>
              </div>

              {/* Amount input */}
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Сумма ($)</p>
                <input
                  type="number"
                  min="1"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(e.target.value)}
                  placeholder="Введите сумму"
                  className="w-full bg-[#0b1b0d] border border-[#7eff67]/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#7eff67]/30"
                />
              </div>

              {/* Player money info */}
              <p className="text-[10px] text-slate-500 text-center">
                Ваши деньги: ${Number(player?.money || 0).toLocaleString()}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleDeposit}
                  disabled={isProcessing || !balanceAmount || Number(balanceAmount) <= 0}
                  className="flex-1 rounded-3xl bg-[#7eff67] hover:bg-[#6ee559] disabled:opacity-40 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#020617] transition flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> Пополнить
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isProcessing || !balanceAmount || Number(balanceAmount) <= 0}
                  className="flex-1 rounded-3xl bg-red-600 hover:bg-red-500 disabled:opacity-40 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition flex items-center justify-center gap-1"
                >
                  <Minus size={14} /> Снять
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
