
import React, { useState, useEffect } from 'react';

const TOC_ICONS = {
  'section-charts': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'section-deep': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'section-clinical': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
} as const;

const TOC_SECTIONS = [
  { id: 'section-charts', label: '차트' },
  { id: 'section-deep', label: '심층' },
  { id: 'section-clinical', label: '임상' },
] as const;

function getStickyOffset(): number {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
    return 84;
  }
  const stickyEl = document.querySelector<HTMLElement>('[data-sticky-anchor="surgery-dashboard"]');
  if (stickyEl) {
    return stickyEl.getBoundingClientRect().bottom + 12;
  }
  return 300;
}

export function FloatingTOC({ hasClinical }: { hasClinical: boolean }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobileViewport(mediaQuery.matches);
    sync();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', sync);
      return () => mediaQuery.removeEventListener('change', sync);
    }
    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  useEffect(() => {
    const filteredIds = TOC_SECTIONS
      .filter(s => hasClinical || s.id !== 'section-clinical')
      .map(s => s.id);

    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
      const offset = getStickyOffset();
      let current: string | null = null;
      for (const id of filteredIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= offset + 20) current = id;
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasClinical]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    const offset = getStickyOffset();
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const filteredSections = TOC_SECTIONS.filter(s => hasClinical || s.id !== 'section-clinical');
  if (isMobileViewport) return null;

  return (
    <div
      className="fixed right-6 bottom-8 z-30 transition-all duration-300"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 py-2 px-1.5 flex flex-col gap-1">
        {filteredSections.map(s => {
          const isActive = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${isActive
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={s.label}
            >
              <span className={isActive ? 'text-indigo-500' : 'text-slate-400'}>{TOC_ICONS[s.id]}</span>
              <span>{s.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-1 animate-pulse" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FloatingTOC;
