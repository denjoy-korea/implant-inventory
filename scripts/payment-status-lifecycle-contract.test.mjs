import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('billing status contract includes confirming in types and schema', () => {
  const planTypes = readFileSync('types/plan.ts', 'utf8');
  const migration = readFileSync(
    'supabase/migrations/20260404090000_billing_history_add_confirming_status.sql',
    'utf8',
  );

  assert.match(planTypes, /'pending'\s*\|\s*'confirming'\s*\|\s*'completed'/);
  assert.match(migration, /payment_status IN \('pending', 'confirming', 'completed', 'failed', 'cancelled', 'refunded'\)/);
});

test('toss-payment-confirm uses confirming-aware lifecycle helpers', () => {
  const edgeFn = readFileSync('supabase/functions/toss-payment-confirm/index.ts', 'utf8');

  assert.match(edgeFn, /const BILLING_STATUS_CONFIRMING = "confirming"/);
  assert.match(edgeFn, /async function failConfirmingBilling/);
  assert.match(edgeFn, /async function releaseConfirmingBilling/);
  assert.match(edgeFn, /\.eq\("payment_status", BILLING_STATUS_CONFIRMING\)/);
  assert.doesNotMatch(edgeFn, /\.eq\("payment_status", "pending"\)/);
});

test('toss-payment-refund enforces billing role checks and preserves refundType none', () => {
  const refundFn = readFileSync('supabase/functions/toss-payment-refund/index.ts', 'utf8');

  assert.match(refundFn, /\.select\("hospital_id, role"\)/);
  assert.match(refundFn, /Refund requires master or admin role/);
  assert.match(refundFn, /refundType: "none"/);
});

test('refund preview and edge refund share the billing settlement helper', () => {
  const helper = readFileSync('utils/billingSettlement.ts', 'utf8');
  const refundService = readFileSync('services/refundService.ts', 'utf8');
  const refundFn = readFileSync('supabase/functions/toss-payment-refund/index.ts', 'utf8');
  const userProfile = readFileSync('components/UserProfile.tsx', 'utf8');

  assert.match(helper, /export function calculateBillingRefundQuote/);
  assert.match(helper, /creditRestoreAmount/);
  assert.match(helper, /grossCommittedAmount/);
  assert.match(refundService, /calculateBillingRefundQuote/);
  assert.match(refundFn, /calculateBillingRefundQuote/);
  assert.match(userProfile, /creditRestoreAmount/);
});

test('refund persistence contract stores credit_restore_amount across db and display layers', () => {
  const migration = readFileSync(
    'supabase/migrations/20260404100000_billing_history_credit_restore_amount.sql',
    'utf8',
  );
  const planTypes = readFileSync('types/plan.ts', 'utf8');
  const billingDisplay = readFileSync('utils/billingDisplay.ts', 'utf8');
  const adminBilling = readFileSync('hooks/admin/useAdminBilling.ts', 'utf8');

  assert.match(migration, /ADD COLUMN IF NOT EXISTS credit_restore_amount numeric/);
  assert.match(migration, /credit_restore_amount\s*=\s*v_credit_restore/);
  assert.match(migration, /RETURNS TABLE \([\s\S]*credit_restore_amount\s+numeric/);
  assert.match(planTypes, /credit_restore_amount: number \| null;/);
  assert.match(billingDisplay, /credit_restore_amount\?: number \| string \| null/);
  assert.match(billingDisplay, /creditRestoreAmount:/);
  assert.match(adminBilling, /totalCreditRestores/);
});

test('refund reconciliation smoke gate validates persisted recovery values', () => {
  const pkg = readFileSync('package.json', 'utf8');
  const smokeAuto = readFileSync('scripts/smoke-auto.mjs', 'utf8');
  const smokeRefund = readFileSync('scripts/check-refund-reconciliation.mjs', 'utf8');

  assert.match(pkg, /"smoke:refund"\s*:\s*"node scripts\/check-refund-reconciliation\.mjs"/);
  assert.match(pkg, /"smoke:refund:strict"\s*:\s*"node scripts\/check-refund-reconciliation\.mjs --require-env --fail-on-unreachable"/);
  assert.match(pkg, /"verify:release".*smoke:refund:strict/);
  assert.match(smokeAuto, /check-refund-reconciliation\.mjs/);
  assert.match(smokeRefund, /payment_status=eq\.refunded/);
  assert.match(smokeRefund, /credit_restore_amount/);
  assert.match(smokeRefund, /refund_amount/);
  assert.match(smokeRefund, /is_test_payment === false/);
  assert.match(smokeRefund, /fail-on-unreachable/);
});
