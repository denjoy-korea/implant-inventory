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
  // 핵심 운영 함수 배포 확인 — 404 = 미배포(FAIL), 그 외 응답 = 배포됨(OK)
  // onlyCheck404: 함수 자체 인증(401) 또는 잘못된 프로브 body로 인한 에러(5xx)를 배포 실패로 오판하지 않음
  { name: 'toss-payment-confirm', body: {}, opts: { onlyCheck404: true } },  // 함수 레벨 JWT 검증 → 401 정상
  { name: 'crypto-service', body: { action: 'ping' }, opts: { onlyCheck404: true } },  // 함수 레벨 JWT 검증 → 401 정상
  { name: 'notify-signup', body: { _probe: true } },  // verify_jwt=false, 유효하지 않은 body → 200 정상
  { name: 'auth-send-email', body: {}, opts: { onlyCheck404: true } },  // Auth Hook 전용 payload 없으면 500
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function classifyUnreachableDetail(detail) {
  const lowered = detail.toLowerCase();
  if (lowered.includes('could not resolve') || lowered.includes('enotfound') || lowered.includes('getaddrinfo') || lowered.includes('dns')) {
    return 'dns';
  }
  if (lowered.includes('timed out') || lowered.includes('etimedout') || lowered.includes('timeout') || lowered.includes('abort')) {
    return 'timeout';
  }
  if (lowered.includes('econnrefused') || lowered.includes('connection refused') || lowered.includes('refused')) {
    return 'connection_refused';
  }
  if (lowered.includes('certificate') || lowered.includes('tls') || lowered.includes('ssl')) {
    return 'tls';
  }
  return 'network';
}

async function probeFunctionOnce(name, body, opts = {}) {
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
    // onlyCheck404: 404만 배포 실패로 판정 (함수 자체 인증/에러를 정상으로 허용)
    if (opts.onlyCheck404) {
      return { ok: true, name, status };
    }
    if (status === 401 || status === 403) {
      return { ok: false, name, reason: 'auth', status };
    }
    if (status === 504) {
      // 504 = cold-start timeout: 재시도 대상으로 별도 처리
      return { ok: false, name, reason: 'cold_start', status };
    }
    if (status >= 500) {
      return { ok: false, name, reason: 'server', status };
    }
    return { ok: true, name, status };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      name,
      reason: 'unreachable',
      detail,
      unreachableType: classifyUnreachableDetail(detail),
    };
  }
}

async function probeFunction(name, body, opts = {}) {
  const result = await probeFunctionOnce(name, body, opts);
  // 504 cold-start: 5초 대기 후 1회 재시도
  if (result.reason === 'cold_start') {
    console.warn(`[edge-check] WARN: ${name} cold-start timeout (504), retrying in 5s...`);
    await wait(5000);
    return probeFunctionOnce(name, body, opts);
  }

  // 네트워크 단절/일시 장애: 2초 대기 후 1회 재시도
  if (result.reason === 'unreachable') {
    console.warn(`[edge-check] WARN: ${name} unreachable[${result.unreachableType}] on first attempt, retrying in 2s...`);
    await wait(2000);
    const retryResult = await probeFunctionOnce(name, body, opts);
    if (retryResult.ok) {
      return { ...retryResult, recoveredFrom: 'unreachable' };
    }
    if (retryResult.reason === 'unreachable') {
      return { ...retryResult, retried: true };
    }
    return retryResult;
  }

  return result;
}

const results = [];
for (const probe of probes) {
  results.push(await probeFunction(probe.name, probe.body, probe.opts));
}

let failed = false;
for (const result of results) {
  if (result.ok) {
    if (result.recoveredFrom === 'unreachable') {
      console.log(`[edge-check] OK: ${result.name} (HTTP ${result.status}, recovered after unreachable retry)`);
    } else {
      console.log(`[edge-check] OK: ${result.name} (HTTP ${result.status})`);
    }
    continue;
  }

  if (result.reason === 'unreachable') {
    const retryText = result.retried ? 'after retry' : 'without retry';
    const msg = `[edge-check] WARN: ${result.name} unreachable[${result.unreachableType}] ${retryText} (${result.detail})`;
    if (failOnUnreachable) {
      console.error(msg);
      failed = true;
    } else {
      console.warn(msg);
    }
    continue;
  }

  if (result.reason === 'cold_start') {
    // 재시도 후에도 504면 인프라 문제 → 경고만 (CI 블로킹 안 함)
    console.warn(`[edge-check] WARN: ${result.name} still cold-start timeout after retry (HTTP 504) — skipping`);
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
