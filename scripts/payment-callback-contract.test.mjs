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

test('billing_history has explicit is_test_payment migration', () => {
  const sql = read('supabase/migrations/20260306010000_add_billing_history_is_test_payment.sql');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS is_test_payment BOOLEAN NOT NULL DEFAULT TRUE;/);
  assert.match(sql, /UPDATE public\.billing_history/);
  assert.match(sql, /is_test_payment = TRUE/);
  assert.match(sql, /idx_billing_history_test_flag/);
});

test('payment intent billing insert writes is_test_payment from live mode flag', () => {
  const src = read('services/paymentIntentService.ts');
  // resolveIsTestPayment may be defined inline or imported from utils/paymentCompat
  assert.ok(
    /function resolveIsTestPayment\(\)/.test(src) || /import\s*\{[^}]*resolveIsTestPayment[^}]*\}\s*from\s*['"].*paymentCompat['"]/.test(src),
    'resolveIsTestPayment must be defined or imported',
  );
  assert.ok(
    /VITE_PAYMENT_LIVE_MODE/.test(src) || /resolveIsTestPayment/.test(src),
    'must reference VITE_PAYMENT_LIVE_MODE or use resolveIsTestPayment',
  );
  assert.match(src, /is_test_payment/);
});

test('plan service billing record also follows live mode flag', () => {
  const src = read('services/planService.ts');
  assert.ok(
    /function resolveIsTestPayment\(\)/.test(src) || /import\s*\{[^}]*resolveIsTestPayment[^}]*\}\s*from\s*['"].*paymentCompat['"]/.test(src),
    'resolveIsTestPayment must be defined or imported',
  );
  assert.ok(
    /VITE_PAYMENT_LIVE_MODE/.test(src) || /resolveIsTestPayment/.test(src),
    'must reference VITE_PAYMENT_LIVE_MODE or use resolveIsTestPayment',
  );
  assert.match(src, /is_test_payment/);
});

test('toss-payment-confirm contract includes is_test_payment context', () => {
  const fn = read('supabase/functions/toss-payment-confirm/index.ts');
  // Required columns must appear in any billing_history select (order-independent)
  const requiredColumns = ['hospital_id', 'payment_status', 'plan', 'billing_cycle', 'is_test_payment'];
  const selectMatch = fn.match(/\.select\("([^"]+)"\)\s*\n?\s*\.eq\("id"/);
  assert.ok(selectMatch, 'billing_history select query must exist');
  const selectedColumns = selectMatch[1].split(',').map(c => c.trim());
  for (const col of requiredColumns) {
    assert.ok(
      selectedColumns.includes(col),
      `billing_history select must include "${col}" (found: ${selectMatch[1]})`,
    );
  }
  assert.match(fn, /is_test_payment:/);
  assert.match(fn, /rpc\("process_payment_callback"/);
});

test('payment-callback edge function keeps callback->rpc contract', () => {
  const fn = read('supabase/functions/payment-callback/index.ts');
  assert.match(fn, /normalizeStatus/);
  assert.match(fn, /rpc\("process_payment_callback"/);
  assert.doesNotMatch(fn, /\.from\("billing_history"\)\s*\.update\(/);
});

test('mrr unblock report uses is_test_payment=false as live criterion', () => {
  const script = read('scripts/mrr-raw-unblock-check.mjs');
  assert.match(script, /\?select=payment_status,amount,refund_amount,credit_restore_amount,is_test_payment,created_at/);
  assert.match(script, /const isTestPayment = row\.is_test_payment !== false;/);
  assert.match(script, /completed \+ amount>0 \+ is_test_payment=false/);
  assert.match(script, /paidNonZeroLiveCount/);
  assert.match(script, /status === 'refunded'/);
  assert.match(script, /refundCashAmount/);
  assert.match(script, /restoredCreditAmount/);
});
