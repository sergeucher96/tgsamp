import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useBusinessStore } from '../store/useBusinessStore';
import { BUSINESS_TYPES } from '../data/businessConfig';
import { FINAL_LOCATIONS } from '../data/locations';

export default function BusinessView({ businessId, onClose }) {
  const player = usePlayerStore(state => state.player);
  const { businesses, fetchBusinesses, getBusinessState, buyBusiness, isPlayerOwner, getDailyEarnings, getLocationType } = useBusinessStore();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchBusinesses();
  }, [refreshKey]);

  const state = getBusinessState(businessId);
  const owner = isPlayerOwner(businessId);
  const locType = getLocationType(businessId);
  const bizType = BUSINESS_TYPES[locType];
  const dailyEarnings = getDailyEarnings(businessId);

  const locInfo = FINAL_LOCATIONS?.find(l => l.id === businessId);
  const bizName = locInfo?.name || businessId;
  const bizIcon = locInfo?.icon || bizType?.icon || '🏢';

  const handleBuy = async () => {
    const success = await buyBusiness(businessId);
    if (success) setRefreshKey(k => k + 1);
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
              <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Текущий доход/день</p>
                <p className="font-black text-2xl text-[#7eff67]">${dailyEarnings.toLocaleString()}</p>
              </div>
              {state.purchased_at && (
                <p className="text-[9px] text-slate-500 mt-2">
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

          {/* Hotel special button — opens HotelView for room management */}
          {locType === 'hotel' && state.purchased && owner && (
            <button
              onClick={() => {
                onClose();
                // Will be handled by MapView to open HotelView
                window.dispatchEvent(new CustomEvent('openHotelView', { detail: businessId }));
              }}
              className="w-full mb-4 rounded-3xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition"
            >
              🏨 Управление отелем (комнаты)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
