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
  const tabs = read('components/dashboard/DashboardOperationalTabs.tsx');
  const audit = read('components/InventoryAudit.tsx');
  const fail = read('components/FailManager.tsx');
  const order = read('components/OrderManager.tsx');
  const mobileNav = read('components/dashboard/MobileDashboardNav.tsx');

  assert.match(app, /<DashboardOperationalTabs[\s\S]*onAddFailOrder=\{handleAddOrder\}/s);
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

test('app shell guard states and settings routes stay wired', () => {
  const app = read('App.tsx');
  const tabs = read('components/dashboard/DashboardOperationalTabs.tsx');

  assert.match(app, /state\.user\?\.status === 'paused'[\s\S]*<PausedAccountScreen/s);
  assert.match(app, /state\.user\?\.role === 'dental_staff'[\s\S]*<StaffWaitingRoom/s);

  assert.match(tabs, /dashboardTab === 'settings'[\s\S]*<SettingsHub[\s\S]*onNavigate=\{onTabChange\}/s);
  assert.match(tabs, /dashboardTab === 'audit_log'[\s\S]*<AuditLogViewer[\s\S]*hospitalId=\{user\.hospitalId\}/s);

  assert.match(app, /<MobileDashboardNav[\s\S]*userPermissions=\{state\.user\?\.permissions\}[\s\S]*effectiveAccessRole=\{effectiveAccessRole\}/s);
});

test('operational smoke checklist stays available as npm script', () => {
  const pkg = read('package.json');
  const smokeScript = read('scripts/operational-smoke-checklist.mjs');

  assert.match(pkg, /"smoke:ops"\s*:\s*"node scripts\/operational-smoke-checklist\.mjs"/);
  assert.match(smokeScript, /Operational Smoke Checklist/);
  assert.match(smokeScript, /Rule: run this checklist before\/after App shell changes\./);
});
