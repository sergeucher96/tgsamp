/**
 * Слой времени суток.
 *
 * Тонкая полупрозрачная заливка поверх игры: тёплая на рассвете,
 * холодная и густая ночью, днём прозрачная. Слой ничего не
 * перехватывает — игра под ним остаётся кликабельной.
 *
 * Стоит выше карты, но ниже окон и меню: затемнённый список бизнесов
 * читать неудобно, а карта — это фон, который как раз и должен
 * выглядеть иначе.
 *
 * Переход плавный, потому что фаза меняется скачком, а на резкой
 * смене цвета игра выглядит сломанной.
 */

import { useTimeStore } from '../../stores/useTimeStore';
import { PHASE_TINT } from '../../game/time/gameClock';

export default function DayNightOverlay() {
  const phase = useTimeStore((s) => s.phase);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] pointer-events-none transition-colors duration-[3000ms] ease-in-out"
      style={{ backgroundColor: PHASE_TINT[phase] }}
    />
  );
}
