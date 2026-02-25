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

test('trial policy copy is centralized and reused by landing/pricing/signup/legal flows', () => {
  const policy = read('utils/trialPolicy.ts');
  const pricing = read('components/PricingPage.tsx');
  const trialConsent = read('components/pricing/PricingTrialConsentModal.tsx');
  const signupPlan = read('components/auth/AuthSignupPlanSelect.tsx');
  const legal = read('components/shared/LegalModal.tsx');

  assert.match(policy, /export const TRIAL_OFFER_LABEL =/);
  assert.match(policy, /export const TRIAL_DATA_DELETION_POLICY_TEXT =/);
  assert.match(policy, /export const SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT =/);

  assert.match(pricing, /TRIAL_OFFER_LABEL/);
  assert.match(pricing, /TRIAL_DATA_DELETION_POLICY_TEXT/);
  assert.match(pricing, /SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT/);
  assert.match(trialConsent, /TRIAL_START_TITLE_TEXT/);
  assert.match(trialConsent, /TRIAL_START_BUTTON_TEXT/);
  assert.match(signupPlan, /TRIAL_OFFER_LABEL/);
  assert.match(legal, /TRIAL_OFFER_LABEL/);
  assert.match(legal, /TRIAL_DATA_DELETION_POLICY_TEXT/);
});

test('public pages consistently expose legal links via shared footer', () => {
  const pages = [
    'components/LandingPage.tsx',
    'components/ValuePage.tsx',
    'components/PricingPage.tsx',
    'components/ContactPage.tsx',
    'components/AnalyzePage.tsx',
    'components/ReviewsPage.tsx',
  ];

  for (const page of pages) {
    const src = read(page);
    assert.match(src, /<PublicInfoFooter\s+showLegalLinks\s*\/>/, `${page} should render shared legal footer`);
  }
});

test('legal modal includes required SaaS subscription clauses', () => {
  const src = read('components/shared/LegalModal.tsx');

  assert.match(src, /자동.?갱신/);
  assert.match(src, /해지, 청약철회, 환불/);
  assert.match(src, /청약철회/);
  assert.match(src, /서비스 변경, 중단, 종료/);
  assert.match(src, /책임 범위/);
  assert.match(src, /분쟁처리 및 관할/);
});

test('pricing payment modal enforces consent and accessibility requirements', () => {
  const src = read('components/pricing/PricingPaymentModal.tsx');

  assert.match(src, /role="dialog"/);
  assert.match(src, /aria-modal="true"/);
  assert.match(src, /aria-labelledby="pricing-payment-title"/);
  assert.match(src, /aria-describedby="pricing-payment-desc"/);
  assert.match(src, /event\.key === 'Escape'/);
  assert.match(src, /event\.key !== 'Tab'/);
  assert.match(src, /aria-label="결제 모달 닫기"/);
  assert.match(src, /!agreedToPaymentPolicy/);
  assert.match(src, /requestError &&/);
});

test('waitlist/trial/legal modals keep keyboard and aria primitives', () => {
  const waitlist = read('components/pricing/PricingWaitlistModal.tsx');
  const trial = read('components/pricing/PricingTrialConsentModal.tsx');
  const legal = read('components/shared/LegalModal.tsx');
  const auth = read('components/AuthForm.tsx');

  assert.match(waitlist, /role="dialog"/);
  assert.match(waitlist, /aria-modal="true"/);
  assert.match(waitlist, /event\.key === 'Escape'/);
  assert.match(waitlist, /aria-label="대기 신청 모달 닫기"/);

  assert.match(trial, /role="dialog"/);
  assert.match(trial, /aria-modal="true"/);
  assert.match(trial, /event\.key === 'Escape'/);
  assert.match(trial, /aria-label="무료 체험 동의 모달 닫기"/);

  assert.match(legal, /role="dialog"/);
  assert.match(legal, /aria-modal="true"/);
  assert.match(legal, /event\.key === 'Escape'/);

  assert.match(auth, /role="dialog"/);
  assert.match(auth, /aria-modal="true"/);
  assert.match(auth, /auth-waitlist-title/);
  assert.match(auth, /event\.key === 'Escape'/);
});

test('mobile analyze entry uses fallback journey instead of desktop-only action', () => {
  const landing = read('components/LandingPage.tsx');
  const appShell = read('components/app/PublicAppShell.tsx');
  const contact = read('components/ContactPage.tsx');
  const mobileNav = read('components/PublicMobileNav.tsx');

  assert.match(landing, /isMobileViewport \? '도입 문의하기' : '무료 분석하기'/);
  assert.match(landing, /무료분석은 PC 전용입니다 · 모바일에서는 문의로 안내해 드립니다/);
  assert.match(appShell, /무료분석은 PC에서 이용 가능합니다\. 문의 페이지로 안내합니다\./);
  assert.match(appShell, /onNavigate\('contact'\)/);
  assert.match(contact, /onAnalyze && isMobileViewport/);
  assert.match(mobileNav, /분석 문의/);
});

test('payment failure path offers alternative actions (consultation and free-plan fallback)', () => {
  const pricing = read('components/PricingPage.tsx');
  const paymentModal = read('components/pricing/PricingPaymentModal.tsx');

  assert.match(pricing, /const \[paymentRequestError, setPaymentRequestError\]/);
  assert.match(pricing, /onRecommendAlternativePlan=\{handleRecommendAlternativePlan\}/);
  assert.match(pricing, /setPaymentRequestError\('결제 요청이 접수되지 않았습니다\./);
  assert.match(paymentModal, /결제가 어려우시면 도입 상담으로 전환하기/);
  assert.match(paymentModal, /Free 플랜 먼저 보기/);
  assert.match(paymentModal, /도입 상담 연결/);
});

test('core public conversion events stay instrumented', () => {
  const pricing = read('components/PricingPage.tsx');
  const contact = read('components/ContactPage.tsx');
  const auth = read('components/AuthForm.tsx');

  assert.match(pricing, /'pricing_plan_select'/);
  assert.match(pricing, /'waitlist_submit'/);
  assert.match(pricing, /'pricing_payment_modal_open'/);
  assert.match(pricing, /'pricing_payment_request_start'/);
  assert.match(pricing, /'pricing_payment_request_success'/);
  assert.match(pricing, /'pricing_payment_request_error'/);
  assert.match(contact, /'contact_submit'/);
  assert.match(auth, /'auth_start'/);
  assert.match(auth, /'auth_complete'/);
});

test('mobile bottom nav offset is applied to public toasts', () => {
  const pricing = read('components/PricingPage.tsx');
  const contact = read('components/ContactPage.tsx');
  const notices = read('components/NoticeBoard.tsx');
  const app = read('App.tsx');
  const overlays = read('components/app/AppGlobalOverlays.tsx');

  assert.match(pricing, /bottom-\[calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\] xl:bottom-6/);
  assert.match(contact, /bottom-\[calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\] xl:bottom-6/);
  assert.match(notices, /fullPage \? 'bottom-\[calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\] xl:bottom-6' : 'bottom-6'/);

  assert.match(overlays, /showMobilePublicNav: boolean/);
  assert.match(overlays, /const shouldLiftToastForBottomNav = showMobileDashboardNav \|\| showMobilePublicNav;/);
  assert.match(overlays, /'calc\(5\.5rem \+ env\(safe-area-inset-bottom\)\)'/);
  assert.match(overlays, /style=\{toastBottomOffset \? \{ bottom: toastBottomOffset \} : undefined\}/);

  assert.match(app, /const showMobilePublicNav = isPublicBottomNavView && isNarrowViewport;/);
  assert.match(app, /showMobilePublicNav=\{showMobilePublicNav\}/);
});
