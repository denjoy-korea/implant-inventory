import React from 'react';

interface PausedAccountScreenProps {
  userName: string;
  planName: string;
  suspendReason?: string | null;
  onResume: () => void;
  onCancelPlan: () => void;
  onLogout: () => void;
}

const PausedAccountScreen: React.FC<PausedAccountScreenProps> = ({
  userName,
  planName,
  suspendReason,
  onResume,
  onCancelPlan,
  onLogout,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  // 플랜 다운그레이드로 인한 접근 제한
  if (suspendReason === 'plan_downgrade') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{userName}님, 서비스 접근이 제한되었습니다</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              플랜 변경으로 인해 이 계정의 접근 권한이 제한되었습니다.
            </p>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-slate-600 leading-relaxed">
                서비스를 계속 이용하려면{' '}
                <span className="font-semibold text-slate-800">담당 관리자에게 플랜 업그레이드를 요청</span>
                해 주세요.
              </p>
            </div>
          </div>

          <div className="text-center">
            <button onClick={onLogout} className="px-6 py-3 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition-colors">
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">{userName}님, 계정이 일시정지 상태입니다</h2>
          <p className="text-sm text-slate-500 mt-2">데이터 초기화가 완료되어 계정이 일시정지되었습니다.</p>
        </div>

        <div className="space-y-3">
          {/* 사용 재개 */}
          <button
            onClick={onResume}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm">사용 재개</p>
                <p className="text-xs text-indigo-200 mt-0.5">기존 {planName} 플랜을 유지하며 새로 시작합니다</p>
              </div>
            </div>
          </button>

          {/* 플랜 취소 */}
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">플랜 취소</p>
                  <p className="text-xs text-slate-500 mt-0.5">Free 플랜으로 전환 후 사용을 시작합니다</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-start gap-3 mb-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-amber-800">플랜을 취소하시겠습니까?</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    취소 후 재구독 시, 기능 추가 및 유지관리 비용 변동으로 인해 <span className="font-bold">기존 요금이 보장되지 않을 수 있습니다.</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  돌아가기
                </button>
                <button
                  onClick={onCancelPlan}
                  className="flex-1 px-3 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors"
                >
                  플랜 취소 후 시작
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <button onClick={onLogout} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

export default PausedAccountScreen;
