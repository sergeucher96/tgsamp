import { useEffect, useState } from 'react';

type TelegramWebApp = NonNullable<Window['Telegram']>['WebApp'];
type TelegramUser = NonNullable<NonNullable<TelegramWebApp['initDataUnsafe']>['user']>;
type TelegramThemeParams = TelegramWebApp['themeParams'];

interface TelegramState {
  isTelegram: boolean;
  isDesktop: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  telegramUser: TelegramUser | null;
  themeParams: TelegramThemeParams | null;
}

export function useTelegram(): TelegramState {
  const [isTelegram, setIsTelegram] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [themeParams, setThemeParams] = useState<TelegramThemeParams | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    const desktopPlatforms = ['tdesktop', 'macos', 'weba', 'webk', 'web'];
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const desktop = tg?.platform ? desktopPlatforms.includes(tg.platform) : !isMobileDevice;
    setIsDesktop(desktop);

    if (tg) {
      setIsTelegram(true);

      const tgAny = tg as any;
      setIsFullscreen(!!tgAny.isFullscreen);

      const handleFullscreenChange = () => {
        setIsFullscreen(!!tgAny.isFullscreen);
      };

      tg.onEvent('fullscreen_changed', handleFullscreenChange);

      if (tg.initDataUnsafe?.user) {
        setTelegramUser(tg.initDataUnsafe.user);
      }

      if (tg.themeParams) {
        setThemeParams(tg.themeParams);
        applyTelegramTheme(tg.themeParams);
      }

      return () => {
        tg.offEvent('fullscreen_changed', handleFullscreenChange);
      };
    } else {
      const handleDocFullscreen = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleDocFullscreen);
      return () => {
        document.removeEventListener('fullscreenchange', handleDocFullscreen);
      };
    }
  }, []);

  const toggleFullscreen = () => {
    const tg = window.Telegram?.WebApp as any;

    if (tg && typeof tg.requestFullscreen === 'function') {
      if (tg.isFullscreen) {
        if (typeof tg.exitFullscreen === 'function') {
          tg.exitFullscreen();
        }
      } else {
        tg.requestFullscreen();
      }
      return;
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return { isTelegram, isDesktop, isFullscreen, toggleFullscreen, telegramUser, themeParams };
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
