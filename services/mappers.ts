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
  DEFAULT_WORK_DAYS,
} from '../types';
import { encryptPatientInfo, decryptPatientInfo, hashPatientInfo } from './cryptoUtils';
import { toCanonicalSize } from './sizeNormalizer';

// ============================================
// IBS Implant 제조사/브랜드 위치 교정
// 덴트웹 원본 데이터에서 제조사와 브랜드가 반대로 저장된 항목을 정규화
// ============================================

const IBS_SWAPPED_BRANDS = new Set(['Magicore', 'Magic FC Mini', 'Magic FC']);

/**
 * DB에 잘못 저장된 IBS Implant 계열 제조사/브랜드를 교정한다.
 * - manufacturer: 'Magicore' | 'Magic FC Mini' | 'Magic FC'
 * - brand: 'IBS Implant'
 * → manufacturer: 'IBS Implant', brand: 'Magicore' | 'Magic FC Mini' | 'Magic FC'
 */
export function fixIbsImplant(
  manufacturer: string,
  brand: string
): { manufacturer: string; brand: string } {
  if (IBS_SWAPPED_BRANDS.has(manufacturer) && brand === 'IBS Implant') {
    return { manufacturer: 'IBS Implant', brand: manufacturer };
  }
  return { manufacturer, brand };
}

// ============================================
// DB → Frontend 변환
// ============================================

/** DbInventoryItem → InventoryItem (계산 필드 초기값 포함) */
export function dbToInventoryItem(db: DbInventoryItem): InventoryItem {
  const adj = db.stock_adjustment ?? 0;
  const { manufacturer, brand } = fixIbsImplant(db.manufacturer, db.brand);
  return {
    id: db.id,
    manufacturer,
    brand,
    size: toCanonicalSize(db.size, manufacturer),
    initialStock: db.initial_stock,
    stockAdjustment: adj,
    usageCount: 0,
    currentStock: db.initial_stock + adj,
    recommendedStock: 0,
  };
}

/** DbSurgeryRecord → ExcelRow (기존 수술기록지 포맷 호환) */
export async function dbToExcelRow(db: DbSurgeryRecord): Promise<ExcelRow> {
  const { manufacturer, brand } = fixIbsImplant(db.manufacturer || '', db.brand || '');
  return {
    '날짜': db.date || '',
    '환자정보': await decryptPatientInfo(db.patient_info || ''),
    '치아번호': db.tooth_number || '',
    '갯수': db.quantity,
    '수술기록': db.surgery_record || '',
    '구분': db.classification,
    '제조사': manufacturer,
    '브랜드': brand,
    '규격(SIZE)': toCanonicalSize(db.size || '', manufacturer),
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
      size: toCanonicalSize(i.size, db.manufacturer),
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
    workDays: db.work_days ?? DEFAULT_WORK_DAYS,
  };
}

/** DbProfile → User */
export function dbToUser(db: DbProfile): User {
  return {
    id: db.id,
    email: db.email,
    name: db.name,
    phone: db.phone,
    role: db.role,
    hospitalId: db.hospital_id || '',
    status: db.status,
    permissions: db.permissions ?? null,
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
  const { manufacturer, brand } = fixIbsImplant(item.manufacturer, item.brand);
  return {
    hospital_id: hospitalId,
    manufacturer,
    brand,
    size: toCanonicalSize(item.size, manufacturer),
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
  const { manufacturer, brand } = fixIbsImplant(row['제조사'] || '', row['브랜드'] || '');
  const canonicalSize = toCanonicalSize(String(row['규격(SIZE)'] || ''), manufacturer);
  return {
    hospital_id: hospitalId,
    date: row['날짜'] || null,
    patient_info: patientRaw ? await encryptPatientInfo(patientRaw) : null,
    patient_info_hash: patientRaw ? await hashPatientInfo(patientRaw) : null,
    tooth_number: row['치아번호'] || null,
    quantity: Number(row['갯수']) || 1,
    surgery_record: row['수술기록'] || null,
    classification: row['구분'] || '식립',
    manufacturer: manufacturer || null,
    brand: brand || null,
    size: canonicalSize || null,
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
      size: toCanonicalSize(i.size, order.manufacturer),
      quantity: i.quantity,
    })),
  };
}
