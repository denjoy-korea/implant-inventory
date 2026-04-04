import React, { useRef } from 'react';
import type { AppState, PlanType } from '../types';
import { DEFAULT_STOCK_CALC_SETTINGS, type StockCalcSettings } from '../services/hospitalSettingsService';
import { useReturnHandlers } from './useReturnHandlers';
import { useOrderHandlers } from './useOrderHandlers';
import { useInventorySync } from './useInventorySync';
import { useSurgeryManualFix } from './useSurgeryManualFix';
import { useBaseStockBatch } from './useBaseStockBatch';
import { useRefreshSurgeryUsage } from './useRefreshSurgeryUsage';
import { useAppInventoryMasterState } from './useAppInventoryMasterState';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppDashboardInventoryOpsParams {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  effectivePlan: PlanType;
  showAlertToast: NotifyFn;
  showMobileDashboardNav: boolean;
  mobileOrderNav: 'order' | 'receipt';
}

export function useAppDashboardInventoryOps({
  state,
  setState,
  effectivePlan,
  showAlertToast,
  showMobileDashboardNav,
  mobileOrderNav,
}: UseAppDashboardInventoryOpsParams) {
  const { resolveManualSurgeryInput } = useSurgeryManualFix(
    state.surgeryMaster, state.inventory, state.user?.hospitalId, setState,
  );
  const { applyBaseStockBatch } = useBaseStockBatch(
    state.inventory, state.user?.hospitalId, setState, showAlertToast,
  );
  const stockCalcSettingsRef = useRef<StockCalcSettings>(DEFAULT_STOCK_CALC_SETTINGS);
  const { syncInventoryWithUsageAndOrders, computeUsageByInventoryFromRecords } = useInventorySync(
    state.surgeryMaster, state.orders, state.inventory.length, setState, stockCalcSettingsRef,
  );
  const { refreshLatestSurgeryUsage } = useRefreshSurgeryUsage(
    state.user?.hospitalId, effectivePlan, state.inventory,
    computeUsageByInventoryFromRecords, showAlertToast,
  );
  const {
    returnRequests, handleCreateReturn, handleUpdateReturnStatus,
    handleCompleteReturn, handleDeleteReturn, handleStockCalcSettingsChange,
  } = useReturnHandlers({
    hospitalId: state.user?.hospitalId,
    inventory: state.inventory,
    user: state.user,
    setState,
    stockCalcSettingsRef,
    syncInventoryWithUsageAndOrders,
  });
  const {
    handleAddOrder,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    handleCancelOrder,
    handleConfirmReceipt,
  } = useOrderHandlers({
    hospitalId: state.user?.hospitalId,
    orders: state.orders,
    inventory: state.inventory,
    surgeryMaster: state.surgeryMaster,
    user: state.user,
    setState,
    showAlertToast,
    handleCreateReturn,
  });

  const { virtualSurgeryData, surgeryUnregisteredItems } = useAppInventoryMasterState({
    surgeryMaster: state.surgeryMaster,
    inventory: state.inventory,
    fixtureData: state.fixtureData,
  });

  return {
    surgeryUnregisteredItems,
    inventoryMasterInput: {
      virtualSurgeryData,
      applyBaseStockBatch,
      refreshLatestSurgeryUsage,
      resolveManualSurgeryInput,
      onShowAlertToast: showAlertToast,
    },
    orderReturnInput: {
      returnRequests,
      orderActions: {
        onAddOrder: handleAddOrder,
        onUpdateOrderStatus: handleUpdateOrderStatus,
        onConfirmReceipt: handleConfirmReceipt,
        onCancelOrder: handleCancelOrder,
        onDeleteOrder: handleDeleteOrder,
        onCreateReturn: handleCreateReturn,
        onUpdateReturnStatus: handleUpdateReturnStatus,
        onCompleteReturn: handleCompleteReturn,
        onDeleteReturn: handleDeleteReturn,
      },
      stockCalcSettings: stockCalcSettingsRef.current,
      onStockCalcSettingsChange: handleStockCalcSettingsChange,
      orderHistoryOnly: showMobileDashboardNav && mobileOrderNav === 'receipt',
    },
  };
}
