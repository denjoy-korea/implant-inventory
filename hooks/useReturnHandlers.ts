import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';
import { AppState, InventoryItem, ReturnMutationResult, ReturnReason, ReturnRequest, ReturnStatus, User } from '../types';
import { returnService } from '../services/returnService';
import { inventoryService } from '../services/inventoryService';
import { hospitalSettingsService, StockCalcSettings } from '../services/hospitalSettingsService';
import { dbToReturnRequest } from '../services/mappers';
import { supabase } from '../services/supabaseClient';
import { getSizeMatchKey } from '../services/sizeNormalizer';

interface ReturnHandlersDeps {
  hospitalId: string | undefined;
  inventory: InventoryItem[];
  user: User | null;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  stockCalcSettingsRef: { current: StockCalcSettings };
  syncInventoryWithUsageAndOrders: () => void;
}

export function useReturnHandlers({
  hospitalId,
  inventory,
  user,
  setState,
  stockCalcSettingsRef,
  syncInventoryWithUsageAndOrders,
}: ReturnHandlersDeps) {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  // ref로 항상 최신 배열을 참조 — async callback의 stale closure 방지
  const returnRequestsRef = useRef<ReturnRequest[]>([]);
  useEffect(() => { returnRequestsRef.current = returnRequests; }, [returnRequests]);

  // hospitalId 변경 시 설정 로드 → ref 갱신 → 재계산
  useEffect(() => {
    if (!hospitalId) return;
    hospitalSettingsService.get(hospitalId).then(s => {
      if (s.stockCalcSettings) {
        stockCalcSettingsRef.current = s.stockCalcSettings;
        syncInventoryWithUsageAndOrders();
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  const loadReturnRequests = useCallback(async () => {
    const raw = await returnService.getReturnRequests();
    const mapped = raw.map(r => dbToReturnRequest(r));
    setReturnRequests(mapped);
  }, []);

  // 초기 로드 및 병원 변경 시 재로드
  useEffect(() => {
    if (hospitalId) {
      void loadReturnRequests();
    }
  }, [hospitalId, loadReturnRequests]);

  // Realtime 구독
  useEffect(() => {
    if (!hospitalId) return;

    const channel = returnService.subscribeToChanges(hospitalId, () => {
      void loadReturnRequests();
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hospitalId, loadReturnRequests]);

  const handleCreateReturn = useCallback(async (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: { brand: string; size: string; quantity: number }[];
  }) => {
    if (!hospitalId) return;

    const result = await returnService.createReturnRequest(
      {
        hospital_id: hospitalId,
        manufacturer: params.manufacturer,
        reason: params.reason,
        status: 'requested',
        requested_date: new Date().toISOString().split('T')[0],
        picked_up_date: null,
        completed_date: null,
        manager: params.manager,
        confirmed_by: null,
        memo: params.memo || null,
      },
      params.items
    );

    if (result.ok) {
      await loadReturnRequests();
      // 반품 신청 즉시 재고 차감 (보관소로 이동)
      // defective(수술후FAIL)는 차감 구조 없음 — 신청/취소 모두 재고 영향 없음
      if (params.reason === 'defective') return;
      // exchange: 수술중교환_ 가상 버킷에서 차감 (실재고 무관)
      const effectiveMfr = params.reason === 'exchange'
        ? `수술중교환_${params.manufacturer}`
        : params.manufacturer;
      for (const item of params.items) {
        if (item.brand === 'z수술후FAIL') continue; // FAIL 마커 아이템 — 차감 없음
        const sizeKey = getSizeMatchKey(item.size, effectiveMfr);
        const invItem = inventory.find(inv =>
          inv.manufacturer === effectiveMfr &&
          inv.brand === item.brand &&
          getSizeMatchKey(inv.size, inv.manufacturer) === sizeKey
        );
        if (invItem) {
          await inventoryService.adjustStock(invItem.id, -item.quantity);
          setState(prev => ({
            ...prev,
            inventory: prev.inventory.map(i =>
              i.id === invItem.id
                ? { ...i, currentStock: i.currentStock - item.quantity, stockAdjustment: i.stockAdjustment - item.quantity }
                : i
            ),
          }));
        } else {
          // 폴백: 수술중교환_ 버킷에서 총합계 차감
          const mfrItems = [...inventory]
            .filter(inv => inv.manufacturer === effectiveMfr && inv.currentStock > 0)
            .sort((a, b) => b.currentStock - a.currentStock);
          let remaining = item.quantity;
          for (const mfrItem of mfrItems) {
            if (remaining <= 0) break;
            const deduct = Math.min(remaining, mfrItem.currentStock);
            await inventoryService.adjustStock(mfrItem.id, -deduct);
            setState(prev => ({
              ...prev,
              inventory: prev.inventory.map(i =>
                i.id === mfrItem.id
                  ? { ...i, currentStock: i.currentStock - deduct, stockAdjustment: i.stockAdjustment - deduct }
                  : i
              ),
            }));
            remaining -= deduct;
          }
          if (remaining > 0) {
            console.warn(`[handleCreateReturn] 재고 부족: ${effectiveMfr} ${remaining}개 미처리`);
          }
        }
      }
    } else {
      throw new Error('반품 신청 실패');
    }
  }, [hospitalId, inventory, loadReturnRequests, setState]);

  const handleUpdateReturnStatus = useCallback(async (
    returnId: string,
    status: ReturnStatus,
    currentStatus: ReturnStatus
  ): Promise<ReturnMutationResult> => {
    const confirmedBy = status === 'completed' ? (user?.name || undefined) : undefined;
    const today = new Date().toISOString().split('T')[0];
    // 낙관적 업데이트
    setReturnRequests(prev =>
      prev.map(r => r.id === returnId ? {
        ...r,
        status,
        ...(status === 'picked_up' ? { pickedUpDate: today } : {}),
        ...(confirmedBy ? { confirmedBy } : {}),
      } : r)
    );

    const result = await returnService.updateStatus(returnId, status, currentStatus, confirmedBy);

    if (!result.ok) {
      // 롤백
      setReturnRequests(prev =>
        prev.map(r => r.id === returnId ? { ...r, status: currentStatus } : r)
      );
      if (result.reason === 'conflict') {
        await loadReturnRequests();
      }
      return result;
    }

    // 재고 조정: 반품 거절 시 복구, 거절 철회(rejected→requested) 시 재차감
    // defective(수술후FAIL)는 차감 구조 없으므로 상태 변경에도 재고 영향 없음
    // ref로 최신 배열을 참조 (낙관적 업데이트 이후 stale closure 방지)
    const returnReq = returnRequestsRef.current.find(r => r.id === returnId);
    if (returnReq && returnReq.reason !== 'defective') {
      const needsRestore = status === 'rejected';
      const needsDeduct = status === 'requested' && currentStatus === 'rejected';
      if (needsRestore || needsDeduct) {
        const delta = needsRestore ? 1 : -1;
        // exchange: 수술중교환_ 가상 버킷 조정 (실재고 무관)
        const effectiveMfr = returnReq.reason === 'exchange'
          ? `수술중교환_${returnReq.manufacturer}`
          : returnReq.manufacturer;
        for (const item of returnReq.items) {
          if (item.brand === 'z수술후FAIL') continue;
          const sizeKey = getSizeMatchKey(item.size, effectiveMfr);
          const invItem = inventory.find(inv =>
            inv.manufacturer === effectiveMfr &&
            inv.brand === item.brand &&
            getSizeMatchKey(inv.size, inv.manufacturer) === sizeKey
          );
          if (invItem) {
            await inventoryService.adjustStock(invItem.id, delta * item.quantity);
            setState(prev => ({
              ...prev,
              inventory: prev.inventory.map(i =>
                i.id === invItem.id
                  ? { ...i, currentStock: i.currentStock + delta * item.quantity, stockAdjustment: i.stockAdjustment + delta * item.quantity }
                  : i
              ),
            }));
          }
        }
      }
    }

    return result;
  }, [loadReturnRequests, returnRequests, inventory, user?.name, setState]);

  const handleCompleteReturn = useCallback(async (
    returnId: string,
    actualQties?: Record<string, number>
  ): Promise<ReturnMutationResult> => {
    if (!hospitalId) return { ok: false, reason: 'error' };

    const returnReq = returnRequestsRef.current.find(r => r.id === returnId);

    // 낙관적 업데이트 (actualReceivedQty 반영)
    setReturnRequests(prev =>
      prev.map(r => r.id === returnId ? {
        ...r,
        status: 'completed' as ReturnStatus,
        completedDate: new Date().toISOString().split('T')[0],
        items: actualQties
          ? r.items.map(item => ({
              ...item,
              actualReceivedQty: actualQties[item.id] ?? item.quantity,
            }))
          : r.items,
      } : r)
    );

    // 재고 보정: 신청 수량 > 실수령 수량이면 차이분 복구
    // defective(수술후FAIL)는 차감 구조 없으므로 보정도 없음
    if (actualQties && returnReq && returnReq.reason !== 'defective') {
      // exchange: 수술중교환_ 가상 버킷에 보정 (실재고 무관)
      const effectiveMfr = returnReq.reason === 'exchange'
        ? `수술중교환_${returnReq.manufacturer}`
        : returnReq.manufacturer;
      for (const item of returnReq.items) {
        if (item.brand === 'z수술후FAIL') continue;
        const actualQty = actualQties[item.id] ?? item.quantity;
        const diff = item.quantity - actualQty;
        if (diff > 0) {
          const sizeKey = getSizeMatchKey(item.size, effectiveMfr);
          const invItem = inventory.find(inv =>
            inv.manufacturer === effectiveMfr &&
            inv.brand === item.brand &&
            getSizeMatchKey(inv.size, inv.manufacturer) === sizeKey
          );
          if (invItem) {
            await inventoryService.adjustStock(invItem.id, diff);
            setState(prev => ({
              ...prev,
              inventory: prev.inventory.map(i =>
                i.id === invItem.id
                  ? { ...i, currentStock: i.currentStock + diff, stockAdjustment: i.stockAdjustment + diff }
                  : i
              ),
            }));
          } else {
            // 폴백: 제조사 단위 복원
            const mfrItem = [...inventory]
              .filter(inv => inv.manufacturer === effectiveMfr)
              .sort((a, b) => b.currentStock - a.currentStock)[0];
            if (mfrItem) {
              await inventoryService.adjustStock(mfrItem.id, diff);
              setState(prev => ({
                ...prev,
                inventory: prev.inventory.map(i =>
                  i.id === mfrItem.id
                    ? { ...i, currentStock: i.currentStock + diff, stockAdjustment: i.stockAdjustment + diff }
                    : i
                ),
              }));
            }
          }
        }
      }
    }

    const result = await returnService.completeReturn(returnId, hospitalId, actualQties);

    if (result.ok) {
      // 완료 후 재고 UI 갱신 (신청 시 차감 이후 상태 동기화)
      syncInventoryWithUsageAndOrders();
    } else {
      // 롤백 (재고 보정도 서버 재조회로 복구)
      await loadReturnRequests();
    }

    return result;
  }, [hospitalId, loadReturnRequests, inventory, setState, syncInventoryWithUsageAndOrders]);

  const handleDeleteReturn = useCallback(async (returnId: string) => {
    // ref로 최신 배열을 참조 — 낙관적 제거 전에 항목 확보 (stale closure 방지)
    const returnReq = returnRequestsRef.current.find(r => r.id === returnId);

    setReturnRequests(prev => prev.filter(r => r.id !== returnId));

    // 현재 실제 status를 서버에 전달 (hardcoded 'requested' 제거)
    const result = await returnService.deleteReturnRequest(returnId, returnReq?.status ?? 'requested');

    if (!result.ok) {
      await loadReturnRequests();
      throw new Error('반품 삭제 실패');
    }

    // 삭제 성공 시 재고 복구 — rejected/completed 는 이미 복구됐거나 실제 반출됐으므로 제외
    // defective(수술후FAIL)는 신청 시 차감 구조 없으므로 복구도 없음
    if (returnReq && returnReq.reason !== 'defective' && (returnReq.status === 'requested' || returnReq.status === 'picked_up')) {
      // exchange: 수술중교환_ 가상 버킷에 반환 (실재고 무관)
      const effectiveMfr = returnReq.reason === 'exchange'
        ? `수술중교환_${returnReq.manufacturer}`
        : returnReq.manufacturer;
      for (const item of returnReq.items) {
        if (item.brand === 'z수술후FAIL') continue; // FAIL 마커 아이템 — 복구 없음
        const sizeKey = getSizeMatchKey(item.size, effectiveMfr);
        const invItem = inventory.find(inv =>
          inv.manufacturer === effectiveMfr &&
          inv.brand === item.brand &&
          getSizeMatchKey(inv.size, inv.manufacturer) === sizeKey
        );
        if (invItem) {
          await inventoryService.adjustStock(invItem.id, item.quantity);
          setState(prev => ({
            ...prev,
            inventory: prev.inventory.map(i =>
              i.id === invItem.id
                ? { ...i, currentStock: i.currentStock + item.quantity, stockAdjustment: i.stockAdjustment + item.quantity }
                : i
            ),
          }));
        } else {
          // 폴백: 제조사 단위 복원
          const mfrItems = [...inventory]
            .filter(inv => inv.manufacturer === effectiveMfr)
            .sort((a, b) => b.currentStock - a.currentStock);
          let remaining = item.quantity;
          for (const mfrItem of mfrItems) {
            if (remaining <= 0) break;
            await inventoryService.adjustStock(mfrItem.id, remaining);
            setState(prev => ({
              ...prev,
              inventory: prev.inventory.map(i =>
                i.id === mfrItem.id
                  ? { ...i, currentStock: i.currentStock + remaining, stockAdjustment: i.stockAdjustment + remaining }
                  : i
              ),
            }));
            remaining = 0;
          }
        }
      }
    }
  }, [loadReturnRequests, returnRequests, inventory, setState]);

  const handleStockCalcSettingsChange = useCallback(async (settings: StockCalcSettings) => {
    if (!hospitalId) return;
    stockCalcSettingsRef.current = settings;
    syncInventoryWithUsageAndOrders();
    const current = await hospitalSettingsService.get(hospitalId);
    await hospitalSettingsService.set(hospitalId, { ...current, stockCalcSettings: settings });
  }, [hospitalId, stockCalcSettingsRef, syncInventoryWithUsageAndOrders]);

  return {
    returnRequests,
    loadReturnRequests,
    handleCreateReturn,
    handleUpdateReturnStatus,
    handleCompleteReturn,
    handleDeleteReturn,
    handleStockCalcSettingsChange,
  };
}
