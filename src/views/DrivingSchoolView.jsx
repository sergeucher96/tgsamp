import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, X, Car, Trophy, AlertTriangle, Clock } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useWeaponStore } from '../store/useWeaponStore';
import { LICENSES_DATABASE } from '../data/licenses';
import { DRIVING_TEST_QUESTIONS } from '../data/weaponConfig';

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const DRIVING_LICENSES = LICENSES_DATABASE.filter(l => ['moto', 'car', 'truck'].includes(l.id));

const STAGE = { MENU: 'menu', QUIZ: 'quiz', DRIVING_GAME: 'driving', RESULT: 'result' };

export default function DrivingSchoolView({ onClose }) {
  const { player } = usePlayerStore();
  const { takeDrivingExam, getDrivingLicense, drivingExamAttempts, hasDrivingLicense } = useWeaponStore();

  const [stage, setStage] = useState(STAGE.MENU);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [examFeePaid, setExamFeePaid] = useState(false);
  const [examResult, setExamResult] = useState(null);

  // Мини-игра вождения
  const [drivingScore, setDrivingScore] = useState(0);
  const [gameTime, setGameTime] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [obstacle, setObstacle] = useState(null);
  const [actionRequired, setActionRequired] = useState(null);
  const gameLoopRef = useRef(null);
  const timerRef = useRef(null);
  const gameActiveRef = useRef(false);

  const licenseData = selectedLicense ? DRIVING_LICENSES.find(l => l.id === selectedLicense) : null;

  const clearTimers = () => {
    clearInterval(timerRef.current);
    clearInterval(gameLoopRef.current);
  };

  useEffect(() => () => clearTimers(), []);

  const startExam = async (licenseId) => {
    if (hasDrivingLicense(licenseId)) return;
    const ok = await takeDrivingExam(licenseId);
    if (!ok) return;
    const att = (drivingExamAttempts[licenseId] || 0);
    setSelectedLicense(licenseId);
    setExamFeePaid(att > 0);
    setQuizQuestions(shuffle(DRIVING_TEST_QUESTIONS).slice(0, 10));
    setCurrentQuestion(0);
    setScore(0);
    setDrivingScore(0);
    setExamResult(null);
    setStage(STAGE.QUIZ);
  };

  const answerQuestion = (answerIndex) => {
    const currentScore = score;
    const correct = quizQuestions[currentQuestion].correct === answerIndex;
    const newScore = correct ? currentScore + 1 : currentScore;

    if (currentQuestion < quizQuestions.length - 1) {
      setScore(newScore);
      setCurrentQuestion(q => q + 1);
    } else {
      setScore(newScore);
      const passedQuiz = newScore >= 7;
      if (passedQuiz) startDrivingGame();
      else finishExam(false, `Не пройдена теория. Нужно 7 из 10, у вас ${newScore}.`);
    }
  };

  const startDrivingGame = () => {
    setStage(STAGE.DRIVING_GAME);
    setDrivingScore(0);
    setGameTime(30);
    setGameActive(true);
    gameActiveRef.current = true;
    setObstacle(null);
    setActionRequired(null);

    timerRef.current = setInterval(() => {
      setGameTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setGameActive(false);
          gameActiveRef.current = false;
          finishExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    gameLoopRef.current = setInterval(() => {
      if (!gameActiveRef.current) return;
      const action = Math.random() > 0.5 ? 'brake' : 'turn';
      const lane = Math.floor(Math.random() * 3);
      setObstacle({ action, lane });
      setActionRequired(action);
      setTimeout(() => {
        if (gameActiveRef.current) {
          setObstacle(null);
          setActionRequired(null);
        }
      }, 1500);
    }, 2000);
  };

  const handleDrivingAction = (actionType) => {
    if (!gameActiveRef.current || !obstacle) return;
    if (obstacle.action === actionType) setDrivingScore(s => s + 1);
    else setDrivingScore(s => Math.max(0, s - 1));
    setObstacle(null);
    setActionRequired(null);
  };

  const finishExam = async (passed, message) => {
    clearTimers();
    setGameActive(false);
    gameActiveRef.current = false;
    if (passed === undefined) {
      // Determine result from driving score
      passed = drivingScore >= 15;
      message = passed
        ? 'Поздравляем! Лицензия получена!'
        : `Не пройдена практика. Нужно 15 действий, у вас ${drivingScore}.`;
    }
    if (passed) await getDrivingLicense(selectedLicense);
    setExamResult({ passed, message });
    setStage(STAGE.RESULT);
  };

  const restartMenu = () => {
    setStage(STAGE.MENU);
    setSelectedLicense(null);
    setExamResult(null);
  };

  return (
    <div className="fixed inset-0 z-[600] bg-[#071006]/98 backdrop-blur-xl flex flex-col text-white font-sans animate-in fade-in duration-300 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-[#7eff69]/15 bg-[#071006]">
        <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-[#7eff67]/25 bg-[#0a100b]/90 px-3 py-2 text-xs text-[#d6ff9f] hover:bg-[#152013]/90 transition">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-[0.35em] text-[#9eff52] font-black">SA Driving School</p>
          <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#d6ff9f]">Автошкола</h2>
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
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4">Выберите лицензию</h3>
            {DRIVING_LICENSES.map(lic => {
              const hasLic = hasDrivingLicense(lic.id);
              const att = drivingExamAttempts[lic.id] || 0;
              return (
                <button key={lic.id} onClick={() => startExam(lic.id)} disabled={hasLic}
                  className={`w-full bg-slate-900/50 border p-5 rounded-[28px] flex items-center justify-between transition-all active:scale-[0.98] ${hasLic ? 'border-green-500/30 opacity-60' : 'border-white/5 hover:border-[#7eff67]/20'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">{lic.icon}</div>
                    <div className="text-left">
                      <h4 className="font-black uppercase italic text-sm">{lic.name}</h4>
                      <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">{lic.desc}</p>
                      <p className="text-[8px] text-slate-600 font-bold mt-1">Попыток: {att}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasLic ? <span className="text-[9px] font-black text-green-500 uppercase">✓ Получена</span>
                      : <span className="text-[9px] font-black uppercase italic">{att === 0 ? <span className="text-yellow-400">Бесплатно</span> : <span className="text-orange-400">500$</span>}</span>}
                  </div>
                </button>
              );
            })}
            <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[9px] text-yellow-200/70 font-bold uppercase leading-relaxed">
                Экзамен: тест (10 вопросов, нужно 7+) и мини-игра (30 сек, нужно 15+ действий). Первый экзамен бесплатный, повтор — 500$.
              </p>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {stage === STAGE.QUIZ && quizQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase text-slate-500">Теория • {licenseData?.icon} {licenseData?.name}</h3>
              <span className="text-[10px] text-[#8cff4a] font-black">{currentQuestion + 1}/{quizQuestions.length}</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#8cff4a] transition-all duration-300" style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }} />
            </div>
            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-[28px]">
              <p className="text-sm font-bold uppercase mb-6 text-center">{quizQuestions[currentQuestion]?.q}</p>
              <div className="grid grid-cols-1 gap-2">
                {quizQuestions[currentQuestion]?.options.map((opt, i) => (
                  <button key={i} onClick={() => answerQuestion(i)}
                    className="bg-white/5 border border-white/5 p-4 rounded-2xl text-left text-sm font-bold uppercase italic hover:bg-[#8cff4a]/10 active:scale-[0.98] transition-all">{opt}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold">
              <Trophy size={14} className="text-yellow-500" /> Правильных: {score}/{currentQuestion}
            </div>
          </div>
        )}

        {/* DRIVING GAME */}
        {stage === STAGE.DRIVING_GAME && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase text-slate-500">Практика • {licenseData?.icon} {licenseData?.name}</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-orange-400 font-black flex items-center gap-1"><Clock size={12} /> {gameTime}с</span>
                <span className="text-[10px] text-[#8cff4a] font-black">{drivingScore} очков</span>
              </div>
            </div>
            <div className="relative bg-slate-900/80 border border-white/5 rounded-[28px] overflow-hidden" style={{ height: '320px' }}>
              <div className="absolute inset-0 flex">
                {[0, 1, 2].map(lane => (
                  <div key={lane} className="flex-1 border-r border-dashed border-white/10 relative">
                    {obstacle && obstacle.lane === lane && (
                      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 animate-pulse">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${obstacle.action === 'brake' ? 'bg-red-500/30 border-red-500' : 'bg-blue-500/30 border-blue-500'}`}>
                          <span className="text-2xl">{obstacle.action === 'brake' ? '🛑' : '⬅️'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2"><Car size={40} className="text-[#8cff4a]" /></div>
              {actionRequired && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-xl border border-white/10">
                  <p className="text-[10px] font-black uppercase text-yellow-400 animate-pulse">{actionRequired === 'brake' ? 'ЖМИ ТОРМОЗ!' : 'ЖМИ ПОВОРОТ!'}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleDrivingAction('brake')} disabled={!gameActive}
                className="bg-red-600/80 border border-red-500/30 p-5 rounded-[28px] text-center font-black uppercase text-sm active:scale-95 transition-all disabled:opacity-30">🛑 Тормоз</button>
              <button onClick={() => handleDrivingAction('turn')} disabled={!gameActive}
                className="bg-blue-600/80 border border-blue-500/30 p-5 rounded-[28px] text-center font-black uppercase text-sm active:scale-95 transition-all disabled:opacity-30">⬅️ Поворот</button>
            </div>
            <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Нажимайте правильную кнопку при сигнале! Нужно 15 очков.</p>
            </div>
          </div>
        )}

        {/* RESULT */}
        {stage === STAGE.RESULT && examResult && (
          <div className="space-y-6 text-center">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 ${examResult.passed ? 'border-green-500 bg-green-500/20' : 'border-red-500 bg-red-500/20'}`}>
              {examResult.passed ? <Check size={48} className="text-green-500" /> : <X size={48} className="text-red-500" />}
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic mb-2">{examResult.passed ? 'Экзамен сдан!' : 'Экзамен не сдан'}</h3>
              <p className="text-sm text-slate-400 font-bold">{examResult.message}</p>
            </div>
            <div className="bg-slate-900/50 border border-white/5 p-5 rounded-[28px] text-left space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">Теория</span><span>{score}/{quizQuestions.length}</span></div>
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">Практика</span><span>{drivingScore} очков</span></div>
              {examFeePaid && <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">Оплата</span><span className="text-orange-400">500$</span></div>}
            </div>
            <button onClick={restartMenu}
              className="w-full bg-[#183317] border border-[#7eff67]/20 py-4 rounded-[28px] font-black uppercase text-sm text-[#d6ff9f] hover:bg-[#22411b] active:scale-95 transition-all">
              {examResult.passed ? 'Вернуться в меню' : 'Попробовать снова'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}