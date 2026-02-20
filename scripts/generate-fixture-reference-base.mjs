import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/generate-fixture-reference-base.mjs <xlsx-path>');
  process.exit(1);
}

const workbook = XLSX.readFile(inputPath);
const firstSheet = workbook.SheetNames[0];
if (!firstSheet) {
  console.error('No worksheet found.');
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });
const uniq = new Map();

for (const row of rows) {
  const manufacturer = String(row['제조사'] || '').trim();
  const brand = String(row['브랜드'] || '').trim();
  const size = String(row['사이즈'] || '').trim();
  if (!manufacturer && !brand && !size) continue;
  const key = `${manufacturer}|${brand}|${size}`;
  if (!uniq.has(key)) uniq.set(key, { manufacturer, brand, size });
}

const result = Array.from(uniq.values()).sort(
  (a, b) =>
    a.manufacturer.localeCompare(b.manufacturer, 'ko') ||
    a.brand.localeCompare(b.brand, 'ko') ||
    a.size.localeCompare(b.size, 'ko', { numeric: true })
);

const outputPath = path.join(process.cwd(), 'services', 'fixtureReferenceBase.ts');
const body = `/**\n * 픽스쳐 기본 참조값\n * Source: ${inputPath}\n * Sheet: ${firstSheet}\n * Generated at: ${new Date().toISOString()}\n */\n\nexport interface FixtureReferenceRow {\n  manufacturer: string;\n  brand: string;\n  size: string;\n}\n\nexport const FIXTURE_REFERENCE_BASE: FixtureReferenceRow[] = ${JSON.stringify(result, null, 2)};\n`;

fs.writeFileSync(outputPath, body);
console.log(`Generated ${result.length} rows -> ${outputPath}`);
