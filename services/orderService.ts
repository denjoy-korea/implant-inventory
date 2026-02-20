import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { DbOrder, DbOrderItem, OrderStatus } from '../types';
import { toCanonicalSize } from './sizeNormalizer';

export type OrderMutationResult =
  | { ok: true }
  | { ok: false; reason: 'conflict' | 'not_found' | 'error'; currentStatus?: OrderStatus };

interface UpdateOrderStatusOptions {
  expectedCurrentStatus?: OrderStatus;
  receivedDate?: string;
}

interface DeleteOrderOptions {
  expectedCurrentStatus?: OrderStatus;
}

async function getOrderStatusById(orderId: string): Promise<{ status: OrderStatus | null; errored: boolean }> {
  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('[orderService] Status lookup failed:', error);
    return { status: null, errored: true };
  }

  return {
    status: (data?.status as OrderStatus | undefined) ?? null,
    errored: false,
  };
}

export const orderService = {
  /** 주문 목록 조회 (order_items JOIN) */
  async getOrders(): Promise<(DbOrder & { order_items: DbOrderItem[] })[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[orderService] Fetch failed:', error);
      return [];
    }
    return data as (DbOrder & { order_items: DbOrderItem[] })[];
  },

  /** 주문 생성 (order + items) */
  async createOrder(
    order: Omit<DbOrder, 'id' | 'created_at'>,
    items: Omit<DbOrderItem, 'id' | 'order_id'>[]
  ): Promise<(DbOrder & { order_items: DbOrderItem[] }) | null> {
    const normalizedItems = items.map(item => ({
      ...item,
      size: toCanonicalSize(item.size, order.manufacturer),
    }));

    // 0. 트랜잭션 RPC 우선 시도 (order + order_items 원자적 생성)
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_order_with_items', {
      p_order: order,
      p_items: normalizedItems,
    });

    if (!rpcError) {
      const created = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (created?.id) {
        const { data: fullOrder, error: fullOrderError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', created.id)
          .single();

        if (!fullOrderError && fullOrder) {
          return fullOrder as DbOrder & { order_items: DbOrderItem[] };
        }
      }
    } else if (rpcError.code !== 'PGRST202') {
      console.error('[orderService] create_order_with_items failed:', rpcError);
      return null;
    }

    // RPC가 없는 이전 스키마 호환: 기존 순차 생성 방식 폴백
    // 1. order 생성
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();

    if (orderError || !orderData) {
      console.error('[orderService] Order insert failed:', orderError);
      return null;
    }

    // 2. order_items 생성
    const orderItems = normalizedItems.map(item => ({
      ...item,
      order_id: orderData.id,
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error('[orderService] Items insert failed:', itemsError);
      // 주문은 생성됨, items만 실패 - items 없이 반환
    }

    return {
      ...orderData,
      order_items: (itemsData || []) as DbOrderItem[],
    } as DbOrder & { order_items: DbOrderItem[] };
  },

  /** 주문 상태 변경 (ordered → received) */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    options?: UpdateOrderStatusOptions
  ): Promise<OrderMutationResult> {
    const expectedCurrentStatus = options?.expectedCurrentStatus;
    const updates: Record<string, string | null> = {
      status,
      received_date: status === 'received'
        ? (options?.receivedDate || new Date().toISOString().split('T')[0])
        : null,
    };

    let query = supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (expectedCurrentStatus) {
      query = query.eq('status', expectedCurrentStatus);
    }

    const { data, error } = await query
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[orderService] Status update failed:', error);
      return { ok: false, reason: 'error' };
    }

    if (data) {
      return { ok: true };
    }

    if (!expectedCurrentStatus) {
      return { ok: false, reason: 'not_found' };
    }

    const { status: currentStatus, errored } = await getOrderStatusById(orderId);
    if (errored) {
      return { ok: false, reason: 'error' };
    }
    if (!currentStatus) {
      return { ok: false, reason: 'not_found' };
    }

    return { ok: false, reason: 'conflict', currentStatus };
  },

  /** 주문 삭제 (CASCADE로 items도 삭제) */
  async deleteOrder(orderId: string, options?: DeleteOrderOptions): Promise<OrderMutationResult> {
    const expectedCurrentStatus = options?.expectedCurrentStatus;

    let query = supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (expectedCurrentStatus) {
      query = query.eq('status', expectedCurrentStatus);
    }

    const { data, error } = await query
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[orderService] Delete failed:', error);
      return { ok: false, reason: 'error' };
    }

    if (data) {
      return { ok: true };
    }

    if (!expectedCurrentStatus) {
      return { ok: false, reason: 'not_found' };
    }

    const { status: currentStatus, errored } = await getOrderStatusById(orderId);
    if (errored) {
      return { ok: false, reason: 'error' };
    }
    if (!currentStatus) {
      return { ok: false, reason: 'not_found' };
    }

    return { ok: false, reason: 'conflict', currentStatus };
  },

  /** Realtime 구독 */
  subscribeToChanges(
    hospitalId: string,
    callback: (payload: RealtimePostgresChangesPayload<DbOrder>) => void
  ) {
    return supabase
      .channel(`orders-changes-${hospitalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `hospital_id=eq.${hospitalId}`,
      }, callback)
      .subscribe();
  },
};
