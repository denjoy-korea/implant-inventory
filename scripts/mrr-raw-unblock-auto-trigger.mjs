import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const KST_TIMEZONE = 'Asia/Seoul';
const DEFAULT_MONTH = formatKstMonth(new Date());
const DEFAULT_STATE_PATH = path.join(
  'docs',
  '05-dataroom',
  '02-billing-reconciliation',
  'mrr-raw-unblock-trigger-state.json',
);

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

function parseArgs(argv) {
  const options = {
    month: DEFAULT_MONTH,
    statePath: DEFAULT_STATE_PATH,
    help: false,
  };

  for (const arg of argv.slice(2)) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg.startsWith('--month=')) {
      options.month = arg.split('=')[1] || options.month;
      continue;
    }
    if (arg.startsWith('--state=')) {
      options.statePath = arg.split('=')[1] || options.statePath;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log('Usage: node scripts/mrr-raw-unblock-auto-trigger.mjs [--month=YYYY-MM] [--state=PATH]');
  console.log('Examples:');
  console.log('  node scripts/mrr-raw-unblock-auto-trigger.mjs');
  console.log('  node scripts/mrr-raw-unblock-auto-trigger.mjs --month=2026-03');
}

function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(month);
}

function resolvePath(targetPath) {
  if (path.isAbsolute(targetPath)) return targetPath;
  return path.join(process.cwd(), targetPath);
}

function findReportPath(outDir, kstDate) {
  const expected = path.join(outDir, `mrr-raw-unblock-check-${kstDate}.md`);
  if (existsSync(expected)) return expected;

  const entries = readdirSync(outDir)
    .filter((name) => name.startsWith('mrr-raw-unblock-check-') && name.endsWith('.md'))
    .sort();
  if (entries.length === 0) {
    throw new Error('mrr-raw-unblock-check report file was not generated.');
  }
  return path.join(outDir, entries[entries.length - 1]);
}

function runMrrCheck({ month, outDir }) {
  mkdirSync(outDir, { recursive: true });
  const args = ['scripts/mrr-raw-unblock-check.mjs', `--month=${month}`, `--out-dir=${outDir}`];
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`mrr-raw-unblock-check failed with exit code ${String(result.status)}`);
  }

  const reportPath = findReportPath(outDir, formatKstDate(new Date()));
  const reportContent = readFileSync(reportPath, 'utf8');
  const isReady = /-\s*상태:\s*READY/.test(reportContent);

  return { reportPath, reportContent, isReady };
}

function loadState(statePath) {
  if (!existsSync(statePath)) {
    return {
      lastReadyMonth: null,
      lastTriggeredAt: null,
      lastReportFile: null,
    };
  }

  const raw = readFileSync(statePath, 'utf8').trim();
  if (!raw) {
    return {
      lastReadyMonth: null,
      lastTriggeredAt: null,
      lastReportFile: null,
    };
  }

  const parsed = JSON.parse(raw);
  return {
    lastReadyMonth: parsed.lastReadyMonth ?? null,
    lastTriggeredAt: parsed.lastTriggeredAt ?? null,
    lastReportFile: parsed.lastReportFile ?? null,
  };
}

function saveState(statePath, state) {
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        lastReadyMonth: state.lastReadyMonth,
        lastTriggeredAt: state.lastTriggeredAt,
        lastReportFile: state.lastReportFile,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
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

  const statePath = resolvePath(options.statePath);
  const state = loadState(statePath);
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'mrr-unblock-trigger-'));

  console.log(`[mrr-auto-trigger] probing month=${options.month}`);
  const probe = runMrrCheck({ month: options.month, outDir: tempDir });

  if (!probe.isReady) {
    console.log('[mrr-auto-trigger] BLOCKED 상태 유지 — 자동 재실행 트리거 미발동');
    return;
  }

  if (state.lastReadyMonth === options.month) {
    console.log(`[mrr-auto-trigger] month=${options.month} already triggered — skip`);
    return;
  }

  const docsOutDir = path.dirname(statePath);
  const triggered = runMrrCheck({ month: options.month, outDir: docsOutDir });
  if (!triggered.isReady) {
    console.log('[mrr-auto-trigger] probe READY였지만 최종 실행 시 BLOCKED로 복귀 — skip');
    return;
  }

  const nextState = {
    lastReadyMonth: options.month,
    lastTriggeredAt: toKstIso(new Date()),
    lastReportFile: path.basename(triggered.reportPath),
  };
  saveState(statePath, nextState);

  console.log(
    `[mrr-auto-trigger] TRIGGERED month=${options.month}, report=${path.basename(
      triggered.reportPath,
    )}`,
  );
}

main().catch((error) => {
  console.error('[mrr-auto-trigger] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
