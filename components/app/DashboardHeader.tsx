import React from 'react';
import { DashboardTab, HospitalPlanState, PlanType, PLAN_LIMITS, UploadType, User } from '../../types';
import { UNLIMITED_DAYS } from '../../constants';
import PlanBadge from '../PlanBadge';
import { getDashboardTabTitle } from '../dashboard/dashboardTabTitle';

interface DashboardHeaderProps {
  dashboardHeaderRef: React.RefObject<HTMLElement | null>;
  fixtureFileRef: React.RefObject<HTMLInputElement | null>;
  surgeryFileRef: React.RefObject<HTMLInputElement | null>;
  showMobileDashboardNav: boolean;
  dashboardTab: DashboardTab;
  fixtureDataExists: boolean;
  user: User | null;
  planState: HospitalPlanState | null;
  isUltimatePlan: boolean;
  effectivePlan: PlanType;
  billableItemCount: number;
  memberCount: number;
  onOpenMobileMenu: () => void;
  onFileUpload: (file: File, type: UploadType) => void;
  onOpenAuditHistory: () => void;
  onRequestResetFixtureEdit: () => void;
  onOpenProfile: () => void;
  onGoHome: () => void;
  onLogout: () => void | Promise<void>;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dashboardHeaderRef,
  fixtureFileRef,
  surgeryFileRef,
  showMobileDashboardNav,
  dashboardTab,
  fixtureDataExists,
  user,
  planState,
  isUltimatePlan,
  effectivePlan,
  billableItemCount,
  memberCount,
  onOpenMobileMenu,
  onFileUpload,
  onOpenAuditHistory,
  onRequestResetFixtureEdit,
  onOpenProfile,
  onGoHome,
  onLogout,
}) => {
  const today = new Date();
  const dateLabel = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}. ${['일', '월', '화', '수', '목', '금', '토'][today.getDay()]}요일`;

  return (
    <header ref={dashboardHeaderRef} className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 md:sticky md:top-0 z-[100] shadow-sm flex items-center justify-between gap-2 overflow-x-hidden">
      <input
        type="file"
        ref={fixtureFileRef}
        accept=".xlsx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileUpload(file, 'fixture');
          event.target.value = '';
        }}
      />
      <input
        type="file"
        ref={surgeryFileRef}
        accept=".xlsx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileUpload(file, 'surgery');
          event.target.value = '';
        }}
      />

      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {showMobileDashboardNav && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 active:scale-[0.98] transition-all"
            aria-label="메뉴 열기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        )}
        <span className="hidden lg:inline text-xs text-slate-400 font-medium">{dateLabel}</span>
        <div className="hidden lg:block h-4 w-px bg-slate-200" />
        <h1 className="text-xs sm:text-sm font-bold text-slate-700 truncate whitespace-nowrap leading-tight max-w-[42vw] sm:max-w-none">
          {getDashboardTabTitle(dashboardTab)}
        </h1>
        {(dashboardTab === 'fixture_upload' || dashboardTab === 'surgery_database') && (
          <button
            onClick={() => (dashboardTab === 'fixture_upload' ? fixtureFileRef : surgeryFileRef).current?.click()}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            title=".xlsx 파일 업로드"
            aria-label=".xlsx 파일 업로드"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        )}
        {dashboardTab === 'inventory_audit' && (
          <button
            onClick={onOpenAuditHistory}
            className="hidden sm:flex px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            실사 이력
          </button>
        )}
      </div>

      {dashboardTab === 'fixture_edit' && fixtureDataExists && (
        <div className="hidden md:flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          <button
            onClick={onRequestResetFixtureEdit}
            className="px-3 py-1.5 text-slate-400 hover:text-rose-500 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            초기화
          </button>
        </div>
      )}

      <div className="hidden md:flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            {(() => {
              const remaining = planState?.daysUntilExpiry ?? UNLIMITED_DAYS;
              return isUltimatePlan ? (
                <span className="text-[11px] text-violet-500 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  평생 이용
                </span>
              ) : planState?.isTrialActive ? (
                <span className="text-[11px] font-medium flex items-center gap-1 text-amber-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  체험 {planState.trialDaysRemaining}일 남음
                </span>
              ) : planState?.plan === 'free' ? (
                <span className="text-[11px] font-medium text-slate-400">무료 플랜</span>
              ) : (
                <span className={`text-[11px] font-medium flex items-center gap-1 ${remaining <= 30 ? 'text-rose-500' : 'text-slate-400'}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {remaining >= UNLIMITED_DAYS ? '무기한' : `${remaining}일 남음`}
                </span>
              );
            })()}
            <div className="h-3.5 w-px bg-slate-200" />
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[11px]">{user.name.charAt(0)}</div>
              <span className="text-sm font-medium text-slate-600">{user.name}님</span>
            </button>
            {isUltimatePlan ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Ultimate
              </span>
            ) : (
              <PlanBadge plan={effectivePlan} size="sm" />
            )}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <span className="inline-flex items-center gap-0.5" title="등록 품목">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                {billableItemCount}/{PLAN_LIMITS[effectivePlan].maxItems === Infinity ? '∞' : PLAN_LIMITS[effectivePlan].maxItems}
              </span>
              <span className="inline-flex items-center gap-0.5" title="구성원">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                {memberCount}/{PLAN_LIMITS[effectivePlan].maxUsers === Infinity ? '∞' : PLAN_LIMITS[effectivePlan].maxUsers}
              </span>
            </div>
          </div>
        )}
        <div className="bg-slate-900 text-white text-[10px] sm:text-xs font-bold py-1.5 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="hidden sm:inline">시스템 정상</span>
          <span className="sm:hidden">정상</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <button
          onClick={onGoHome}
          className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
          홈
        </button>
        <button
          onClick={onLogout}
          className="text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
        >
          로그아웃
        </button>
      </div>

      <div className="md:hidden flex items-center gap-1.5 shrink-0">
        {dashboardTab === 'inventory_audit' && (
          <button
            onClick={onOpenAuditHistory}
            className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center active:scale-[0.98]"
            aria-label="실사 이력"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
        {user && (
          <button
            onClick={onOpenProfile}
            className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-indigo-600 flex items-center justify-center font-bold text-xs"
            aria-label="내 정보"
          >
            {user.name.charAt(0)}
          </button>
        )}
        <button
          onClick={onLogout}
          className="h-11 w-11 rounded-xl border border-rose-100 bg-rose-50 text-rose-500 flex items-center justify-center active:scale-[0.98]"
          aria-label="로그아웃"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
