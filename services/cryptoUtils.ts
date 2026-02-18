/**
 * 환자정보 암호화/복호화 유틸리티
 * - ENCv2: Web Crypto API(AES-GCM)
 * - ENCv1(ENC:): 기존 XOR 포맷 하위 호환
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

function legacyEncryptXor(text: string): string {
  const encoded = new TextEncoder().encode(text);
  const key = new TextEncoder().encode(LEGACY_SALT);
  const result = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i] ^ key[i % key.length];
  }
  return ENC_V1_PREFIX + bytesToBase64(result);
}

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

async function getAesKey(): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto is unavailable');
  }
  if (cachedAesKeyPromise) {
    return cachedAesKeyPromise;
  }

  cachedAesKeyPromise = (async () => {
    const keyMaterial = new TextEncoder().encode(ENCRYPTION_SECRET);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', keyMaterial);
    return globalThis.crypto.subtle.importKey(
      'raw',
      digest,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  })();

  return cachedAesKeyPromise;
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
  try {
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
  } catch {
    // WebCrypto를 사용할 수 없는 환경에 대한 호환 폴백
    return legacyEncryptXor(text);
  }
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
    const key = await getAesKey();
    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return encrypted;
  }
}
