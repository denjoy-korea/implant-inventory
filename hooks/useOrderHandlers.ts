import { useCallback } from 'react';
import React from 'react';
import { AppState, DbOrder, DbOrderItem, InventoryItem, Order, OrderStatus, User } from '../types';
import { ReceiptUpdate } from '../components/ReceiptConfirmationModal';
import { orderService } from '../services/orderService';
import { surgeryService } from '../services/surgeryService';
import { inventoryService } from '../services/inventoryService';
import { operationLogService } from '../services/operationLogService';
import { dbToOrder } from '../services/mappers';
import { supabase } from '../services/supabaseClient';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { normalizeSurgery } from '../services/normalizationService';
import { ReturnReason } from '../types';

type ToastType = 'success' | 'error' | 'info';

interface OrderHandlersDeps {
  hospitalId: string | undefined;
  orders: Order[];
  inventory: InventoryItem[];
  surgeryMaster: AppState['surgeryMaster'];
  user: User | null;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showAlertToast: (msg: string, type: ToastType) => void;
  handleCreateReturn: (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: { brand: string; size: string; quantity: number }[];
  }) => Promise<void>;
}

export function useOrderHandlers({
  hospitalId,
  orders,
  inventory,
  surgeryMaster,
  user,
  setState,
  showAlertToast,
  handleCreateReturn,
}: OrderHandlersDeps) {
  const normalize = normalizeSurgery;

  const refreshOrdersFromServer = useCallback(async () => {
    if (!hospitalId) return false;

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('[App] 주문 목록 재동기화 실패:', error);
      return false;
    }

    const mappedOrders = (data as (DbOrder & { order_items: DbOrderItem[] })[]).map(dbToOrder);
    setState(prev => ({ ...prev, orders: mappedOrders }));
    return true;
  }, [hospitalId, setState]);

  const handleUpdateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) {
      showAlertToast('주문을 찾을 수 없습니다. 화면을 새로고침해 주세요.', 'error');
      return;
    }

    const nextReceivedDate = status === 'received'
      ? new Date().toISOString().split('T')[0]
      : undefined;
    const confirmedBy = status === 'received' ? (user?.name || undefined) : undefined;

    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId
          ? { ...o, status, receivedDate: nextReceivedDate, confirmedBy }
          : o
      )
    }));

    const result = await orderService.updateStatus(orderId, status, {
      expectedCurrentStatus: currentOrder.status,
      receivedDate: nextReceivedDate,
      confirmedBy,
    });

    if (result.ok) {
      operationLogService.logOperation('order_status_update', `주문 상태 변경: ${status}`, { orderId, status });
      return;
    }

    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId
          ? { ...o, status: currentOrder.status, receivedDate: currentOrder.receivedDate }
          : o
      )
    }));

    if (result.reason === 'conflict') {
      const latestStatusText = result.currentStatus === 'received' ? '입고완료' : '입고대기';
      showAlertToast(`다른 사용자가 이미 ${latestStatusText}로 변경했습니다. 최신 주문 목록을 다시 불러옵니다.`, 'info');
      const synced = await refreshOrdersFromServer();
      if (!synced) {
        showAlertToast('주문 목록 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    if (result.reason === 'not_found') {
      showAlertToast('주문이 이미 삭제되어 상태를 변경할 수 없습니다. 최신 주문 목록을 다시 불러옵니다.', 'info');
      const synced = await refreshOrdersFromServer();
      if (!synced) {
        showAlertToast('주문 목록 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    showAlertToast('주문 상태 변경에 실패했습니다.', 'error');
  }, [refreshOrdersFromServer, setState, showAlertToast, orders, user?.name]);

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) {
      showAlertToast('주문을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.', 'info');
      return;
    }

    const simpleNorm = (s: string) => String(s || '').trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

    setState(prev => ({
      ...prev,
      orders: prev.orders.filter(o => o.id !== orderId),
    }));

    const result = await orderService.deleteOrder(orderId, {
      expectedCurrentStatus: currentOrder.status,
    });

    if (result.ok) {
      operationLogService.logOperation('order_delete', '주문 삭제', { orderId });
      // 반품 주문 삭제 시 차감했던 재고 복원
      if (currentOrder.type === 'return') {
        for (const orderItem of currentOrder.items) {
          const qty = Number(orderItem.quantity || 0);
          if (qty <= 0) continue;
          const sizeKey = getSizeMatchKey(orderItem.size, currentOrder.manufacturer);
          const invItem = inventory.find(inv =>
            simpleNorm(inv.manufacturer) === simpleNorm(currentOrder.manufacturer) &&
            simpleNorm(inv.brand) === simpleNorm(orderItem.brand) &&
            getSizeMatchKey(inv.size, inv.manufacturer) === sizeKey
          );
          if (invItem) {
            await inventoryService.adjustStock(invItem.id, qty);
            setState(prev => ({
              ...prev,
              inventory: prev.inventory.map(i =>
                i.id === invItem.id
                  ? { ...i, currentStock: i.currentStock + qty, stockAdjustment: i.stockAdjustment + qty }
                  : i
              ),
            }));
          }
        }
      }
      return;
    }

    if (result.reason === 'not_found') {
      showAlertToast('주문이 이미 삭제되어 목록에서 제거되었습니다.', 'info');
      const synced = await refreshOrdersFromServer();
      if (!synced) {
        showAlertToast('주문 목록 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    setState(prev => {
      if (prev.orders.some(o => o.id === currentOrder.id)) return prev;
      return { ...prev, orders: [currentOrder, ...prev.orders] };
    });

    if (result.reason === 'conflict') {
      const latestStatusText = result.currentStatus === 'received' ? '입고완료' : '입고대기';
      showAlertToast(`다른 사용자가 주문 상태를 ${latestStatusText}로 변경하여 삭제가 취소되었습니다. 최신 주문 목록을 다시 불러옵니다.`, 'info');
      const synced = await refreshOrdersFromServer();
      if (!synced) {
        showAlertToast('주문 목록 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    showAlertToast('주문 삭제에 실패했습니다.', 'error');
  }, [refreshOrdersFromServer, setState, showAlertToast, orders, inventory]);

  const handleCancelOrder = useCallback(async (orderId: string, reason: string) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) {
      showAlertToast('주문을 찾을 수 없습니다.', 'info');
      return;
    }

    // 낙관적 업데이트
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId ? { ...o, status: 'cancelled', cancelledReason: reason || undefined } : o
      ),
    }));

    const result = await orderService.cancelOrder(orderId, reason);

    if (result.ok) {
      showAlertToast('발주가 취소되었습니다.', 'success');
      // 반품 주문 취소 시 차감했던 재고 복원
      if (currentOrder.type === 'return') {
        const simpleNorm = (s: string) => String(s || '').trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');
        for (const orderItem of currentOrder.items) {
          const qty = Number(orderItem.quantity || 0);
          if (qty <= 0) continue;
          const sizeKey = getSizeMatchKey(orderItem.size, currentOrder.manufacturer);
          const invItem = inventory.find(inv =>
            simpleNorm(inv.manufacturer) === simpleNorm(currentOrder.manufacturer) &&
            simpleNorm(inv.brand) === simpleNorm(orderItem.brand) &&
            getSizeMatchKey(inv.size, inv.manufacturer) === sizeKey
          );
          if (invItem) {
            await inventoryService.adjustStock(invItem.id, qty);
            setState(prev => ({
              ...prev,
              inventory: prev.inventory.map(i =>
                i.id === invItem.id
                  ? { ...i, currentStock: i.currentStock + qty, stockAdjustment: i.stockAdjustment + qty }
                  : i
              ),
            }));
          }
        }
      }
      return;
    }

    // 롤백
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId ? { ...o, status: currentOrder.status, cancelledReason: currentOrder.cancelledReason } : o
      ),
    }));

    if (result.reason === 'conflict') {
      showAlertToast('이미 상태가 변경된 발주입니다. 최신 목록을 다시 불러옵니다.', 'info');
      await refreshOrdersFromServer();
      return;
    }
    showAlertToast('발주 취소에 실패했습니다.', 'error');
  }, [refreshOrdersFromServer, setState, showAlertToast, orders, inventory]);

  const handleAddOrder = useCallback(async (order: Order) => {
    // Pre-calculate fail record IDs for Supabase update
    let failRecordIds: string[] = [];
    if (order.type === 'fail_exchange') {
      const rows = surgeryMaster['수술기록지'] || [];
      const totalToProcess = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const targetM = normalize(order.manufacturer);
      failRecordIds = rows
        .filter(row => row['구분'] === '수술중교환' && normalize(String(row['제조사'] ?? '')) === targetM)
        .sort((a, b) => String(a['날짜'] ?? '').localeCompare(String(b['날짜'] ?? '')))
        .slice(0, totalToProcess)
        .filter(r => r._id)
        .map(r => r._id as string);
    }

    const applyOrderToState = (nextOrder: Order, markFailAsExchanged: boolean) => {
      setState(prev => {
        let nextSurgeryMaster = { ...prev.surgeryMaster };
        if (nextOrder.type === 'fail_exchange' && markFailAsExchanged) {
          const sheetName = '수술기록지';
          const rows = [...(nextSurgeryMaster[sheetName] || [])];
          const totalToProcess = nextOrder.items.reduce((sum, item) => sum + item.quantity, 0);
          const targetM = normalize(nextOrder.manufacturer);
          const failIndices = rows
            .map((row, idx) => ({ row, idx }))
            .filter(({ row }) => row['구분'] === '수술중교환' && normalize(String(row['제조사'] ?? '')) === targetM)
            .sort((a, b) => String(a.row['날짜'] ?? '').localeCompare(String(b.row['날짜'] ?? '')))
            .map(item => item.idx);
          const indicesToUpdate = failIndices.slice(0, totalToProcess);
          indicesToUpdate.forEach(idx => {
            rows[idx] = { ...rows[idx], '구분': '교환완료' };
          });
          nextSurgeryMaster[sheetName] = rows;
        }
        // Realtime이 먼저 추가했을 경우 중복 방지
        const alreadyExists = prev.orders.some(o => o.id === nextOrder.id);
        return {
          ...prev,
          orders: alreadyExists ? prev.orders : [nextOrder, ...prev.orders],
          surgeryMaster: nextSurgeryMaster,
          ...(nextOrder.type === 'replenishment' ? { dashboardTab: 'order_management' as const } : {}),
        };
      });
    };

    // 비로그인/로컬 모드: 기존 동작 유지
    if (!hospitalId) {
      applyOrderToState(order, order.type === 'fail_exchange');
      return;
    }

    // 서버 모드: 저장 성공 이후에만 상태 반영 (일관성 우선)
    try {
      const created = await orderService.createOrder(
        {
          hospital_id: hospitalId,
          type: order.type,
          manufacturer: order.manufacturer,
          date: order.date,
          manager: order.manager,
          status: order.status,
          received_date: order.receivedDate || null,
          confirmed_by: order.confirmedBy || null,
          memo: order.memo || null,
          cancelled_reason: order.cancelledReason || null,
        },
        order.items.map(i => ({ brand: i.brand, size: i.size, quantity: i.quantity }))
      );

      if (!created) {
        showAlertToast('주문 저장에 실패했습니다. 다시 시도해주세요.', 'error');
        return;
      }

      let failUpdateSucceeded = true;
      if (order.type === 'fail_exchange' && failRecordIds.length > 0) {
        failUpdateSucceeded = await surgeryService.markFailExchanged(failRecordIds);
      }

      const savedOrder = dbToOrder(created);
      applyOrderToState(savedOrder, order.type === 'fail_exchange' && failUpdateSucceeded);

      operationLogService.logOperation(
        'order_create',
        `${order.type === 'fail_exchange' ? '교환' : '보충'} 주문 생성 (${order.manufacturer}, ${order.items.length}건)`,
        { type: order.type, manufacturer: order.manufacturer }
      );

      if (order.type === 'fail_exchange' && failRecordIds.length > 0 && !failUpdateSucceeded) {
        showAlertToast('주문은 저장되었지만 교환 상태 반영에 실패했습니다. 잠시 후 다시 확인해주세요.', 'error');
      }
    } catch (error) {
      console.error('[App] 주문 생성 실패:', error);
      showAlertToast('주문 생성 중 오류가 발생했습니다.', 'error');
    }
  }, [hospitalId, surgeryMaster, showAlertToast, setState, normalize]);

  const handleConfirmReceipt = useCallback(async (updates: ReceiptUpdate[], orderIdsToReceive: string[]) => {
    // 1. 수량 업데이트 및 재발주 처리
    let reorderCount = 0;
    for (const update of updates) {
      const qtyOk = await orderService.updateOrderItemQuantity(update.orderId, update.item.brand, update.item.size, update.newQuantity);
      if (!qtyOk) {
        showAlertToast('수량 업데이트에 실패했습니다. 목록을 새로고침해 주세요.', 'error');
        return;
      }
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(o =>
          o.id === update.orderId
            ? { ...o, items: o.items.map(i => i.brand === update.item.brand && i.size === update.item.size ? { ...i, quantity: update.newQuantity } : i) }
            : o
        ),
      }));

      if (update.autoReorderDeficit && update.originalQuantity > update.newQuantity) {
        const deficit = update.originalQuantity - update.newQuantity;
        const orderInfo = orders.find(o => o.id === update.orderId);
        if (orderInfo) {
          await handleAddOrder({
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            status: 'ordered',
            type: 'replenishment',
            manager: user?.name || '관리자',
            manufacturer: orderInfo.manufacturer,
            items: [{ brand: update.item.brand, size: update.item.size, quantity: deficit }]
          });
          reorderCount++;
        }
      }

      if (update.wrongDeliveryReturn) {
        const orderInfo = orders.find(o => o.id === update.orderId);
        if (orderInfo) {
          await handleCreateReturn({
            manufacturer: orderInfo.manufacturer,
            reason: 'exchange',
            manager: user?.name || '관리자',
            memo: `원 발주: ${update.item.size} -> 오배송: ${update.wrongDeliveryReturn.receivedSize}`,
            items: [{ brand: update.item.brand, size: update.wrongDeliveryReturn.receivedSize, quantity: update.wrongDeliveryReturn.quantity }]
          });
        }
      }
    }

    // 2. 전체 주문을 입고/반품 완료로 갱신
    for (const id of orderIdsToReceive) {
      await handleUpdateOrderStatus(id, 'received');
    }

    // 3. 반품 완료 주문의 재고 차감 처리
    const returnOrderIds = orderIdsToReceive.filter(id => {
      const order = orders.find(o => o.id === id);
      return order && order.type === 'return';
    });
    if (returnOrderIds.length > 0) {
      const simpleNorm = (s: string) => String(s || '').trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');
      for (const orderId of returnOrderIds) {
        const order = orders.find(o => o.id === orderId);
        if (!order) continue;
        for (const orderItem of order.items) {
          const matchedUpdate = updates.find(u => u.orderId === orderId && u.item.brand === orderItem.brand && u.item.size === orderItem.size);
          const qtyToDeduct = matchedUpdate ? matchedUpdate.newQuantity : orderItem.quantity;
          if (qtyToDeduct <= 0) continue;

          const sizeKey = getSizeMatchKey(orderItem.size, order.manufacturer);
          const invItem = inventory.find(inv =>
            simpleNorm(inv.manufacturer) === simpleNorm(order.manufacturer) &&
            simpleNorm(inv.brand) === simpleNorm(orderItem.brand) &&
            getSizeMatchKey(inv.size, inv.manufacturer) === sizeKey
          );
          if (invItem) {
            const adjusted = await inventoryService.adjustStock(invItem.id, -qtyToDeduct);
            if (adjusted) {
              setState(prev => ({
                ...prev,
                inventory: prev.inventory.map(item =>
                  item.id === invItem.id
                    ? { ...item, currentStock: Math.max(0, item.currentStock - qtyToDeduct), stockAdjustment: item.stockAdjustment - qtyToDeduct }
                    : item
                ),
              }));
            }
          }
        }
      }
    }

    const isReturnOrder = returnOrderIds.length > 0;
    const msg = isReturnOrder
      ? `반품 처리가 완료되었습니다. (${returnOrderIds.length}건 반품, 재고 차감 완료)`
      : updates.length > 0
        ? `상세 입고 처리가 완료되었습니다. (수정 ${updates.length}건${reorderCount > 0 ? `, 자동 재발주 ${reorderCount}건` : ''})`
        : '전체 입고 처리가 완료되었습니다.';
    showAlertToast(msg, 'success');
  }, [handleAddOrder, handleUpdateOrderStatus, handleCreateReturn, orders, inventory, user?.name, showAlertToast, setState]);

  return {
    refreshOrdersFromServer,
    handleAddOrder,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    handleCancelOrder,
    handleConfirmReceipt,
  };
}
