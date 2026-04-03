import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function readRepoFile(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function readMigrationSql() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readRepoFile(path.join('supabase', 'migrations', name)))
    .join('\n\n');
}

test('signup form guards duplicate submit while request is in flight', () => {
  const source = readRepoFile('hooks/useAuthForm.ts');
  assert.match(
    source,
    /e\.preventDefault\(\);\s+if \(isSubmitting\) return;/,
    'signup submit handler must short-circuit when a request is already in flight',
  );
});

test('auth service normalizes signup 429 errors to a cooldown message', () => {
  const source = readRepoFile('services/authService.ts');
  assert.match(source, /String\(error\.status \|\| ''\) === '429'/);
  assert.match(source, /가입 요청이 너무 많습니다\. 60초 후 다시 시도해주세요\./);
});

test('public pricing availability contract exists in active migrations', () => {
  const sql = readMigrationSql();
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.plan_capacities/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_plan_availability_public\s*\(/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_plan_availability_public\(\) TO anon;/i);
});
