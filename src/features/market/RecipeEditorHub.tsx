import React, { useState } from 'react';
import RecipeEditor from './RecipeEditor';
import WeaponRecipeEditor from '../gangs/WeaponRecipeEditor';

export type RecipeTab = 'kitchen' | 'weapons';

interface RecipeEditorHubProps {
  onClose: () => void;
  /** Какая вкладка открыта по умолчанию. Кухню открывают из кухни,
   *  оружие — с верстака, поэтому стартовая вкладка разная. */
  initialTab?: RecipeTab;
}

/**
 * Общая оболочка редакторов рецептов.
 *
 * Редакторов стало два — еда и оружие, — но это один и тот же
 * авторский инструмент: список рецептов, состав, предметы. Поэтому
 * вкладки здесь, а сами редакторы остаются отдельными файлами и не
 * знают друг о друге: каждый хранит свои рецепты по-своему (кухня —
 * в браузере автора, оружие — в базе), и общий код только мешал бы.
 *
 * Панель вкладок лежит поверх детей, а не над ними в разметке:
 * WeaponRecipeEditor позиционируется как fixed на весь экран и
 * иначе закрыл бы переключатель.
 */
export default function RecipeEditorHub({ onClose, initialTab = 'kitchen' }: RecipeEditorHubProps) {
  const [tab, setTab] = useState<RecipeTab>(initialTab);

  const tabs: Array<{ id: RecipeTab; label: string }> = [
    { id: 'kitchen', label: '🍳 Кухня' },
    { id: 'weapons', label: '🔫 Оружие' },
  ];

  return (
    <div className="fixed inset-0 z-[800] flex flex-col">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[900] flex gap-1 p-1 rounded-xl bg-black/80 border border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors ${
              tab === t.id ? 'bg-purple-600 text-white' : 'text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'kitchen' ? (
        <RecipeEditor onClose={onClose} />
      ) : (
        <WeaponRecipeEditor onClose={onClose} />
      )}
    </div>
  );
}