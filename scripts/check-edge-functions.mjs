#!/usr/bin/env node

import process from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const requireEnv = args.has('--require-env');
const failOnUnreachable = args.has('--fail-on-unreachable');

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const text = readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const repoRoot = process.cwd();
const fileEnv = {
  ...readEnvFile(path.join(repoRoot, '.env')),
  ...readEnvFile(path.join(repoRoot, '.env.local')),
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  const message = 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY';
  if (requireEnv) {
    console.error(`[edge-check] FAIL: ${message}`);
    process.exit(1);
  }
  console.warn(`[edge-check] SKIP: ${message}`);
  process.exit(0);
}

const baseUrl = supabaseUrl.replace(/\/$/, '');
const probes = [
  { name: 'xlsx-parse', body: { fileBase64: 'aGVsbG8=', filename: 'probe.xlsx' } },
  { name: 'xlsx-generate', body: { activeSheet: { name: 'Sheet1', columns: [], rows: [] }, selectedIndices: [] } },
];

async function probeFunction(name, body) {
  const endpoint = `${baseUrl}/functions/v1/${name}`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const status = response.status;
    if (status === 404) {
      return { ok: false, name, reason: 'not_found', status };
    }
    if (status === 401 || status === 403) {
      return { ok: false, name, reason: 'auth', status };
    }
    if (status >= 500) {
      return { ok: false, name, reason: 'server', status };
    }
    return { ok: true, name, status };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, name, reason: 'unreachable', detail };
  }
}

const results = [];
for (const probe of probes) {
  results.push(await probeFunction(probe.name, probe.body));
}

let failed = false;
for (const result of results) {
  if (result.ok) {
    console.log(`[edge-check] OK: ${result.name} (HTTP ${result.status})`);
    continue;
  }

  if (result.reason === 'unreachable') {
    const msg = `[edge-check] WARN: ${result.name} unreachable (${result.detail})`;
    if (failOnUnreachable) {
      console.error(msg);
      failed = true;
    } else {
      console.warn(msg);
    }
    continue;
  }

  if (result.reason === 'not_found') {
    console.error(`[edge-check] FAIL: ${result.name} not deployed (HTTP 404)`);
    failed = true;
    continue;
  }

  if (result.reason === 'auth') {
    console.error(`[edge-check] FAIL: ${result.name} auth rejected (HTTP ${result.status})`);
    failed = true;
    continue;
  }

  console.error(`[edge-check] FAIL: ${result.name} server error (HTTP ${result.status})`);
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('[edge-check] All edge function probes passed.');
