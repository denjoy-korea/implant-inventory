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

import { supabase } from './supabaseClient';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';
const CRYPTO_SERVICE_URL = `${SUPABASE_URL}/functions/v1/crypto-service`;

// H-6: 동시 refreshSession() 호출을 단일 Promise로 공유 (mutex 패턴)
// 여러 컴포넌트가 동시에 expired token을 감지해도 refresh_token은 1회만 소비됨
let _refreshingPromise: Promise<string | null> | null = null;

/**
 * 유효한 access token 획득.
 * supabase.functions.invoke()는 초기 세션 복원 시 INITIAL_SESSION 이벤트로
 * FunctionsClient.setAuth()가 호출되지 않아 anon key가 전달되는 버그가 있음.
 * → 수동으로 getSession()에서 토큰을 추출하여 직접 헤더에 설정.
 */
async function getValidToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;

    // 10초 버퍼: 만료가 임박했거나 이미 만료된 경우 갱신
    if (expiresAt - 10 <= now) {
      // H-6: 이미 진행 중인 refresh가 있으면 공유, 없으면 새로 시작
      if (!_refreshingPromise) {
        _refreshingPromise = supabase.auth.refreshSession()
          .then(({ data, error }) => {
            _refreshingPromise = null;
            return (!error && data.session) ? data.session.access_token : null;
          })
          .catch(() => {
            _refreshingPromise = null;
            return null;
          });
      }
      return _refreshingPromise;
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
  const isAbortError = (err: unknown): boolean =>
    (err instanceof DOMException && err.name === 'AbortError')
    || (err instanceof Error && err.name === 'AbortError');

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

  // Edge Function cold start/대용량 복호화를 고려한 operation별 타임아웃
  const timeoutByOp: Record<typeof op, number> = {
    encrypt: 7_500,
    decrypt: 8_000,
    hash: 7_500,
    decrypt_batch: 10_000,
  };
  const defaultTimeout = timeoutByOp[op];

  const fetchWithTimeout = (hdrs: Record<string, string>, timeoutMs = defaultTimeout) => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(CRYPTO_SERVICE_URL, {
      method: 'POST',
      headers: hdrs,
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(tid));
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(headers);
  } catch (err) {
    // AbortError(타임아웃): decrypt_batch는 재시도 시 총 대기시간만 증가하므로 즉시 실패 처리
    if (isAbortError(err)) {
      if (op === 'decrypt_batch') {
        throw err;
      }
      console.warn(`[cryptoUtils] ${op} 타임아웃, 확장 타임아웃으로 1회 재시도`);
      res = await fetchWithTimeout(headers, defaultTimeout + 3_000);
    } else {
      // 네트워크 오류 시 토큰 재확인 후 1회 재시도
      console.warn(`[cryptoUtils] ${op} 첫 시도 실패, 재시도:`, err);
      if (requireAuth) {
        const freshToken = await getValidToken();
        if (freshToken) headers['Authorization'] = `Bearer ${freshToken}`;
      }
      res = await fetchWithTimeout(headers);
    }
  }

  // 502/503/504 게이트웨이 오류 시 1회 재시도 (짧은 타임아웃)
  if (res.status >= 502 && res.status <= 504) {
    console.warn(`[cryptoUtils] ${op} 게이트웨이 오류 ${res.status}, 재시도`);
    res = await fetchWithTimeout(headers, Math.max(8_000, defaultTimeout));
  }

  // 401 수신 시: 서버 측 인증 거부 → 세션 강제 갱신 후 1회 재시도
  if (requireAuth && res.status === 401) {
    try {
      const { data } = await supabase.auth.refreshSession();
      const freshToken = data?.session?.access_token;
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        res = await fetchWithTimeout(headers);
      }
    } catch {
      // refresh 실패 시 원래 응답으로 계속 진행
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(
      `[cryptoUtils] crypto-service 오류 (${op}): ${err.error ?? res.status}`,
    );
  }

  const data = await res.json() as { result?: string; results?: string[] };
  // H-1: 서버가 { error: "..." } 등 예외 응답 시 undefined를 string으로 캐스팅하는 버그 방지
  const value = data.result ?? data.results;
  if (value === undefined) {
    throw new Error(`[cryptoUtils] crypto-service (${op}): 응답에 result 필드 없음`);
  }
  return value;
}

/**
 * Edge Function 런타임 워밍업 (콜드 스타트 방지).
 * hash op는 인증 불요 → 앱 마운트 시 즉시 호출 가능.
 * 반환된 Promise를 await하면 워밍업 완료 후 decrypt를 시작할 수 있다.
 */
let _warmupPromise: Promise<void> | null = null;

export function warmupCryptoService(): Promise<void> {
  if (!_warmupPromise) {
    _warmupPromise = callCryptoService('hash', { text: 'warmup' }, false)
      .then(() => {})
      .catch(() => {});
  }
  return _warmupPromise;
}

/** decrypt 호출 전에 워밍업 완료를 기다리는 헬퍼. 이미 warm이면 즉시 반환. */
export function waitForWarmup(): Promise<void> {
  return _warmupPromise ?? Promise.resolve();
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

  // 1회 payload가 너무 크면 timeout 확률이 높아져 200개 단위 + 동시성 2로 분산
  const DECRYPT_BATCH_LIMIT = 200;
  const DECRYPT_BATCH_CONCURRENCY = 2;
  const chunkCount = Math.ceil(encryptedValues.length / DECRYPT_BATCH_LIMIT);
  const chunkResults: string[][] = new Array(chunkCount);

  for (let base = 0; base < chunkCount; base += DECRYPT_BATCH_CONCURRENCY) {
    const workers: Promise<void>[] = [];
    const end = Math.min(base + DECRYPT_BATCH_CONCURRENCY, chunkCount);
    for (let chunkIndex = base; chunkIndex < end; chunkIndex++) {
      const start = chunkIndex * DECRYPT_BATCH_LIMIT;
      const chunk = encryptedValues.slice(start, start + DECRYPT_BATCH_LIMIT);
      workers.push(
        (async () => {
          try {
            const chunkResult = await callCryptoService('decrypt_batch', { texts: chunk }, true) as string[];
            chunkResults[chunkIndex] = chunkResult;
          } catch (e) {
            // chunk 실패 시 전체 실패로 전파하지 않고 암호문 유지(하단 sanitize 단계에서 마스킹)
            chunkResults[chunkIndex] = chunk;
          }
        })(),
      );
    }
    await Promise.all(workers);
  }
  const decryptedValues = chunkResults.flat();

  // W-1 fix: 서버 측 복호화 실패 시 ciphertext를 그대로 반환하는 경우 감지
  // decryptText()의 3단계 fallback이 모두 실패하면 원본 암호문을 반환 → 클라이언트에서 차단
  let failCount = 0;
  const sanitized = decryptedValues.map((v) => {
    if (v.startsWith('ENCv2:') || v.startsWith('ENC:')) {
      failCount++;
      return '[복호화 실패]';
    }
    return v;
  });
  if (failCount > 0) {
    console.warn(`[decryptPatientInfoBatch] ${failCount}개 항목 복호화 실패 (암호문 그대로 반환됨)`);
  }

  // 원본 순서 복원 (평문은 그대로, 암호문은 복호화 결과로 교체)
  const result = [...encryptedList];
  encryptedIndices.forEach((origIdx, i) => {
    result[origIdx] = sanitized[i];
  });
  return result;
}
