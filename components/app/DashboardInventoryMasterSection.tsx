import React from 'react';
import InventoryManager from '../InventoryManager';
import {
  AppState,
  ExcelData,
  InventoryItem,
  Order,
  PlanType,
  PLAN_LIMITS,
  PLAN_NAMES,
  SurgeryUnregisteredItem,
} from '../../types';
import { inventoryService } from '../../services/inventoryService';
import { operationLogService } from '../../services/operationLogService';
import { planService } from '../../services/planService';
import { fixIbsImplant } from '../../services/mappers';
import { toCanonicalSize } from '../../services/sizeNormalizer';
import { buildInventoryDuplicateKey } from '../../services/inventoryUtils';
import { isExchangePrefix, stripExchangePrefix } from '../../services/appUtils';

interface ResolveManualSurgeryInputParams {
  recordIds: string[];
  targetManufacturer: string;
  targetBrand: string;
  targetSize: string;
  verifyOnly?: boolean;
}

interface ResolveManualSurgeryInputResult {
  checked: number;
  found: number;
  applicable: number;
  alreadyFixed: number;
  updated: number;
  failed: number;
  notFound: number;
  appliedManufacturer: string;
  appliedBrand: string;
  appliedSize: string;
}

interface DashboardInventoryMasterSectionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  isReadOnly: boolean;
  effectivePlan: PlanType;
  billableItemCount: number;
  virtualSurgeryData: ExcelData | null;
  surgeryUnregisteredItems: SurgeryUnregisteredItem[];
  applyBaseStockBatch: (changes: Array<{ id: string; initialStock: number; nextCurrentStock: number }>) => Promise<void>;
  refreshLatestSurgeryUsage: () => Promise<Record<string, number> | null>;
  resolveManualSurgeryInput: (params: ResolveManualSurgeryInputParams) => Promise<ResolveManualSurgeryInputResult>;
  onAddOrder: (order: Order) => Promise<void>;
  showAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
  initialShowBaseStockEdit?: boolean;
  onBaseStockEditApplied?: () => void;
}

const DashboardInventoryMasterSection: React.FC<DashboardInventoryMasterSectionProps> = ({
  state,
  setState,
  isReadOnly,
  effectivePlan,
  billableItemCount,
  virtualSurgeryData,
  surgeryUnregisteredItems,
  applyBaseStockBatch,
  refreshLatestSurgeryUsage,
  resolveManualSurgeryInput,
  onAddOrder,
  showAlertToast,
  initialShowBaseStockEdit,
  onBaseStockEditApplied,
}) => {
  return (
    <InventoryManager
      inventory={state.inventory}
      isReadOnly={isReadOnly}
      userId={state.user?.email}
      hospitalId={state.user?.hospitalId}
      plan={effectivePlan}
      onUpdateStock={async (id, val, nextCurrentStock) => {
        const prevInventory = state.inventory;
        setState(prev => ({
          ...prev,
          inventory: prev.inventory.map(i =>
            i.id === id
              ? {
                ...i,
                initialStock: val,
                currentStock: typeof nextCurrentStock === 'number' ? nextCurrentStock : (val - i.usageCount),
              }
              : i
          ),
        }));
        try {
          await inventoryService.updateItem(id, { initial_stock: val });
          operationLogService.logOperation('base_stock_edit', `기초재고 수정 (${val}개)`, { inventoryId: id, value: val });
        } catch (error) {
          console.error('[App] 기초재고 수정 실패, 롤백:', error);
          setState(prev => ({ ...prev, inventory: prevInventory }));
          showAlertToast('기초재고 수정에 실패했습니다.', 'error');
        }
      }}
      onBulkUpdateStocks={applyBaseStockBatch}
      onDeleteInventoryItem={async (id) => {
        const delItem = state.inventory.find(i => i.id === id);
        const prevInventory = state.inventory;
        // 정규 품목 삭제 시 수술중교환_ 연동 품목도 함께 찾기
        // IBS Implant 계열은 fixIbsImplant 때문에 manufacturer/brand가 뒤바뀌어 있을 수 있으므로 양방향 매칭
        let failCounterpartId: string | null = null;
        if (delItem && !isExchangePrefix(delItem.manufacturer) && delItem.manufacturer !== '보험청구') {
          const failCounterpart = state.inventory.find(i => {
            if (!isExchangePrefix(i.manufacturer)) return false;
            const rawBase = stripExchangePrefix(i.manufacturer);
            const sizeMatch = i.size === delItem.size;
            // 일반 케이스: FAIL 제조사 베이스 = 정품목 제조사
            if (rawBase === delItem.manufacturer && i.brand === delItem.brand && sizeMatch) return true;
            // IBS Implant 역방향: FAIL 품목이 교정 전 brand명을 제조사로 가진 경우
            if (rawBase === delItem.brand && i.brand === delItem.manufacturer && sizeMatch) return true;
            return false;
          });
          if (failCounterpart) failCounterpartId = failCounterpart.id;
        }
        const idsToRemove = new Set([id, ...(failCounterpartId ? [failCounterpartId] : [])]);
        setState(prev => ({ ...prev, inventory: prev.inventory.filter(i => !idsToRemove.has(i.id)) }));
        try {
          await inventoryService.deleteItem(id);
          if (failCounterpartId) await inventoryService.deleteItem(failCounterpartId);
          operationLogService.logOperation('item_delete', `품목 삭제: ${delItem?.brand || ''} ${delItem?.size || ''}`, { inventoryId: id });
        } catch (error) {
          console.error('[App] 품목 삭제 실패, 롤백:', error);
          setState(prev => ({ ...prev, inventory: prevInventory }));
          showAlertToast('품목 삭제에 실패했습니다.', 'error');
        }
      }}
      onAddInventoryItem={async (ni) => {
        const fixed = fixIbsImplant(ni.manufacturer, ni.brand);
        const normalizedItem = {
          ...ni,
          manufacturer: fixed.manufacturer,
          brand: fixed.brand,
          size: toCanonicalSize(ni.size, fixed.manufacturer),
        };
        const incomingKey = buildInventoryDuplicateKey(normalizedItem);
        const alreadyExists = state.inventory.some(inv => buildInventoryDuplicateKey(inv) === incomingKey);
        if (alreadyExists) {
          showAlertToast('이미 등록된 제조사/브랜드/규격입니다. 중복 등록되지 않았습니다.', 'info');
          return false;
        }

        const isBillable = !isExchangePrefix(normalizedItem.manufacturer) && normalizedItem.manufacturer !== '보험청구';
        if (isBillable && !planService.canAddItem(effectivePlan, billableItemCount)) {
          const req = planService.getRequiredPlanForItems(billableItemCount + 1);
          showAlertToast(`품목 수 제한(${PLAN_LIMITS[effectivePlan].maxItems}개)에 도달했습니다. ${PLAN_NAMES[req]} 이상으로 업그레이드해 주세요.`, 'error');
          return false;
        }

        let inserted = false;
        if (state.user?.hospitalId) {
          const result = await inventoryService.addItem({
            hospital_id: state.user.hospitalId,
            manufacturer: normalizedItem.manufacturer,
            brand: normalizedItem.brand,
            size: normalizedItem.size,
            initial_stock: normalizedItem.initialStock,
            stock_adjustment: ni.stockAdjustment ?? 0,
          });

          if (!result) {
            showAlertToast('품목 추가에 실패했습니다. (중복 또는 네트워크 오류)', 'error');
            return false;
          }

          const savedItem: InventoryItem = {
            id: result.id,
            manufacturer: result.manufacturer,
            brand: result.brand,
            size: toCanonicalSize(result.size, result.manufacturer),
            initialStock: result.initial_stock,
            stockAdjustment: result.stock_adjustment ?? 0,
            usageCount: 0,
            currentStock: result.initial_stock + (result.stock_adjustment ?? 0),
            recommendedStock: 5,
            monthlyAvgUsage: 0,
            dailyMaxUsage: 0,
          };

          setState(prev => {
            const dupAfterSave = prev.inventory.some(inv => buildInventoryDuplicateKey(inv) === incomingKey);
            if (dupAfterSave) return prev;
            inserted = true;
            return { ...prev, inventory: [...prev.inventory, savedItem] };
          });
        } else {
          setState(prev => {
            const dupInLocal = prev.inventory.some(inv => buildInventoryDuplicateKey(inv) === incomingKey);
            if (dupInLocal) return prev;
            inserted = true;
            return { ...prev, inventory: [...prev.inventory, normalizedItem] };
          });
        }

        if (inserted) {
          operationLogService.logOperation('manual_item_add', `품목 수동 추가: ${normalizedItem.brand} ${normalizedItem.size}`, {
            manufacturer: normalizedItem.manufacturer,
            brand: normalizedItem.brand,
            size: normalizedItem.size,
          });
        }

        return inserted;
      }}
      onUpdateInventoryItem={async (ui) => {
        const fixed = fixIbsImplant(ui.manufacturer, ui.brand);
        const normalizedItem = {
          ...ui,
          manufacturer: fixed.manufacturer,
          brand: fixed.brand,
          size: toCanonicalSize(ui.size, fixed.manufacturer),
        };
        // stockAdjustment 변화량 계산 (반품 등으로 감소할 때 RPC로 반영)
        const currentItem = state.inventory.find(i => i.id === ui.id);
        const adjDelta = normalizedItem.stockAdjustment - (currentItem?.stockAdjustment ?? 0);
        setState(prev => ({ ...prev, inventory: prev.inventory.map(i => i.id === normalizedItem.id ? normalizedItem : i) }));
        await inventoryService.updateItem(normalizedItem.id, {
          manufacturer: normalizedItem.manufacturer,
          brand: normalizedItem.brand,
          size: normalizedItem.size,
          initial_stock: normalizedItem.initialStock,
        });
        if (adjDelta !== 0) {
          await inventoryService.adjustStock(normalizedItem.id, adjDelta);
        }
      }}
      surgeryData={virtualSurgeryData}
      unregisteredFromSurgery={surgeryUnregisteredItems}
      onRefreshLatestSurgeryUsage={refreshLatestSurgeryUsage}
      onResolveManualInput={resolveManualSurgeryInput}
      initialShowBaseStockEdit={initialShowBaseStockEdit}
      onBaseStockEditApplied={onBaseStockEditApplied}
      onQuickOrder={(item) => onAddOrder({
        id: `order_${Date.now()}`,
        type: 'replenishment',
        manufacturer: item.manufacturer,
        date: new Date().toISOString().split('T')[0],
        items: [{ brand: item.brand, size: item.size, quantity: item.recommendedStock - item.currentStock }],
        manager: state.user?.name || '관리자',
        status: 'ordered',
      })}
      onAddOrder={onAddOrder}
      managerName={state.user?.name}
    />
  );
};

export default DashboardInventoryMasterSection;
