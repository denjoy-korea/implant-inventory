import { useState, useCallback } from 'react';
import { AppState, InventoryItem, PlanType, PLAN_LIMITS, User } from '../types';
import { CompareItem } from '../components/InventoryCompareModal';
import { fixIbsImplant } from '../services/mappers';
import { toCanonicalSize, isIbsImplantManufacturer } from '../services/sizeNormalizer';
import { inventoryService } from '../services/inventoryService';
import { operationLogService } from '../services/operationLogService';
import { buildInventoryDuplicateKey } from '../services/inventoryUtils';
import { isExchangePrefix } from '../services/appUtils';
import { ToastType } from './useToast';

interface UseInventoryCompareParams {
  fixtureData: AppState['fixtureData'];
  inventory: InventoryItem[];
  user: User | null;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  effectivePlan: PlanType;
  billableItemCount: number;
  showAlertToast: (msg: string, type: ToastType) => void;
  onAppliedSuccess?: () => void;
}

interface UseInventoryCompareReturn {
  inventoryCompare: { duplicates: CompareItem[]; newItems: CompareItem[] } | null;
  planLimitModal: { currentCount: number; newCount: number; maxItems: number } | null;
  handleApplyToInventory: () => void;
  handleConfirmApplyToInventory: () => Promise<void>;
  cancelInventoryCompare: () => void;
  closePlanLimitModal: () => void;
}

export function useInventoryCompare({
  fixtureData,
  inventory,
  user,
  setState,
  effectivePlan,
  billableItemCount,
  showAlertToast,
  onAppliedSuccess,
}: UseInventoryCompareParams): UseInventoryCompareReturn {
  const [planLimitModal, setPlanLimitModal] = useState<{ currentCount: number; newCount: number; maxItems: number } | null>(null);
  const [inventoryCompare, setInventoryCompare] = useState<{
    duplicates: CompareItem[];
    newItems: CompareItem[];
    fullNewItems: InventoryItem[];
  } | null>(null);

  const handleApplyToInventory = useCallback(() => {
    if (!fixtureData) return;
    const activeSheet = fixtureData.sheets[fixtureData.activeSheetName];
    if (!activeSheet || activeSheet.rows.length === 0) {
      showAlertToast('워크시트에 데이터가 없습니다.', 'error');
      return;
    }
    const allCandidates = activeSheet.rows
      .filter(row => row['사용안함'] !== true)
      .map((row, idx) => {
        const fixed = fixIbsImplant(
          String(row['제조사'] || row['Manufacturer'] || '기타'),
          String(row['브랜드'] || row['Brand'] || '기타')
        );
        const rawSize = String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || '');
        return {
          id: `sync_${Date.now()}_${idx}`,
          manufacturer: fixed.manufacturer,
          brand: fixed.brand,
          size: isIbsImplantManufacturer(fixed.manufacturer) ? rawSize : toCanonicalSize(rawSize, fixed.manufacturer),
          initialStock: 0,
          stockAdjustment: 0,
          usageCount: 0,
          currentStock: 0,
          recommendedStock: 5,
          monthlyAvgUsage: 0,
          dailyMaxUsage: 0,
        };
      });

    const duplicates: CompareItem[] = [];
    const newItems: typeof allCandidates = [];
    const existingKeys = new Set(inventory.map(inv => buildInventoryDuplicateKey(inv)));
    const pendingKeys = new Set<string>();

    allCandidates.forEach(ni => {
      const key = buildInventoryDuplicateKey(ni);
      const isDup = existingKeys.has(key) || pendingKeys.has(key);
      if (isDup) {
        duplicates.push({ manufacturer: ni.manufacturer, brand: ni.brand, size: ni.size });
      } else {
        newItems.push(ni);
        pendingKeys.add(key);
      }
    });

    // 플랜 품목 수 제한 체크 (수술중교환_ / 보험청구 제외)
    const planMaxItems = PLAN_LIMITS[effectivePlan].maxItems;
    const billableNew = newItems.filter(i => !isExchangePrefix(i.manufacturer) && i.manufacturer !== '보험청구').length;
    const totalAfterAdd = billableItemCount + billableNew;
    if (planMaxItems !== Infinity && totalAfterAdd > planMaxItems) {
      setPlanLimitModal({ currentCount: billableItemCount, newCount: billableNew, maxItems: planMaxItems });
      return;
    }

    // 비교 모달 표시
    setInventoryCompare({
      duplicates,
      newItems: newItems.map(ni => ({ manufacturer: ni.manufacturer, brand: ni.brand, size: ni.size })),
      fullNewItems: newItems,
    });
  }, [fixtureData, inventory, effectivePlan, billableItemCount, showAlertToast]);

  const handleConfirmApplyToInventory = useCallback(async () => {
    if (!inventoryCompare) return;
    const newItems: InventoryItem[] = inventoryCompare.fullNewItems;
    setInventoryCompare(null);

    if (newItems.length === 0) return;

    // DB 저장이 필요한 경우: DB 성공 후 상태 반영 (롤백 불필요)
    if (user?.hospitalId) {
      try {
        const dbItems = newItems.map((ni) => ({
          hospital_id: user!.hospitalId,
          manufacturer: ni.manufacturer,
          brand: ni.brand,
          size: ni.size,
          initial_stock: ni.initialStock,
          stock_adjustment: 0,
        }));
        const saved = await inventoryService.bulkInsert(dbItems);
        if (saved.length > 0) {
          // DB 성공 → 서버 ID가 반영된 상태로 로컬 업데이트
          const itemsWithDbId = newItems.map(item => {
            const match = saved.find(s => s.manufacturer === item.manufacturer && s.brand === item.brand && s.size === item.size);
            return match ? { ...item, id: match.id } : item;
          });
          setState(prev => ({ ...prev, inventory: [...prev.inventory, ...itemsWithDbId] }));
          showAlertToast(`${saved.length}개 품목을 재고 마스터에 반영했습니다.`, 'success');
          operationLogService.logOperation('data_processing', `재고 마스터 반영 ${saved.length}건`, { count: saved.length });
          onAppliedSuccess?.();
        } else {
          console.error('[useInventoryCompare] bulkInsert 실패: 0개 저장됨. hospitalId:', user!.hospitalId);
          showAlertToast('서버 저장 실패 — 다시 시도해주세요.', 'error');
        }
      } catch (err) {
        console.error('[useInventoryCompare] bulkInsert 예외:', err);
        showAlertToast('서버 저장 중 오류가 발생했습니다. 네트워크를 확인해주세요.', 'error');
      }
    } else {
      // 로그인 전(로컬 전용): 바로 상태에 반영
      setState(prev => ({ ...prev, inventory: [...prev.inventory, ...newItems] }));
      showAlertToast(`${newItems.length}개 품목을 재고 마스터에 반영했습니다.`, 'success');
      onAppliedSuccess?.();
    }
  }, [inventoryCompare, user, showAlertToast, setState, onAppliedSuccess]);

  const cancelInventoryCompare = useCallback(() => setInventoryCompare(null), []);
  const closePlanLimitModal = useCallback(() => setPlanLimitModal(null), []);

  return {
    inventoryCompare: inventoryCompare
      ? { duplicates: inventoryCompare.duplicates, newItems: inventoryCompare.newItems }
      : null,
    planLimitModal,
    handleApplyToInventory,
    handleConfirmApplyToInventory,
    cancelInventoryCompare,
    closePlanLimitModal,
  };
}
