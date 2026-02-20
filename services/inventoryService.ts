import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { DbInventoryItem } from '../types';
import { toCanonicalSize } from './sizeNormalizer';

export const inventoryService = {
  /** 재고 목록 조회 (RLS로 병원 자동 필터) */
  async getInventory(): Promise<DbInventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('manufacturer')
      .order('brand');

    if (error) {
      console.error('[inventoryService] Fetch failed:', error.message, error.code, error.details);
      return [];
    }
    console.log(`[inventoryService] Fetched ${data?.length ?? 0} items`);
    return data as DbInventoryItem[];
  },

  /** 재고 항목 추가 */
  async addItem(
    item: Omit<DbInventoryItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DbInventoryItem | null> {
    const normalizedItem = {
      ...item,
      size: toCanonicalSize(item.size, item.manufacturer),
    };

    // 중복 등록 사전 차단: 동일 병원/제조사/브랜드/규격이면 기존 레코드를 반환
    const { data: existing, error: existingError } = await supabase
      .from('inventory')
      .select('*')
      .eq('hospital_id', normalizedItem.hospital_id)
      .eq('manufacturer', normalizedItem.manufacturer)
      .eq('brand', normalizedItem.brand)
      .eq('size', normalizedItem.size)
      .maybeSingle();

    if (existingError) {
      console.error('[inventoryService] Duplicate pre-check failed:', existingError);
    }
    if (existing) {
      return existing as DbInventoryItem;
    }

    const { data, error } = await supabase
      .from('inventory')
      .insert(normalizedItem)
      .select()
      .single();

    if (error) {
      // UNIQUE INDEX 충돌 시(예: 동시 등록) 기존 항목을 재조회하여 반환
      if (error.code === '23505') {
        const { data: dup } = await supabase
          .from('inventory')
          .select('*')
          .eq('hospital_id', normalizedItem.hospital_id)
          .eq('manufacturer', normalizedItem.manufacturer)
          .eq('brand', normalizedItem.brand)
          .eq('size', normalizedItem.size)
          .maybeSingle();
        if (dup) return dup as DbInventoryItem;
      }
      console.error('[inventoryService] Insert failed:', error);
      return null;
    }
    return data as DbInventoryItem;
  },

  /** 재고 항목 수정 */
  async updateItem(
    id: string,
    updates: Partial<Pick<DbInventoryItem, 'initial_stock' | 'manufacturer' | 'brand' | 'size'>>
  ): Promise<DbInventoryItem | null> {
    const normalizedUpdates = { ...updates };
    if (typeof normalizedUpdates.size === 'string') {
      normalizedUpdates.size = toCanonicalSize(
        normalizedUpdates.size,
        normalizedUpdates.manufacturer || ''
      );
    }

    const { data, error } = await supabase
      .from('inventory')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[inventoryService] Update failed:', JSON.stringify(error), 'id:', id);
      return null;
    }
    return data as DbInventoryItem;
  },

  /** 재고 항목 삭제 */
  async deleteItem(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[inventoryService] Delete failed:', error);
      return false;
    }
    return true;
  },

  /** 일괄 추가 (픽스쳐 데이터 → 재고 마스터 반영) */
  async bulkInsert(
    items: Omit<DbInventoryItem, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<DbInventoryItem[]> {
    if (items.length === 0) return [];
    const normalizedItems = items.map(item => ({
      ...item,
      size: toCanonicalSize(item.size, item.manufacturer),
    }));

    const { data, error } = await supabase
      .from('inventory')
      .insert(normalizedItems)
      .select();

    if (error) {
      console.error('[inventoryService] Bulk insert failed:', error.message, error.code, error.details);
      return [];
    }
    return data as DbInventoryItem[];
  },

  /** 전체 재고 삭제 */
  async deleteAll(hospitalId: string): Promise<boolean> {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('hospital_id', hospitalId);

    if (error) {
      console.error('[inventoryService] DeleteAll failed:', error);
      return false;
    }
    return true;
  },

  /** Realtime 구독 (재고 변경 시 콜백) */
  subscribeToChanges(
    hospitalId: string,
    callback: (payload: RealtimePostgresChangesPayload<DbInventoryItem>) => void
  ) {
    return supabase
      .channel(`inventory-changes-${hospitalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `hospital_id=eq.${hospitalId}`,
      }, callback)
      .subscribe();
  },
};
