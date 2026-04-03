import React, { useCallback } from 'react';
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
}) => {
  const isSystemAdmin = isSystemAdminIdentity(user);
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

            {/* 로그인 상태에 따라 다른 UI */}
            {user ? (
              <div className="items-center gap-2 hidden md:flex">
                {isSystemAdmin && onGoToAdminPanel && (
                  <button
                    type="button"
                    onClick={onGoToAdminPanel}
                    className={`text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border transition-colors whitespace-nowrap ${currentView === 'admin_panel' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    관리자 페이지
                  </button>
                )}
                <button
                  type="button"
                  onClick={onGoToMyPage}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{user.name}님</span>
                </button>
                <button
                  type="button"
                  onClick={onGoToMyPage}
                  className="text-xs sm:text-sm font-bold bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  마이페이지
                </button>
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
              {user ? (
                <>
                  {isSystemAdmin && onGoToAdminPanel && (
                    <button
                      type="button"
                      onClick={onGoToAdminPanel}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${currentView === 'admin_panel' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 bg-white'}`}
                    >
                      관리자
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onGoToMyPage}
                    className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm"
                  >
                    {user.name.charAt(0)}
                  </button>
                </>
              ) : (
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
