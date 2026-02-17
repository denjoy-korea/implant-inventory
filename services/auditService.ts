import { supabase } from './supabaseClient';

export interface AuditEntry {
  inventoryId: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  reason: string;
}

export interface AuditHistoryItem {
  id: string;
  auditDate: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  reason: string | null;
  createdAt: string;
  manufacturer: string;
  brand: string;
  size: string;
}

export const auditService = {
  /** 실사 결과 적용: audit 이력 저장 + stock_adjustment 업데이트 */
  async applyAudit(
    hospitalId: string,
    entries: AuditEntry[]
  ): Promise<{ success: boolean; error?: string }> {
    // 1. 실사 이력 일괄 삽입
    const auditRows = entries.map(e => ({
      hospital_id: hospitalId,
      inventory_id: e.inventoryId,
      system_stock: e.systemStock,
      actual_stock: e.actualStock,
      difference: e.difference,
      reason: e.reason,
    }));

    const { error: auditError } = await supabase
      .from('inventory_audits')
      .insert(auditRows);

    if (auditError) {
      console.error('[auditService] Audit insert failed:', auditError);
      return { success: false, error: auditError.message };
    }

    // 2. 각 항목의 stock_adjustment 업데이트 (기존값 + difference)
    for (const entry of entries) {
      const { error: updateError } = await supabase.rpc('adjust_inventory_stock', {
        p_inventory_id: entry.inventoryId,
        p_adjustment: entry.difference,
      });

      if (updateError) {
        // rpc가 없으면 직접 업데이트 fallback
        const { data: current } = await supabase
          .from('inventory')
          .select('stock_adjustment')
          .eq('id', entry.inventoryId)
          .single();

        const currentAdj = current?.stock_adjustment ?? 0;

        const { error: fallbackError } = await supabase
          .from('inventory')
          .update({ stock_adjustment: currentAdj + entry.difference })
          .eq('id', entry.inventoryId);

        if (fallbackError) {
          console.error('[auditService] Stock adjustment failed:', fallbackError, entry.inventoryId);
          return { success: false, error: fallbackError.message };
        }
      }
    }

    return { success: true };
  },

  /** 실사 이력 조회 (인벤토리 정보 포함) */
  async getAuditHistory(hospitalId: string): Promise<AuditHistoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_audits')
      .select('*, inventory(manufacturer, brand, size)')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[auditService] Fetch history failed:', error);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      auditDate: row.audit_date,
      systemStock: row.system_stock,
      actualStock: row.actual_stock,
      difference: row.difference,
      reason: row.reason,
      createdAt: row.created_at,
      manufacturer: row.inventory?.manufacturer || '',
      brand: row.inventory?.brand || '',
      size: row.inventory?.size || '',
    }));
  },
};
