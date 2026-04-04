import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, InventoryItem, PlanType, User } from '../types';
import type { ToastType } from './useToast';
import { useInventoryCompare } from './useInventoryCompare';
import type { ConfirmModalConfig } from '../stores/uiStore';

interface UseAppInventoryCompareFlowParams {
  fixtureData: AppState['fixtureData'];
  selectedFixtureIndices: AppState['selectedFixtureIndices'];
  inventory: InventoryItem[];
  user: User | null;
  setState: Dispatch<SetStateAction<AppState>>;
  effectivePlan: PlanType;
  billableItemCount: number;
  setConfirmModal: (value: ConfirmModalConfig | null) => void;
  showAlertToast: (message: string, type: ToastType) => void;
  onAppliedSuccess?: () => void;
}

export function useAppInventoryCompareFlow({
  fixtureData,
  selectedFixtureIndices,
  inventory,
  user,
  setState,
  effectivePlan,
  billableItemCount,
  setConfirmModal,
  showAlertToast,
  onAppliedSuccess,
}: UseAppInventoryCompareFlowParams) {
  const {
    inventoryCompare,
    planLimitModal,
    handleApplyToInventory,
    handleConfirmApplyToInventory,
    cancelInventoryCompare,
    closePlanLimitModal,
  } = useInventoryCompare({
    fixtureData,
    inventory,
    user,
    setState,
    effectivePlan,
    billableItemCount,
    showAlertToast,
    onAppliedSuccess,
  });

  const requestFixtureExcelDownload = useCallback(() => {
    if (!fixtureData) return;
    const selectedIndices = selectedFixtureIndices[fixtureData.activeSheetName] || new Set();

    setConfirmModal({
      title: '엑셀 다운로드',
      message: '현재 설정 상태로 엑셀 파일을 다운로드합니다.',
      tip: '다운로드한 파일은 덴트웹 → 환경설정 → 임플란트 픽스처 설정에서 등록하세요.',
      confirmLabel: '다운로드',
      confirmColor: 'amber',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const now = new Date();
          const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
          const { downloadExcelFile } = await import('../services/excelService');
          await downloadExcelFile(fixtureData, selectedIndices, `픽스쳐_${yyyymmdd}.xlsx`);
        } catch (error) {
          console.error('[useAppInventoryCompareFlow] Excel download failed:', error);
          showAlertToast('엑셀 다운로드 중 오류가 발생했습니다.', 'error');
        }
      },
    });
  }, [fixtureData, selectedFixtureIndices, setConfirmModal, showAlertToast]);

  const requestApplyFixtureToInventory = useCallback(() => {
    setConfirmModal({
      title: '재고 마스터 반영',
      message: '현재 설정 상태를 재고 마스터에 반영합니다.\n반영 후 수술기록 업로드 가이드로 이동합니다.',
      tip: '엑셀 다운로드를 아직 하지 않으셨다면 먼저 다운로드해주세요.',
      confirmLabel: '반영하기',
      confirmColor: 'indigo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      onConfirm: () => {
        setConfirmModal(null);
        handleApplyToInventory();
      },
    });
  }, [handleApplyToInventory, setConfirmModal]);

  return {
    inventoryCompare,
    planLimitModal,
    requestFixtureExcelDownload,
    requestApplyFixtureToInventory,
    handleConfirmApplyToInventory,
    cancelInventoryCompare,
    closePlanLimitModal,
  };
}
