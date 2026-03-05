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

test('trial duration policy is aligned to default 14 days with beta-started 28-day exception', () => {
  const policy = read('utils/trialPolicy.ts');
  const types = read('types.ts');
  // TRIAL_DAYS may be in types/plan.ts and re-exported from types.ts after refactoring
  const planTypes = read('types/plan.ts');
  const planService = read('services/planService.ts');
  const systemAdminDomain = read('components/system-admin/systemAdminDomain.ts');
  const sql = read('supabase/048_trial_policy_14_28_alignment.sql');

  assert.match(types + planTypes, /export const TRIAL_DAYS = 14;/);
  assert.match(policy, /export const DEFAULT_TRIAL_DAYS = 14;/);
  assert.match(policy, /export const BETA_TRIAL_DAYS = 28;/);
  assert.match(policy, /BETA_TRIAL_CUTOFF_KST_ISO = '2026-04-01T00:00:00\+09:00'/);
  assert.match(
    policy,
    /return isBetaTrialEligibleByStart\(trialStartedAt\) \? BETA_TRIAL_DAYS : DEFAULT_TRIAL_DAYS;/,
  );

  // Runtime consumers should reuse shared policy helper instead of hard-coding day counts.
  assert.match(planService, /import \{ getTrialDurationDays \} from '\.\.\/utils\/trialPolicy';/);
  assert.match(systemAdminDomain, /import \{ getTrialDurationDays \} from '\.\.\/\.\.\/utils\/trialPolicy';/);

  // SQL expiry policy must mirror the same 14/28 rule by trial start timestamp.
  assert.match(sql, /CREATE OR REPLACE FUNCTION _trial_duration_days/);
  assert.match(sql, /THEN 28/);
  assert.match(sql, /ELSE 14/);
});

test('public pages consistently expose legal links via shared footer', () => {
  const pages = [
    'components/LandingPage.tsx',
    'components/ValuePage.tsx',
    'components/PricingPage.tsx',
    'components/ContactPage.tsx',
    'components/ReviewsPage.tsx',
  ];

  for (const page of pages) {
    const src = read(page);
    assert.match(src, /<PublicInfoFooter\s+showLegalLinks\s*\/>/, `${page} should render shared legal footer`);
  }

  // AnalyzePage was split into step components; legal footer lives in upload/report steps.
  const analyze = read('components/AnalyzePage.tsx');
  const analyzeUploadStep = read('components/analyze/AnalyzeUploadStep.tsx');
  const analyzeReportStep = read('components/analyze/AnalyzeReportStep.tsx');

  assert.match(analyze, /AnalyzeUploadStep/);
  assert.match(analyze, /AnalyzeReportStep/);
  assert.match(analyzeUploadStep, /<PublicInfoFooter\s+showLegalLinks\s*\/>/);
  assert.match(analyzeReportStep, /<PublicInfoFooter\s+showLegalLinks\s*\/>/);
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
  // ModalShell provides role=dialog, aria-modal, Escape/Tab focus-trap
  // and maps titleId→aria-labelledby, describedBy→aria-describedby
  const usesModalShell = /ModalShell/.test(src);

  assert.ok(usesModalShell || /role="dialog"/.test(src), 'role=dialog or ModalShell required');
  assert.ok(usesModalShell || /aria-modal="true"/.test(src), 'aria-modal or ModalShell required');
  assert.ok(
    /titleId="pricing-payment-title"/.test(src) || /aria-labelledby="pricing-payment-title"/.test(src),
    'pricing-payment-title labelledby required',
  );
  assert.ok(
    /describedBy="pricing-payment-desc"/.test(src) || /aria-describedby="pricing-payment-desc"/.test(src),
    'pricing-payment-desc describedby required',
  );
  assert.ok(usesModalShell || /event\.key === 'Escape'/.test(src), 'Escape handler or ModalShell required');
  assert.ok(usesModalShell || /event\.key !== 'Tab'/.test(src), 'Tab trap or ModalShell required');
  assert.match(src, /aria-label="결제 모달 닫기"/);
  assert.match(src, /!agreedToPaymentPolicy/);
  assert.match(src, /requestError &&/);
});

test('waitlist/trial/legal modals keep keyboard and aria primitives', () => {
  const waitlist = read('components/pricing/PricingWaitlistModal.tsx');
  const trial = read('components/pricing/PricingTrialConsentModal.tsx');
  const legal = read('components/shared/LegalModal.tsx');
  const auth = read('components/AuthForm.tsx');
  // ModalShell provides role="dialog", aria-modal="true", Escape handling via focus-trap
  const modalShell = read('components/shared/ModalShell.tsx');

  // Accessibility is satisfied if component uses ModalShell OR has native primitives
  const hasA11y = (src) => /ModalShell/.test(src) || /role="dialog"/.test(src);
  const hasEsc = (src) => /ModalShell/.test(src) || /event\.key === 'Escape'/.test(src);

  assert.ok(hasA11y(waitlist), 'waitlist: role=dialog or ModalShell required');
  assert.ok(hasEsc(waitlist), 'waitlist: Escape handler or ModalShell required');
  assert.match(waitlist, /aria-label="대기 신청 모달 닫기"/);

  assert.ok(hasA11y(trial), 'trial: role=dialog or ModalShell required');
  assert.ok(hasEsc(trial), 'trial: Escape handler or ModalShell required');
  assert.match(trial, /aria-label="무료 체험 동의 모달 닫기"/);

  assert.ok(hasA11y(legal), 'legal: role=dialog or ModalShell required');
  assert.ok(hasEsc(legal), 'legal: Escape handler or ModalShell required');

  assert.match(auth, /role="dialog"/);
  assert.match(auth, /aria-modal="true"/);
  assert.match(auth, /auth-waitlist-title/);
  assert.match(auth, /event\.key === 'Escape'/);

  // Verify ModalShell itself provides the required primitives
  assert.match(modalShell, /role.*dialog/);
  assert.match(modalShell, /aria-modal/);
  assert.match(modalShell, /Escape/);
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
  // paymentRequestError state and handler may live in usePricingPage hook after refactoring
  const pricingHook = read('hooks/usePricingPage.ts');
  const paymentModal = read('components/pricing/PricingPaymentModal.tsx');

  // State must exist somewhere in the pricing module (page or hook)
  assert.ok(
    /const \[paymentRequestError, setPaymentRequestError\]/.test(pricing) ||
    /const \[paymentRequestError, setPaymentRequestError\]/.test(pricingHook),
    'paymentRequestError state must be defined in PricingPage or usePricingPage hook',
  );
  assert.match(pricing, /onRecommendAlternativePlan=\{handleRecommendAlternativePlan\}/);
  // Error message may be set in the hook after extraction
  assert.ok(
    /setPaymentRequestError\('결제 요청이 접수되지 않았습니다\./.test(pricing) ||
    /setPaymentRequestError\('결제 요청이 접수되지 않았습니다\./.test(pricingHook),
    'payment request error message must be set in PricingPage or usePricingPage hook',
  );
  assert.match(paymentModal, /결제가 어려우시면 도입 상담으로 전환하기/);
  assert.match(paymentModal, /Free 플랜 먼저 보기/);
  assert.match(paymentModal, /도입 상담 연결/);
});

test('core public conversion events stay instrumented', () => {
  const pricing = read('components/PricingPage.tsx');
  // After hook extraction, some events may live in usePricingPage hook
  const pricingHook = read('hooks/usePricingPage.ts');
  const pricingModule = pricing + pricingHook;
  const contact = read('components/ContactPage.tsx');
  // auth tracking moved to useAuthForm hook during AuthForm refactoring
  const authHook = read('hooks/useAuthForm.ts');

  assert.ok(/'pricing_plan_select'/.test(pricingModule), "pricing_plan_select must be instrumented");
  assert.ok(/'waitlist_submit'/.test(pricingModule), "waitlist_submit must be instrumented");
  assert.ok(/'pricing_payment_modal_open'/.test(pricingModule) || /'pricing_payment_request_start'/.test(pricingModule), "payment modal open/start event must be instrumented");
  assert.ok(/'pricing_payment_request_start'/.test(pricingModule), "pricing_payment_request_start must be instrumented");
  assert.ok(/'pricing_payment_request_success'/.test(pricingModule), "pricing_payment_request_success must be instrumented");
  assert.ok(/'pricing_payment_request_error'/.test(pricingModule), "pricing_payment_request_error must be instrumented");
  assert.match(contact, /'contact_submit'/);
  assert.match(authHook, /'auth_start'/);
  assert.match(authHook, /'auth_complete'/);
});

test('mobile bottom nav offset is applied to public toasts', () => {
  const pricing = read('components/PricingPage.tsx');
  const contact = read('components/ContactPage.tsx');
  const notices = read('components/NoticeBoard.tsx');
  const app = read('App.tsx');
  const appLogic = read('hooks/useAppLogic.tsx');
  const overlays = read('components/app/AppGlobalOverlays.tsx');

  assert.match(pricing, /bottom-\[calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\] xl:bottom-6/);
  assert.match(contact, /bottom-\[calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\] xl:bottom-6/);
  assert.match(notices, /fullPage \? 'bottom-\[calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\] xl:bottom-6' : 'bottom-6'/);

  assert.match(overlays, /showMobilePublicNav: boolean/);
  assert.match(overlays, /const shouldLiftToastForBottomNav = showMobileDashboardNav \|\| showMobilePublicNav;/);
  assert.match(overlays, /'calc\(5\.5rem \+ env\(safe-area-inset-bottom\)\)'/);
  assert.match(overlays, /style=\{toastBottomOffset \? \{ bottom: toastBottomOffset \} : undefined\}/);

  // Refactor: showMobilePublicNav derivation moved to useAppLogic hook and passed via overlay props bundle.
  assert.match(appLogic, /const showMobilePublicNav = isPublicBottomNavView && isNarrowViewport;/);
  assert.match(appLogic, /showMobilePublicNav,/);
  assert.match(app, /<AppGlobalOverlays/);
  assert.match(app, /\{\.\.\.globalOverlayPartialProps\}/);
});
