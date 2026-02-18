import {
  DbInventoryItem,
  DbSurgeryRecord,
  DbOrder,
  DbOrderItem,
  DbHospital,
  DbProfile,
  InventoryItem,
  ExcelRow,
  Order,
  Hospital,
  User,
  OrderType,
  OrderStatus,
} from '../types';
import { encryptPatientInfo, decryptPatientInfo, hashPatientInfo } from './cryptoUtils';

// ============================================
// DB → Frontend 변환
// ============================================

/** DbInventoryItem → InventoryItem (계산 필드 초기값 포함) */
export function dbToInventoryItem(db: DbInventoryItem): InventoryItem {
  const adj = db.stock_adjustment ?? 0;
  return {
    id: db.id,
    manufacturer: db.manufacturer,
    brand: db.brand,
    size: db.size,
    initialStock: db.initial_stock,
    stockAdjustment: adj,
    usageCount: 0,
    currentStock: db.initial_stock + adj,
    recommendedStock: 0,
  };
}

/** DbSurgeryRecord → ExcelRow (기존 수술기록지 포맷 호환) */
export async function dbToExcelRow(db: DbSurgeryRecord): Promise<ExcelRow> {
  return {
    '날짜': db.date || '',
    '환자정보': await decryptPatientInfo(db.patient_info || ''),
    '치아번호': db.tooth_number || '',
    '갯수': db.quantity,
    '수술기록': db.surgery_record || '',
    '구분': db.classification,
    '제조사': db.manufacturer || '',
    '브랜드': db.brand || '',
    '규격(SIZE)': db.size || '',
    '골질': db.bone_quality || '',
    '초기고정': db.initial_fixation || '',
    _id: db.id,
  };
}

/** DbOrder + DbOrderItem[] → Order */
export function dbToOrder(db: DbOrder & { order_items: DbOrderItem[] }): Order {
  return {
    id: db.id,
    type: db.type as OrderType,
    manufacturer: db.manufacturer,
    date: db.date,
    items: (db.order_items || []).map(i => ({
      brand: i.brand,
      size: i.size,
      quantity: i.quantity,
    })),
    manager: db.manager,
    status: db.status as OrderStatus,
    receivedDate: db.received_date || undefined,
  };
}

/** DbHospital → Hospital */
export function dbToHospital(db: DbHospital): Hospital {
  return {
    id: db.id,
    name: db.name,
    masterAdminId: db.master_admin_id || '',
    createdAt: db.created_at,
  };
}

/** DbProfile → User */
export function dbToUser(db: DbProfile): User {
  return {
    email: db.email,
    name: db.name,
    phone: db.phone,
    role: db.role,
    hospitalId: db.hospital_id || '',
    status: db.status,
  };
}

// ============================================
// Frontend → DB 변환
// ============================================

/** InventoryItem → DbInventoryItem INSERT용 */
export function inventoryToDb(
  item: InventoryItem,
  hospitalId: string
): Omit<DbInventoryItem, 'id' | 'created_at' | 'updated_at'> {
  return {
    hospital_id: hospitalId,
    manufacturer: item.manufacturer,
    brand: item.brand,
    size: item.size,
    initial_stock: item.initialStock,
    stock_adjustment: item.stockAdjustment ?? 0,
  };
}

/** ExcelRow → DbSurgeryRecord INSERT용 */
export async function excelRowToDbSurgery(
  row: ExcelRow,
  hospitalId: string
): Promise<Omit<DbSurgeryRecord, 'id' | 'created_at'>> {
  const patientRaw = row['환자정보'] ? String(row['환자정보']) : '';
  return {
    hospital_id: hospitalId,
    date: row['날짜'] || null,
    patient_info: patientRaw ? await encryptPatientInfo(patientRaw) : null,
    patient_info_hash: patientRaw ? await hashPatientInfo(patientRaw) : null,
    tooth_number: row['치아번호'] || null,
    quantity: Number(row['갯수']) || 1,
    surgery_record: row['수술기록'] || null,
    classification: row['구분'] || '식립',
    manufacturer: row['제조사'] || null,
    brand: row['브랜드'] || null,
    size: row['규격(SIZE)'] || null,
    bone_quality: row['골질'] || null,
    initial_fixation: row['초기고정'] || null,
  };
}

/** Order → DbOrder + DbOrderItem[] INSERT용 */
export function orderToDb(
  order: Order,
  hospitalId: string
): {
  order: Omit<DbOrder, 'id' | 'created_at'>;
  items: Omit<DbOrderItem, 'id' | 'order_id'>[];
} {
  return {
    order: {
      hospital_id: hospitalId,
      type: order.type,
      manufacturer: order.manufacturer,
      date: order.date,
      manager: order.manager,
      status: order.status,
      received_date: order.receivedDate || null,
    },
    items: order.items.map(i => ({
      brand: i.brand,
      size: i.size,
      quantity: i.quantity,
    })),
  };
}
