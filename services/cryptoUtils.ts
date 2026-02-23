/**
 * 환자정보 암호화/복호화 유틸리티
 * - ENCv2: Web Crypto API(AES-GCM + PBKDF2 키 도출)
 * - ENCv1(ENC:): 기존 XOR 포맷 하위 호환 (복호화 전용)
 *
 * ⚠️  SEC-01 Critical: VITE_PATIENT_DATA_KEY 클라이언트 번들 노출
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *   VITE_ 접두어 환경변수는 Vite 빌드 시 클라이언트 JS 번들에 인라인됩니다.
 *   → dist/assets/*.js 파일 및 브라우저 DevTools에서 암호화 키 원문이 노출됩니다.
 *
 *   현재 완화 요소 (위험을 낮추지만 제거하지는 않음):
 *   - 공격자가 키를 얻어도 DB 암호문에 별도 접근해야 복호화 가능 (RLS로 보호)
 *   - PBKDF2 100,000회 반복으로 키 탈취 후 무차별대입 공격 방어
 *   - 환자명 해시는 단방향이므로 키 노출 시에도 원본 복원 불가
 *
 *   필수 개선 (SEC-01 해결):
 *   1. 이 파일의 암호화 로직을 Supabase Edge Function (crypto-encrypt, crypto-decrypt)으로 이전
 *   2. VITE_PATIENT_DATA_KEY → PATIENT_DATA_KEY (Edge Function 서버 전용 시크릿)
 *   3. 클라이언트는 암호문만 저장·전달하고, 복호화는 Edge Function 호출로 처리
 *   ※ 개선 전까지 Supabase RLS 정책으로 암호문 접근을 최대한 제한해야 합니다.
 */

/**
 * SEC-12: ENCv1(XOR) 레거시 복호화 전용 상수
 * ⚠️  이 값은 신규 암호화에 절대 사용하지 않습니다.
 * ENCv1 형식 데이터의 하위 호환 복호화에만 사용됩니다.
 * DB에서 ENCv1 데이터가 완전히 제거되면 LEGACY_SALT, legacyEncryptXor, legacyDecryptXor를 삭제하세요.
 */
const LEGACY_SALT = 'dentweb-patient-info-2026';
const ENC_V2_PREFIX = 'ENCv2:';
const ENC_V1_PREFIX = 'ENC:';

if (!import.meta.env.VITE_PATIENT_DATA_KEY) {
  if (import.meta.env.PROD) {
    // 프로덕션에서 키 미설정 = 환자 데이터가 공개 문자열로 암호화됨 (사실상 평문)
    throw new Error(
      '[cryptoUtils] VITE_PATIENT_DATA_KEY가 설정되지 않았습니다. ' +
      '프로덕션 환경에서는 반드시 환경변수를 설정해야 합니다.'
    );
  }
  console.warn(
    '[cryptoUtils] VITE_PATIENT_DATA_KEY 미설정 — 개발 환경에서 기본 키를 사용합니다.'
  );
}

const ENCRYPTION_SECRET = (
  import.meta.env.VITE_PATIENT_DATA_KEY ||
  LEGACY_SALT
).trim();

let cachedAesKeyPromise: Promise<CryptoKey> | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// SEC-12: legacyEncryptXor 제거 — 신규 암호화는 ENCv2(AES-GCM)만 사용
// (기존 함수가 dead code로 확인되어 삭제)

function legacyDecryptXor(encrypted: string): string {
  const base64 = encrypted.slice(ENC_V1_PREFIX.length);
  const decoded = base64ToBytes(base64);
  const key = new TextEncoder().encode(LEGACY_SALT);
  const result = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    result[i] = decoded[i] ^ key[i % key.length];
  }
  return new TextDecoder().decode(result);
}

/** PBKDF2 salt — 고정값이지만 SHA-256 직접 사용보다 무차별대입 방어에 유리 */
const PBKDF2_SALT = new TextEncoder().encode('implant-inventory-pbkdf2-salt-v1');
const PBKDF2_ITERATIONS = 100_000;

async function getAesKey(): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto is unavailable — 이 브라우저에서는 환자 데이터 암호화를 사용할 수 없습니다.');
  }
  if (cachedAesKeyPromise) {
    return cachedAesKeyPromise;
  }

  cachedAesKeyPromise = (async () => {
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ENCRYPTION_SECRET),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return globalThis.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: PBKDF2_SALT,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  })();

  return cachedAesKeyPromise;
}

/**
 * 레거시 SHA-256 직접 키 도출 (ENCv2 초기 버전 복호화 전용)
 * 새 암호화에는 사용하지 않음
 */
let cachedLegacyV2KeyPromise: Promise<CryptoKey> | null = null;
async function getLegacyV2AesKey(): Promise<CryptoKey> {
  if (cachedLegacyV2KeyPromise) return cachedLegacyV2KeyPromise;
  cachedLegacyV2KeyPromise = (async () => {
    const keyMaterial = new TextEncoder().encode(ENCRYPTION_SECRET);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', keyMaterial);
    return globalThis.crypto.subtle.importKey(
      'raw',
      digest,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
  })();
  return cachedLegacyV2KeyPromise;
}

/**
 * 환자정보 SHA-256 해시 — 중복 판별 전용
 * 결정적(같은 입력 → 항상 같은 출력)이므로 비교 가능
 * 해시만으로 원본 복원 불가 → 보안 유지
 */
export async function hashPatientInfo(text: string): Promise<string> {
  if (!text) return '';
  // hospital 단위 salt를 섞어서 rainbow table 방어
  const salted = `${ENCRYPTION_SECRET}:${text.trim()}`;
  const encoded = new TextEncoder().encode(salted);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return bytesToBase64(new Uint8Array(digest));
}

export async function encryptPatientInfo(text: string): Promise<string> {
  if (!text) return '';
  // WebCrypto 미지원 시 XOR 폴백 대신 에러 throw (보안 우선)
  const key = await getAesKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const cipherBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.length);
  return ENC_V2_PREFIX + bytesToBase64(combined);
}

export async function decryptPatientInfo(encrypted: string): Promise<string> {
  if (!encrypted) return '';
  if (!encrypted.startsWith(ENC_V2_PREFIX) && !encrypted.startsWith(ENC_V1_PREFIX)) {
    return encrypted; // 레거시 평문
  }

  if (encrypted.startsWith(ENC_V1_PREFIX)) {
    try {
      return legacyDecryptXor(encrypted);
    } catch {
      return encrypted;
    }
  }

  try {
    const payload = encrypted.slice(ENC_V2_PREFIX.length);
    const combined = base64ToBytes(payload);
    if (combined.length <= 12) return encrypted;

    const iv = combined.slice(0, 12);
    const cipherBytes = combined.slice(12);

    // 1차: PBKDF2 키로 복호화 시도 (새 암호화 방식)
    try {
      const key = await getAesKey();
      const decrypted = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherBytes
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      // 2차: 레거시 SHA-256 키로 재시도 (기존 ENCv2 데이터 하위 호환)
      const legacyKey = await getLegacyV2AesKey();
      const decrypted = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        legacyKey,
        cipherBytes
      );
      return new TextDecoder().decode(decrypted);
    }
  } catch {
    console.error('[cryptoUtils] decryptPatientInfo: 복호화 실패 — VITE_PATIENT_DATA_KEY 불일치 또는 데이터 손상 가능성');
    return encrypted;
  }
}
