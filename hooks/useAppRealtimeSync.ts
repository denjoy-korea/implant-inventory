import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, ExcelRow, DbOrder } from '../types';
import { inventoryService } from '../services/inventoryService';
import { surgeryService } from '../services/surgeryService';
import { orderService } from '../services/orderService';
import { supabase } from '../services/supabaseClient';
import {
  dbToInventoryItem,
  dbToExcelRow,
  dbToOrder,
} from '../services/mappers';

interface UseAppRealtimeSyncParams {
  user: AppState['user'];
  setState: Dispatch<SetStateAction<AppState>>;
}

export function useAppRealtimeSync({
  user,
  setState,
}: UseAppRealtimeSyncParams) {
  useEffect(() => {
    if (!user?.hospitalId || (user.status !== 'active' && user.status !== 'readonly')) return;

    const hospitalId = user.hospitalId;

    const inventoryChannel = inventoryService.subscribeToChanges(hospitalId, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newItem = dbToInventoryItem(payload.new);
        setState(prev => {
          if (prev.inventory.some(item => item.id === newItem.id)) return prev;
          return { ...prev, inventory: [...prev.inventory, newItem] };
        });
      } else if (payload.eventType === 'UPDATE') {
        const updatedItem = dbToInventoryItem(payload.new);
        setState(prev => ({
          ...prev,
          inventory: prev.inventory.map(item =>
            item.id === updatedItem.id
              ? (() => {
                const deltaInitial = updatedItem.initialStock - item.initialStock;
                const deltaAdjustment = updatedItem.stockAdjustment - (item.stockAdjustment ?? 0);
                return {
                  ...item,
                  initialStock: updatedItem.initialStock,
                  stockAdjustment: updatedItem.stockAdjustment,
                  currentStock: item.currentStock + deltaInitial + deltaAdjustment,
                  manufacturer: updatedItem.manufacturer,
                  brand: updatedItem.brand,
                  size: updatedItem.size,
                };
              })()
              : item,
          ),
        }));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setState(prev => ({ ...prev, inventory: prev.inventory.filter(item => item.id !== deletedId) }));
        }
      }
    });

    const surgeryChannel = surgeryService.subscribeToChanges(hospitalId, (payload) => {
      const sheetName = '수술기록지';

      if (payload.eventType === 'INSERT') {
        dbToExcelRow(payload.new)
          .then((newRow: ExcelRow) => {
            setState(prev => {
              const existingRows = prev.surgeryMaster[sheetName] || [];
              if (existingRows.some((row: ExcelRow) => row._id === newRow._id)) return prev;
              return {
                ...prev,
                surgeryMaster: {
                  ...prev.surgeryMaster,
                  [sheetName]: [...existingRows, newRow],
                },
              };
            });
          })
          .catch((error: unknown) => {
            console.error('[useAppRealtimeSync] failed to map surgery INSERT row:', error);
          });
      } else if (payload.eventType === 'UPDATE') {
        dbToExcelRow(payload.new)
          .then((updatedRow: ExcelRow) => {
            setState(prev => {
              const existingRows = prev.surgeryMaster[sheetName] || [];
              return {
                ...prev,
                surgeryMaster: {
                  ...prev.surgeryMaster,
                  [sheetName]: existingRows.map((row: ExcelRow) => (
                    row._id === updatedRow._id ? updatedRow : row
                  )),
                },
              };
            });
          })
          .catch((error: unknown) => {
            console.error('[useAppRealtimeSync] failed to map surgery UPDATE row:', error);
          });
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setState(prev => {
            const existingRows = prev.surgeryMaster[sheetName] || [];
            return {
              ...prev,
              surgeryMaster: {
                ...prev.surgeryMaster,
                [sheetName]: existingRows.filter((row: ExcelRow) => row._id !== deletedId),
              },
            };
          });
        }
      }
    });

    const ordersChannel = orderService.subscribeToChanges(hospitalId, (payload) => {
      if (payload.eventType === 'INSERT') {
        const insertedId = (payload.new as { id?: string })?.id;
        if (!insertedId) return;

        supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', insertedId)
          .single()
          .then(({ data, error }) => {
            if (error || !data) return;
            const newOrder = dbToOrder(data as DbOrder & { order_items: [] });
            setState(prev => {
              if (prev.orders.some(order => order.id === newOrder.id)) return prev;
              return { ...prev, orders: [newOrder, ...prev.orders] };
            });
          });
      } else if (payload.eventType === 'UPDATE') {
        const updatedOrder = payload.new;
        setState(prev => ({
          ...prev,
          orders: prev.orders.map(order =>
            order.id === updatedOrder.id
              ? { ...order, status: updatedOrder.status, receivedDate: updatedOrder.received_date || undefined }
              : order,
          ),
        }));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setState(prev => ({ ...prev, orders: prev.orders.filter(order => order.id !== deletedId) }));
        }
      }
    });

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(surgeryChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [setState, user?.hospitalId, user?.status]);
}
