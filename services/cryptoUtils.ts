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

/**
 * 유효한 access token 획득.
 * supabase.functions.invoke()는 초기 세션 복원 시 INITIAL_SESSION 이벤트로
 * FunctionsClient.setAuth()가 호출되지 않아 anon key가 전달되는 버그가 있음.
 * → 수동으로 getSession()에서 토큰을 추출하여 직접 헤더에 설정.
 */
async function getValidToken(): Promise<string | null> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;
    const isExpired = expiresAt - 10 <= now;

    // 10초 버퍼: 만료가 임박했거나 이미 만료된 경우 갱신
    if (isExpired) {
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
  let token: string | null = null;

  if (requireAuth) {
    token = await getValidToken();
    if (!token) {
      throw new Error('[cryptoUtils] 인증 세션이 없습니다. 다시 로그인해주세요.');
    }
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // hash op: anon key를 Authorization 헤더로도 전달 (Supabase gateway 통과)
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  const body = JSON.stringify({ op, ...payload });
  let res = await fetch(CRYPTO_SERVICE_URL, {
    method: 'POST',
    headers,
    body,
  });

  // 토큰이 만료/불일치한 경우 1회 갱신 후 재시도
  if (requireAuth && res.status === 401) {
    const { supabase } = await import('./supabaseClient');
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    const refreshedToken = !error ? refreshed.session?.access_token : null;

    if (refreshedToken && refreshedToken !== token) {
      headers['Authorization'] = `Bearer ${refreshedToken}`;
      res = await fetch(CRYPTO_SERVICE_URL, {
        method: 'POST',
        headers,
        body,
      });
    }
  }

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
