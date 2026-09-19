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
    // На ПК даём окну 250 мс, чтобы Telegram отцентрировал его,
    // и затем плавно разворачиваем на весь экран
    setTimeout(() => {
      const isApi8 = typeof tg.isVersionAtLeast === 'function' ? tg.isVersionAtLeast('8.0') : false;
      if (isApi8 && typeof (tg as any).requestFullscreen === 'function') {
        (tg as any).requestFullscreen();
      }
    }, 250);
  } else {
    // На мобильных устройствах
    tg.expand();
    const isApi8 = typeof tg.isVersionAtLeast === 'function' ? tg.isVersionAtLeast('8.0') : false;
    if (isApi8 && typeof (tg as any).requestFullscreen === 'function') {
      (tg as any).requestFullscreen();
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
