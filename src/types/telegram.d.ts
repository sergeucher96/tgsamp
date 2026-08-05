export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        onCloseEvent: (callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
        onEvent: (eventType: string, callback: () => void) => void;
        enableClosingBlocked: (blocked: boolean) => void;
        isClosingConfirmationEnabled: boolean;
        backButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
          header_bg_color?: string;
          bottom_bar_bg_color?: string;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
          };
          chat_type?: string;
          chat_instance?: string;
        };
        initData: string;
        version: string;
      };
    };
  }
}
