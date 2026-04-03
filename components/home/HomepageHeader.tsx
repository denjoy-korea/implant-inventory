import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from '../../types/app';
import { isSystemAdminIdentity, type User } from '../../types';

interface HomepageHeaderProps {
  currentView?: View;
  user?: User | null;
  onGoToLogin: () => void;
  onGoToSignup: () => void;
  onGoToContact: () => void;
  onNavigate: (view: string) => void;
  onGoToMyPage?: () => void;
  onGoToAdminPanel?: () => void;
  onLogout?: () => void | Promise<void>;
}

const HomepageHeader: React.FC<HomepageHeaderProps> = ({
  currentView,
  user,
  onGoToLogin,
  onGoToSignup,
  onGoToContact,
  onNavigate,
  onGoToMyPage,
  onGoToAdminPanel,
  onLogout,
}) => {
  const isSystemAdmin = isSystemAdminIdentity(user);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const navItems: Array<{ view: View; label: string; onClick: () => void }> = [
    { view: 'homepage', label: '홈', onClick: () => onNavigate('homepage') },
    { view: 'about', label: '회사소개', onClick: () => onNavigate('about') },
    { view: 'consulting', label: '병원컨설팅', onClick: () => onNavigate('consulting') },
    { view: 'solutions', label: '솔루션', onClick: () => onNavigate('solutions') },
    { view: 'courses', label: '강의', onClick: () => onNavigate('courses') },
    { view: 'blog', label: '블로그', onClick: () => onNavigate('blog') },
    { view: 'community', label: '커뮤니티', onClick: () => onNavigate('community') },
    { view: 'contact', label: '문의', onClick: onGoToContact },
  ];

  const goHome = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleAccountAction = (action?: () => void | Promise<void>) => {
    setIsAccountMenuOpen(false);
    action?.();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-[140] w-full font-sans">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-4">
            <button
              type="button"
              onClick={goHome}
              className="flex items-center space-x-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded-lg"
              aria-label="메인 홈페이지로 이동"
            >
              <img src="/logo.png" alt="DentWeb Data Processor" className="h-9 sm:h-10 w-auto object-contain" />
              <div className="h-8 w-px bg-slate-200 mx-2 sm:mx-4"></div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] text-slate-400 font-medium leading-none">Powered by</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg sm:text-xl font-bold tracking-tight bg-[linear-gradient(135deg,#7c3aed_0%,#8b5cf6_50%,#6366f1_100%)] bg-clip-text text-transparent">DenJOY</span>
                </div>
              </div>
            </button>

            <nav className="hidden lg:flex items-center gap-5 xl:gap-8 flex-1 justify-center" aria-label="메인 홈페이지 내비게이션">
              {navItems.map((item) => {
                const isActive = currentView === item.view;

                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={item.onClick}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative whitespace-nowrap px-0.5 py-2 text-sm font-bold leading-none tracking-normal transition-colors duration-200 ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-x-0 -bottom-0.5 mx-auto h-[2px] rounded-full transition-all duration-200 ${isActive ? 'w-full bg-slate-900' : 'w-0 bg-slate-300 group-hover:w-full'}`}
                    />
                  </button>
                );
              })}
            </nav>

            {user ? (
              <div ref={accountMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors ${isAccountMenuOpen ? 'border-indigo-300 bg-indigo-50/70' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline text-sm font-semibold text-slate-700">{user.name}님</span>
                  <svg
                    className={`h-4 w-4 text-slate-400 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isAccountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.14)]"
                  >
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Account</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{user.name}님</p>
                    </div>
                    <div className="p-2">
                      {isSystemAdmin && onGoToAdminPanel && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleAccountAction(onGoToAdminPanel)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${currentView === 'admin_panel' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <span>관리자 페이지</span>
                          <span className={`text-[11px] font-bold ${currentView === 'admin_panel' ? 'text-white/70' : 'text-rose-500'}`}>ADMIN</span>
                        </button>
                      )}
                      {onGoToMyPage && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleAccountAction(onGoToMyPage)}
                          className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${currentView === 'mypage' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <span>마이페이지</span>
                          <svg className={`h-4 w-4 ${currentView === 'mypage' ? 'text-white/70' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {onLogout && (
                      <div className="border-t border-slate-100 p-2">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleAccountAction(onLogout)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                          <span>로그아웃</span>
                          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H9m0 0 3-3m-3 3 3 3" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="items-center gap-2 hidden md:flex">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-xs sm:text-sm font-bold text-slate-600 px-2 sm:px-3 py-1 hover:text-slate-800 transition-colors"
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={onGoToSignup}
                  className="text-xs sm:text-sm font-bold bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  회원가입
                </button>
              </div>
            )}

            <div className="md:hidden flex items-center gap-2">
              {!user && (
                <button
                  type="button"
                  onClick={onGoToSignup}
                  className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  회원가입
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HomepageHeader;
