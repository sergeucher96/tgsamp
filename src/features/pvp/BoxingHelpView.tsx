import React from 'react';
import { X, Dumbbell, Swords, Shield, Zap, Heart, Trophy, Gauge, Utensils } from 'lucide-react';

interface BoxingHelpViewProps { onClose: () => void; }

/**
 * Справка по боям и тренировкам.
 *
 * Все числа здесь взяты из миграций, а не выдуманы для красоты:
 * если поменяется баланс, эту страницу придётся править — и это
 * лучше, чем расхождение между инструкцией и реальностью.
 */

/** Что делает характеристика. Числа из pvp_simulate и снимка. */
const STATS = [
  {
    icon: '💪',
    title: 'Сила',
    text: 'Идёт прямо в урон: и в обычный удар, и в множитель тяжёлого. ' +
          'Плюс сильнее попадание чаще выбирается тяжёлый удар. ' +
          'Единственная характеристика, дающая прямой урон.',
  },
  {
    icon: '🦶',
    title: 'Ловкость',
    text: 'Чаще уходишь с линии удара. Уклонение гасит удар целиком, ' +
          'поэтому ловкость берет своё не уроном, а экономией ' +
          'здоровья. Ещё сокращает время каждого действия и чаще ' +
          'достаётся первый ход в раунде.',
  },
  {
    icon: '🫀',
    title: 'Выносливость',
    text: 'Поднимает потолок энергии и восстановление за раунд: ' +
          'энергии хватает на больше тяжёлых ударов. Ещё добавляет ' +
          'здоровья, защиту и поглощение урона. Это твоя крепость.',
  },
];

const ACTIONS = [
  { icon: <Swords size={13} />, title: 'Атака', text: 'Базовый удар. Дёшев по энергии, всегда доступен.' },
  { icon: <Zap size={13} />, title: 'Тяжёлый удар', text: 'Бьёт сильнее всех. Стоит 25 энергии — столько же, сколько обычная атака, но опускается до неё, если энергии меньше.' },
  { icon: <Shield size={13} />, title: 'Блок', text: 'Гасит следующий удар. Выносливость уменьшает то, что проходит сквозь блок.' },
  { icon: <Gauge size={13} />, title: 'Уклонение', text: 'Полностью уходит от следующего удара.' },
  { icon: <Heart size={13} />, title: 'Лечение', text: 'Появляется само, когда здоровье упало ниже половины.' },
];

export default function BoxingHelpView({ onClose }: BoxingHelpViewProps) {
  return (
    <div className="fixed inset-0 z-[840] bg-[#0a0505] flex flex-col text-white">
      <div className="w-full max-w-lg mx-auto gta-panel flex-1 overflow-y-auto p-4">
        {/* ------------------------------------------------ шапка */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-10" />
          <h1 className="text-sm font-black uppercase tracking-widest">Как играть</h1>
          <button onClick={onClose} className="w-10 p-2 gta-button rounded-xl">
            <X size={16} />
          </button>
        </div>

        {/* ------------------------------------- характеристики */}
        <Section icon={<Gauge size={14} />} title="Три характеристики">
          <p className="mb-3">
            У бойца ровно три характеристики, и все три идут в бой.
            Не «дисциплина плюс характеристика», а именно три числа:
            так выигрыш виден сразу и спорить не о чем.
          </p>

          <div className="space-y-2 mb-3">
            {STATS.map((s) => (
              <div key={s.title} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs font-black">{s.title}</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{s.text}</div>
              </div>
            ))}
          </div>

          <Rules
            items={[
              ['Потолок', '20 уровней на каждую'],
              ['Стоимость уровня', 'растёт: 120 опыта, потом 160, 200 и так далее'],
              ['Откуда ещё берётся', 'снаряжение складывается с тренировкой'],
            ]}
          />
        </Section>

        {/* --------------------------------------------- тренировка */}
        <Section icon={<Dumbbell size={14} />} title="Тренировка">
          <p className="mb-3">
            Тренировка тратит силы, а не деньги, и не требует ожидания.
            Нажал — потратил часть запаса, получил опыт, нажал снова.
            Ограничитель один: сколько сил осталось. Это как в зале,
            где надо уйти, пока можешь.
          </p>

          <Rules
            items={[
              ['Один подход', '30 опыта и 8 сил'],
              ['Полная шкала сил', '100, то есть 12 подходов подряд'],
              ['Восстановление', 'пока ты сыт и не хочешь пить'],
              ['Деньги', 'не тратятся вообще'],
            ]}
          />

          <Note>
            Еда — второй ресурс спортзала. Пока сытость и жажда выше
            половины, силы возвращаются сами; опустились ниже — начинают
            убывать. Тренироваться на нуле нельзя: сначала поешь.
          </Note>
        </Section>

        {/* -------------------------------------------------- NPC */}
        <Section icon={<Swords size={14} />} title="Бой с NPC">
          <p className="mb-3">
            Боксёрский клуб на карте — тренировочные и серьёзные
            противники. Это самый безопасный способ потратить опыт:
            соперник не отнимет твоё место в очереди.
          </p>
          <Rules
            items={[
              ['Тренировочные', 'доступны сразу, без условий'],
              ['Серьёзные', 'открываются по рейтингу: 1100, 1200, 1300'],
              ['Награда', 'деньги за победу плюс опыт характеристикам'],
            ]}
          />
        </Section>

        {/* ------------------------------------------------- бой */}
        <Section icon={<Swords size={14} />} title="Бой с игроком">
          <ol className="space-y-1.5 mb-3">
            {[
              'Нажми «Встать в очередь» — ты появишься в общем списке.',
              'Любой может выбрать тебя и вызвать на бой.',
              'Бой считает сервер. Он не перебрасывается у кого-то на телефоне.',
              'Итог и журнал раундов видят оба участника.',
              'После боя ты вне очереди — можно встать снова.',
            ].map((step, i) => (
              <li key={step} className="flex gap-2 text-[11px] text-slate-300">
                <span className="shrink-0 w-4 h-4 rounded-full bg-amber-900/50 text-amber-300
                                 text-[9px] font-black flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <Rules
            items={[
              ['В очереди', '15 минут, потом запись сама исчезает'],
              ['Защитник', 'бой приходит ему сразу, даже если он сейчас на карте'],
            ]}
          />
        </Section>

        {/* ------------------------------------------ как считается */}
        <Section icon={<Shield size={14} />} title="Как считается бой">
          <p className="mb-2">
            Бой разбит на раунды. В каждом боец выбирает одно из пяти
            действий — не ты, а случайность, взвешенная его
            характеристиками. Поэтому два одинаковых бойца могут провести
            бой по-разному.
          </p>

          <div className="space-y-1.5 mb-3">
            {ACTIONS.map((a) => (
              <div key={a.title}
                   className="flex items-start gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[#8cff4a] mt-0.5 shrink-0">{a.icon}</span>
                <div className="min-w-0">
                  <div className="text-[11px] font-black">{a.title}</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">{a.text}</div>
                </div>
              </div>
            ))}
          </div>

          <Rules
            items={[
              ['Энергия в бою', 'начинается не полной, растёт каждый раунд'],
              ['Здоровье', 'растёт от выносливости, оружие и броня правят урон'],
              ['Лечение', 'само, когда здоровье ниже половины'],
            ]}
          />

          <Note>
            Блок и уклонение гасят удар, который противник уже выбрал,
            — то есть работают на опережение. Характеристики поднимают
            шанс этих действий, а не добавляют новых.
          </Note>
        </Section>

        {/* ----------------------------------------------- награды */}
        <Section icon={<Trophy size={14} />} title="Опыт за бой">
          <Rules
            items={[
              ['Бой, победа', '140 опыта'],
              ['Бой, поражение', '50 опыта'],
              ['Сила', 'за удары, которые попали'],
              ['Ловкость', 'за блоки и уклонения'],
              ['Выносливость', 'за каждый пережитый раунд'],
            ]}
          />
          <p className="mt-2">
            Опыт делится между характеристиками по тому, сколько раз
            каждая реально сработала: бил — ушло в силу, уклонялся — в
            ловкость. Поэтому «качать всё понемногу» хуже, чем качать
            под стиль своего боя.
          </p>
          <Note>
            Тренировка даёт опыт гарантированно и без риска, бой — больше,
            но приходится рисковать. Обычно их чередуют: натренировал,
            сходил в бой, отошёл.
          </Note>
        </Section>

        {/* ---------------------------------------------------- еда */}
        <Section icon={<Utensils size={14} />} title="Еда и силы">
          <p className="mb-2">
            Силы в бою и силы в жизни — разные вещи, и путать их не
            стоит. Энергия в бою тратится на удары и растёт каждый раунд
            сама. Силы в профиле тратятся на тренировку, и их
            восстанавливает сытость.
          </p>
          <Note>
            Пока сытость и жажда выше 50, силы возвращаются сами. Упали
            ниже 20 — начинают убывать, и тренироваться станно.
          </Note>
        </Section>
      </div>
    </div>
  );
}

/** Заголовок раздела. */
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

/** Таблица «название — значение». */
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

/** Врезка с тем, что стоит держать в голове. */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 p-3 rounded-xl bg-amber-900/20 border border-amber-700/30
                    text-[10px] text-amber-200/90 leading-relaxed">
      {children}
    </div>
  );
}
