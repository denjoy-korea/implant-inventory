
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 배포 후 청크 파일 변경으로 발생하는 ChunkLoadError 처리 — 자동 새로고침
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  ) {
    window.location.reload();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('[SW] registration failed:', error);
    });
  });
}
