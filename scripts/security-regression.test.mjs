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
  const systemAdminManualTab = read('components/system-admin/SystemAdminManualTab.tsx');
  const editor = read('components/NoticeEditor.tsx');
  const sanitizer = read('services/htmlSanitizer.ts');

  assert.match(
    noticeBoard,
    /dangerouslySetInnerHTML=\{\{ __html: sanitizeRichHtml\(notice\.content\) \}\}/,
  );
  assert.ok(
    /dangerouslySetInnerHTML=\{\{ __html: sanitizeRichHtml\(selected\.content\) \}\}/.test(systemAdmin)
    || /dangerouslySetInnerHTML=\{\{ __html: sanitizeRichHtml\(selected\.content\) \}\}/.test(systemAdminManualTab),
    'System admin rich HTML sink must be sanitized',
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

test('free plan max item limit is 100', () => {
  const typesTs = read('types.ts');
  assert.match(typesTs, /free:\s*\{[\s\S]*?maxItems:\s*100[\s\S]*?\}/m);
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

test('payment request uses edge proxy instead of client webhook url', () => {
  const src = read('services/makePaymentService.ts');
  assert.doesNotMatch(src, /VITE_MAKE_WEBHOOK_URL/);
  assert.match(src, /PAYMENT_PROXY_FUNCTION = 'payment-request-proxy'/);
  assert.match(src, /functions\.invoke\(PAYMENT_PROXY_FUNCTION/);
});

test('payment proxy validates auth scope before forwarding webhook', () => {
  const fn = read('supabase/functions/payment-request-proxy/index.ts');
  assert.match(fn, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(fn, /authClient\.auth\.getUser\(\)/);
  assert.match(fn, /\.from\("profiles"\)/);
  assert.match(fn, /\.from\("billing_history"\)/);
  assert.match(fn, /MAKE_WEBHOOK_URL/);
  assert.match(fn, /buildCallbackUrl/);
  assert.match(fn, /callback_url:/);
  assert.match(fn, /PAYMENT_CALLBACK_SECRET/);
});

test('payment callback function validates token and updates billing via rpc', () => {
  const fn = read('supabase/functions/payment-callback/index.ts');
  assert.match(fn, /PAYMENT_CALLBACK_SECRET/);
  assert.match(fn, /Invalid callback token/);
  assert.match(fn, /normalizeStatus/);
  assert.match(fn, /createClient\(supabaseUrl, serviceRoleKey/);
  assert.match(fn, /rpc\(\"process_payment_callback\"/);
  assert.match(fn, /p_billing_id/);
  assert.match(fn, /p_status/);
});

test('notice board uses Supabase-backed notices instead of localStorage cache', () => {
  const board = read('components/NoticeBoard.tsx');
  const service = read('services/noticeService.ts');
  const sql = read('supabase/032_public_notices.sql');

  assert.match(board, /noticeService\.listNotices\(/);
  assert.match(board, /noticeService\.createNotice\(/);
  assert.match(board, /noticeService\.deleteNotice\(/);
  assert.doesNotMatch(board, /localStorage\.getItem\('app_notices'\)/);
  assert.doesNotMatch(board, /localStorage\.setItem\('app_notices'/);

  assert.match(service, /from\('public_notices'\)/);
  assert.match(service, /order\('created_at'/);

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public_notices/);
  assert.match(sql, /CREATE POLICY \"public_notices_select_all\"/);
  assert.match(sql, /CREATE POLICY \"public_notices_insert_admin\"/);
  assert.match(sql, /GRANT SELECT ON public_notices TO anon, authenticated;/);
});
