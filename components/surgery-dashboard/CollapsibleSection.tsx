import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CollapsibleSectionProps {
    id?: string;
    title: string;
    subtitle: string;
    accentColor: 'indigo' | 'rose' | 'slate';
    icon: React.ReactNode;
    badge?: string;
    defaultOpen?: boolean;
    storageKey?: string;
    children: React.ReactNode;
}

const ACCENT_STYLES = {
    indigo: {
        border: 'border-l-indigo-400',
        iconBg: 'bg-indigo-50',
        chevron: 'text-indigo-400',
    },
    rose: {
        border: 'border-l-rose-400',
        iconBg: 'bg-rose-50',
        chevron: 'text-rose-400',
    },
    slate: {
        border: 'border-l-slate-400',
        iconBg: 'bg-slate-50',
        chevron: 'text-slate-400',
    },
};

export default function CollapsibleSection({
    id,
    title,
    subtitle,
    accentColor,
    icon,
    badge,
    defaultOpen = true,
    storageKey,
    children,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(() => {
        if (storageKey) {
            try {
                const saved = localStorage.getItem(`collapse_${storageKey}`);
                if (saved !== null) return saved === 'true';
            } catch { /* ignore */ }
        }
        return defaultOpen;
    });

    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
    const accent = ACCENT_STYLES[accentColor];

    // Measure content height for smooth animation
    const measureHeight = useCallback(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight);
        }
    }, []);

    useEffect(() => {
        measureHeight();
        // Re-measure on window resize
        window.addEventListener('resize', measureHeight);
        return () => window.removeEventListener('resize', measureHeight);
    }, [measureHeight]);

    // Re-measure when children change
    useEffect(() => {
        if (isOpen) {
            // After render, measure again
            const timer = setTimeout(measureHeight, 100);
            return () => clearTimeout(timer);
        }
    }, [children, isOpen, measureHeight]);

    const toggle = () => {
        setIsOpen(prev => {
            const next = !prev;
            if (storageKey) {
                try { localStorage.setItem(`collapse_${storageKey}`, String(next)); } catch { /* ignore */ }
            }
            return next;
        });
    };

    return (
        <div id={id}>
            {/* Header */}
            <button
                onClick={toggle}
                className={`w-full bg-white rounded-2xl border border-slate-100 border-l-[3px] ${accent.border} shadow-sm px-6 py-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-all duration-200 group`}
                aria-expanded={isOpen}
                aria-controls={id ? `${id}-content` : undefined}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${accent.iconBg} flex items-center justify-center`}>
                        {icon}
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight">{title}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{subtitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {badge && <span className="text-[10px] font-bold text-slate-400">{badge}</span>}
                    <svg
                        className={`w-4 h-4 ${accent.chevron} transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Collapsible Content */}
            <div
                id={id ? `${id}-content` : undefined}
                style={{
                    maxHeight: isOpen ? (typeof contentHeight === 'number' ? `${contentHeight}px` : '9999px') : '0px',
                    opacity: isOpen ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                }}
            >
                <div ref={contentRef} className="pt-4 space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
