import React from 'react';

interface Props {
  progress: number;
  onClick: () => void;
}

const SparkIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export default function OnboardingToast({ progress, onClick }: Props) {
  return (
    <div
      className="fixed bottom-20 right-3 md:bottom-8 md:right-6 z-[200] cursor-pointer group"
      onClick={onClick}
    >
      {/* 모바일 + 데스크톱 공통: 컴팩트 필 */}
      <div className="bg-white rounded-full shadow-md shadow-slate-200/80 border border-slate-100 pl-2.5 pr-3 py-1.5 flex items-center gap-2 hover:border-indigo-100 hover:shadow-lg transition-all duration-200">
        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <SparkIcon className="w-3 h-3 text-indigo-600" />
        </div>
        <div className="w-20 md:w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-indigo-600 w-6 text-right shrink-0">{progress}%</span>
      </div>
    </div>
  );
}
