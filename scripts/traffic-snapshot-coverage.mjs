import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const KST_TIMEZONE = 'Asia/Seoul';
const DEFAULT_DAYS = 28;
const DEFAULT_MIN_REQUIRED = 27;
const DEFAULT_DIR = path.join('docs', '04-report', 'traffic-kpi-daily');
const DEFAULT_REPORT = path.join('docs', '04-report', 'traffic-kpi-coverage.md');

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

function isValidYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return formatKstDate(parsed) === value;
}

function shiftKstDate(ymd, deltaDays) {
  const start = new Date(`${ymd}T00:00:00+09:00`);
  start.setUTCDate(start.getUTCDate() + deltaDays);
  return formatKstDate(start);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    days: DEFAULT_DAYS,
    minRequired: DEFAULT_MIN_REQUIRED,
    dir: DEFAULT_DIR,
    reportPath: DEFAULT_REPORT,
    endDate: formatKstDate(new Date()),
    help: false,
  };

  let positionalIndex = 0;
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg.startsWith('--dir=')) {
      options.dir = arg.split('=')[1] || DEFAULT_DIR;
      continue;
    }
    if (arg.startsWith('--report=')) {
      options.reportPath = arg.split('=')[1] || DEFAULT_REPORT;
      continue;
    }
    if (arg.startsWith('--end-date=')) {
      options.endDate = arg.split('=')[1] || options.endDate;
      continue;
    }
    if (/^\d+$/.test(arg)) {
      if (positionalIndex === 0) options.days = Number(arg);
      if (positionalIndex === 1) options.minRequired = Number(arg);
      positionalIndex += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log('Usage: node scripts/traffic-snapshot-coverage.mjs [days] [minRequired] [--dir=PATH] [--report=PATH] [--end-date=YYYY-MM-DD]');
  console.log('Examples:');
  console.log('  node scripts/traffic-snapshot-coverage.mjs 28 27');
  console.log('  node scripts/traffic-snapshot-coverage.mjs 14 13 --end-date=2026-03-04');
}

function buildExpectedDates(days, endDate) {
  const dates = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dates.push(shiftKstDate(endDate, -offset));
  }
  return dates;
}

function readExistingDates(targetDir) {
  if (!existsSync(targetDir)) return new Set();
  const files = readdirSync(targetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const dates = new Set();
  for (const file of files) {
    const match = file.match(/^traffic-kpi-snapshot-(\d{4}-\d{2}-\d{2})\.md$/);
    if (match) dates.add(match[1]);
  }
  return dates;
}

function renderCoverageMarkdown({ days, minRequired, endDate, presentCount, coveragePct, expectedDates, missingDates, sourceDir }) {
  const lines = [];
  lines.push('# Traffic Snapshot Coverage');
  lines.push('');
  lines.push(`- 생성시각(KST): ${toKstIso(new Date())}`);
  lines.push(`- 대상 디렉터리: \`${sourceDir}\``);
  lines.push(`- 기준일(KST): ${endDate}`);
  lines.push(`- 검사 구간: 최근 ${days}일`);
  lines.push(`- 요구 생성일 수: ${minRequired}일`);
  lines.push(`- 실제 생성일 수: ${presentCount}일`);
  lines.push(`- 커버리지: ${coveragePct}%`);
  lines.push('');
  lines.push('## Missing Dates');
  lines.push('');

  if (missingDates.length === 0) {
    lines.push('- 없음');
  } else {
    missingDates.forEach((date) => {
      lines.push(`- ${date}`);
    });
  }

  lines.push('');
  lines.push('## Expected Dates');
  lines.push('');
  expectedDates.forEach((date) => {
    const status = missingDates.includes(date) ? 'missing' : 'ok';
    lines.push(`- ${date} (${status})`);
  });
  lines.push('');

  return lines.join('\n');
}

function resolvePath(cwd, target) {
  if (path.isAbsolute(target)) return target;
  return path.join(cwd, target);
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printUsage();
    return;
  }

  if (!Number.isFinite(options.days) || options.days <= 0) {
    throw new Error('days must be a positive number.');
  }
  if (!Number.isFinite(options.minRequired) || options.minRequired < 0) {
    throw new Error('minRequired must be zero or a positive number.');
  }
  if (!isValidYmd(options.endDate)) {
    throw new Error('end-date must be YYYY-MM-DD in KST.');
  }

  const days = Math.round(options.days);
  const minRequired = Math.round(options.minRequired);
  const sourceDir = resolvePath(process.cwd(), options.dir);
  const reportPath = resolvePath(process.cwd(), options.reportPath);
  const reportDir = path.dirname(reportPath);

  const expectedDates = buildExpectedDates(days, options.endDate);
  const existingDates = readExistingDates(sourceDir);
  const missingDates = expectedDates.filter((date) => !existingDates.has(date));
  const presentCount = expectedDates.length - missingDates.length;
  const coveragePct = Math.round((presentCount / expectedDates.length) * 100);

  const markdown = renderCoverageMarkdown({
    days,
    minRequired,
    endDate: options.endDate,
    presentCount,
    coveragePct,
    expectedDates,
    missingDates,
    sourceDir,
  });

  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, markdown, 'utf8');

  console.log(`[traffic-snapshot-coverage] wrote ${reportPath}`);
  console.log(`[traffic-snapshot-coverage] present=${presentCount}/${expectedDates.length}, minRequired=${minRequired}, coverage=${coveragePct}%`);
  if (missingDates.length > 0) {
    console.log(`[traffic-snapshot-coverage] missing: ${missingDates.join(', ')}`);
  }

  if (presentCount < minRequired) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[traffic-snapshot-coverage] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
