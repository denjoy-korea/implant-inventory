import React from 'react';

export type BadgeVariant =
  | 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate'
  | 'purple' | 'sky' | 'orange' | 'teal';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  indigo: 'bg-indigo-100 text-indigo-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
  purple: 'bg-purple-100 text-purple-800',
  sky: 'bg-sky-100 text-sky-700',
  orange: 'bg-orange-100 text-orange-700',
  teal: 'bg-teal-100 text-teal-700',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  /** 추가 Tailwind 클래스 */
  className?: string;
}

/**
 * 상태 표시용 배지 컴포넌트.
 *
 * 사용 예:
 * ```tsx
 * <Badge variant="emerald">활성</Badge>
 * <Badge variant="rose">탈퇴</Badge>
 * <Badge variant="slate">비활성</Badge>
 * ```
 */
const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', className = '' }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${VARIANT_CLASSES[variant]} ${className}`}
  >
    {children}
  </span>
);

export default Badge;
