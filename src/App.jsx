import React, { useState } from 'react';
import { FarmHarvestGame } from './components/FarmHarvestGame';
import { 
  Tractor, DollarSign, Award, Copy, Check, Code, 
  Terminal, Sparkles, HelpCircle, FileText, ChevronRight
} from 'lucide-react';

export default function App() {
  const [playerMoney, setPlayerMoney] = useState(50000);
  const [playerExp, setPlayerExp] = useState(120);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAppCode, setCopiedAppCode] = useState(false);

  const [chatLogs, setChatLogs] = useState([
    { text: '[СИСТЕМА] Вы заступили на рабочую смену комбайнёра на ферме №1 (Flint County).', color: 'text-amber-400', time: '14:30' },
    { text: '[СИСТЕМА] Для сбора срезайте кусты на поле и загружайте снопы в кузов пикапа Walton.', color: 'text-stone-300', time: '14:30' },
    { text: '[РАДИО ФЕРМЫ] Бригадир: "Следите за урожайностью, за полную загрузку полагается премия!"', color: 'text-emerald-400', time: '14:31' }
  ]);

  const handleHarvestFinish = (reward) => {
    setPlayerMoney(prev => prev + reward.money);
    setPlayerExp(prev => prev + reward.exp);

    const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setChatLogs(prev => [
      ...prev,
      {
        text: `[ФЕРМА] Смена сдана: ${reward.cropsCount} снопов. Выплата: +$${reward.money.toLocaleString()} | +${reward.exp} EXP (${reward.bonus})`,
        color: 'text-emerald-300',
        time: timeStr
      }
    ]);
  };

  const [showChat, setShowChat] = useState(false);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black text-stone-100 font-sans select-none">
      
      {/* 1. ПОЛНОЭКРАННАЯ 3D ФЕРМА БЕЗ ПОЛЕЙ И РАМОК */}
      <div className="absolute inset-0 w-full h-full z-0">
        <FarmHarvestGame
          onHarvestFinish={handleHarvestFinish}
        />
      </div>

      {/* 2. ПЛАВАЮЩИЕ ВИДЖЕТЫ ПОВЕРХ ИГРЫ */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2 pointer-events-auto">
        {/* Инфо профиля игрока */}
        <div className="bg-black/80 backdrop-blur-md border border-amber-800/70 rounded-2xl px-3 py-1.5 shadow-xl flex items-center gap-2.5 font-mono">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 flex items-center justify-center font-black text-xs shadow">
            CJ
          </div>
          <div>
            <div className="text-[11px] font-black text-white flex items-center gap-1.5 leading-none">
              <span>Carl_J [ID: 77]</span>
              <span className="text-emerald-400 font-bold">${playerMoney.toLocaleString()}</span>
            </div>
            <div className="text-[9px] text-amber-400 font-bold mt-0.5 leading-none">
              {playerExp} EXP • КОМБАЙНЁР
            </div>
          </div>
        </div>

        {/* Кнопка открытия файлов проекта */}
        <button
          onClick={() => setShowCodeModal(true)}
          className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all active:scale-95 font-mono"
          title="Скачать / скопировать готовые файлы .tsx и .jsx"
        >
          <Code size={14} />
          <span className="hidden sm:inline">Файлы проекта</span>
        </button>

        {/* Переключатель чата */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow-lg transition-all active:scale-95 border ${
            showChat 
              ? 'bg-amber-950/90 border-amber-500 text-amber-300' 
              : 'bg-black/75 backdrop-blur-md border-stone-700 text-stone-300 hover:text-white'
          }`}
          title="Включить / скрыть чат"
        >
          <Terminal size={14} />
          <span className="hidden xs:inline">Чат</span>
        </button>
      </div>

      {/* 3. ПЛАВАЮЩИЙ SA-MP ЧАТ ЛОГ (ПОЯВЛЯЕТСЯ ПРИ НАЖАТИИ "ЧАТ") */}
      {showChat && (
        <div className="absolute top-16 left-2 z-30 max-w-sm w-[90%] sm:w-80 bg-black/85 backdrop-blur-md border border-amber-800/80 rounded-2xl p-3 font-mono shadow-2xl animate-fade-in pointer-events-auto">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 mb-2">
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Terminal size={13} />
              <span>Чат сервера SA-MP:</span>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-stone-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
            {chatLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                <span className="text-stone-500 text-[10px] shrink-0">[{log.time}]</span>
                <span className={log.color}>{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО С ИНСТРУКЦИЕЙ И ФАЙЛАМИ ДЛЯ ПОДКЛЮЧЕНИЯ */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#1a140f] border-2 border-amber-600 rounded-3xl p-5 sm:p-6 shadow-2xl text-stone-200 font-mono flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Code className="text-amber-400" size={22} />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Подключение 3D Фермы в ваш проект
                </h3>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-1 rounded-lg bg-stone-900 text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {/* Шаг 1 */}
              <div className="bg-black/60 border border-stone-800 rounded-xl p-3">
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <span>1. Установите зависимости:</span>
                </div>
                <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 font-mono text-emerald-400 select-all">
                  npm install three @types/three lucide-react
                </div>
              </div>

              {/* Шаг 2 */}
              <div className="bg-black/60 border border-stone-800 rounded-xl p-3">
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <span>2. Файл компонента:</span>
                  <span className="text-stone-400 font-normal">src/components/FarmHarvestGame.tsx</span>
                </div>
                <p className="text-stone-300 text-[11px] mb-2 leading-relaxed">
                  Полный самодостаточный компонент с Web Audio звуками, Three.js 3D сценой, пикапом Walton, сбором кустов, пресетами скинов и загрузчиком пользовательских .glb/.gltf/.obj моделей.
                </p>
                <div className="text-stone-400 text-[11px]">
                  ✓ Все зависимости внутри одного файла<br/>
                  ✓ Готовые колбэки <code className="text-amber-300">onHarvestFinish</code> и <code className="text-amber-300">onClose</code>
                </div>
              </div>

              {/* Шаг 3 */}
              <div className="bg-black/60 border border-stone-800 rounded-xl p-3">
                <div className="font-bold text-amber-400 mb-1">
                  3. Пример подключения в вашем приложении (App.tsx):
                </div>
                <pre className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-[11px] text-stone-300 overflow-x-auto">
{`import React from 'react';
import { FarmHarvestGame } from './components/FarmHarvestGame';

export default function MyApp() {
  const handleReward = (reward) => {
    console.log('Заработано денег:', reward.money);
    console.log('Собрано снопов:', reward.cropsCount);
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-4 flex items-center justify-center">
      <FarmHarvestGame
        onHarvestFinish={handleReward}
        onClose={() => console.log('Закрыто')}
      />
    </div>
  );
}`}
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase"
              >
                Понятно, закрыть
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
