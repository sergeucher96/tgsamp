import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/index.css'

// Initialize Telegram Web App
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();

  const isDesktop = tg.platform === 'tdesktop' || tg.platform === 'macos' || tg.platform === 'weba' || tg.platform === 'webk';

  // expand() и fullscreen вызываем ТОЛЬКО на мобильных устройствах.
  // На ПК Telegram Desktop сам идеально позиционирует окно, если его не трогать.
  if (!isDesktop) {
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
