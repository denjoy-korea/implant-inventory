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

function checkSecurityMigrationGuards() {
  const sql = read('supabase/022_security_integrity_phase2.sql');
  if (!sql) return;
  const sqlHotfix024 = read('supabase/024_fix_create_order_with_items_ambiguity.sql');
  if (!sqlHotfix024) return;
  const sqlVerify025 = read('supabase/025_verify_create_order_hotfix.sql');
  if (!sqlVerify025) return;
  const sqlReport026 = read('supabase/026_patient_info_encryption_report.sql');
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
  const typesTs = read('types.ts');
  if (!typesTs) return;

  const freePlanMaxItems100 = /free:\s*\{[\s\S]*?maxItems:\s*100[\s\S]*?\}/m.test(
    typesTs,
  );
  if (!freePlanMaxItems100) {
    failures.push('types.ts: PLAN_LIMITS.free.maxItems must be 100');
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

checkDangerouslySetInnerHTML();
checkInnerHtmlAssignments();
checkSecurityMigrationGuards();
checkPlanLimitConsistency();
checkMaintenanceServiceWiring();
checkTypeSafetyGuardrails();

if (failures.length > 0) {
  console.error('Custom lint failed with the following issues:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Custom lint checks passed.');
