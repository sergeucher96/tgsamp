import { useEffect, useState } from 'react';

type TelegramWebApp = NonNullable<Window['Telegram']>['WebApp'];
type TelegramUser = NonNullable<NonNullable<TelegramWebApp['initDataUnsafe']>['user']>;
type TelegramThemeParams = TelegramWebApp['themeParams'];

interface TelegramState {
  isTelegram: boolean;
  telegramUser: TelegramUser | null;
  themeParams: TelegramThemeParams | null;
}

export function useTelegram(): TelegramState {
  const [isTelegram, setIsTelegram] = useState<boolean>(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [themeParams, setThemeParams] = useState<TelegramThemeParams | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setIsTelegram(true);

      if (tg.initDataUnsafe?.user) {
        setTelegramUser(tg.initDataUnsafe.user);
      }

      if (tg.themeParams) {
        setThemeParams(tg.themeParams);
        applyTelegramTheme(tg.themeParams);
      }
    }
  }, []);

  return { isTelegram, telegramUser, themeParams };
}

function applyTelegramTheme(params: TelegramThemeParams) {
  const root = document.documentElement;
  const themeMap = {
    bg_color: '--tg-bg-color',
    text_color: '--tg-text-color',
    hint_color: '--tg-hint-color',
    link_color: '--tg-link-color',
    button_color: '--tg-button-color',
    button_text_color: '--tg-button-text-color',
    secondary_bg_color: '--tg-secondary-bg-color',
    header_bg_color: '--tg-header-bg-color',
    bottom_bar_bg_color: '--tg-bottom-bar-bg-color',
  } as const;

  type ThemeKey = keyof typeof themeMap;

  for (const [tg, css] of Object.entries(themeMap) as [ThemeKey, string][]) {
    if (params[tg]) {
      root.style.setProperty(css, params[tg]);
    }
  }
}
