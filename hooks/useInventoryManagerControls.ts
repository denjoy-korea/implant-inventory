import { useCallback, useEffect, useState } from 'react';
import { planService } from '../services/planService';
import { InventoryDetailColumnKey, InventoryDetailColumnVisibility, InventoryDetailToolbarState } from '../components/inventory/inventoryTypes';
import {
  DEFAULT_INVENTORY_DETAIL_COLUMN_VISIBILITY,
  INVENTORY_DETAIL_COLUMNS,
} from '../components/inventory/inventoryDashboardConfig';

interface UseInventoryManagerControlsParams {
  hospitalId?: string;
  isUnlimited: boolean;
}

export function useInventoryManagerControls({
  hospitalId,
  isUnlimited,
}: UseInventoryManagerControlsParams) {
  const [monthFactor, setMonthFactor] = useState<number>(1);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showEditNotice, setShowEditNotice] = useState(false);
  const [showBaseStockModal, setShowBaseStockModal] = useState(false);
  const [showUnregisteredDetailModal, setShowUnregisteredDetailModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [inventoryDetailToolbarState, setInventoryDetailToolbarState] = useState<InventoryDetailToolbarState>({
    showOnlyOrderNeededRows: false,
    showColumnFilter: false,
    columnVisibility: DEFAULT_INVENTORY_DETAIL_COLUMN_VISIBILITY,
  });
  const [editCount, setEditCount] = useState(0);

  const showOnlyOrderNeededRows = inventoryDetailToolbarState.showOnlyOrderNeededRows;
  const showInventoryDetailColumnFilter = inventoryDetailToolbarState.showColumnFilter;
  const inventoryDetailColumnVisibility = inventoryDetailToolbarState.columnVisibility;

  useEffect(() => {
    if (!hospitalId || isUnlimited) return;
    planService.getBaseStockEditCount(hospitalId).then(count => {
      setEditCount(count);
    });
  }, [hospitalId, isUnlimited]);

  const setShowOnlyOrderNeededRows = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setInventoryDetailToolbarState(prev => ({
      ...prev,
      showOnlyOrderNeededRows: typeof next === 'function' ? (next as (value: boolean) => boolean)(prev.showOnlyOrderNeededRows) : next,
    }));
  }, []);

  const setShowInventoryDetailColumnFilter = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setInventoryDetailToolbarState(prev => ({
      ...prev,
      showColumnFilter: typeof next === 'function' ? (next as (value: boolean) => boolean)(prev.showColumnFilter) : next,
    }));
  }, []);

  const setInventoryDetailColumnVisibility = useCallback((
    next:
      | InventoryDetailColumnVisibility
      | ((prev: InventoryDetailColumnVisibility) => InventoryDetailColumnVisibility)
  ) => {
    setInventoryDetailToolbarState(prev => ({
      ...prev,
      columnVisibility: typeof next === 'function'
        ? (next as (value: InventoryDetailColumnVisibility) => InventoryDetailColumnVisibility)(prev.columnVisibility)
        : next,
    }));
  }, []);

  const toggleInventoryDetailColumn = useCallback((columnKey: InventoryDetailColumnKey) => {
    setInventoryDetailColumnVisibility(prev => {
      const visibleCount = INVENTORY_DETAIL_COLUMNS.reduce((count, column) => (
        prev[column.key] ? count + 1 : count
      ), 0);

      if (prev[columnKey] && visibleCount <= 1) return prev;
      return { ...prev, [columnKey]: !prev[columnKey] };
    });
  }, [setInventoryDetailColumnVisibility]);

  const handleBaseStockSaved = useCallback((serverCount: number) => {
    if (serverCount >= 0) {
      setEditCount(serverCount);
      return;
    }
    setEditCount(prev => prev + 1);
  }, []);

  const openAddItemModal = useCallback(() => {
    setIsAddingItem(true);
  }, []);

  const closeAddItemModal = useCallback(() => {
    setIsAddingItem(false);
  }, []);

  return {
    monthFactor,
    selectedManufacturer,
    isAddingItem,
    showEditNotice,
    showBaseStockModal,
    showUnregisteredDetailModal,
    showOptimizeModal,
    showOnlyOrderNeededRows,
    showInventoryDetailColumnFilter,
    inventoryDetailColumnVisibility,
    editCount,
    setMonthFactor,
    setSelectedManufacturer,
    setShowEditNotice,
    setShowBaseStockModal,
    setShowUnregisteredDetailModal,
    setShowOptimizeModal,
    setShowOnlyOrderNeededRows,
    setShowInventoryDetailColumnFilter,
    toggleInventoryDetailColumn,
    handleBaseStockSaved,
    openAddItemModal,
    closeAddItemModal,
  };
}
