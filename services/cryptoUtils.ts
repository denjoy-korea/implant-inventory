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
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';
const CRYPTO_SERVICE_URL = `${SUPABASE_URL}/functions/v1/crypto-service`;

async function getAccessToken(): Promise<string | null> {
  try {
    // 순환 의존성 방지를 위해 동적 import
    const { supabase } = await import('./supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // 토큰 만료 확인: getSession()은 만료된 토큰도 그대로 반환함
    // 페이지 로드 시 Supabase 백그라운드 갱신이 완료되기 전에 만료된 토큰이 반환될 수 있음
    const now = Math.floor(Date.now() / 1000); // UNIX seconds
    if (session.expires_at && session.expires_at < now) {
      // 명시적 갱신 — refresh token으로 새 access token 획득
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session) return null;
      return refreshed.session.access_token;
    }

    return session.access_token;
  } catch {
    return null;
  }
}

async function callCryptoService(
  op: 'encrypt' | 'decrypt' | 'hash' | 'decrypt_batch',
  payload: { text?: string; texts?: string[] },
  requireAuth = true,
): Promise<string | string[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };

  if (requireAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else {
    // hash op: anon key를 Authorization 헤더로도 전달 (Supabase gateway 통과)
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  const res = await fetch(CRYPTO_SERVICE_URL, {
    method: 'POST',
    headers,
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
