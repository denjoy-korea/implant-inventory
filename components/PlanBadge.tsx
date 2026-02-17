import React from 'react';
import { PlanType, PLAN_NAMES } from '../types';

interface PlanBadgeProps {
  plan: PlanType;
  size?: 'sm' | 'md';
}

const BADGE_STYLES: Record<PlanType, string> = {
  free: 'bg-slate-100 text-slate-600',
  basic: 'bg-teal-50 text-teal-600 border border-teal-200',
  plus: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
  business: 'bg-violet-50 text-violet-600 border border-violet-200',
  ultimate: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
};

const DOT_STYLES: Record<PlanType, string> = {
  free: 'bg-slate-400',
  basic: 'bg-teal-500',
  plus: 'bg-indigo-500',
  business: 'bg-violet-500',
  ultimate: 'bg-fuchsia-500',
};

const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${sizeClass} ${BADGE_STYLES[plan]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_STYLES[plan]}`} />
      {PLAN_NAMES[plan]}
    </span>
  );
};

export default PlanBadge;
