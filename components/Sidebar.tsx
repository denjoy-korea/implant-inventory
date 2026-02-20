
import React from 'react';
import { ExcelData, DashboardTab, PlanType, PlanFeature, UserRole, MemberPermissions, canAccessTab } from '../types';
import { planService } from '../services/planService';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  fixtureData: ExcelData | null;
  surgeryData: ExcelData | null;
  surgeryUnregisteredCount?: number;
  isAdmin: boolean;
  isMaster: boolean;
  plan?: PlanType;
  hospitalName?: string;
  userRole?: UserRole;
  userPermissions?: MemberPermissions | null;
  onReturnToAdmin?: () => void;
}

/** 탭에 매핑되는 기능 식별자 (해당 기능이 없으면 잠금 아이콘 표시) */
const TAB_FEATURE_MAP: Partial<Record<DashboardTab, PlanFeature>> = {
  order_management: 'one_click_order',
  member_management: 'role_management',
  audit_log: 'audit_log',
};

const LockMenuIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const LOCKED_STYLE = 'text-amber-500/50 hover:text-amber-500/70 hover:bg-slate-800/50';

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, fixtureData, surgeryData, surgeryUnregisteredCount = 0, isAdmin, isMaster, plan = 'free', hospitalName, userRole, userPermissions, onReturnToAdmin }) => {
  const unregisteredBadgeText = surgeryUnregisteredCount > 99 ? '99+' : String(surgeryUnregisteredCount);

  const isLocked = (tab: DashboardTab): boolean => {
    const feature = TAB_FEATURE_MAP[tab];
    if (!feature) return false;
    return !planService.canAccess(plan as PlanType, feature);
  };

  /** 권한 설정에 의해 접근 차단된 탭인지 */
  const isPermBlocked = (tab: DashboardTab): boolean => {
    const effectiveRole: UserRole = isMaster ? 'master' : (userRole ?? 'dental_staff');
    return !canAccessTab(tab, userPermissions, effectiveRole);
  };

  /** 탭 버튼 클릭 처리 — 차단된 탭은 무시 */
  const handleTabClick = (tab: DashboardTab) => {
    if (isPermBlocked(tab)) return;
    onTabChange(tab);
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0 h-screen shrink-0 transition-all duration-300 z-[200] shadow-xl">
      <div className="p-6 pb-2">
        <div className="mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-900/30">
              {userRole === 'staff' ? (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate leading-tight">{hospitalName || '워크스페이스'}</p>
              {userRole === 'staff' && <p className="text-[10px] text-slate-400 font-medium">개인 워크스페이스</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-sidebar-scrollbar px-6 pb-6 space-y-8">

        {/* 그룹 0: 대시보드 오버뷰 */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Overview</h3>
          <nav className="space-y-1">
            <button
              onClick={() => handleTabClick('overview')}
              disabled={isPermBlocked('overview')}
              title={isPermBlocked('overview') ? '접근 권한이 없습니다' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                isPermBlocked('overview') ? 'opacity-30 cursor-not-allowed text-slate-500'
                : activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              {isPermBlocked('overview') ? <LockMenuIcon /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
              대시보드 홈
            </button>
          </nav>
        </div>

        {/* 그룹 1: 재고 및 수술 통계 */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Master Management</h3>
          <nav className="space-y-1">
            <button
              onClick={() => handleTabClick('inventory_master')}
              disabled={isPermBlocked('inventory_master')}
              title={isPermBlocked('inventory_master') ? '접근 권한이 없습니다' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                isPermBlocked('inventory_master') ? 'opacity-30 cursor-not-allowed text-slate-500'
                : activeTab === 'inventory_master' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              {isPermBlocked('inventory_master') ? (
                <LockMenuIcon />
              ) : surgeryUnregisteredCount > 0 ? (
                <span
                  className={`w-5 h-5 shrink-0 inline-flex items-center justify-center rounded-full text-[10px] font-black ${
                    activeTab === 'inventory_master' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {unregisteredBadgeText}
                </span>
              ) : (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              )}
              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">재고 관리 마스터</span>
            </button>
            <button
              onClick={() => handleTabClick('inventory_audit')}
              disabled={isPermBlocked('inventory_audit')}
              title={isPermBlocked('inventory_audit') ? '접근 권한이 없습니다' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                isPermBlocked('inventory_audit') ? 'opacity-30 cursor-not-allowed text-slate-500'
                : activeTab === 'inventory_audit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              {isPermBlocked('inventory_audit') ? <LockMenuIcon /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
              재고 실사
            </button>
            <button
              onClick={() => handleTabClick('order_management')}
              disabled={isPermBlocked('order_management')}
              title={isPermBlocked('order_management') ? '접근 권한이 없습니다' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                isPermBlocked('order_management') ? 'opacity-30 cursor-not-allowed text-slate-500'
                : isLocked('order_management') ? LOCKED_STYLE
                : activeTab === 'order_management' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              {(isPermBlocked('order_management') || isLocked('order_management')) ? <LockMenuIcon /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              주문 관리 마스터
            </button>
            <button
              onClick={() => handleTabClick('surgery_database')}
              disabled={isPermBlocked('surgery_database')}
              title={isPermBlocked('surgery_database') ? '접근 권한이 없습니다' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                isPermBlocked('surgery_database') ? 'opacity-30 cursor-not-allowed text-slate-500'
                : activeTab === 'surgery_database' ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              {isPermBlocked('surgery_database') ? (
                <LockMenuIcon />
              ) : surgeryUnregisteredCount > 0 ? (
                <span
                  className={`w-5 h-5 shrink-0 inline-flex items-center justify-center rounded-full text-[10px] font-black ${
                    activeTab === 'surgery_database' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {unregisteredBadgeText}
                </span>
              ) : (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              )}
              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">수술 기록 데이터베이스</span>
            </button>
            <button
              onClick={() => handleTabClick('fail_management')}
              disabled={isPermBlocked('fail_management')}
              title={isPermBlocked('fail_management') ? '접근 권한이 없습니다' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                isPermBlocked('fail_management') ? 'opacity-30 cursor-not-allowed text-slate-500'
                : activeTab === 'fail_management' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              {isPermBlocked('fail_management') ? <LockMenuIcon /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              식립 FAIL 관리
            </button>
          </nav>
        </div>

        <div className="mt-8 p-4 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">System Online</p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            All systems operational.<br />
            Real-time sync active.
          </p>
        </div>

        {/* Settings */}
        <div className="pt-6 border-t border-slate-800">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">SETTINGS</div>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${
                ['settings', 'fixture_upload', 'fixture_edit', 'member_management', 'audit_log'].includes(activeTab)
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              설정
            </button>
          </nav>
        </div>

        {/* Return to Admin Button for System Admins simulating User View */}
        {isAdmin && onReturnToAdmin && (
          <div className="mt-auto pt-4 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-2 text-center">Simulating User View</div>
              <button
                onClick={onReturnToAdmin}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-900/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                </svg>
                Return to Admin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom logo area */}
      <div className="px-6 py-4 border-t border-slate-800">
        <div className="flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <img src="/logo.png" alt="DentWeb" className="h-5 w-auto object-contain brightness-0 invert" />
          <div className="h-4 w-px bg-slate-700"></div>
          <span className="text-xs font-bold text-slate-500">DenJOY</span>
        </div>
      </div>

      <style>{`
        .custom-sidebar-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-sidebar-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-sidebar-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </aside>
  );
};

export default Sidebar;
