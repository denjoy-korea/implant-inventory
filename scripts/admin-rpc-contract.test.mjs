import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');

function readMigrationSql() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'))
    .join('\n\n');
}

function fnPattern(name) {
  return new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+(?:public\\.)?${name}\\s*\\(`, 'i');
}

test('admin dashboard RPC contracts exist in active migrations', () => {
  const sql = readMigrationSql();
  const requiredFunctions = [
    'get_all_profiles',
    'get_all_profiles_with_last_login',
    'get_profiles_last_access_map',
    'get_plan_usage_counts',
    'admin_assign_plan',
  ];

  for (const fnName of requiredFunctions) {
    assert.match(
      sql,
      fnPattern(fnName),
      `${fnName} must be defined in supabase/migrations/*.sql`,
    );
  }

  assert.match(
    sql,
    /NOTIFY\s+pgrst,\s*'reload schema';/i,
    'admin RPC backfill should trigger a PostgREST schema cache reload',
  );
});
