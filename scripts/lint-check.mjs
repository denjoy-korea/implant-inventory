#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.next', 'coverage']);
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
}

function checkPlanLimitConsistency() {
  const typesTs = read('types.ts');
  if (!typesTs) return;

  const freePlanMaxItems80 = /free:\s*\{[\s\S]*?maxItems:\s*80[\s\S]*?\}/m.test(
    typesTs,
  );
  if (!freePlanMaxItems80) {
    failures.push('types.ts: PLAN_LIMITS.free.maxItems must be 80');
  }
}

checkDangerouslySetInnerHTML();
checkInnerHtmlAssignments();
checkSecurityMigrationGuards();
checkPlanLimitConsistency();

if (failures.length > 0) {
  console.error('Custom lint failed with the following issues:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Custom lint checks passed.');
