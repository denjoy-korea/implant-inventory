#!/usr/bin/env node
/**
 * smoke-auto.mjs — 자동화 가능한 smoke 검증 항목 실행기
 *
 * ⚠️  수동 체크리스트 항목(브라우저 필요)은 npm run smoke:ops 참조.
 *
 * - 로컬(env 없음): check-edge-functions.mjs가 자체적으로 SKIP → exit(0)
 * - CI(env 있음):   Edge Function 404/auth 오류 시 exit(1) → 파이프라인 차단
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const checks = [
  {
    name: 'Architecture guard contracts (app-shell/session/public/dashboard/mobile)',
    cmd: 'node',
    args: ['scripts/check-architecture-guards.mjs'],
  },
  {
    name: 'Edge Functions 배포 상태 (xlsx-parse, xlsx-generate, toss-payment-confirm, crypto-service, notify-signup, auth-send-email)',
    cmd: 'node',
    args: ['scripts/check-edge-functions.mjs'],
  },
  {
    name: '환불 정합성 점검 (refund_amount / credit_restore_amount)',
    cmd: 'node',
    args: ['scripts/check-refund-reconciliation.mjs'],
  },
];

let passed = 0;
let failed = 0;

console.log('Smoke Auto Checks');
console.log('=================');

for (const check of checks) {
  const result = spawnSync(check.cmd, check.args, { stdio: 'inherit' });
  if (result.status === 0) {
    console.log(`[smoke-auto] PASS: ${check.name}`);
    passed++;
  } else {
    console.error(`[smoke-auto] FAIL: ${check.name}`);
    failed++;
  }
}

console.log('');
console.log(`Smoke Auto: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\n[smoke-auto] 자동 게이트 실패. 머지 전 수동 확인 필요: npm run smoke:ops');
  process.exit(1);
}
