import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, FailCandidate, UploadType, User } from '../types';
import { onboardingService } from '../services/onboardingService';

interface UseAppOnboardingActionsParams {
  state: Pick<AppState, 'currentView' | 'dashboardTab' | 'user'>;
  isHospitalAdmin: boolean;
  firstIncompleteStep: number | null;
  handleSaveSettings: () => boolean;
  handleFileUpload: (file: File, uploadType: UploadType, sizeCorrections?: Map<string, string>) => Promise<boolean>;
  loadHospitalData: (user: User) => Promise<void>;
  setState: Dispatch<SetStateAction<AppState>>;
  setPendingFailCandidates: (value: FailCandidate[]) => void;
  setOnboardingDismissed: (value: boolean) => void;
  setForcedOnboardingStep: (value: number | null) => void;
  setAutoOpenBaseStockEdit: (value: boolean) => void;
  setAutoOpenFailBulkModal: (value: boolean) => void;
  setShowOnboardingComplete: (value: boolean) => void;
}

export function useAppOnboardingActions({
  state,
  isHospitalAdmin,
  firstIncompleteStep,
  handleSaveSettings,
  handleFileUpload,
  loadHospitalData,
  setState,
  setPendingFailCandidates,
  setOnboardingDismissed,
  setForcedOnboardingStep,
  setAutoOpenBaseStockEdit,
  setAutoOpenFailBulkModal,
  setShowOnboardingComplete,
}: UseAppOnboardingActionsParams) {
  const handleSaveSettingsAndProceed = useCallback((): boolean => {
    const saved = handleSaveSettings();
    if (!saved) return false;
    if (state.currentView !== 'dashboard') return true;
    if (state.dashboardTab !== 'fixture_edit') return true;
    if (!state.user?.hospitalId) return true;
    if (!isHospitalAdmin) return true;
    if (firstIncompleteStep !== 5 && firstIncompleteStep !== 6) return true;
    onboardingService.markFixtureSaved(state.user.hospitalId);
    onboardingService.clearDismissed(state.user.hospitalId);
    setOnboardingDismissed(false);
    setForcedOnboardingStep(6);
    setState(prev => ({ ...prev, dashboardTab: 'overview' }));
    return true;
  }, [
    firstIncompleteStep,
    handleSaveSettings,
    isHospitalAdmin,
    setForcedOnboardingStep,
    setOnboardingDismissed,
    setState,
    state.currentView,
    state.dashboardTab,
    state.user?.hospitalId,
  ]);

  const handleFixtureInventoryApplied = useCallback(() => {
    const hid = state.user?.hospitalId ?? '';
    if (hid) {
      onboardingService.markWelcomeSeen(hid);
      onboardingService.markFixtureDownloaded(hid);
      onboardingService.markFixtureSaved(hid);
      onboardingService.clearDismissed(hid);
    }
    setOnboardingDismissed(false);
    setForcedOnboardingStep(6);
    setState(prev => ({ ...prev, dashboardTab: 'overview' }));
  }, [setForcedOnboardingStep, setOnboardingDismissed, setState, state.user?.hospitalId]);

  const handleFailDetectionClose = useCallback(() => {
    setPendingFailCandidates([]);
    if (firstIncompleteStep !== null) {
      const hid = state.user?.hospitalId ?? '';
      if (hid) onboardingService.clearDismissed(hid);
      setOnboardingDismissed(false);
      setForcedOnboardingStep(firstIncompleteStep);
    }
  }, [
    firstIncompleteStep,
    setForcedOnboardingStep,
    setOnboardingDismissed,
    setPendingFailCandidates,
    state.user?.hospitalId,
  ]);

  const handleBaseStockEditApplied = useCallback(() => {
    const hid = state.user?.hospitalId ?? '';
    onboardingService.markInventoryAuditSeen(hid);
    onboardingService.clearDismissed(hid);
    setOnboardingDismissed(false);
    setAutoOpenBaseStockEdit(false);
    setForcedOnboardingStep(7);
    setState(prev => ({ ...prev, dashboardTab: 'overview' }));
  }, [
    setAutoOpenBaseStockEdit,
    setForcedOnboardingStep,
    setOnboardingDismissed,
    setState,
    state.user?.hospitalId,
  ]);

  const handleAuditSessionComplete = useCallback(() => {
    const hid = state.user?.hospitalId ?? '';
    onboardingService.markInventoryAuditSeen(hid);
    if (!onboardingService.isFailAuditDone(hid)) {
      onboardingService.clearDismissed(hid);
      setOnboardingDismissed(false);
      setForcedOnboardingStep(7);
      setState(prev => ({ ...prev, dashboardTab: 'overview' }));
    }
  }, [setForcedOnboardingStep, setOnboardingDismissed, setState, state.user?.hospitalId]);

  const handleFailAuditDone = useCallback(() => {
    const user = state.user;
    const hid = user?.hospitalId ?? '';
    const wasAlreadyDone = onboardingService.isFailAuditDone(hid);
    onboardingService.markFailAuditDone(hid);
    if (!wasAlreadyDone) setShowOnboardingComplete(true);
    if (user) void loadHospitalData(user);
  }, [loadHospitalData, setShowOnboardingComplete, state.user]);

  const handleResumeOnboarding = useCallback(() => {
    if (firstIncompleteStep == null) return;
    const hid = state.user?.hospitalId ?? '';
    onboardingService.clearDismissed(hid);
    setOnboardingDismissed(false);
    setForcedOnboardingStep(firstIncompleteStep);
  }, [firstIncompleteStep, setForcedOnboardingStep, setOnboardingDismissed, state.user?.hospitalId]);

  const handleOnboardingSkip = useCallback((snooze: boolean) => {
    if (state.user?.hospitalId) {
      onboardingService.markDismissed(state.user.hospitalId);
      if (snooze) onboardingService.snoozeUntilTomorrow(state.user.hospitalId);
    }
    setForcedOnboardingStep(null);
    setOnboardingDismissed(true);
  }, [setForcedOnboardingStep, setOnboardingDismissed, state.user?.hospitalId]);

  const handleReopenOnboarding = useCallback(() => {
    if (state.user?.hospitalId) {
      onboardingService.clearDismissed(state.user.hospitalId);
      onboardingService.clearSnooze(state.user.hospitalId);
    }
    setForcedOnboardingStep(null);
    setOnboardingDismissed(false);
    setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'overview' }));
  }, [setForcedOnboardingStep, setOnboardingDismissed, setState, state.user?.hospitalId]);

  const handleGoToDataSetup = useCallback((file?: File, sizeCorrections?: Map<string, string>) => {
    if (file) {
      const hid = state.user?.hospitalId;
      setState(prev => ({ ...prev, currentView: 'dashboard' }));
      void handleFileUpload(file, 'fixture', sizeCorrections).then(ok => {
        if (ok && hid) onboardingService.markFixtureSaved(hid);
      });
      return;
    }
    setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'fixture_upload' }));
  }, [handleFileUpload, setState, state.user?.hospitalId]);

  const handleGoToSurgeryUpload = useCallback(async (file?: File) => {
    if (file) {
      setState(prev => ({ ...prev, currentView: 'dashboard' }));
      return await handleFileUpload(file, 'surgery');
    }
    setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'surgery_database' }));
    return false;
  }, [handleFileUpload, setState]);

  const handleGoToInventoryAudit = useCallback(() => {
    setForcedOnboardingStep(null);
    setAutoOpenBaseStockEdit(true);
    setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'inventory_master' }));
  }, [setAutoOpenBaseStockEdit, setForcedOnboardingStep, setState]);

  const handleGoToFailManagement = useCallback(() => {
    setForcedOnboardingStep(null);
    setAutoOpenFailBulkModal(true);
    setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'fail_management' }));
  }, [setAutoOpenFailBulkModal, setForcedOnboardingStep, setState]);

  const handleOnboardingCompleteClose = useCallback(() => {
    setShowOnboardingComplete(false);
    setState(prev => ({ ...prev, dashboardTab: 'overview' }));
  }, [setShowOnboardingComplete, setState]);

  return {
    handleSaveSettingsAndProceed,
    handleFixtureInventoryApplied,
    handleFailDetectionClose,
    handleBaseStockEditApplied,
    handleAuditSessionComplete,
    handleFailAuditDone,
    handleResumeOnboarding: firstIncompleteStep != null ? handleResumeOnboarding : undefined,
    handleOnboardingSkip,
    handleReopenOnboarding,
    handleGoToDataSetup,
    handleGoToSurgeryUpload,
    handleGoToInventoryAudit,
    handleGoToFailManagement,
    handleOnboardingCompleteClose,
  };
}
