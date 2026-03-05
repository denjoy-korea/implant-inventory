import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * 빈 목록 / 데이터 없음 상태 표시 컴포넌트.
 *
 * 사용 예:
 * ```tsx
 * <EmptyState
 *   title="재고 항목이 없습니다"
 *   description="새 항목을 추가해 주세요."
 *   action={<button onClick={onAdd}>항목 추가</button>}
 * />
 * ```
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
    {icon && (
      <div className="mb-4 text-slate-300">
        {icon}
      </div>
    )}
    <p className="text-sm font-semibold text-slate-500">{title}</p>
    {description && (
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    )}
    {action && (
      <div className="mt-4">{action}</div>
    )}
  </div>
);

export default EmptyState;
