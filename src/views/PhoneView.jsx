import React, { useState } from 'react';
import { X, Banknote, MessageSquare } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useBankStore } from '../store/useBankStore';
import BankView from './BankView';

export default function PhoneView({ onClose }) {
  const player = usePlayerStore(state => state.player);
  const [showBank, setShowBank] = useState(false);
  const [smsTab, setSmsTab] = useState('compose');
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  if (showBank) {
    return <BankView onClose={() => setShowBank(false)} />;
  }

  const handleSendSms = () => {
    if (!smsPhone || !smsMessage.trim()) return;
    setSmsSent(true);
    setTimeout(() => {
      setSmsSent(false);
      setSmsPhone('');
      setSmsMessage('');
    }, 2000);
  };

  const apps = [
    { icon: <Banknote size={24} />, label: 'Банк', color: 'from-teal-500 to-emerald-600', onClick: () => setShowBank(true) },
    { icon: <MessageSquare size={24} />, label: 'SMS', color: 'from-blue-500 to-indigo-600', onClick: () => setSmsTab('compose') },
  ];

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-sm">
        {/* Phone frame */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-6 shadow-2xl border border-white/10 relative overflow-hidden">
          
          {/* Status bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-6">
            <span>21:00</span>
            <span className="font-black text-white">SAN ANDREAS</span>
            <span>100%</span>
          </div>

          {/* Close button */}
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-xl active:scale-90">
            <X size={16} />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">📱</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Номер: {player?.phone_number || 'Без сим-карты'}</div>
          </div>

          {/* Apps grid */}
          <div className="grid grid-cols-2 gap-4">
            {apps.map((app, i) => (
              <button
                key={i}
                onClick={app.onClick}
                className={`bg-gradient-to-br ${app.color} p-6 rounded-2xl flex flex-col items-center gap-3 active:scale-95 transition-all shadow-lg`}
              >
                {app.icon}
                <span className="text-sm font-black uppercase">{app.label}</span>
              </button>
            ))}
          </div>

          {/* SMS View */}
          {smsTab === 'compose' && (
            <div className="mt-6 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Новое сообщение</span>
                <button onClick={() => setSmsTab(null)} className="text-slate-400"><X size={14} /></button>
              </div>

              {smsSent ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-sm font-black text-green-400">Сообщение отправлено!</div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Номер телефона"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-400 transition-all mb-3 text-sm"
                  />
                  <textarea
                    placeholder="Сообщение..."
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-400 transition-all mb-3 text-sm resize-none"
                  />
                  <button
                    onClick={handleSendSms}
                    disabled={!smsPhone || !smsMessage.trim()}
                    className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-black uppercase py-3 rounded-xl transition-all active:scale-95"
                  >
                    Отправить
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
