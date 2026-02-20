
import React from 'react';
import { User, View, DashboardTab } from '../types';

interface HeaderProps {
  onHomeClick: () => void;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onLogout: () => void;
  onNavigate: (view: View) => void;
  onTabNavigate: (tab: DashboardTab) => void;
  onProfileClick: () => void;
  user: User | null;
  currentView: View;
  showLogo?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onHomeClick,
  onLoginClick,
  onSignupClick,
  onLogout,
  onNavigate,
  onTabNavigate,
  onProfileClick,
  user,
  currentView,
  showLogo = true
}) => {
  const isSystemAdmin = user?.role === 'admin';
  const isHospitalAdmin = user?.role === 'master' || isSystemAdmin;
  const publicViews: View[] = ['landing', 'value', 'pricing', 'contact', 'analyze', 'notices'];
  const isPublicView = publicViews.includes(currentView);

  return (
    <header className={`bg-white border-b border-slate-200 py-3 md:sticky md:top-0 z-[100] shadow-sm ${showLogo ? 'px-6' : 'px-8'}`}>
      <div className={`mx-auto flex items-center justify-between ${showLogo ? 'max-w-7xl' : 'w-full'}`}>
        <div className="flex items-center flex-shrink-0 w-[220px]">
          {showLogo && (
            <button
              type="button"
              onClick={onHomeClick}
              className="flex items-center space-x-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded-lg"
            >
              <img src="/logo.png" alt="DentWeb Data Processor" className="h-10 w-auto object-contain" />
              <div className="h-8 w-px bg-slate-200 mx-4"></div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] text-slate-400 font-medium leading-none">Powered by</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight" style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent'
                  }}>DenJOY</span>
                </div>
              </div>
            </button>
          )}
        </div>
        {(!user || isPublicView) && (
          <nav className="hidden md:flex items-center justify-center gap-10 flex-1">
            <button
              onClick={() => onNavigate('value')}
              className={`text-sm font-bold ${currentView === 'value' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              도입 효과
            </button>
            <button
              onClick={() => {
                if (currentView !== 'landing') onNavigate('landing' as View);
                setTimeout(() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }), currentView !== 'landing' ? 100 : 0);
              }}
              className="text-sm font-bold text-slate-500 hover:text-slate-800"
            >
              기능소개
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className={`text-sm font-bold ${currentView === 'pricing' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              요금제
            </button>
            <button
              onClick={() => {
                if (currentView !== 'landing') onNavigate('landing' as View);
                setTimeout(() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' }), currentView !== 'landing' ? 100 : 0);
              }}
              className="text-sm font-bold text-slate-500 hover:text-slate-800"
            >
              고객후기
            </button>
            <button
              onClick={() => onNavigate('notices')}
              className={`text-sm font-bold ${currentView === 'notices' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              업데이트 소식
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className={`text-sm font-bold ${currentView === 'contact' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              문의하기
            </button>
            <button
              onClick={() => onNavigate('analyze')}
              className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${currentView === 'analyze' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
            >
              무료 분석
            </button>
          </nav>
        )}
        {user && !isPublicView && (
          <nav className="hidden md:flex items-center justify-center gap-8 flex-1">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`text-sm font-bold ${currentView === 'dashboard' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              대시보드
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className={`text-sm font-bold ${currentView === 'pricing' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              요금제
            </button>
            <button
              onClick={() => onNavigate('notices')}
              className={`text-sm font-bold ${currentView === 'notices' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              업데이트 소식
            </button>
            {isHospitalAdmin && (
              <button
                onClick={() => onTabNavigate('fixture_upload')}
                className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                데이터 가공
              </button>
            )}
            {isSystemAdmin && (
              <button
                onClick={() => onNavigate('admin_panel')}
                className="text-sm font-bold text-slate-500 hover:text-rose-600"
              >
                회원 관리
              </button>
            )}
          </nav>
        )}

        <div className="flex items-center gap-4 flex-shrink-0 justify-end">
          {user ? (
            isPublicView ? (
              /* 공개 페이지: 대시보드 이동 버튼 + 깔끔한 로그아웃 */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  대시보드
                </button>
                <button
                  onClick={onLogout}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 px-2 py-2 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              /* 대시보드 뷰: 프로필 + 홈 + 로그아웃 */
              <div className="flex items-center gap-3">
                <button
                  onClick={onProfileClick}
                  className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors"
                  title="내 정보 보기"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{user.name}님</span>
                </button>
                <div className="h-5 w-px bg-slate-200" />
                <button
                  onClick={onHomeClick}
                  aria-label="홈으로 이동"
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
                  홈
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                >
                  로그아웃
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onLoginClick} className="text-sm font-bold text-slate-600 px-3 py-1">로그인</button>
              <button onClick={onSignupClick} className="text-sm font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg">회원가입</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
