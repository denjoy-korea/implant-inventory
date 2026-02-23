#!/usr/bin/env node

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
