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
    // На ПК открываем в стандартном ровном окне Telegram
    // Если Telegram Desktop попытался принудительно навязать fullscreen — сбрасываем его
    const tgAny = tg as any;
    if (tgAny.isFullscreen && typeof tgAny.exitFullscreen === 'function') {
      tgAny.exitFullscreen();
    }
  } else {
    // На мобильных устройствах раскрываем на стандартную высоту шторки
    tg.expand();
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
