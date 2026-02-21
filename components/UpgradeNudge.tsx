import React, { useState } from 'react';

export type NudgeType =
  | 'trial_expired'
  | 'trial_ending'
  | 'item_limit_warning';

interface NudgeConfig {
  urgent: boolean;
  icon: React.ReactNode;
  message: (ctx: NudgeContext) => string;
  cta: string;
}

interface NudgeContext {
  daysLeft?: number;
  currentCount?: number;
  maxCount?: number;
}

const NUDGE_CONFIG: Record<NudgeType, NudgeConfig> = {
  trial_expired: {
    urgent: true,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    message: () => '무료 체험이 종료되었습니다. 데이터를 유지하려면 플랜을 선택하세요.',
    cta: '플랜 선택하기',
  },
  trial_ending: {
    urgent: false,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    message: ({ daysLeft }) =>
      daysLeft === 0
        ? '오늘 무료 체험이 종료됩니다. 연간 결제 시 20% 할인.'
        : `무료 체험 ${daysLeft}일 남았습니다. 연간 결제 시 20% 할인.`,
    cta: '지금 업그레이드',
  },
  item_limit_warning: {
    urgent: false,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
      </svg>
    ),
    message: ({ currentCount, maxCount }) =>
      `재고 품목 ${currentCount}/${maxCount}개 — 한도의 90%에 도달했습니다.`,
    cta: '업그레이드',
  },
};

interface Props {
  type: NudgeType;
  daysLeft?: number;
  currentCount?: number;
  maxCount?: number;
  onUpgrade: () => void;
}

export default function UpgradeNudge({ type, daysLeft, currentCount, maxCount, onUpgrade }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const config = NUDGE_CONFIG[type];
  const ctx: NudgeContext = { daysLeft, currentCount, maxCount };

  const isUrgent = config.urgent;
  const bg = isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200';
  const iconColor = isUrgent ? 'text-rose-500' : 'text-amber-500';
  const textColor = isUrgent ? 'text-rose-800' : 'text-amber-800';
  const btnColor = isUrgent
    ? 'bg-rose-600 hover:bg-rose-700 text-white'
    : 'bg-amber-500 hover:bg-amber-600 text-white';
  const dismissColor = isUrgent ? 'text-rose-400 hover:text-rose-600' : 'text-amber-400 hover:text-amber-600';

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${bg}`}>
      <span className={iconColor}>{config.icon}</span>
      <p className={`flex-1 text-xs font-medium ${textColor}`}>
        {config.message(ctx)}
      </p>
      <button
        onClick={onUpgrade}
        className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${btnColor}`}
      >
        {config.cta}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className={`shrink-0 transition-colors ${dismissColor}`}
        aria-label="닫기"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
