import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const REPO_ROOT = process.cwd();

function read(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  assert.equal(
    existsSync(fullPath),
    true,
    `Expected file to exist: ${relPath}`,
  );
  return readFileSync(fullPath, 'utf8');
}

test('crypto utils use AES-GCM with legacy compatibility', () => {
  const src = read('services/cryptoUtils.ts');
  assert.match(src, /const ENC_V2_PREFIX = 'ENCv2:'/);
  assert.match(src, /const ENC_V1_PREFIX = 'ENC:'/);
  assert.match(src, /name:\s*'AES-GCM'/);
  assert.match(src, /legacyDecryptXor/);
});

test('crypto utils do not fall back to supabase anon key for encryption', () => {
  const src = read('services/cryptoUtils.ts');
  // VITE_SUPABASE_ANON_KEY is a public key and must not be used as an encryption secret
  assert.doesNotMatch(src, /VITE_SUPABASE_ANON_KEY/);
});

test('order service uses transactional RPC with compatibility fallback', () => {
  const src = read('services/orderService.ts');
  assert.match(src, /rpc\('create_order_with_items'/);
  assert.match(src, /rpcError\.code !== 'PGRST202'/);
  assert.match(src, /\.from\('orders'\)\s*\.insert\(order\)/s);
  assert.match(src, /\.from\('order_items'\)\s*\.insert\(orderItems\)/s);
});

test('rich HTML sinks are sanitized', () => {
  const noticeBoard = read('components/NoticeBoard.tsx');
  const systemAdmin = read('components/SystemAdminDashboard.tsx');
  const editor = read('components/NoticeEditor.tsx');
  const sanitizer = read('services/htmlSanitizer.ts');

  assert.match(
    noticeBoard,
    /dangerouslySetInnerHTML=\{\{ __html: sanitizeRichHtml\(notice\.content\) \}\}/,
  );
  assert.match(
    systemAdmin,
    /dangerouslySetInnerHTML=\{\{ __html: sanitizeRichHtml\(selected\.content\) \}\}/,
  );
  assert.match(editor, /editorRef\.current\.innerHTML = sanitizeRichHtml\(initialValue\);/);
  assert.match(sanitizer, /if \(name\.startsWith\('on'\)\) return;/);
  assert.match(
    sanitizer,
    /parsed\.protocol === 'http:' \|\| parsed\.protocol === 'https:'/,
  );
});

test('phase2 SQL migration keeps critical permission guards', () => {
  const sql = read('supabase/022_security_integrity_phase2.sql');

  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION process_payment_callback\(UUID, TEXT, TEXT\) FROM PUBLIC;/,
  );
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION process_payment_callback\(UUID, TEXT, TEXT\) FROM authenticated;/,
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION process_payment_callback\(UUID, TEXT, TEXT\) TO service_role;/,
  );
  assert.match(sql, /CREATE TRIGGER reset_request_member_update_guard/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION create_order_with_items/);
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION create_order_with_items\(JSONB, JSONB\) FROM PUBLIC;/,
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION create_order_with_items\(JSONB, JSONB\) TO authenticated;/,
  );
});

test('create_order_with_items ambiguity hotfix exists', () => {
  const sql = read('supabase/024_fix_create_order_with_items_ambiguity.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION create_order_with_items/);
  assert.match(sql, /SELECT p\.hospital_id[\s\S]*FROM profiles p[\s\S]*WHERE p\.id = auth\.uid\(\)/);
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION create_order_with_items\(JSONB, JSONB\) FROM PUBLIC;/,
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION create_order_with_items\(JSONB, JSONB\) TO authenticated;/,
  );
});

test('create_order_with_items hotfix verification query exists', () => {
  const sql = read('supabase/025_verify_create_order_hotfix.sql');
  assert.match(sql, /create_order_with_items_function_exists/);
  assert.match(sql, /create_order_with_items_uses_qualified_profile_alias/);
  assert.match(sql, /create_order_with_items_legacy_ambiguous_pattern_absent/);
  assert.match(sql, /create_order_with_items_public_execute_revoked/);
  assert.match(sql, /create_order_with_items_authenticated_execute_granted/);
});

test('patient info encryption report query exists', () => {
  const sql = read('supabase/026_patient_info_encryption_report.sql');
  assert.match(sql, /enc_v1_records/);
  assert.match(sql, /enc_v2_records/);
  assert.match(sql, /plain_records/);
  assert.match(sql, /enc_v2_ratio_percent/);
});

test('maintenance service is wired for dev operations', () => {
  const app = read('App.tsx');
  const service = read('services/securityMaintenanceService.ts');

  assert.match(app, /securityMaintenanceService/);
  assert.match(app, /__securityMaintenanceService/);

  assert.match(service, /getPatientInfoEncryptionStatus/);
  assert.match(service, /migratePatientInfoToV2/);
  assert.match(service, /like\('patient_info', 'ENC:%'\)/);
  assert.match(service, /startsWith\('ENCv2:'\)/);
});

test('free plan max item limit is 80', () => {
  const typesTs = read('types.ts');
  assert.match(typesTs, /free:\s*\{[\s\S]*?maxItems:\s*80[\s\S]*?\}/m);
});

test('crypto utils throw in production when encryption key is missing', () => {
  const src = read('services/cryptoUtils.ts');
  // Must throw (not just warn) when PROD and key is missing
  assert.match(src, /import\.meta\.env\.PROD/);
  assert.match(src, /throw new Error/);
});

test('gemini api key is not injected into client bundle via vite define', () => {
  const cfg = read('vite.config.ts');
  assert.doesNotMatch(cfg, /GEMINI_API_KEY/);
  assert.doesNotMatch(cfg, /process\.env\.API_KEY/);
});
