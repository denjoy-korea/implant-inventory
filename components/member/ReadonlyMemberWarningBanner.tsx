import React from 'react';

interface ReadonlyMemberWarningBannerProps {
  readonlyCount: number;
  currentPlanName: string;
  onUpgrade?: () => void;
}

const ReadonlyMemberWarningBanner: React.FC<ReadonlyMemberWarningBannerProps> = ({
  readonlyCount,
  currentPlanName,
  onUpgrade,
}) => {
  if (readonlyCount <= 0) return null;

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-800">
            인원 초과로 {readonlyCount}명이 읽기 전용 상태입니다
          </p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            현재 플랜({currentPlanName})의 최대 인원을 초과하여 일부 구성원이 읽기 전용으로 전환되었습니다.
            플랜을 업그레이드하거나 구성원을 정리하여 해결할 수 있습니다.
          </p>
        </div>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="flex-shrink-0 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            업그레이드
          </button>
        )}
      </div>
    </div>
  );
};

export default ReadonlyMemberWarningBanner;
