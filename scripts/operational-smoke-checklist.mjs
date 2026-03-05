#!/usr/bin/env node
/**
 * operational-smoke-checklist.mjs — 수동 배포 전 체크리스트 (참조용)
 *
 * ⚠️  이 스크립트는 체크리스트를 출력하고 exit(0)을 반환합니다.
 *     실제 자동 검증은 smoke:auto (smoke-auto.mjs)가 담당합니다.
 *
 * 사용:
 *   npm run smoke:ops        ← 배포 전 인간이 확인할 항목 출력 (이 파일)
 *   npm run smoke:auto       ← CI 자동 게이트 (verify:premerge에 포함)
 *   npm run verify:premerge  ← 전체 premerge 파이프라인
 */

const checklist = [
  '1) Auth: login with a valid account and reach dashboard',
  '2) Dashboard tabs: switch overview -> inventory_master -> order_management -> fail_management',
  '3) Order flow: toggle one order status and verify UI refresh',
  '4) Upload flow: open raw data upload tab and trigger file picker',
  '5) Mobile shell: verify bottom nav is visible on md:hidden viewport',
  '6) Public legal/UX regression: run npm run test:legalux',
  '7) KPI funnel regression: run npm run test:funnel',
  '8) Edge deploy check: run npm run smoke:edge (expect no 404 for xlsx functions)',
  '9) Gate checks: run npm run verify:premerge',
];

console.log('Operational Smoke Checklist');
console.log('===========================');
for (const step of checklist) {
  console.log(`- ${step}`);
}
console.log('\nRule: run this checklist before/after App shell changes.');
