import React from 'react';
import { DashboardTab, MemberPermissions, UserRole, canAccessTab } from '../../types';

interface MobileDashboardNavProps {
  mobilePrimaryTabs: DashboardTab[];
  dashboardTab: DashboardTab;
  userPermissions?: MemberPermissions | null;
  effectiveAccessRole: UserRole;
  isMoreTabActive: boolean;
  onOpenMoreMenu: () => void;
  onTabChange: (tab: DashboardTab) => void;
  getDashboardTabTitle: (tab: DashboardTab) => string;
}

const MobileDashboardNav: React.FC<MobileDashboardNavProps> = ({
  mobilePrimaryTabs,
  dashboardTab,
  userPermissions,
  effectiveAccessRole,
  isMoreTabActive,
  onOpenMoreMenu,
  onTabChange,
  getDashboardTabTitle,
}) => {
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-[230] border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 pb-[max(env(safe-area-inset-bottom),0px)]">
      <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
        {mobilePrimaryTabs.map((tab) => {
          const isBlocked = !canAccessTab(tab, userPermissions, effectiveAccessRole);
          const isActive = dashboardTab === tab;
          return (
            <button
              key={`mobile-tab-${tab}`}
              type="button"
              onClick={() => {
                if (isBlocked) return;
                onTabChange(tab);
              }}
              className={`min-h-11 rounded-xl px-2 py-1.5 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                isBlocked
                  ? 'text-slate-300 bg-slate-100'
                  : isActive
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-slate-500 hover:bg-slate-100'
              }`}
              aria-label={getDashboardTabTitle(tab)}
              title={getDashboardTabTitle(tab)}
            >
              {tab === 'overview' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
              {tab === 'inventory_master' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
              {tab === 'order_management' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
              {tab === 'fail_management' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <span className="truncate">{tab === 'inventory_master' ? '재고' : tab === 'order_management' ? '주문' : tab === 'fail_management' ? '교환' : '홈'}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenMoreMenu}
          className={`min-h-11 rounded-xl px-2 py-1.5 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
            isMoreTabActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-100'
          }`}
          aria-label="더보기 메뉴"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span>더보기</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileDashboardNav;
