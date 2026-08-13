import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useHotelStore } from '../store/useHotelStore';
import { HOTEL_PURCHASE_PRICE, HOTEL_ROOMS, HOTEL_PRICES, HOTEL_PRICE_LABELS } from '../data/hotelConfig';
import { FINAL_LOCATIONS } from '../data/locations';

export default function HotelView({ hotelId, onClose }) {
  const player = usePlayerStore(state => state.player);
  const { hotels, fetchHotels, getHotelState, getOwnerEarnings, buyHotel, rentRoom, isProcessing } = useHotelStore();
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    fetchHotels();
  }, [refreshKey]);

  const state = getHotelState(hotelId);
  const isOwner = state.purchased && state.owner_id === player?.id;
  const earnings = getOwnerEarnings(hotelId);
  
  const now = new Date();
  const activeRooms = state.rooms.filter(r => r.rented && r.expires_at && new Date(r.expires_at) > now);
  const freeRooms = HOTEL_ROOMS - activeRooms.length;
  const hotelInfo = FINAL_LOCATIONS?.find(l => l.id === hotelId);
  const hotelName = hotelInfo?.name || state.id;

  const handleBuy = async () => {
    const success = await buyHotel(hotelId);
    if (success) setRefreshKey(k => k + 1);
  };

  const handleRent = async (days) => {
    const success = await rentRoom(hotelId, days);
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
            <h2 className="text-2xl font-black uppercase tracking-[0.12em] text-[#d6ff9f]">{hotelName}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          
          {/* Hotel Stats Card */}
          <div className="mb-4 rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Комнат</p>
                <p className="font-black text-xl text-[#def1b8]">{HOTEL_ROOMS}</p>
              </div>
              <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Свободно</p>
                <p className={`font-black text-xl ${freeRooms > 0 ? 'text-[#7eff67]' : 'text-red-400'}`}>{freeRooms}</p>
              </div>
              <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Занято</p>
                <p className="font-black text-xl text-[#def1b8]">{activeRooms.length}</p>
              </div>
            </div>
          </div>

          {/* Not purchased yet */}
          {!state.purchased && (
            <div className="mb-4 rounded-3xl border border-yellow-500/20 bg-[#1a1a0a]/80 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400 font-black mb-2">Отель продаётся</p>
              <p className="text-sm text-slate-300 mb-3">Станьте владельцем и зарабатывайте на аренде комнат!</p>
              <div className="rounded-2xl bg-[#1a1a00]/90 p-3 border border-yellow-500/20 mb-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400">Стоимость</p>
                <p className="font-black text-2xl text-yellow-300">${HOTEL_PURCHASE_PRICE.toLocaleString()}</p>
              </div>
              <button 
                onClick={handleBuy} 
                disabled={isProcessing || Number(player?.money || 0) < HOTEL_PURCHASE_PRICE}
                className="w-full rounded-3xl bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition"
              >
                {isProcessing ? 'Обработка...' : `Купить отель — $${HOTEL_PURCHASE_PRICE.toLocaleString()}`}
              </button>
            </div>
          )}

          {/* Owner panel */}
          {isOwner && (
            <div className="mb-4 rounded-3xl border border-[#7eff67]/20 bg-[#0a1a0a]/80 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">👑</span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#7eff67] font-black">Вы — владелец</p>
                  <p className="text-[9px] text-slate-400">Управление отелем</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Заработок/день</p>
                  <p className="font-black text-xl text-[#7eff67]">${earnings.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-[#0b1b0d]/90 p-3 border border-[#7eff67]/10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c]">Активных гостей</p>
                  <p className="font-black text-xl text-[#def1b8]">{activeRooms.length}</p>
                </div>
              </div>

              {activeRooms.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] font-black mb-2">Арендованные комнаты</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {activeRooms.map((room, i) => (
                      <div key={i} className="flex items-center justify-between rounded-2xl bg-[#0b1b0d]/60 p-3 border border-[#7eff67]/5">
                        <div>
                          <p className="text-sm font-black text-[#d6ff9f]">Комната {room.room_number}</p>
                          <p className="text-[10px] text-slate-400">{room.renter_name || 'Неизвестно'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#7eff67]">${(room.rent_price || 0).toLocaleString()}</p>
                          <p className="text-[9px] text-slate-500">
                            до {new Date(room.expires_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guest — rent room (if not owned by current player) */}
          {!isOwner && (
            <div className="mb-4 rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] font-black mb-1">Аренда комнаты</p>
              <p className="text-[9px] text-slate-400 mb-3">Свободно комнат: {freeRooms} из {HOTEL_ROOMS}</p>
              
              <div className="space-y-2">
                {Object.entries(HOTEL_PRICES).map(([days, price]) => {
                  const daysNum = parseInt(days);
                  const canAfford = Number(player?.money || 0) >= price;
                  return (
                    <button
                      key={days}
                      onClick={() => handleRent(daysNum)}
                      disabled={isProcessing || !canAfford || freeRooms <= 0}
                      className="w-full flex items-center justify-between rounded-2xl bg-[#0b1b0d]/90 hover:bg-[#143117]/90 disabled:opacity-40 disabled:cursor-not-allowed p-4 border border-[#7eff67]/10 transition"
                    >
                      <div className="text-left">
                        <p className="font-black text-sm text-[#d6ff9f]">{HOTEL_PRICE_LABELS[daysNum]}</p>
                        <p className="text-[10px] text-slate-400">
                          ${(Math.floor(price / daysNum)).toLocaleString()}/сутка
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-lg ${canAfford ? 'text-[#7eff67]' : 'text-red-400'}`}>
                          ${price.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {freeRooms <= 0 && (
                <p className="text-center text-red-400 text-xs mt-3 font-black uppercase">
                  Все комнаты заняты
                </p>
              )}
            </div>
          )}

          {/* Hotel not purchased — show info */}
          {!state.purchased && (
            <div className="mb-4 rounded-3xl border border-[#7eff67]/10 bg-[#09170d]/80 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#aef06c] font-black mb-2">Информация</p>
              <p className="text-sm text-[#b8e8a3]">
                Добро пожаловать в {hotelName}! Выберите срок аренды или купите отель в управление.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
