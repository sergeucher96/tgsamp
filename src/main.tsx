import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/index.css'

// Initialize Telegram Web App
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  // Try fullscreen mode (Telegram Desktop / newer clients)
  if (typeof tg.setFullscreen === 'function') {
    tg.setFullscreen(true);
  }

  // Use Telegram's viewport dimensions for precise positioning on desktop
  const root = document.documentElement;
  const applyViewport = () => {
    if (tg.viewportWidth) root.style.setProperty('--tg-w', `${tg.viewportWidth}px`);
    if (tg.viewportHeight) root.style.setProperty('--tg-h', `${tg.viewportHeight}px`);
  };
  applyViewport();
  tg.onEvent('viewportChanged', applyViewport);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
