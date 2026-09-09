import { useState, useEffect } from 'react';
import { X, Activity, CheckCircle2, AlertTriangle, AlertCircle, Car } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useVehicleStore, calculateEffectiveSpeed, calculateEffectiveAcceleration, calculateEffectiveHandling } from '../store/useVehicleStore';
import { VEHICLE_DATABASE, WEAR_SYSTEMS, WEAR_SYSTEM_ORDER, DIAGNOSTIC_COST } from '../data/vehicleConfig';
import { getDiagnosis, getStatusText, calculateOverallCondition, getPerformanceMultiplier } from '../utils/vehicleWear';

export default function AutoServiceView({ onClose }) {
  const { player, updateProfile } = usePlayerStore();
  const { myVehicles, fetchVehicles, diagnoseVehicle, serviceWearSystem } = useVehicleStore();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [diagnosed, setDiagnosed] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (myVehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(myVehicles[0]);
    }
    if (myVehicles.length > 0 && selectedVehicle) {
      const found = myVehicles.find(v => v.id === selectedVehicle.id);
      if (found) {
        setSelectedVehicle(found);
        setDiagnosed(false);
        setDiagnosis(null);
      }
    }
  }, [myVehicles]);

  const showMsg = (msg, type = 'info') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDiagnose = async () => {
    if (!selectedVehicle) return;
    if (Number(player.money) < DIAGNOSTIC_COST) {
      showMsg('Недостаточно денег на диагностику!', 'error');
      return;
    }
    setProcessing(true);
    const success = await diagnoseVehicle(selectedVehicle.id);
    setProcessing(false);
    if (success) {
      await updateProfile({ money: Number(player.money) - DIAGNOSTIC_COST });
      await fetchVehicles();
      setTimeout(() => {
        const updated = useVehicleStore.getState().myVehicles.find(v => v.id === selectedVehicle.id);
        if (updated) {
          setSelectedVehicle(updated);
          const diag = getDiagnosis(updated);
          setDiagnosis(diag);
          setDiagnosed(true);
          showMsg('Диагностика завершена!', 'success');
        }
      }, 100);
    } else {
      showMsg('Ошибка при диагностике', 'error');
    }
  };

  const handleService = async (systemKey) => {
    if (!selectedVehicle) return;
    const sys = WEAR_SYSTEMS[systemKey];
    if (Number(player.money) < sys.cost) {
      showMsg(`Недостаточно денег! Нужно ${sys.cost.toLocaleString()} ₽`, 'error');
      return;
    }
    setProcessing(true);
    const success = await serviceWearSystem(selectedVehicle.id, systemKey);
    setProcessing(false);
    if (success) {
      await updateProfile({ money: Number(player.money) - sys.cost });
      await fetchVehicles();
      setTimeout(() => {
        const updated = useVehicleStore.getState().myVehicles.find(v => v.id === selectedVehicle.id);
        if (updated) {
          setSelectedVehicle(updated);
          const diag = getDiagnosis(updated);
          setDiagnosis(diag);
        }
      }, 100);
      showMsg(`${sys.name}: ${sys.action.toLowerCase()} ✓`, 'success');
    } else {
      showMsg('Ошибка при обслуживании', 'error');
    }
  };

  const vehicleConfig = selectedVehicle ? VEHICLE_DATABASE[selectedVehicle.model_id] : null;
  const condition = selectedVehicle ? calculateOverallCondition(selectedVehicle) : 100;
  const conditionPct = Math.round(condition);
  const perf = selectedVehicle ? getPerformanceMultiplier(condition) : { speed: 1, accel: 1, brakes: 1 };

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex flex-col text-white">
      <div className="w-full flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto pt-8 px-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Service Center</p>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">Автосервис</h2>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <X size={20} />
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-2xl border text-sm font-black ${
              message.type === 'success' ? 'bg-green-900/20 border-green-500/30 text-green-400' :
              message.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' :
              'bg-blue-900/20 border-blue-500/30 text-blue-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {(myVehicles || []).map(v => {
              const vCfg = VEHICLE_DATABASE[v.model_id] || {};
              const isSelected = v.id === selectedVehicle?.id;
              return (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVehicle(v); setDiagnosed(false); setDiagnosis(null); }}
                  className={`flex-shrink-0 w-28 p-3 rounded-2xl border transition-all ${
                    isSelected ? 'bg-orange-600/20 border-orange-400/50' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <img src={`/vehicles/${v.model_id}_${v.color}.webp`} className="w-full h-14 object-contain mb-2"
                    onError={(e) => { e.target.src = '/car.png'; }} />
                  <div className="text-[10px] font-black truncate">{vCfg.name || v.model_id}</div>
                  <div className="text-[9px] text-slate-400">{v.plate || '—'}</div>
                </button>
              );
            })}
          </div>

          {selectedVehicle && (
            <>
              <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Car size={24} className="text-orange-400" />
                    <div>
                      <div className="text-sm font-black">{vehicleConfig?.name || selectedVehicle.model_id}</div>
                      <div className="text-[10px] text-slate-400">{selectedVehicle.plate}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase">Пробег</div>
                    <div className="text-sm font-black text-slate-300">{Math.round(selectedVehicle.mileage || 0)} км</div>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Состояние</span>
                    <span className={`text-sm font-black ${
                      conditionPct >= 70 ? 'text-emerald-400' : conditionPct >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {conditionPct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        conditionPct >= 70 ? 'bg-emerald-400' : conditionPct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${conditionPct}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-[9px] text-slate-500">Скорость</div>
                    <div className="text-xs font-black text-cyan-400">{Math.round(calculateEffectiveSpeed(selectedVehicle) * perf.speed)}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-[9px] text-slate-500">Ускорение</div>
                    <div className="text-xs font-black text-amber-400">{Math.round(calculateEffectiveAcceleration(selectedVehicle) * perf.accel)}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-[9px] text-slate-500">Управл.</div>
                    <div className="text-xs font-black text-purple-400">{Math.round(calculateEffectiveHandling(selectedVehicle) * perf.brakes)}</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                {!diagnosed ? (
                  <button
                    onClick={handleDiagnose}
                    disabled={processing}
                    className={`w-full p-4 rounded-2xl border font-black uppercase transition-all ${
                      processing
                        ? 'bg-white/5 border-white/10 text-slate-500'
                        : 'bg-orange-600/20 border-orange-400/30 text-orange-400 hover:bg-orange-600/30 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={18} />
                        <span>Провести диагностику</span>
                      </div>
                      <span className="text-lg">{DIAGNOSTIC_COST} ₽</span>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleDiagnose}
                    disabled={processing}
                    className="w-full py-2 rounded-xl border border-white/10 text-slate-400 text-[10px] font-black uppercase"
                  >
                    🔄 Обновить диагностику ({DIAGNOSTIC_COST} ₽)
                  </button>
                )}
              </div>

              {diagnosed && diagnosis && (
                <div className="space-y-3 pb-8">
                  <h3 className="text-sm font-black uppercase text-orange-400 mb-2">Результат диагностики</h3>
                  {diagnosis.map(entry => {
                    const sys = WEAR_SYSTEMS[entry.key];
                    const status = entry.status;
                    const statusColor = status === 'ok' ? 'text-emerald-400' : status === 'warning' ? 'text-amber-400' : 'text-red-400';
                    const bgClass = status === 'ok' ? 'bg-emerald-900/10 border-emerald-500/20' : status === 'warning' ? 'bg-amber-900/10 border-amber-500/20' : 'bg-red-900/10 border-red-500/20';
                    const canService = status !== 'ok';

                    return (
                      <div key={entry.key} className={`p-4 rounded-2xl border ${bgClass}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {status === 'ok' ? <CheckCircle2 size={16} className="text-emerald-400"/> :
                             status === 'warning' ? <AlertTriangle size={16} className="text-amber-400"/> :
                             <AlertCircle size={16} className="text-red-400"/>}
                            <span className="text-xs font-black">{sys?.name || entry.key}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase ${statusColor}`}>
                            {getStatusText(status)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] text-slate-400">
                            {entry.wearKm} / {entry.resourceKm.toLocaleString()} км ({entry.percentUsed}%)
                          </div>
                          {canService && (
                            <button
                              onClick={() => handleService(entry.key)}
                              disabled={processing}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                processing
                                  ? 'bg-white/5 text-slate-500'
                                  : status === 'overdue'
                                    ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                                    : 'bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30'
                              }`}
                            >
                              {sys?.action} · {sys?.cost?.toLocaleString() || 0} ₽
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!(myVehicles || []).length && (
            <div className="text-center py-16 text-slate-500">
              <Car size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm font-black">Нет автомобилей</p>
              <p className="text-[10px] mt-1">Купите автомобиль в салоне</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}