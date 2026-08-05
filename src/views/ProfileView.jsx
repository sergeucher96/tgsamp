import React from 'react';
import { Shield, Award, Heart, TrendingUp, Briefcase, Target, FileText, Clock, AlertCircle } from 'lucide-react';
import { SKILLS_DATABASE } from '../data/skills';
import { LICENSES_DATABASE } from '../data/licenses';
import { getHouseStyle } from '../data/houseStyles';

export default function ProfileView({ player, skills, licenses }) {
  const getTimeInState = () => {
    if (!player.registered_at) return "1-й день";
    const days = Math.floor((new Date() - new Date(player.registered_at)) / 86400000);
    return days === 0 ? "1-й день" : `${days} дн.`;
  };

  const getLicenseInfo = (id) => {
    const lic = licenses.find(l => l.license_type === id);
    if (!lic) return { active: false, text: 'Нет' };
    const diff = new Date(lic.expires_at) - new Date();
    if (diff <= 0) return { active: false, text: 'Истекла' };
    const days = Math.floor(diff / 86400000);
    return { active: true, text: days > 0 ? `${days} дн.` : 'Скоро истечет' };
  };

  return (
    // Используем min-h-full и pb-32 чтобы контент можно было прокрутить ВЫШЕ футера
    <div className="min-h-full p-5 pb-32 space-y-6 animate-in fade-in slide-in-from-bottom-5">
      
      {/* ПАСПОРТ */}
      <div className="bg-slate-900 border border-white/5 rounded-[32px] p-6 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 text-left">
          <div className="text-blue-500 font-black uppercase text-[9px] tracking-widest mb-2 flex items-center gap-2"><Shield size={12}/> Passport</div>
          <h2 className="text-3xl font-black uppercase italic leading-[0.8] tracking-tighter">{player.first_name} <br/><span className="text-blue-600">{player.last_name}</span></h2>
          <div className="flex gap-3 mt-8">
            <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5 text-[10px] font-bold uppercase italic"><span className="text-slate-500 block text-[7px]">В штате</span>{getTimeInState()}</div>
            <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5 text-[10px] font-bold uppercase italic"><span className="text-slate-500 block text-[7px]">Пол</span>{player.gender === 'male' ? 'M' : 'W'}</div>
          </div>
        </div>
      </div>

      {/* ДОКУМЕНТЫ */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[28px] p-5 text-left">
        <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2"><FileText size={14}/> Документы</h3>
        <div className="grid grid-cols-1 gap-2">
          {LICENSES_DATABASE.map(l => {
            const status = getLicenseInfo(l.id);
            return (
              <div key={l.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{l.icon}</span>
                  <div>
                    <div className="text-[11px] font-black uppercase italic leading-none">{l.name}</div>
                    <div className="text-[7px] text-slate-500 font-bold uppercase mt-1">{l.desc}</div>
                  </div>
                </div>
                <div className={`text-[9px] font-black uppercase italic ${status.active ? 'text-green-500' : 'text-slate-600'}`}>{status.text}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* СТАТИСТИКА */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-white/5 p-5 rounded-[28px]">
          <div className="flex justify-between text-sm font-black italic mb-2"><Award className="text-yellow-500" size={16}/> {player.lvl} LVL</div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500" style={{ width: `${(player.exp / (player.lvl * 100)) * 100}%` }} />
          </div>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center col-span-2">
  <span className="text-[8px] text-slate-500 uppercase font-black block mb-1">Номер телефона</span>
  <span className="font-bold text-lg uppercase italic text-yellow-500 tracking-[0.2em]">
    {player.phone_number ? player.phone_number : 'НЕ АКТИВИРОВАН'}
  </span>
</div>
        <div className="bg-slate-900/50 border border-white/5 p-5 rounded-[28px]">
          <div className="flex justify-between text-sm font-black italic mb-2"><Heart className="text-red-500" size={16}/> {player.hp}%</div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${player.hp}%` }} />
          </div>
        </div>
      </div>

      {/* НАВЫКИ */}
      {renderSkillBlock('Работа', Briefcase, 'job', skills)}
      {renderSkillBlock('Оружие', Target, 'weapon', skills)}

    </div>
  );
}

function renderSkillBlock(title, Icon, cat, skills) {
  const group = SKILLS_DATABASE.filter(s => s.category === cat);
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[28px] p-5 text-left">
      <h3 className="text-[10px] font-black uppercase text-slate-500 mb-5 flex items-center gap-2"><Icon size={14} className="text-blue-500"/> {title}</h3>
      <div className="space-y-4">
        {group.map(s => {
          const val = (skills || []).find(ps => ps.skill_name === s.id)?.value || 0;
          return (
            <div key={s.id} className={val === 0 ? 'opacity-30' : ''}>
              <div className="flex justify-between text-[10px] font-black uppercase italic mb-1">
                <span>{s.icon} {s.name}</span>
                <span>{val}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${val}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}