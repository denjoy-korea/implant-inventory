/**
 * FAIL 자동 감지 서비스 (재식립 감지)
 *
 * 동일 환자 + 동일 치아에 2회 이상 '식립' 기록이 있으면 지연 FAIL(재식립)로 감지.
 * 수술중교환(수술 중 즉시 실패)과는 별도로 관리됨.
 */

import { supabase } from './supabaseClient';
import { DbSurgeryRecord, FailCandidate, DetectedFail } from '../types';
import { decryptPatientInfoBatch } from './cryptoUtils';

/** 치아번호 문자열 파싱: "35, 36" → ["35", "36"] */
function parseTeeth(toothStr: string | null): string[] {
  if (!toothStr) return [];
  return toothStr.split(',').map(t => t.trim()).filter(Boolean);
}

/** 복호화된 환자명 마스킹: "홍길동(C1234)" → "홍**(****)" */
function maskPatient(plain: string): string {
  const value = String(plain || '').trim();
  if (!value) return '-';
  if (value.includes('*')) return value;
  const nameOnly = value.replace(/\(.*$/, '').trim();
  const maskedName = nameOnly.length <= 1
    ? `${nameOnly || '-'}*`
    : `${nameOnly[0]}${'*'.repeat(Math.max(1, nameOnly.length - 1))}`;
  const parenMatch = value.match(/\(([^)]*)\)/);
  if (!parenMatch) return maskedName;
  const inside = String(parenMatch[1] || '').trim();
  const maskedInside = '*'.repeat(Math.max(4, inside.length || 0));
  return `${maskedName}(${maskedInside})`;
}

/** 이미 detected_fails 에 저장된 쌍 집합 조회 */
async function fetchExistingPairs(hospitalId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('detected_fails')
    .select('original_record_id, reimplant_record_id, tooth_number')
    .eq('hospital_id', hospitalId);
  const pairSet = new Set<string>();
  for (const d of (data || [])) {
    pairSet.add(`${d.original_record_id}|${d.reimplant_record_id}|${d.tooth_number}`);
  }
  return pairSet;
}

/** 후보 목록에 환자 마스킹 정보를 채워 반환 */
async function enrichWithPatientMasked(candidates: FailCandidate[]): Promise<FailCandidate[]> {
  if (!candidates.length) return candidates;
  const uniqueEncrypteds = [...new Set(
    candidates.map(c => c.reimplantRecord.patient_info).filter(Boolean) as string[]
  )];
  if (!uniqueEncrypteds.length) return candidates;

  let decryptMap = new Map<string, string>();
  try {
    const decrypted = await decryptPatientInfoBatch(uniqueEncrypteds);
    uniqueEncrypteds.forEach((enc, i) => decryptMap.set(enc, decrypted[i] ?? ''));
  } catch {
    // 복호화 실패 시 마스킹 없이 반환
  }

  return candidates.map(c => ({
    ...c,
    patientMasked: maskPatient(decryptMap.get(c.reimplantRecord.patient_info || '') ?? ''),
  }));
}

export const failDetectionService = {
  /**
   * 새로 업로드된 수술기록에서 재식립 FAIL 후보 감지.
   * handleFileUpload 직후 호출됨.
   */
  async detectReimplantationFails(
    newRecords: DbSurgeryRecord[],
    hospitalId: string,
  ): Promise<FailCandidate[]> {
    const implantRecords = newRecords.filter(
      r => r.classification === '식립' && r.patient_info_hash,
    );
    if (!implantRecords.length) return [];

    const hashes = [...new Set(implantRecords.map(r => r.patient_info_hash!))];

    // 같은 환자의 기존 '식립' 기록 조회
    const { data: existingData } = await supabase
      .from('surgery_records')
      .select('id, date, patient_info_hash, tooth_number, manufacturer, brand, size, patient_info')
      .eq('hospital_id', hospitalId)
      .eq('classification', '식립')
      .in('patient_info_hash', hashes);

    if (!existingData?.length) return [];

    const byHash = new Map<string, typeof existingData>();
    for (const r of existingData) {
      if (!r.patient_info_hash) continue;
      const list = byHash.get(r.patient_info_hash) ?? [];
      list.push(r);
      byHash.set(r.patient_info_hash, list);
    }

    const existingPairs = await fetchExistingPairs(hospitalId);
    const candidates: FailCandidate[] = [];

    for (const newRec of implantRecords) {
      const existing = byHash.get(newRec.patient_info_hash!) ?? [];
      const newTeeth = parseTeeth(newRec.tooth_number);

      for (const existRec of existing) {
        if (existRec.id === newRec.id) continue;
        if (!existRec.date || !newRec.date) continue;
        // 기존 기록이 반드시 더 이전이어야 함 (같은 날 제외)
        if (existRec.date >= newRec.date) continue;

        const existTeeth = parseTeeth(existRec.tooth_number);
        const commonTeeth = newTeeth.filter(t => existTeeth.includes(t));

        for (const tooth of commonTeeth) {
          const pairKey = `${existRec.id}|${newRec.id}|${tooth}`;
          if (existingPairs.has(pairKey)) continue;

          candidates.push({
            originalRecord: {
              id: existRec.id,
              date: existRec.date,
              manufacturer: existRec.manufacturer ?? '',
              brand: existRec.brand ?? '',
              size: existRec.size ?? '',
              tooth_number: existRec.tooth_number ?? '',
              patient_info: existRec.patient_info ?? null,
            },
            reimplantRecord: {
              id: newRec.id,
              date: newRec.date ?? null,
              manufacturer: newRec.manufacturer ?? '',
              brand: newRec.brand ?? '',
              size: newRec.size ?? '',
              tooth_number: newRec.tooth_number ?? '',
              patient_info: newRec.patient_info ?? null,
            },
            matchedTooth: tooth,
            patientInfoHash: newRec.patient_info_hash!,
          });
        }
      }
    }

    return enrichWithPatientMasked(candidates);
  },

  /**
   * 기존 전체 수술기록 일괄 스캔.
   * FailManager의 "전체 기록 스캔" 버튼에서 호출됨.
   */
  async scanAllRecords(hospitalId: string): Promise<FailCandidate[]> {
    const { data } = await supabase
      .from('surgery_records')
      .select('id, date, patient_info_hash, tooth_number, manufacturer, brand, size, patient_info')
      .eq('hospital_id', hospitalId)
      .eq('classification', '식립')
      .not('patient_info_hash', 'is', null);

    if (!data?.length) return [];

    const existingPairs = await fetchExistingPairs(hospitalId);

    const byHash = new Map<string, typeof data>();
    for (const r of data) {
      if (!r.patient_info_hash) continue;
      const list = byHash.get(r.patient_info_hash) ?? [];
      list.push(r);
      byHash.set(r.patient_info_hash, list);
    }

    const candidates: FailCandidate[] = [];

    for (const [, records] of byHash) {
      const sorted = [...records].sort((a, b) =>
        (a.date ?? '').localeCompare(b.date ?? ''),
      );
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const older = sorted[i];
          const newer = sorted[j];
          if (!older.date || !newer.date || older.date === newer.date) continue;

          const olderTeeth = parseTeeth(older.tooth_number);
          const newerTeeth = parseTeeth(newer.tooth_number);
          const commonTeeth = olderTeeth.filter(t => newerTeeth.includes(t));

          for (const tooth of commonTeeth) {
            const pairKey = `${older.id}|${newer.id}|${tooth}`;
            if (existingPairs.has(pairKey)) continue;

            candidates.push({
              originalRecord: {
                id: older.id,
                date: older.date,
                manufacturer: older.manufacturer ?? '',
                brand: older.brand ?? '',
                size: older.size ?? '',
                tooth_number: older.tooth_number ?? '',
                patient_info: older.patient_info ?? null,
              },
              reimplantRecord: {
                id: newer.id,
                date: newer.date,
                manufacturer: newer.manufacturer ?? '',
                brand: newer.brand ?? '',
                size: newer.size ?? '',
                tooth_number: newer.tooth_number ?? '',
                patient_info: newer.patient_info ?? null,
              },
              matchedTooth: tooth,
              patientInfoHash: newer.patient_info_hash!,
            });
          }
        }
      }
    }

    return enrichWithPatientMasked(candidates);
  },

  /**
   * 후보들을 DB에 저장.
   * @param status 'confirmed': 즉시 확인 / 'pending': 나중에 확인 / 'dismissed': 무시
   */
  async saveCandidates(
    candidates: FailCandidate[],
    hospitalId: string,
    status: 'pending' | 'confirmed' | 'dismissed',
    confirmedBy?: string,
  ): Promise<void> {
    if (!candidates.length) return;
    const now = new Date().toISOString();
    const rows = candidates.map(c => ({
      hospital_id: hospitalId,
      original_record_id: c.originalRecord.id,
      reimplant_record_id: c.reimplantRecord.id,
      patient_info_hash: c.patientInfoHash,
      tooth_number: c.matchedTooth,
      original_date: c.originalRecord.date,
      reimplant_date: c.reimplantRecord.date,
      original_manufacturer: c.originalRecord.manufacturer,
      original_brand: c.originalRecord.brand,
      original_size: c.originalRecord.size,
      reimplant_manufacturer: c.reimplantRecord.manufacturer,
      reimplant_brand: c.reimplantRecord.brand,
      reimplant_size: c.reimplantRecord.size,
      status,
      confirmed_by: status === 'confirmed' ? (confirmedBy ?? null) : null,
      confirmed_at: status === 'confirmed' ? now : null,
    }));
    // UNIQUE constraint로 중복 시 무시 (onConflict ignore)
    await supabase.from('detected_fails').upsert(rows, {
      onConflict: 'original_record_id,reimplant_record_id,tooth_number',
      ignoreDuplicates: true,
    });
  },

  /** 병원의 모든 detected_fails 조회 */
  async getDetectedFails(hospitalId: string): Promise<DetectedFail[]> {
    const { data } = await supabase
      .from('detected_fails')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    return (data ?? []) as DetectedFail[];
  },

  /** 단건 상태 업데이트 (confirmed / dismissed) */
  async updateStatus(
    id: string,
    status: 'confirmed' | 'dismissed',
    confirmedBy?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await supabase
      .from('detected_fails')
      .update({
        status,
        confirmed_by: status === 'confirmed' ? (confirmedBy ?? null) : null,
        confirmed_at: status === 'confirmed' ? now : null,
      })
      .eq('id', id);
  },
};
