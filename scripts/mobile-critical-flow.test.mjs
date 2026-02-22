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

test('order service uses status-based CAS for concurrent order status updates', () => {
  const src = read('services/orderService.ts');

  assert.match(src, /interface UpdateOrderStatusOptions[\s\S]*expectedCurrentStatus\?: OrderStatus;/);
  assert.match(src, /if \(expectedCurrentStatus\) \{\s*query = query\.eq\('status', expectedCurrentStatus\);\s*\}/s);
  assert.match(src, /return \{ ok: false, reason: 'conflict', currentStatus \};/);
  assert.match(src, /return \{ ok: false, reason: 'not_found' \};/);
});

test('order service uses status-based CAS for concurrent order deletion', () => {
  const src = read('services/orderService.ts');

  assert.match(src, /interface DeleteOrderOptions[\s\S]*expectedCurrentStatus\?: OrderStatus;/);
  assert.match(src, /async deleteOrder\(orderId: string, options\?: DeleteOrderOptions\): Promise<OrderMutationResult>/);
  assert.match(src, /if \(expectedCurrentStatus\) \{\s*query = query\.eq\('status', expectedCurrentStatus\);\s*\}/s);
  assert.match(src, /return \{ ok: false, reason: 'conflict', currentStatus \};/);
});

test('app handles order conflict responses and re-syncs order list', () => {
  const app = read('App.tsx');

  assert.match(app, /const refreshOrdersFromServer = useCallback\(async \(\) => \{/);
  assert.match(
    app,
    /orderService\.updateStatus\(orderId,\s*status,\s*\{\s*expectedCurrentStatus:\s*currentOrder\.status,\s*receivedDate:\s*nextReceivedDate,\s*\}\)/s,
  );
  assert.match(
    app,
    /orderService\.deleteOrder\(orderId,\s*\{\s*expectedCurrentStatus:\s*currentOrder\.status,\s*\}\)/s,
  );
  assert.match(app, /if \(result\.reason === 'conflict'\)[\s\S]*refreshOrdersFromServer\(\)/s);
  assert.match(app, /if \(result\.reason === 'not_found'\)[\s\S]*refreshOrdersFromServer\(\)/s);
});

test('mobile critical operations stay wired in dashboard routes', () => {
  const app = read('App.tsx');
  const workspace = read('components/app/DashboardWorkspaceSection.tsx');
  const tabs = read('components/dashboard/DashboardOperationalTabs.tsx');
  const audit = read('components/InventoryAudit.tsx');
  const fail = read('components/FailManager.tsx');
  const order = read('components/OrderManager.tsx');
  const mobileNav = read('components/dashboard/MobileDashboardNav.tsx');

  assert.ok(
    /<DashboardOperationalTabs[\s\S]*onAddFailOrder=\{handleAddOrder\}/s.test(app)
      || /<DashboardOperationalTabs[\s\S]*onAddFailOrder=\{onAddOrder\}/s.test(workspace),
    'DashboardOperationalTabs should stay wired to fail/order handlers in App or DashboardWorkspaceSection',
  );
  assert.match(tabs, /dashboardTab === 'inventory_audit'[\s\S]*<InventoryAudit/s);
  assert.match(tabs, /dashboardTab === 'fail_management'[\s\S]*<FailManager[\s\S]*onAddFailOrder=\{onAddFailOrder\}/s);
  assert.match(
    tabs,
    /dashboardTab === 'order_management'[\s\S]*<OrderManager[\s\S]*onUpdateOrderStatus=\{onUpdateOrderStatus\}[\s\S]*onDeleteOrder=\{onDeleteOrder\}/s,
  );

  // Mobile에서는 sticky 고정이 비활성화되고(md 이상에서만 적용) 스크롤 가독성 유지
  assert.match(audit, /<thead className="[^"]*md:sticky md:top-0[^"]*"/);
  assert.match(fail, /className="md:sticky z-20/);
  assert.match(order, /className="md:sticky z-20/);

  // 모바일 하단 네비게이션이 별도 컴포넌트로 유지되고 접근성/터치 타겟을 보장
  assert.match(app, /<MobileDashboardNav[\s\S]*onTabChange=\{\(tab\) => setState\(prev => \(\{ \.\.\.prev, dashboardTab: tab \}\)\)\}/s);
  assert.match(mobileNav, /className="md:hidden fixed inset-x-0 bottom-0 z-\[230\]/);
  assert.match(mobileNav, /className=\{`min-h-11 rounded-xl/);
  assert.match(mobileNav, /aria-label=\{getDashboardTabTitle\(tab\)\}/);

  // 아이콘 전용 삭제 버튼 접근성 라벨 유지
  assert.match(order, /title="주문 삭제"\s+aria-label="주문 삭제"/);
});

test('analyze page shows upload requirement checklist and disabled reasons', () => {
  const analyze = read('components/AnalyzePage.tsx');

  assert.match(analyze, /const uploadRequirements:[\s\S]*엑셀 형식\(\.xlsx\/\.xls\) 확인/s);
  assert.match(analyze, /const analyzeDisabledReasons = \[/);
  assert.match(analyze, /분석 시작 전 체크/);
  assert.match(analyze, /analyzeDisabledReasons\.join\(/);
  assert.match(analyze, /업로드 준비 완료\. 분석을 시작할 수 있습니다\./);
});

test('analyze page classifies analyze\/lead errors and exposes retry CTA', () => {
  const analyze = read('components/AnalyzePage.tsx');
  const analyzeHelpers = read('components/analyze/analyzeHelpers.ts');

  assert.match(analyzeHelpers, /export function classifyAnalyzeError\(error: unknown\)[\s\S]*형식 오류:[\s\S]*데이터 오류:[\s\S]*네트워크 오류:/s);
  assert.match(analyzeHelpers, /export function classifyLeadSubmitError\(error: unknown\)[\s\S]*서버 오류:[\s\S]*입력 오류:[\s\S]*네트워크 오류:/s);
  assert.match(analyze, /import[\s\S]*classifyAnalyzeError[\s\S]*from '\.\/analyze\/analyzeHelpers'/s);
  assert.match(analyze, /setLeadSubmitError\(classifyLeadSubmitError\(err\)\)/);
  assert.match(analyze, /다시 전송/);
  assert.match(analyze, /onClick=\{handleLeadSubmit\}/);
});

test('analyze page strengthens success confidence with ETA and next action CTA', () => {
  const analyze = read('components/AnalyzePage.tsx');

  assert.match(analyze, /const leadSuccessCta = wantDetailedAnalysis[\s\S]*ctaLabel: '상담 일정 잡기'[\s\S]*ctaLabel: '무료로 시작하기'/s);
  assert.match(analyze, /먼저 확인할 핵심 인사이트/);
  assert.match(analyze, /접수 완료: \{leadSuccessCta\.title\}/);
  assert.match(analyze, /처리 예상시간: \{leadSuccessCta\.eta\}/);
  assert.match(analyze, /다음 단계: \{leadSuccessCta\.ctaLabel\}/);
});

test('funnel instrumentation uses standardized events and page-aware tracking', () => {
  const pageView = read('services/pageViewService.ts');
  const pricing = read('components/PricingPage.tsx');
  const auth = read('components/AuthForm.tsx');
  const analyze = read('components/AnalyzePage.tsx');
  const contact = read('components/ContactPage.tsx');
  const appState = read('hooks/useAppState.ts');

  assert.match(pageView, /event_type: `\$\{page\}_view`/);
  assert.match(pageView, /trackEvent\(event_type: string, event_data\?: EventData, page = 'pricing'\)/);
  assert.match(pageView, /markConverted\(userId: string, accountId\?: string \| null\)/);
  assert.match(appState, /pageViewService\.markConverted\(user\.id, user\.hospitalId \|\| null\)/);

  assert.match(pricing, /trackEvent\(\s*'pricing_plan_select'/);
  assert.match(auth, /trackEvent\('auth_start'/);
  assert.match(auth, /trackEvent\('auth_complete'/);
  assert.match(analyze, /trackEvent\(\s*'analyze_start'/);
  assert.match(analyze, /trackEvent\(\s*'analyze_complete'/);
  assert.match(contact, /trackEvent\('contact_submit'/);
});

test('contact success state surfaces request id and single primary next action', () => {
  const contact = read('components/ContactPage.tsx');
  const contactService = read('services/contactService.ts');

  assert.match(contactService, /export interface SubmitInquiryResult[\s\S]*requestId: string \| null;/s);
  assert.match(contactService, /async submit\(params: SubmitInquiryParams\): Promise<SubmitInquiryResult>/);
  assert.match(contact, /type SubmittedForm = typeof EMPTY_FORM & \{ requestId: string \| null \}/);
  assert.match(contact, /label: '접수번호'/);
  assert.match(contact, /다음 단계 1순위: 무료 회원가입/);
});

test('app shell guard states and settings routes stay wired', () => {
  const app = read('App.tsx');
  const guard = read('components/app/DashboardGuardedContent.tsx');
  const tabs = read('components/dashboard/DashboardOperationalTabs.tsx');

  assert.ok(
    /state\.user\?\.status === 'paused'[\s\S]*<PausedAccountScreen/s.test(app)
      || /state\.user\?\.status === 'paused'[\s\S]*<PausedAccountScreen/s.test(guard),
    'Paused guard should stay wired in App or DashboardGuardedContent',
  );
  assert.ok(
    /state\.user\?\.role === 'dental_staff'[\s\S]*<StaffWaitingRoom/s.test(app)
      || /state\.user\?\.role === 'dental_staff'[\s\S]*<StaffWaitingRoom/s.test(guard),
    'Staff waiting room guard should stay wired in App or DashboardGuardedContent',
  );

  assert.match(tabs, /dashboardTab === 'settings'[\s\S]*<SettingsHub[\s\S]*onNavigate=\{onTabChange\}/s);
  assert.match(tabs, /dashboardTab === 'audit_log'[\s\S]*<AuditLogViewer[\s\S]*hospitalId=\{user\.hospitalId\}/s);

  assert.match(app, /<MobileDashboardNav[\s\S]*userPermissions=\{state\.user\?\.permissions\}[\s\S]*effectiveAccessRole=\{effectiveAccessRole\}/s);
});

test('landing/value pages share unified trial copy policy', () => {
  const landing = read('components/LandingPage.tsx');
  const value = read('components/ValuePage.tsx');
  const policy = read('utils/trialPolicy.ts');

  assert.match(policy, /BETA_TRIAL_DEADLINE_TEXT = '2026년 3월 31일까지'/);
  assert.match(policy, /export function getTrialCopy\(now: Date = new Date\(\)\)/);
  assert.match(policy, /footnoteWithDot/);
  assert.match(policy, /footnoteWithPipe/);

  assert.match(landing, /import[\s\S]*getTrialCopy[\s\S]*from '\.\.\/utils\/trialPolicy'/s);
  assert.match(landing, /const trialCopy = getTrialCopy\(\);/);
  assert.match(landing, /DEFAULT_TRIAL_HIGHLIGHT_TEXT/);

  assert.match(value, /import[\s\S]*getTrialCopy[\s\S]*from '\.\.\/utils\/trialPolicy'/s);
  assert.match(value, /const trialCopy = getTrialCopy\(\);/);
  assert.match(value, /DEFAULT_TRIAL_HIGHLIGHT_TEXT/);
});

test('operational smoke checklist stays available as npm script', () => {
  const pkg = read('package.json');
  const smokeScript = read('scripts/operational-smoke-checklist.mjs');

  assert.match(pkg, /"smoke:ops"\s*:\s*"node scripts\/operational-smoke-checklist\.mjs"/);
  assert.match(smokeScript, /Operational Smoke Checklist/);
  assert.match(smokeScript, /Rule: run this checklist before\/after App shell changes\./);
});
