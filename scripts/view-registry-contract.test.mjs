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

test('initial pathname resolution is centralized in appRouting', () => {
  const routing = read('appRouting.ts');
  const appState = read('hooks/useAppState.ts');

  assert.match(routing, /export function resolveViewFromPathname\(pathname: string\): View \| undefined/);
  assert.match(routing, /normalizedPath\.startsWith\('\/inventory\/'\)/);
  assert.match(routing, /normalizedPath\.startsWith\('\/courses\/'\)/);
  assert.match(routing, /normalizedPath === '\/admin'/);
  assert.match(routing, /export function resolveInitialViewFromLocation\(pathname: string, hash: string\): View \| undefined/);
  assert.match(routing, /hash === '#\/implant-inventory' \|\| hash === '#\/implant-inventory\/'/);

  assert.match(appState, /import \{ resolveInitialViewFromLocation \} from '\.\.\/appRouting';/);
  assert.match(appState, /const view = resolveInitialViewFromLocation\(window\.location\.pathname, window\.location\.hash\);/);
});

test('view layer and shell boundaries live in a shared registry', () => {
  const appTypes = read('types/app.ts');

  assert.match(appTypes, /export const AUTH_VIEWS: View\[] = \['login', 'signup'\];/);
  assert.match(appTypes, /export const BRAND_VIEWS: View\[] = \[/);
  assert.match(appTypes, /export const SOLUTION_VIEWS: View\[] = \[/);
  assert.match(appTypes, /export const SERVICE_HUB_VIEWS: View\[] = \['mypage', 'admin_panel'\];/);
  assert.match(appTypes, /export const PUBLIC_BOTTOM_OFFSET_VIEWS: View\[] = \['landing', 'value', 'pricing', 'contact', 'analyze', 'notices', 'reviews'\];/);
  assert.match(appTypes, /export function usesHomepageHeaderShell\(view: View\): boolean/);
  assert.match(appTypes, /return AUTH_VIEW_SET\.has\(view\) \|\| isServiceHubView\(view\);/);
  assert.match(appTypes, /export function usesPublicBottomOffset\(view: View\): boolean/);
  assert.match(appTypes, /if \(isBrandView\(view\)\) return 'brand';/);
  assert.match(appTypes, /if \(isSolutionView\(view\)\) return 'solution';/);
  assert.match(appTypes, /if \(isServiceHubView\(view\)\) return 'service-hub';/);
});

test('public app shell consumes shared view helpers instead of inline route lists', () => {
  const shell = read('components/app/PublicAppShell.tsx');
  const surface = read('hooks/usePublicShellSurface.ts');
  const chrome = read('components/app/PublicShellChrome.tsx');

  assert.match(shell, /import \{ usePublicShellSurface \} from '\.\.\/\.\.\/hooks\/usePublicShellSurface';/);
  assert.match(surface, /import \{[\s\S]*isBrandView,[\s\S]*isServiceHubView,[\s\S]*usesHomepageHeaderShell,[\s\S]*usesPublicBottomOffset,[\s\S]*\} from '\.\.\/types\/app';/s);
  assert.doesNotMatch(shell, /const publicViews: View\[] = \[/);
  assert.match(surface, /isBrandPage: isBrandView\(currentView\),/);
  assert.match(surface, /isServiceHubPage: isServiceHubView\(currentView\),/);
  assert.match(surface, /usesHomepageHeader: usesHomepageHeaderShell\(currentView\),/);
  assert.match(surface, /hasPublicMobileBottomOffset: usesPublicBottomOffset\(currentView\),/);
  assert.match(chrome, /hasPublicMobileBottomOffset && !isBrandPage && !isServiceHubPage/);
});

test('mobile public bottom-offset remains shared between logic and overlays', () => {
  const logic = read('hooks/useAppLogic.tsx');
  const viewportScaffold = read('hooks/useAppViewportScaffold.ts');
  const overlays = read('components/app/AppGlobalOverlays.tsx');
  const app = read('App.tsx');
  const shellOverlays = read('components/app/AppShellOverlays.tsx');

  assert.match(logic, /import \{ useAppViewportScaffold \} from '\.\/useAppViewportScaffold';/);
  assert.match(logic, /showMobilePublicNav,/);
  assert.match(viewportScaffold, /showMobilePublicNav: usesPublicBottomOffset\(state\.currentView\) && isNarrowViewport/);
  assert.match(overlays, /showMobileDashboardNav \|\| showMobilePublicNav/);
  assert.match(app + shellOverlays, /liftForBottomNav=\{showMobileDashboardNav \|\| showMobilePublicNav\}/);
});
