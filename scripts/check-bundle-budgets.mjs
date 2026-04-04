#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');

const budgets = [
  { label: 'Main index chunk', prefix: 'index-', ext: '.js', maxKiB: 325 },
  { label: 'System admin dashboard chunk', prefix: 'SystemAdminDashboard-', ext: '.js', maxKiB: 320 },
  { label: 'Order manager chunk', prefix: 'OrderManager-', ext: '.js', maxKiB: 230 },
  { label: 'Inventory manager chunk', prefix: 'InventoryManager-', ext: '.js', maxKiB: 225 },
  { label: 'Public shell chunk', prefix: 'PublicAppShell-', ext: '.js', maxKiB: 50 },
  { label: 'Public solution chunk', prefix: 'PublicSolutionRouteSection-', ext: '.js', maxKiB: 12 },
  { label: 'XLSX vendor chunk', prefix: 'xlsx-vendor-', ext: '.js', maxKiB: 440 },
];

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function findBudgetFile(prefix, ext) {
  const files = fs.readdirSync(distAssetsDir);
  const matches = files.filter((file) => file.startsWith(prefix) && file.endsWith(ext));
  return matches.length > 0 ? matches[0] : null;
}

if (!fs.existsSync(distAssetsDir)) {
  console.error('[bundle-budgets] dist/assets not found. Run `npm run build` first.');
  process.exit(1);
}

let failures = 0;

console.log('Bundle Budget Check');
console.log('===================');

for (const budget of budgets) {
  const file = findBudgetFile(budget.prefix, budget.ext);
  if (!file) {
    console.error(`[bundle-budgets] FAIL: ${budget.label} (${budget.prefix}*) not found`);
    failures++;
    continue;
  }

  const absolutePath = path.join(distAssetsDir, file);
  const sizeBytes = fs.statSync(absolutePath).size;
  const maxBytes = budget.maxKiB * 1024;

  if (sizeBytes > maxBytes) {
    console.error(
      `[bundle-budgets] FAIL: ${budget.label} ${formatKiB(sizeBytes)} > ${budget.maxKiB} KiB (${file})`
    );
    failures++;
    continue;
  }

  console.log(
    `[bundle-budgets] PASS: ${budget.label} ${formatKiB(sizeBytes)} <= ${budget.maxKiB} KiB (${file})`
  );
}

if (failures > 0) {
  console.error(`\n[bundle-budgets] ${failures} budget check(s) failed.`);
  process.exit(1);
}

console.log('\n[bundle-budgets] All bundle budgets passed.');
