import { useEffect, useState } from 'react';

export function useTelegram() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramUser, setTelegramUser] = useState(null);
  const [themeParams, setThemeParams] = useState(null);

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

function applyTelegramTheme(params) {
  const root = document.documentElement;
  const map = {
    bg_color: '--tg-bg-color',
    text_color: '--tg-text-color',
    hint_color: '--tg-hint-color',
    link_color: '--tg-link-color',
    button_color: '--tg-button-color',
    button_text_color: '--tg-button-text-color',
    secondary_bg_color: '--tg-secondary-bg-color',
    header_bg_color: '--tg-header-bg-color',
    bottom_bar_bg_color: '--tg-bottom-bar-bg-color',
  };

  for (const [tg, css] of Object.entries(map)) {
    if (params[tg]) {
      root.style.setProperty(css, params[tg]);
    }
  }
}
