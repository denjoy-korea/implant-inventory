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

test('public app shell delegates route rendering to extracted route content', () => {
  const shell = read('components/app/PublicAppShell.tsx');

  assert.match(shell, /import PublicShellRouteContent from '\.\/PublicShellRouteContent';/);
  assert.match(shell, /import PublicShellChrome from '\.\/PublicShellChrome';/);
  assert.match(shell, /import \{ usePublicShellNavigation \} from '\.\.\/\.\.\/hooks\/usePublicShellNavigation';/);
  assert.match(shell, /import \{ usePublicShellSurface \} from '\.\.\/\.\.\/hooks\/usePublicShellSurface';/);
  assert.match(shell, /const \{[\s\S]*goToDenjoyLogin,[\s\S]*goToDenjoySignup,[\s\S]*handleNavigate,[\s\S]*handleAnalyzeEntry,[\s\S]*handleNavigateToCourse,[\s\S]*\} = usePublicShellNavigation\(\{/s);
  assert.match(shell, /const \{[\s\S]*isLoggedIn,[\s\S]*meta,[\s\S]*downgradePending,[\s\S]*handlePlanSelect,[\s\S]*handleRequestPayment,[\s\S]*confirmDowngrade,[\s\S]*confirmMemberSelection,[\s\S]*\} = usePublicShellSurface\(\{/s);
  assert.match(shell, /<PublicShellRouteContent[\s\S]*currentView=\{currentView\}/s);
  assert.match(shell, /onGoToDenjoyLogin=\{goToDenjoyLogin\}/);
  assert.match(shell, /onGoToDenjoySignup=\{goToDenjoySignup\}/);
  assert.match(shell, /onHandleNavigate=\{handleNavigate\}/);
  assert.match(shell, /onNavigateToCourse=\{handleNavigateToCourse\}/);
  assert.match(shell, /<PublicShellChrome[\s\S]*downgradePending=\{downgradePending\}/s);
  assert.match(shell, /<PublicShellChrome[\s\S]*confirmDowngrade=\{confirmDowngrade\}/s);
  assert.match(shell, /<PublicShellChrome[\s\S]*confirmMemberSelection=\{confirmMemberSelection\}/s);

  assert.doesNotMatch(shell, /const DENJOY_HOME =/);
  assert.doesNotMatch(shell, /const FEATURE_LABELS =/);
  assert.doesNotMatch(shell, /function getCourseMetaFromPath/);
  assert.doesNotMatch(shell, /function getDowngradeLines/);
  assert.doesNotMatch(shell, /const PAGE_META: Record<string, \{ title: string; description: string \}> = \{/);
  assert.doesNotMatch(shell, /redirectToDenjoyAuth\('/);
  assert.doesNotMatch(shell, /getPublicShellMeta\(currentView\)/);
  assert.doesNotMatch(shell, /usePublicPlanActions\(\{/);
  assert.doesNotMatch(shell, /<Helmet>/);
  assert.doesNotMatch(shell, /<Header/);
  assert.doesNotMatch(shell, /<PublicMobileNav/);
  assert.doesNotMatch(shell, /<ConfirmModal/);
  assert.doesNotMatch(shell, /<DowngradeMemberSelectModal/);
});

test('public shell auth, meta, and chrome helpers live in separate modules', () => {
  const navigation = read('hooks/usePublicShellNavigation.ts');
  const surface = read('hooks/usePublicShellSurface.ts');
  const auth = read('components/app/publicShellAuth.ts');
  const meta = read('components/app/publicShellMeta.ts');
  const metaRegistry = read('components/app/publicShellMetaRegistry.ts');
  const planMessaging = read('components/app/publicShellPlanMessaging.ts');
  const types = read('components/app/publicShellTypes.ts');
  const chrome = read('components/app/PublicShellChrome.tsx');

  assert.match(navigation, /export function usePublicShellNavigation\(/);
  assert.match(navigation, /import \{ VIEW_PATH \} from '\.\.\/appRouting';/);
  assert.match(navigation, /import \{ redirectToDenjoyAuth \} from '\.\.\/components\/app\/publicShellAuth';/);
  assert.match(navigation, /window\.history\.pushState\(null, '', pathForView\)/);
  assert.match(navigation, /window\.history\.pushState\(null, '', `\/courses\/\$\{slug\}`\)/);

  assert.match(surface, /export function usePublicShellSurface\(/);
  assert.match(surface, /import \{ usePublicPlanActions \} from '\.\/usePublicPlanActions';/);
  assert.match(surface, /import \{[\s\S]*isBrandView,[\s\S]*isServiceHubView,[\s\S]*usesHomepageHeaderShell,[\s\S]*usesPublicBottomOffset,[\s\S]*\} from '\.\.\/types\/app';/s);
  assert.match(surface, /import \{[\s\S]*buildPublicShellDowngradeCreditMessage,[\s\S]*buildPublicShellDowngradeDiff,[\s\S]*getPublicShellMeta,[\s\S]*\} from '\.\.\/components\/app\/publicShellMeta';/s);
  assert.match(surface, /const \{[\s\S]*downgradePending,[\s\S]*handlePlanSelect,[\s\S]*handleRequestPayment,[\s\S]*confirmDowngrade,[\s\S]*confirmMemberSelection,[\s\S]*\} = usePublicPlanActions\(\{/s);
  assert.match(surface, /const meta = useMemo\(\(\) => getPublicShellMeta\(currentView\), \[currentView\]\);/);
  assert.match(surface, /const downgradeDiff = useMemo\(\(\) => \(/);
  assert.match(surface, /const \[consultationPrefill, setConsultationPrefill\] = useState/);

  assert.match(auth, /const DENJOY_HOME =/);
  assert.match(auth, /const LOCAL_AUTH_ENABLED =/);
  assert.match(auth, /export function buildDenjoyAuthUrl/);
  assert.match(auth, /export function redirectToDenjoyAuth/);

  assert.match(meta, /export type \{/);
  assert.match(meta, /export \{\s*getPublicShellMeta,\s*getCourseMetaFromPath,\s*PUBLIC_SHELL_PAGE_META,\s*\} from '\.\/publicShellMetaRegistry';/s);
  assert.match(meta, /export \{\s*buildPublicShellDowngradeDiff,\s*buildPublicShellDowngradeCreditMessage,\s*\} from '\.\/publicShellPlanMessaging';/s);
  assert.doesNotMatch(meta, /const PAGE_META: Record<string, PublicShellMeta> = \{/);
  assert.doesNotMatch(meta, /const FEATURE_LABELS:/);

  assert.match(types, /export interface PublicShellMeta/);
  assert.match(types, /export interface PublicShellDowngradeDiff/);
  assert.match(types, /export interface PublicShellDowngradeCreditDetail/);

  assert.match(metaRegistry, /export const PUBLIC_SHELL_PAGE_META: Record<string, PublicShellMeta> = \{/);
  assert.match(metaRegistry, /export function getCourseMetaFromPath\(\): PublicShellMeta \| null/);
  assert.match(metaRegistry, /export function getPublicShellMeta\(currentView: View\): PublicShellMeta/);

  assert.match(planMessaging, /const FEATURE_LABELS:/);
  assert.match(planMessaging, /export function buildPublicShellDowngradeDiff/);
  assert.match(planMessaging, /export function buildPublicShellDowngradeCreditMessage/);
  assert.match(planMessaging, /PLAN_LIMITS/);
  assert.match(planMessaging, /PLAN_NAMES/);

  assert.match(chrome, /<Helmet>/);
  assert.match(chrome, /<Header/);
  assert.match(chrome, /<PublicMobileNav/);
  assert.match(chrome, /<ConfirmModal/);
  assert.match(chrome, /<DowngradeMemberSelectModal/);
  assert.match(chrome, /<HomepageHeader/);
  assert.match(chrome, /<ErrorBoundary>/);
});

test('public shell route content preserves auth, service-hub, solution, and brand boundaries', () => {
  const content = read('components/app/PublicShellRouteContent.tsx');
  const routeTypes = read('components/app/publicShellRouteTypes.ts');
  const authSection = read('components/app/publicRoutes/PublicAuthRouteSection.tsx');
  const serviceHubSection = read('components/app/publicRoutes/PublicServiceHubRouteSection.tsx');
  const solutionSection = read('components/app/publicRoutes/PublicSolutionRouteSection.tsx');
  const brandSection = read('components/app/publicRoutes/PublicBrandRouteSection.tsx');

  assert.match(content, /import \{ lazyWithRetry \} from '\.\.\/\.\.\/utils\/lazyWithRetry';/);
  assert.match(content, /const PublicAuthRouteSection = lazyWithRetry\(\(\) => import\('\.\/publicRoutes\/PublicAuthRouteSection'\)\);/);
  assert.match(content, /const PublicServiceHubRouteSection = lazyWithRetry\(\(\) => import\('\.\/publicRoutes\/PublicServiceHubRouteSection'\)\);/);
  assert.match(content, /const PublicSolutionRouteSection = lazyWithRetry\(\(\) => import\('\.\/publicRoutes\/PublicSolutionRouteSection'\)\);/);
  assert.match(content, /const PublicBrandRouteSection = lazyWithRetry\(\(\) => import\('\.\/publicRoutes\/PublicBrandRouteSection'\)\);/);
  assert.match(content, /import type \{ PublicShellRouteContentProps \} from '\.\/publicShellRouteTypes';/);
  assert.doesNotMatch(content, /const PublicAuthRouteSection:/);
  assert.doesNotMatch(content, /const PublicServiceHubRouteSection:/);
  assert.doesNotMatch(content, /const PublicSolutionRouteSection:/);
  assert.doesNotMatch(content, /const PublicBrandRouteSection:/);

  assert.match(routeTypes, /export interface InviteInfo/);
  assert.match(routeTypes, /export interface ConsultationPrefill/);
  assert.match(routeTypes, /export interface PublicShellRouteContentProps/);

  assert.match(authSection, /currentView === 'login' \|\| currentView === 'signup'/);
  assert.match(authSection, /currentView === 'mfa_otp' && mfaPendingEmail/);
  assert.match(authSection, /currentView === 'invite' && inviteInfo/);

  assert.match(serviceHubSection, /currentView === 'mypage' && user/);
  assert.match(serviceHubSection, /currentView === 'admin_panel' && isSystemAdmin && user/);
  assert.match(serviceHubSection, /<HomepageFooter/);

  assert.match(solutionSection, /currentView === 'landing'/);
  assert.match(solutionSection, /currentView === 'pricing'/);
  assert.match(solutionSection, /currentView === 'contact'/);
  assert.match(solutionSection, /currentView === 'analyze'/);
  assert.match(solutionSection, /currentView === 'notices'/);
  assert.match(solutionSection, /currentView === 'consultation'/);
  assert.match(solutionSection, /currentView === 'terms'/);
  assert.match(solutionSection, /currentView === 'privacy'/);
  assert.match(solutionSection, /<PublicInfoFooter showLegalLinks \/>/);

  assert.match(brandSection, /currentView === 'homepage'/);
  assert.match(brandSection, /currentView === 'about'/);
  assert.match(brandSection, /currentView === 'consulting'/);
  assert.match(brandSection, /currentView === 'solutions'/);
  assert.match(brandSection, /currentView === 'courses'/);
  assert.match(brandSection, /currentView === 'blog'/);
  assert.match(brandSection, /currentView === 'community'/);
});
