import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Check, X, Trophy, AlertTriangle, Clock, ShoppingCart, Target, DollarSign, Crosshair } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useWeaponStore } from '../store/useWeaponStore';
import { WEAPON_CONFIG, GUN_RANGE_SETTINGS, WEAPON_LICENSE_QUESTIONS } from '../data/weaponConfig';

const STAGE = { MENU: 'menu', GAME: 'game', SHOP: 'shop', LICENSE_TEST: 'license_test', RESULT: 'result' };

const targetSizeClass = {
  small: 'w-10 h-10',
  medium: 'w-16 h-16',
  large: 'w-20 h-20',
};

export default function GunRangeView({ onClose }) {
  const { player } = usePlayerStore();
  const { weapons, weaponLicense, buyWeapon, buyWeaponLicense, upgradeWeapon, startGunRangeSession } = useWeaponStore();

  const [stage, setStage] = useState(STAGE.MENU);
  const [selectedWeapon, setSelectedWeapon] = useState(null);

  // Game state
  const [gameTime, setGameTime] = useState(GUN_RANGE_SETTINGS.timeLimit);
  const [ammoLeft, setAmmoLeft] = useState(GUN_RANGE_SETTINGS.ammoLimit);
  const [score, setScore] = useState(0);
  const [targets, setTargets] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [gameResult, setGameResult] = useState(null);

  // License test
  const [testQuestions, setTestQuestions] = useState([]);
  const [currentTestQ, setCurrentTestQ] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testResult, setTestResult] = useState(null);

  const timerRef = useRef(null);
  const targetTimerRef = useRef(null);
  const idCounter = useRef(0);

  const config = selectedWeapon ? WEAPON_CONFIG[selectedWeapon] : null;
  const weaponState = selectedWeapon ? weapons[selectedWeapon] : null;

  const clearTimers = () => {
    clearInterval(timerRef.current);
    clearInterval(targetTimerRef.current);
    clearTimeout(targetTimerRef.cleanup);
  };

  useEffect(() => () => clearTimers(), []);

  const startSpawningTargets = useCallback(() => {
    const spawn = () => {
      if (!gameActive) return;
      const id = ++idCounter.current;
      const x = 10 + Math.random() * 70; // %
      const y = 10 + Math.random() * 60; // %
      const lifetime = Math.max(800, 2000 - (WEAPON_CONFIG[selectedWeapon]?.spread || 0) * 200);

      const target = { id, x, y, lifetime };
      setTargets(prev => [...prev, target]);

      // Remove after lifetime
      setTimeout(() => {
        setTargets(prev => prev.filter(t => t.id !== id));
      }, lifetime);

      // Schedule next
      const nextDelay = Math.max(600, 1500 - (WEAPON_CONFIG[selectedWeapon]?.spread || 0) * 100);
      targetTimerRef.cleanup = setTimeout(spawn, nextDelay);
    };
    spawn();
  }, [gameActive, selectedWeapon]);

  // Start spawning targets when game becomes active
  useEffect(() => {
    if (gameActive && stage === STAGE.GAME) {
      startSpawningTargets();
    }
  }, [gameActive, stage, startSpawningTargets]);

  // --- START GAME ---
  const startGame = async (weaponType) => {
    if (!weapons[weaponType]?.owned) {
      alert('У вас нет этого оружия! Купите в магазине.');
      return;
    }
    const ok = await startGunRangeSession();
    if (!ok) return;

    setSelectedWeapon(weaponType);
    setGameTime(GUN_RANGE_SETTINGS.timeLimit);
    setAmmoLeft(GUN_RANGE_SETTINGS.ammoLimit);
    setScore(0);
    setTargets([]);
    setTotalHits(0);
    setTotalShots(0);
    setGameResult(null);
    setStage(STAGE.GAME);

    setTimeout(() => {
      setGameActive(true);
      startTimer();
    }, 500);
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setGameTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleShoot = () => {
    if (!gameActive || ammoLeft <= 0) return;
    setAmmoLeft(a => a - 1);
    setTotalShots(s => s + 1);

    // Check if any target is close to center
    const hitRadius = selectedWeapon === 'shotgun' ? 40 : selectedWeapon === 'deagle' ? 25 : 30;

    // For simplicity: if any target exists, calculate distance from center of screen
    const hitIndex = targets.findIndex((_, i) => i === 0); // Hit the oldest target (first in list)
    if (hitIndex >= 0) {
      // Accuracy check based on weapon
      const accuracy = selectedWeapon === 'deagle' ? 0.6 : selectedWeapon === 'carbine' ? 0.75 : 0.85;
      if (Math.random() < accuracy) {
        const hitTarget = targets[hitIndex];
        setTargets(prev => prev.filter(t => t.id !== hitTarget.id));
        setScore(s => s + WEAPON_CONFIG[selectedWeapon].xpPerHit);
        setTotalHits(h => h + 1);
      }
    }

    // Check if game should end
    if (ammoLeft <= 1) {
      setTimeout(() => endGame(), 300);
    }
  };

  const endGame = () => {
    clearTimers();
    setGameActive(false);
    const xpEarned = score;
    // Try to upgrade
    if (xpEarned > 0) {
      upgradeWeapon(selectedWeapon, xpEarned);
    }
    setGameResult({ score, totalHits, totalShots });
    setStage(STAGE.RESULT);
  };

  // --- SHOP ---
  const openShop = () => setStage(STAGE.SHOP);

  const purchaseWeapon = async (weaponType) => {
    if (!weaponLicense) {
      alert('Сначала получите лицензию на оружие!');
      return;
    }
    const ok = await buyWeapon(weaponType);
    if (ok) alert(`${WEAPON_CONFIG[weaponType].name} куплен!`);
  };

  // --- LICENSE TEST ---
  const startLicenseTest = () => {
    if (weaponLicense) {
      alert('У вас уже есть лицензия!');
      return;
    }
    setTestQuestions([...WEAPON_LICENSE_QUESTIONS]);
    setCurrentTestQ(0);
    setTestScore(0);
    setTestResult(null);
    setStage(STAGE.LICENSE_TEST);
  };

  const answerLicenseTest = (idx) => {
    const correct = testQuestions[currentTestQ].correct === idx;
    const newScore = correct ? testScore + 1 : testScore;

    if (currentTestQ < testQuestions.length - 1) {
      setTestScore(newScore);
      setCurrentTestQ(q => q + 1);
    } else {
      if (newScore >= 4) {
        // Test passed, now buy license
        completeLicensePurchase();
      } else {
        setTestResult({ passed: false, score: newScore });
      }
    }
  };

  const completeLicensePurchase = async () => {
    const ok = await buyWeaponLicense();
    if (ok) {
      setTestResult({ passed: true });
      alert('Лицензия на оружие получена!');
    } else {
      setTestResult({ passed: false, score: testScore, error: true });
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-[#071006]/98 backdrop-blur-xl flex flex-col text-white font-sans animate-in fade-in duration-300 overflow-y-auto">
      {/* HEADER */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15 bg-[#071006]">
        <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f] hover:bg-[#152013]/90 transition">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-[0.35em] text-[#9eff52] font-black">Iron Sight</p>
          <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#d6ff9f]">Тир</h2>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-6 pb-20">
        <div className="bg-white/[0.03] border border-white/5 p-4 rounded-[28px] flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Наличные</span>
          <span className="text-[#8cff4a] font-black italic text-lg">${Number(player?.money || 0).toLocaleString()}</span>
        </div>

        {/* MENU */}
        {stage === STAGE.MENU && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4">Выберите оружие для тренировки</h3>
            {Object.values(WEAPON_CONFIG).map(wep => {
              const ws = weapons[wep.id];
              const owned = ws?.owned;
              return (
                <button key={wep.id} onClick={() => owned ? startGame(wep.id) : openShop()}
                  className={`w-full bg-slate-900/50 border p-5 rounded-[28px] flex items-center justify-between transition-all active:scale-[0.98] ${owned ? 'border-white/5 hover:border-[#7eff67]/20' : 'border-orange-500/20 opacity-70'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">{wep.icon}</div>
                    <div className="text-left">
                      <h4 className="font-black uppercase italic text-sm">{wep.name}</h4>
                      <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">{wep.desc}</p>
                      {owned && <p className="text-[8px] text-[#8cff4a] font-bold mt-1">Уровень: {ws.level}/{wep.maxLevel}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    {owned ? (
                      <span className="text-[9px] font-black text-[#8cff4a] uppercase">Стрелять</span>
                    ) : (
                      <span className="text-[9px] font-black text-orange-400 uppercase">В магазине</span>
                    )}
                  </div>
                </button>
              );
            })}

            <button onClick={openShop}
              className="w-full bg-orange-600/20 border border-orange-500/20 p-4 rounded-[28px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
              <ShoppingCart size={18} className="text-orange-400" />
              <span className="font-black uppercase text-sm text-orange-300">Магазин оружия</span>
            </button>

            {!weaponLicense && (
              <button onClick={startLicenseTest}
                className="w-full bg-yellow-600/20 border border-yellow-500/20 p-4 rounded-[28px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                <Target size={18} className="text-yellow-400" />
                <span className="font-black uppercase text-sm text-yellow-300">Получить лицензию на оружие</span>
              </button>
            )}

            <div className="mt-4 p-4 bg-white/5 border border-white/5 rounded-2xl flex items-start gap-3">
              <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                Вход: ${GUN_RANGE_SETTINGS.entryFee}. Время: {GUN_RANGE_SETTINGS.timeLimit}с, Патроны: {GUN_RANGE_SETTINGS.ammoLimit}. Попадания дают XP для прокачки оружия.
              </p>
            </div>
          </div>
        )}

        {/* GAME */}
        {stage === STAGE.GAME && config && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase text-slate-500">{config.icon} {config.name} • Ур.{weaponState?.level || 0}</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-orange-400 font-black flex items-center gap-1"><Clock size={12} /> {gameTime}с</span>
                <span className="text-[10px] text-blue-400 font-black">● {ammoLeft}</span>
                <span className="text-[10px] text-[#8cff4a] font-black">{score} очков</span>
              </div>
            </div>

            {/* Shooting range */}
            <div className="relative bg-slate-900/80 border border-white/5 rounded-[28px] overflow-hidden" style={{ height: '360px' }}>
              {/* Targets */}
              {targets.map(t => (
                <button key={t.id} onClick={handleShoot}
                  className={`absolute ${targetSizeClass[config.targetSize]} bg-red-500/80 rounded-full border-4 border-red-400 shadow-lg animate-pulse flex items-center justify-center active:scale-90 transition-transform`}
                  style={{ left: `${t.x}%`, top: `${t.y}%` }}>
                  <div className="w-1/2 h-1/2 bg-white rounded-full" />
                </button>
              ))}

              {/* Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <Crosshair size={80} className="text-white" />
              </div>

              {/* Hit counter */}
              <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-xl">
                <p className="text-[9px] font-black uppercase text-slate-400">Попаданий: {totalHits}/{totalShots}</p>
              </div>

              {!gameActive && gameTime === 0 && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <p className="text-sm font-black uppercase text-white">Сессия завершена!</p>
                </div>
              )}
            </div>

            {/* Shoot button */}
            <button onClick={handleShoot} disabled={!gameActive || ammoLeft <= 0}
              className="w-full bg-red-600/80 border border-red-500/30 p-6 rounded-[28px] text-center font-black uppercase text-xl active:scale-95 transition-all disabled:opacity-30">
              🔫 ОГОНЬ!
            </button>
          </div>
        )}

        {/* GAME RESULT */}
        {stage === STAGE.RESULT && gameResult && (
          <div className="space-y-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 border-[#8cff4a] bg-[#8cff4a]/20">
              <Trophy size={48} className="text-[#8cff4a]" />
            </div>
            <h3 className="text-xl font-black uppercase italic">Тренировка завершена!</h3>
            <div className="bg-slate-900/50 border border-white/5 p-5 rounded-[28px] text-left space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">Очки</span><span className="text-[#8cff4a]">{gameResult.score}</span></div>
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">Попаданий</span><span>{gameResult.totalHits}</span></div>
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">Выстрелов</span><span>{gameResult.totalShots}</span></div>
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">Точность</span><span>{gameResult.totalShots > 0 ? Math.round((gameResult.totalHits / gameResult.totalShots) * 100) : 0}%</span></div>
            </div>
            <button onClick={() => setStage(STAGE.MENU)}
              className="w-full bg-[#183317] border border-[#7eff67]/20 py-4 rounded-[28px] font-black uppercase text-sm text-[#d6ff9f] hover:bg-[#22411b] active:scale-95 transition-all">
              В меню
            </button>
          </div>
        )}

        {/* SHOP */}
        {stage === STAGE.SHOP && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><ShoppingCart size={14} /> Магазин оружия</h3>

            {!weaponLicense && (
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl mb-4">
                <p className="text-[10px] text-yellow-300 font-bold uppercase mb-3">Для покупки оружия нужна лицензия</p>
                <button onClick={startLicenseTest}
                  className="w-full bg-yellow-600/30 border border-yellow-500/30 py-3 rounded-2xl font-black uppercase text-xs text-yellow-200 active:scale-95 transition-all">
                  Пройти тест и купить лицензию (${GUN_RANGE_SETTINGS.weaponLicenseCost.toLocaleString()})
                </button>
              </div>
            )}

            {Object.values(WEAPON_CONFIG).map(wep => {
              const ws = weapons[wep.id];
              const owned = ws?.owned;
              return (
                <div key={wep.id} className={`bg-slate-900/50 border p-5 rounded-[28px] ${owned ? 'border-green-500/20' : 'border-white/5'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{wep.icon}</span>
                      <div>
                        <h4 className="font-black uppercase italic text-sm">{wep.name}</h4>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">{wep.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#8cff4a]"><DollarSign size={14} /><span className="font-black italic">${wep.price.toLocaleString()}</span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[8px] font-bold uppercase text-slate-400 mb-3">
                    <div className="bg-white/5 p-2 rounded-xl text-center">Мишени<br /><span className="text-white">{wep.targetSize === 'small' ? 'Маленькие' : wep.targetSize === 'medium' ? 'Средние' : 'Большие'}</span></div>
                    <div className="bg-white/5 p-2 rounded-xl text-center">Огонь<br /><span className="text-white">{wep.fireRate === 'single' ? 'Одиночный' : wep.fireRate === 'burst' ? 'Взрывной' : 'Автомат'}</span></div>
                    <div className="bg-white/5 p-2 rounded-xl text-center">Разброс<br /><span className="text-white">{wep.spread === 0 ? 'Нет' : wep.spread}</span></div>
                  </div>
                  {owned ? (
                    <div className="text-center py-2 bg-green-500/10 rounded-2xl border border-green-500/20">
                      <span className="text-[10px] font-black text-green-400 uppercase">✓ Куплено • Уровень {ws.level}/{wep.maxLevel}</span>
                    </div>
                  ) : (
                    <button onClick={() => purchaseWeapon(wep.id)} disabled={!weaponLicense}
                      className={`w-full py-3 rounded-2xl font-black uppercase text-sm transition-all active:scale-95 ${weaponLicense ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 opacity-50'}`}>
                      {!weaponLicense ? 'Нужна лицензия' : 'Купить'}
                    </button>
                  )}
                </div>
              );
            })}

            <button onClick={() => setStage(STAGE.MENU)}
              className="w-full bg-white/5 border border-white/5 py-4 rounded-[28px] font-black uppercase text-sm text-slate-400 hover:bg-white/10 active:scale-95 transition-all">
              Назад
            </button>
          </div>
        )}

        {/* LICENSE TEST */}
        {stage === STAGE.LICENSE_TEST && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase text-slate-500">Тест на ответственность</h3>
              <span className="text-[10px] text-[#8cff4a] font-black">{currentTestQ + 1}/{testQuestions.length}</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#8cff4a] transition-all duration-300" style={{ width: `${((currentTestQ + 1) / testQuestions.length) * 100}%` }} />
            </div>
            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-[28px]">
              <p className="text-sm font-bold uppercase mb-6 text-center">{testQuestions[currentTestQ]?.q}</p>
              <div className="grid grid-cols-1 gap-2">
                {testQuestions[currentTestQ]?.options.map((opt, i) => (
                  <button key={i} onClick={() => answerLicenseTest(i)}
                    className="bg-white/5 border border-white/5 p-4 rounded-2xl text-left text-sm font-bold uppercase italic hover:bg-[#8cff4a]/10 active:scale-[0.98] transition-all">{opt}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold">
              <Trophy size={14} className="text-yellow-500" /> Правильных: {testScore}/{currentTestQ}
            </div>
            {testResult && (
              <div className={`p-4 rounded-2xl text-center ${testResult.passed ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                {testResult.passed ? (
                  <>
                    <Check size={32} className="text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-black uppercase text-green-400">Тест сдан! Лицензия покупается...</p>
                  </>
                ) : (
                  <>
                    <X size={32} className="text-red-500 mx-auto mb-2" />
                    <p className="text-sm font-black uppercase text-red-400">
                      {testResult.error ? 'Не удалось купить лицензию' : `Нужно 4 из ${testQuestions.length}. У вас ${testResult.score || 0}.`}
                    </p>
                  </>
                )}
                <button onClick={() => setStage(STAGE.MENU)}
                  className="mt-3 bg-white/10 px-6 py-2 rounded-2xl font-black uppercase text-xs hover:bg-white/20 transition-all">OK</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}