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

test('hospital data loader and state actions delegate repeated transition payloads to appStatePresets helpers', () => {
  const appState = read('hooks/useAppState.ts');
  const dataLoader = read('hooks/useAppHospitalDataLoader.ts');
  const loadGuard = read('hooks/appHospitalLoadGuard.ts');
  const presets = read('hooks/appStatePresets.ts');

  assert.match(appState, /import \{[\s\S]*buildLeaveHospitalState,[\s\S]*buildSignedOutState,[\s\S]*\} from '\.\/appStatePresets';/s);
  assert.match(appState, /setState\(prev => buildSignedOutState\(prev\)\)/);
  assert.match(appState, /setState\(prev => buildLeaveHospitalState\(prev, updatedUser\)\)/);

  assert.match(dataLoader, /import \{[\s\S]*buildHospitalLoadFailureState,[\s\S]*buildHospitalReadyState,[\s\S]*buildInventoryDataState,[\s\S]*\} from '\.\/appStatePresets';/s);
  assert.match(dataLoader, /setState\(prev => buildHospitalReadyState\(prev, \{/);
  assert.match(dataLoader, /setState\(prev => buildHospitalLoadFailureState\(prev, user\)\)/);
  assert.match(dataLoader, /setState\(prev => buildInventoryDataState\(prev, \{/);
  assert.doesNotMatch(dataLoader, /buildNoHospitalState/);
  assert.doesNotMatch(dataLoader, /buildPausedState/);

  assert.match(loadGuard, /import \{[\s\S]*buildNoHospitalState,[\s\S]*buildPausedState,[\s\S]*\} from '\.\/appStatePresets';/s);
  assert.match(loadGuard, /setState\(prev => buildPausedState\(prev, user\)\)/);
  assert.match(loadGuard, /setState\(prev => buildNoHospitalState\(prev, user\)\)/);

  assert.match(presets, /function getEmptyWorkspaceData\(\)/);
  assert.match(presets, /fixtureData: null,/);
  assert.match(presets, /inventory: \[],/);
  assert.match(presets, /orders: \[],/);
  assert.match(presets, /surgeryMaster: \{\},/);
  assert.match(presets, /function getEmptyHospitalContext\(\)/);
  assert.match(presets, /planState: null,/);
  assert.match(presets, /memberCount: 0,/);
  assert.match(presets, /hospitalBizFileUrl: null,/);
  assert.match(presets, /export function buildSignedOutState\(prev: AppState\): AppState \{/);
  assert.match(presets, /export function buildLeaveHospitalState\(prev: AppState, user: User\): AppState \{/);
});
