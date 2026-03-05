import { useCallback } from 'react';
import React from 'react';
import { AppState, InventoryItem } from '../types';
import { inventoryService } from '../services/inventoryService';
import { operationLogService } from '../services/operationLogService';
import { supabase } from '../services/supabaseClient';

export function useBaseStockBatch(
  inventory: InventoryItem[],
  hospitalId: string | undefined,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  showAlertToast: (msg: string, type: 'success' | 'error') => void,
) {
  const applyBaseStockBatch = useCallback(async (changes: Array<{ id: string; initialStock: number; nextCurrentStock: number }>) => {
    if (changes.length === 0) return;

    const prevInventory = inventory;
    const changeMap = new Map(changes.map(change => [change.id, change]));

    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => {
        const change = changeMap.get(item.id);
        if (!change) return item;
        return {
          ...item,
          initialStock: change.initialStock,
          currentStock: change.nextCurrentStock,
        };
      }),
    }));

    try {
      // 단일 RPC 호출로 일괄 업데이트 (개별 PATCH × N → rate limit/CORS 오류 해소)
      const ok = await inventoryService.batchUpdateInitialStock(
        changes.map(c => ({ id: c.id, initialStock: c.initialStock }))
      );
      if (!ok) {
        throw new Error('batch_update_failed');
      }

      operationLogService.logOperation(
        'base_stock_edit',
        `기초재고 일괄 수정 (${changes.length}개)`,
        { count: changes.length }
      );

      // 실사 이력에 기초재고 편집 기록 추가 (stock_adjustment는 건드리지 않음)
      if (hospitalId) {
        const auditRows = changes.map(change => ({
          hospital_id: hospitalId,
          inventory_id: change.id,
          system_stock: change.nextCurrentStock,
          actual_stock: change.nextCurrentStock,
          difference: 0,
          reason: '기초재고 편집',
        }));
        const { error: auditError } = await supabase
          .from('inventory_audits')
          .insert(auditRows);
        if (auditError) {
          console.warn('[useBaseStockBatch] 기초재고 실사 이력 저장 실패 (무시):', auditError);
        }
      }
    } catch (error) {
      console.error('[useBaseStockBatch] 기초재고 일괄 저장 실패, 롤백:', error);
      setState(prev => ({ ...prev, inventory: prevInventory }));
      showAlertToast('기초재고 일괄 저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      throw error;
    }
  }, [inventory, hospitalId, setState, showAlertToast]);

  return { applyBaseStockBatch };
}
