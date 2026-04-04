import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AppShellFrame from '@/components/app/AppShellFrame';
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
  user: {
    id: 'user-1',
    email: 'staff@example.com',
    name: '테스트 사용자',
    role: 'master',
    hospitalId: 'hospital-1',
    status: 'active',
  },
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

function renderAppShellFrame(
  overrides: Partial<React.ComponentProps<typeof AppShellFrame>> = {},
) {
  return renderToStaticMarkup(
    React.createElement(AppShellFrame, {
      state: baseState,
      setState: vi.fn(),
      loadHospitalData: vi.fn(async () => undefined),
      handleLoginSuccess: vi.fn(),
      handleSignOut: vi.fn(async () => undefined),
      showAlertToast: vi.fn(),
      suspenseFallback: React.createElement('div', null, 'loading'),
      dashboardHeaderRef: { current: null },
      fixtureFileRef: { current: null },
      surgeryFileRef: { current: null },
      isSystemAdmin: false,
      isHospitalAdmin: true,
      isHospitalMaster: true,
      isUltimatePlan: false,
      effectivePlan: 'free',
      effectiveAccessRole: 'master',
      requiresBillingProgramSetup: false,
      showDashboardSidebar: false,
      showMobileDashboardNav: false,
      isSidebarCollapsed: false,
      setIsSidebarCollapsed: vi.fn(),
      isSidebarToggleVisible: false,
      setIsSidebarToggleVisible: vi.fn(),
      isFinePointer: false,
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
      mobileOrderNav: 'order',
      setMobileOrderNav: vi.fn(),
      mobilePrimaryTabs: ['overview', 'inventory_master', 'order_management'],
      inviteInfo: null,
      processingInvite: false,
      handleFileUpload: vi.fn(async () => true),
      setShowAuditHistory: vi.fn(),
      billingProgramSaving: false,
      billingProgramError: '',
      handleSelectBillingProgram: vi.fn(async () => undefined),
      handleRefreshBillingProgram: vi.fn(async () => undefined),
      billableItemCount: 0,
      surgeryUnregisteredCount: 0,
      workspaceProps,
      onOpenSupportChat: vi.fn(),
      ...overrides,
    }),
  );
}

describe('AppShellFrame', () => {
  it('정지 계정 상태에서는 전용 정지 화면을 렌더한다', () => {
    const html = renderAppShellFrame({
      state: {
        ...baseState,
        currentView: 'suspended',
      },
    });

    expect(html).toContain('계정이 정지되었습니다');
    expect(html).toContain('운영팀 문의하기');
    expect(html).toContain('로그아웃');
  });

  it('대시보드 경로에서는 내부 라우트 섹션을 통해 게이트 화면을 렌더한다', () => {
    const html = renderAppShellFrame({
      requiresBillingProgramSetup: true,
    });

    expect(html).toContain('청구프로그램 선택 후 워크스페이스를 시작합니다');
    expect(html).toContain('선택 후 워크스페이스 시작');
  });
});
