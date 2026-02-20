import fs from 'node:fs';
import path from 'node:path';

const sourcePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), 'services', 'fixtureReferenceBase.ts');

const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(process.cwd(), 'supabase', '037_seed_fixture_reference_defaults.sql');

const sourceTag = process.argv[4] || 'xlsx';

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function extractRowsFromTs(fileContent) {
  const marker = 'export const FIXTURE_REFERENCE_BASE: FixtureReferenceRow[] = ';
  const markerIndex = fileContent.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error('fixtureReferenceBase.ts 형식을 찾을 수 없습니다.');
  }

  const assignIndex = fileContent.indexOf('=', markerIndex);
  const jsonStart = fileContent.indexOf('[', assignIndex);
  const jsonEndToken = '];';
  const jsonEnd = fileContent.lastIndexOf(jsonEndToken);
  if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) {
    throw new Error('FIXTURE_REFERENCE_BASE JSON 구간을 파싱할 수 없습니다.');
  }

  const json = fileContent.slice(jsonStart, jsonEnd + 1);
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('FIXTURE_REFERENCE_BASE가 배열이 아닙니다.');
  }
  return parsed;
}

function normalizeRows(rows) {
  const dedup = new Set();
  const normalized = [];

  for (const row of rows) {
    const manufacturer = String(row.manufacturer ?? '').trim();
    const brand = String(row.brand ?? '').trim();
    const size = String(row.size ?? '').trim();
    if (!manufacturer || !brand || !size) continue;

    const key = `${manufacturer}|${brand}|${size}`;
    if (dedup.has(key)) continue;
    dedup.add(key);
    normalized.push({ manufacturer, brand, size });
  }

  return normalized.sort(
    (a, b) =>
      a.manufacturer.localeCompare(b.manufacturer, 'ko') ||
      a.brand.localeCompare(b.brand, 'ko') ||
      a.size.localeCompare(b.size, 'ko', { numeric: true })
  );
}

const fileContent = fs.readFileSync(sourcePath, 'utf-8');
const rawRows = extractRowsFromTs(fileContent);
const rows = normalizeRows(rawRows);

const source = `${sourceTag}-${new Date().toISOString().slice(0, 10)}`;
const chunkSize = 500;
const sqlParts = [];

sqlParts.push('-- ============================================');
sqlParts.push('-- 037: fixture_reference_defaults 시드 데이터');
sqlParts.push('-- Auto-generated. DO NOT EDIT MANUALLY.');
sqlParts.push('-- ============================================');
sqlParts.push('');
sqlParts.push(`-- Source file: ${sourcePath}`);
sqlParts.push(`-- Row count: ${rows.length}`);
sqlParts.push(`-- Generated at: ${new Date().toISOString()}`);
sqlParts.push('');
sqlParts.push('BEGIN;');
sqlParts.push('');

for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  sqlParts.push('INSERT INTO fixture_reference_defaults (manufacturer, brand, size, is_active, source)');
  sqlParts.push('VALUES');
  sqlParts.push(
    chunk
      .map(
        row =>
          `  ('${sqlEscape(row.manufacturer)}', '${sqlEscape(row.brand)}', '${sqlEscape(row.size)}', TRUE, '${sqlEscape(source)}')`
      )
      .join(',\n')
  );
  sqlParts.push('ON CONFLICT (manufacturer, brand, size)');
  sqlParts.push('DO UPDATE SET');
  sqlParts.push('  is_active = EXCLUDED.is_active,');
  sqlParts.push('  source = EXCLUDED.source,');
  sqlParts.push('  updated_at = now();');
  sqlParts.push('');
}

sqlParts.push('COMMIT;');
sqlParts.push('');

fs.writeFileSync(outputPath, `${sqlParts.join('\n')}\n`);
console.log(`Generated seed SQL: ${outputPath} (${rows.length} rows)`);
