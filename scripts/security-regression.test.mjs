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

test('free plan max item limit is 80', () => {
  const typesTs = read('types.ts');
  assert.match(typesTs, /free:\s*\{[\s\S]*?maxItems:\s*80[\s\S]*?\}/m);
});
