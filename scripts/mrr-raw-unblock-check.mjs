import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const KST_TIMEZONE = 'Asia/Seoul';
const DEFAULT_MONTH = formatKstMonth(new Date());
const DEFAULT_OUTPUT_DIR = path.join('docs', '05-dataroom', '02-billing-reconciliation');

function formatKstDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatKstMonth(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

function toKstIso(date = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(date.getTime() + kstOffsetMs).toISOString().replace('Z', '+09:00');
}

function getDotEnvValue(key) {
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx < 0) continue;
      if (line.slice(0, idx).trim() !== key) continue;
      return line.slice(idx + 1).trim();
    }
  } catch {
    // ignore
  }
  return null;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    month: DEFAULT_MONTH,
    outDir: DEFAULT_OUTPUT_DIR,
    allowAnonFallback: true,
    strict: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg.startsWith('--month=')) {
      options.month = arg.split('=')[1] || options.month;
      continue;
    }
    if (arg.startsWith('--out-dir=')) {
      options.outDir = arg.split('=')[1] || options.outDir;
      continue;
    }
    if (arg === '--no-anon-fallback') {
      options.allowAnonFallback = false;
      continue;
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log('Usage: node scripts/mrr-raw-unblock-check.mjs [--month=YYYY-MM] [--out-dir=PATH]');
  console.log('Examples:');
  console.log('  node scripts/mrr-raw-unblock-check.mjs --month=2026-03');
}

function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(month);
}

function resolveMonthRange(month) {
  const [yearRaw, monthRaw] = month.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

async function fetchBillingRows({ supabaseUrl, accessKey, startIso, endIso }) {
  const baseEndpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/billing_history`;
  const query = `&created_at=gte.${encodeURIComponent(startIso)}&created_at=lt.${encodeURIComponent(endIso)}`;
  const endpoint = `${baseEndpoint}?select=payment_status,amount,is_test_payment,created_at${query}`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: accessKey,
        Authorization: `Bearer ${accessKey}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { rows: null, fetchError: `network fetch failed: ${message}`, fetchNotice: '' };
  }

  if (!response.ok) {
    const body = await response.text();

    if (response.status === 400 && body.includes('is_test_payment')) {
      const fallbackEndpoint = `${baseEndpoint}?select=payment_status,amount,created_at${query}`;
      try {
        const fallbackResponse = await fetch(fallbackEndpoint, {
          method: 'GET',
          headers: {
            apikey: accessKey,
            Authorization: `Bearer ${accessKey}`,
          },
        });

        if (!fallbackResponse.ok) {
          const fallbackBody = await fallbackResponse.text();
          return {
            rows: null,
            fetchError: `billing_history fallback fetch failed (${fallbackResponse.status}): ${fallbackBody}`,
            fetchNotice: '',
          };
        }

        const fallbackRows = await fallbackResponse.json();
        if (!Array.isArray(fallbackRows)) {
          throw new Error('Unexpected fallback response shape: expected array');
        }

        const normalizedRows = fallbackRows.map((row) => ({ ...row, is_test_payment: true }));
        return {
          rows: normalizedRows,
          fetchError: '',
          fetchNotice: 'is_test_payment 컬럼 미적용 환경으로 감지되어 전건 test 결제로 집계함 (migration 적용 필요)',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { rows: null, fetchError: `billing_history fallback fetch failed: ${message}`, fetchNotice: '' };
      }
    }

    return { rows: null, fetchError: `billing_history fetch failed (${response.status}): ${body}`, fetchNotice: '' };
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error('Unexpected response shape: expected array');
  }
  return { rows, fetchError: '', fetchNotice: '' };
}

function summarize(rows) {
  const base = {
    chargedAmount: 0,
    paidAmount: 0,
    paidNonZeroAmount: 0,
    paidNonZeroLiveAmount: 0,
    refundedAmount: 0,
    pendingAmount: 0,
    failedAmount: 0,
    cancelledAmount: 0,
    testPaymentAmount: 0,
    chargedCount: 0,
    paidCount: 0,
    paidNonZeroCount: 0,
    paidNonZeroLiveCount: 0,
    refundedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    testPaymentCount: 0,
  };

  for (const row of rows) {
    const status = String(row.payment_status || '');
    const amount = Number(row.amount || 0);
    const isTestPayment = row.is_test_payment !== false;

    // billing_history 레코드 생성 자체를 "청구(issued)"로 간주한다.
    base.chargedCount += 1;
    base.chargedAmount += amount;

    if (isTestPayment) {
      base.testPaymentCount += 1;
      base.testPaymentAmount += amount;
    }

    if (status === 'completed') {
      base.paidCount += 1;
      base.paidAmount += amount;

      if (amount > 0) {
        base.paidNonZeroCount += 1;
        base.paidNonZeroAmount += amount;
        if (!isTestPayment) {
          base.paidNonZeroLiveCount += 1;
          base.paidNonZeroLiveAmount += amount;
        }
      }
    } else if (status === 'pending') {
      base.pendingCount += 1;
      base.pendingAmount += amount;
    } else if (status === 'failed') {
      base.failedCount += 1;
      base.failedAmount += amount;
    } else if (status === 'cancelled') {
      base.cancelledCount += 1;
      base.cancelledAmount += amount;
      // 환불 status가 별도 컬럼에 없는 스키마이므로 cancelled를 proxy로 함께 집계
      base.refundedCount += 1;
      base.refundedAmount += amount;
    }
  }

  return base;
}

function renderReport({ month, startIso, endIso, generatedAt, summary, blockedReason, accessMode, fetchError, fetchNotice }) {
  const lines = [];
  lines.push(`# MRR Raw Unblock Check (${month})`);
  lines.push('');
  lines.push(`- 생성시각(KST): ${generatedAt}`);
  lines.push(`- 점검 월: ${month}`);
  lines.push(`- 조회 구간(UTC): ${startIso} ~ ${endIso}`);
  lines.push(`- 조회 권한 모드: ${accessMode}`);
  lines.push('');
  lines.push('## 집계 결과');
  lines.push('');
  lines.push(`- charged: ${summary.chargedCount}건 / ${summary.chargedAmount.toLocaleString()}원`);
  lines.push(`- paid: ${summary.paidCount}건 / ${summary.paidAmount.toLocaleString()}원`);
  lines.push(`- paid_non_zero: ${summary.paidNonZeroCount}건 / ${summary.paidNonZeroAmount.toLocaleString()}원`);
  lines.push(`- paid_non_zero_live: ${summary.paidNonZeroLiveCount}건 / ${summary.paidNonZeroLiveAmount.toLocaleString()}원`);
  lines.push(`- refunded: ${summary.refundedCount}건 / ${summary.refundedAmount.toLocaleString()}원`);
  lines.push(`- pending: ${summary.pendingCount}건 / ${summary.pendingAmount.toLocaleString()}원`);
  lines.push(`- failed: ${summary.failedCount}건 / ${summary.failedAmount.toLocaleString()}원`);
  lines.push(`- cancelled: ${summary.cancelledCount}건 / ${summary.cancelledAmount.toLocaleString()}원`);
  lines.push(`- test_payment: ${summary.testPaymentCount}건 / ${summary.testPaymentAmount.toLocaleString()}원`);
  lines.push('- status 기준: payment_status(pending/completed/failed/cancelled), refunded는 cancelled 프록시 집계');
  lines.push('- live 기준: completed + amount>0 + is_test_payment=false');
  if (fetchNotice) {
    lines.push(`- fetch notice: ${fetchNotice}`);
  }
  if (fetchError) {
    lines.push(`- fetch error: ${fetchError}`);
  }
  lines.push('');
  lines.push('## 판정');
  lines.push('');

  if (blockedReason) {
    lines.push('- 상태: BLOCKED');
    lines.push(`- 사유: ${blockedReason}`);
  } else {
    lines.push('- 상태: READY');
    lines.push('- 사유: 실결제 paid 레코드가 존재하므로 PG raw 대사 단계로 진행 가능');
  }
  lines.push('');

  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printUsage();
    return;
  }

  if (!isValidMonth(options.month)) {
    throw new Error('month must be YYYY-MM.');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? getDotEnvValue('VITE_SUPABASE_URL');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? getDotEnvValue('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? getDotEnvValue('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is required.');
  }
  let accessMode = 'service_role';
  let accessKey = serviceRoleKey;
  if (!accessKey && options.allowAnonFallback && anonKey) {
    accessMode = 'anon_fallback';
    accessKey = anonKey;
  }
  if (!accessKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required (or provide VITE_SUPABASE_ANON_KEY with anon fallback).');
  }

  const { startIso, endIso } = resolveMonthRange(options.month);
  const { rows, fetchError, fetchNotice } = await fetchBillingRows({
    supabaseUrl,
    accessKey,
    startIso,
    endIso,
  });
  const summary = summarize(rows ?? []);
  let blockedReason = '';
  if (accessMode === 'anon_fallback') {
    blockedReason = 'service role key 미설정 상태(anon fallback)로는 신뢰 가능한 raw 대사 검증을 확정할 수 없음';
  } else if (fetchError) {
    blockedReason = 'billing_history 조회 실패로 MRR raw 대사 검증 진행 불가';
  } else if (summary.paidNonZeroLiveCount === 0) {
    blockedReason = '실결제(금액>0, 테스트 제외) paid 레코드가 없어 MRR raw 대사 검증을 시작할 수 없음';
  }

  const report = renderReport({
    month: options.month,
    startIso,
    endIso,
    generatedAt: toKstIso(new Date()),
    summary,
    blockedReason,
    accessMode,
    fetchError,
    fetchNotice,
  });

  const outDir = path.isAbsolute(options.outDir)
    ? options.outDir
    : path.join(process.cwd(), options.outDir);
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `mrr-raw-unblock-check-${formatKstDate(new Date())}.md`);
  writeFileSync(outPath, report, 'utf8');

  console.log(`[mrr-raw-unblock-check] wrote ${outPath}`);
  if (blockedReason) {
    console.log(`[mrr-raw-unblock-check] BLOCKED: ${blockedReason}`);
    if (options.strict) process.exit(1);
    return;
  }
  console.log('[mrr-raw-unblock-check] READY: non-zero paid records detected.');
}

main().catch((error) => {
  console.error('[mrr-raw-unblock-check] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
