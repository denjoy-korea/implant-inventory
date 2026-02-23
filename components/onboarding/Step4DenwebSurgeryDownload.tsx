import React from 'react';

interface Props {
  onNext: () => void;
}

const STEPS = [
  { step: '1', label: '덴트웹 접속 → 수술기록 메뉴' },
  { step: '2', label: '조회 기간 설정 후 엑셀 내보내기' },
  { step: '3', label: '다운로드된 .xlsx 파일 확인' },
];

export default function Step4DenwebSurgeryDownload({ onNext }: Props) {
  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">수술기록지 다운로드</h2>
      <p className="text-sm text-slate-500 mb-6">
        덴트웹에서 수술기록을 엑셀 파일로 내보내세요.<br />
        다음 단계에서 이 파일을 덴조이에 업로드합니다.
      </p>

      <div className="space-y-2 mb-4">
        {STEPS.map(({ step, label }, i) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-4 bg-slate-50 rounded-2xl px-5 py-3.5">
              <span className="text-xs font-black text-indigo-500 w-5 shrink-0">{step}</span>
              <p className="text-sm text-slate-700 flex-1">{label}</p>
              {i === STEPS.length - 1 && (
                <button
                  onClick={onNext}
                  className="shrink-0 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                  완료
                </button>
              )}
            </div>
            {i === 1 && (
              <div className="flex items-start gap-2 px-5 py-2.5 bg-indigo-50 rounded-2xl">
                <svg className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[11px] text-indigo-600 leading-relaxed">
                  가능하면 <span className="font-bold">최근 1년 이상</span>의 데이터를 포함하는 것이 분석 정확도에 도움이 됩니다.
                </p>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            파일을 아직 다운로드하지 않았다면 덴트웹에서 다운로드한 뒤 완료를 눌러주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
