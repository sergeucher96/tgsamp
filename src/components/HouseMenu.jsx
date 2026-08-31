import React, { useState } from 'react';
import { X, DoorOpen, BadgeDollarSign, Navigation, Lock, Box, CarFront, Heart, Share2, Home, MapPin, BedDouble } from 'lucide-react';
import { HOUSE_CLASSES } from '../data/houseConfig';
import { getHousePreview } from '../data/houseStyles';
import { useNavigationStore } from '../store/useNavigationStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { supabase } from '../api/supabase';

export default function HouseMenu({ house, player, onBuy, onGPS, onClose }) {
  const setInterior = useNavigationStore(state => state.setInterior);
  const activeVehicle = usePlayerStore(state => state.activeVehicle);
  
  const houseClass = HOUSE_CLASSES[house.class] || HOUSE_CLASSES.economy;
  const isOwner = house.owner_id === player?.id;
  const houseNumber = house.id.replace('h_', '');
  const isAtHouse = Math.abs(player.pos_x - house.x) < 35 && Math.abs(player.pos_y - house.y) < 35;
  
  const dailyTax = Math.round(houseClass.price * 0.001);

  return (
    <div className="fixed inset-0 z-[200] flex bg-black font-sans">
      <div className="w-full bg-[#080d1a] overflow-y-auto" style={{ maxHeight: '100vh' }}>
        
        {/* Header with image */}
        <div className="relative">
          <div className="w-full h-48 overflow-hidden bg-slate-900">
            <img src={getHousePreview(house)} alt="House" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-transparent" />
          </div>
          
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex justify-between p-4">
            <button onClick={onClose} className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white active:scale-90">
              <X size={18} />
            </button>
            <div className="flex gap-2">
              <button className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white active:scale-90">
                <Heart size={18} />
              </button>
              <button className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white active:scale-90">
                <Share2 size={18} />
              </button>
            </div>
          </div>
          
          {/* Price badge */}
          {!house.owner_id && (
            <div className="absolute bottom-3 right-4">
              <div className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black italic shadow-xl border border-white/20">
                ${houseClass.price.toLocaleString()}
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          
          {/* Title section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={12} className="text-teal-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400">Сан-Андреас</span>
            </div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none mb-1">
              Дом #{houseNumber}
            </h1>
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${houseClass.color.replace('bg-', 'text-')}`}>
              {houseClass.name}
            </span>
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${houseClass.color} text-white`}>
                {houseClass.name}
              </span>
              {isOwner && (
                <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white">
                  Ваш дом
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {houseClass.description || `Недвижимость класса "${houseClass.name}" в штате Сан-Андreas. Идеально подходит для проживания и хранения имущества.`}
            </p>
          </div>
          
          {/* Specs grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl text-center">
              <CarFront size={14} className="text-slate-500 mb-1 mx-auto" />
              <span className="text-lg font-black italic text-white block">{houseClass.garage_slots}</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">Гараж</span>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl text-center">
              <BedDouble size={14} className="text-slate-500 mb-1 mx-auto" />
              <span className="text-lg font-black italic text-white block">{houseClass.bedrooms || 1}</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">Спальни</span>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl text-center">
              <Box size={14} className="text-slate-500 mb-1 mx-auto" />
              <span className="text-lg font-black italic text-white block">{houseClass.wardrobe_slots}</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">Ячеек</span>
            </div>
          </div>
          
          {/* Tax info */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 mb-5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Налог в день</span>
              <span className="text-white font-black">${dailyTax}</span>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            {!house.owner_id ? (
              isAtHouse ? (
                <button onClick={() => onBuy(house)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase italic text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                  <BadgeDollarSign size={20} /> Купить дом
                </button>
              ) : (
                <button onClick={() => onGPS(house)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase italic text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Navigation size={20} /> Проложить маршрут
                </button>
              )
            ) : (
              isOwner ? (
                isAtHouse ? (
                  <button onClick={() => {
                    if (activeVehicle) {
                      usePlayerStore.getState().setLocalActiveVehicle(null);
                    }
                    setInterior(house.id);
                    onClose();
                  }} className="w-full bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-2xl font-black uppercase italic text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <DoorOpen size={20} /> Войти в дом
                  </button>
                ) : (
                  <button onClick={() => { onGPS(house); onClose(); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase italic text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Navigation size={20} /> Перейти к дому
                  </button>
                )
              ) : (
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-center text-red-500 font-black uppercase italic text-xs">
                  Дом занят
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}