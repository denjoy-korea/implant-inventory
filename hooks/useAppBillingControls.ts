import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, BillingCycle, BillingProgram, PlanType, User } from '../types';
import { isSystemAdminRole } from '../types';
import { hospitalService } from '../services/hospitalService';
import { planService } from '../services/planService';
import type { DirectPaymentConfig } from '../stores/paymentStore';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppBillingControlsParams {
  state: Pick<AppState, 'currentView' | 'hospitalBillingProgram' | 'planState' | 'user'>;
  setState: Dispatch<SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  showAlertToast: NotifyFn;
  directPayment: DirectPaymentConfig | null;
  setDirectPayment: (value: DirectPaymentConfig | null) => void;
  billingProgramSaving: boolean;
  setBillingProgramSaving: (value: boolean) => void;
  billingProgramError: string;
  setBillingProgramError: (value: string) => void;
}

export function useAppBillingControls({
  state,
  setState,
  loadHospitalData,
  showAlertToast,
  directPayment,
  setDirectPayment,
  billingProgramSaving,
  setBillingProgramSaving,
  billingProgramError,
  setBillingProgramError,
}: UseAppBillingControlsParams) {
  const handleOpenDirectPayment = useCallback((plan: PlanType, billing: BillingCycle = 'monthly', isRenewal = false) => {
    setDirectPayment({ plan, billing, isRenewal });
  }, [setDirectPayment]);

  const refreshPlanState = useCallback(async () => {
    const hospitalId = state.user?.hospitalId;
    if (!hospitalId) return;
    try {
      const ps = await planService.getHospitalPlan(hospitalId);
      setState(prev => ({ ...prev, planState: ps }));
    } catch {
      // silent
    }
  }, [setState, state.user?.hospitalId]);

  const handleSelectBillingProgram = useCallback(async (program: BillingProgram) => {
    if (!state.user?.hospitalId) return;
    setBillingProgramSaving(true);
    setBillingProgramError('');
    try {
      await hospitalService.updateBillingProgram(state.user.hospitalId, program);
      setState(prev => ({ ...prev, hospitalBillingProgram: program }));
      showAlertToast('청구프로그램 설정이 저장되었습니다.', 'success');
    } catch (error) {
      setBillingProgramError(error instanceof Error ? error.message : '청구프로그램 저장에 실패했습니다.');
    } finally {
      setBillingProgramSaving(false);
    }
  }, [
    setBillingProgramError,
    setBillingProgramSaving,
    setState,
    showAlertToast,
    state.user?.hospitalId,
  ]);

  const handleRefreshBillingProgram = useCallback(async () => {
    if (!state.user) return;
    setBillingProgramError('');
    await loadHospitalData(state.user);
  }, [loadHospitalData, setBillingProgramError, state.user]);

  useEffect(() => {
    const requiresBillingProgramSetup = (
      state.currentView === 'dashboard' && !!state.user?.hospitalId &&
      (state.user?.status === 'active' || state.user?.status === 'readonly') &&
      !isSystemAdminRole(state.user?.role, state.user?.email) && !state.hospitalBillingProgram
    );
    if (requiresBillingProgramSetup) return;
    if (billingProgramError) setBillingProgramError('');
    if (billingProgramSaving) setBillingProgramSaving(false);
  }, [
    billingProgramError,
    billingProgramSaving,
    setBillingProgramError,
    setBillingProgramSaving,
    state,
  ]);

  return {
    directPayment,
    setDirectPayment,
    refreshPlanState,
    billingProgramSaving,
    billingProgramError,
    handleSelectBillingProgram,
    handleRefreshBillingProgram,
    handleOpenDirectPayment,
  };
}
