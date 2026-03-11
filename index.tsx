
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import PaymentRedirectPage from './components/payment/PaymentRedirectPage';

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

// TossPayments 결제 redirect 경로 처리 (/payment/success, /payment/fail)
const pathname = window.location.pathname;
const isPaymentRedirect =
  pathname === '/payment/success' || pathname === '/payment/fail';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isPaymentRedirect ? (
      <PaymentRedirectPage
        onComplete={() => {
          // 결제 완료 후 대시보드로 이동 — planState가 새로 로드되어 플랜 즉시 반영
          window.location.href = `${window.location.origin}/#/dashboard`;
        }}
      />
    ) : (
      <HelmetProvider>
        <App />
      </HelmetProvider>
    )}
  </React.StrictMode>
);
