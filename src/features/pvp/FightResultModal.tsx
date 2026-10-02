import React from 'react';
import { X } from 'lucide-react';
import type { PresentedFight, Actor } from './types';
import { ACTION_LABEL, ACTION_ICON } from './types';

interface FightComicProps { fight: PresentedFight; }

/** Полоска здоровья. */
function HpBar({ value, max, tone }: { value: number; max: number; tone: Actor }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full ${tone === 'a' ? 'bg-emerald-500' : 'bg-rose-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Fighter({
  icon, name, hp, max, tone,
}: { icon: string; name: string; hp: number; max: number; tone: Actor }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-black truncate">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400 w-6 text-right">{hp}</span>
        <HpBar value={hp} max={max} tone={tone} />
        <span className="text-[10px] text-slate-400 w-6">{max}</span>
      </div>
    </div>
  );
}

/**
 * Разбор боя раунд за раундом.
 *
 * Слева всегда атакующий ('a'), справа защитник ('d') — так же,
 * как в журнале на сервере. Свою сторону игрок узнаёт по шапке,
 * а не по тому, с какой стороны стоит его полоска: переставлять
 * раскладку было бы путаницей, потому что порядок кадров в журнале
 * задаёт сервер.
 */
export function FightComic({ fight }: FightComicProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Fighter
          icon={fight.attacker.icon} name={fight.attacker.name}
          hp={fight.aHp} max={fight.aHpMax} tone="a"
        />
        <span className="text-xs font-black text-slate-500 shrink-0">ПРОТИВ</span>
        <Fighter
          icon={fight.defender.icon} name={fight.defender.name}
          hp={fight.dHp} max={fight.dHpMax} tone="d"
        />
      </div>

      <div className="mb-2 text-[10px] text-slate-500">
        {fight.rounds} раундов · сид {fight.seed}
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {fight.log.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">Журнал пуст</div>
        ) : (
          fight.log.map((e, i) => {
            const isMine = e.actor === fight.mySide;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] ${
                  isMine ? 'bg-emerald-900/25' : 'bg-rose-900/25'
                }`}
              >
                <span className="text-[10px] text-slate-500 w-6 shrink-0">р{e.n}</span>
                <span className="shrink-0">{ACTION_ICON[e.action]}</span>
                <span className="text-slate-300 shrink-0">{ACTION_LABEL[e.action]}</span>

                {e.damage > 0 && (
                  <span className="text-rose-400 font-black shrink-0">-{e.damage}</span>
                )}
                {e.heal > 0 && (
                  <span className="text-emerald-400 font-black shrink-0">+{e.heal}</span>
                )}

                {e.crit && <Badge text="крит" />}
                {e.miss && <Badge text="мимо" />}
                {e.blocked && <Badge text="в блок" />}

                <span className="ml-auto text-[10px] text-slate-500 shrink-0 tabular-nums">
                  {e.a_hp} : {e.d_hp}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="text-[9px] px-1 rounded bg-white/10 text-slate-400 shrink-0">
      {text}
    </span>
  );
}

interface FightResultModalProps {
  fight: PresentedFight | null;
  onClose: () => void;
}

/**
 * Модалка итога боя.
 *
 * Показывается обоим участникам. У вызывающего результат уже есть
 * из ответа RPC, у защитника он приезжает из очереди, поэтому
 * модалка принимает готовое представление и ничего не знает
 * о том, кто именно смотрит.
 */
export default function FightResultModal({ fight, onClose }: FightResultModalProps) {
  if (!fight) return null;

  const opponent = fight.mySide === 'a' ? fight.defender : fight.attacker;
  const me = fight.mySide === 'a' ? fight.attacker : fight.defender;

  return (
    <div className="fixed inset-0 z-[900] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-black border border-white/15 rounded-3xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div
            className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
              fight.won ? 'bg-emerald-600 text-white' : 'bg-rose-700 text-white'
            }`}
          >
            {fight.won ? 'Победа' : 'Поражение'}
          </div>
          <button onClick={onClose} className="p-1.5 bg-white/5 rounded-xl">
            <X size={16} />
          </button>
        </div>

        <div className="text-[11px] text-slate-400 mb-3 text-center">
          {me.name} против {opponent.name}
        </div>

        <FightComic fight={fight} />

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-white/10 text-xs font-black"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}