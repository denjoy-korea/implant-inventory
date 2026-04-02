import React, { useEffect, useRef, useState } from 'react';
import { tossPaymentService } from '../../services/tossPaymentService';
import { supabase } from '../../services/supabaseClient';

type PageState = 'loading' | 'success' | 'fail';

interface PaymentRedirectPageProps {
  /** 완료(성공/실패 확인) 후 호출 — pricing 페이지로 이동 */
  onComplete: () => void;
}

const PaymentRedirectPage: React.FC<PaymentRedirectPageProps> = ({ onComplete }) => {
  const isSuccessPath = window.location.pathname === '/payment/success';
  const [pageState, setPageState] = useState<PageState>('loading');
  const [message, setMessage] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (!isSuccessPath) {
      // /payment/fail — TossPayments가 code, message, orderId를 전달
      const raw = params.get('message') || '결제가 취소되었습니다.';
      try {
        setMessage(decodeURIComponent(raw));
      } catch {
        setMessage(raw);
      }
      setPageState('fail');

      // [SEC] CSRF 방지: sessionStorage의 _pendingOrderId가 URL의 orderId와 일치하는 경우에만
      // billing_history를 cancelled로 업데이트 (타인이 조작한 orderId 파라미터 차단)
      const orderId = params.get('orderId');
      let isOwnPayment = false;
      try {
        isOwnPayment = sessionStorage.getItem('_pendingOrderId') === orderId;
        if (isOwnPayment) sessionStorage.removeItem('_pendingOrderId');
      } catch { /* private mode */ }
      if (orderId && isOwnPayment) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            supabase
              .from('billing_history')
              .update({ payment_status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('id', orderId)
              .eq('payment_status', 'pending')
              .then(() => {}); // fire-and-forget
          }
        });
      }
      return;
    }

    if (processedRef.current) return;
    processedRef.current = true;

    const paymentKey = params.get('paymentKey') || '';
    const orderId = params.get('orderId') || '';
    const amount = Number(params.get('amount') || '0');

    if (!paymentKey || !orderId || !amount) {
      setMessage('결제 정보가 올바르지 않습니다. 다시 시도해주세요.');
      setPageState('fail');
      return;
    }

    // [SEC] CSRF: success 경로에서도 sessionStorage 정리
    try { sessionStorage.removeItem('_pendingOrderId'); } catch { /* private mode */ }

    // Supabase JS v2는 fresh page load 시 세션 복원이 비동기.
    // getSession()은 로컬스토리지에서 읽기만 해서 만료된 토큰도 반환할 수 있음.
    // TossPayments 리다이렉트 후 새 페이지 로드 시 access token이 만료됐을 수 있으므로
    // refreshSession()으로 강제 갱신하여 Edge Function의 getUser() 검증이 통과되도록 한다.
    supabase.auth.refreshSession().then(({ data: { session }, error: refreshErr }) => {
      if (refreshErr || !session) {
        // refresh token도 만료된 경우 → 재로그인 필요
        setMessage('로그인 세션이 만료되었습니다. 다시 로그인 후 결제를 진행해주세요.');
        setPageState('fail');
        return;
      }
      return tossPaymentService.confirmPayment(paymentKey, orderId, amount);
    }).then((result) => {
      if (!result) return; // 세션 없음 처리됨
      const { ok, error } = result;
      if (ok) {
        setPageState('success');
        // [LOW] clearTimeout으로 컴포넌트 언마운트 시 navigate 누수 방지
        const timer = setTimeout(onComplete, 2500);
        return () => clearTimeout(timer);
      } else {
        setMessage(error || '결제 승인에 실패했습니다.');
        setPageState('fail');
      }
    }).catch((err: unknown) => {
      // H-3: .catch() 추가 — 네트워크 오류 등으로 unhandled rejection 시 무한 로딩 방지
      const msg = err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.';
      setMessage(msg);
      setPageState('fail');
    });
  }, [isSuccessPath, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
        {/* 로고 */}
        <div className="mb-6">
          <span className="text-2xl font-black text-indigo-600 tracking-tight">DenJOY</span>
        </div>

        {pageState === 'loading' && (
          <>
            <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">결제 처리 중</h2>
            <p className="text-slate-500 text-sm">잠시만 기다려주세요...</p>
          </>
        )}

        {pageState === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">결제 완료!</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              플랜이 성공적으로 활성화되었습니다.
              <br />잠시 후 서비스로 이동합니다...
            </p>
          </>
        )}

        {pageState === 'fail' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">결제 실패</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {message || '결제가 처리되지 않았습니다.'}
            </p>
            <button
              onClick={onComplete}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              결제 페이지로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentRedirectPage;
