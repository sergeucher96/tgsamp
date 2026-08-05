import React from 'react';
import { X, Navigation, Pizza, Truck, Award } from 'lucide-react';
import { useDeliveryStore } from '../store/useDeliveryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTravelStore } from '../store/useTravelStore';

export default function PizzeriaView({ onClose }) {
  const player = usePlayerStore((state) => state.player);
  const isMoving = useTravelStore((state) => state.isMoving);
  const {
    activeDeliveryJob,
    startPizzaDelivery,
    goToCustomer,
    arriveAtCustomer,
    deliverPizza,
    returnToPizzeria,
    cancelDelivery,
    isProcessing,
    deliveryMessage,
  } = useDeliveryStore();

  const hasJob = Boolean(activeDeliveryJob);
  const job = activeDeliveryJob;
  const isAssigned = job?.status === 'assigned';
  const isHeadingToCustomer = job?.status === 'toCustomer';
  const isArrived = job?.status === 'arrived';
  const isDelivered = job?.status === 'delivered';
  const isReturning = job?.status === 'returning';

  const handleAcceptJob = () => {
    if (player?.energy < 15) {
      alert('Слишком мало энергии для смены. Восстановите перед стартом.');
      return;
    }
    startPizzaDelivery();
  };

  const handleGoToCustomer = async () => {
    await goToCustomer();
  };

  const handleReturn = async () => {
    await returnToPizzeria();
    onClose();
  };

  const renderStatus = () => {
    if (!hasJob) return 'Готовьтесь к первой доставке.';
    if (isAssigned) return `Заказ назначен: ${job.targetHouse.name}. Доставьте пиццу клиенту.`;
    if (isHeadingToCustomer) return 'Путешествие к клиенту в процессе...';
    if (isArrived) return 'Вы прибыли. Нажмите «Доставить пиццу».';
    if (isDelivered) return 'Пицца доставлена, возвращайтесь за оплатой.';
    if (isReturning) return 'Возвращение в пиццерию за выплатой.';
    return 'Статус доставки обновляется.';
  };

  return (
    <div className="fixed inset-0 z-500 bg-[#020617]/95 backdrop-blur-xl flex justify-center items-start p-4 text-white font-sans animate-in fade-in duration-300">
      <div className="w-full max-w-xl rounded-[40px] border border-white/10 bg-[#020617]/95 shadow-2xl overflow-hidden">
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-start mb-8">
            <div className="text-left">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mb-1">Pizza Express</p>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">Пиццерия</h2>
              <p className="text-sm text-slate-400 mt-3 max-w-xl">Работа курьера: получаете скутер, доставляете заказ на дом и возвращаетесь за оплатой.</p>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X size={24} /></button>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
            <div className="bg-white/3 border border-white/10 rounded-4xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Pizza size={24} className="text-orange-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Текущий заказ</p>
                  <p className="text-lg font-black uppercase">{hasJob ? job.targetHouse.name : 'Нет заказа'}</p>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed">{renderStatus()}</p>
            </div>

            <div className="bg-white/3 border border-white/10 rounded-4xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Truck size={24} className="text-cyan-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Награда</p>
                  <p className="text-lg font-black uppercase">{hasJob ? `$${job.earnings.toLocaleString()}` : '1200–2000$'}</p>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed">Опыт: {hasJob ? `${job.exp} XP` : '15–32 XP'}.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div className="bg-white/3 border border-white/10 rounded-4xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">Скутер</p>
                  <h3 className="text-2xl font-black uppercase">Скутер доставки</h3>
                </div>
                <span className="text-sm text-slate-400">Скорость: 280</span>
              </div>
              <p className="text-slate-400 leading-relaxed">Во время заказа вам выдается легкий городской скутер. Он нужен для быстрой доставки и экономии топлива.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/3 border border-white/10 rounded-3xl p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Баланс</p>
                <p className="text-xl font-black uppercase">${player?.money?.toLocaleString()}</p>
              </div>
              <div className="bg-white/3 border border-white/10 rounded-3xl p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Энергия</p>
                <p className="text-xl font-black uppercase">{player?.energy}%</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pb-4">
            {!hasJob ? (
              <button
                onClick={handleAcceptJob}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white py-5 rounded-4xl font-black uppercase italic tracking-[0.08em] shadow-xl active:scale-95 transition"
              >
                Устроиться на смену
              </button>
            ) : isAssigned ? (
              <button
                onClick={handleGoToCustomer}
                disabled={isMoving || isProcessing}
                className={`w-full ${isMoving || isProcessing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'} py-5 rounded-4xl font-black uppercase italic tracking-[0.08em] shadow-xl active:scale-95 transition`}
              >
                {isProcessing ? 'Прокладываем маршрут...' : 'Поехать к клиенту'}
              </button>
            ) : isArrived ? (
              <button
                onClick={deliverPizza}
                disabled={isProcessing}
                className={`w-full ${isProcessing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'} py-5 rounded-4xl font-black uppercase italic tracking-[0.08em] shadow-xl active:scale-95 transition`}
              >
                {isProcessing ? 'Обработка...' : 'Доставить пиццу'}
              </button>
            ) : isDelivered ? (
              <button
                onClick={handleReturn}
                disabled={isMoving || isProcessing}
                className={`w-full ${isMoving || isProcessing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'} py-5 rounded-4xl font-black uppercase italic tracking-[0.08em] shadow-xl active:scale-95 transition`}
              >
                {isProcessing ? 'Возвращаемся...' : 'Вернуться в пиццерию'}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 text-white py-5 rounded-4xl font-black uppercase italic tracking-[0.08em] shadow-xl active:scale-95 transition"
              >
                Продолжить прогулку по карте
              </button>
            )}

            {hasJob && (
              <button
                onClick={() => { cancelDelivery(); onClose(); }}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-300 py-4 rounded-4xl font-black uppercase italic tracking-[0.08em] shadow-inner transition"
              >
                Отменить заказ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
