import React from 'react';

interface Props {
  registeredCount: number;
  onComplete: () => void;
}

export default function Step5Complete({ registeredCount, onComplete }: Props) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-black text-slate-900 mb-2">설정 완료!</h2>

      {registeredCount > 0 ? (
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          재고 <span className="font-bold text-emerald-600">{registeredCount}종</span>이 등록되었습니다.<br />
          대시보드에서 부족 품목과 발주 현황을 확인하세요.
        </p>
      ) : (
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          언제든지 재고 마스터에서 직접 추가할 수 있습니다.<br />
          대시보드로 이동해 기능을 확인해보세요.
        </p>
      )}

      <div className="w-full max-w-sm space-y-2 mb-8">
        {[
          '재고 마스터 — 현재 재고 수량 관리',
          '대시보드 홈 — 부족 재고 · 발주 현황',
          '수술기록 업로드 — 덴트웹 엑셀 연동',
        ].map(item => (
          <div key={item} className="flex items-center gap-2 text-left bg-slate-50 rounded-xl px-4 py-2.5">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs text-slate-600">{item}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full max-w-sm py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
      >
        대시보드로 이동
      </button>
    </div>
  );
}
