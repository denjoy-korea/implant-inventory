/**
 * 환자정보 암호화/복호화 유틸리티
 *
 * SEC-01 해결: 암호화 로직을 Supabase Edge Function(crypto-service)으로 이전.
 * PATIENT_DATA_KEY는 서버 전용 시크릿으로 관리됩니다.
 *
 * 클라이언트는 Edge Function을 호출하는 thin wrapper만 유지합니다.
 * - encryptPatientInfo  : JWT 필수 (인증 사용자만 암호화 가능)
 * - decryptPatientInfo  : JWT 필수 (인증 사용자만 복호화 가능)
 * - hashPatientInfo     : anon key 허용 (비인증 ID 조회에서도 사용)
 * - decryptPatientInfoBatch : JWT 필수, 복수 암호문 한 번에 복호화
 *
 * JWT 처리:
 * - requireAuth=true  → supabase.functions.invoke() 사용 (JWT 갱신 자동 처리)
 * - requireAuth=false → raw fetch + anon key (hash 전용)
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';
const CRYPTO_SERVICE_URL = `${SUPABASE_URL}/functions/v1/crypto-service`;

async function callCryptoService(
  op: 'encrypt' | 'decrypt' | 'hash' | 'decrypt_batch',
  payload: { text?: string; texts?: string[] },
  requireAuth = true,
): Promise<string | string[]> {
  if (requireAuth) {
    // supabase.functions.invoke()가 세션 토큰 갱신을 자동 처리함
    // — 만료 토큰, race condition 모두 Supabase 클라이언트 내부에서 해결
    const { supabase } = await import('./supabaseClient');
    const { data, error } = await supabase.functions.invoke('crypto-service', {
      body: { op, ...payload },
    });
    if (error) {
      throw new Error(
        `[cryptoUtils] crypto-service 오류 (${op}): ${error.message}`,
      );
    }
    const result = data as { result?: string; results?: string[] };
    return (result.result ?? result.results) as string | string[];
  }

  // hash op: anon key만으로 호출 (비인증 상태에서도 ID 조회 가능)
  const res = await fetch(CRYPTO_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ op, ...payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(
      `[cryptoUtils] crypto-service 오류 (${op}): ${err.error ?? res.status}`,
    );
  }

  const data = await res.json() as { result?: string; results?: string[] };
  return (data.result ?? data.results) as string | string[];
}

export async function encryptPatientInfo(text: string): Promise<string> {
  if (!text) return '';
  return callCryptoService('encrypt', { text }, true) as Promise<string>;
}

export async function decryptPatientInfo(encrypted: string): Promise<string> {
  if (!encrypted) return '';
  // 암호화되지 않은 평문은 Edge Function 호출 없이 즉시 반환
  if (!encrypted.startsWith('ENCv2:') && !encrypted.startsWith('ENC:')) return encrypted;
  return callCryptoService('decrypt', { text: encrypted }, true) as Promise<string>;
}

export async function hashPatientInfo(text: string): Promise<string> {
  if (!text) return '';
  // anon key 허용: 비인증 상태에서도 ID 조회(findByPhone/Email) 가능
  return callCryptoService('hash', { text }, false) as Promise<string>;
}

/**
 * 여러 암호문을 한 번의 Edge Function 호출로 복호화.
 * surgery 목록 등 다수 레코드 처리 시 사용하여 왕복 횟수 최소화.
 */
export async function decryptPatientInfoBatch(
  encryptedList: string[],
): Promise<string[]> {
  if (!encryptedList.length) return [];

  // 암호화된 항목의 인덱스와 값만 추출
  const encryptedIndices: number[] = [];
  const encryptedValues: string[] = [];
  encryptedList.forEach((s, i) => {
    if (s.startsWith('ENCv2:') || s.startsWith('ENC:')) {
      encryptedIndices.push(i);
      encryptedValues.push(s);
    }
  });

  // 모두 평문이면 Edge Function 호출 없이 즉시 반환
  if (!encryptedValues.length) return encryptedList;

  const decryptedValues = await callCryptoService(
    'decrypt_batch',
    { texts: encryptedValues },
    true,
  ) as string[];

  // 원본 순서 복원 (평문은 그대로, 암호문은 복호화 결과로 교체)
  const result = [...encryptedList];
  encryptedIndices.forEach((origIdx, i) => {
    result[origIdx] = decryptedValues[i];
  });
  return result;
}
