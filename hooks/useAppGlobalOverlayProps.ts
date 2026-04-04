import { useCallback, useMemo } from 'react';
import type { BillingCycle, PlanType } from '../types';
import type { AppGlobalOverlaysProps } from '../components/app/AppGlobalOverlays';

type GlobalOverlayPartialProps = Omit<AppGlobalOverlaysProps, 'pwaUpdateBar' | 'alertToast'>;

interface UseAppGlobalOverlayPropsParams {
  planLimitModal: GlobalOverlayPartialProps['planLimitModal'];
  confirmModal: GlobalOverlayPartialProps['confirmModal'];
  inventoryCompare: GlobalOverlayPartialProps['inventoryCompare'];
  showMobileDashboardNav: boolean;
  showMobilePublicNav: boolean;
  closePlanLimitModal: () => void;
  handleOpenDirectPayment: (plan: PlanType, billing?: BillingCycle) => void;
  setConfirmModal: (value: GlobalOverlayPartialProps['confirmModal']) => void;
  handleConfirmApplyToInventory: () => void;
  cancelInventoryCompare: () => void;
}

export function useAppGlobalOverlayProps({
  planLimitModal,
  confirmModal,
  inventoryCompare,
  showMobileDashboardNav,
  showMobilePublicNav,
  closePlanLimitModal,
  handleOpenDirectPayment,
  setConfirmModal,
  handleConfirmApplyToInventory,
  cancelInventoryCompare,
}: UseAppGlobalOverlayPropsParams): GlobalOverlayPartialProps {
  const handleUpgradePlan = useCallback((plan: PlanType, billing: BillingCycle) => {
    handleOpenDirectPayment(plan, billing);
  }, [handleOpenDirectPayment]);

  const handleCloseConfirmModal = useCallback(() => {
    setConfirmModal(null);
  }, [setConfirmModal]);

  return useMemo(() => ({
    planLimitModal,
    confirmModal,
    inventoryCompare,
    showMobileDashboardNav,
    showMobilePublicNav,
    onClosePlanLimitModal: closePlanLimitModal,
    onUpgradePlan: handleUpgradePlan,
    onCloseConfirmModal: handleCloseConfirmModal,
    onConfirmInventoryCompare: handleConfirmApplyToInventory,
    onCancelInventoryCompare: cancelInventoryCompare,
  }), [
    cancelInventoryCompare,
    closePlanLimitModal,
    confirmModal,
    handleCloseConfirmModal,
    handleConfirmApplyToInventory,
    handleUpgradePlan,
    inventoryCompare,
    planLimitModal,
    showMobileDashboardNav,
    showMobilePublicNav,
  ]);
}
