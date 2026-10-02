import React from 'react';
import { X, Dumbbell, Swords, Shield, Zap, Heart, Trophy, Gauge, User, Brain, Target, Battery } from 'lucide-react';
import { useBoxingStore } from './useBoxingStore';
import { usePlayerStore } from '../../stores/usePlayerStore';

interface BoxingCharacterViewProps { onClose: () => void; }

/**
 * Вкладка «Персонаж»: все характеристики, боевой снимок и пояснения.
 *
 * Числа берутся из снимка (pvp_fighter_snapshot) и прогресса бокса
 * (pvp_boxing_progress). Текстовые пояснения синхронизированы с
 * BoxingHelpView — если баланс меняется, правки в двух местах.
 */

// Характеристики для отображения
const STATS = [
  { key: 'strength', icon: '💪', label: 'Сила', cap: 60 },
  { key: 'agility', icon: '🦶', label: 'Ловкость', cap: 60 },
  { key: 'stamina', icon: '🫀', label: 'Выносливость', cap: 60 },
] as const;

const STAT_DESCRIPTIONS = {
  strength: 'Идёт прямо в урон: и в обычный удар, и в множитель тяжёлого. ' +
            'Плюс сильнее попадание чаще выбирается тяжёлый удар. ' +
            'Единственная характеристика, дающая прямой урон.',
  agility: 'Чаще уходишь с линии удара. Уклонение гасит удар целиком, ' +
           'поэтому ловкость берет своё не уроном, а экономией ' +
           'здоровья. Ещё сокращает время каждого действия и чаще ' +
           'достаётся первый ход в раунде.',
  stamina: 'Поднимает потолок энергии и восстановление за раунд: ' +
           'энергии хватает на больше тяжёлых ударов. Ещё добавляет ' +
           'здоровья, защиты и поглощения урона. Это твоя крепость.',
};

const COMBAT_STATS = [
  { key: 'attack', icon: <Swords size={13} />, label: 'Урон', desc: 'Базовый урон одного удара. Считается как 8 + оружие + сила × 2.' },
  { key: 'defense', icon: <Shield size={13} />, label: 'Защита', desc: 'Понижает входящий урон. Формула: 3 + выносливость ÷ 2.' },
  { key: 'max_hp', icon: <Heart size={13} />, label: 'Здоровье', desc: 'Максимальное здоровье. Формула: 100 + выносливость.' },
  { key: 'armor', icon: <Battery size={13} />, label: 'Броня', desc: 'Поглощает часть урона. Формула: броня_снаряжения + выносливость × 2.' },
] as const;

export default function BoxingCharacterView({ onClose }: BoxingCharacterViewProps) {
  const progress = useBoxingStore((s) => s.progress);
  const fighterSnapshot = useBoxingStore((s) => s.stats);
  const player = usePlayerStore((s) => s.player);
  const sportEnergy = player?.sportEnergy ?? 100;

  return (
    <div className="fixed inset-0 z-[840] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full max-w-lg mx-auto gta-panel flex-1 overflow-y-auto p-4">
        {/* ------------------------------------------------ шапка */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-10" />
          <h1 className="text-sm font-black uppercase tracking-widest">Персонаж</h1>
          <button onClick={onClose} className="w-10 p-2 gta-button rounded-xl">
            <X size={16} />
          </button>
        </div>

        {/* ------------------------------------- профиль */}
        <Section icon={<User size={14} />} title="Профиль">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
              {player?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-black truncate">{player?.username ?? 'Игрок'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Спорт-энергия: <span className="text-[#8cff4a] font-black">{sportEnergy} / 100</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Восстановление: 5 в час (1 каждые 12 мин)
              </div>
            </div>
          </div>
        </Section>

        {/* ------------------------------------- характеристики тренировки */}
        <Section icon={<Dumbbell size={14} />} title="Характеристики (тренировка)">
          <p className="mb-3 text-[11px] text-slate-300">
            Уровни тренированных статов. Потолок — 20 уровней. Снаряжение
            складывается с тренировкой, поэтому итог на ринге может быть выше.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {STATS.map((s) => {
              const item = progress?.items?.find((i) => i.stat === s.key);
              const level = item?.level ?? 0;
              const atCap = level >= 20;
              return (
                <div key={s.key} className="p-2 rounded-xl bg-black/30 border border-white/5 text-center">
                  <div className="text-base mb-0.5">{s.icon}</div>
                  <div className={`text-lg font-black leading-none tabular-nums ${
                    atCap ? 'text-[#8cff4a]' : 'text-white'
                  }`}>
                    {level} / 20
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">{s.label}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {item ? `${item.xp_in_level} / ${item.xp_need}` : '—'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            {STATS.map((s) => (
              <div key={s.key} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs font-black">{s.label}</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  {STAT_DESCRIPTIONS[s.key as keyof typeof STAT_DESCRIPTIONS]}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ------------------------------------- боевой снимок */}
        <Section icon={<Target size={14} />} title="Боевой снимок">
          <p className="mb-3 text-[11px] text-slate-300">
            То, с чем боец выходит на ринг. Это тренировка + снаряжение + баффы.
            Сервер считает бой именно по этим числам.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {COMBAT_STATS.map((c) => (
              <div key={c.key} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#8cff4a]">{c.icon}</span>
                  <span className="text-xs font-black">{c.label}</span>
                </div>
                <div className="text-xl font-black text-white tabular-nums">
                  {fighterSnapshot?.[c.key as keyof typeof fighterSnapshot] ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  {c.desc}
                </div>
              </div>
            ))}
          </div>

<Rules
            items={[
              ['Уровни характеристик', 'до 20 уровня, с экипировкой до 60'],
              ['Опыт за тренировку', '30 за подход (8 энергии)'],
              ['Опыт за бой (победа)', '140, делится по действиям'],
              ['Опыт за бой (поражение)', '50, тоже по действиям'],
            ]}
          />
        </Section>

        {/* ------------------------------------- боевые действия */}
        <Section icon={<Brain size={14} />} title="Как работают действия">
          <p className="mb-3 text-[11px] text-slate-300">
            В бою каждым ходом боец выбирает одно действие. Выбор не твоим
            кликом, а случайностью, взвешенной характеристиками: сильнее —
            чаще тяжёлые удары, ловчее — чаще блоки и уклонения.
          </p>

          <div className="space-y-2 mb-3">
            <ActionRow icon={<Swords size={13} />} title="Атака" text="Базовый удар. Дёшев по энергии, всегда доступен." color="text-[#8cff4a]" />
            <ActionRow icon={<Zap size={13} />} title="Тяжёлый удар" text="Бьёт сильнее всех. Стоит 25 энергии, выбирается чаще при высокой силе." color="text-amber-400" />
            <ActionRow icon={<Shield size={13} />} title="Блок" text="Гасит следующий удар. Выносливость уменьшает урон сквозь блок." color="text-blue-400" />
            <ActionRow icon={<Gauge size={13} />} title="Уклонение" text="Полностью уходит от следующего удара. Ловкость повышает шанс." color="text-cyan-400" />
            <ActionRow icon={<Heart size={13} />} title="Лечение" text="Появляется само, когда здоровье упало ниже половины." color="text-rose-400" />
          </div>

          <Note>
            Блок и уклонение работают на опережение: они гасят удар,
            который противник уже выбрал. Характеристики поднимают шанс
            этих действий, а не добавляют новых.
          </Note>
        </Section>

        {/* ------------------------------------- награда за бой */}
        <Section icon={<Trophy size={14} />} title="Опыт за бой">
          <Rules
            items={[
              ['Победа', '140 опыта'],
              ['Поражение', '50 опыта'],
              ['Сила', 'за удары, которые попали'],
              ['Ловкость', 'за блоки и уклонения'],
              ['Выносливость', 'за каждый пережитый раунд'],
            ]}
          />
          <p className="mt-2 text-[11px] text-slate-300 leading-relaxed">
            Опыт делится между характеристиками по тому, сколько раз
            каждая реально сработала: бил — ушло в силу, уклонялся — в
            ловкость. Поэтому «качать всё понемногу» хуже, чем качать
            под стиль своего боя.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider
                       text-[#8cff4a] mb-2">
        {icon} {title}
      </h2>
      <div className="text-[11px] text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

function Rules({ items }: { items: [string, string][] }) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {items.map(([k, v], i) => (
        <div key={k}
             className={`flex items-start gap-3 px-3 py-2 bg-white/[0.03] ${
               i ? 'border-t border-white/5' : ''
             }`}>
          <span className="text-slate-400 shrink-0">{k}</span>
          <span className="ml-auto text-right font-black text-white">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 p-3 rounded-xl bg-amber-900/20 border border-amber-700/30
                    text-[10px] text-amber-200/90 leading-relaxed">
      {children}
    </div>
  );
}

function ActionRow({ icon, title, text, color }: {
  icon: React.ReactNode; title: string; text: string; color: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
      <span className={`${color} mt-0.5 shrink-0`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-black">{title}</div>
        <div className="text-[10px] text-slate-400 leading-relaxed">{text}</div>
      </div>
    </div>
  );
}