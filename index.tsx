
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import PaymentRedirectPage from './components/payment/PaymentRedirectPage';

// 배포 후 청크 파일 변경으로 발생하는 ChunkLoadError 처리 — 자동 새로고침 (최대 3회)
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  ) {
    try {
      const key = '_chunkReloadCount';
      const count = Number(sessionStorage.getItem(key) || '0');
      if (count >= 3) {
        // 3회 초과: 루프 중단 — 배포 상태 이상 또는 CDN 캐시 문제일 수 있음
        console.error('[ChunkLoad] 반복 실패 — 자동 새로고침 중단. 브라우저 캐시를 지우고 다시 시도해주세요.');
        return;
      }
      sessionStorage.setItem(key, String(count + 1));
    } catch {
      // sessionStorage 사용 불가 환경: 기존 동작 유지
    }
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
          // 서비스 구매 → 마이페이지(구매내역), 플랜 결제 → 대시보드
          let target = '/#/dashboard';
          try {
            if (sessionStorage.getItem('_pendingPaymentType') === 'service') {
              target = '/#/mypage';
              sessionStorage.setItem('_myPageTab', 'purchases');
              sessionStorage.removeItem('_pendingPaymentType');
            }
          } catch { /* private mode */ }
          window.location.href = `${window.location.origin}${target}`;
        }}
      />
    ) : (
      <HelmetProvider>
        <App />
      </HelmetProvider>
    )}
  </React.StrictMode>
);
