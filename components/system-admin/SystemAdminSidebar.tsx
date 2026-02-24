import React from 'react';
import { AdminTab } from './adminTabs';

interface SystemAdminSidebarProps {
  activeTab: AdminTab;
  isMobileViewport: boolean;
  isMobileSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  pendingResetCount: number;
  manualEntriesCount: number;
  pendingInquiryCount: number;
  pendingWaitlistCount: number;
  pendingPlanChangeCount: number;
  analysisLeadsTotal: number;
  onTabChange: (tab: AdminTab) => void;
  onToggleView: () => void;
  onCloseMobileSidebar: () => void;
  onCollapseSidebar: () => void;
}

const SystemAdminSidebar: React.FC<SystemAdminSidebarProps> = ({
  activeTab,
  isMobileViewport,
  isMobileSidebarOpen,
  isSidebarCollapsed,
  pendingResetCount,
  manualEntriesCount,
  pendingInquiryCount,
  pendingWaitlistCount,
  pendingPlanChangeCount,
  analysisLeadsTotal,
  onTabChange,
  onToggleView,
  onCloseMobileSidebar,
  onCollapseSidebar,
}) => {
  return (
    <>
      {isMobileViewport && isMobileSidebarOpen && (
        <button
          type="button"
          onClick={onCloseMobileSidebar}
          className="fixed inset-0 z-[210] bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          aria-label="운영자 메뉴 닫기"
        />
      )}

      <aside className={`bg-slate-900 flex flex-col shadow-2xl ${isMobileViewport
        ? `fixed inset-y-0 left-0 w-72 max-w-[88vw] z-[220] transition-transform duration-200 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
        : `flex-shrink-0 relative z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-0 overflow-hidden opacity-0 pointer-events-none' : 'w-64'}`
        }`}>
        <div className="p-6 pb-2 relative">
          {isMobileViewport ? (
            <button
              type="button"
              onClick={onCloseMobileSidebar}
              className="absolute right-4 top-4 h-11 w-11 inline-flex items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition-colors hover:border-slate-500 hover:text-white lg:hidden"
              title="메뉴 닫기"
              aria-label="운영자 메뉴 닫기"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="absolute right-4 top-4 group/collapse">
              <button
                type="button"
                onClick={onCollapseSidebar}
                className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition-colors hover:border-slate-500 hover:text-white"
                title="사이드바 닫기 (Ctrl/Cmd + \\)"
                aria-label="사이드바 닫기"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap shadow-xl opacity-0 transition-all duration-150 group-hover/collapse:opacity-100 group-hover/collapse:translate-y-1 pointer-events-none z-50 border border-slate-700">
                사이드바 닫기 (Ctrl/Cmd + \\)
              </div>
            </div>
          )}
          <div className="mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-lg shadow-indigo-500/30">S</div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate leading-tight">시스템 관리</p>
                <button
                  type="button"
                  onClick={onToggleView}
                  className="flex items-center gap-1 mt-0.5 group/admin"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider group-hover/admin:text-emerald-300 transition-colors">운영자 모드</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-sidebar-scrollbar px-6 pb-6 space-y-8">
          <div className="space-y-1">
            <button
              onClick={() => onTabChange('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm duration-200 group ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span>대시보드 홈</span>
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">시스템 제어</h3>
            <nav className="space-y-1">
              <button onClick={() => onTabChange('hospitals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm duration-200 group ${activeTab === 'hospitals' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">병원 관리 마스터</span>
              </button>
              <button onClick={() => onTabChange('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm duration-200 group ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">회원 계정 마스터</span>
              </button>
              <button onClick={() => onTabChange('plan_management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm duration-200 group ${activeTab === 'plan_management' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">플랜 관리 및 권한 할당</span>
              </button>
              <button onClick={() => onTabChange('reset_requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm duration-200 group ${activeTab === 'reset_requests' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">초기화 요청 처리망</span>
                {pendingResetCount > 0 && (
                  <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {pendingResetCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">문서</div>
            <nav className="space-y-1">
              <button onClick={() => onTabChange('manual')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <span>사용자 매뉴얼</span>
                {manualEntriesCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-slate-500">{manualEntriesCount}</span>
                )}
              </button>
              <button onClick={() => onTabChange('reviews')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'reviews' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                <span>고객 후기 관리</span>
              </button>
              <button onClick={() => onTabChange('inquiries')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'inquiries' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                <span>문의내역 관리</span>
                {pendingInquiryCount > 0 && (
                  <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {pendingInquiryCount}
                  </span>
                )}
              </button>
              <button onClick={() => onTabChange('waitlist')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'waitlist' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>대기자 관리</span>
                {pendingWaitlistCount > 0 && (
                  <span className="ml-auto bg-rose-100 text-rose-700 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {pendingWaitlistCount}
                  </span>
                )}
              </button>
              <button onClick={() => onTabChange('plan_change_requests')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'plan_change_requests' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                <span>플랜 변경 신청</span>
                {pendingPlanChangeCount > 0 && (
                  <span className="ml-auto bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {pendingPlanChangeCount}
                  </span>
                )}
              </button>
              <button onClick={() => onTabChange('analysis_leads')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'analysis_leads' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <span>분석 리드 관리</span>
                {analysisLeadsTotal > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-slate-500">{analysisLeadsTotal}</span>
                )}
              </button>
              <button onClick={() => onTabChange('traffic')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'traffic' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <span>방문자 트래픽</span>
              </button>
              <button onClick={() => onTabChange('content')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'content' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <span>콘텐츠 관리</span>
              </button>
              <button onClick={() => onTabChange('consultations')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'consultations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span>상담 관리</span>
              </button>
              <button onClick={() => onTabChange('integrations')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${activeTab === 'integrations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <span>연동 설정</span>
              </button>
            </nav>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default SystemAdminSidebar;
