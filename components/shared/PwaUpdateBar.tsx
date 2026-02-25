import React from 'react';

interface PwaUpdateBarProps {
  forceUpdate: boolean;
  message: string;
  isApplying: boolean;
  liftForBottomNav: boolean;
  onApply: () => void;
  onLater: () => void;
}

const PwaUpdateBar: React.FC<PwaUpdateBarProps> = ({
  forceUpdate,
  message,
  isApplying,
  liftForBottomNav,
  onApply,
  onLater,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        bottom: liftForBottomNav
          ? 'calc(5.7rem + env(safe-area-inset-bottom))'
          : 'calc(1rem + env(safe-area-inset-bottom))',
      }}
      className="fixed left-1/2 -translate-x-1/2 z-[120] w-[min(92vw,40rem)] rounded-2xl border border-indigo-200 bg-white/95 shadow-2xl backdrop-blur px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-indigo-600" aria-hidden="true">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3M5 20h14" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900">새 버전이 준비되었습니다</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {forceUpdate
              ? '보안 업데이트가 포함되어 즉시 적용이 필요합니다.'
              : message || '새로운 기능과 안정성 개선이 포함되어 있습니다.'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {!forceUpdate && (
          <button
            type="button"
            onClick={onLater}
            className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            나중에
          </button>
        )}
        <button
          type="button"
          onClick={onApply}
          disabled={isApplying}
          className="h-9 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApplying ? '적용 중...' : '업데이트 하기'}
        </button>
      </div>
    </div>
  );
};

export default PwaUpdateBar;

