import React from 'react';

export interface FixtureItem {
  manufacturer: string;
  brand: string;
  size: string;
}

interface Props {
  onNext: () => void;
  onBack: () => void;
  onGoToDataSetup: () => void;
}

export default function Step2FixtureUpload({ onNext, onBack, onGoToDataSetup }: Props) {
  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">덴트웹 픽스처 목록 등록</h2>
      <p className="text-sm text-slate-500 mb-5">
        데이터 설정 페이지에서 파일을 올리고 저장하면<br />
        재고 품목이 자동으로 등록됩니다.
      </p>

      <div className="space-y-3 mb-5">
        {[
          {
            step: '1',
            title: '덴트웹에서 파일 다운로드',
            desc: '기준정보 → 임플란트 → 엑셀 내보내기',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            ),
          },
          {
            step: '2',
            title: '데이터 설정 페이지에서 업로드',
            desc: '아래 버튼 → 파일 선택 후 업로드',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            ),
          },
          {
            step: '3',
            title: 'FAIL · 보험청구 확장 후 저장',
            desc: '해당 항목을 확장 처리하고 저장하면 완료',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

      <button
        onClick={onGoToDataSetup}
        className="w-full py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all mb-3"
      >
        데이터 설정 페이지로 이동
      </button>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-colors"
        >
          이전
        </button>
        <button
          onClick={onNext}
          className="flex-[2] py-3 bg-slate-100 text-slate-500 text-sm font-bold rounded-2xl hover:bg-slate-200 transition-colors"
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
