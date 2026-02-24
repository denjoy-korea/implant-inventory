import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseExcelFile } from '../../services/excelService';

const PARSING_STEPS = [
  '파일을 읽는 중...',
  '제조사·브랜드 목록 파악 중...',
  '사이즈 패턴 분석 중...',
  '데이터 건강도 계산 중...',
];

function ParsingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStepIndex(i => (i + 1) % PARSING_STEPS.length);
        setVisible(true);
      }, 300);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p
        className="text-sm text-slate-500 transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(4px)' }}
      >
        {PARSING_STEPS[stepIndex]}
      </p>
    </div>
  );
}

interface Props {
  onGoToDataSetup: (file?: File, sizeCorrections?: Map<string, string>) => void;
}

interface BrandGroup {
  brand: string;
  sizes: string[];
  anomalousSizes: Set<string>;
  isNumericCode: boolean;
  dominantPattern: string;
  normalSamples: string[];
}

interface ManufacturerGroup {
  manufacturer: string;
  brands: BrandGroup[];
  total: number;
  anomalousCount: number;
}

type UploadState = 'idle' | 'parsing' | 'done' | 'error';

const NUMERIC_CODE_RE = /^\d+[A-Za-z]*$/;

function extractSizePattern(size: string): string {
  const trimmed = size.trim();
  const numericMatch = trimmed.match(/^(\d+)([A-Za-z]*)$/);
  if (numericMatch) return numericMatch[1].replace(/\d/g, 'N');
  return trimmed.replace(/\d+\.?\d*/g, 'N').replace(/\s+/g, ' ').trim();
}

function analyzeBrand(sizes: string[]): {
  anomalousSizes: Set<string>;
  isNumericCode: boolean;
  dominantPattern: string;
  normalSamples: string[];
} {
  if (sizes.length < 4) {
    return { anomalousSizes: new Set(), isNumericCode: false, dominantPattern: '', normalSamples: sizes.slice(0, 3) };
  }

  // 숫자코드 브랜드 감지 (90% 이상이 숫자+알파벳)
  const numericCount = sizes.filter(s => NUMERIC_CODE_RE.test(s)).length;
  if (numericCount >= sizes.length * 0.9) {
    const anomalous = new Set<string>();
    for (const size of sizes) if (!NUMERIC_CODE_RE.test(size)) anomalous.add(size);
    const normalSamples = sizes.filter(s => NUMERIC_CODE_RE.test(s)).slice(0, 4);
    return { anomalousSizes: anomalous, isNumericCode: true, dominantPattern: 'numeric', normalSamples };
  }

  // 일반 포맷: 지배 패턴 탐색
  const patternCount = new Map<string, number>();
  for (const size of sizes) {
    const pat = extractSizePattern(size);
    patternCount.set(pat, (patternCount.get(pat) || 0) + 1);
  }
  let dominantPattern = '';
  let maxCount = 0;
  for (const [pat, count] of patternCount) {
    if (count > maxCount) { maxCount = count; dominantPattern = pat; }
  }
  if (maxCount < sizes.length * 0.6) {
    return { anomalousSizes: new Set(), isNumericCode: false, dominantPattern, normalSamples: sizes.slice(0, 3) };
  }

  const anomalous = new Set<string>();
  for (const size of sizes) if (extractSizePattern(size) !== dominantPattern) anomalous.add(size);
  const normalSamples = sizes.filter(s => extractSizePattern(s) === dominantPattern).slice(0, 4);
  return { anomalousSizes: anomalous, isNumericCode: false, dominantPattern, normalSamples };
}

function decodeNumericCode(size: string): string | null {
  const m = size.trim().match(/^(\d{4,6})[A-Za-z]*$/);
  if (!m) return null;
  const digits = m[1];
  if (digits.length === 4) {
    const d = parseInt(digits.substring(0, 2), 10) / 10;
    const l = parseInt(digits.substring(2, 4), 10);
    if (d > 0 && d < 10 && l > 0 && l < 30) return `D${d} L${l}`;
  }
  if (digits.length === 6) {
    const d = parseInt(digits.substring(2, 4), 10) / 10;
    const l = parseInt(digits.substring(4, 6), 10);
    if (d > 0 && d < 10 && l > 0 && l < 30) return `D${d} L${l}`;
  }
  return null;
}

interface ConversionEdit { d: string; l: string; c: string; componentCount: number; }

// 템플릿(normalSample) + 편집값으로 최종 사이즈 문자열 재구성
// 예: "Ø3.7x07mm" + {d:'4.2', l:'14'} → "Ø4.2x14mm"
function reconstructCorrectedSize(edit: ConversionEdit, normalSample: string): string {
  const vals = [edit.d, edit.l, edit.c];
  let vi = 0;
  return normalSample.replace(/\d+\.?\d*/g, () => vals[vi++] ?? '');
}

// 이상 항목에서 직경/길이/커프 초기값 추출 (순수 함수)
function computeDefaultEdit(size: string, dominantPattern: string): ConversionEdit {
  const componentCount = (dominantPattern.match(/N/g) || []).length;
  // Dentium형 순수 숫자코드 (예: "4510" → D4.5, L10) — 특수 디코딩
  const numericCodeMatch = size.trim().match(/^(\d{4,6})[A-Za-z]*$/);
  if (numericCodeMatch) {
    const digits = numericCodeMatch[1];
    if (digits.length === 4) {
      const d = (parseInt(digits.substring(0, 2), 10) / 10).toFixed(1);
      const l = String(parseInt(digits.substring(2, 4), 10));
      if (parseFloat(d) > 0 && parseInt(l) > 0) return { d, l, c: '', componentCount };
    }
    if (digits.length === 6) {
      const d = (parseInt(digits.substring(2, 4), 10) / 10).toFixed(1);
      const l = String(parseInt(digits.substring(4, 6), 10));
      return { d, l, c: '', componentCount };
    }
  }
  // 일반형: 순서대로 숫자 추출 (예: "Ø4.2x14" → ['4.2', '14'])
  const nums = size.match(/\d+\.?\d*/g) || [];
  return { d: nums[0] || '', l: nums[1] || '', c: nums[2] || '', componentCount };
}

function diagnoseAnomaly(size: string, isNumericCode: boolean, dominantPattern?: string): string {
  if (isNumericCode) {
    const bad = [...new Set((size.match(/[^0-9A-Za-z]/g) || []))];
    return bad.length > 0
      ? `허용 불가 문자 포함: ${bad.map(c => `'${c}'`).join(', ')}`
      : '형식 오류';
  }
  // Φ 형식 브랜드에 숫자코드가 섞인 경우
  const decoded = decodeNumericCode(size);
  if (decoded) {
    const componentCount = dominantPattern ? (dominantPattern.match(/N/g) || []).length : 0;
    const formatDesc = componentCount === 3
      ? 'Φ직경 × 길이 × 커프 3요소 형식'
      : componentCount === 2
      ? 'Φ직경 × 길이 2요소 형식'
      : 'Φ 형식';
    return `숫자코드 형식 혼용 (${decoded}로 추정) — 이 브랜드는 ${formatDesc} 사용`;
  }
  const bad = [...new Set((size.match(/[*!@#$%^&\\|`~]/g) || []))];
  if (bad.length > 0) return `비표준 문자 포함: ${bad.map(c => `'${c}'`).join(', ')}`;
  return '패턴 불일치';
}

function analyzeFixtureRows(rows: Record<string, unknown>[]): ManufacturerGroup[] {
  const map = new Map<string, Map<string, Set<string>>>();
  for (const row of rows) {
    const mfr = String(row['제조사'] || row['Manufacturer'] || '').trim();
    const brand = String(row['브랜드'] || row['Brand'] || '').trim();
    const size = String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || '').trim();
    const unused = row['사용안함'];
    if (!mfr || !brand || !size) continue;
    if (unused === true || unused === 'v') continue;
    if (!map.has(mfr)) map.set(mfr, new Map());
    const brandMap = map.get(mfr)!;
    if (!brandMap.has(brand)) brandMap.set(brand, new Set());
    brandMap.get(brand)!.add(size);
  }

  const result: ManufacturerGroup[] = [];
  for (const [mfr, brandMap] of map.entries()) {
    const brands: BrandGroup[] = [];
    let total = 0;
    let anomalousCount = 0;
    for (const [brand, sizes] of brandMap.entries()) {
      const sizesArr = Array.from(sizes).sort();
      const { anomalousSizes, isNumericCode, dominantPattern, normalSamples } = analyzeBrand(sizesArr);
      brands.push({ brand, sizes: sizesArr, anomalousSizes, isNumericCode, dominantPattern, normalSamples });
      total += sizes.size;
      anomalousCount += anomalousSizes.size;
    }
    result.push({
      manufacturer: mfr,
      brands: brands.sort((a, b) => b.sizes.length - a.sizes.length),
      total,
      anomalousCount,
    });
  }
  return result.sort((a, b) => b.total - a.total);
}

export default function Step2FixtureUpload({ onGoToDataSetup }: Props) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [groups, setGroups] = useState<ManufacturerGroup[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());
  const [conversionEdits, setConversionEdits] = useState<Map<string, ConversionEdit>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleApprove = (key: string) => {
    setApprovedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const updateConversionEdit = (key: string, field: keyof ConversionEdit, value: string, defaults: ConversionEdit) => {
    setApprovedItems(prev => { const n = new Set(prev); n.delete(key); return n; });
    setConversionEdits(prev => {
      const next = new Map(prev);
      const curr = next.get(key) ?? defaults;
      next.set(key, { ...curr, [field]: value });
      return next;
    });
  };

  const processFile = useCallback(async (file: File) => {
    setErrorMsg('');
    setApprovedItems(new Set());
    setConversionEdits(new Map());
    setGroups([]);

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMsg('.xlsx 또는 .xls 파일만 업로드할 수 있습니다.');
      setUploadState('error');
      return;
    }
    setUploadState('parsing');
    setFileName(file.name);
    setUploadedFile(file);
    try {
      const [data] = await Promise.all([
        parseExcelFile(file),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
      let bestResult: ManufacturerGroup[] = [];
      for (const sheetName of Object.keys(data.sheets)) {
        const rows = data.sheets[sheetName].rows as Record<string, unknown>[];
        const result = analyzeFixtureRows(rows);
        if (result.length > bestResult.length) bestResult = result;
      }
      if (bestResult.length === 0) throw new Error('제조사/브랜드 데이터를 찾을 수 없습니다. 파일 형식을 확인해주세요.');
      setGroups(bestResult);
      setUploadState('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '파일을 읽을 수 없습니다.');
      setUploadState('error');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const totalItems = groups.reduce((s, g) => s + g.total, 0);
  // 승인된 항목은 미해결 이상 항목에서 제외
  const totalAnomalous = groups.reduce((sum, g) =>
    sum + g.brands.reduce((bsum, b) =>
      bsum + Array.from(b.anomalousSizes).filter(s => !approvedItems.has(`${g.manufacturer}:${b.brand}:${s}`)).length
    , 0)
  , 0);
  const healthScoreRaw = totalItems > 0 ? Math.round(((totalItems - totalAnomalous) / totalItems) * 100) : 100;
  // 이상 항목이 남아 있으면 올림으로 100%가 되지 않도록 99 이하로 강제
  const healthScore = totalAnomalous > 0 ? Math.min(99, healthScoreRaw) : healthScoreRaw;

  const healthMeta = healthScore === 100
    ? { label: '완벽', barColor: 'bg-emerald-500', badgeClass: 'text-emerald-700 bg-emerald-100', scoreClass: 'text-emerald-600', borderClass: 'border-emerald-100 bg-emerald-50' }
    : healthScore >= 95
    ? { label: '양호', barColor: 'bg-green-500', badgeClass: 'text-green-700 bg-green-100', scoreClass: 'text-green-600', borderClass: 'border-green-100 bg-green-50' }
    : healthScore >= 85
    ? { label: '주의', barColor: 'bg-amber-400', badgeClass: 'text-amber-700 bg-amber-100', scoreClass: 'text-amber-600', borderClass: 'border-amber-100 bg-amber-50' }
    : { label: '점검 필요', barColor: 'bg-red-500', badgeClass: 'text-red-700 bg-red-100', scoreClass: 'text-red-600', borderClass: 'border-red-100 bg-red-50' };

  // 승인되지 않은 이상 항목이 남은 제조사만 표시
  const anomalousGroups = groups.filter(g =>
    g.brands.some(b =>
      Array.from(b.anomalousSizes).some(s => !approvedItems.has(`${g.manufacturer}:${b.brand}:${s}`))
    )
  );

  return (
    <div className="px-6 py-6 flex flex-col h-full">
      <h2 className="text-xl font-black text-slate-900 mb-1">픽스처 파일 업로드</h2>
      <p className="text-sm text-slate-500 mb-4">
        파일을 업로드하면 제조사·브랜드별 사이즈 패턴을 분석하고 데이터 건강도를 측정합니다.
      </p>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

      {/* Upload area */}
      {uploadState === 'idle' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-colors mb-4
            ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-xs text-slate-400">.xlsx 파일만 지원합니다</p>
        </div>
      )}

      {/* Parsing */}
      {uploadState === 'parsing' && <ParsingScreen />}

      {/* Error */}
      {uploadState === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">업로드 실패</p>
          <p className="text-xs text-slate-500 text-center mb-4">{errorMsg}</p>
          <button onClick={() => setUploadState('idle')} className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
            다시 시도
          </button>
        </div>
      )}

      {/* Analysis results */}
      {uploadState === 'done' && (
        <>
          {/* File info */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 mb-2">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-green-700 font-medium flex-1 truncate">{fileName}</p>
            <span className="text-xs text-green-600 font-bold shrink-0">{groups.length}개 제조사 · {totalItems}개 사이즈</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-indigo-600 bg-white border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50 transition-colors shrink-0"
            >
              파일 교체하기
            </button>
          </div>

          {/* Health score */}
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 border ${healthMeta.borderClass}`}>
            <span className="text-[11px] font-bold text-slate-600 shrink-0">데이터 건강도</span>
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${healthMeta.barColor}`} style={{ width: `${healthScore}%` }} />
            </div>
            <span className={`text-sm font-black tabular-nums shrink-0 ${healthMeta.scoreClass}`}>{healthScore}%</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${healthMeta.badgeClass}`}>{healthMeta.label}</span>
            {totalAnomalous > 0 && (
              <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.5 rounded-full shrink-0">이상 {totalAnomalous}개</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mb-3 pr-0.5">
            {totalAnomalous === 0 && healthScore === 100 ? (
              /* ── 완벽! 칭찬 뷰 ── */
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-base font-black text-slate-800 mb-1">픽스처 목록이 완벽해요!</p>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                  {groups.length}개 제조사, {totalItems}개 사이즈 모두<br />
                  정상 패턴으로 관리되고 있습니다.
                </p>
                <p className="text-xs text-emerald-600 font-bold mt-3 bg-emerald-50 px-3 py-1.5 rounded-full">
                  덴트웹 목록 관리 우수 👍
                </p>
              </div>
            ) : totalAnomalous > 0 ? (
              /* ── 이상 항목 진단 뷰 ── */
              <div className="space-y-4">
                {/* 안심 메시지 */}
                <div className="flex gap-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl px-3 py-2.5">
                  <span className="text-base shrink-0 mt-0.5">💡</span>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    아래 규칙 위반 의심 항목을 확인하고, 필요하면 <span className="font-bold">내용을 수정한 후 승인</span>해 주세요.
                    모든 항목을 승인해야 저장할 수 있습니다.
                  </p>
                </div>
                {anomalousGroups.map((g) => (
                  <div key={g.manufacturer}>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">{g.manufacturer}</p>
                    <div className="space-y-2">
                      {g.brands.map((b) => {
                        const unapproved = Array.from(b.anomalousSizes).filter(s => !approvedItems.has(`${g.manufacturer}:${b.brand}:${s}`));
                        if (unapproved.length === 0) return null;
                        return (
                        <div key={b.brand} className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
                          {/* Brand header */}
                          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-amber-100 bg-amber-50/50">
                            <span className="text-[11px] font-bold text-indigo-600">{b.brand}</span>
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded-full ml-auto">
                              의심 항목 {unapproved.length}개
                            </span>
                          </div>

                          <div className="px-3 py-2.5 space-y-2.5">
                            {/* Guideline */}
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 mb-1.5">이 브랜드의 정상 형식</p>
                              <div className="flex flex-wrap gap-1">
                                {b.isNumericCode
                                  ? <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">숫자코드 + 접미사(B, BS, S, W 선택)</span>
                                  : null
                                }
                                {b.normalSamples.map(s => (
                                  <span key={s} className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 font-mono">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Anomalous items */}
                            <div>
                              <p className="text-[10px] font-bold text-amber-600 mb-1.5">규칙 위반 의심 항목</p>
                              <div className="space-y-2">
                                {unapproved.map((s) => {
                                  const approveKey = `${g.manufacturer}:${b.brand}:${s}`;
                                  const approved = approvedItems.has(approveKey);
                                  // 숫자코드 브랜드 이상 항목 OR Φ/Ø 형식 브랜드 숫자 포함 이상 항목 → 편집 폼
                                  const isEditableAnomaly = b.isNumericCode || (!b.isNumericCode && /\d/.test(s) && b.normalSamples.length > 0);
                                  return (
                                    <div key={s} className="space-y-1">
                                      {/* 원본 + 진단 */}
                                      <div className="flex items-start gap-2">
                                        <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 font-mono font-bold shrink-0">
                                          {s}
                                        </span>
                                        <span className="text-[10px] text-slate-500 leading-4 pt-0.5">
                                          {diagnoseAnomaly(s, b.isNumericCode, b.dominantPattern)}
                                        </span>
                                      </div>
                                      {/* 변환 행 */}
                                      <div className="flex items-center gap-1.5 pl-1 flex-wrap">
                                        <span className="text-[9px] text-slate-400">저장 시</span>
                                        {isEditableAnomaly ? (() => {
                                          if (b.isNumericCode) {
                                            // 숫자코드 브랜드: 구분자 제거 후 단일 입력 (숫자 + 대문자만 허용)
                                            const rawDefault = s.replace(/[xX×*\-\s./]/g, '').replace(/[^0-9A-Z]/g, '');
                                            const def: ConversionEdit = { d: rawDefault, l: '', c: '', componentCount: 1 };
                                            const edit = conversionEdits.get(approveKey) ?? def;
                                            const canApprove = edit.d.length >= 4 && /^[0-9A-Z]+$/.test(edit.d);
                                            return (
                                              <>
                                                <span className="text-[9px] text-slate-300">→</span>
                                                <input
                                                  type="text"
                                                  value={edit.d}
                                                  onChange={e => {
                                                    const v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
                                                    updateConversionEdit(approveKey, 'd', v, def);
                                                  }}
                                                  className={`text-[10px] text-center font-mono border-b outline-none py-0.5 bg-transparent transition-colors ${edit.d ? 'border-blue-300 text-blue-700' : 'border-slate-200 text-slate-300'}`}
                                                  style={{ width: `${Math.max(36, edit.d.length * 8 + 4)}px` }}
                                                />
                                                <span className={`text-[9px] transition-colors ${canApprove ? 'text-blue-500' : 'text-slate-300'}`}>로 수정</span>
                                                <button
                                                  onClick={() => { if (canApprove) toggleApprove(approveKey); }}
                                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-all active:scale-95 ${
                                                    approved ? 'text-emerald-700 bg-emerald-100 border-emerald-300'
                                                    : canApprove ? 'text-slate-500 bg-white border-slate-300 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50'
                                                    : 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                                                  }`}
                                                >
                                                  {approved ? '✓ 승인완료' : '승인'}
                                                </button>
                                              </>
                                            );
                                          }
                                          // Φ/Ø 형식 브랜드: normalSamples[0] 템플릿으로 편집 폼
                                          const def = computeDefaultEdit(s, b.dominantPattern);
                                          const edit = conversionEdits.get(approveKey) ?? def;
                                          const getVal = (f: 'd'|'l'|'c') => f === 'd' ? edit.d : f === 'l' ? edit.l : edit.c;
                                          type TPart = { isInput: false; text: string } | { isInput: true; field: 'd'|'l'|'c' };
                                          const tParts: TPart[] = [];
                                          const flds: ('d'|'l'|'c')[] = ['d', 'l', 'c'];
                                          let rem = b.normalSamples[0] ?? '';
                                          let fi = 0;
                                          while (rem.length > 0) {
                                            const nm = rem.match(/^(\d+\.?\d*)/);
                                            if (nm) {
                                              tParts.push({ isInput: true, field: flds[Math.min(fi, 2)] });
                                              fi++; rem = rem.slice(nm[0].length);
                                            } else {
                                              const ni = rem.search(/\d/);
                                              if (ni < 0) { tParts.push({ isInput: false, text: rem }); break; }
                                              tParts.push({ isInput: false, text: rem.slice(0, ni) });
                                              rem = rem.slice(ni);
                                            }
                                          }
                                          const canApprove = !!edit.d && (def.componentCount < 2 || !!edit.l) && (def.componentCount < 3 || !!edit.c);
                                          return (
                                            <>
                                              <span className="text-[9px] text-slate-300">→</span>
                                              {tParts.map((p, i) => p.isInput ? (
                                                <input key={i} type="text" value={getVal(p.field)}
                                                  onChange={e => updateConversionEdit(approveKey, p.field, e.target.value, def)}
                                                  className={`text-[10px] text-center font-mono border-b outline-none py-0.5 bg-transparent transition-colors ${getVal(p.field) ? 'border-blue-300 text-blue-700' : 'border-slate-200 text-slate-300'}`}
                                                  style={{ width: `${Math.max(22, (getVal(p.field).length || 2) * 7 + 4)}px` }}
                                                />
                                              ) : (
                                                <span key={i} className="text-[10px] text-blue-600 font-mono">{p.text}</span>
                                              ))}
                                              <span className={`text-[9px] transition-colors ${canApprove ? 'text-blue-500' : 'text-slate-300'}`}>로 변환</span>
                                              <button
                                                onClick={() => { if (canApprove) toggleApprove(approveKey); }}
                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-all active:scale-95 ${
                                                  approved ? 'text-emerald-700 bg-emerald-100 border-emerald-300'
                                                  : canApprove ? 'text-slate-500 bg-white border-slate-300 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50'
                                                  : 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                                                }`}
                                              >
                                                {approved ? '✓ 승인완료' : '승인'}
                                              </button>
                                            </>
                                          );
                                        })() : (
                                          <span className="text-[9px] text-slate-400">자동 수정 불가 — 데이터 설정 페이지에서 직접 수정 필요</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── 정상: 전체 목록 뷰 ── */
              <div className="space-y-2">
                {groups.map((g) => (
                  <div key={g.manufacturer} className="bg-slate-50 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800">{g.manufacturer}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{g.total}개</span>
                    </div>
                    <div className="space-y-1.5">
                      {g.brands.map((b) => (
                        <div key={b.brand}>
                          <span className="text-[10px] font-bold text-indigo-500 block mb-1">{b.brand}</span>
                          <div className="flex flex-wrap gap-1">
                            {b.sizes.map((s) => (
                              <span key={s} className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5">{s}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom CTA */}
      {uploadState !== 'parsing' && (() => {
        const isBlocked = uploadState === 'idle' || (uploadState === 'done' && healthScore < 100);
        return (
          <button
            disabled={isBlocked}
            onClick={() => {
              if (isBlocked) return;
              const corrections = new Map<string, string>();
              for (const g of groups) {
                for (const b of g.brands) {
                  for (const s of Array.from(b.anomalousSizes)) {
                    const key = `${g.manufacturer}:${b.brand}:${s}`;
                    if (!approvedItems.has(key)) continue;
                    if (b.isNumericCode) {
                      const d = conversionEdits.get(key)?.d ?? s.replace(/[xX×*\-\s./]/g, '').replace(/[^0-9A-Z]/g, '');
                      if (d) corrections.set(s, d);
                    } else {
                      const edit = conversionEdits.get(key) ?? computeDefaultEdit(s, b.dominantPattern);
                      const sample = b.normalSamples[0];
                      if (sample && edit.d) corrections.set(s, reconstructCorrectedSize(edit, sample));
                    }
                  }
                }
              }
              onGoToDataSetup(uploadedFile ?? undefined, corrections.size > 0 ? corrections : undefined);
            }}
            className={`w-full py-3.5 text-sm font-bold rounded-2xl transition-all shrink-0 ${
              isBlocked
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98]'
            }`}
          >
            {uploadState === 'idle'
              ? '파일을 먼저 업로드해 주세요'
              : uploadState === 'done' && healthScore < 100
                ? `의심 항목 ${totalAnomalous}개를 모두 승인해야 저장할 수 있습니다`
                : '데이터 설정 페이지에서 저장하기'
            }
          </button>
        );
      })()}
    </div>
  );
}
