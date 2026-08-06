import React from 'react';
import { useBankStore } from '../store/useBankStore';
import { CheckCircle, XCircle, Banknote } from 'lucide-react';

export default function BankNotifications() {
  const notifications = useBankStore(state => state.notifications);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs">
      {notifications.map((notif) => {
        const isSuccess = notif.type === 'success' || notif.type === 'transfer_received';
        const isError = notif.type === 'error';

        return (
          <div
            key={notif.id}
            className={`
              px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl animate-slide-in
              ${isSuccess ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : ''}
              ${isError ? 'bg-red-500/10 border-red-500/30 text-red-400' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              {isSuccess ? (
                <CheckCircle size={16} />
              ) : isError ? (
                <XCircle size={16} />
              ) : (
                <Banknote size={16} />
              )}
              <span className="text-sm font-black">{notif.message}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}