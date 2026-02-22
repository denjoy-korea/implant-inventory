import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { computeTrafficKpiSnapshot } from './funnel-kpi-utils.mjs';

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

function toKstIso(date = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  return new Date(date.getTime() + kstOffsetMs).toISOString().replace('Z', '+09:00');
}

async function fetchPageViews({ supabaseUrl, serviceRoleKey, days }) {
  const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();
  const select = encodeURIComponent('page,session_id,user_id,referrer,event_type,event_data,created_at');
  const baseUrl = `${supabaseUrl}/rest/v1/page_views?select=${select}&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.asc`;

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

function renderMarkdownReport({ days, rows, snapshot }) {
  const generatedAt = toKstIso(new Date());
  const lines = [];
  lines.push(`# 관리자 트래픽 KPI 스냅샷 (${days}일)`);
  lines.push('');
  lines.push(`- 생성시각(KST): ${generatedAt}`);
  lines.push(`- 원본 row 수: ${rows.length}`);
  lines.push(`- 고유 세션 수: ${snapshot.uniqueSessions}`);
  lines.push(`- 로그인 전환 세션: ${snapshot.convertedSessions} (${formatPct(snapshot.conversionRate)})`);
  lines.push(`- session_id 누락 row: ${snapshot.missingSessionRows}`);
  lines.push(`- 평균 Time-to-Auth: ${snapshot.avgTimeToAuthMinutes}분`);
  lines.push(`- 평균 Time-to-Value: ${snapshot.avgTimeToValueMinutes}분`);
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
  const daysArg = Number(process.argv[2] ?? 30);
  if (!Number.isFinite(daysArg) || daysArg <= 0) {
    throw new Error('days must be a positive number (example: node scripts/admin-traffic-snapshot.mjs 30)');
  }
  const days = Math.round(daysArg);

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? getDotEnvValue('VITE_SUPABASE_URL');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is required (env or .env.local).');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in env for admin snapshot.');
  }

  const rows = await fetchPageViews({ supabaseUrl, serviceRoleKey, days });
  const snapshot = computeTrafficKpiSnapshot(rows);
  const markdown = renderMarkdownReport({ days, rows, snapshot });

  const reportDir = path.join(process.cwd(), 'docs', '04-report');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `traffic-kpi-snapshot-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(reportPath, markdown, 'utf8');

  // Console summary for immediate verification in CI / terminal.
  console.log(`[admin-traffic-snapshot] wrote ${reportPath}`);
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
