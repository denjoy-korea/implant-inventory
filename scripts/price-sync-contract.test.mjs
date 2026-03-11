/**
 * M-05: FALLBACK_PRICES (Edge Function) ↔ PLAN_PRICING (types/plan.ts) 동기화 검증
 *
 * Edge Function의 서버사이드 정가 폴백 테이블이 클라이언트 types와 일치하는지 확인합니다.
 * 불일치 시 DB 조회 실패 시 폴백 금액이 틀려 결제 승인 오류가 발생할 수 있습니다.
 *
 * 실행: node scripts/price-sync-contract.test.mjs
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── 1. Edge Function에서 FALLBACK_PRICES 추출 ──
const edgeFnPath = resolve(root, 'supabase/functions/toss-payment-confirm/index.ts');
const edgeFnSrc = readFileSync(edgeFnPath, 'utf-8');

const edgePriceBlock = edgeFnSrc.match(
  /const FALLBACK_PRICES[^=]*=\s*(\{[\s\S]*?\n\};)/
);
assert.ok(edgePriceBlock, 'FALLBACK_PRICES block not found in Edge Function (renamed from PLAN_BASE_PRICES)');

// Parse each plan line: plan: { monthly: N, yearly: N }
const edgePrices = {};
const planLineRe = /(\w+):\s*\{\s*monthly:\s*(\d+),\s*yearly:\s*(\d+)\s*\}/g;
let match;
while ((match = planLineRe.exec(edgePriceBlock[1])) !== null) {
  edgePrices[match[1]] = { monthly: Number(match[2]), yearly: Number(match[3]) };
}

assert.ok(Object.keys(edgePrices).length > 0, 'No plans parsed from FALLBACK_PRICES');

// ── 2. types/plan.ts에서 PLAN_PRICING 추출 ──
const planTsPath = resolve(root, 'types/plan.ts');
const planTsSrc = readFileSync(planTsPath, 'utf-8');

const clientPriceBlock = planTsSrc.match(
  /export const PLAN_PRICING[^=]*=\s*(\{[\s\S]*?\n\};)/
);
assert.ok(clientPriceBlock, 'PLAN_PRICING block not found in types/plan.ts');

const clientPrices = {};
const clientLineRe = /(\w+):\s*\{\s*monthlyPrice:\s*(\d+),\s*yearlyPrice:\s*(\d+)\s*\}/g;
while ((match = clientLineRe.exec(clientPriceBlock[1])) !== null) {
  clientPrices[match[1]] = { monthly: Number(match[2]), yearly: Number(match[3]) };
}

// ── 3. 유료 플랜 동기화 검증 ──
const paidPlans = Object.keys(edgePrices);
console.log(`Checking ${paidPlans.length} paid plans: ${paidPlans.join(', ')}`);

for (const plan of paidPlans) {
  const edge = edgePrices[plan];
  const client = clientPrices[plan];

  assert.ok(client, `Plan "${plan}" exists in Edge Function but missing in types/plan.ts`);

  assert.strictEqual(
    edge.monthly, client.monthly,
    `[${plan}] monthly price mismatch: Edge=${edge.monthly}, Client=${client.monthly}`
  );
  assert.strictEqual(
    edge.yearly, client.yearly,
    `[${plan}] yearly price mismatch: Edge=${edge.yearly}, Client=${client.yearly}`
  );

  console.log(`  ${plan}: monthly=${edge.monthly}, yearly=${edge.yearly} -- OK`);
}

// ── 4. 역방향 검증: 클라이언트에 유료 플랜이 있는데 Edge에 없는 경우 ──
const clientPaidPlans = Object.entries(clientPrices)
  .filter(([, v]) => v.monthly > 0 || v.yearly > 0)
  .map(([k]) => k);

for (const plan of clientPaidPlans) {
  assert.ok(
    edgePrices[plan],
    `Plan "${plan}" is paid in types/plan.ts (monthly=${clientPrices[plan].monthly}) but missing in Edge Function FALLBACK_PRICES`
  );
}

console.log(`\nAll ${paidPlans.length} plans in sync. Contract test passed.`);
