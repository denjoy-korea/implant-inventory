import { supabase } from './supabaseClient';
import { operationLogService } from './operationLogService';
import type { ItemPricing, ItemPricingHistory, PricingUpsertInput } from '../types/pricing';

function toPricingKey(manufacturer: string, brand: string): string {
  return `${manufacturer}|${brand}`;
}

function mapRow(row: Record<string, unknown>): ItemPricing {
  return {
    id: row.id as string,
    hospitalId: row.hospital_id as string,
    manufacturer: row.manufacturer as string,
    brand: row.brand as string,
    purchasePrice: (row.purchase_price as number) ?? 0,
    treatmentFee: (row.treatment_fee as number) ?? 0,
    updatedBy: (row.updated_by as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapHistoryRow(row: Record<string, unknown>): ItemPricingHistory {
  return {
    id: row.id as string,
    itemPricingId: row.item_pricing_id as string,
    hospitalId: row.hospital_id as string,
    manufacturer: row.manufacturer as string,
    brand: row.brand as string,
    fieldChanged: row.field_changed as ItemPricingHistory['fieldChanged'],
    oldPurchasePrice: (row.old_purchase_price as number) ?? null,
    newPurchasePrice: (row.new_purchase_price as number) ?? null,
    oldTreatmentFee: (row.old_treatment_fee as number) ?? null,
    newTreatmentFee: (row.new_treatment_fee as number) ?? null,
    changeSource: row.change_source as ItemPricingHistory['changeSource'],
    changedBy: (row.changed_by as string) ?? null,
    changedAt: row.changed_at as string,
  };
}

export const pricingService = {
  /** 병원 전체 단가 목록 조회 */
  async getPricingList(hospitalId: string): Promise<ItemPricing[]> {
    const { data, error } = await supabase
      .from('item_pricing')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('manufacturer', { ascending: true })
      .order('brand', { ascending: true });

    if (error) {
      console.error('[pricingService] getPricingList failed:', error);
      return [];
    }
    return (data || []).map(r => mapRow(r as Record<string, unknown>));
  },

  /** 특정 브랜드 단가 조회 */
  async getPricing(
    hospitalId: string,
    manufacturer: string,
    brand: string,
  ): Promise<ItemPricing | null> {
    const { data, error } = await supabase
      .from('item_pricing')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('manufacturer', manufacturer)
      .eq('brand', brand)
      .maybeSingle();

    if (error) {
      console.error('[pricingService] getPricing failed:', error);
      return null;
    }
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  /**
   * 여러 브랜드 단가 일괄 조회 (N+1 방지)
   * 반환: Map<"manufacturer|brand", ItemPricing>
   */
  async getPricingBatch(
    hospitalId: string,
    items: Array<{ manufacturer: string; brand: string }>,
  ): Promise<Map<string, ItemPricing>> {
    if (items.length === 0) return new Map();

    const { data, error } = await supabase
      .from('item_pricing')
      .select('*')
      .eq('hospital_id', hospitalId);

    if (error) {
      console.error('[pricingService] getPricingBatch failed:', error);
      return new Map();
    }

    const map = new Map<string, ItemPricing>();
    for (const row of data || []) {
      const p = mapRow(row as Record<string, unknown>);
      map.set(toPricingKey(p.manufacturer, p.brand), p);
    }
    return map;
  },

  /**
   * 단가 upsert — 변경 이력 자동 기록
   */
  async upsertPricing(
    hospitalId: string,
    input: PricingUpsertInput,
    changeSource: 'settings' | 'receipt_confirmation' = 'settings',
  ): Promise<ItemPricing | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { manufacturer, brand, purchasePrice, treatmentFee } = input;

    const existing = await this.getPricing(hospitalId, manufacturer, brand);

    if (existing) {
      const { data, error } = await supabase
        .from('item_pricing')
        .update({
          purchase_price: purchasePrice,
          treatment_fee: treatmentFee,
          updated_by: user.id,
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();

      if (error || !data) {
        console.error('[pricingService] update failed:', error);
        return null;
      }

      const ppChanged = purchasePrice !== existing.purchasePrice;
      const tfChanged = treatmentFee !== existing.treatmentFee;
      let fieldChanged: ItemPricingHistory['fieldChanged'] = 'both';
      if (ppChanged && !tfChanged) fieldChanged = 'purchase_price';
      else if (!ppChanged && tfChanged) fieldChanged = 'treatment_fee';

      if (ppChanged || tfChanged) {
        await supabase.from('item_pricing_history').insert({
          item_pricing_id: existing.id,
          hospital_id: hospitalId,
          manufacturer,
          brand,
          field_changed: fieldChanged,
          old_purchase_price: existing.purchasePrice,
          new_purchase_price: purchasePrice,
          old_treatment_fee: existing.treatmentFee,
          new_treatment_fee: treatmentFee,
          change_source: changeSource,
          changed_by: user.id,
        });

        operationLogService.logOperation(
          'pricing_update',
          `단가 수정: ${manufacturer} ${brand}`,
          { manufacturer, brand, changeSource, fieldChanged },
        );
      }

      return mapRow(data as Record<string, unknown>);
    } else {
      const { data, error } = await supabase
        .from('item_pricing')
        .insert({
          hospital_id: hospitalId,
          manufacturer,
          brand,
          purchase_price: purchasePrice,
          treatment_fee: treatmentFee,
          updated_by: user.id,
        })
        .select()
        .maybeSingle();

      if (error || !data) {
        console.error('[pricingService] insert failed:', error);
        return null;
      }

      const inserted = mapRow(data as Record<string, unknown>);

      await supabase.from('item_pricing_history').insert({
        item_pricing_id: inserted.id,
        hospital_id: hospitalId,
        manufacturer,
        brand,
        field_changed: 'initial',
        old_purchase_price: null,
        new_purchase_price: purchasePrice,
        old_treatment_fee: null,
        new_treatment_fee: treatmentFee,
        change_source: changeSource,
        changed_by: user.id,
      });

      operationLogService.logOperation(
        'pricing_update',
        `단가 등록: ${manufacturer} ${brand}`,
        { manufacturer, brand, changeSource },
      );

      return inserted;
    }
  },

  /** 특정 브랜드의 변경 이력 조회 */
  async getPricingHistory(
    hospitalId: string,
    manufacturer: string,
    brand: string,
  ): Promise<ItemPricingHistory[]> {
    const { data, error } = await supabase
      .from('item_pricing_history')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('manufacturer', manufacturer)
      .eq('brand', brand)
      .order('changed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[pricingService] getPricingHistory failed:', error);
      return [];
    }
    return (data || []).map(r => mapHistoryRow(r as Record<string, unknown>));
  },

  /** 단가 이력 삭제 */
  async deletePricingHistory(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('item_pricing_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[pricingService] deletePricingHistory failed:', error);
      return false;
    }
    return true;
  },

  /** 단가 삭제 */
  async deletePricing(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('item_pricing')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[pricingService] delete failed:', error);
      return false;
    }
    return true;
  },
};

export { toPricingKey };
