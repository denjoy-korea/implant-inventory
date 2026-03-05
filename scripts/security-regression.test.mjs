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

test('crypto utils delegate encryption to crypto-service edge function', () => {
  const src = read('services/cryptoUtils.ts');
  assert.match(src, /const CRYPTO_SERVICE_URL = `\$\{SUPABASE_URL\}\/functions\/v1\/crypto-service`/);
  assert.match(src, /async function callCryptoService/);
});

test('crypto utils use anon key only for api gateway routing', () => {
  const src = read('services/cryptoUtils.ts');
  assert.match(src, /'apikey': SUPABASE_ANON_KEY/);
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
  // on* handler blocking: either explicit check OR DOMPurify whitelist (ALLOWED_ATTR without on*)
  assert.ok(
    /if \(name\.startsWith\('on'\)\) return;/.test(sanitizer)
    || /DOMPurify/.test(sanitizer),
    'htmlSanitizer must block on* event handlers (via custom check or DOMPurify)',
  );
  // protocol check: either positive allowlist or negative blocklist form
  assert.ok(
    /parsed\.protocol === 'http:' \|\| parsed\.protocol === 'https:'/.test(sanitizer)
    || /parsed\.protocol !== 'http:'/.test(sanitizer),
    'htmlSanitizer must check href protocol (http/https only)',
  );
});

test('phase2 SQL migration keeps critical permission guards', () => {
  const primary = path.join(REPO_ROOT, 'supabase/022_security_integrity_phase2.sql');
  const archive = path.join(REPO_ROOT, 'supabase/_archive/022_security_integrity_phase2.sql');
  assert.ok(existsSync(primary) || existsSync(archive), 'Expected 022_security_integrity_phase2.sql in supabase/ or supabase/_archive/');
  const sql = readFileSync(existsSync(primary) ? primary : archive, 'utf8');

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

test('free plan max item limit is 50', () => {
  // PLAN_LIMITS may be in types/plan.ts (re-exported from types.ts after refactoring)
  const typesTs = read('types.ts');
  const planTs = read('types/plan.ts');
  const combined = typesTs + planTs;
  assert.match(combined, /free:\s*\{[\s\S]*?maxItems:\s*50[\s\S]*?\}/m);
});

test('crypto utils request auth token for encryption and decryption', () => {
  const src = read('services/cryptoUtils.ts');
  assert.match(src, /headers\['Authorization'\] = `Bearer \$\{token\}`/);
});

test('gemini api key is not injected into client bundle via vite define', () => {
  const cfg = read('vite.config.ts');
  assert.doesNotMatch(cfg, /GEMINI_API_KEY/);
  assert.doesNotMatch(cfg, /process\.env\.API_KEY/);
});

test('payment uses server-side confirmation via edge function (TossPayments)', () => {
  // makePaymentService.ts was replaced by tossPaymentService.ts (TossPayments API integration)
  const src = read('services/tossPaymentService.ts');
  // Client webhook URL must not be exposed
  assert.doesNotMatch(src, /VITE_MAKE_WEBHOOK_URL/);
  // Payment confirmation must go through a server-side edge function
  assert.match(src, /functions\.invoke/);
  // Edge function name for server-side confirmation
  assert.match(src, /toss-payment-confirm/);
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

test('toss-payment-confirm edge function price table is in sync with PLAN_PRICING', () => {
  // Edge Function has its own copy of prices (Deno cannot import from client TS).
  // This test ensures both tables are kept in sync to prevent "Amount mismatch" payment failures.
  const edgeFn = read('supabase/functions/toss-payment-confirm/index.ts');
  const clientTypes = read('types/plan.ts');

  // Extract edge function prices via regex
  const extractEdgePrice = (plan, cycle) => {
    const re = new RegExp(`${plan}:\\s*\\{[^}]*${cycle}:\\s*(\\d+)`);
    const m = edgeFn.match(re);
    return m ? parseInt(m[1], 10) : null;
  };
  // Extract client prices via regex
  const extractClientPrice = (plan, cycle) => {
    const re = new RegExp(`${plan}:\\s*\\{[^}]*${cycle}Price:\\s*(\\d+)`);
    const m = clientTypes.match(re);
    return m ? parseInt(m[1], 10) : null;
  };

  for (const plan of ['basic', 'plus', 'business']) {
    const edgeMonthly = extractEdgePrice(plan, 'monthly');
    const edgeYearly = extractEdgePrice(plan, 'yearly');
    const clientMonthly = extractClientPrice(plan, 'monthly');
    const clientYearly = extractClientPrice(plan, 'yearly');

    assert.notEqual(edgeMonthly, null, `Edge Function missing monthly price for ${plan}`);
    assert.notEqual(clientMonthly, null, `types/plan.ts missing monthly price for ${plan}`);
    assert.equal(edgeMonthly, clientMonthly, `Monthly price mismatch for ${plan}: edge=${edgeMonthly} client=${clientMonthly}`);
    assert.equal(edgeYearly, clientYearly, `Yearly price mismatch for ${plan}: edge=${edgeYearly} client=${clientYearly}`);
  }
});

test('toss-payment-confirm edge function verifies caller owns the billing record', () => {
  const fn = read('supabase/functions/toss-payment-confirm/index.ts');
  // Must extract and verify the JWT
  assert.match(fn, /auth\.getUser\(\)/);
  // Must check the caller's hospital matches the billing record
  assert.match(fn, /profile\.hospital_id/);
  assert.match(fn, /Access denied/);
});
