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

test('toss payment request writes is_test_payment from live mode flag', () => {
  const src = read('services/tossPaymentService.ts');
  assert.match(src, /function resolveIsTestPayment\(\)/);
  assert.match(src, /VITE_PAYMENT_LIVE_MODE/);
  assert.match(src, /is_test_payment: params\.isTestPayment/);
});

test('plan service billing record also follows live mode flag', () => {
  const src = read('services/planService.ts');
  assert.match(src, /function resolveIsTestPayment\(\)/);
  assert.match(src, /VITE_PAYMENT_LIVE_MODE/);
  assert.match(src, /is_test_payment: isTestPayment/);
});

test('toss-payment-confirm contract includes is_test_payment context', () => {
  const fn = read('supabase/functions/toss-payment-confirm/index.ts');
  assert.match(fn, /select\("hospital_id, payment_status, plan, billing_cycle, is_test_payment"\)/);
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
  assert.match(script, /\?select=payment_status,amount,is_test_payment,created_at/);
  assert.match(script, /const isTestPayment = row\.is_test_payment !== false;/);
  assert.match(script, /completed \+ amount>0 \+ is_test_payment=false/);
  assert.match(script, /paidNonZeroLiveCount/);
});
