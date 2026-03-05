import React, { useState } from 'react';

export type NudgeType =
  | 'trial_expired'
  | 'trial_ending'
  | 'item_limit_warning'
  | 'data_expiry_warning'
  | 'upload_limit'
  | 'fail_locked'
  | 'subscription_expired';

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
  failCount?: number;
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
  data_expiry_warning: {
    urgent: false,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    message: ({ daysLeft }) =>
      `수술기록이 ${daysLeft}일 후 삭제됩니다. 플랜을 업그레이드하면 데이터를 영구 보관할 수 있습니다.`,
    cta: '업그레이드',
  },
  upload_limit: {
    urgent: true,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    message: () => '이번 달 수술기록 업로드 한도를 초과했습니다. 더 업로드하려면 플랜을 업그레이드하세요.',
    cta: '업그레이드',
  },
  fail_locked: {
    urgent: false,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    message: ({ failCount }) =>
      failCount && failCount > 0
        ? `교환(FAIL) 기록 ${failCount}건이 대기 중입니다. Basic 플랜으로 업그레이드하면 지금 바로 관리할 수 있습니다.`
        : '교환(FAIL) 관리 기능을 사용하려면 Basic 플랜으로 업그레이드하세요.',
    cta: '교환 관리 사용하기',
  },
  subscription_expired: {
    urgent: true,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    message: () => '구독이 만료되어 Free 플랜으로 전환되었습니다. 다시 구독하면 모든 기능과 데이터가 즉시 복원됩니다.',
    cta: '구독 재개하기',
  },
};

const DISMISS_FOREVER_KEY = (type: NudgeType) => `nudge_hide_forever_${type}`;

interface Props {
  type: NudgeType;
  daysLeft?: number;
  currentCount?: number;
  maxCount?: number;
  failCount?: number;
  onUpgrade: () => void;
}

export default function UpgradeNudge({ type, daysLeft, currentCount, maxCount, failCount, onUpgrade }: Props) {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISS_FOREVER_KEY(type)));
  const [doNotShow, setDoNotShow] = useState(false);

  if (dismissed) return null;

  const config = NUDGE_CONFIG[type];
  const ctx: NudgeContext = { daysLeft, currentCount, maxCount, failCount };

  const isUrgent = config.urgent;
  const bg = isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200';
  const iconColor = isUrgent ? 'text-rose-500' : 'text-amber-500';
  const textColor = isUrgent ? 'text-rose-800' : 'text-amber-800';
  const btnColor = isUrgent
    ? 'bg-rose-600 hover:bg-rose-700 text-white'
    : 'bg-amber-500 hover:bg-amber-600 text-white';
  const dismissColor = isUrgent ? 'text-rose-400 hover:text-rose-600' : 'text-amber-400 hover:text-amber-600';
  const checkColor = isUrgent ? 'accent-rose-500' : 'accent-amber-500';

  const handleClose = () => {
    if (doNotShow) {
      localStorage.setItem(DISMISS_FOREVER_KEY(type), '1');
    }
    setDismissed(true);
  };

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
      {/* 다시 보지 않기 */}
      <label className={`flex items-center gap-1 shrink-0 cursor-pointer select-none ${dismissColor}`}>
        <input
          type="checkbox"
          checked={doNotShow}
          onChange={e => setDoNotShow(e.target.checked)}
          className={`w-3 h-3 rounded ${checkColor}`}
        />
        <span className="text-[10px] font-medium whitespace-nowrap">다시 보지 않기</span>
      </label>
      <button
        onClick={handleClose}
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
