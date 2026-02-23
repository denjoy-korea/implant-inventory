import React, { useEffect, useState, useRef } from 'react';

interface NavSection {
  id: string;
  label: string;
}

interface SectionNavigatorProps {
  sections: NavSection[];
}

const SectionNavigator: React.FC<SectionNavigatorProps> = ({ sections }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const indicatorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sections.length === 0) return;

    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { threshold: 0.3, rootMargin: '-15% 0px -40% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [sections]);

  // Update floating indicator position
  useEffect(() => {
    if (!containerRef.current || !indicatorRef.current) return;
    const activeIndex = sections.findIndex((s) => s.id === activeId);
    if (activeIndex === -1) return;

    // Because the buttons have padding/gap, we estimate position or read DOM
    const buttons = containerRef.current.querySelectorAll('button');
    const targetButton = buttons[activeIndex];

    if (targetButton) {
      indicatorRef.current.style.transform = `translateY(${targetButton.offsetTop}px)`;
      indicatorRef.current.style.height = `${targetButton.offsetHeight}px`;
    }
  }, [activeId, sections]);


  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const HEADER_OFFSET = 72; // sticky header height
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col">
      <div
        ref={containerRef}
        className="relative flex flex-col gap-1 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5"
      >
        {/* Animated active indicator background */}
        <div
          ref={indicatorRef}
          className="absolute left-1.5 right-1.5 bg-indigo-600 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
          style={{
            height: '40px', // Default fallback
            top: 0
          }}
        />

        {sections.map(({ id, label }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              title={label}
              className={`
                relative z-10 px-4 py-2.5 rounded-xl text-[13px] font-bold tracking-tight
                transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] min-w-[72px] text-center
                ${isActive
                  ? 'text-white scale-100'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/50 scale-95 hover:scale-100'
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SectionNavigator;
