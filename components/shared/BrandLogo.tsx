import React from 'react';

interface BrandLogoProps {
  onClick?: () => void;
  /** ARIA label for the wrapping button (default: 'DenJOY 홈으로 이동') */
  ariaLabel?: string;
  className?: string;
}

/**
 * BrandLogo — "DentWeb logo + Powered by DenJOY" 마크업을 공유하는 컴포넌트.
 * Header.tsx(SolutionHeader)와 HomepageHeader.tsx(BrandHeader) 양쪽에서 사용합니다.
 */
const BrandLogo: React.FC<BrandLogoProps> = ({
  onClick,
  ariaLabel = 'DenJOY 홈으로 이동',
  className = '',
}) => {
  const inner = (
    <div className="flex items-center space-x-2">
      <img src="/logo.png" alt="DentWeb Data Processor" className="h-9 sm:h-10 w-auto object-contain" />
      <div className="h-8 w-px bg-slate-200 mx-2 sm:mx-4" />
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[10px] text-slate-400 font-medium leading-none">Powered by</span>
        <div className="flex items-center gap-1.5">
          <span className="text-lg sm:text-xl font-bold tracking-tight bg-[linear-gradient(135deg,#7c3aed_0%,#8b5cf6_50%,#6366f1_100%)] bg-clip-text text-transparent">
            DenJOY
          </span>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded-lg ${className}`}
      >
        {inner}
      </button>
    );
  }

  return <div className={`flex items-center ${className}`}>{inner}</div>;
};

export default BrandLogo;
