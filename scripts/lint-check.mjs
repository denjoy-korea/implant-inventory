#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.next', 'coverage', '.claude']);
const failures = [];

function toUnixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function rel(filePath) {
  return toUnixPath(path.relative(REPO_ROOT, filePath));
}

function walk(dir, result = []) {
  if (!existsSync(dir)) return result;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, result);
      continue;
    }
    result.push(fullPath);
  }
  return result;
}

function read(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relPath}`);
    return '';
  }
  return readFileSync(fullPath, 'utf8');
}

function checkDangerouslySetInnerHTML() {
  const sourceFiles = walk(REPO_ROOT).filter((filePath) => {
    return /\.(ts|tsx)$/.test(filePath);
  });

  const sinkPattern =
    /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*([^}]+)\}\s*\}/g;

  for (const filePath of sourceFiles) {
    const content = readFileSync(filePath, 'utf8');
    if (!content.includes('dangerouslySetInnerHTML')) continue;

    let match;
    while ((match = sinkPattern.exec(content))) {
      const expr = match[1].trim();
      if (!expr.includes('sanitizeRichHtml(')) {
        failures.push(
          `${rel(filePath)}: dangerouslySetInnerHTML must call sanitizeRichHtml(...)`,
        );
      }
    }
  }
}

function checkInnerHtmlAssignments() {
  const sourceFiles = walk(REPO_ROOT).filter((filePath) => {
    return /\.(ts|tsx)$/.test(filePath);
  });

  const assignPattern = /innerHTML\s*=\s*([^;]+);/g;

  for (const filePath of sourceFiles) {
    const content = readFileSync(filePath, 'utf8');
    if (!content.includes('innerHTML =')) continue;

    let match;
    while ((match = assignPattern.exec(content))) {
      const expr = match[1].trim();
      if (!expr.includes('sanitizeRichHtml(')) {
        failures.push(
          `${rel(filePath)}: innerHTML assignment must call sanitizeRichHtml(...)`,
        );
      }
    }
  }
}

function readWithArchiveFallback(relPath) {
  const content = readSilent(relPath);
  if (content) return content;
  // Try _archive/ fallback (files may be moved during cleanup)
  const parts = relPath.split('/');
  if (parts.length >= 2) {
    const archivePath = parts.slice(0, -1).join('/') + '/_archive/' + parts[parts.length - 1];
    return readSilent(archivePath);
  }
  return '';
}

function readSilent(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf8');
}

function checkSecurityMigrationGuards() {
  const sql = readWithArchiveFallback('supabase/022_security_integrity_phase2.sql');
  if (!sql) return;
  const sqlHotfix024 = readWithArchiveFallback('supabase/024_fix_create_order_with_items_ambiguity.sql');
  if (!sqlHotfix024) return;
  const sqlVerify025 = readWithArchiveFallback('supabase/025_verify_create_order_hotfix.sql');
  if (!sqlVerify025) return;
  const sqlReport026 = readWithArchiveFallback('supabase/026_patient_info_encryption_report.sql');
  if (!sqlReport026) return;

  const requiredPatterns = [
    /REVOKE ALL ON FUNCTION process_payment_callback\(UUID, TEXT, TEXT\) FROM PUBLIC;/,
    /REVOKE ALL ON FUNCTION process_payment_callback\(UUID, TEXT, TEXT\) FROM authenticated;/,
    /GRANT EXECUTE ON FUNCTION process_payment_callback\(UUID, TEXT, TEXT\) TO service_role;/,
    /CREATE TRIGGER reset_request_member_update_guard/,
    /REVOKE ALL ON FUNCTION create_order_with_items\(JSONB, JSONB\) FROM PUBLIC;/,
    /GRANT EXECUTE ON FUNCTION create_order_with_items\(JSONB, JSONB\) TO authenticated;/,
    /CREATE TABLE IF NOT EXISTS admin_manuals/,
  ];

  for (const pattern of requiredPatterns) {
    if (!pattern.test(sql)) {
      failures.push(
        `supabase/022_security_integrity_phase2.sql is missing required guard: ${pattern}`,
      );
    }
  }

  const requiredHotfixPatterns = [
    /CREATE OR REPLACE FUNCTION create_order_with_items/,
    /SELECT p\.hospital_id[\s\S]*FROM profiles p[\s\S]*WHERE p\.id = auth\.uid\(\)/,
    /REVOKE ALL ON FUNCTION create_order_with_items\(JSONB, JSONB\) FROM PUBLIC;/,
    /GRANT EXECUTE ON FUNCTION create_order_with_items\(JSONB, JSONB\) TO authenticated;/,
  ];

  for (const pattern of requiredHotfixPatterns) {
    if (!pattern.test(sqlHotfix024)) {
      failures.push(
        `supabase/024_fix_create_order_with_items_ambiguity.sql is missing required guard: ${pattern}`,
      );
    }
  }

  const requiredVerifyPatterns = [
    /create_order_with_items_function_exists/,
    /create_order_with_items_uses_qualified_profile_alias/,
    /create_order_with_items_legacy_ambiguous_pattern_absent/,
    /create_order_with_items_public_execute_revoked/,
    /create_order_with_items_authenticated_execute_granted/,
  ];

  for (const pattern of requiredVerifyPatterns) {
    if (!pattern.test(sqlVerify025)) {
      failures.push(
        `supabase/025_verify_create_order_hotfix.sql is missing required check: ${pattern}`,
      );
    }
  }

  const requiredReportPatterns = [
    /COUNT\(\*\) FILTER \(\s*WHERE patient_info LIKE 'ENC:%'\s*\) AS enc_v1_records/,
    /COUNT\(\*\) FILTER \(\s*WHERE patient_info LIKE 'ENCv2:%'\s*\) AS enc_v2_records/,
    /AS plain_records/,
    /AS enc_v2_ratio_percent/,
  ];

  for (const pattern of requiredReportPatterns) {
    if (!pattern.test(sqlReport026)) {
      failures.push(
        `supabase/026_patient_info_encryption_report.sql is missing required metric: ${pattern}`,
      );
    }
  }
}

function checkMaintenanceServiceWiring() {
  const appTsx = read('App.tsx');
  const serviceTs = read('services/securityMaintenanceService.ts');
  if (!appTsx || !serviceTs) return;

  const appPatterns = [
    /import\s+\{\s*securityMaintenanceService\s*\}\s+from\s+'\.\/services\/securityMaintenanceService';/,
    /__securityMaintenanceService/,
  ];

  for (const pattern of appPatterns) {
    if (!pattern.test(appTsx)) {
      failures.push(`App.tsx is missing maintenance service wiring: ${pattern}`);
    }
  }

  const servicePatterns = [
    /getPatientInfoEncryptionStatus/,
    /migratePatientInfoToV2/,
    /like\('patient_info', 'ENC:%'\)/,
    /startsWith\('ENCv2:'\)/,
  ];

  for (const pattern of servicePatterns) {
    if (!pattern.test(serviceTs)) {
      failures.push(
        `services/securityMaintenanceService.ts is missing required behavior: ${pattern}`,
      );
    }
  }
}

function checkPlanLimitConsistency() {
  // PLAN_LIMITS may be defined in types/plan.ts and re-exported from types.ts
  const typesTs = read('types.ts');
  const planTs = read('types/plan.ts');
  if (!typesTs && !planTs) return;

  const combined = (typesTs || '') + (planTs || '');
  const freePlanMaxItems50 = /free:\s*\{[\s\S]*?maxItems:\s*50[\s\S]*?\}/m.test(combined);
  if (!freePlanMaxItems50) {
    failures.push('types.ts or types/plan.ts: PLAN_LIMITS.free.maxItems must be 50');
  }
}

function checkDataroomPricingConsistency() {
  const planTs = read('types/plan.ts');
  const billingDoc = read('docs/05-dataroom/02-billing-reconciliation/billing-reconciliation-2026-03.md');
  if (!planTs || !billingDoc) return;

  if (!/연간 월환산/.test(billingDoc)) {
    failures.push('docs/05-dataroom/02-billing-reconciliation/billing-reconciliation-2026-03.md: missing "연간 월환산" header');
  }

  if (/\|\s*Pro\s*\|/.test(billingDoc) || /\|\s*Enterprise\s*\|/.test(billingDoc)) {
    failures.push('docs/05-dataroom/02-billing-reconciliation/billing-reconciliation-2026-03.md: deprecated plan labels (Pro/Enterprise) must not appear');
  }

  const extractClientPrice = (plan, cycle) => {
    const re = new RegExp(`${plan}:\\s*\\{[^}]*${cycle}Price:\\s*(\\d+)`);
    const m = planTs.match(re);
    return m ? Number.parseInt(m[1], 10) : null;
  };
  const formatKrw = (value) => value.toLocaleString('ko-KR');

  for (const [plan, label] of [['basic', 'Basic'], ['plus', 'Plus'], ['business', 'Business']]) {
    const monthly = extractClientPrice(plan, 'monthly');
    const yearly = extractClientPrice(plan, 'yearly');
    if (monthly === null || yearly === null) {
      failures.push(`types/plan.ts: missing PLAN_PRICING for ${plan}`);
      continue;
    }

    const yearlyTotal = yearly * 12;
    const rowPattern = new RegExp(
      `\\|\\s*${label}\\s*\\|\\s*${formatKrw(monthly)}원\\s*\\|\\s*${formatKrw(yearly)}원\\s*\\|\\s*${formatKrw(yearlyTotal)}원\\s*\\|`,
    );
    if (!rowPattern.test(billingDoc)) {
      failures.push(
        `docs/05-dataroom/02-billing-reconciliation/billing-reconciliation-2026-03.md: ${label} row must match PLAN_PRICING (${formatKrw(monthly)} / ${formatKrw(yearly)} / ${formatKrw(yearlyTotal)})`,
      );
    }
  }

  // investor-pack 가격 검증
  const investorPack = read('docs/05-dataroom/06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md');
  if (investorPack) {
    for (const [plan, label] of [['basic', 'Basic'], ['plus', 'Plus'], ['business', 'Business']]) {
      const monthly = extractClientPrice(plan, 'monthly');
      const yearly = extractClientPrice(plan, 'yearly');
      if (monthly === null || yearly === null) continue;

      const yearlyTotal = yearly * 12;
      const rowPattern = new RegExp(
        `\\|\\s*${label}\\s*\\|\\s*${formatKrw(monthly)}원\\s*\\|\\s*${formatKrw(yearly)}원\\s*\\|\\s*${formatKrw(yearlyTotal)}원\\s*\\|`,
      );
      if (!rowPattern.test(investorPack)) {
        failures.push(
          `docs/05-dataroom/06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md: ${label} row must match PLAN_PRICING (${formatKrw(monthly)} / ${formatKrw(yearly)} / ${formatKrw(yearlyTotal)})`,
        );
      }
    }
  }
}

function checkLegacyPlanLabelsInActiveSurface() {
  const targets = [
    'index.html',
    'components',
    'docs/05-dataroom',
  ];
  const legacyPattern = /\b(Pro|Enterprise)\b/;

  const scanFiles = [];
  for (const target of targets) {
    const fullPath = path.join(REPO_ROOT, target);
    if (!existsSync(fullPath)) continue;
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      scanFiles.push(
        ...walk(fullPath).filter((filePath) => /\.(md|html|ts|tsx)$/.test(filePath)),
      );
      continue;
    }
    scanFiles.push(fullPath);
  }

  for (const filePath of scanFiles) {
    const content = readFileSync(filePath, 'utf8');
    if (legacyPattern.test(content)) {
      failures.push(`${rel(filePath)}: legacy plan labels (Pro/Enterprise) must not appear in active surfaces`);
    }
  }
}

function checkTypeSafetyGuardrails() {
  const sourceFiles = walk(REPO_ROOT).filter((filePath) => {
    return /\.(ts|tsx)$/.test(filePath);
  });

  const forbiddenPatterns = [
    { label: 'as any', regex: /\bas\s+any\b/ },
    { label: '@ts-ignore', regex: /@ts-ignore/ },
    { label: '@ts-expect-error', regex: /@ts-expect-error/ },
  ];

  for (const filePath of sourceFiles) {
    const content = readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.regex.test(content)) {
        failures.push(`${rel(filePath)}: forbidden type-safety suppression detected (${pattern.label})`);
      }
    }
  }
}

function checkBannedEnvPatterns() {
  // 암호화 키는 VITE_ 클라이언트 번들 금지 — Supabase Edge Function secret만 허용
  const bannedInReadme = [
    { pattern: /VITE_PATIENT_DATA_KEY/, label: 'VITE_PATIENT_DATA_KEY (암호화 키는 클라이언트 번들 금지 — Supabase secret 사용)' },
  ];

  const readmeContent = read('README.md');
  for (const { pattern, label } of bannedInReadme) {
    if (pattern.test(readmeContent)) {
      failures.push(`README.md: banned env pattern detected — ${label}`);
    }
  }

  // .env.example에도 VITE_PATIENT_DATA_KEY 실제 값 설정 항목이 없어야 함
  const envExampleContent = read('.env.example');
  const activeVitePatientKey = /^VITE_PATIENT_DATA_KEY\s*=/m;
  if (activeVitePatientKey.test(envExampleContent)) {
    failures.push('.env.example: VITE_PATIENT_DATA_KEY must not be set (use Supabase secret PATIENT_DATA_KEY instead)');
  }
}

function checkEdgeFunctionPricingSync() {
  const planTs = read('types/plan.ts');
  const edgeFn = read('supabase/functions/toss-payment-confirm/index.ts');
  if (!planTs || !edgeFn) return;

  // FALLBACK_PRICES must exist (renamed from PLAN_BASE_PRICES)
  if (!edgeFn.includes('FALLBACK_PRICES')) {
    failures.push(
      'supabase/functions/toss-payment-confirm/index.ts: FALLBACK_PRICES constant is missing (was PLAN_BASE_PRICES)',
    );
    return;
  }

  const extractClientPrice = (plan, cycle) => {
    const re = new RegExp(`${plan}:\\s*\\{[^}]*${cycle}Price:\\s*(\\d+)`);
    const m = planTs.match(re);
    return m ? Number.parseInt(m[1], 10) : null;
  };

  const extractFallbackPrice = (plan, cycle) => {
    // e.g. basic:    { monthly: 27000,  yearly: 21000  },
    const re = new RegExp(`${plan}:\\s*\\{[^}]*${cycle}:\\s*(\\d+)`);
    const m = edgeFn.match(re);
    return m ? Number.parseInt(m[1], 10) : null;
  };

  for (const [plan] of [['basic'], ['plus'], ['business']]) {
    for (const cycle of ['monthly', 'yearly']) {
      const clientPrice = extractClientPrice(plan, cycle);
      const fallbackPrice = extractFallbackPrice(plan, cycle);

      if (clientPrice === null) {
        failures.push(`types/plan.ts: missing PLAN_PRICING.${plan}.${cycle}Price`);
        continue;
      }
      if (fallbackPrice === null) {
        failures.push(
          `supabase/functions/toss-payment-confirm/index.ts: missing FALLBACK_PRICES.${plan}.${cycle}`,
        );
        continue;
      }
      if (clientPrice !== fallbackPrice) {
        failures.push(
          `Price mismatch for ${plan}/${cycle}: types/plan.ts=${clientPrice} vs FALLBACK_PRICES=${fallbackPrice}`,
        );
      }
    }
  }
}

function checkPlanDisplayConsistency() {
  // 1. authSignupConfig must use viewMonths, not retentionMonths
  const signupConfig = read('components/auth/authSignupConfig.ts');
  if (signupConfig) {
    if (/retentionMonths/.test(signupConfig)) {
      failures.push('components/auth/authSignupConfig.ts: must use viewMonths instead of retentionMonths for plan summary');
    }
    if (!signupConfig.includes('viewMonths')) {
      failures.push('components/auth/authSignupConfig.ts: viewMonths not found in plan summary builder');
    }
  }

  // 2. PricingPage must not contain "한정.*곳" pattern
  const pricingPage = read('components/PricingPage.tsx');
  if (pricingPage && /한정.*곳/.test(pricingPage)) {
    failures.push('components/PricingPage.tsx: "한정 N곳" label must not appear (confuses 병원 count with 품목 count)');
  }

  // 3. UserPlanPickerPanel current card must use billingCycle for price, not pickerCycle
  const pickerPanel = read('components/profile/UserPlanPickerPanel.tsx');
  if (pickerPanel) {
    // Detect the bug pattern: pickerCycle used directly to select price inside the current-card block
    // The current card section uses planState?.billingCycle for the label — price must match
    if (/pickerCycle\s*===\s*'yearly'\s*\?\s*PLAN_PRICING\[currentPlanId\]/.test(pickerPanel)) {
      failures.push('components/profile/UserPlanPickerPanel.tsx: current subscription card price must use billingCycle (not pickerCycle)');
    }
  }
}

checkDangerouslySetInnerHTML();
checkInnerHtmlAssignments();
checkSecurityMigrationGuards();
checkPlanLimitConsistency();
checkDataroomPricingConsistency();
checkEdgeFunctionPricingSync();
checkLegacyPlanLabelsInActiveSurface();
checkMaintenanceServiceWiring();
checkTypeSafetyGuardrails();
checkBannedEnvPatterns();
checkPlanDisplayConsistency();

if (failures.length > 0) {
  console.error('Custom lint failed with the following issues:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Custom lint checks passed.');
