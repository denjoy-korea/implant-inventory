import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const KST_TIMEZONE = 'Asia/Seoul';
const DEFAULT_DAYS = 28;
const DEFAULT_LAUNCH_DATE = '2026-02-25';
const MIN_FLOOR = 7;
const MIN_CAP = 27;

function formatKstDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isValidYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return formatKstDate(parsed) === value;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    days: DEFAULT_DAYS,
    launchDate: DEFAULT_LAUNCH_DATE,
    endDate: formatKstDate(new Date()),
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
    if (arg.startsWith('--launch-date=')) {
      options.launchDate = arg.split('=')[1] || options.launchDate;
      continue;
    }
    if (arg.startsWith('--end-date=')) {
      options.endDate = arg.split('=')[1] || options.endDate;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log('Usage: node scripts/traffic-snapshot-coverage-auto.mjs [days] [--launch-date=YYYY-MM-DD] [--end-date=YYYY-MM-DD]');
  console.log('Examples:');
  console.log('  node scripts/traffic-snapshot-coverage-auto.mjs 28');
  console.log('  node scripts/traffic-snapshot-coverage-auto.mjs 28 --launch-date=2026-02-25');
}

function computeDaysSinceLaunch(launchDate, endDate) {
  const launchUtc = new Date(`${launchDate}T00:00:00+09:00`).getTime();
  const endUtc = new Date(`${endDate}T00:00:00+09:00`).getTime();
  const diffDays = Math.floor((endUtc - launchUtc) / 86400_000);
  return Math.max(0, diffDays);
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
  if (!isValidYmd(options.launchDate)) {
    throw new Error('launch-date must be YYYY-MM-DD in KST.');
  }
  if (!isValidYmd(options.endDate)) {
    throw new Error('end-date must be YYYY-MM-DD in KST.');
  }

  const days = Math.round(options.days);
  const daysSinceLaunch = computeDaysSinceLaunch(options.launchDate, options.endDate);
  const minRequired = clamp(daysSinceLaunch, MIN_FLOOR, MIN_CAP);
  const coverageScriptPath = path.join(process.cwd(), 'scripts', 'traffic-snapshot-coverage.mjs');

  console.log(`[traffic-snapshot-coverage-auto] launch=${options.launchDate}, end=${options.endDate}, daysSinceLaunch=${daysSinceLaunch}`);
  console.log(`[traffic-snapshot-coverage-auto] dynamic threshold: ${minRequired}/${days}`);

  const result = spawnSync(process.execPath, [
    coverageScriptPath,
    String(days),
    String(minRequired),
    `--end-date=${options.endDate}`,
  ], { stdio: 'inherit' });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('[traffic-snapshot-coverage-auto] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
