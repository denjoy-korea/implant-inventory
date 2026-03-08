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
  DbReturnRequest,
  DbReturnRequestItem,
  ReturnRequest,
  ReturnRequestItem,
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

/** 구 제조사 prefix 정규화 (수술중FAIL_xxx → 수술중교환_xxx) */
function normalizeManufacturer(m: string): string {
  if (m.startsWith('수술중FAIL_')) return '수술중교환_' + m.slice('수술중FAIL_'.length);
  return m;
}

function sanitizeEncryptedProfileField(
  field: 'email' | 'name' | 'phone',
  value: string | null,
): string | null {
  if (value === '[복호화 실패]' || value === '[복호화 지연]') {
    if (field === 'name') return '사용자';
    return '';
  }
  if (!isEncryptedPII(value)) return value;
  if (field === 'name') return '사용자';
  return '';
}

function toSafeProfile(db: DbProfile, markDecryptFailed = false): DbProfile {
  return {
    ...db,
    email: (sanitizeEncryptedProfileField('email', db.email) ?? ''),
    name: (sanitizeEncryptedProfileField('name', db.name) ?? '사용자'),
    phone: sanitizeEncryptedProfileField('phone', db.phone),
    ...(markDecryptFailed ? { _decryptFailed: true } : {}),
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** profiles PII 필드(name·email·phone) 복호화 — 평문(ENCv2 접두사 없음)은 그대로 반환 */
export async function decryptProfile(db: DbProfile): Promise<DbProfile> {
  try {
    // 단일 프로필도 배치 API 1회 호출로 처리해 로그인 시 왕복 수를 최소화
    const [emailRaw, nameRaw, phoneRaw] = await withTimeout(
      decryptPatientInfoBatch([
        db.email,
        db.name,
        db.phone ?? '',
      ]),
      4_500,
      'decryptProfile',
    );
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
    return toSafeProfile(db, true);
  }
}

/**
 * 프로필 목록 배치 복호화.
 * N명 * 3필드 개별 호출 대신 3회(batch) 호출로 네트워크 부하를 크게 줄인다.
 */
export async function decryptProfilesBatch(rows: DbProfile[]): Promise<DbProfile[]> {
  if (!rows.length) return [];
  try {
    const [emails, names, phones] = await withTimeout(
      Promise.all([
        decryptPatientInfoBatch(rows.map((row) => row.email)),
        decryptPatientInfoBatch(rows.map((row) => row.name)),
        decryptPatientInfoBatch(rows.map((row) => row.phone ?? '')),
      ]),
      6_500,
      'decryptProfilesBatch',
    );

    return rows.map((row, index) => {
      const emailRaw = emails[index] ?? row.email;
      const nameRaw = names[index] ?? row.name;
      const phoneRaw = phones[index] ?? '';

      const email = sanitizeEncryptedProfileField('email', emailRaw);
      const name = sanitizeEncryptedProfileField('name', nameRaw);
      const phone = row.phone === null
        ? null
        : sanitizeEncryptedProfileField('phone', phoneRaw);

      if (isEncryptedPII(emailRaw) || isEncryptedPII(nameRaw) || (row.phone !== null && isEncryptedPII(phoneRaw))) {
        console.warn('[decryptProfilesBatch] 일부 필드 복호화 미완료, 안전값으로 대체:', { id: row.id });
      }

      return { ...row, email: email ?? '', name: name ?? '사용자', phone };
    });
  } catch (e) {
    console.warn('[decryptProfilesBatch] 복호화 실패, 안전값 반환:', e);
    return rows.map((row) => toSafeProfile(row, true));
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
  const { manufacturer: rawM, brand } = fixIbsImplant(db.manufacturer, db.brand);
  const manufacturer = normalizeManufacturer(rawM);
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
  const { manufacturer: rawM, brand } = fixIbsImplant(db.manufacturer || '', db.brand || '');
  const manufacturer = normalizeManufacturer(rawM);
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
  let decrypted: string[];
  try {
    decrypted = await decryptPatientInfoBatch(patientInfos);
  } catch (e) {
    console.warn('[dbToExcelRowBatch] 배치 복호화 실패, 마스킹된 값으로 대체:', e);
    decrypted = patientInfos.map((value) => (isEncryptedPII(value) ? '[복호화 실패]' : value));
  }
  return records.map((db, i) => {
    const { manufacturer: rawM, brand } = fixIbsImplant(db.manufacturer || '', db.brand || '');
    const manufacturer = normalizeManufacturer(rawM);
    const dbSize = db.size || '';
    const maskedPatientInfo = isEncryptedPII(decrypted[i]) ? '[복호화 실패]' : decrypted[i];
    return {
      '날짜': db.date || '',
      '환자정보': maskedPatientInfo,
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

/**
 * DbSurgeryRecord[] → ExcelRow[] 즉시 변환(복호화 생략)
 * 로그인/초기 진입 지연 방지를 위해 환자정보는 마스킹 상태로 반환한다.
 */
export function dbToExcelRowBatchMasked(records: DbSurgeryRecord[]): ExcelRow[] {
  if (!records.length) return [];
  return records.map((db) => {
    const { manufacturer: rawM, brand } = fixIbsImplant(db.manufacturer || '', db.brand || '');
    const manufacturer = normalizeManufacturer(rawM);
    const dbSize = db.size || '';
    const patientInfo = db.patient_info || '';
    const maskedPatientInfo = isEncryptedPII(patientInfo) ? '[복호화 지연]' : patientInfo;
    return {
      '날짜': db.date || '',
      '환자정보': maskedPatientInfo,
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
    confirmedBy: db.confirmed_by || undefined,
    memo: db.memo || undefined,
    cancelledReason: db.cancelled_reason || undefined,
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
    suspendReason: db.suspend_reason ?? null,
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

/**
 * ExcelRow → DbSurgeryRecord 동기 변환 (암호화 미포함).
 * patient_info / patient_info_hash는 null로 설정 — 호출자가 배치 암호화 후 채워넣는다.
 */
export function excelRowToDbSurgerySync(
  row: ExcelRow,
  hospitalId: string,
): Omit<DbSurgeryRecord, 'id' | 'created_at'> {
  const { manufacturer, brand } = fixIbsImplant(String(row['제조사'] ?? ''), String(row['브랜드'] ?? ''));
  const rawSize = String(row['규격(SIZE)'] ?? '');
  const size = isIbsImplantManufacturer(manufacturer) ? rawSize : toCanonicalSize(rawSize, manufacturer);
  return {
    hospital_id: hospitalId,
    date: row['날짜'] ? String(row['날짜']) : null,
    patient_info: null,
    patient_info_hash: null,
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
      confirmed_by: order.confirmedBy || null,
      memo: order.memo || null,
      cancelled_reason: order.cancelledReason || null,
    },
    items: order.items.map(i => ({
      brand: i.brand,
      size: toCanonicalSize(i.size, order.manufacturer),
      quantity: i.quantity,
    })),
  };
}

/** DbReturnRequest + DbReturnRequestItem[] → ReturnRequest (UI) */
export function dbToReturnRequest(
  db: DbReturnRequest & { return_request_items: DbReturnRequestItem[] }
): ReturnRequest {
  const items: ReturnRequestItem[] = (db.return_request_items || []).map(item => ({
    id: item.id,
    returnRequestId: item.return_request_id,
    brand: item.brand,
    size: item.size,
    quantity: item.quantity,
  }));

  return {
    id: db.id,
    hospitalId: db.hospital_id,
    manufacturer: db.manufacturer,
    reason: db.reason,
    status: db.status,
    requestedDate: db.requested_date,
    completedDate: db.completed_date,
    manager: db.manager,
    confirmedBy: db.confirmed_by || undefined,
    memo: db.memo,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    items,
  };
}
