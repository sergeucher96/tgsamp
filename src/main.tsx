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
  if (typeof (tg as any).setFullscreen === 'function') {
    (tg as any).setFullscreen(true);
  }

  // Dynamically set viewport height for proper fullscreen on desktop webviews
  const setDynamicHeight = () => {
    const root = document.documentElement;
    root.style.setProperty('--app-height', `${window.innerHeight}px`);
  };
  setDynamicHeight();
  window.addEventListener('resize', setDynamicHeight);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
