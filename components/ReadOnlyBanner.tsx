import React from 'react';

interface ReadOnlyBannerProps {
  currentItemCount: number;
  maxItems: number;
  onUpgrade: () => void;
}

const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({ currentItemCount, maxItems, onUpgrade }) => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-800">
            읽기 전용 모드
          </p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            현재 Free 플랜 한도({maxItems}개)를 초과하는 재고 데이터({currentItemCount}개)가 있습니다.
            데이터는 보존되지만 수정/추가가 제한됩니다.
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="flex-shrink-0 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
        >
          업그레이드
        </button>
      </div>
    </div>
  );
};

export default ReadOnlyBanner;
