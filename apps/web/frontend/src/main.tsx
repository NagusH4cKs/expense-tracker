import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ACTIVE_PRIMARY } from './palette';

document.documentElement.style.setProperty('--app-primary', ACTIVE_PRIMARY);
document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', ACTIVE_PRIMARY);
const appFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (appFavicon) {
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${ACTIVE_PRIMARY}"/><path d="M17 21h30v5H17zm0 9h19v5H17zm0 9h13v5H17z" fill="#fff"/><circle cx="44" cy="42" r="10" fill="#fff"/><path d="M44 36v12m-4-8h5a2 2 0 0 1 0 4h-5" fill="none" stroke="${ACTIVE_PRIMARY}" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  appFavicon.href = `data:image/svg+xml,${encodeURIComponent(iconSvg)}`;
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Failed to find root element with id "root".');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
