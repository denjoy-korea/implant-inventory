import React from 'react';
import { DashboardTab, MemberPermissions, UserRole, canAccessTab } from '../../types';

interface MobileDashboardNavProps {
  mobilePrimaryTabs: DashboardTab[];
  dashboardTab: DashboardTab;
  userPermissions?: MemberPermissions | null;
  effectiveAccessRole: UserRole;
  lastOrderNav: 'order' | 'receipt';
  onTabChange: (tab: DashboardTab) => void;
  onOrderNavChange: (nav: 'order' | 'receipt') => void;
  getDashboardTabTitle: (tab: DashboardTab) => string;
}

const MobileDashboardNav: React.FC<MobileDashboardNavProps> = ({
  mobilePrimaryTabs,
  dashboardTab,
  userPermissions,
  effectiveAccessRole,
  lastOrderNav,
  onTabChange,
  onOrderNavChange,
  getDashboardTabTitle,
}) => {
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-[230] border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 pb-[max(env(safe-area-inset-bottom),0px)]">
      <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
        {mobilePrimaryTabs.map((tab) => {
          const isBlocked = !canAccessTab(tab, userPermissions, effectiveAccessRole);
          const isActive = tab === 'order_management'
            ? dashboardTab === 'order_management' && lastOrderNav === 'order'
            : dashboardTab === tab;
          return (
            <button
              key={`mobile-tab-${tab}`}
              type="button"
              onClick={() => {
                if (isBlocked) return;
                if (tab === 'order_management') onOrderNavChange('order');
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
              <span className="truncate">
                {tab === 'inventory_master' ? '재고' : tab === 'order_management' ? '주문' : '홈'}
              </span>
            </button>
          );
        })}

        {/* 수령 - 주문/반품내역 (order_management) */}
        <button
          type="button"
          onClick={() => {
            onOrderNavChange('receipt');
            onTabChange('order_management');
          }}
          className={`min-h-11 rounded-xl px-2 py-1.5 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
            dashboardTab === 'order_management' && lastOrderNav === 'receipt'
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
          aria-label="수령"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <span>수령</span>
        </button>

        {/* 실사 */}
        <button
          type="button"
          onClick={() => onTabChange('inventory_audit')}
          className={`min-h-11 rounded-xl px-2 py-1.5 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
            dashboardTab === 'inventory_audit'
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
          aria-label="실사"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>실사</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileDashboardNav;
