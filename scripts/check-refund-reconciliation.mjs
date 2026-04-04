#!/usr/bin/env node

import process from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const requireEnv = args.has('--require-env');
const failOnUnreachable = args.has('--fail-on-unreachable');

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const text = readFileSync(filePath, 'utf8');
  const out = {};

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }

  return out;
}

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getBillingCycleTotalDays(billingCycle) {
  return billingCycle === 'yearly' ? 360 : 30;
}

function calcBillingDailyRate(paidAmount, billingCycle) {
  return Math.ceil(paidAmount / getBillingCycleTotalDays(billingCycle) / 10) * 10;
}

function calcUsedDays(createdAt, refundedAt, billingCycle) {
  const totalDays = getBillingCycleTotalDays(billingCycle);
  const elapsedDays = Math.ceil((new Date(refundedAt).getTime() - new Date(createdAt).getTime()) / 86400000);
  return Math.min(totalDays, Math.max(0, elapsedDays));
}

function calcExpectedRefund(row) {
  const billingCycle = row.billing_cycle ?? 'monthly';
  const cashPaidAmount = toNumber(row.amount);
  const creditUsedAmount = toNumber(row.credit_used_amount);
  const totalDays = getBillingCycleTotalDays(billingCycle);
  const refundedAt = row.refunded_at ?? row.updated_at ?? new Date().toISOString();
  const usedDays = calcUsedDays(row.created_at, refundedAt, billingCycle);
  const remainingRatio = Math.max(0, (totalDays - usedDays) / totalDays);
  const dailyRate = calcBillingDailyRate(cashPaidAmount, billingCycle);
  const usedCharge = Math.min(dailyRate * usedDays, cashPaidAmount);
  const refundAmount = Math.max(0, cashPaidAmount - usedCharge);
  const creditRestoreAmount = Math.round(creditUsedAmount * remainingRatio);

  return {
    refundAmount,
    creditRestoreAmount,
    totalRecoveryAmount: refundAmount + creditRestoreAmount,
    usedDays,
    totalDays,
  };
}

async function fetchRefundedRows({ supabaseUrl, serviceRoleKey }) {
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const query = 'select=id,payment_status,plan,billing_cycle,amount,credit_used_amount,refund_amount,credit_restore_amount,created_at,refunded_at,updated_at,is_test_payment&payment_status=eq.refunded&order=refunded_at.desc.nullslast';
  const pageSize = 500;
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const endpoint = `${baseUrl}/rest/v1/billing_history?${query}`;
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Range: `${offset}-${offset + pageSize - 1}`,
          Prefer: 'count=exact',
        },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const wrapped = new Error(detail);
      wrapped.name = 'RefundReconcileUnreachableError';
      throw wrapped;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`billing_history refunded fetch failed (${response.status}): ${body}`);
    }

    const pageRows = await response.json();
    if (!Array.isArray(pageRows)) {
      throw new Error('Unexpected refunded billing response shape: expected array');
    }

    rows.push(...pageRows);
    if (pageRows.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function main() {
  const repoRoot = process.cwd();
  const fileEnv = {
    ...readEnvFile(path.join(repoRoot, '.env')),
    ...readEnvFile(path.join(repoRoot, '.env.local')),
  };

  const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const message = 'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
    if (requireEnv) {
      console.error(`[refund-reconcile] FAIL: ${message}`);
      process.exit(1);
    }
    console.warn(`[refund-reconcile] SKIP: ${message}`);
    process.exit(0);
  }

  let rows;
  try {
    rows = await fetchRefundedRows({ supabaseUrl, serviceRoleKey });
  } catch (error) {
    if (error instanceof Error && error.name === 'RefundReconcileUnreachableError' && !failOnUnreachable) {
      console.warn(`[refund-reconcile] SKIP: unreachable (${error.message})`);
      process.exit(0);
    }
    throw error;
  }
  const liveRows = rows.filter((row) => row.is_test_payment === false);

  if (liveRows.length === 0) {
    console.log('[refund-reconcile] SKIP: live refunded billing rows not found.');
    process.exit(0);
  }

  const mismatches = [];
  for (const row of liveRows) {
    const expected = calcExpectedRefund(row);
    const actualRefundAmount = toNumber(row.refund_amount);
    const actualCreditRestoreAmount = toNumber(row.credit_restore_amount);

    if (
      actualRefundAmount !== expected.refundAmount
      || actualCreditRestoreAmount !== expected.creditRestoreAmount
    ) {
      mismatches.push({
        id: row.id,
        actualRefundAmount,
        expectedRefundAmount: expected.refundAmount,
        actualCreditRestoreAmount,
        expectedCreditRestoreAmount: expected.creditRestoreAmount,
        usedDays: expected.usedDays,
        totalDays: expected.totalDays,
      });
    }
  }

  if (mismatches.length > 0) {
    console.error(`[refund-reconcile] FAIL: ${mismatches.length}/${liveRows.length} live refunded row(s) mismatched.`);
    for (const mismatch of mismatches.slice(0, 20)) {
      console.error(
        [
          `- ${mismatch.id}`,
          `refund=${mismatch.actualRefundAmount}/${mismatch.expectedRefundAmount}`,
          `credit_restore=${mismatch.actualCreditRestoreAmount}/${mismatch.expectedCreditRestoreAmount}`,
          `days=${mismatch.usedDays}/${mismatch.totalDays}`,
        ].join(' '),
      );
    }
    process.exit(1);
  }

  console.log(`[refund-reconcile] PASS: ${liveRows.length} live refunded row(s) matched stored refund_amount / credit_restore_amount.`);
}

main().catch((error) => {
  console.error('[refund-reconcile] FAIL:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
