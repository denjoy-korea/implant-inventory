import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { computeTrafficKpiSnapshot } from './funnel-kpi-utils.mjs';

const KST_TIMEZONE = 'Asia/Seoul';
const DAILY_REPORT_REL_DIR = path.join('docs', '04-report', 'traffic-kpi-daily');
const DEFAULT_REPORT_REL_DIR = path.join('docs', '04-report');

function getDotEnvValue(key) {
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx < 0) continue;
      const currentKey = line.slice(0, idx).trim();
      if (currentKey !== key) continue;
      return line.slice(idx + 1).trim();
    }
  } catch {
    // ignore: fallback to process.env only
  }
  return null;
}

function formatPct(value) {
  return `${value}%`;
}

function formatKstDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function toKstIso(date = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(date.getTime() + kstOffsetMs).toISOString().replace('Z', '+09:00');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    days: 30,
    snapshotDate: null,
    outDir: null,
    daily: false,
    allowAnonFallback: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (/^\d+$/.test(arg)) {
      options.days = Number(arg);
      continue;
    }
    if (arg === '--daily') {
      options.daily = true;
      continue;
    }
    if (arg === '--allow-anon-fallback') {
      options.allowAnonFallback = true;
      continue;
    }
    if (arg.startsWith('--snapshot-date=')) {
      options.snapshotDate = arg.split('=')[1] || null;
      continue;
    }
    if (arg.startsWith('--out-dir=')) {
      options.outDir = arg.split('=')[1] || null;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function isValidYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return formatKstDate(parsed) === value;
}

function resolveWindow({ days, snapshotDate }) {
  if (snapshotDate) {
    const snapshotStartUtc = new Date(`${snapshotDate}T00:00:00+09:00`);
    const untilUtc = new Date(snapshotStartUtc.getTime() + 86400_000);
    const sinceUtc = new Date(untilUtc.getTime() - days * 86400_000);
    return {
      snapshotLabel: snapshotDate,
      sinceIso: sinceUtc.toISOString(),
      untilIso: untilUtc.toISOString(),
    };
  }

  const now = new Date();
  return {
    snapshotLabel: formatKstDate(now),
    sinceIso: new Date(now.getTime() - days * 86400_000).toISOString(),
    untilIso: null,
  };
}

function resolveReportDir({ daily, outDir }) {
  if (outDir) {
    return path.isAbsolute(outDir)
      ? outDir
      : path.join(process.cwd(), outDir);
  }
  const rel = daily ? DAILY_REPORT_REL_DIR : DEFAULT_REPORT_REL_DIR;
  return path.join(process.cwd(), rel);
}

function printUsage() {
  console.log('Usage: node scripts/admin-traffic-snapshot.mjs [days] [--snapshot-date=YYYY-MM-DD] [--daily] [--out-dir=PATH] [--allow-anon-fallback]');
  console.log('Examples:');
  console.log('  node scripts/admin-traffic-snapshot.mjs 30');
  console.log('  node scripts/admin-traffic-snapshot.mjs 30 --daily');
  console.log('  node scripts/admin-traffic-snapshot.mjs 30 --snapshot-date=2026-03-04 --daily');
  console.log('  node scripts/admin-traffic-snapshot.mjs 14 --daily --allow-anon-fallback');
}

async function fetchPageViews({ supabaseUrl, serviceRoleKey, sinceIso, untilIso }) {
  const select = encodeURIComponent('page,session_id,user_id,referrer,event_type,event_data,created_at');
  const filterParts = [
    `select=${select}`,
    `created_at=gte.${encodeURIComponent(sinceIso)}`,
  ];
  if (untilIso) {
    filterParts.push(`created_at=lt.${encodeURIComponent(untilIso)}`);
  }
  filterParts.push('order=created_at.asc');
  const baseUrl = `${supabaseUrl}/rest/v1/page_views?${filterParts.join('&')}`;

  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const to = from + pageSize - 1;
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Range-Unit': 'items',
        Range: `${from}-${to}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`page_views fetch failed (${response.status}): ${body}`);
    }

    const chunk = await response.json();
    if (!Array.isArray(chunk)) {
      throw new Error('Unexpected response shape: expected array');
    }

    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function renderMarkdownReport({ days, rows, snapshot, snapshotLabel, sinceIso, untilIso }) {
  const generatedAt = toKstIso(new Date());
  const lines = [];
  lines.push(`# 관리자 트래픽 KPI 스냅샷 (${days}일)`);
  lines.push('');
  lines.push(`- 생성시각(KST): ${generatedAt}`);
  lines.push(`- 스냅샷 기준일(KST): ${snapshotLabel}`);
  lines.push(`- 집계구간 시작(UTC): ${sinceIso}`);
  lines.push(`- 집계구간 종료(UTC): ${untilIso ?? '(현재 시각)'}`);
  lines.push(`- 원본 row 수: ${rows.length}`);
  lines.push(`- 고유 세션 수: ${snapshot.uniqueSessions}`);
  lines.push(`- 로그인 전환 세션: ${snapshot.convertedSessions} (${formatPct(snapshot.conversionRate)})`);
  lines.push(`- session_id 누락 row: ${snapshot.missingSessionRows}`);
  lines.push(`- 평균 Time-to-Auth: ${snapshot.avgTimeToAuthMinutes}분`);
  lines.push(`- 평균 Time-to-Value: ${snapshot.avgTimeToValueMinutes}분`);
  lines.push(`- 결제 모달 오픈 세션: ${snapshot.paymentModalOpenSessions}`);
  lines.push(`- 결제 요청 성공 세션: ${snapshot.paymentRequestSuccessSessions}`);
  lines.push(`- 결제 요청 실패 세션: ${snapshot.paymentRequestErrorSessions}`);
  lines.push(`- 결제 모달 완료율: ${formatPct(snapshot.paymentModalCompletionRate)}`);
  lines.push(`- 모바일 랜딩 세션: ${snapshot.mobileLandingSessions}`);
  lines.push(`- 모바일 후속행동 세션: ${snapshot.mobileEngagedSessions}`);
  lines.push(`- 모바일 이탈률(세션): ${formatPct(snapshot.mobileDropoffRate)}`);
  lines.push('');
  lines.push('## 이벤트 퍼널');
  lines.push('');
  lines.push('| Stage | Sessions | Step CVR |');
  lines.push('|---|---:|---:|');
  snapshot.eventFunnel.forEach((stage) => {
    lines.push(`| ${stage.label} | ${stage.count} | ${stage.stepCvr === null ? '-' : `${stage.stepCvr}%`} |`);
  });
  lines.push('');
  lines.push(`- Contact Submit 세션: ${snapshot.contactSubmitSessions}`);
  lines.push(`- Waitlist Submit 세션: ${snapshot.waitlistSubmitSessions}`);
  lines.push(`- Contact/Waitlist 통합 전환 세션: ${snapshot.conversionSessions}`);
  lines.push('');
  lines.push('## Waitlist 퍼널');
  lines.push('');
  lines.push('| Step | Sessions | Drop-off |');
  lines.push('|---|---:|---:|');
  snapshot.waitlistStepCounts.forEach((step) => {
    lines.push(`| ${step.step} | ${step.count} | ${step.dropOffPct === null ? '-' : `${step.dropOffPct}%`} |`);
  });
  lines.push('');
  lines.push('> 주의: session_id가 없는 row는 세션 기반 KPI에서 제외됩니다.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printUsage();
    return;
  }

  if (!Number.isFinite(options.days) || options.days <= 0) {
    throw new Error('days must be a positive number (example: node scripts/admin-traffic-snapshot.mjs 30)');
  }
  const days = Math.round(options.days);

  if (options.snapshotDate && !isValidYmd(options.snapshotDate)) {
    throw new Error('snapshot-date must be YYYY-MM-DD in KST.');
  }

  const window = resolveWindow({
    days,
    snapshotDate: options.snapshotDate,
  });

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? getDotEnvValue('VITE_SUPABASE_URL');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? getDotEnvValue('SUPABASE_SERVICE_ROLE_KEY') ?? null;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? getDotEnvValue('VITE_SUPABASE_ANON_KEY') ?? null;

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is required (env or .env.local).');
  }
  let accessKey = serviceRoleKey;
  let accessMode = 'service_role';
  if (!accessKey && options.allowAnonFallback) {
    accessKey = anonKey;
    accessMode = 'anon';
  }
  if (!accessKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required (env or .env.local). If unavailable, use --allow-anon-fallback with VITE_SUPABASE_ANON_KEY.');
  }
  if (accessMode === 'anon') {
    console.warn('[admin-traffic-snapshot] WARN: using anon key fallback. KPI coverage may be limited by RLS.');
  }

  const rows = await fetchPageViews({
    supabaseUrl,
    serviceRoleKey: accessKey,
    sinceIso: window.sinceIso,
    untilIso: window.untilIso,
  });
  const snapshot = computeTrafficKpiSnapshot(rows);
  const markdown = renderMarkdownReport({
    days,
    rows,
    snapshot,
    snapshotLabel: window.snapshotLabel,
    sinceIso: window.sinceIso,
    untilIso: window.untilIso,
  });

  const reportDir = resolveReportDir({
    daily: options.daily,
    outDir: options.outDir,
  });
  mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `traffic-kpi-snapshot-${window.snapshotLabel}.md`);
  writeFileSync(reportPath, markdown, 'utf8');

  // Console summary for immediate verification in CI / terminal.
  console.log(`[admin-traffic-snapshot] wrote ${reportPath}`);
  console.log(`[admin-traffic-snapshot] accessMode=${accessMode}`);
  console.log(`[admin-traffic-snapshot] rows=${rows.length}, uniqueSessions=${snapshot.uniqueSessions}, conversionRate=${snapshot.conversionRate}%`);
  snapshot.eventFunnel.forEach((stage, index) => {
    const cvr = index === 0 ? '-' : `${stage.stepCvr}%`;
    console.log(`  - ${stage.label}: ${stage.count} (step CVR ${cvr})`);
  });
}

main().catch((error) => {
  console.error('[admin-traffic-snapshot] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
