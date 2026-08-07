import React, { useState, useEffect } from 'react';
import { X, Banknote, MessageSquare, Inbox, Send } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSmsStore } from '../store/useSmsStore';
import BankView from './BankView';

export default function PhoneView({ onClose }) {
  const player = usePlayerStore(state => state.player);
  const { messages, fetchMessages, sendSms, markAsRead, getUnreadCount } = useSmsStore();
  const unread = getUnreadCount();

  const [showBank, setShowBank] = useState(false);
  const [smsTab, setSmsTab] = useState(null);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  if (showBank) {
    return <BankView onClose={() => setShowBank(false)} />;
  }

  const handleSendSms = async () => {
    if (!smsPhone || !smsMessage.trim()) return;
    setSmsSending(true);
    setSmsError(false);
    const success = await sendSms(smsPhone, smsMessage);
    setSmsSending(false);
    if (success) {
      setSmsSent(true);
      setTimeout(() => {
        setSmsSent(false);
        setSmsPhone('');
        setSmsMessage('');
      }, 2000);
    } else {
      setSmsError(true);
      setTimeout(() => setSmsError(false), 3000);
    }
  };

  const apps = [
    { icon: <Banknote size={24} />, label: 'Банк', color: 'from-teal-500 to-emerald-600', onClick: () => setShowBank(true) },
    { icon: <MessageSquare size={24} />, label: 'SMS', color: 'from-blue-500 to-indigo-600', badge: unread, onClick: () => setSmsTab('inbox') },
  ];

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col text-white font-sans">
      <div className="w-full bg-gradient-to-b from-gray-800 to-gray-900 flex-1 p-6 relative overflow-hidden">

          {/* Status bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-6">
            <span>21:00</span>
            <span className="font-black text-white">SAN ANDREAS</span>
            <span>100%</span>
          </div>

          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-xl active:scale-90">
            <X size={16} />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">📱</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
              Номер: {player?.phone_number || 'Без сим-карты'}
            </div>
          </div>

          {/* Apps grid */}
          <div className="grid grid-cols-2 gap-4">
            {apps.map((app, i) => (
              <button
                key={i}
                onClick={app.onClick}
                className={`bg-gradient-to-br ${app.color} p-6 rounded-2xl flex flex-col items-center gap-3 active:scale-95 transition-all shadow-lg relative`}
              >
                {app.icon}
                {app.badge > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {app.badge}
                  </span>
                )}
                <span className="text-sm font-black uppercase">{app.label}</span>
              </button>
            ))}
          </div>

          {/* SMS Inbox */}
          {smsTab === 'inbox' && (
            <div className="mt-6 bg-white/5 rounded-2xl p-4 border border-white/10" style={{ maxHeight: '300px' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Inbox size={14} className="text-blue-400" />
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                    Входящие {unread > 0 && `(${unread})`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSmsTab('compose')} className="text-xs text-blue-400 font-black">Новое</button>
                  <button onClick={() => setSmsTab(null)} className="text-slate-400"><X size={14} /></button>
                </div>
              </div>

              <div className="overflow-y-auto space-y-2" style={{ maxHeight: '220px' }}>
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-6">Нет сообщений</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => markAsRead(msg.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        !msg.read ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-blue-400">{msg.from_phone}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(msg.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 line-clamp-2">{msg.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SMS Compose */}
          {smsTab === 'compose' && (
            <div className="mt-6 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Send size={14} className="text-blue-400" />
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Новое сообщение</span>
                </div>
                <button onClick={() => setSmsTab('inbox')} className="text-slate-400"><X size={14} /></button>
              </div>

              {smsSent ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-sm font-black text-green-400">Сообщение отправлено!</div>
                </div>
              ) : smsError ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">❌</div>
                  <div className="text-sm font-black text-red-400">Ошибка отправки. Проверьте номер.</div>
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
                    disabled={!smsPhone || !smsMessage.trim() || smsSending}
                    className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-black uppercase py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {smsSending ? 'Отправка...' : 'Отправить'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
