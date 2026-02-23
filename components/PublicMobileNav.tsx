import React, { useEffect, useState, useCallback } from 'react';
import { View } from '../types';
import { scrollToElementWithRetry } from '../utils/scroll';

interface PublicMobileNavProps {
    currentView: View;
    onNavigate: (view: View) => void;
    onAnalyzeClick: () => void;
}

export const PublicMobileNav: React.FC<PublicMobileNavProps> = ({ currentView, onNavigate, onAnalyzeClick }) => {
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [mobileNotice, setMobileNotice] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mediaQuery = window.matchMedia('(max-width: 1279px)');
        const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
        syncViewport();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncViewport);
            return () => mediaQuery.removeEventListener('change', syncViewport);
        }
        mediaQuery.addListener(syncViewport);
        return () => mediaQuery.removeListener(syncViewport);
    }, []);

    useEffect(() => {
        if (!mobileNotice) return;
        const timer = window.setTimeout(() => setMobileNotice(null), 2800);
        return () => window.clearTimeout(timer);
    }, [mobileNotice]);



    const handleNavClick = (targetView: View, targetSection?: string) => {
        if (currentView !== targetView) {
            onNavigate(targetView);
        }
        if (targetSection) {
            scrollToElementWithRetry(targetSection);
        } else {
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
        }
    };

    const handleAnalyze = () => {
        onAnalyzeClick();
    };

    if (!isMobileViewport) return null;

    return (
        <>
            {mobileNotice && (
                <div className="fixed left-1/2 -translate-x-1/2 bottom-[6.75rem] z-[170] rounded-xl bg-slate-900 text-white text-xs font-bold px-4 py-2 shadow-xl">
                    {mobileNotice}
                </div>
            )}
            <nav className="fixed inset-x-0 bottom-0 z-[160] border-t border-slate-200 bg-white/96 backdrop-blur pb-[max(env(safe-area-inset-bottom),0px)] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)]">
                <div className="grid grid-cols-3 gap-1.5 px-3 py-2.5 max-w-md mx-auto">
                    <button
                        type="button"
                        onClick={() => handleNavClick('value')}
                        className={`min-h-[3rem] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98] ${currentView === 'value' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-600 shadow-sm'}`}
                    >
                        <span className="text-[12px] font-bold">도입효과</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNavClick('landing', 'features')}
                        className={`min-h-[3rem] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98] border-slate-100 bg-white text-slate-600 shadow-sm`}
                    >
                        <span className="text-[12px] font-bold">기능소개</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNavClick('pricing')}
                        className={`min-h-[3rem] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98] ${currentView === 'pricing' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-600 shadow-sm'}`}
                    >
                        <span className="text-[12px] font-bold">요금제</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNavClick('reviews')}
                        className={`min-h-[3rem] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98] ${currentView === 'reviews' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-600 shadow-sm'}`}
                    >
                        <span className="text-[12px] font-bold">고객후기</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNavClick('notices')}
                        className={`min-h-[3rem] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98] ${currentView === 'notices' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-600 shadow-sm'}`}
                    >
                        <span className="text-[12px] font-bold">업데이트 소식</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleAnalyze}
                        className="min-h-[3rem] rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-0 shadow-sm relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100/50 to-emerald-50/10 opacity-0 group-active:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-1 z-10">
                            <span className="text-[12px] font-bold">무료분석</span>
                            <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-1 py-0.5 rounded leading-none">PC</span>
                        </div>
                    </button>
                </div>
            </nav>
        </>
    );
};
