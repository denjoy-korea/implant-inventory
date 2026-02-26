import React from 'react';

interface Props {
  progress: number;
  onClick: () => void;
  completedLabel?: string | null;
}

const SparkIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export default function OnboardingToast({ progress, onClick, completedLabel }: Props) {
  const isCompleted = !!completedLabel;

  return (
    <div
      className="fixed bottom-20 right-3 md:bottom-8 md:right-6 z-[200] cursor-pointer group"
      onClick={onClick}
    >
      <div className={`rounded-full shadow-md border pl-2.5 pr-3 py-1.5 flex items-center gap-2 transition-all duration-300
        ${isCompleted
          ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100/80'
          : 'bg-white border-slate-100 shadow-slate-200/80 hover:border-indigo-100 hover:shadow-lg'}`}
      >
        {/* 아이콘: 완료 시 체크, 평소엔 스파크 */}
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300
          ${isCompleted ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
          {isCompleted ? (
            <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <SparkIcon className="w-3 h-3 text-indigo-600 animate-pulse-soft" />
          )}
        </div>

        {/* 완료 메시지 OR 진행률 바 */}
        {isCompleted ? (
          <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap">{completedLabel}</span>
        ) : (
          <div className="w-20 md:w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <span className={`text-[10px] font-bold w-6 text-right shrink-0 transition-colors duration-300
          ${isCompleted ? 'text-emerald-600' : 'text-indigo-600'}`}>
          {progress}%
        </span>
      </div>
    </div>
  );
}
