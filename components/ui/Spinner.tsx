import React from 'react';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

/**
 * 인라인 로딩 스피너.
 *
 * 사용 예:
 * ```tsx
 * <Spinner />
 * <Spinner size="sm" color="border-indigo-500" />
 * <Spinner size="lg" />
 * ```
 */
const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'border-indigo-500',
  className = '',
}) => (
  <span
    className={`inline-block rounded-full border-transparent animate-spin ${SIZE_CLASSES[size]} ${color} border-t-current ${className}`}
    role="status"
    aria-label="로딩 중"
  />
);

export default Spinner;
