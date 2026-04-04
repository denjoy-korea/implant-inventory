import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AppDashboardRouteSection from '@/components/app/AppDashboardRouteSection';
import type { AppState } from '@/types';
import type { DashboardWorkspaceSectionProps } from '@/components/app/DashboardWorkspaceSection';

const baseState: AppState = {
  fixtureData: null,
  surgeryData: null,
  fixtureFileName: null,
  surgeryFileName: null,
  inventory: [],
  orders: [],
  surgeryMaster: {},
  activeSurgerySheetName: '수술기록지',
  selectedFixtureIndices: {},
  selectedSurgeryIndices: {},
  isLoading: false,
  user: null,
  currentView: 'dashboard',
  dashboardTab: 'overview',
  isFixtureLengthExtracted: false,
  fixtureBackup: null,
  showProfile: false,
  adminViewMode: 'user',
  planState: null,
  memberCount: 0,
  hospitalName: '테스트 병원',
  hospitalMasterAdminId: '',
  hospitalWorkDays: [],
  hospitalBillingProgram: null,
  hospitalBizFileUrl: null,
};

const workspaceProps = {
  onOpenProfilePlan: vi.fn(),
} as unknown as Omit<DashboardWorkspaceSectionProps, 'state' | 'setState'>;

function renderDashboardRoute(
  overrides: Partial<React.ComponentProps<typeof AppDashboardRouteSection>> = {},
) {
  return renderToStaticMarkup(
    React.createElement(AppDashboardRouteSection, {
      state: baseState,
      setState: vi.fn(),
      loadHospitalData: vi.fn(async () => undefined),
      handleSignOut: vi.fn(async () => undefined),
      suspenseFallback: React.createElement('div', null, 'loading'),
      dashboardHeaderRef: { current: null },
      fixtureFileRef: { current: null },
      surgeryFileRef: { current: null },
      isSystemAdmin: false,
      isHospitalMaster: true,
      isUltimatePlan: false,
      effectivePlan: 'free',
      effectiveAccessRole: 'master',
      requiresBillingProgramSetup: false,
      showMobileDashboardNav: false,
      setIsMobileMenuOpen: vi.fn(),
      mobileOrderNav: 'order',
      setMobileOrderNav: vi.fn(),
      mobilePrimaryTabs: ['overview', 'inventory_master', 'order_management'],
      processingInvite: false,
      handleFileUpload: vi.fn(async () => true),
      setShowAuditHistory: vi.fn(),
      billingProgramSaving: false,
      billingProgramError: '',
      handleSelectBillingProgram: vi.fn(async () => undefined),
      handleRefreshBillingProgram: vi.fn(async () => undefined),
      billableItemCount: 0,
      workspaceProps,
      onOpenSupportChat: vi.fn(),
      ...overrides,
    }),
  );
}

describe('AppDashboardRouteSection', () => {
  it('청구프로그램 설정이 필요하면 게이트 화면을 우선 렌더한다', () => {
    const html = renderDashboardRoute({
      requiresBillingProgramSetup: true,
    });

    expect(html).toContain('Workspace Setup');
    expect(html).toContain('청구프로그램 선택 후 워크스페이스를 시작합니다');
    expect(html).toContain('선택 후 워크스페이스 시작');
  });

  it('초대 처리 중이면 대시보드 대신 진행 상태를 렌더한다', () => {
    const html = renderDashboardRoute({
      processingInvite: true,
    });

    expect(html).toContain('초대를 처리하고 있습니다...');
    expect(html).toContain('대시보드');
  });
});
