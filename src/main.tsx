import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/index.css'

// Initialize Telegram Web App
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();

  const isDesktop = tg.platform === 'tdesktop' || tg.platform === 'macos' || tg.platform === 'weba' || tg.platform === 'webk';

  if (isDesktop) {
    const tgAny = tg as any;
    // Если Telegram Desktop открыл Main App в кривом fullscreen — принудительно выходим из него
    if (tgAny.isFullscreen && typeof tgAny.exitFullscreen === 'function') {
      tgAny.exitFullscreen();
    }
    // На случай, если флаг fullscreen применится чуть позже при инициализации
    tg.onEvent('fullscreen_changed', () => {
      if (tgAny.isFullscreen && typeof tgAny.exitFullscreen === 'function') {
        tgAny.exitFullscreen();
      }
    });
  } else {
    // На смартфонах разворачиваем на весь экран
    tg.expand();
    if (typeof (tg as any).requestFullscreen === 'function') {
      (tg as any).requestFullscreen();
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
