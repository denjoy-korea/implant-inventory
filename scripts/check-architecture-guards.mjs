#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const contractTests = [
  'scripts/app-orchestrator-boundary.test.mjs',
  'scripts/app-session-lifecycle-contract.test.mjs',
  'scripts/app-shell-section-contract.test.mjs',
  'scripts/public-shell-section-contract.test.mjs',
  'scripts/view-registry-contract.test.mjs',
  'scripts/mobile-critical-flow.test.mjs',
];

const result = spawnSync('node', ['--test', ...contractTests], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
