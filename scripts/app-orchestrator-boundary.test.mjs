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

test('useAppState delegates session bootstrap and navigation lifecycle to useAppSessionLifecycle', () => {
  const appState = read('hooks/useAppState.ts');
  const lifecycle = read('hooks/useAppSessionLifecycle.ts');
  const authFlow = read('hooks/useAppAuthSessionFlow.ts');
  const lifecycleActions = read('hooks/useAppSessionLifecycleActions.ts');
  const authHandlers = read('hooks/appAuthStateHandlers.ts');
  const bootstrap = read('hooks/appSessionBootstrap.ts');
  const signedInTransition = read('hooks/appSignedInTransition.ts');
  const locationSync = read('hooks/useAppLocationSync.ts');

  assert.match(appState, /import \{ useAppSessionLifecycle \} from '\.\/useAppSessionLifecycle';/);
  assert.match(appState, /const \{[\s\S]*handleLoginSuccess,[\s\S]*handleDeleteAccount[\s\S]*\} = useAppSessionLifecycle\(\{/s);
  assert.match(appState, /const resetToSignedOutState = \(\) => \{/);
  assert.doesNotMatch(appState, /const handleLoginSuccess = async/);
  assert.doesNotMatch(appState, /const handleDeleteAccount = async/);
  assert.doesNotMatch(appState, /authService\.onAuthStateChange/);
  assert.doesNotMatch(appState, /supabase\.auth\.verifyOtp/);
  assert.doesNotMatch(appState, /supabase\.auth\.refreshSession/);
  assert.doesNotMatch(appState, /window\.addEventListener\('popstate', handlePopState\)/);

  assert.match(lifecycle, /useAppAuthSessionFlow\(\{/);
  assert.match(lifecycle, /useAppLocationSync\(\{ setState \}\);/);
  assert.match(lifecycle, /import \{ useAppSessionLifecycleActions \} from '\.\/useAppSessionLifecycleActions';/);
  assert.match(lifecycle, /const \{ handleLoginSuccess, handleDeleteAccount \} = useAppSessionLifecycleActions\(\{/);
  assert.doesNotMatch(lifecycle, /const handleLoginSuccess = async \(user: User\) => \{/);
  assert.doesNotMatch(lifecycle, /const handleDeleteAccount = async \(\) => \{/);
  assert.doesNotMatch(lifecycle, /authService\.onAuthStateChange/);
  assert.doesNotMatch(lifecycle, /event === 'SIGNED_OUT'/);
  assert.doesNotMatch(lifecycle, /event === 'SIGNED_IN'/);
  assert.doesNotMatch(lifecycle, /supabase\.auth\.verifyOtp/);
  assert.doesNotMatch(lifecycle, /supabase\.auth\.refreshSession/);
  assert.doesNotMatch(lifecycle, /window\.addEventListener\('popstate', handlePopState\)/);

  assert.match(authFlow, /authService\.onAuthStateChange/);
  assert.match(authFlow, /event === 'SIGNED_OUT'/);
  assert.match(authFlow, /event === 'SIGNED_IN'/);
  assert.match(authFlow, /import \{[\s\S]*handleSignedInAuthEvent,[\s\S]*handleSignedOutAuthEvent,[\s\S]*\} from '\.\/appAuthStateHandlers';/s);
  assert.match(authFlow, /runInitialSessionBootstrap\(\{/);
  assert.match(authFlow, /handleSignedOutAuthEvent\(\{/);
  assert.match(authFlow, /handleSignedInAuthEvent\(\{/);
  assert.doesNotMatch(authFlow, /const task = completeSignedInTransition\(\{/);

  assert.match(lifecycleActions, /export function useAppSessionLifecycleActions\(/);
  assert.match(lifecycleActions, /const handleLoginSuccess = useCallback\(async \(user: User\) => \{/);
  assert.match(lifecycleActions, /const handleDeleteAccount = useCallback\(async \(\) => \{/);
  assert.match(lifecycleActions, /pageViewService\.markConverted\(user\.id, user\.hospitalId \|\| null\)/);

  assert.match(authHandlers, /export function handleSignedOutAuthEvent\(/);
  assert.match(authHandlers, /export function handleSignedInAuthEvent\(/);
  assert.match(authHandlers, /completeSignedInTransition\(\{/);
  assert.match(authHandlers, /authService\.consumeLoginTimedOut\(\)/);
  assert.match(authHandlers, /supabase\.auth\.signOut\(\)/);

  assert.match(locationSync, /window\.addEventListener\('popstate', handlePopState\)/);
  assert.match(bootstrap, /supabase\.auth\.verifyOtp/);
  assert.match(bootstrap, /supabase\.auth\.refreshSession/);
  assert.match(bootstrap, /validateSessionToken\(\)/);
  assert.match(signedInTransition, /waitForSignedInProfile\(\)/);
  assert.match(signedInTransition, /supabase\.rpc\('set_session_token', \{ p_token: token \}\)/);
});

test('useAppState delegates hospital data loading and realtime sync to dedicated hooks', () => {
  const appState = read('hooks/useAppState.ts');
  const dataLoader = read('hooks/useAppHospitalDataLoader.ts');
  const loadGuard = read('hooks/appHospitalLoadGuard.ts');
  const userResolver = read('hooks/appHospitalUserResolver.ts');
  const hospitalAccess = read('hooks/appHospitalAccess.ts');
  const hospitalPlanState = read('hooks/appHospitalPlanState.ts');
  const hospitalContext = read('hooks/appHospitalContextLoader.ts');
  const hospitalWorkspace = read('hooks/appHospitalWorkspaceLoader.ts');
  const realtimeSync = read('hooks/useAppRealtimeSync.ts');

  assert.match(appState, /import \{ useAppHospitalDataLoader \} from '\.\/useAppHospitalDataLoader';/);
  assert.match(appState, /import \{ useAppRealtimeSync \} from '\.\/useAppRealtimeSync';/);
  assert.match(appState, /const \{[\s\S]*loadHospitalData,[\s\S]*loadUserContext,[\s\S]*loadInventoryData,[\s\S]*clearHospitalLoadInFlight,[\s\S]*\} = useAppHospitalDataLoader\(\{/s);
  assert.match(appState, /useAppRealtimeSync\(\{\s*user: state\.user,\s*setState,\s*\}\);/);
  assert.doesNotMatch(appState, /const hospitalLoadInFlightRef = useRef/);
  assert.doesNotMatch(appState, /const backgroundDecryptUser =/);
  assert.doesNotMatch(appState, /inventoryService\.getInventory\(/);
  assert.doesNotMatch(appState, /serviceEntitlementService\.getHospitalSubscriptions\(/);
  assert.doesNotMatch(appState, /inventoryService\.subscribeToChanges\(/);
  assert.doesNotMatch(appState, /surgeryService\.subscribeToChanges\(/);
  assert.doesNotMatch(appState, /orderService\.subscribeToChanges\(/);

  assert.match(dataLoader, /export function useAppHospitalDataLoader\(/);
  assert.match(dataLoader, /import \{ handleHospitalLoadGuard \} from '\.\/appHospitalLoadGuard';/);
  assert.match(dataLoader, /import \{[\s\S]*loadResolvedHospitalUser,[\s\S]*scheduleHospitalUserBackgroundDecrypt,[\s\S]*\} from '\.\/appHospitalUserResolver';/s);
  assert.match(dataLoader, /import \{ loadHospitalContextSnapshot \} from '\.\/appHospitalContextLoader';/);
  assert.match(dataLoader, /import \{[\s\S]*loadHospitalWorkspaceSnapshot,[\s\S]*scheduleHospitalSurgeryDecrypt,[\s\S]*\} from '\.\/appHospitalWorkspaceLoader';/s);
  assert.match(dataLoader, /const hospitalLoadInFlightRef = useRef/);
  assert.match(dataLoader, /const backgroundDecryptUser = useCallback/);
  assert.match(dataLoader, /const loadHospitalData = useCallback\(async \(user: User\) => \{/);
  assert.match(dataLoader, /const loadUserContext = useCallback\(async \(user: User\) => \{/);
  assert.match(dataLoader, /const loadInventoryData = useCallback\(async \(user: User\) => \{/);
  assert.match(dataLoader, /handleHospitalLoadGuard\(\{/);
  assert.match(dataLoader, /loadHospitalWorkspaceSnapshot\(user\)/);
  assert.match(dataLoader, /loadHospitalContextSnapshot\(user\)/);
  assert.match(dataLoader, /loadResolvedHospitalUser\(user\)/);
  assert.match(dataLoader, /scheduleHospitalSurgeryDecrypt\(\{/);
  assert.doesNotMatch(dataLoader, /canAccessHospitalWorkspace\(user\)/);
  assert.doesNotMatch(dataLoader, /inventoryService\.getInventory\(/);
  assert.doesNotMatch(dataLoader, /hospitalService\.getHospitalById\(/);

  assert.match(loadGuard, /export function handleHospitalLoadGuard\(/);
  assert.match(loadGuard, /buildPausedState/);
  assert.match(loadGuard, /buildNoHospitalState/);
  assert.match(loadGuard, /canAccessHospitalWorkspace/);

  assert.match(userResolver, /export async function loadResolvedHospitalUser\(user: User\)/);
  assert.match(userResolver, /export function scheduleHospitalUserBackgroundDecrypt\(/);
  assert.match(userResolver, /authService\.getProfileById\(undefined, \{ decrypt: true \}\)/);
  assert.match(userResolver, /dbToUser\(decryptedProfile\)/);
  assert.match(userResolver, /waitForWarmup\(\)/);

  assert.match(hospitalAccess, /export function canAccessHospitalWorkspace\(user: User\)/);
  assert.match(hospitalAccess, /isSystemAdminRole/);

  assert.match(hospitalPlanState, /export async function resolvePlanStateWithEntitlements/);
  assert.match(hospitalPlanState, /serviceEntitlementService\.getHospitalSubscriptions/);
  assert.match(hospitalPlanState, /export function getSurgeryFromDate/);

  assert.match(hospitalContext, /export async function loadHospitalContextSnapshot/);
  assert.match(hospitalContext, /hospitalService\.getActiveMemberCount/);
  assert.match(hospitalContext, /hospitalService\.getHospitalById/);
  assert.match(hospitalContext, /onboardingService\.syncFromDbFlags/);

  assert.match(hospitalWorkspace, /export async function loadHospitalWorkspaceSnapshot/);
  assert.match(hospitalWorkspace, /inventoryService\.getInventory\(/);
  assert.match(hospitalWorkspace, /surgeryService\.getSurgeryRecords\(/);
  assert.match(hospitalWorkspace, /orderService\.getOrders\(/);
  assert.match(hospitalWorkspace, /backfillPatientInfoHash/);
  assert.match(hospitalWorkspace, /export function scheduleHospitalSurgeryDecrypt/);
  assert.match(hospitalWorkspace, /dbToExcelRowBatchMasked/);
  assert.match(hospitalWorkspace, /dbToExcelRowBatch\(/);

  assert.match(realtimeSync, /export function useAppRealtimeSync\(/);
  assert.match(realtimeSync, /inventoryService\.subscribeToChanges/);
  assert.match(realtimeSync, /surgeryService\.subscribeToChanges/);
  assert.match(realtimeSync, /orderService\.subscribeToChanges/);
  assert.match(realtimeSync, /supabase\.removeChannel\(inventoryChannel\)/);
  assert.match(realtimeSync, /supabase[\s\S]*\.from\('orders'\)[\s\S]*\.select\('\*, order_items\(\*\)'\)/s);
});

test('useAppLogic delegates shell guards and lifecycle effects to useAppShellEffects', () => {
  const appLogic = read('hooks/useAppLogic.tsx');
  const shellEffects = read('hooks/useAppShellEffects.ts');

  assert.match(appLogic, /import \{ useAppShellEffects \} from '\.\/useAppShellEffects';/);
  assert.match(appLogic, /useAppShellEffects\(\{ state, setState, isSystemAdmin \}\);/);
  assert.doesNotMatch(appLogic, /pageViewService\.track\(/);
  assert.doesNotMatch(appLogic, /authService\.touchLastActiveAt\(/);
  assert.doesNotMatch(appLogic, /state\.currentView === 'admin_panel' && !isSystemAdmin/);
  assert.doesNotMatch(appLogic, /state\.currentView === 'login' \|\| state\.currentView === 'signup'/);

  assert.match(shellEffects, /pageViewService\.track\(state\.currentView\)/);
  assert.match(shellEffects, /authService\.touchLastActiveAt\(\)/);
  assert.match(shellEffects, /state\.currentView === 'admin_panel' && !isSystemAdmin/);
  assert.match(shellEffects, /state\.currentView === 'login' \|\| state\.currentView === 'signup'/);
});

test('useAppLogic delegates responsive shell scaffold to useAppViewportScaffold', () => {
  const appLogic = read('hooks/useAppLogic.tsx');
  const viewportScaffold = read('hooks/useAppViewportScaffold.ts');

  assert.match(appLogic, /import \{ useAppViewportScaffold \} from '\.\/useAppViewportScaffold';/);
  assert.match(appLogic, /} = useAppViewportScaffold\(\{ state, isSystemAdmin, dashboardHeaderRef \}\);/);
  assert.doesNotMatch(appLogic, /const showDashboardSidebar = state\.currentView === 'dashboard'/);
  assert.doesNotMatch(appLogic, /const showStandardDashboardHeader = state\.currentView === 'dashboard'/);
  assert.doesNotMatch(appLogic, /usesPublicBottomOffset\(state\.currentView\)/);
  assert.doesNotMatch(appLogic, /useUIState\(\{ showDashboardSidebar, showStandardDashboardHeader, dashboardHeaderRef, dashboardTab: state\.dashboardTab \}\)/);

  assert.match(viewportScaffold, /const requiresBillingProgramSetup = \(/);
  assert.match(viewportScaffold, /const showDashboardSidebar = state\.currentView === 'dashboard'/);
  assert.match(viewportScaffold, /const showStandardDashboardHeader = state\.currentView === 'dashboard'/);
  assert.match(viewportScaffold, /useUIState\(\{ showDashboardSidebar, showStandardDashboardHeader, dashboardHeaderRef, dashboardTab: state\.dashboardTab \}\)/);
  assert.match(viewportScaffold, /showMobilePublicNav: usesPublicBottomOffset\(state\.currentView\) && isNarrowViewport/);
  assert.match(viewportScaffold, /const MOBILE_PRIMARY_TABS: DashboardTab\[] = \['overview', 'inventory_master', 'order_management'\];/);
});

test('useAppLogic stays thin by delegating dashboard orchestration to useAppDashboardCoordinator', () => {
  const appLogic = read('hooks/useAppLogic.tsx');
  const billingControls = read('hooks/useAppBillingControls.ts');
  const roleContext = read('hooks/useAppRolePlanContext.ts');
  const sessionActions = read('hooks/useAppSessionActions.ts');
  const coordinator = read('hooks/useAppDashboardCoordinator.ts');

  assert.match(appLogic, /import \{ useAppBillingControls \} from '\.\/useAppBillingControls';/);
  assert.match(appLogic, /import \{ useAppRolePlanContext \} from '\.\/useAppRolePlanContext';/);
  assert.match(appLogic, /import \{ useAppSessionActions \} from '\.\/useAppSessionActions';/);
  assert.match(appLogic, /import \{ useAppDashboardCoordinator \} from '\.\/useAppDashboardCoordinator';/);
  assert.match(appLogic, /const \{[\s\S]*isSystemAdmin,[\s\S]*activeNudge,[\s\S]*\} = useAppRolePlanContext\(\{/s);
  assert.match(appLogic, /const \{[\s\S]*directPayment,[\s\S]*refreshPlanState,[\s\S]*handleOpenDirectPayment,[\s\S]*\} = useAppBillingControls\(\{[\s\S]*directPayment: paymentModalState,[\s\S]*setDirectPayment: setPaymentModalState,[\s\S]*billingProgramSaving: billingProgramSavingState,[\s\S]*billingProgramError: billingProgramErrorState,[\s\S]*\}\);/s);
  assert.match(appLogic, /const \{ handleSignOut \} = useAppSessionActions\(\{ setState \}\);/);
  assert.match(appLogic, /const \{[\s\S]*uploadingTypeRef,[\s\S]*handleFileUpload,[\s\S]*handleFailDetectionClose,[\s\S]*surgeryUnregisteredItems,[\s\S]*workspaceProps,[\s\S]*userOverlayProps,[\s\S]*globalOverlayPartialProps,[\s\S]*\} = useAppDashboardCoordinator\(\{[\s\S]*state,[\s\S]*setState,[\s\S]*loadHospitalData,[\s\S]*handleDeleteAccount,[\s\S]*showAlertToast,[\s\S]*fixtureFileRef,[\s\S]*surgeryFileRef,[\s\S]*effectivePlan,[\s\S]*isHospitalAdmin,[\s\S]*isHospitalMaster,[\s\S]*isSystemAdmin,[\s\S]*isReadOnly,[\s\S]*requiresBillingProgramSetup,[\s\S]*billableItemCount,[\s\S]*failOrderCount,[\s\S]*activeNudge,[\s\S]*showMobileDashboardNav,[\s\S]*mobileOrderNav,[\s\S]*reviewPopupType,[\s\S]*setReviewPopupType,[\s\S]*profileInitialTab,[\s\S]*setProfileInitialTab,[\s\S]*planLimitToast,[\s\S]*setPlanLimitToast,[\s\S]*showAuditHistory,[\s\S]*setShowAuditHistory,[\s\S]*autoOpenBaseStockEdit,[\s\S]*setAutoOpenBaseStockEdit,[\s\S]*autoOpenFailBulkModal,[\s\S]*setAutoOpenFailBulkModal,[\s\S]*confirmModal,[\s\S]*setConfirmModal,[\s\S]*setPendingFailCandidates,[\s\S]*handleOpenDirectPayment,[\s\S]*\}\);/s);
  assert.doesNotMatch(appLogic, /import \{ useAppOnboardingActions \} from '\.\/useAppOnboardingActions';/);
  assert.doesNotMatch(appLogic, /import \{ useDashboardWorkspaceProps \} from '\.\/useDashboardWorkspaceProps';/);
  assert.doesNotMatch(appLogic, /import \{ useAppUserOverlayProps \} from '\.\/useAppUserOverlayProps';/);
  assert.doesNotMatch(appLogic, /import \{ useAppGlobalOverlayProps \} from '\.\/useAppGlobalOverlayProps';/);
  assert.doesNotMatch(appLogic, /import \{ useAppInventoryCompareFlow \} from '\.\/useAppInventoryCompareFlow';/);
  assert.doesNotMatch(appLogic, /import \{ useAppReviewPopup \} from '\.\/useAppReviewPopup';/);
  assert.doesNotMatch(appLogic, /import \{ useAppInventoryMasterState \} from '\.\/useAppInventoryMasterState';/);
  assert.doesNotMatch(appLogic, /import \{ useFixtureEditControls \} from '\.\/useFixtureEditControls';/);
  assert.doesNotMatch(appLogic, /import \{ useFileUpload \} from '\.\/useFileUpload';/);
  assert.doesNotMatch(appLogic, /const workspaceProps = useMemo\(\(\) => \(\{/);
  assert.doesNotMatch(appLogic, /const userOverlayProps = useMemo\(\(\) => \(\{/);
  assert.doesNotMatch(appLogic, /const globalOverlayPartialProps = useMemo\(\(\) => \(\{/);
  assert.doesNotMatch(appLogic, /const requestFixtureExcelDownload = useCallback/);
  assert.doesNotMatch(appLogic, /const requestApplyFixtureToInventory = useCallback/);
  assert.doesNotMatch(appLogic, /const handleSaveSettingsAndProceed = useCallback/);
  assert.doesNotMatch(appLogic, /reviewService\.checkWritable/);

  assert.match(billingControls, /export function useAppBillingControls\(/);
  assert.match(roleContext, /export function useAppRolePlanContext\(/);
  assert.match(sessionActions, /export function useAppSessionActions\(/);
  assert.match(coordinator, /export function useAppDashboardCoordinator\(/);
});

test('useAppDashboardCoordinator stays thin by delegating data ops and surface prop assembly', () => {
  const coordinator = read('hooks/useAppDashboardCoordinator.ts');
  const dataOps = read('hooks/useAppDashboardDataOps.ts');
  const surfaceProps = read('hooks/useAppDashboardSurfaceProps.ts');

  assert.match(coordinator, /import \{ useAppReviewPopup \} from '\.\/useAppReviewPopup';/);
  assert.match(coordinator, /import \{ useAppDashboardDataOps \} from '\.\/useAppDashboardDataOps';/);
  assert.match(coordinator, /import \{ useAppDashboardSurfaceProps \} from '\.\/useAppDashboardSurfaceProps';/);
  assert.match(coordinator, /useAppReviewPopup\(\{/);
  assert.match(coordinator, /const \{[\s\S]*workspaceInput,[\s\S]*userOverlayInput,[\s\S]*globalOverlayInput,[\s\S]*\} = useAppDashboardDataOps\(\{/s);
  assert.match(coordinator, /const \{[\s\S]*workspaceProps,[\s\S]*userOverlayProps,[\s\S]*globalOverlayPartialProps,[\s\S]*\} = useAppDashboardSurfaceProps\(\{[\s\S]*workspaceInput,[\s\S]*userOverlayInput,[\s\S]*globalOverlayInput,[\s\S]*\}\);/s);
  assert.doesNotMatch(coordinator, /import \{ useAppOnboardingActions \} from '\.\/useAppOnboardingActions';/);
  assert.doesNotMatch(coordinator, /import \{ useDashboardWorkspaceProps \} from '\.\/useDashboardWorkspaceProps';/);
  assert.doesNotMatch(coordinator, /import \{ useAppUserOverlayProps \} from '\.\/useAppUserOverlayProps';/);
  assert.doesNotMatch(coordinator, /import \{ useAppGlobalOverlayProps \} from '\.\/useAppGlobalOverlayProps';/);
  assert.doesNotMatch(coordinator, /import \{ useAppInventoryCompareFlow \} from '\.\/useAppInventoryCompareFlow';/);
  assert.doesNotMatch(coordinator, /import \{ useAppInventoryMasterState \} from '\.\/useAppInventoryMasterState';/);
  assert.doesNotMatch(coordinator, /import \{ useFileUpload \} from '\.\/useFileUpload';/);
  assert.doesNotMatch(coordinator, /import \{ useFixtureEditControls \} from '\.\/useFixtureEditControls';/);
  assert.doesNotMatch(coordinator, /const workspaceProps = useDashboardWorkspaceProps\(\{/);
  assert.doesNotMatch(coordinator, /const userOverlayProps = useAppUserOverlayProps\(\{/);
  assert.doesNotMatch(coordinator, /const globalOverlayPartialProps = useAppGlobalOverlayProps\(\{/);
  assert.doesNotMatch(coordinator, /const handleSaveSettingsAndProceed = useCallback/);
  assert.doesNotMatch(coordinator, /const requestFixtureExcelDownload = useCallback/);

  assert.match(dataOps, /export function useAppDashboardDataOps\(/);
  assert.match(surfaceProps, /export function useAppDashboardSurfaceProps\(/);
});

test('useAppDashboardDataOps stays thin by delegating fixture and inventory flows', () => {
  const dataOps = read('hooks/useAppDashboardDataOps.ts');
  const dataTypes = read('hooks/useAppDashboardDataTypes.ts');
  const inventoryOps = read('hooks/useAppDashboardInventoryOps.ts');
  const fixtureFlow = read('hooks/useAppDashboardFixtureFlow.ts');
  const onboardingActions = read('hooks/useAppOnboardingActions.ts');
  const inventoryMasterState = read('hooks/useAppInventoryMasterState.ts');
  const inventoryCompareFlow = read('hooks/useAppInventoryCompareFlow.tsx');
  const reviewPopup = read('hooks/useAppReviewPopup.ts');

  assert.match(dataOps, /import \{ useAppDashboardFixtureFlow \} from '\.\/useAppDashboardFixtureFlow';/);
  assert.match(dataOps, /import \{ useAppDashboardInventoryOps \} from '\.\/useAppDashboardInventoryOps';/);
  assert.match(dataOps, /import type \{[\s\S]*DashboardDataGlobalOverlayInput,[\s\S]*DashboardDataUserOverlayInput,[\s\S]*DashboardDataWorkspaceInput,[\s\S]*\} from '\.\/useAppDashboardDataTypes';/s);
  assert.match(dataOps, /const \{[\s\S]*surgeryUnregisteredItems,[\s\S]*inventoryMasterInput,[\s\S]*orderReturnInput,[\s\S]*\} = useAppDashboardInventoryOps\(\{/s);
  assert.match(dataOps, /const \{[\s\S]*workspaceFixtureInput,[\s\S]*userOverlayInput,[\s\S]*globalOverlayInput,[\s\S]*\} = useAppDashboardFixtureFlow\(\{/s);
  assert.match(dataOps, /workspaceInput: \{[\s\S]*\.\.\.workspaceFixtureInput,[\s\S]*inventoryMaster: \{[\s\S]*\.\.\.inventoryMasterInput,[\s\S]*initialShowBaseStockEdit: autoOpenBaseStockEdit,[\s\S]*onBaseStockEditApplied: handleBaseStockEditApplied,[\s\S]*\},[\s\S]*\.\.\.orderReturnInput,[\s\S]*\}/s);
  assert.doesNotMatch(dataOps, /import \{ useDashboardWorkspaceProps \} from '\.\/useDashboardWorkspaceProps';/);
  assert.doesNotMatch(dataOps, /import \{ useAppUserOverlayProps \} from '\.\/useAppUserOverlayProps';/);
  assert.doesNotMatch(dataOps, /import \{ useAppGlobalOverlayProps \} from '\.\/useAppGlobalOverlayProps';/);
  assert.doesNotMatch(dataOps, /import \{ useFileUpload \} from '\.\/useFileUpload';/);
  assert.doesNotMatch(dataOps, /import \{ useOnboarding \} from '\.\/useOnboarding';/);
  assert.doesNotMatch(dataOps, /import \{ useReturnHandlers \} from '\.\/useReturnHandlers';/);
  assert.doesNotMatch(dataOps, /const workspaceProps = useDashboardWorkspaceProps\(\{/);
  assert.doesNotMatch(dataOps, /const userOverlayProps = useAppUserOverlayProps\(\{/);
  assert.doesNotMatch(dataOps, /const globalOverlayPartialProps = useAppGlobalOverlayProps\(\{/);

  assert.match(dataTypes, /export interface DashboardDataWorkspaceInput/);
  assert.match(dataTypes, /export interface DashboardDataUserOverlayInput/);
  assert.match(dataTypes, /export interface DashboardDataGlobalOverlayInput/);
  assert.match(dataTypes, /export type DashboardInventoryWorkspaceInput = Pick</);
  assert.match(dataTypes, /export type DashboardFixtureWorkspaceInput = Pick</);

  assert.match(inventoryOps, /export function useAppDashboardInventoryOps\(/);
  assert.match(inventoryOps, /import \{ useReturnHandlers \} from '\.\/useReturnHandlers';/);
  assert.match(inventoryOps, /import \{ useOrderHandlers \} from '\.\/useOrderHandlers';/);
  assert.match(inventoryOps, /import \{ useInventorySync \} from '\.\/useInventorySync';/);
  assert.match(inventoryOps, /import \{ useSurgeryManualFix \} from '\.\/useSurgeryManualFix';/);
  assert.match(inventoryOps, /import \{ useBaseStockBatch \} from '\.\/useBaseStockBatch';/);
  assert.match(inventoryOps, /import \{ useRefreshSurgeryUsage \} from '\.\/useRefreshSurgeryUsage';/);
  assert.match(inventoryOps, /import \{ useAppInventoryMasterState \} from '\.\/useAppInventoryMasterState';/);
  assert.match(inventoryOps, /const \{ virtualSurgeryData, surgeryUnregisteredItems \} = useAppInventoryMasterState\(\{/);
  assert.match(inventoryOps, /orderReturnInput: \{/);

  assert.match(fixtureFlow, /export function useAppDashboardFixtureFlow\(/);
  assert.match(fixtureFlow, /import \{ useFileUpload \} from '\.\/useFileUpload';/);
  assert.match(fixtureFlow, /import \{ useOnboarding \} from '\.\/useOnboarding';/);
  assert.match(fixtureFlow, /import \{ useAppOnboardingActions \} from '\.\/useAppOnboardingActions';/);
  assert.match(fixtureFlow, /import \{ useAppInventoryCompareFlow \} from '\.\/useAppInventoryCompareFlow';/);
  assert.match(fixtureFlow, /import \{ useFixtureEditControls \} from '\.\/useFixtureEditControls';/);
  assert.match(fixtureFlow, /workspaceFixtureInput: \{/);
  assert.match(fixtureFlow, /userOverlayInput: \{/);
  assert.match(fixtureFlow, /globalOverlayInput: \{/);

  assert.match(onboardingActions, /const handleSaveSettingsAndProceed = useCallback/);
  assert.match(onboardingActions, /const handleFailDetectionClose = useCallback/);
  assert.match(onboardingActions, /const handleGoToDataSetup = useCallback/);
  assert.match(onboardingActions, /const handleGoToSurgeryUpload = useCallback/);
  assert.match(onboardingActions, /const handleGoToInventoryAudit = useCallback/);
  assert.match(onboardingActions, /const handleGoToFailManagement = useCallback/);
  assert.match(onboardingActions, /setState\(prev => \(\{ \.\.\.prev, currentView: 'dashboard' \}\)\);[\s\S]*handleFileUpload\(file, 'fixture', sizeCorrections\)/s);
  assert.match(onboardingActions, /setForcedOnboardingStep\(null\);[\s\S]*setAutoOpenBaseStockEdit\(true\);[\s\S]*dashboardTab: 'inventory_master'/s);
  assert.match(onboardingActions, /setForcedOnboardingStep\(null\);[\s\S]*setAutoOpenFailBulkModal\(true\);[\s\S]*dashboardTab: 'fail_management'/s);
  assert.match(onboardingActions, /handleResumeOnboarding: firstIncompleteStep != null \? handleResumeOnboarding : undefined,/);

  assert.match(reviewPopup, /export function useAppReviewPopup\(/);
  assert.match(reviewPopup, /reviewService\.checkWritable/);
  assert.match(reviewPopup, /setReviewPopupType\('initial'\)/);
  assert.match(reviewPopup, /setReviewPopupType\('6month'\)/);

  assert.match(inventoryMasterState, /export function useAppInventoryMasterState\(/);
  assert.match(inventoryMasterState, /const virtualSurgeryData = useMemo/);
  assert.match(inventoryMasterState, /const surgeryUnregisteredItems = useSurgeryUnregistered/);

  assert.match(inventoryCompareFlow, /export function useAppInventoryCompareFlow\(/);
  assert.match(inventoryCompareFlow, /const \{\s*inventoryCompare,[\s\S]*handleApplyToInventory,[\s\S]*\} = useInventoryCompare\(/s);
  assert.match(inventoryCompareFlow, /const requestFixtureExcelDownload = useCallback/);
  assert.match(inventoryCompareFlow, /const requestApplyFixtureToInventory = useCallback/);
  assert.match(inventoryCompareFlow, /downloadExcelFile/);
  assert.match(inventoryCompareFlow, /handleApplyToInventory\(\)/);
});

test('useAppDashboardSurfaceProps owns workspace and overlay prop assembly', () => {
  const surfaceProps = read('hooks/useAppDashboardSurfaceProps.ts');
  const workspaceProps = read('hooks/useDashboardWorkspaceProps.ts');
  const userOverlayProps = read('hooks/useAppUserOverlayProps.ts');
  const globalOverlayProps = read('hooks/useAppGlobalOverlayProps.ts');

  assert.match(surfaceProps, /import \{ useDashboardWorkspaceProps \} from '\.\/useDashboardWorkspaceProps';/);
  assert.match(surfaceProps, /import \{ useAppUserOverlayProps \} from '\.\/useAppUserOverlayProps';/);
  assert.match(surfaceProps, /import \{ useAppGlobalOverlayProps \} from '\.\/useAppGlobalOverlayProps';/);
  assert.match(surfaceProps, /const workspaceProps = useDashboardWorkspaceProps\(\{[\s\S]*fixtureEditState: workspaceInput\.fixtureEditState,[\s\S]*fixtureEditActions: workspaceInput\.fixtureEditActions,[\s\S]*inventoryMaster: workspaceInput\.inventoryMaster,[\s\S]*\}\);/s);
  assert.match(surfaceProps, /const userOverlayProps = useAppUserOverlayProps\(\{[\s\S]*shouldShowOnboarding: userOverlayInput\.shouldShowOnboarding,[\s\S]*onGoToSurgeryUpload: userOverlayInput\.onGoToSurgeryUpload,[\s\S]*\}\);/s);
  assert.match(surfaceProps, /const globalOverlayPartialProps = useAppGlobalOverlayProps\(\{[\s\S]*planLimitModal: globalOverlayInput\.planLimitModal,[\s\S]*inventoryCompare: globalOverlayInput\.inventoryCompare,[\s\S]*handleConfirmApplyToInventory: globalOverlayInput\.handleConfirmApplyToInventory,[\s\S]*cancelInventoryCompare: globalOverlayInput\.cancelInventoryCompare,[\s\S]*\}\);/s);
  assert.doesNotMatch(surfaceProps, /import \{ useAppOnboardingActions \} from '\.\/useAppOnboardingActions';/);
  assert.doesNotMatch(surfaceProps, /import \{ useAppInventoryCompareFlow \} from '\.\/useAppInventoryCompareFlow';/);
  assert.doesNotMatch(surfaceProps, /import \{ useFileUpload \} from '\.\/useFileUpload';/);
  assert.doesNotMatch(surfaceProps, /const handleSaveSettingsAndProceed = useCallback/);
  assert.doesNotMatch(surfaceProps, /const requestFixtureExcelDownload = useCallback/);

  assert.match(workspaceProps, /export function useDashboardWorkspaceProps\(/);
  assert.match(workspaceProps, /const fixtureEdit = useMemo<WorkspaceProps\['fixtureEdit'\]>\(\(\) => \(\{/);
  assert.match(workspaceProps, /onOpenProfilePlan: handleOpenProfilePlan,/);
  assert.match(workspaceProps, /orderActions: Pick</);
  assert.match(workspaceProps, /\.\.\.orderActions,/);

  assert.match(userOverlayProps, /export function useAppUserOverlayProps\(/);
  assert.match(userOverlayProps, /const handleCloseProfile = useCallback\(async \(\) => \{/);
  assert.match(userOverlayProps, /const handleChangePlan = useCallback\(async \(plan: PlanType, billing: BillingCycle\) => \{/);
  assert.match(userOverlayProps, /onOnboardingSkip,/);
  assert.match(userOverlayProps, /onGoToFailManagement,/);

  assert.match(globalOverlayProps, /export function useAppGlobalOverlayProps\(/);
  assert.match(globalOverlayProps, /const handleUpgradePlan = useCallback\(\(plan: PlanType, billing: BillingCycle\) => \{/);
  assert.match(globalOverlayProps, /const handleCloseConfirmModal = useCallback\(\(\) => \{/);
  assert.match(globalOverlayProps, /onUpgradePlan: handleUpgradePlan,/);
  assert.match(globalOverlayProps, /onCloseConfirmModal: handleCloseConfirmModal,/);
});
