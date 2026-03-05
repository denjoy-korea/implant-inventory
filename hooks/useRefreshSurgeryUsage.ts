import { useCallback } from 'react';
import { InventoryItem, PLAN_LIMITS, PlanType } from '../types';
import { surgeryService } from '../services/surgeryService';

type ComputeUsageFn = (records: Array<{
  date: string | null;
  classification: string;
  manufacturer: string | null;
  brand: string | null;
  size: string | null;
  quantity: number;
  surgery_record: string | null;
}>, inventoryItems: InventoryItem[]) => Record<string, number>;

export function useRefreshSurgeryUsage(
  hospitalId: string | undefined,
  effectivePlan: PlanType,
  inventory: InventoryItem[],
  computeUsageByInventoryFromRecords: ComputeUsageFn,
  showAlertToast: (msg: string, type: 'error') => void,
) {
  const refreshLatestSurgeryUsage = useCallback(async (): Promise<Record<string, number> | null> => {
    if (!hospitalId) return null;

    try {
      const retentionMonths = PLAN_LIMITS[effectivePlan]?.retentionMonths ?? 24;
      const effectiveMonths = Math.min(retentionMonths, 24);
      const fromDateObj = new Date();
      fromDateObj.setMonth(fromDateObj.getMonth() - effectiveMonths);
      const fromDate = fromDateObj.toISOString().split('T')[0];

      const latestRecords = await surgeryService.getSurgeryUsageRecords({ fromDate });
      const usageMap = computeUsageByInventoryFromRecords(latestRecords, inventory);
      return usageMap;
    } catch (error) {
      console.error('[useRefreshSurgeryUsage] 최신 수술기록 재조회 실패:', error);
      showAlertToast('최신 수술기록 조회에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      return null;
    }
  }, [hospitalId, effectivePlan, inventory, computeUsageByInventoryFromRecords, showAlertToast]);

  return { refreshLatestSurgeryUsage };
}
