import {
  getEffectDef,
  STAT_MAX,
  DEFAULT_BUFF_MINUTES,
  type StatTarget,
} from './data/itemEffects';

export interface RawEffect {
  effect_key?: string;
  value?: number;
  duration_minutes?: number;
}

export interface EffectOutcome {
  /** Что реально применилось — для сообщения игроку */
  applied: string[];
  /** Эффекты, которые не удалось применить */
  skipped: string[];
  /** Было ли что применять вообще */
  hasEffect: boolean;
}

interface ApplyContext {
  player: Record<string, unknown>;
  updateProfile: (updates: Record<string, unknown>) => Promise<boolean>;
  applyBuff: (buff: {
    effect: string;
    name: string;
    amount: number;
    duration_minutes: number;
    type: string;
    source: string;
  }) => void;
  /** Что означает «потолок» для конкретного поля */
  statMax?: Partial<Record<StatTarget, number>>;
}

/**
 * Приводит эффект к строковому ключу.
 * В данных встречается два формата:
 *   [{ "effect_key": "heal_energy", "value": 25 }]
 *   { "3": 1 }  — старый баг, где вместо ключа записан id эффекта
 * Второй формат без словаря эффектов восстановить нельзя,
 * поэтому такие записи отбрасываются и чинятся миграцией.
 */
function readEffects(raw: unknown): RawEffect[] {
  if (Array.isArray(raw)) {
    return raw.filter(e => e && typeof e === 'object' && typeof (e as RawEffect).effect_key === 'string');
  }
  return [];
}

/** Эффекты могут прийти ключом свойства из старого редактора (id вместо key) */
export function normalizeEffects(raw: unknown): RawEffect[] {
  return readEffects(raw).map(e => ({
    effect_key: e.effect_key,
    value: Number(e.value) || 0,
    duration_minutes: Number(e.duration_minutes) || 0,
  }));
}

/**
 * Применяет эффекты предмета к игроку.
 *   stat     — мгновенное восстановление (энергия, здоровье, ...)
 *   buff     — усиление характеристики на время
 *   modifier — системный множитель (опыт, доход, ...)
 *   action   — разовое действие, обрабатывается вызывающим кодом
 */
export async function applyItemEffects(
  effects: unknown,
  ctx: ApplyContext,
): Promise<EffectOutcome> {
  const list = normalizeEffects(effects);
  const outcome: EffectOutcome = { applied: [], skipped: [], hasEffect: list.length > 0 };
  if (list.length === 0) return outcome;

  const profilePatch: Record<string, unknown> = {};

  for (const effect of list) {
    const key = effect.effect_key as string;
    const def = getEffectDef(key);
    const value = effect.value;

    switch (def.kind) {
      case 'stat': {
        const target = def.stat;
        if (!target) { outcome.skipped.push(def.name); break; }

        // Поля hunger/thirst может не быть в профиле — тогда эффект некуда писать
        const current = ctx.player[target];
        if (typeof current !== 'number') {
          outcome.skipped.push(def.name);
          break;
        }
        if (current >= STAT_MAX) { outcome.skipped.push(`${def.name} — уже полное`); break; }

        const cap = ctx.statMax?.[target] ?? STAT_MAX;
        profilePatch[target] = Math.min(cap, current + value);
        outcome.applied.push(`${def.icon} ${def.name} +${value}`);
        break;
      }

      case 'buff':
      case 'modifier': {
        if (value === 0) { outcome.skipped.push(`${def.name} — значение не задано`); break; }
        const sign = value > 0 ? '+' : '';
        const unit = def.percent ? '%' : '';
        ctx.applyBuff({
          effect: key,
          name: def.name,
          amount: value,
          duration_minutes: effect.duration_minutes || DEFAULT_BUFF_MINUTES,
          type: def.kind,
          source: 'food',
        });
        outcome.applied.push(
          `${def.icon} ${def.name} ${sign}${value}${unit} на ${effect.duration_minutes || DEFAULT_BUFF_MINUTES} мин.`,
        );
        break;
      }

      case 'action':
        outcome.applied.push(`${def.icon} ${def.name}`);
        break;

      default:
        outcome.skipped.push(`${def.name} — неизвестный эффект`);
    }
  }

  if (Object.keys(profilePatch).length > 0) {
    await ctx.updateProfile(profilePatch);
  }

  return outcome;
}
