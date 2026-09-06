import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSmsStore } from '../store/useSmsStore';
import { useNavigationStore } from '../store/useNavigationStore';
import BankView from './BankView';
import { OrganizationPanel } from './OrganizationView';
import { 
  X, Phone, PhoneOff, Send, MessageSquare, 
  Users, DollarSign, Shield, ArrowDownLeft, 
  ArrowUpRight, PhoneMissed, Play, Plus, Search 
} from 'lucide-react';

/* =========================================================================
   AUTHENTIC 2000s SYMBIAN S60 ICONS (Matching reference t.jpg)
   ========================================================================= */

function AntennaSignal({ bars = 4 }) {
  return (
    <div className="flex items-end gap-[1.5px] h-3.5">
      <svg viewBox="0 0 10 14" className="w-2.5 h-3.5 text-white fill-current">
        <path d="M1 1L5 6V13H6V6L10 1H8L5 4.8L2 1H1Z" />
      </svg>
      <div className={`w-[2.5px] h-1.5 rounded-[0.5px] ${bars >= 1 ? 'bg-white' : 'bg-white/20'}`} />
      <div className={`w-[2.5px] h-2 rounded-[0.5px] ${bars >= 2 ? 'bg-white' : 'bg-white/20'}`} />
      <div className={`w-[2.5px] h-2.5 rounded-[0.5px] ${bars >= 3 ? 'bg-white' : 'bg-white/20'}`} />
      <div className={`w-[2.5px] h-3 rounded-[0.5px] ${bars >= 4 ? 'bg-white' : 'bg-white/20'}`} />
    </div>
  );
}

function BatteryGauge({ percent = 85 }) {
  const bars = percent > 75 ? 4 : percent > 50 ? 3 : percent > 25 ? 2 : 1;
  return (
    <div className="flex items-center">
      <div className="w-5 h-3 border border-white/90 rounded-[1px] p-[1px] flex gap-[1px]">
        <div className={`h-full w-1 ${bars >= 1 ? 'bg-white' : 'bg-transparent'}`} />
        <div className={`h-full w-1 ${bars >= 2 ? 'bg-white' : 'bg-transparent'}`} />
        <div className={`h-full w-1 ${bars >= 3 ? 'bg-white' : 'bg-transparent'}`} />
        <div className={`h-full w-1 ${bars >= 4 ? 'bg-white' : 'bg-transparent'}`} />
      </div>
      <div className="w-[1.5px] h-1.5 bg-white/90 rounded-r-[0.5px]" />
    </div>
  );
}

function MessagingIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <rect x="4" y="12" width="40" height="26" rx="2" fill="#EAB308" stroke="#1C1917" strokeWidth="1.5" />
      <path d="M4 12L24 28L44 12" fill="#FEF08A" stroke="#78350F" strokeWidth="1.5" />
      <path d="M4 38L19 23M44 38L29 23" stroke="#A16207" strokeWidth="1.2" />
    </svg>
  );
}

function ContactsIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <rect x="12" y="7" width="26" height="34" rx="2" fill="#3E3426" stroke="#1C1917" strokeWidth="1.5" />
      <circle cx="25" cy="18" r="4.5" fill="#22C55E" stroke="#14532D" strokeWidth="1.2" />
      <path d="M18 32C18 27.5 21 25.5 25 25.5C29 25.5 32 27.5 32 32" fill="#22C55E" stroke="#14532D" strokeWidth="1.2" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <path d="M16 8H22V22H27L19 32L11 22H16V8Z" fill="#22C55E" stroke="#052E16" strokeWidth="1.5" />
      <path d="M29 38H23V24H18L26 14L34 24H29V38Z" fill="#0284C7" stroke="#082F49" strokeWidth="1.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <g transform="rotate(45 24 24)">
        <path d="M21 4C14.5 4.5 9 10 9 17C9 21.5 11.5 25.5 15 27.5V40C15 42 27 42 27 40V27.5C30.5 25.5 33 21.5 33 17C33 10 27.5 4.5 21 4ZM21 10C24 10 26 12 26 14L22 17L16 17L20 14C20 12 21 10 21 10Z" fill="#94A3B8" stroke="#1E293B" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <rect x="6" y="13" width="36" height="22" rx="2" fill="#57534E" stroke="#1C1917" strokeWidth="1.5" />
      <path d="M31 10H38V24C38 27 34 29 32 29C29.5 29 27 27 27 24.5C27 22 29.5 20 32 20C33.5 20 34.5 20.8 35 21.5V13H31V10Z" fill="#DC2626" stroke="#450A0A" strokeWidth="1.5" />
    </svg>
  );
}

function MediaIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <rect x="6" y="13" width="34" height="22" rx="2" fill="#57534E" stroke="#1C1917" strokeWidth="1.5" />
      <circle cx="33" cy="27" r="10" fill="#E2E8F0" stroke="#1E293B" strokeWidth="1.5" />
      <path d="M30 22L38 27L30 32Z" fill="#0284C7" />
    </svg>
  );
}

function OrganiserIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <rect x="7" y="9" width="34" height="32" rx="3" fill="#FFFFFF" stroke="#1C1917" strokeWidth="1.5" />
      <text x="24" y="30" fontFamily="Impact, sans-serif" fontSize="17" fontWeight="bold" fill="#DC2626" textAnchor="middle">12</text>
    </svg>
  );
}

function AppsIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <rect x="11" y="11" width="11" height="11" rx="2" fill="#3B82F6" stroke="#0F172A" strokeWidth="1.5" />
      <rect x="26" y="11" width="11" height="11" rx="2" fill="#64748B" stroke="#0F172A" strokeWidth="1.5" />
      <rect x="11" y="26" width="11" height="11" rx="2" fill="#64748B" stroke="#0F172A" strokeWidth="1.5" />
      <rect x="26" y="26" width="11" height="11" rx="2" fill="#64748B" stroke="#0F172A" strokeWidth="1.5" />
    </svg>
  );
}

function WebIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <circle cx="24" cy="24" r="16" fill="#0284C7" stroke="#0C4A6E" strokeWidth="1.5" />
      <path d="M17 14C20 13 23 16 26 15C29 14 31 16 32 18C30 20 28 22 25 21C22 20 20 23 18 24C16 23 15 20 16 17Z" fill="#22C55E" />
      <ellipse cx="24" cy="24" rx="9" ry="15.5" stroke="#38BDF8" strokeWidth="0.8" opacity="0.6" fill="none" />
    </svg>
  );
}

/* =========================================================================
   MAIN PHONE VIEW
   ========================================================================= */

export default function PhoneView({ onClose }) {
  const { player } = usePlayerStore();
  const { messages, unread, fetchMessages, sendSms, markAsRead } = useSmsStore();
  
  const [currentApp, setCurrentApp] = useState('menu');
  const [selectedIdx, setSelectedIdx] = useState(2); // Item #3 Log in t.jpg
  const [showBank, setShowBank] = useState(false);
  const [showOrg, setShowOrg] = useState(false);
  
  // SMS Compose state
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  useEffect(() => {
    fetchMessages?.();
  }, [fetchMessages]);

  if (showBank) {
    return <BankView onClose={() => setShowBank(false)} />;
  }
  if (showOrg) {
    return <OrganizationPanel orgId={player?.organization_id} onClose={() => setShowOrg(false)} />;
  }

  const menuItems = [
    { id: 'messaging', name: 'Messaging', icon: <MessagingIcon />, badge: unread, action: () => setCurrentApp('messaging') },
    { id: 'contacts', name: 'Contacts', icon: <ContactsIcon />, action: () => setCurrentApp('contacts') },
    { id: 'log', name: 'Log', icon: <LogIcon />, action: () => setCurrentApp('log') },
    { id: 'settings', name: 'Settings', icon: <SettingsIcon />, action: () => setCurrentApp('settings') },
    { id: 'bank', name: 'Gallery', sub: 'Банк', icon: <GalleryIcon />, action: () => setShowBank(true) },
    { id: 'media', name: 'Media', sub: 'Радио', icon: <MediaIcon />, action: () => setCurrentApp('media') },
    { id: 'organiser', name: 'Organiser', sub: 'Квесты', icon: <OrganiserIcon />, action: () => setCurrentApp('organiser') },
    { id: 'apps', name: 'Apps.', sub: 'Орг', icon: <AppsIcon />, action: () => setShowOrg(true) },
    { id: 'web', name: 'Web', sub: 'SA-Net', icon: <WebIcon />, action: () => setCurrentApp('web') },
  ];

  const handleSendSms = async () => {
    if (!smsPhone || !smsMessage.trim()) return;
    setSmsSending(true);
    const success = await sendSms(smsPhone, smsMessage);
    setSmsSending(false);
    if (success) {
      setSmsSent(true);
      setTimeout(() => {
        setSmsSent(false);
        setSmsPhone('');
        setSmsMessage('');
        setCurrentApp('messaging');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 select-none font-sans">
      {/* PHONE CASING CONTAINER */}
      <div className="relative w-[320px] sm:w-[340px] bg-gradient-to-b from-[#383A3F] via-[#2A2B30] to-[#1C1D21] rounded-[32px] p-3.5 pt-4 pb-5 border-[2px] border-[#525660] shadow-2xl flex flex-col items-center">
        
        {/* Top Speaker & Branding */}
        <div className="w-full flex items-center justify-between px-4 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-stone-900 border border-stone-700" />
          <div className="flex flex-col items-center">
            <div className="w-12 h-1 bg-stone-900 rounded-full border border-stone-700 mb-0.5" />
            <span className="text-[8px] font-black tracking-[0.2em] text-stone-400 uppercase">NOKIA</span>
          </div>
          <button onClick={onClose} className="w-5 h-5 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">✕</button>
        </div>

        {/* SCREEN FRAME */}
        <div className="w-full h-[360px] bg-black rounded-[8px] p-2 flex flex-col justify-between relative overflow-hidden border border-stone-800 shadow-inner">
          
          {/* Top Status Bar */}
          <div className="h-5 px-2 flex items-center justify-between text-white text-[11px] border-b border-black/30 bg-black/20 shrink-0">
            <div className="flex items-center gap-2">
              <AntennaSignal bars={4} />
              <BatteryGauge percent={90} />
            </div>
            <span className="font-mono text-[12px] font-bold">14:17</span>
          </div>

          {/* Subheader */}
          <div className="h-4 px-2 flex items-center justify-between text-white/90 text-[11px] shrink-0">
            <span>{currentApp === 'menu' ? 'Menu' : currentApp.toUpperCase()}</span>
            <span>{currentApp === 'menu' ? selectedIdx + 1 : ''}</span>
          </div>

          {/* SCREEN BODY */}
          <div className="flex-1 overflow-hidden relative">
            {currentApp === 'menu' ? (
              <div className="h-full flex p-1">
                {/* 3x3 Grid matching t.jpg */}
                <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-1">
                  {menuItems.map((item, idx) => {
                    const isSelected = selectedIdx === idx;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedIdx(idx);
                          item.action();
                        }}
                        className={`relative flex flex-col items-center justify-center rounded-[12px] cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-gradient-to-b from-white/95 via-[#ECECEC] to-[#CCCCCC] shadow-lg border border-white/80 scale-[1.02]'
                            : 'hover:bg-white/10'
                        }`}
                      >
                        {item.icon}
                        {item.badge > 0 && (
                          <span className="absolute top-0 right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold block leading-tight mt-0.5 ${isSelected ? 'text-stone-900' : 'text-white'}`}>
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Right scrollbar */}
                <div className="w-1 ml-1 h-full bg-black/30 rounded-full relative">
                  <div 
                    className="w-1 bg-white rounded-full transition-all"
                    style={{ height: '35%', transform: `translateY(${Math.floor(selectedIdx / 3) * 90}%)` }}
                  />
                </div>
              </div>
            ) : currentApp === 'messaging' ? (
              /* SMS INBOX */
              <div className="h-full bg-[#1C1917] p-2 flex flex-col text-white">
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-stone-800">
                  <span className="text-[10px] font-bold text-amber-400">Входящие SMS</span>
                  <button onClick={() => setCurrentApp('compose')} className="text-[9px] bg-amber-600 px-1.5 py-0.5 rounded font-bold">+ Написать</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {messages?.length === 0 ? (
                    <div className="text-center text-stone-500 text-xs py-6">Нет сообщений</div>
                  ) : (
                    messages?.map(msg => (
                      <div key={msg.id} onClick={() => markAsRead?.(msg.id)} className={`p-1.5 rounded border text-[10px] cursor-pointer ${!msg.read ? 'bg-amber-950/40 border-amber-500/60' : 'bg-stone-900 border-stone-800'}`}>
                        <div className="flex justify-between font-bold text-amber-300">
                          <span>{msg.from_phone}</span>
                          <span className="text-[8px] text-stone-400">{new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-stone-300 line-clamp-1">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : currentApp === 'compose' ? (
              /* SMS COMPOSE */
              <div className="h-full bg-[#1C1917] p-2 flex flex-col text-white">
                <span className="text-[10px] font-bold text-amber-400 mb-1">Новое сообщение</span>
                <input
                  type="text"
                  placeholder="Номер получателя"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-[10px] text-white outline-none mb-1"
                />
                <textarea
                  rows={3}
                  placeholder="Текст..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="flex-1 w-full bg-stone-900 border border-stone-700 rounded p-1.5 text-[10px] text-white outline-none resize-none mb-1 font-sans"
                />
                <button
                  onClick={handleSendSms}
                  disabled={!smsPhone || !smsMessage.trim() || smsSending}
                  className="w-full bg-amber-600 hover:bg-amber-500 py-1 rounded text-[10px] font-bold text-white"
                >
                  {smsSending ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 text-xs">
                Раздел {currentApp}
              </div>
            )}
          </div>

          {/* Bottom Softkeys */}
          <div className="h-6 px-2 flex items-center justify-between text-white text-[12px] border-t border-black/30 bg-black/25 shrink-0">
            <button onClick={() => setCurrentApp('menu')} className="hover:text-amber-300">Options</button>
            <button onClick={() => menuItems[selectedIdx]?.action()} className="font-bold text-[13px] hover:text-amber-300">
              {currentApp === 'menu' ? 'Select' : 'OK'}
            </button>
            <button onClick={() => { if (currentApp !== 'menu') setCurrentApp('menu'); else onClose(); }} className="hover:text-amber-300">
              {currentApp === 'menu' ? 'Exit' : 'Back'}
            </button>
          </div>
        </div>

        {/* Physical D-Pad and Navigation Keypad */}
        <div className="w-full mt-2.5 px-2 flex items-center justify-between">
          <button onClick={() => setCurrentApp('menu')} className="w-12 h-6 bg-stone-700 rounded border border-stone-500 text-[10px] text-stone-300 font-bold">[-]</button>
          <div className="w-12 h-12 rounded-full bg-stone-700 border-2 border-stone-500 flex items-center justify-center font-bold text-xs text-stone-300 shadow">
            OK
          </div>
          <button onClick={onClose} className="w-12 h-6 bg-red-800 rounded border border-red-600 text-[10px] text-white font-bold">[-]</button>
        </div>
      </div>
    </div>
  );
}
