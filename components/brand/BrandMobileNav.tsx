import React, { useEffect, useState } from 'react';
import { View } from '../../types';

interface BrandMobileNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const NAV_ITEMS: Array<{ view: View; label: string }> = [
  { view: 'homepage', label: '홈' },
  { view: 'solutions', label: '솔루션' },
  { view: 'courses', label: '교육' },
  { view: 'blog', label: '블로그' },
  { view: 'contact', label: '문의' },
];

export const BrandMobileNav: React.FC<BrandMobileNavProps> = ({ currentView, onNavigate }) => {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobileViewport(mediaQuery.matches);
    sync();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', sync);
      return () => mediaQuery.removeEventListener('change', sync);
    }
    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  if (!isMobileViewport) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[160] border-t border-slate-200 bg-white/96 backdrop-blur pb-[max(env(safe-area-inset-bottom),_8px)] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)]"
      aria-label="브랜드 포털 모바일 내비게이션"
    >
      <div className="grid grid-cols-5 gap-1 px-3 py-2.5 max-w-md mx-auto">
        {NAV_ITEMS.map(({ view, label }) => (
          <button
            key={view}
            type="button"
            onClick={() => {
              onNavigate(view);
              setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
            }}
            className={`min-h-[3rem] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98] text-[11px] font-bold ${
              currentView === view
                ? 'border-slate-900 bg-slate-50 text-slate-900'
                : 'border-slate-100 bg-white text-slate-600 shadow-sm'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BrandMobileNav;
