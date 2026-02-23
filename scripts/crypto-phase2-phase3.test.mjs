/**
 * crypto-phase2-authorization + crypto-security-hardening Phase 3 정적 검증 테스트
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const REPO_ROOT = process.cwd();

function read(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  assert.equal(existsSync(fullPath), true, `Expected file to exist: ${relPath}`);
  return readFileSync(fullPath, 'utf8');
}

// ──────────────────────────────────────────────
// C-4: hospitals.phone 암호화
// ──────────────────────────────────────────────

test('[C-4] authService signUp master: encryptPatientInfo로 hospital.phone 암호화', () => {
  const src = read('services/authService.ts');
  // master 회원가입 경로에서 profileUpdates.phone 재사용 (이중 암호화 방지)
  assert.match(src, /encHospitalPhone = profileUpdates\.phone/);
  assert.match(src, /phone: encHospitalPhone/);
});

test('[C-4] authService signUp staff: encryptPatientInfo로 workspace.phone 암호화', () => {
  const src = read('services/authService.ts');
  assert.match(src, /encWorkspacePhone = profileUpdates\.phone/);
  assert.match(src, /phone: encWorkspacePhone/);
});

test('[C-4] hospitalService: isPlainHospitalPhone 헬퍼 존재', () => {
  const src = read('services/hospitalService.ts');
  assert.match(src, /function isPlainHospitalPhone/);
  assert.match(src, /ENCv2:/);
  assert.match(src, /ENC:/);
});

test('[C-4] hospitalService: lazyEncryptHospitalPhone 백그라운드 암호화', () => {
  const src = read('services/hospitalService.ts');
  assert.match(src, /async function lazyEncryptHospitalPhone/);
  assert.match(src, /encryptPatientInfo\(plainPhone\)/);
});

test('[C-4] hospitalService: getMyHospital에서 lazy encrypt 트리거', () => {
  const src = read('services/hospitalService.ts');
  assert.match(src, /isPlainHospitalPhone\(hospital\.phone\)/);
  assert.match(src, /void lazyEncryptHospitalPhone/);
});

test('[C-4] Migration: hospitals.phone 암호화 마이그레이션 파일 존재', () => {
  assert.equal(
    existsSync(path.join(REPO_ROOT, 'supabase/migrations/20260223070000_hospitals_phone_encryption.sql')),
    true
  );
});

// ──────────────────────────────────────────────
// C-1: JWT custom claims 인가 레이어
// ──────────────────────────────────────────────

test('[C-1] Migration: custom_access_token_hook 함수 생성', () => {
  const sql = read('supabase/migrations/20260223080000_custom_jwt_claims.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.custom_access_token_hook/);
  assert.match(sql, /app_metadata,hospital_id/);
});

test('[C-1] Migration: supabase_auth_admin에 실행 권한 부여', () => {
  const sql = read('supabase/migrations/20260223080000_custom_jwt_claims.sql');
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.custom_access_token_hook TO supabase_auth_admin/);
  assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.custom_access_token_hook FROM authenticated/);
});

test('[C-1] crypto-service: AuthContext 인터페이스 (userId + hospitalId)', () => {
  const src = read('supabase/functions/crypto-service/index.ts');
  assert.match(src, /interface AuthContext/);
  assert.match(src, /userId: string/);
  assert.match(src, /hospitalId: string \| null/);
});

test('[C-1] crypto-service: extractHospitalId 함수 존재', () => {
  const src = read('supabase/functions/crypto-service/index.ts');
  assert.match(src, /function extractHospitalId/);
  assert.match(src, /app_metadata/);
});

test('[C-1] crypto-service: verifyAuth가 AuthContext | null 반환', () => {
  const src = read('supabase/functions/crypto-service/index.ts');
  assert.match(src, /Promise<AuthContext \| null>/);
});

test('[C-1] crypto-service: 소프트-패스 (hospital_id 없어도 통과)', () => {
  const src = read('supabase/functions/crypto-service/index.ts');
  assert.match(src, /소프트-패스/);
  // 즉시 거부 로직 없어야 함 (Phase 2 이후)
  assert.doesNotMatch(src, /hospitalId.*403/);
});

// ──────────────────────────────────────────────
// H-2: PBKDF2 키 캐시 TTL
// ──────────────────────────────────────────────

test('[H-2] crypto-service: PBKDF2_KEY_TTL_MS 5분 정의', () => {
  const src = read('supabase/functions/crypto-service/index.ts');
  assert.match(src, /PBKDF2_KEY_TTL_MS = 5 \* 60 \* 1000/);
});

test('[H-2] crypto-service: pbkdf2KeyCachedAt 타임스탬프 사용', () => {
  const src = read('supabase/functions/crypto-service/index.ts');
  assert.match(src, /pbkdf2KeyCachedAt/);
  assert.match(src, /Date\.now\(\) - pbkdf2KeyCachedAt/);
});

test('[H-2] crypto-service: TTL 만료 시 캐시 무효화 후 재생성', () => {
  const src = read('supabase/functions/crypto-service/index.ts');
  assert.match(src, /cachedPbkdf2KeyPromise = null/);
  assert.match(src, /pbkdf2KeyCachedAt = 0/);
});

// ──────────────────────────────────────────────
// H-5: lazyEncryptProfile 중복 방지
// ──────────────────────────────────────────────

test('[H-5] authService: _lazyEncryptInFlight Set 선언', () => {
  const src = read('services/authService.ts');
  assert.match(src, /_lazyEncryptInFlight = new Set/);
});

test('[H-5] authService: 중복 호출 시 조기 반환', () => {
  const src = read('services/authService.ts');
  assert.match(src, /_lazyEncryptInFlight\.has\(profile\.id\)/);
});

test('[H-5] authService: finally 블록에서 in-flight 해제', () => {
  const src = read('services/authService.ts');
  assert.match(src, /finally/);
  assert.match(src, /_lazyEncryptInFlight\.delete\(profile\.id\)/);
});

// ──────────────────────────────────────────────
// H-7: Slack notify-signup PII 마스킹
// ──────────────────────────────────────────────

test('[H-7] authService: maskNameForLog 헬퍼 존재', () => {
  const src = read('services/authService.ts');
  assert.match(src, /function maskNameForLog/);
  assert.match(src, /\*\*/);
});

test('[H-7] authService: maskEmailForLog 헬퍼 존재', () => {
  const src = read('services/authService.ts');
  assert.match(src, /function maskEmailForLog/);
  assert.match(src, /atIdx/);
});

test('[H-7] authService: notify-signup 호출에 마스킹 적용 (1번째)', () => {
  const src = read('services/authService.ts');
  // 두 곳 모두 maskNameForLog/maskEmailForLog 사용 여부
  const nameMatches = (src.match(/maskNameForLog\(name\)/g) || []).length;
  const emailMatches = (src.match(/maskEmailForLog\(email\)/g) || []).length;
  assert.ok(nameMatches >= 2, `maskNameForLog must appear at least 2 times, got ${nameMatches}`);
  assert.ok(emailMatches >= 2, `maskEmailForLog must appear at least 2 times, got ${emailMatches}`);
});

test('[H-7] authService: 평문 name/email이 notify-signup body에 직접 사용되지 않음', () => {
  const src = read('services/authService.ts');
  // notify-signup body 안에 plain name:, email: 이 없는지 확인
  // maskNameForLog 적용 후엔 "name: maskNameForLog(name)" 패턴이어야 함
  assert.doesNotMatch(src, /notify-signup[\s\S]{0,200}body:\s*\{[\s\S]{0,100}name,/);
});
