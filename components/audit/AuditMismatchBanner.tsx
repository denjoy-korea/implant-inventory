import React from 'react';

interface AuditMismatchItem {
  id: string;
  result: {
    actualCount?: number;
  };
  item: {
    brand: string;
    size: string;
    currentStock: number;
  };
}

interface AuditMismatchBannerProps {
  totalMismatched: number;
  mismatchItems: AuditMismatchItem[];
}

const AuditMismatchBanner: React.FC<AuditMismatchBannerProps> = ({ totalMismatched, mismatchItems }) => {
  if (totalMismatched <= 0) return null;

  return (
    <div className="flex bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-rose-700 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          불일치 {totalMismatched}건 발견 — 실사 완료 후 재고에 자동 반영됩니다.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {mismatchItems.slice(0, 6).map(({ id, result, item }) => {
            const diff = (result.actualCount ?? 0) - item.currentStock;
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg">
                {item.brand} {item.size}
                <span className="text-rose-500 font-black">{diff > 0 ? `+${diff}` : diff}개</span>
              </span>
            );
          })}
          {mismatchItems.length > 6 && (
            <span className="inline-flex items-center px-2.5 py-1 bg-rose-100 text-rose-500 text-[11px] font-bold rounded-lg">+{mismatchItems.length - 6}건</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditMismatchBanner;
