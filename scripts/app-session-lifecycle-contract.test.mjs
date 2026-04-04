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

test('useAppState delegates auth bootstrap and session polling to useAppSessionLifecycle', () => {
  const appState = read('hooks/useAppState.ts');

  assert.match(appState, /import \{ useAppSessionLifecycle \} from '\.\/useAppSessionLifecycle';/);
  assert.match(appState, /const \{[\s\S]*handleLoginSuccess,[\s\S]*handleDeleteAccount[\s\S]*\} = useAppSessionLifecycle\(\{/s);
  assert.match(appState, /const resetToSignedOutState = \(\) => \{/);
  assert.doesNotMatch(appState, /const validateSessionToken = async/);
  assert.doesNotMatch(appState, /const checkProfileExists = async/);
  assert.doesNotMatch(appState, /const waitForSignedInProfile = async/);
  assert.doesNotMatch(appState, /authService\.onAuthStateChange/);
  assert.doesNotMatch(appState, /event === 'SIGNED_IN'/);
  assert.doesNotMatch(appState, /event === 'SIGNED_OUT'/);
  assert.doesNotMatch(appState, /const SESSION_TOKEN_KEY =/);
  assert.doesNotMatch(appState, /const LOAD_TIMEOUT_MS =/);
  assert.doesNotMatch(appState, /window\.addEventListener\('popstate'/);
});

test('useAppSessionLifecycle composes focused auth flow and location sync hooks', () => {
  const lifecycle = read('hooks/useAppSessionLifecycle.ts');
  const lifecycleActions = read('hooks/useAppSessionLifecycleActions.ts');
  const authFlow = read('hooks/useAppAuthSessionFlow.ts');
  const authHandlers = read('hooks/appAuthStateHandlers.ts');
  const bootstrap = read('hooks/appSessionBootstrap.ts');
  const signedInTransition = read('hooks/appSignedInTransition.ts');
  const locationSync = read('hooks/useAppLocationSync.ts');
  const polling = read('hooks/useAppSessionPolling.ts');

  assert.match(lifecycle, /import \{ useAppAuthSessionFlow \} from '\.\/useAppAuthSessionFlow';/);
  assert.match(lifecycle, /import \{ useAppLocationSync \} from '\.\/useAppLocationSync';/);
  assert.match(lifecycle, /import \{ useAppSessionLifecycleActions \} from '\.\/useAppSessionLifecycleActions';/);
  assert.match(lifecycle, /const \{ startSessionPolling, stopSessionPolling \} = useAppAuthSessionFlow\(\{/);
  assert.match(lifecycle, /useAppLocationSync\(\{ setState \}\);/);
  assert.match(lifecycle, /const \{ handleLoginSuccess, handleDeleteAccount \} = useAppSessionLifecycleActions\(\{/);
  assert.doesNotMatch(lifecycle, /const LOAD_TIMEOUT_MS = 45_000;/);
  assert.doesNotMatch(lifecycle, /const waitForSignedInProfile = async/);
  assert.doesNotMatch(lifecycle, /const \{ data: \{ subscription \} \} = authService\.onAuthStateChange/);
  assert.doesNotMatch(lifecycle, /event === 'SIGNED_OUT'/);
  assert.doesNotMatch(lifecycle, /event === 'SIGNED_IN'/);
  assert.doesNotMatch(lifecycle, /supabase\.auth\.verifyOtp/);
  assert.doesNotMatch(lifecycle, /supabase\.auth\.refreshSession/);
  assert.doesNotMatch(lifecycle, /window\.addEventListener\('popstate', handlePopState\)/);
  assert.doesNotMatch(lifecycle, /const validateSessionToken = async/);
  assert.doesNotMatch(lifecycle, /const checkProfileExists = async/);
  assert.doesNotMatch(lifecycle, /pageViewService\.markConverted/);
  assert.doesNotMatch(lifecycle, /authService\.deleteAccount/);
  assert.match(lifecycle, /return \{[\s\S]*handleLoginSuccess,[\s\S]*handleDeleteAccount,[\s\S]*startSessionPolling,[\s\S]*stopSessionPolling,[\s\S]*\};/s);

  assert.match(lifecycleActions, /export function useAppSessionLifecycleActions\(/);
  assert.match(lifecycleActions, /pageViewService\.markConverted\(user\.id, user\.hospitalId \|\| null\)/);
  assert.match(lifecycleActions, /const result = await authService\.deleteAccount\(\)/);
  assert.match(lifecycleActions, /const session = await authService\.getSession\(\)\.catch\(\(\) => null\)/);
  assert.match(lifecycleActions, /notify\('회원 탈퇴가 완료되었습니다\.', 'success'\)/);
  assert.match(lifecycleActions, /resetToSignedOutState\(\)/);
  assert.match(lifecycleActions, /stopSessionPolling\(\)/);

  assert.match(authFlow, /import \{ runInitialSessionBootstrap \} from '\.\/appSessionBootstrap';/);
  assert.match(authFlow, /import \{[\s\S]*handleSignedInAuthEvent,[\s\S]*handleSignedOutAuthEvent,[\s\S]*\} from '\.\/appAuthStateHandlers';/s);
  assert.match(authFlow, /import \{ useAppSessionPolling \} from '\.\/useAppSessionPolling';/);
  assert.match(authFlow, /const \{\s*startSessionPolling,\s*stopSessionPolling,\s*validateSessionToken,\s*\} = useAppSessionPolling\(\{ notify \}\);/s);
  assert.match(authFlow, /const \{ data: \{ subscription \} \} = authService\.onAuthStateChange/);
  assert.match(authFlow, /event === 'SIGNED_OUT'/);
  assert.match(authFlow, /event === 'SIGNED_IN'/);
  assert.match(authFlow, /void runInitialSessionBootstrap\(\{/);
  assert.match(authFlow, /handleSignedOutAuthEvent\(\{/);
  assert.match(authFlow, /handleSignedInAuthEvent\(\{/);
  assert.match(authFlow, /return \{\s*startSessionPolling,\s*stopSessionPolling,\s*\};/s);
  assert.doesNotMatch(authFlow, /export const LOAD_TIMEOUT_MS = 45_000;/);
  assert.doesNotMatch(authFlow, /const waitForSignedInProfile = async/);
  assert.doesNotMatch(authFlow, /supabase\.auth\.verifyOtp/);
  assert.doesNotMatch(authFlow, /supabase\.auth\.refreshSession/);
  assert.doesNotMatch(authFlow, /supabase\.rpc\('set_session_token', \{ p_token: token \}\)/);

  assert.match(authHandlers, /export function handleSignedOutAuthEvent\(/);
  assert.match(authHandlers, /export function handleSignedInAuthEvent\(/);
  assert.match(authHandlers, /completeSignedInTransition\(\{/);
  assert.match(authHandlers, /authService\.consumeLoginTimedOut\(\)/);
  assert.match(authHandlers, /supabase\.auth\.signOut\(\)/);

  assert.match(bootstrap, /export const LOAD_TIMEOUT_MS = 45_000;/);
  assert.match(bootstrap, /export async function runInitialSessionBootstrap\(/);
  assert.match(bootstrap, /supabase\.auth\.verifyOtp/);
  assert.match(bootstrap, /supabase\.auth\.refreshSession/);
  assert.match(bootstrap, /validateSessionToken\(\)/);
  assert.match(bootstrap, /markInitSessionHandled\(\)/);
  assert.match(bootstrap, /startSessionPolling\(\)/);
  assert.match(bootstrap, /loadHospitalData\(user\)/);

  assert.match(signedInTransition, /export async function waitForSignedInProfile\(/);
  assert.match(signedInTransition, /export async function completeSignedInTransition\(/);
  assert.match(signedInTransition, /planService\.startTrial/);
  assert.match(signedInTransition, /supabase\.rpc\('set_session_token', \{ p_token: token \}\)/);
  assert.match(signedInTransition, /startSessionPolling\(\)/);

  assert.match(locationSync, /export function useAppLocationSync\(/);
  assert.match(locationSync, /window\.addEventListener\('popstate', handlePopState\)/);
  assert.match(locationSync, /resolveInitialViewFromLocation/);

  assert.match(polling, /export const SESSION_POLL_INTERVAL_MS = 60_000;/);
  assert.match(polling, /export const SESSION_TOKEN_KEY = 'dentweb_session_token';/);
  assert.match(polling, /export function useAppSessionPolling\(/);
  assert.match(polling, /const validateSessionToken = useCallback\(async \(\): Promise<boolean> => \{/);
  assert.match(polling, /const checkProfileExists = useCallback\(async \(\): Promise<boolean> => \{/);
  assert.match(polling, /const startSessionPolling = useCallback\(\(\) => \{/);
  assert.match(polling, /const stopSessionPolling = useCallback\(\(\) => \{/);
  assert.match(polling, /return \{[\s\S]*startSessionPolling,[\s\S]*stopSessionPolling,[\s\S]*validateSessionToken,[\s\S]*\};/s);
  assert.match(polling, /notifyRef\.current\('계정이 삭제되었거나 병원에서 방출되었습니다\.', 'error'\)/);
  assert.match(polling, /notifyRef\.current\('다른 기기에서 로그인하여 자동 로그아웃됩니다\.', 'error'\)/);
});
