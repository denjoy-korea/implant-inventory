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

test('shared plan payment quote module exists and encodes the canonical amount order', () => {
  const src = read('services/planPaymentQuote.ts');
  assert.match(src, /export function buildPlanPaymentQuote/);
  assert.match(src, /const baseAfterCoupon = Math\.max\(0, baseAmount - couponDiscountAmount\);/);
  assert.match(src, /const totalAfterCoupon = Math\.round\(baseAfterCoupon \* 1\.1\);/);
  assert.match(src, /const maxCreditUsable = Math\.max\(0, Math\.min\(creditBalance, totalAfterUpgradeCredit\)\);/);
  assert.match(src, /export function buildPlanOrderName/);
});

test('pricing payment modal uses the shared quote builder', () => {
  const src = read('components/pricing/PricingPaymentModal.tsx');
  assert.match(src, /import \{ buildPlanPaymentQuote, type PlanPaymentQuote \} from ['"]\.\.\/\.\.\/services\/planPaymentQuote['"];/);
  assert.match(src, /const quote = paymentQuote \?\? buildPlanPaymentQuote\(/);
  assert.match(src, /const payableTotal = quote\.payableTotal;/);
});

test('direct payment flow consumes the shared quote builder', () => {
  const modal = read('components/DirectPaymentModal.tsx');
  assert.match(modal, /import \{ buildPlanPaymentQuote, calcPlanBaseAmount \} from ['"]\.\.\/services\/planPaymentQuote['"];/);
  assert.match(modal, /const paymentQuote = plan && plan !== 'free'/);
  assert.match(modal, /paymentQuote=\{paymentQuote\}/);
});

test('payment intent layer centralizes hosted payment preparation', () => {
  const src = read('services/paymentIntentService.ts');
  assert.match(src, /export function preparePlanPaymentIntent/);
  assert.match(src, /export function prepareServicePurchasePaymentIntent/);
  assert.match(src, /export async function executeHostedPaymentIntent/);
  assert.match(src, /createPlanPaymentMetadata/);
  assert.match(src, /createServicePurchasePaymentMetadata/);
  assert.match(src, /serializePaymentMetadata/);
  assert.match(src, /paymentQuote\.baseAmount/);
  assert.match(src, /storePendingPaymentRedirectState/);
  assert.match(src, /clearPendingPaymentRedirectState/);
});

test('toss payment service is now a thin provider adapter over payment intents', () => {
  const service = read('services/tossPaymentService.ts');
  assert.match(service, /preparePlanPaymentIntent/);
  assert.match(service, /prepareServicePurchasePaymentIntent/);
  assert.match(service, /executeHostedPaymentIntent/);
  assert.match(service, /const tossHostedPaymentProvider = \{/);
  assert.match(service, /return executeHostedPaymentIntent\(intent, tossHostedPaymentProvider\);/);
});

test('same-plan renewal path also reuses the shared quote builder for credit usage', () => {
  const src = read('hooks/usePublicPlanActions.ts');
  assert.match(src, /import \{ buildPlanPaymentQuote \} from ['"]\.\.\/services\/planPaymentQuote['"];/);
  assert.match(src, /const paymentQuote = buildPlanPaymentQuote\(/);
  assert.match(src, /creditUsedAmount: paymentQuote\.appliedCreditBalance \|\| undefined,/);
});

test('payment redirect page reads typed pending payment state via helper', () => {
  const src = read('components/payment/PaymentRedirectPage.tsx');
  assert.match(src, /getPendingPaymentRedirectState/);
  assert.match(src, /clearPendingPaymentRedirectState/);
  assert.match(src, /const \[resolvedPaymentType, setResolvedPaymentType\]/);
});

test('payment metadata helpers support structured descriptions and legacy service arrays', () => {
  const src = read('utils/paymentMetadata.ts');
  const products = read('utils/paymentProducts.ts');
  assert.match(src, /export type PaymentMetadataKind = 'plan_payment' \| 'service_purchase';/);
  assert.match(src, /export function createPlanPaymentMetadata/);
  assert.match(src, /export function createServicePurchasePaymentMetadata/);
  assert.match(src, /export function parsePaymentMetadata/);
  assert.match(src, /export function extractServicePurchaseItems/);
  assert.match(src, /parseLegacyServicePurchaseMetadata/);
  assert.match(src, /product:/);
  assert.match(products, /export interface PaymentProductDescriptor/);
  assert.match(products, /export function createPlanPaymentProductDescriptor/);
  assert.match(products, /export function createServicePurchaseProductDescriptor/);
  assert.match(products, /export function parsePaymentProductDescriptor/);
});

test('billing display helpers centralize metadata-derived labels and amount breakdowns', () => {
  const src = read('utils/billingDisplay.ts');
  assert.match(src, /export function buildBillingDisplayModel/);
  assert.match(src, /export function getBillingPlanDisplayLabel/);
  assert.match(src, /export function getBillingCycleDisplayLabel/);
  assert.match(src, /export function getBillingPaymentMethodDisplayLabel/);
  assert.match(src, /buildBillingSettlementSnapshot/);
  assert.match(src, /couponDiscountAmount/);
  assert.match(src, /upgradeCreditAmount/);
  assert.match(src, /creditUsedAmount/);
});

test('billing UIs and confirm flow consume shared payment helpers', () => {
  const myPage = read('components/MyPage.tsx');
  assert.match(myPage, /buildBillingDisplayModel/);
  assert.match(myPage, /display\.paymentMethodLabel/);
  assert.match(myPage, /display\.breakdown\.couponDiscountAmount/);

  const edgeFn = read('supabase/functions/toss-payment-confirm/index.ts');
  assert.match(edgeFn, /extractServicePurchaseItems/);

  const billingTab = read('components/system-admin/tabs/SystemAdminBillingTab.tsx');
  assert.match(billingTab, /buildBillingDisplayModel/);
  assert.match(billingTab, /getBillingPlanDisplayLabel/);
  assert.match(billingTab, /confirming/);

  const adminBillingHook = read('hooks\/admin\/useAdminBilling.ts');
  assert.match(adminBillingHook, /buildBillingDisplayModel/);
  assert.match(adminBillingHook, /getBillingPaymentMethodDisplayLabel/);

  const adminPanel = read('components/AdminPanel.tsx');
  assert.match(adminPanel, /buildBillingDisplayModel/);
  assert.match(adminPanel, /confirming/);
});
