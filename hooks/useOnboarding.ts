import { useEffect, useRef, useState } from 'react';
import type { DashboardTab, ExcelRow, User, HospitalPlanState } from '../types';
import { onboardingService } from '../services/onboardingService';

const ONBOARDING_STEP_PROGRESS: Record<number, number> = {
  1: 0, 2: 15, 3: 15, 4: 30, 5: 50, 6: 70, 7: 85,
};

// 온보딩 위저드를 숨기는 탭 목록
const ONBOARDING_HIDDEN_TABS = new Set<DashboardTab>([
  'fixture_upload', 'fixture_edit', 'surgery_database',
  'fail_management', 'inventory_audit', 'inventory_master',
]);

interface UseOnboardingParams {
  user: User | null;
  isLoading: boolean;
  currentView: string;
  dashboardTab: DashboardTab;
  inventoryLength: number;
  surgeryMaster: Record<string, ExcelRow[]>;
  requiresBillingProgramSetup: boolean;
  planState: HospitalPlanState | null;
}

export function useOnboarding({
  user,
  isLoading,
  currentView,
  dashboardTab,
  inventoryLength,
  surgeryMaster,
  requiresBillingProgramSetup,
}: UseOnboardingParams) {
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [forcedOnboardingStep, setForcedOnboardingStep] = useState<number | null>(null);
  const [toastCompletedLabel, setToastCompletedLabel] = useState<string | null>(null);
  const [showOnboardingComplete, setShowOnboardingComplete] = useState(false);

  const onboardingAutoResumeRef = useRef<string | null>(null);
  const prevFirstIncompleteStepRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hospitalId = user?.hospitalId ?? '';

  // localStorage 영속 상태 + 메모리 상태 합산 (새로고침/재로그인 후에도 유지)
  const effectiveDismissed =
    onboardingDismissed || (hospitalId ? onboardingService.isDismissed(hospitalId) : false);

  // 7단계 기준 첫 번째 미완료 단계 계산 (뷰/탭 조건 없이 순수 진행 상태만)
  // ⚠️ IIFE 유지 필수: onboardingService.mark*() 는 localStorage 기록이라 React deps에 포함 불가.
  //    useMemo로 바꾸면 mark* 호출 직후 재렌더 시 캐시된 이전 값을 반환해 wizard가 재등장함.
  const firstIncompleteStep = (() => {
    // Hospital-scoped onboarding only applies to users attached to a workspace.
    // System admins or transient users without hospitalId should never see it.
    if (!hospitalId) return null;
    if (requiresBillingProgramSetup) return null;
    if (user?.status !== 'active') return null;
    const hid = hospitalId;
    if (!onboardingService.isWelcomeSeen(hid)) return 1;
    if (isLoading) return null;
    if (!onboardingService.isSurgeryDownloaded(hid)) return 2;
    const hasSurgery = Object.values(surgeryMaster).some(rows => rows.length > 0);
    if (!hasSurgery) return 3;
    if (!onboardingService.isFixtureDownloaded(hid)) return 4;
    if (inventoryLength === 0) return 5;
    if (!onboardingService.isInventoryAuditSeen(hid)) return 6;
    if (!onboardingService.isFailAuditDone(hid)) return 7;
    return null;
  })();

  const onboardingStep = (() => {
    if (forcedOnboardingStep !== null) return forcedOnboardingStep;
    if (effectiveDismissed) return null;
    if (currentView !== 'dashboard') return null;
    if (ONBOARDING_HIDDEN_TABS.has(dashboardTab)) return null;
    return firstIncompleteStep;
  })();

  const shouldShowOnboarding = onboardingStep !== null;
  const showOnboardingToast =
    currentView === 'dashboard' && firstIncompleteStep !== null && !shouldShowOnboarding;
  const onboardingProgress =
    firstIncompleteStep ? (ONBOARDING_STEP_PROGRESS[firstIncompleteStep] ?? 0) : 100;

  // 스텝 전환 감지: 업로드 완료 후 토스트에 피드백
  useEffect(() => {
    const prev = prevFirstIncompleteStepRef.current;
    prevFirstIncompleteStepRef.current = firstIncompleteStep;
    let label: string | null = null;
    if (prev === 3 && firstIncompleteStep === 4 && showOnboardingToast) {
      label = '수술기록 업로드 완료';
    } else if (prev === 5 && firstIncompleteStep === 6 && showOnboardingToast) {
      label = '픽스처 저장 완료';
    }
    if (label) {
      setToastCompletedLabel(label);
      if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastCompletedLabel(null), 2500);
    }
  }, [firstIncompleteStep, showOnboardingToast]);

  // 병원/사용자 컨텍스트가 바뀌면 세션 자동 재개 상태 초기화
  useEffect(() => {
    const hid = user?.hospitalId ?? null;
    if (!hid) {
      onboardingAutoResumeRef.current = null;
      return;
    }
    if (onboardingAutoResumeRef.current && onboardingAutoResumeRef.current !== hid) {
      onboardingAutoResumeRef.current = null;
    }
  }, [user?.hospitalId]);

  // 새로고침/재로그인 후 대시보드 진입 시 미완료 온보딩 자동 재개
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    if (isLoading) return;
    if (!user?.hospitalId) return;
    if (!firstIncompleteStep) return;
    if (requiresBillingProgramSetup) return;
    if (user.status !== 'active') return;
    if (onboardingAutoResumeRef.current === user.hospitalId) return;
    if (onboardingService.isSnoozed(user.hospitalId)) return;

    onboardingAutoResumeRef.current = user.hospitalId;
    onboardingService.clearDismissed(user.hospitalId);
    setOnboardingDismissed(false);
    setForcedOnboardingStep(firstIncompleteStep);
  }, [
    firstIncompleteStep,
    requiresBillingProgramSetup,
    currentView,
    isLoading,
    user?.hospitalId,
    user?.status,
  ]);

  return {
    onboardingDismissed,
    setOnboardingDismissed,
    forcedOnboardingStep,
    setForcedOnboardingStep,
    toastCompletedLabel,
    showOnboardingComplete,
    setShowOnboardingComplete,
    firstIncompleteStep,
    onboardingStep,
    shouldShowOnboarding,
    showOnboardingToast,
    onboardingProgress,
  };
}
