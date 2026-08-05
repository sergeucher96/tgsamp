# Подключение к Telegram Mini App

## Что уже сделано

1. ✅ Установлен пакет `@twa-dev/sdk`
2. ✅ Добавлен Telegram Web App SDK в `index.html`
3. ✅ Настроен viewport для мобильных устройств
4. ✅ Создан хук `useTelegram` для интеграции с Telegram
5. ✅ Добавлена поддержка Telegram темы
6. ✅ Настроен Back Button
7. ✅ Добавлены TypeScript определения

## Как подключить к Telegram

### 1. Создайте бота через BotFather

```
1. Откройте @BotFather в Telegram
2. /newbot -> придумайте имя и username
3. Получите token
```

### 2. Настройте Mini App

```
1. В BotFather: /mybots
2. Выберите вашего бота
3. Bot Settings -> Menu Button
4. Укажите URL вашего deployed приложения (например: https://your-site.com)
5. Укажите название кнопки меню
```

### 3. Разверните приложение

**Вариант 1: Vercel**
```bash
npm install -g vercel
vercel
```

**Вариант 2: GitHub Pages**
```bash
# Добавьте в package.json:
"homepage": "https://username.github.io/repo"
npm run build
# Скопируйте dist/ в GitHub Pages
```

**Вариант 3: Netlify**
- Загрузите папку `dist/` на netlify.com

### 4. Важные настройки Supabase

Убедитесь, что в Supabase добавлены:

```sql
-- Таблица оружия
CREATE TABLE player_weapons (
  id BIGSERIAL PRIMARY KEY,
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weapon_type TEXT NOT NULL,
  owned BOOLEAN DEFAULT FALSE,
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  gun_range_entries INTEGER DEFAULT 0,
  gun_range_last_entry TIMESTAMP WITH TIME ZONE,
  license_earned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, weapon_type)
);

-- Дополнительные поля в profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS driving_exam_attempts JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gun_range_attempts INTEGER DEFAULT 0;
```

### 5. Тестирование

Для локального тестирования используйте Telegram Web App Hook или ngrok:

```bash
ngrok http 5173
# Используйте полученный URL для тестирования
```

## Использование хука useTelegram

```javascript
import { useTelegram } from './hooks/useTelegram';

function MyComponent() {
  const { isTelegram, telegramUser, themeParams } = useTelegram();
  
  if (isTelegram) {
    console.log('User:', telegramUser);
    console.log('Theme:', themeParams);
  }
  
  return <div>...</div>;
}
```

## Примечания

- Приложение полностью обратно совместимо с обычным браузером
- Все функции работают как в Telegram, так и вне его
- Telegram тема автоматически применяется, если открыто в Telegram
