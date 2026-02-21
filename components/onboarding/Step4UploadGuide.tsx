import React from 'react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step4UploadGuide({ onNext, onBack }: Props) {
  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">수술기록 업로드 방법</h2>
      <p className="text-sm text-slate-500 mb-5">덴트웹 엑셀 파일을 그대로 올리면 됩니다</p>

      <div className="space-y-3 mb-6">
        {[
          {
            step: '1',
            title: '덴트웹 접속',
            desc: '수술기록 메뉴 → 엑셀 내보내기',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            ),
          },
          {
            step: '2',
            title: '덴조이 업로드',
            desc: '수술기록 업로드 탭 → 파일 선택',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            ),
          },
          {
            step: '3',
            title: '자동 분석 완료',
            desc: '재고 소모량 · 발주 필요 품목 자동 계산',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            ),
          },
        ].map(({ step, title, desc, icon }) => (
          <div key={step} className="flex items-start gap-3 bg-slate-50 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
              </svg>
            </div>
            <div>
              <div className="text-xs font-black text-indigo-500 mb-0.5">STEP {step}</div>
              <div className="text-sm font-bold text-slate-800">{title}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            업로드는 지금 당장 안 해도 됩니다. 재고 입력만으로도 대시보드에서 부족 품목을 바로 확인할 수 있어요.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-colors"
        >
          이전
        </button>
        <button
          onClick={onNext}
          className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          수술기록 업로드하기
        </button>
      </div>
    </div>
  );
}
