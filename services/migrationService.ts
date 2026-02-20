import { supabase } from './supabaseClient';
import { MigrationResult, ExcelRow, InventoryItem, Order } from '../types';
import { inventoryToDb, excelRowToDbSurgery, orderToDb } from './mappers';

export const migrationService = {
  /** localStorage 데이터 존재 여부 확인 */
  hasLocalData(hospitalId: string): boolean {
    const prefix = `hospital_${hospitalId}_`;
    return !!(
      localStorage.getItem(`${prefix}app_inventory`) ||
      localStorage.getItem(`${prefix}app_surgery_master`) ||
      localStorage.getItem(`${prefix}app_orders`)
    );
  },

  /** localStorage → Supabase 전체 마이그레이션 */
  async migrateAll(hospitalId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      inventory: { migrated: 0, errors: 0 },
      surgery: { migrated: 0, errors: 0 },
      orders: { migrated: 0, errors: 0 },
      success: false,
    };

    result.inventory = await this._migrateInventory(hospitalId);
    result.surgery = await this._migrateSurgery(hospitalId);
    result.orders = await this._migrateOrders(hospitalId);

    result.success =
      result.inventory.errors === 0 &&
      result.surgery.errors === 0 &&
      result.orders.errors === 0;

    return result;
  },

  async _migrateInventory(hospitalId: string): Promise<{ migrated: number; errors: number }> {
    const prefix = `hospital_${hospitalId}_`;
    const raw = localStorage.getItem(`${prefix}app_inventory`);
    if (!raw) return { migrated: 0, errors: 0 };

    let items: InventoryItem[];
    try {
      items = JSON.parse(raw);
    } catch (e) {
      console.error('[migration] Inventory localStorage JSON 파싱 실패:', e);
      return { migrated: 0, errors: 1 };
    }
    if (!Array.isArray(items) || items.length === 0) return { migrated: 0, errors: 0 };

    const dbItems = items.map(item => inventoryToDb(item, hospitalId));

    const { data, error } = await supabase
      .from('inventory')
      .insert(dbItems)
      .select();

    if (error) {
      console.error('[migration] Inventory failed:', error);
      return { migrated: 0, errors: items.length };
    }

    return { migrated: data?.length || 0, errors: 0 };
  },

  async _migrateSurgery(hospitalId: string): Promise<{ migrated: number; errors: number }> {
    const prefix = `hospital_${hospitalId}_`;
    const raw = localStorage.getItem(`${prefix}app_surgery_master`);
    if (!raw) return { migrated: 0, errors: 0 };

    let surgeryMaster: Record<string, ExcelRow[]>;
    try {
      surgeryMaster = JSON.parse(raw);
    } catch (e) {
      console.error('[migration] Surgery localStorage JSON 파싱 실패:', e);
      return { migrated: 0, errors: 1 };
    }
    if (!surgeryMaster || typeof surgeryMaster !== 'object') return { migrated: 0, errors: 0 };
    const rows = surgeryMaster['수술기록지'] || [];
    if (rows.length === 0) return { migrated: 0, errors: 0 };

    const dbRows = await Promise.all(rows.map(row => excelRowToDbSurgery(row, hospitalId)));

    let migrated = 0;
    let errors = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('surgery_records')
        .insert(batch)
        .select();

      if (error) {
        console.error(`[migration] Surgery batch ${i / BATCH_SIZE} failed:`, error);
        errors += batch.length;
      } else {
        migrated += data?.length || 0;
      }
    }

    return { migrated, errors };
  },

  async _migrateOrders(hospitalId: string): Promise<{ migrated: number; errors: number }> {
    const prefix = `hospital_${hospitalId}_`;
    const raw = localStorage.getItem(`${prefix}app_orders`);
    if (!raw) return { migrated: 0, errors: 0 };

    let orders: Order[];
    try {
      orders = JSON.parse(raw);
    } catch (e) {
      console.error('[migration] Orders localStorage JSON 파싱 실패:', e);
      return { migrated: 0, errors: 1 };
    }
    if (!Array.isArray(orders) || orders.length === 0) return { migrated: 0, errors: 0 };

    let migrated = 0;
    let errors = 0;

    for (const order of orders) {
      const { order: dbOrder, items: dbItems } = orderToDb(order, hospitalId);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(dbOrder)
        .select()
        .single();

      if (orderError || !orderData) {
        errors++;
        continue;
      }

      if (dbItems.length > 0) {
        const itemsWithOrderId = dbItems.map(item => ({
          ...item,
          order_id: orderData.id,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);

        if (itemsError) {
          console.error('[migration] Order items failed:', itemsError);
        }
      }

      migrated++;
    }

    return { migrated, errors };
  },

  /** 마이그레이션 후 localStorage 정리 */
  clearLocalData(hospitalId: string): void {
    const prefix = `hospital_${hospitalId}_`;
    localStorage.removeItem(`${prefix}app_inventory`);
    localStorage.removeItem(`${prefix}app_surgery_master`);
    localStorage.removeItem(`${prefix}app_orders`);
    localStorage.removeItem(`${prefix}app_fixture_data`);
  },
};
