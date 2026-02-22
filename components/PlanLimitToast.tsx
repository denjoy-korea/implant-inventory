import React, { useEffect, useState } from 'react';

export type LimitType =
  | 'item_limit'      // 재고 품목 한도 초과
  | 'upload_limit'    // 업로드 한도 초과
  | 'member_limit';   // 구성원 한도 초과

interface Props {
  type: LimitType;
  onUpgrade: () => void;
  onClose: () => void;
  currentCount?: number;
  maxCount?: number;
}

const CONFIG: Record<LimitType, { title: string; message: (c?: number, m?: number) => string }> = {
  item_limit: {
    title: '재고 품목 한도 초과',
    message: (c, m) =>
      `현재 플랜의 최대 재고 품목 수(${m}개)에 도달했습니다. 더 추가하려면 플랜을 업그레이드하세요.`,
  },
  upload_limit: {
    title: '업로드 한도 초과',
    message: () =>
      '이번 달 수술기록 업로드 횟수를 모두 사용했습니다. 다음 달 초기화되거나 플랜을 업그레이드하세요.',
  },
  member_limit: {
    title: '구성원 한도 초과',
    message: (_, m) =>
      `현재 플랜의 최대 구성원 수(${m}명)에 도달했습니다. 더 추가하려면 플랜을 업그레이드하세요.`,
  },
};

export default function PlanLimitToast({ type, onUpgrade, onClose, currentCount, maxCount }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 마운트 후 즉시 fade-in
    const t = setTimeout(() => setVisible(true), 10);
    // 5초 후 자동 닫기
    const auto = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5000);
    return () => { clearTimeout(t); clearTimeout(auto); };
  }, [onClose]);

  const cfg = CONFIG[type];

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-2rem)] max-w-sm
        bg-white rounded-2xl shadow-xl border border-rose-100 p-4
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-rose-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{cfg.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{cfg.message(currentCount, maxCount)}</p>
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
          className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        onClick={onUpgrade}
        className="mt-3 w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
      >
        플랜 업그레이드 →
      </button>
    </div>
  );
}
