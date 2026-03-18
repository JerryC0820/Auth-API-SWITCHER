import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const viewMode =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;

if (viewMode === 'tray-card') {
  document.documentElement.classList.add('tray-card-view');
  document.body.classList.add('tray-card-view');
  document.getElementById('root')?.classList.add('tray-card-root');
}

if (viewMode === 'license-host') {
  document.title = 'Auth API Switcher License Host';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
