import React from 'react';

interface MobileAnalyzeGateProps {
  onSignup: () => void;
  onContact: () => void;
}

const ANALYZE_URL = 'https://inventory.denjoy.info/analyze';
const SHARE_TITLE = 'DenJOY 무료 재고 건강도 분석 — PC에서 확인하세요';

const MobileAnalyzeGate: React.FC<MobileAnalyzeGateProps> = ({ onSignup, onContact }) => {
  const handleShareLink = () => {
    if (navigator.share) {
      void navigator.share({ title: SHARE_TITLE, url: ANALYZE_URL });
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${encodeURIComponent(ANALYZE_URL)}`;
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-5 py-12 bg-slate-50">
      {/* 아이콘 배지 */}
      <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-5 shadow-sm">
        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>

      {/* 타이틀 */}
      <h1 className="text-xl font-black text-slate-900 text-center mb-1">무료 재고 건강도 분석</h1>
      <p className="text-sm font-semibold text-indigo-600 mb-6">PC 전용 기능</p>

      {/* 이유 설명 카드 */}
      <div className="w-full max-w-sm bg-white border border-amber-100 rounded-2xl p-4 mb-7 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-800 mb-1">왜 PC에서만 가능한가요?</p>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              분석은 덴트웹·청구프로그램에서 수술기록 엑셀을 내려받아 업로드해야 시작됩니다.
              해당 프로그램이 현재 모바일을 지원하지 않아 파일 준비가 어렵습니다.
            </p>
          </div>
        </div>
      </div>

      {/* CTA 버튼 영역 */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* Primary */}
        <button
          onClick={onSignup}
          className="w-full py-3.5 bg-slate-900 text-white text-[15px] font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          무료로 먼저 시작하기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
        <p className="text-center text-[11px] text-slate-400 -mt-1">분석 없이도 재고 관리 바로 시작 가능</p>

        {/* Secondary */}
        <button
          onClick={handleShareLink}
          className="w-full py-3 border border-indigo-200 bg-indigo-50 text-indigo-700 text-[14px] font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          PC에서 분석 링크 받기
        </button>
        <p className="text-center text-[11px] text-slate-400 -mt-1">공유 또는 이메일로 링크를 PC에 보내기</p>

        {/* Tertiary */}
        <button
          onClick={onContact}
          className="w-full py-2 text-[13px] text-slate-400 font-medium underline underline-offset-2 active:opacity-70 transition-opacity"
        >
          전문가에게 분석 맡기기
        </button>
        <p className="text-center text-[11px] text-slate-400 -mt-2">상담 신청 시 분석 결과 직접 제공</p>
      </div>
    </div>
  );
};

export default MobileAnalyzeGate;
