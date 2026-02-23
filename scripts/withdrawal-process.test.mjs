/**
 * withdrawal-process Phase 1 정적 검증 테스트
 * 파일 내용을 분석해 구현 정확성을 검증합니다.
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
// 1. Migration SQL 검증
// ──────────────────────────────────────────────

test('[Migration] operation_logs hospital_id FK → SET NULL', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  assert.match(sql, /operation_logs_hospital_id_fkey/);
  assert.match(sql, /ON DELETE SET NULL/);
});

test('[Migration] operation_logs user_id FK → SET NULL', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  assert.match(sql, /operation_logs_user_id_fkey/);
  // 두 번째 SET NULL도 포함 확인
  const setNullCount = (sql.match(/ON DELETE SET NULL/g) || []).length;
  assert.ok(setNullCount >= 2, `ON DELETE SET NULL must appear at least 2 times, got ${setNullCount}`);
});

test('[Migration] operation_logs hospital_id/user_id NOT NULL 제거', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  assert.match(sql, /ALTER COLUMN hospital_id DROP NOT NULL/);
  assert.match(sql, /ALTER COLUMN user_id DROP NOT NULL/);
});

test('[Migration] surgery_records.anonymized_at 컬럼 추가', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ/);
});

test('[Migration] delete_my_account() 감사 로그 선기록 (삭제 전)', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  // INSERT operation_logs 가 DELETE hospitals/auth.users 보다 먼저 나와야 함
  const insertIdx = sql.indexOf("INSERT INTO operation_logs");
  const deleteHospitalIdx = sql.indexOf("DELETE FROM hospitals");
  const deleteUserIdx = sql.indexOf("DELETE FROM auth.users");
  assert.ok(insertIdx > 0, 'INSERT operation_logs must exist');
  assert.ok(insertIdx < deleteHospitalIdx, 'Audit log INSERT must come before DELETE hospitals');
  assert.ok(insertIdx < deleteUserIdx, 'Audit log INSERT must come before DELETE auth.users');
});

test('[Migration] delete_my_account() account_self_deleted 액션 사용', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  assert.match(sql, /account_self_deleted/);
});

test('[Migration] delete_my_account() surgery_records PII 익명화 (master)', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  assert.match(sql, /patient_info\s*=\s*NULL/);
  assert.match(sql, /patient_info_hash\s*=\s*NULL/);
  assert.match(sql, /anonymized_at\s*=\s*now\(\)/);
});

test('[Migration] delete_my_account() profiles PII 익명화', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  assert.match(sql, /name\s*=\s*'\[탈퇴\]'/);
  assert.match(sql, /phone\s*=\s*NULL/);
  assert.match(sql, /email_hash\s*=\s*NULL/);
  assert.match(sql, /phone_hash\s*=\s*NULL/);
});

test('[Migration] delete_my_account() SECURITY DEFINER 설정', () => {
  const sql = read('supabase/migrations/20260224100000_withdrawal_pii_anonymization.sql');
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = public/);
});

// ──────────────────────────────────────────────
// 2. admin-delete-user Edge Function 검증
// ──────────────────────────────────────────────

test('[EdgeFn] admin-delete-user surgery_records PII 익명화', () => {
  const src = read('supabase/functions/admin-delete-user/index.ts');
  assert.match(src, /patient_info: null/);
  assert.match(src, /patient_info_hash: null/);
  assert.match(src, /anonymized_at/);
});

test('[EdgeFn] admin-delete-user profiles PII 익명화', () => {
  const src = read('supabase/functions/admin-delete-user/index.ts');
  assert.match(src, /name: "\[강제탈퇴\]"/);
  assert.match(src, /phone: null/);
  assert.match(src, /email_hash: null/);
  assert.match(src, /phone_hash: null/);
});

test('[EdgeFn] admin-delete-user PII 익명화가 병원 삭제 전에 실행', () => {
  const src = read('supabase/functions/admin-delete-user/index.ts');
  const piiIdx = src.indexOf('patient_info: null');
  const deleteHospitalIdx = src.indexOf('.from("hospitals")\n        .delete()');
  assert.ok(piiIdx > 0, 'PII anonymization must exist');
  assert.ok(piiIdx < deleteHospitalIdx, 'PII anonymization must come before hospitals delete');
});

// ──────────────────────────────────────────────
// 3. operationLogService 타입 검증
// ──────────────────────────────────────────────

test('[Service] OperationAction에 account_self_deleted 포함', () => {
  const src = read('services/operationLogService.ts');
  assert.match(src, /'account_self_deleted'/);
});

test('[Service] OperationAction에 account_force_deleted 포함', () => {
  const src = read('services/operationLogService.ts');
  assert.match(src, /'account_force_deleted'/);
});

test('[Service] OperationAction에 account_deactivated 포함', () => {
  const src = read('services/operationLogService.ts');
  assert.match(src, /'account_deactivated'/);
});

test('[Service] OperationLog.hospitalId가 null 허용 타입', () => {
  const src = read('services/operationLogService.ts');
  assert.match(src, /hospitalId: string \| null/);
});

test('[Service] OperationLog.userId가 null 허용 타입', () => {
  const src = read('services/operationLogService.ts');
  assert.match(src, /userId: string \| null/);
});

test('[Service] 매핑 로직 null 핸들링 (?? null)', () => {
  const src = read('services/operationLogService.ts');
  assert.match(src, /\?\? null/);
});

// ──────────────────────────────────────────────
// 4. UserProfile.tsx UI 검증
// ──────────────────────────────────────────────

test('[UI] 탈퇴 경고 문구: 개인정보 즉시 파기 안내', () => {
  const src = read('components/UserProfile.tsx');
  assert.match(src, /개인정보\(이름, 연락처, 환자정보\)가 즉시 파기되며 복구할 수 없습니다/);
});

test('[UI] 법적 고지: PII 즉시 파기 안내', () => {
  const src = read('components/UserProfile.tsx');
  assert.match(src, /이름·연락처·환자정보는 탈퇴 즉시 파기됩니다/);
});

test('[UI] 법적 고지: 결제기록 5년 보관 안내', () => {
  const src = read('components/UserProfile.tsx');
  assert.match(src, /결제 기록은 전자상거래법에 따라 5년간 보관됩니다/);
});

test('[UI] 법적 고지: 데이터 복구 불가 안내', () => {
  const src = read('components/UserProfile.tsx');
  assert.match(src, /탈퇴 후 동일 이메일로 재가입 시 이전 데이터 복구가 불가합니다/);
});

// ──────────────────────────────────────────────
// 5. AuditLogViewer 레이블 검증
// ──────────────────────────────────────────────

test('[UI] AuditLogViewer account_self_deleted 레이블 존재', () => {
  const src = read('components/AuditLogViewer.tsx');
  assert.match(src, /account_self_deleted/);
  assert.match(src, /자발적 탈퇴/);
});

test('[UI] AuditLogViewer account_force_deleted 레이블 존재', () => {
  const src = read('components/AuditLogViewer.tsx');
  assert.match(src, /account_force_deleted/);
  assert.match(src, /강제 삭제/);
});
