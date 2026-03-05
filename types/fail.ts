// ============================================
// FAIL 자동 감지 (재식립) 타입
// ============================================

/** FailCandidate를 구성하는 단일 수술기록 정보 */
export interface FailCandidateRecord {
  id: string;
  date: string | null;
  manufacturer: string;
  brand: string;
  size: string;
  tooth_number: string;
  patient_info: string | null;
}

/** 재식립으로 감지된 FAIL 후보 */
export interface FailCandidate {
  originalRecord: FailCandidateRecord;   // 원래 식립 기록
  reimplantRecord: FailCandidateRecord;  // 재식립 기록 (더 최신)
  matchedTooth: string;                  // 겹친 치아번호
  patientInfoHash: string;
  patientMasked?: string;                // 복호화+마스킹 된 환자명 (표시용)
}

/** Supabase detected_fails 테이블 Row */
export interface DetectedFail {
  id: string;
  hospital_id: string;
  original_record_id: string;
  reimplant_record_id: string;
  patient_info_hash: string;
  tooth_number: string;
  original_date: string | null;
  reimplant_date: string | null;
  original_manufacturer: string | null;
  original_brand: string | null;
  original_size: string | null;
  reimplant_manufacturer: string | null;
  reimplant_brand: string | null;
  reimplant_size: string | null;
  status: 'pending' | 'confirmed' | 'dismissed';
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}
