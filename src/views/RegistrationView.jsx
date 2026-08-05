import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { ArrowRight, User } from 'lucide-react';

export default function RegistrationView() {
  const finishRegistration = usePlayerStore((state) => state.finishRegistration);
  
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'male'
  });

  const handleInputChange = (field, value) => {
    const cleanValue = value.replace(/[^a-zA-Z]/g, '');
    setForm(prev => ({ ...prev, [field]: cleanValue }));
  };

  const handleConfirm = () => {
    if (form.firstName.length < 2 || form.lastName.length < 2) {
      alert("Имя и Фамилия должны содержать минимум 2 буквы латиницей.");
      return;
    }
    // Проверяем, что функция существует перед вызовом
    if (typeof finishRegistration === 'function') {
        finishRegistration(form);
    } else {
        console.error("Функция finishRegistration не найдена в сторе!");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col p-8 text-white font-sans">
      <div className="mt-12 mb-12 text-left">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
          <User className="text-white" />
        </div>
        <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Регистрация</h1>
        <p className="text-slate-500 text-xs font-bold uppercase mt-3 tracking-[0.2em]">Создание личности персонажа</p>
      </div>

      <div className="space-y-8 flex-grow">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-blue-500 ml-4 tracking-widest">Имя (на латинице)</label>
          <input 
            type="text"
            placeholder="Ivan"
            value={form.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-6 rounded-[28px] text-lg font-bold outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-blue-500 ml-4 tracking-widest">Фамилия (на латинице)</label>
          <input 
            type="text"
            placeholder="Ivanov"
            value={form.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-6 rounded-[28px] text-lg font-bold outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-blue-500 ml-4 tracking-widest">Пол персонажа</label>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setForm(p => ({...p, gender: 'male'}))}
              className={`p-6 rounded-[28px] font-black uppercase italic transition-all border ${form.gender === 'male' ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/20' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              Мужской
            </button>
            <button 
              onClick={() => setForm(p => ({...p, gender: 'female'}))}
              className={`p-6 rounded-[28px] font-black uppercase italic transition-all border ${form.gender === 'female' ? 'bg-pink-600 border-pink-400 shadow-lg shadow-pink-600/20' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              Женский
            </button>
          </div>
        </div>
      </div>

      <div className="pb-8">
        <button 
          onClick={handleConfirm}
          className="w-full bg-white text-black p-7 rounded-[32px] font-black uppercase italic flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
        >
          Создать персонажа <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}