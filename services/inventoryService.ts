import { supabase } from './supabaseClient';
import { DbInventoryItem } from '../types';

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
    const { data, error } = await supabase
      .from('inventory')
      .insert(item)
      .select()
      .single();

    if (error) {
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
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
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

    const { data, error } = await supabase
      .from('inventory')
      .insert(items)
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
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('inventory-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `hospital_id=eq.${hospitalId}`,
      }, callback)
      .subscribe();
  },
};
