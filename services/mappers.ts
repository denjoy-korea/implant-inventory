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
import { encryptPatientInfo, decryptPatientInfo, decryptPatientInfoBatch, hashPatientInfo } from './cryptoUtils';

const isEncryptedPII = (value: string | null | undefined): value is string =>
  !!value && (value.startsWith('ENCv2:') || value.startsWith('ENC:'));

/** 구 classification 값을 신규 값으로 정규화 (수술중 FAIL → 수술중교환, FAIL 교환완료 → 교환완료) */
function normalizeClassification(cls: string | null | undefined): string {
  const v = String(cls ?? '').trim();
  if (v === '수술중 FAIL') return '수술중교환';
  if (v === 'FAIL 교환완료') return '교환완료';
  return v;
}

function sanitizeEncryptedProfileField(
  field: 'email' | 'name' | 'phone',
  value: string | null,
): string | null {
  if (!isEncryptedPII(value)) return value;
  if (field === 'name') return '사용자';
  return '';
}

/** profiles PII 필드(name·email·phone) 복호화 — 평문(ENCv2 접두사 없음)은 그대로 반환 */
export async function decryptProfile(db: DbProfile): Promise<DbProfile> {
  try {
    const [emailRaw, nameRaw, phoneRaw] = await decryptPatientInfoBatch([
      db.email,
      db.name,
      db.phone ?? '',
    ]);
    const email = sanitizeEncryptedProfileField('email', emailRaw);
    const name = sanitizeEncryptedProfileField('name', nameRaw);
    const phone = db.phone === null
      ? null
      : sanitizeEncryptedProfileField('phone', phoneRaw);

    if (isEncryptedPII(emailRaw) || isEncryptedPII(nameRaw) || (db.phone !== null && isEncryptedPII(phoneRaw))) {
      console.warn('[decryptProfile] 일부 필드 복호화 미완료, 안전값으로 대체:', { id: db.id });
    }
    return { ...db, email: email ?? '', name: name ?? '사용자', phone };
  } catch (e) {
    // Edge Function 실패 시에도 암호문을 UI에 노출하지 않음
    // H-4: _decryptFailed=true 플래그로 DB 쓰기 경로에서 이 객체를 저장하지 못하도록 차단
    console.warn('[decryptProfile] 복호화 실패, 안전값 반환:', e);
    return {
      ...db,
      email: (sanitizeEncryptedProfileField('email', db.email) ?? ''),
      name: (sanitizeEncryptedProfileField('name', db.name) ?? '사용자'),
      phone: sanitizeEncryptedProfileField('phone', db.phone),
      _decryptFailed: true,
    };
  }
}
import { toCanonicalSize, isIbsImplantManufacturer } from './sizeNormalizer';

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
    size: isIbsImplantManufacturer(manufacturer) ? db.size : toCanonicalSize(db.size, manufacturer),
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
  const dbSize = db.size || '';
  return {
    '날짜': db.date || '',
    '환자정보': await decryptPatientInfo(db.patient_info || ''),
    '치아번호': db.tooth_number || '',
    '갯수': db.quantity,
    '수술기록': db.surgery_record || '',
    '구분': normalizeClassification(db.classification),
    '제조사': manufacturer,
    '브랜드': brand,
    '규격(SIZE)': isIbsImplantManufacturer(manufacturer) ? dbSize : toCanonicalSize(dbSize, manufacturer),
    '골질': db.bone_quality || '',
    '초기고정': db.initial_fixation || '',
    _id: db.id,
  };
}

/**
 * DbSurgeryRecord[] → ExcelRow[] 배치 변환
 * patient_info 복호화를 1회 Edge Function 호출로 처리 (N+1 방지)
 */
export async function dbToExcelRowBatch(records: DbSurgeryRecord[]): Promise<ExcelRow[]> {
  if (!records.length) return [];
  const patientInfos = records.map(r => r.patient_info || '');
  const decrypted = await decryptPatientInfoBatch(patientInfos);
  return records.map((db, i) => {
    const { manufacturer, brand } = fixIbsImplant(db.manufacturer || '', db.brand || '');
    const dbSize = db.size || '';
    return {
      '날짜': db.date || '',
      '환자정보': decrypted[i],
      '치아번호': db.tooth_number || '',
      '갯수': db.quantity,
      '수술기록': db.surgery_record || '',
      '구분': normalizeClassification(db.classification),
      '제조사': manufacturer,
      '브랜드': brand,
      '규격(SIZE)': isIbsImplantManufacturer(manufacturer) ? dbSize : toCanonicalSize(dbSize, manufacturer),
      '골질': db.bone_quality || '',
      '초기고정': db.initial_fixation || '',
      _id: db.id,
    };
  });
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
    onboardingFlags: db.onboarding_flags ?? 0,
    billingProgram: db.billing_program ?? null,
  };
}

/** DbProfile → User */
export function dbToUser(db: DbProfile): User {
  return {
    id: db.id,
    email: sanitizeEncryptedProfileField('email', db.email) ?? '',
    name: sanitizeEncryptedProfileField('name', db.name) ?? '사용자',
    phone: sanitizeEncryptedProfileField('phone', db.phone),
    role: db.role,
    clinicRole: db.clinic_role ?? null,
    hospitalId: db.hospital_id || '',
    status: db.status,
    permissions: db.permissions ?? null,
    mfaEnabled: db.mfa_enabled ?? false,
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
    size: isIbsImplantManufacturer(manufacturer) ? item.size : toCanonicalSize(item.size, manufacturer),
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
  const { manufacturer, brand } = fixIbsImplant(String(row['제조사'] ?? ''), String(row['브랜드'] ?? ''));
  const rawSize = String(row['규격(SIZE)'] ?? '');
  const size = isIbsImplantManufacturer(manufacturer) ? rawSize : toCanonicalSize(rawSize, manufacturer);
  return {
    hospital_id: hospitalId,
    date: row['날짜'] ? String(row['날짜']) : null,
    patient_info: patientRaw ? await encryptPatientInfo(patientRaw) : null,
    patient_info_hash: patientRaw ? await hashPatientInfo(patientRaw) : null,
    tooth_number: row['치아번호'] ? String(row['치아번호']) : null,
    quantity: Number(row['갯수']) || 1,
    surgery_record: row['수술기록'] ? String(row['수술기록']) : null,
    classification: normalizeClassification(String(row['구분'] ?? '')) || '식립',
    manufacturer: manufacturer || null,
    brand: brand || null,
    size: size || null,
    bone_quality: row['골질'] ? String(row['골질']) : null,
    initial_fixation: row['초기고정'] ? String(row['초기고정']) : null,
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
