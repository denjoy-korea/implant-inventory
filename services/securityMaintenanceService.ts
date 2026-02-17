import { supabase } from './supabaseClient';
import { decryptPatientInfo, encryptPatientInfo } from './cryptoUtils';

export interface PatientInfoEncryptionStatus {
  hospitalId: string;
  total: number;
  empty: number;
  encryptedV1: number;
  encryptedV2: number;
  plainText: number;
}

export interface PatientInfoMigrationResult {
  hospitalId: string;
  scanned: number;
  migrated: number;
  skipped: number;
  failed: number;
  batches: number;
  remainingLegacy: number;
}

interface LegacyRow {
  id: string;
  patient_info: string | null;
}

const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_MAX_BATCHES = 20;

function normalizeCount(value: number | null): number {
  return typeof value === 'number' ? value : 0;
}

async function countLegacyV1(hospitalId: string): Promise<number> {
  const { count, error } = await supabase
    .from('surgery_records')
    .select('id', { count: 'exact', head: true })
    .eq('hospital_id', hospitalId)
    .like('patient_info', 'ENC:%');

  if (error) {
    console.error('[securityMaintenanceService] Legacy count failed:', error);
    return 0;
  }
  return normalizeCount(count);
}

export const securityMaintenanceService = {
  /** 병원별 환자정보 암호화 상태 집계 */
  async getPatientInfoEncryptionStatus(hospitalId: string): Promise<PatientInfoEncryptionStatus> {
    const base = () =>
      supabase
        .from('surgery_records')
        .select('id', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId);

    const [{ count: total, error: totalError }, { count: empty, error: emptyError }, { count: encryptedV1, error: v1Error }, { count: encryptedV2, error: v2Error }] =
      await Promise.all([
        base(),
        base().or('patient_info.is.null,patient_info.eq.'),
        base().like('patient_info', 'ENC:%'),
        base().like('patient_info', 'ENCv2:%'),
      ]);

    if (totalError || emptyError || v1Error || v2Error) {
      console.error('[securityMaintenanceService] Status aggregation failed:', {
        totalError,
        emptyError,
        v1Error,
        v2Error,
      });
    }

    const nTotal = normalizeCount(total);
    const nEmpty = normalizeCount(empty);
    const nV1 = normalizeCount(encryptedV1);
    const nV2 = normalizeCount(encryptedV2);
    const nPlain = Math.max(0, nTotal - nEmpty - nV1 - nV2);

    return {
      hospitalId,
      total: nTotal,
      empty: nEmpty,
      encryptedV1: nV1,
      encryptedV2: nV2,
      plainText: nPlain,
    };
  },

  /**
   * 병원별 환자정보 ENCv1(ENC:) -> ENCv2(ENCv2:) 재암호화
   * NOTE: 현재 로그인한 사용자의 RLS 범위 내 데이터만 처리 가능.
   */
  async migratePatientInfoToV2(
    hospitalId: string,
    options?: { batchSize?: number; maxBatches?: number }
  ): Promise<PatientInfoMigrationResult> {
    const batchSize = Math.max(1, options?.batchSize ?? DEFAULT_BATCH_SIZE);
    const maxBatches = Math.max(1, options?.maxBatches ?? DEFAULT_MAX_BATCHES);

    const result: PatientInfoMigrationResult = {
      hospitalId,
      scanned: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      batches: 0,
      remainingLegacy: 0,
    };

    for (let i = 0; i < maxBatches; i++) {
      const { data, error } = await supabase
        .from('surgery_records')
        .select('id, patient_info')
        .eq('hospital_id', hospitalId)
        .like('patient_info', 'ENC:%')
        .order('id', { ascending: true })
        .limit(batchSize);

      if (error) {
        console.error('[securityMaintenanceService] Legacy fetch failed:', error);
        result.failed += batchSize;
        break;
      }

      const rows = (data || []) as LegacyRow[];
      if (rows.length === 0) {
        break;
      }

      result.batches += 1;

      for (const row of rows) {
        result.scanned += 1;

        const current = row.patient_info || '';
        if (!current.startsWith('ENC:')) {
          result.skipped += 1;
          continue;
        }

        try {
          const plain = await decryptPatientInfo(current);
          const reEncrypted = await encryptPatientInfo(plain);
          if (!reEncrypted.startsWith('ENCv2:')) {
            result.failed += 1;
            continue;
          }

          const { error: updateError } = await supabase
            .from('surgery_records')
            .update({ patient_info: reEncrypted })
            .eq('id', row.id)
            .eq('hospital_id', hospitalId);

          if (updateError) {
            console.error('[securityMaintenanceService] Legacy update failed:', updateError);
            result.failed += 1;
            continue;
          }

          result.migrated += 1;
        } catch (e) {
          console.error('[securityMaintenanceService] Legacy row migration failed:', row.id, e);
          result.failed += 1;
        }
      }
    }

    result.remainingLegacy = await countLegacyV1(hospitalId);
    return result;
  },
};
