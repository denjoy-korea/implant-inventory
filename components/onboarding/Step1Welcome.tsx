import React from 'react';

interface Props {
  hospitalName: string;
  onNext: () => void;
  onSkip: () => void;
}

export default function Step1Welcome({ hospitalName, onNext, onSkip }: Props) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8">
      <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>

      <h2 className="text-2xl font-black text-slate-900 mb-2">
        {hospitalName}에 오신 것을 환영합니다
      </h2>
      <p className="text-slate-500 text-sm mb-8 max-w-sm leading-relaxed">
        2단계만 따라하면 임플란트 재고가 바로 정리됩니다.<br />
        지금 설정하지 않아도 언제든 수정 가능해요.
      </p>

      <div className="w-full max-w-sm space-y-3 mb-8">
        {[
          { step: '01', label: '덴트웹 픽스처 목록 파일 업로드', time: '2분' },
          { step: '02', label: '수술기록 업로드 방법 확인', time: '1분' },
        ].map(({ step, label, time }) => (
          <div key={step} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 text-left">
            <span className="text-xs font-black text-indigo-500 w-6 shrink-0">{step}</span>
            <span className="text-sm text-slate-700 flex-1">{label}</span>
            <span className="text-xs text-slate-400">{time}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-sm py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
      >
        시작하기
      </button>
      <button
        onClick={onSkip}
        className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        나중에 직접 설정할게요
      </button>
    </div>
  );
}
