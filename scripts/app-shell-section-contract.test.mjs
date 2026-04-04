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

test('App shell delegates chrome, dashboard routes, and overlays to dedicated sections', () => {
  const app = read('App.tsx');
  const frame = read('components/app/AppShellFrame.tsx');
  const sidebarChrome = read('components/app/AppSidebarChrome.tsx');
  const dashboardRoute = read('components/app/AppDashboardRouteSection.tsx');
  const overlays = read('components/app/AppShellOverlays.tsx');

  assert.match(app, /import AppShellFrame from '\.\/components\/app\/AppShellFrame';/);
  assert.match(app, /import AppShellOverlays from '\.\/components\/app\/AppShellOverlays';/);
  assert.match(app, /<AppShellFrame[\s\S]*workspaceProps=\{workspaceProps\}[\s\S]*onOpenSupportChat=\{openSupportChat\}/s);
  assert.match(app, /<AppShellOverlays[\s\S]*globalOverlayPartialProps=\{globalOverlayPartialProps\}[\s\S]*supportChatOpenRequest=\{supportChatOpenRequest\}/s);
  assert.doesNotMatch(app, /<Sidebar/);
  assert.doesNotMatch(app, /<AppSidebarChrome/);
  assert.doesNotMatch(app, /<AppDashboardRouteSection/);
  assert.doesNotMatch(app, /<DashboardHeader/);
  assert.doesNotMatch(app, /<BillingProgramGate/);
  assert.doesNotMatch(app, /<DashboardGuardedContent/);
  assert.doesNotMatch(app, /<MobileDashboardNav/);
  assert.doesNotMatch(app, /<DirectPaymentModal/);
  assert.doesNotMatch(app, /<SupportChatWidget/);
  assert.doesNotMatch(app, /<AppGlobalOverlays/);

  assert.match(frame, /import AppSidebarChrome from '\.\/AppSidebarChrome';/);
  assert.match(frame, /import AppDashboardRouteSection from '\.\/AppDashboardRouteSection';/);
  assert.match(frame, /<AppSidebarChrome[\s\S]*onOpenProfilePlan=\{workspaceProps\.onOpenProfilePlan\}/s);
  assert.match(frame, /<AppDashboardRouteSection[\s\S]*workspaceProps=\{workspaceProps\}[\s\S]*onOpenSupportChat=\{onOpenSupportChat\}/s);
  assert.match(frame, /<AppPublicRouteSection/);
  assert.match(frame, /<AccountSuspendedScreen/);
  assert.doesNotMatch(frame, /<Sidebar/);
  assert.doesNotMatch(frame, /<DashboardHeader/);
  assert.doesNotMatch(frame, /<BillingProgramGate/);
  assert.doesNotMatch(frame, /<DashboardGuardedContent/);
  assert.doesNotMatch(frame, /<SystemAdminDashboard/);
  assert.doesNotMatch(frame, /<MobileDashboardNav/);

  assert.match(sidebarChrome, /<Sidebar/);
  assert.match(sidebarChrome, /onUpgrade=\{onOpenProfilePlan\}/);
  assert.match(sidebarChrome, /onOpenSupportChat=\{onOpenSupportChat\}/);
  assert.doesNotMatch(sidebarChrome, /<DashboardHeader/);
  assert.doesNotMatch(sidebarChrome, /<BillingProgramGate/);
  assert.doesNotMatch(sidebarChrome, /<DashboardGuardedContent/);
  assert.doesNotMatch(sidebarChrome, /<MobileDashboardNav/);

  assert.match(dashboardRoute, /<BillingProgramGate/);
  assert.match(dashboardRoute, /<DashboardHeader/);
  assert.match(dashboardRoute, /<DashboardGuardedContent/);
  assert.match(dashboardRoute, /<SystemAdminDashboard/);
  assert.match(dashboardRoute, /<MobileDashboardNav/);
  assert.match(dashboardRoute, /onOpenSupportChat=\{onOpenSupportChat\}/);
  assert.doesNotMatch(dashboardRoute, /<Sidebar/);

  assert.match(overlays, /<AppUserOverlayStack \{\.\.\.userOverlayProps\} \/>/);
  assert.match(overlays, /<DirectPaymentModal/);
  assert.match(overlays, /<FailDetectionModal/);
  assert.match(overlays, /<SupportChatWidget/);
  assert.match(overlays, /<AppGlobalOverlays/);
  assert.match(overlays, /liftForBottomNav=\{showMobileDashboardNav \|\| showMobilePublicNav\}/);
});
