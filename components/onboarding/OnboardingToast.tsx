import React from 'react';

interface Props {
  progress: number;
  onClick: () => void;
}

export default function OnboardingToast({ progress, onClick }: Props) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[200] cursor-pointer group"
      onClick={onClick}
    >
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/80 border border-slate-100 px-4 py-3 flex items-center gap-3 w-[260px] hover:shadow-xl hover:border-indigo-100 transition-all duration-200">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 mb-1.5">시작 가이드 설정 미완료</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-indigo-600 shrink-0 w-7 text-right">{progress}%</span>
          </div>
        </div>

        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
