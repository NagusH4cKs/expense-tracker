import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ACTIVE_PRIMARY } from './palette';

document.documentElement.style.setProperty('--app-primary', ACTIVE_PRIMARY);
document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', ACTIVE_PRIMARY);
const appFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (appFavicon) {
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="${ACTIVE_PRIMARY}"/><path d="M10 16V8c0-1.1.89-2 2-2h9V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-1h-9c-1.11 0-2-.9-2-2m3-8c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h9V8zm3 5.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5" fill="#fff"/></svg>`;
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
