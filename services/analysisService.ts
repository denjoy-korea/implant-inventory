import { AnalysisReport, DiagnosticItem, UnmatchedItem, ExcelRow } from '../types';
import { parseExcelFile } from './excelService';
import { getSizeMatchKey } from './sizeNormalizer';

// Reuse normalize logic from App.tsx
function normalize(str: string): string {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/보험임플란트/g, '')
    .replace(/수술중fail/g, '')
    .replace(/[\s\-\_\.\(\)]/g, '')
    .replace(/[Φφ]/g, 'd');
}

// Parse surgery records (extracted from App.tsx handleFileUpload)
function parseSurgeryRows(rows: ExcelRow[]): ExcelRow[] {
  return rows.filter(row => {
    const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
    const contentCount = Object.values(row).filter(val => val !== null && val !== undefined && String(val).trim() !== "").length;
    return !isTotalRow && contentCount > 1;
  }).map(row => {
    const desc = String(row['수술기록'] || row['수술내용'] || row['픽스쳐'] || row['규격'] || row['품명'] || "");
    const toothStr = String(row['치아번호'] || "").trim();

    let quantity = 0;
    if (toothStr !== "") {
      quantity = toothStr.includes(',') ? toothStr.split(',').length : 1;
    } else if (desc !== "") {
      quantity = 1;
    }

    let classification = "식립";
    let manufacturer = "";
    let brand = "";
    let size = "";

    if (desc.includes('[GBR Only]')) classification = "골이식만";
    else if (desc.includes('수술중FAIL_')) classification = "수술중 FAIL";
    else if (desc.includes('보험임플란트')) classification = "청구";

    if (classification === "골이식만") {
      const mMatch = desc.match(/\[(.*?)\]/);
      manufacturer = mMatch ? mMatch[1] : "GBR Only";
      const bMatch = desc.match(/\]\s*(G.*?\))/);
      brand = bMatch ? bMatch[1] : "";
    } else if (desc.includes('-')) {
      const mainParts = desc.split('-').map(p => p.trim());
      let rawM = mainParts[0];
      manufacturer = rawM.replace('수술중FAIL_', '').replace('보험임플란트', '').trim();
      if (manufacturer === "" && mainParts.length > 1) {
        manufacturer = mainParts[1];
      }

      const detailsStr = mainParts.slice(1).join('-');
      const slashSegments = detailsStr.split('/').map(s => s.trim());
      const brandSizeStr = slashSegments[0] || "";
      const sizeIndicatorMatch = brandSizeStr.match(/([DdLlMm]\:|[Φφ]|(?:\s|^)[DdLlMm]\s|(?:\s|^)\d)/);

      if (sizeIndicatorMatch && sizeIndicatorMatch.index !== undefined) {
        brand = brandSizeStr.substring(0, sizeIndicatorMatch.index).trim();
        size = brandSizeStr.substring(sizeIndicatorMatch.index).trim();
      } else {
        const fallbackMatch = brandSizeStr.match(/^([a-zA-Z\s\d-]+(?:\s[IVX]+)?)/);
        brand = fallbackMatch ? fallbackMatch[1].trim() : brandSizeStr;
        if (fallbackMatch) size = brandSizeStr.substring(fallbackMatch[0].length).trim();
      }

      if (manufacturer === "" || manufacturer === "보험임플란트") {
        manufacturer = brand;
      }
    } else {
      manufacturer = desc.replace('보험임플란트', '').replace('수술중FAIL_', '').trim();
    }

    return {
      ...row,
      '구분': classification,
      '갯수': quantity,
      '제조사': manufacturer,
      '브랜드': brand,
      '규격(SIZE)': size
    };
  });
}

// Detect name variants for a given field
function detectNameVariants(items: ExcelRow[], field: string): Map<string, string[]> {
  const normalizedGroups = new Map<string, Set<string>>();

  items.forEach(row => {
    const original = String(row[field] || '').trim();
    if (!original) return;
    const norm = normalize(original);
    if (!norm) return;
    if (!normalizedGroups.has(norm)) {
      normalizedGroups.set(norm, new Set());
    }
    normalizedGroups.get(norm)!.add(original);
  });

  // Merge groups where one normalized key contains the other
  // (e.g., "ibs" and "ibsimplant" are the same manufacturer)
  const keys = Array.from(normalizedGroups.keys());
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i];
      const b = keys[j];
      if (!normalizedGroups.has(a) || !normalizedGroups.has(b)) continue;
      if (a.includes(b) || b.includes(a)) {
        const target = a.length >= b.length ? a : b;
        const source = a.length >= b.length ? b : a;
        const targetSet = normalizedGroups.get(target)!;
        const sourceSet = normalizedGroups.get(source)!;
        sourceSet.forEach(v => targetSet.add(v));
        normalizedGroups.delete(source);
      }
    }
  }

  const variants = new Map<string, string[]>();
  normalizedGroups.forEach((originals, norm) => {
    if (originals.size > 1) {
      variants.set(norm, Array.from(originals));
    }
  });
  return variants;
}

export async function runAnalysis(fixtureFile: File, surgeryFiles: File[]): Promise<AnalysisReport> {
  // 1. Parse fixture file
  const fixtureData = await parseExcelFile(fixtureFile);
  const fixtureSheet = fixtureData.sheets[fixtureData.activeSheetName];
  const fixtureRows = fixtureSheet?.rows || [];

  // 2. Parse surgery files
  let allSurgeryRows: ExcelRow[] = [];
  for (const file of surgeryFiles) {
    const surgeryData = await parseExcelFile(file);
    const targetSheet = surgeryData.sheets['수술기록지'];
    if (targetSheet) {
      const parsed = parseSurgeryRows(targetSheet.rows);
      allSurgeryRows = [...allSurgeryRows, ...parsed];
    }
  }

  // 3. Build fixture item set
  const isInsuranceRow = (row: ExcelRow) => Object.values(row).some(v => String(v).includes('보험임플란트'));
  const isFailRow = (row: ExcelRow) => {
    const mfr = String(row['제조사'] || row['Manufacturer'] || '').toLowerCase();
    return mfr.includes('수술중fail') || mfr.includes('fail_');
  };
  const fixtureItems = fixtureRows.map(row => ({
    manufacturer: String(row['제조사'] || row['Manufacturer'] || ''),
    brand: String(row['브랜드'] || row['Brand'] || ''),
    size: String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || ''),
    isActive: row['사용안함'] !== true,
    isInsurance: isInsuranceRow(row),
    isFail: isFailRow(row),
    raw: row,
  }));

  // 4. Build surgery item usage map
  const surgeryUsageMap = new Map<string, { manufacturer: string; brand: string; size: string; count: number }>();
  allSurgeryRows.forEach(row => {
    if (row['구분'] === '골이식만') return;
    if (row['구분'] === '청구') return; // 보험임플란트는 매칭 분석에서 제외 (진단 #2에서 별도 확인)
    const rawDesc = Object.values(row).some(v => String(v).includes('보험임플란트'));
    if (rawDesc) return;
    const m = String(row['제조사'] || '');
    const b = String(row['브랜드'] || '');
    const s = String(row['규격(SIZE)'] || '');
    const qty = Number(row['갯수']) || 0;
    const key = `${normalize(m)}|${normalize(b)}|${getSizeMatchKey(s, m)}`;
    const existing = surgeryUsageMap.get(key);
    if (existing) {
      existing.count += qty;
    } else {
      surgeryUsageMap.set(key, { manufacturer: m, brand: b, size: s, count: qty });
    }
  });

  // ========== DIAGNOSTICS ==========
  const diagnostics: DiagnosticItem[] = [];

  // --- Diagnostic 1: FAIL Item Management (15 pts) ---
  const failKeywords = ['수술중fail', 'fail', '수술중 fail'];
  const hasFailItems = fixtureRows.some(row => {
    const allVals = Object.values(row).map(v => String(v).toLowerCase());
    return allVals.some(v => failKeywords.some(kw => v.includes(kw)));
  });
  const failScore = hasFailItems ? 15 : 0;
  diagnostics.push({
    category: 'FAIL 항목 분리 관리',
    status: hasFailItems ? 'good' : 'critical',
    score: failScore,
    maxScore: 15,
    title: hasFailItems ? 'FAIL 교환 근거자료 관리 가능' : 'FAIL 기록 미분리',
    detail: hasFailItems
      ? '픽스쳐 목록에 FAIL 항목이 별도 분류되어 있어, 제조사 교환 요청 시 근거자료로 활용할 수 있습니다.'
      : 'FAIL 픽스쳐가 일반 재고와 섞여 있어, 제조사 교환 관리가 누락될 위험이 있습니다. FAIL 항목을 별도로 분류하세요.',
  });

  // --- Diagnostic 2: Insurance Claim (보험청구) Classification (15 pts) ---
  // 픽스쳐 목록과 수술기록지 양쪽 모두에 "보험임플란트" 문구가 있어야 함
  const hasInsuranceInFixture = fixtureRows.some(row => {
    return Object.values(row).some(v => String(v).includes('보험임플란트'));
  });
  const hasInsuranceInSurgery = allSurgeryRows.some(row => {
    return row['구분'] === '청구' || Object.values(row).some(v => String(v).includes('보험임플란트'));
  });
  const bothHaveInsurance = hasInsuranceInFixture && hasInsuranceInSurgery;
  const eitherHasInsurance = hasInsuranceInFixture || hasInsuranceInSurgery;
  const insuranceScore = bothHaveInsurance ? 15 : eitherHasInsurance ? 7 : 0;
  const insuranceStatus = bothHaveInsurance ? 'good' : eitherHasInsurance ? 'warning' : 'critical';
  const missingSource = !hasInsuranceInFixture && !hasInsuranceInSurgery
    ? '양쪽 모두'
    : !hasInsuranceInFixture ? '픽스쳐 목록' : '수술기록지';
  diagnostics.push({
    category: '보험청구 2단계 구분',
    status: insuranceStatus as 'good' | 'warning' | 'critical',
    score: insuranceScore,
    maxScore: 15,
    title: bothHaveInsurance
      ? '보험청구 2단계 구분 관리 중'
      : eitherHasInsurance
        ? `${missingSource}에 보험임플란트 구분 누락`
        : '보험임플란트 구분 미확인',
    detail: bothHaveInsurance
      ? '픽스쳐 목록과 수술기록지 양쪽에서 보험임플란트 구분이 확인되어, 2중 카운팅을 방지할 수 있습니다.'
      : eitherHasInsurance
        ? `${missingSource}에 보험임플란트 관련 항목이 없습니다. 양쪽 모두에서 구분되어야 2단계 보험청구 시 픽스쳐 2중 카운팅을 방지할 수 있습니다.`
        : '보험임플란트 구분이 확인되지 않습니다. 픽스쳐 목록과 수술기록지 모두에 보험임플란트를 별도 표기해야 2중 카운팅 위험을 방지할 수 있습니다.',
  });

  // --- Diagnostic 3: Surgery→Fixture Matching Rate (25 pts) ---
  let surgeryMatchedCount = 0;
  const surgeryOnlyItems: UnmatchedItem[] = [];
  const uniqueSurgeryItems = Array.from(surgeryUsageMap.values());

  uniqueSurgeryItems.forEach(sItem => {
    const sM = normalize(sItem.manufacturer);
    const sB = normalize(sItem.brand);
    const sS = getSizeMatchKey(sItem.size, sItem.manufacturer);

    const found = fixtureItems.some(fItem => {
      if (fItem.isInsurance || fItem.isFail) return false; // 보험임플란트/FAIL 픽스쳐는 매칭 대상 제외
      const fM = normalize(fItem.manufacturer);
      const fB = normalize(fItem.brand);
      const fS = getSizeMatchKey(fItem.size, fItem.manufacturer);
      return (fM.includes(sM) || sM.includes(fM) || fM === sM) && fB === sB && fS === sS;
    });

    if (found) {
      surgeryMatchedCount++;
    } else if (sItem.manufacturer || sItem.brand) {
      surgeryOnlyItems.push({
        manufacturer: sItem.manufacturer,
        brand: sItem.brand,
        size: sItem.size,
        source: 'surgery_only',
        reason: '수술기록에만 존재 (재고 목록 미등록)',
      });
    }
  });

  const surgeryMatchRate = uniqueSurgeryItems.length > 0 ? surgeryMatchedCount / uniqueSurgeryItems.length : 1;
  const surgeryMatchScore = Math.round(surgeryMatchRate * 25);
  diagnostics.push({
    category: '수술기록→재고 매칭률',
    status: surgeryMatchRate >= 0.8 ? 'good' : surgeryMatchRate >= 0.5 ? 'warning' : 'critical',
    score: surgeryMatchScore,
    maxScore: 25,
    title: `매칭률 ${Math.round(surgeryMatchRate * 100)}% (${surgeryMatchedCount}/${uniqueSurgeryItems.length})`,
    detail: surgeryMatchRate >= 0.8
      ? '수술기록 품목 대부분이 재고 목록에 등록되어 있습니다. 데이터 정합성이 우수합니다.'
      : `수술기록 품목 중 ${uniqueSurgeryItems.length - surgeryMatchedCount}개가 재고 목록에 없습니다. 수기 작성 오류 또는 미등록 품목일 수 있습니다.`,
    items: surgeryOnlyItems.slice(0, 5).map(i => `${i.manufacturer} ${i.brand} ${i.size}`),
  });

  // --- Diagnostic 4: Fixture→Surgery Utilization Rate (20 pts) ---
  const activeFixtureItems = fixtureItems.filter(f => f.isActive && !f.isInsurance && !f.isFail);
  let fixtureUsedCount = 0;
  const fixtureOnlyItems: UnmatchedItem[] = [];

  activeFixtureItems.forEach(fItem => {
    const fM = normalize(fItem.manufacturer);
    const fB = normalize(fItem.brand);
    const fS = getSizeMatchKey(fItem.size, fItem.manufacturer);

    let isUsed = false;
    surgeryUsageMap.forEach((sItem) => {
      const sM = normalize(sItem.manufacturer);
      const sB = normalize(sItem.brand);
      const sS = getSizeMatchKey(sItem.size, sItem.manufacturer);
      if ((fM.includes(sM) || sM.includes(fM) || fM === sM) && fB === sB && fS === sS) {
        isUsed = true;
      }
    });

    if (isUsed) {
      fixtureUsedCount++;
    } else if (fItem.manufacturer || fItem.brand) {
      fixtureOnlyItems.push({
        manufacturer: fItem.manufacturer,
        brand: fItem.brand,
        size: fItem.size,
        source: 'fixture_only',
        reason: '재고 목록에만 존재 (수술기록 0건, dead stock 후보)',
      });
    }
  });

  const fixtureUtilRate = activeFixtureItems.length > 0 ? fixtureUsedCount / activeFixtureItems.length : 1;
  const fixtureUtilScore = Math.round(fixtureUtilRate * 20);
  diagnostics.push({
    category: '재고→수술기록 활용률',
    status: fixtureUtilRate >= 0.7 ? 'good' : fixtureUtilRate >= 0.4 ? 'warning' : 'critical',
    score: fixtureUtilScore,
    maxScore: 20,
    title: `활용률 ${Math.round(fixtureUtilRate * 100)}% (${fixtureUsedCount}/${activeFixtureItems.length})`,
    detail: fixtureUtilRate >= 0.7
      ? '등록된 재고 품목 대부분이 실제 수술에 사용되고 있습니다.'
      : `'사용함' 표시 품목 ${activeFixtureItems.length}개 중 ${activeFixtureItems.length - fixtureUsedCount}개가 수술기록에 없습니다. Dead stock 정리를 검토하세요.`,
    items: fixtureOnlyItems.slice(0, 5).map(i => `${i.manufacturer} ${i.brand} ${i.size}`),
  });

  // --- Diagnostic 5: Name Consistency (15 pts) ---
  // FAIL/보험임플란트 접두어 행 제외 (의도적 접두어를 표기 변형으로 오탐하지 않기 위해)
  const filteredFixtureRows = fixtureRows.filter(row => {
    const m = String(row['제조사'] || row['Manufacturer'] || '').toLowerCase();
    return !m.includes('수술중fail') && !m.includes('fail_') && !m.includes('보험임플란트');
  });
  const filteredSurgeryRows = allSurgeryRows.filter(row => {
    if (row['구분'] === '골이식만' || row['구분'] === '청구' || row['구분'] === '수술중 FAIL') return false;
    const m = String(row['제조사'] || '').toLowerCase();
    return !m.includes('수술중fail') && !m.includes('fail_') && !m.includes('보험임플란트');
  });
  const allItems = [...filteredFixtureRows, ...filteredSurgeryRows];
  const mfgVariants = detectNameVariants(allItems, '제조사');
  const brandVariants = detectNameVariants(allItems, '브랜드');
  const totalVariants = mfgVariants.size + brandVariants.size;
  const nameConsistencyScore = totalVariants === 0 ? 15 : totalVariants <= 2 ? 10 : totalVariants <= 5 ? 5 : 0;
  const variantExamples: string[] = [];
  mfgVariants.forEach((originals, _norm) => {
    variantExamples.push(`제조사: ${originals.join(' / ')}`);
  });
  brandVariants.forEach((originals, _norm) => {
    variantExamples.push(`브랜드: ${originals.join(' / ')}`);
  });
  diagnostics.push({
    category: '데이터 표기 일관성',
    status: totalVariants === 0 ? 'good' : totalVariants <= 3 ? 'warning' : 'critical',
    score: nameConsistencyScore,
    maxScore: 15,
    title: totalVariants === 0 ? '표기 일관성 우수' : `${totalVariants}건의 표기 변형 발견`,
    detail: totalVariants === 0
      ? '제조사/브랜드 명칭이 일관되게 관리되고 있습니다.'
      : '동일 제조사 또는 브랜드가 다른 이름으로 표기되어 있습니다. 데이터 정규화가 필요합니다.',
    items: variantExamples.slice(0, 5),
  });

  // --- Diagnostic 6: Size Format Consistency per Manufacturer+Brand (10 pts) ---
  // 제조사+브랜드별로 사이즈 표기법이 통일되어 있는지 확인
  // (제조사마다 표기법이 다른 건 정상 — 같은 제조사+브랜드 내에서 섞이면 문제)
  function detectSizeFormat(size: string): string {
    if (/[Φφ]/.test(size)) return 'Phi';
    if (/[Øø]/.test(size)) return 'Oslash';
    if (/[DdLl]:/.test(size)) return 'DL_colon';
    if (/^\d{4,6}[a-zA-Z]*$/.test(size)) return 'NumericCode';
    if (/\d+\.?\d*\s*[×xX*]\s*\d+/.test(size)) return 'BareNumeric';
    return 'Other';
  }

  const sizeFormatByGroup = new Map<string, { formats: Set<string>; display: string }>();
  allItems.forEach(row => {
    const m = String(row['제조사'] || row['Manufacturer'] || '').trim();
    const b = String(row['브랜드'] || row['Brand'] || '').trim();
    const size = String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || '').trim();
    if (!m || !size) return;
    const groupKey = `${normalize(m)}|${normalize(b)}`;
    const fmt = detectSizeFormat(size);
    if (!sizeFormatByGroup.has(groupKey)) {
      sizeFormatByGroup.set(groupKey, { formats: new Set(), display: `${m} ${b}`.trim() });
    }
    sizeFormatByGroup.get(groupKey)!.formats.add(fmt);
  });

  const inconsistentGroups: string[] = [];
  sizeFormatByGroup.forEach((val) => {
    if (val.formats.size > 1) {
      inconsistentGroups.push(`${val.display} (${Array.from(val.formats).join(', ')})`);
    }
  });

  const inconsistentCount = inconsistentGroups.length;
  const sizeFormatScore = inconsistentCount === 0 ? 10 : inconsistentCount <= 1 ? 7 : inconsistentCount <= 3 ? 4 : 0;
  diagnostics.push({
    category: '사이즈 포맷 일관성',
    status: inconsistentCount === 0 ? 'good' : inconsistentCount <= 2 ? 'warning' : 'critical',
    score: sizeFormatScore,
    maxScore: 10,
    title: inconsistentCount === 0 ? '사이즈 포맷 일관성 우수' : `${inconsistentCount}개 브랜드에서 포맷 혼용`,
    detail: inconsistentCount === 0
      ? '각 제조사/브랜드별 사이즈 표기 방식이 일관되게 관리되고 있습니다.'
      : '같은 제조사+브랜드 내에서 서로 다른 사이즈 표기 방식(예: Φ5.0×8.5 vs 5.0×8.5)이 혼용되고 있습니다. 매칭에는 영향 없지만, 데이터 관리 품질을 위해 표기법을 통일하세요.',
    items: inconsistentGroups.slice(0, 5),
  });

  // ========== USAGE PATTERNS ==========
  // Top used items
  const topUsedItems = Array.from(surgeryUsageMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Period calculation
  let minTime = Infinity;
  let maxTime = -Infinity;
  allSurgeryRows.forEach(row => {
    const dateStr = row['날짜'];
    if (dateStr) {
      const t = new Date(dateStr).getTime();
      if (!isNaN(t)) {
        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;
      }
    }
  });
  const periodMonths = (minTime === Infinity || maxTime === -Infinity || minTime === maxTime)
    ? 1
    : Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24 * 30.44));

  const totalSurgeries = allSurgeryRows.filter(r => r['구분'] !== '골이식만').length;
  const primarySurgeries = allSurgeryRows.filter(r => r['구분'] === '식립').length;
  const secondarySurgeries = allSurgeryRows.filter(r => r['구분'] === '청구').length;
  const failSurgeries = allSurgeryRows.filter(r => r['구분'] === '수술중 FAIL').length;
  const monthlyAvgSurgeries = Number((totalSurgeries / periodMonths).toFixed(1));

  // Implant usage counts (개수 기준)
  const fixtureUsageCount = allSurgeryRows
    .filter(r => r['구분'] === '식립')
    .reduce((sum, r) => sum + (Number(r['갯수']) || 0), 0);
  const insuranceClaimCount = allSurgeryRows
    .filter(r => r['구분'] === '청구')
    .reduce((sum, r) => sum + (Number(r['갯수']) || 0), 0);
  const failUsageCount = allSurgeryRows
    .filter(r => r['구분'] === '수술중 FAIL')
    .reduce((sum, r) => sum + (Number(r['갯수']) || 0), 0);

  // Manufacturer distribution (보험임플란트/FAIL 제외)
  const mfgCounts = new Map<string, number>();
  allSurgeryRows.forEach(row => {
    if (row['구분'] === '골이식만') return;
    if (row['구분'] === '청구') return;
    const m = String(row['제조사'] || '').trim();
    if (!m) return;
    if (m.includes('보험임플란트') || m.toLowerCase().includes('수술중fail') || m.toLowerCase().includes('fail_')) return;
    const normM = normalize(m);
    // Use first seen original name for display
    const existing = mfgCounts.get(normM);
    mfgCounts.set(normM, (existing || 0) + (Number(row['갯수']) || 0));
  });
  // Map back to display names
  const mfgDisplayNames = new Map<string, string>();
  allSurgeryRows.forEach(row => {
    const m = String(row['제조사'] || '').trim();
    if (!m || m.includes('보험임플란트') || m.toLowerCase().includes('수술중fail') || m.toLowerCase().includes('fail_')) return;
    const normM = normalize(m);
    if (!mfgDisplayNames.has(normM)) mfgDisplayNames.set(normM, m);
  });
  const manufacturerDistribution = Array.from(mfgCounts.entries())
    .map(([normM, count]) => ({ label: mfgDisplayNames.get(normM) || normM, count }))
    .sort((a, b) => b.count - a.count);

  // ========== TOTAL SCORE ==========
  const dataQualityScore = diagnostics.reduce((sum, d) => sum + d.score, 0);

  // ========== RECOMMENDATIONS ==========
  const recommendations: string[] = [];
  if (!hasFailItems) {
    recommendations.push('FAIL 픽스쳐를 별도 항목으로 분류하여, 제조사 교환 요청 시 근거자료로 활용하세요. DenJOY는 FAIL 발생 시 자동 분류 및 교환 추적 기능을 제공합니다.');
  }
  if (!bothHaveInsurance) {
    recommendations.push('보험 임플란트 수술(2단계)을 별도로 구분하여 픽스쳐 2중 카운팅을 방지하세요.');
  }
  if (surgeryMatchRate < 0.8) {
    recommendations.push(`수술기록 품목 중 ${uniqueSurgeryItems.length - surgeryMatchedCount}개가 재고 목록에 없습니다. 누락된 품목을 재고 마스터에 등록하거나, 수기 작성 시 정확한 명칭을 사용하세요.`);
  }
  if (fixtureUtilRate < 0.7) {
    recommendations.push(`사용함 표시이지만 수술기록이 없는 ${activeFixtureItems.length - fixtureUsedCount}개 품목을 정리하세요. Dead stock을 줄이면 발주 관리가 간결해집니다.`);
  }
  if (totalVariants > 0) {
    recommendations.push(`${totalVariants}건의 표기 변형을 통일하세요. DenJOY의 스마트 정규화 기능을 사용하면 자동으로 표준화할 수 있습니다.`);
  }
  if (inconsistentCount > 0) {
    recommendations.push(`같은 제조사+브랜드 내에서 사이즈 표기법이 혼용된 ${inconsistentCount}개 그룹이 있습니다. 픽스쳐 등록 시 해당 브랜드의 표기법을 준수해주세요.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('현재 데이터 관리 수준이 매우 우수합니다! DenJOY를 도입하면 이 품질을 자동으로 유지하고, 실시간 재고 추적까지 가능합니다.');
  }

  // ========== UNMATCHED ITEMS ==========
  const unmatchedItems: UnmatchedItem[] = [...surgeryOnlyItems, ...fixtureOnlyItems];

  // ========== SUMMARY ==========
  const nonFailFixtureItems = fixtureItems.filter(f => !f.isFail);
  const summary = {
    totalFixtureItems: nonFailFixtureItems.length,
    activeItems: activeFixtureItems.length,
    usedItems: fixtureUsedCount,
    deadStockItems: activeFixtureItems.length - fixtureUsedCount,
    surgeryOnlyItems: surgeryOnlyItems.length,
    nameVariants: totalVariants,
  };

  return {
    dataQualityScore,
    diagnostics,
    matchedCount: surgeryMatchedCount,
    totalFixtureItems: nonFailFixtureItems.length,
    totalSurgeryItems: uniqueSurgeryItems.length,
    unmatchedItems,
    usagePatterns: {
      topUsedItems,
      monthlyAvgSurgeries,
      totalSurgeries,
      primarySurgeries,
      secondarySurgeries,
      failSurgeries,
      fixtureUsageCount,
      insuranceClaimCount,
      failUsageCount,
      periodMonths: Number(periodMonths.toFixed(1)),
      manufacturerDistribution,
    },
    recommendations,
    summary,
  };
}
