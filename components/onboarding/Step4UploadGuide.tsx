import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseExcelFile } from '../../services/excelService';
import { isExchangePrefix } from '../../services/appUtils';

const PARSING_STEPS = [
  '파일을 읽는 중...',
  '수술기록 파싱 중...',
  '브랜드별 패턴 분석 중...',
  '수기 입력 의심 항목 선별 중...',
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
        className={`text-sm text-slate-500 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
      >
        {PARSING_STEPS[stepIndex]}
      </p>
    </div>
  );
}

type UploadState = 'idle' | 'parsing' | 'done' | 'error';

interface PatternAnomaly {
  manufacturer: string;
  brand: string;
  anomalousSizes: string[];
  usageCount: number;
  normalSamples: string[];
}

interface AnalysisResult {
  totalRecords: number;
  patternAnomalies: PatternAnomaly[];
}

interface Props {
  onGoToSurgeryUpload: (file?: File) => Promise<boolean> | boolean;
  onUploaded: () => void;
}

// 수술기록지 시트의 "수술기록" 필드에서 제조사/브랜드/규격 추출
// 형식: "제조사 - 브랜드 Φdiam × len / 골질 ... / ..."
function parseFixtureFromRecord(surgeryRecord: string): { manufacturer: string; brand: string; size: string } | null {
  if (!surgeryRecord) return null;
  if (surgeryRecord.includes('[GBR Only]')) return null;

  // ' / ' 기준 첫 번째 세그먼트만 사용
  const fixturePart = surgeryRecord.split(' / ')[0].trim();

  if (fixturePart.includes('보험임플란트') || fixturePart.includes('보험청구')) return null;
  // FAIL 기록 제외 (수술중 실패한 픽스처)
  if (isExchangePrefix(fixturePart)) return null;

  // "제조사 - 브랜드 규격" 분리
  const dashIdx = fixturePart.indexOf(' - ');
  if (dashIdx < 0) return null;

  const manufacturer = fixturePart.slice(0, dashIdx).trim();
  const brandSize = fixturePart.slice(dashIdx + 3).trim();

  // 규격 시작점 탐지: Φ/φ (OSSTEM·디오), " D:" (IBS Magicore), Ø/ø (기타)
  let sizeStart = -1;
  const phiIdx = brandSize.search(/[Φφ]/);
  if (phiIdx >= 0) sizeStart = phiIdx;

  if (sizeStart < 0) {
    // " D:숫자" 또는 " D 숫자" 패턴 (IBS: "Magicore D:5.0 L:11 Cuff:3")
    const dlIdx = brandSize.search(/ D[:\s]\d/);
    if (dlIdx >= 0) sizeStart = dlIdx + 1; // 공백 제외하고 D부터
  }

  if (sizeStart < 0) {
    const oslashIdx = brandSize.search(/[Øø]/);
    if (oslashIdx >= 0) sizeStart = oslashIdx;
  }

  let brand: string;
  let size: string;
  if (sizeStart > 0) {
    brand = brandSize.slice(0, sizeStart).trim();
    size = brandSize.slice(sizeStart).trim();
  } else {
    brand = brandSize;
    size = '';
  }

  if (!manufacturer && !brand) return null;
  return { manufacturer, brand, size };
}

// ── 패턴 분석 (Step2FixtureUpload의 analyzeBrand와 동일 알고리즘) ──

const NUMERIC_CODE_RE = /^\d+[A-Za-z]*$/;

function extractSizePattern(size: string): string {
  const trimmed = size.trim();
  const numericMatch = trimmed.match(/^(\d+)([A-Za-z]*)$/);
  if (numericMatch) return numericMatch[1].replace(/\d/g, 'N');
  return trimmed.replace(/\d+\.?\d*/g, 'N').replace(/\s+/g, ' ').trim();
}

function detectBrandAnomalies(sizes: string[]): {
  anomalousSizes: Set<string>;
  normalSamples: string[];
} {
  if (sizes.length < 4) {
    return { anomalousSizes: new Set(), normalSamples: sizes.slice(0, 3) };
  }

  // 숫자코드 브랜드 감지 (90% 이상이 숫자+알파벳)
  const numericCount = sizes.filter(s => NUMERIC_CODE_RE.test(s)).length;
  if (numericCount >= sizes.length * 0.9) {
    const anomalous = new Set<string>();
    for (const size of sizes) if (!NUMERIC_CODE_RE.test(size)) anomalous.add(size);
    const normalSamples = sizes.filter(s => NUMERIC_CODE_RE.test(s)).slice(0, 4);
    return { anomalousSizes: anomalous, normalSamples };
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
  // 지배 패턴이 60% 미만이면 혼재 상태 → 판단 보류
  if (maxCount < sizes.length * 0.6) {
    return { anomalousSizes: new Set(), normalSamples: sizes.slice(0, 3) };
  }

  const anomalous = new Set<string>();
  for (const size of sizes) if (extractSizePattern(size) !== dominantPattern) anomalous.add(size);
  const normalSamples = sizes.filter(s => extractSizePattern(s) === dominantPattern).slice(0, 4);
  return { anomalousSizes: anomalous, normalSamples };
}

function analyzeSurgeryRows(rows: Record<string, unknown>[]): AnalysisResult {
  const firstRow = rows[0] ?? {};
  const isDenwebFormat = '구분' in firstRow;
  const isStatisticsFormat = !isDenwebFormat && '수술기록' in firstRow;

  // Map: `${manufacturer}|${brand}` → { manufacturer, brand, sizes(with duplicates), sizeCountMap }
  const brandMap = new Map<string, {
    manufacturer: string;
    brand: string;
    sizes: string[];
    sizeCountMap: Map<string, number>;
  }>();
  let totalRecords = 0;

  for (const row of rows) {
    let manufacturer: string;
    let brand: string;
    let size: string;
    let qty = 1;

    if (isDenwebFormat) {
      const isTotalRow = Object.values(row).some(v => String(v).includes('합계'));
      if (isTotalRow) continue;

      const cls = String(row['구분'] || '').trim();
      if (cls !== '식립' && cls !== '수술중교환') continue;

      const surgeryRecord = String(row['수술기록'] || '');
      if (surgeryRecord.includes('[GBR Only]')) continue;

      manufacturer = String(row['제조사'] || '').trim();
      brand = String(row['브랜드'] || '').trim();
      size = String(row['규격(SIZE)'] || '').trim();

      if (!manufacturer && !brand && !size) continue;
      if (isExchangePrefix(manufacturer)) continue;
      if (manufacturer === 'z수술후FAIL') continue;
      if (manufacturer === '보험청구' || brand === '보험임플란트') continue;

      const qtyRaw = row['갯수'] !== undefined ? Number(row['갯수']) : 1;
      qty = Number.isFinite(qtyRaw) ? qtyRaw : 1;

    } else if (isStatisticsFormat) {
      const surgeryRecord = String(row['수술기록'] || '').trim();
      const parsed = parseFixtureFromRecord(surgeryRecord);
      if (!parsed) continue;
      if (parsed.manufacturer === 'z수술후FAIL') continue;

      manufacturer = parsed.manufacturer;
      brand = parsed.brand;
      size = parsed.size;
      qty = 1;

    } else {
      continue;
    }

    totalRecords += qty;
    if (!size) continue;

    const key = `${manufacturer}|${brand}`;
    const entry = brandMap.get(key);
    if (entry) {
      for (let i = 0; i < qty; i++) entry.sizes.push(size);
      entry.sizeCountMap.set(size, (entry.sizeCountMap.get(size) || 0) + qty);
    } else {
      const sizeCountMap = new Map([[size, qty]]);
      brandMap.set(key, {
        manufacturer,
        brand,
        sizes: Array.from({ length: qty }, () => size),
        sizeCountMap,
      });
    }
  }

  const patternAnomalies: PatternAnomaly[] = [];
  for (const entry of brandMap.values()) {
    const { anomalousSizes, normalSamples } = detectBrandAnomalies(entry.sizes);
    if (anomalousSizes.size === 0) continue;

    let usageCount = 0;
    for (const size of anomalousSizes) {
      usageCount += entry.sizeCountMap.get(size) || 0;
    }

    patternAnomalies.push({
      manufacturer: entry.manufacturer,
      brand: entry.brand,
      anomalousSizes: Array.from(anomalousSizes),
      usageCount,
      normalSamples,
    });
  }

  patternAnomalies.sort((a, b) => b.usageCount - a.usageCount);

  return { totalRecords, patternAnomalies };
}

export default function Step4UploadGuide({ onGoToSurgeryUpload, onUploaded }: Props) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
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
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);

      // 수술기록지 시트 찾기 (우선순위: 수술기록지 > 수술기록 포함 > 임플란트 사용개수 > 기타)
      const sheetNames = Object.keys(data.sheets);
      const sheetName =
        sheetNames.find(n => n === '수술기록지') ??
        sheetNames.find(n => n.includes('수술기록')) ??
        sheetNames.find(n => n === '임플란트 사용개수') ??
        sheetNames.find(n => n.includes('수술') && !n.includes('기타')) ??
        sheetNames[0];
      const rows = (data.sheets[sheetName]?.rows ?? []) as Record<string, unknown>[];

      if (rows.length === 0) throw new Error('수술기록 데이터를 찾을 수 없습니다. 파일 형식을 확인해주세요.');

      const result = analyzeSurgeryRows(rows);
      setAnalysis(result);
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


  return (
    <div className="px-6 py-6 flex flex-col h-full">
      <h2 className="text-xl font-black text-slate-900 mb-1">수술기록 업로드</h2>
      <p className="text-sm text-slate-500 mb-4">
        파일을 업로드하면 브랜드별 규격 패턴을 분석해 수기 입력이 의심되는 항목을 찾아드립니다.
      </p>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

      {/* Idle: drop zone */}
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
            <svg className="w-6 h-6 text-indigo-600 animate-icon-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Done: analysis result */}
      {uploadState === 'done' && analysis && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* File info */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2.5 shrink-0 group">
            <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-indigo-600 group-hover:animate-icon-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-slate-700 flex-1 truncate">{fileName}</p>
            <button onClick={() => { setUploadState('idle'); setUploadedFile(null); setAnalysis(null); }}
              className="text-[11px] text-slate-400 hover:text-slate-600 shrink-0">재선택</button>
          </div>

          {/* Summary */}
          {analysis.patternAnomalies.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-5 text-center">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 animate-icon-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-bold text-emerald-700">패턴 이상 없음</p>
              <p className="text-[11px] text-emerald-600">
                {analysis.totalRecords}건 수술기록을 분석했습니다.<br />
                규격 패턴이 일관되게 입력되어 있습니다.
              </p>
              <p className="text-[11px] text-slate-400 mt-1 px-2 text-center leading-relaxed">
                패턴이 일관되어도 수기 입력이 포함될 수 있습니다.<br />
                수술기록과 품목 등록을 완료한 후 수술기록 DB에서 미등록 품목을 확인해주세요.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header badge */}
              <div className="flex items-center gap-2 mb-2 shrink-0">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-black rounded-full">
                  수기 입력 의심 {analysis.patternAnomalies.length}개 브랜드 · {analysis.patternAnomalies.reduce((s, i) => s + i.usageCount, 0)}건
                </span>
                <span className="text-[11px] text-slate-400">총 {analysis.totalRecords}건 수술기록 중</span>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-0.5">
                {analysis.patternAnomalies.map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs font-bold text-slate-700 leading-tight">
                        {item.manufacturer} · {item.brand}
                      </p>
                      <span className="text-[11px] font-bold text-amber-600 shrink-0">{item.usageCount}건</span>
                    </div>
                    {/* Anomalous sizes */}
                    <div className="flex flex-wrap gap-1 mb-1">
                      {item.anomalousSizes.map((size, si) => (
                        <span key={si} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-md">
                          {size}
                        </span>
                      ))}
                    </div>
                    {/* Normal samples for context */}
                    {item.normalSamples.length > 0 && (
                      <p className="text-[10px] text-slate-400 leading-tight">
                        일반 패턴: {item.normalSamples.slice(0, 2).join(' / ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Tip */}
              <p className="text-[10px] text-slate-400 mt-2 shrink-0">
                업로드 후 수술기록 DB 페이지에서 상세 확인 및 수정이 가능합니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      {uploadState !== 'parsing' && (
        <button
          onClick={async () => {
            if (uploadState === 'idle' || uploadState === 'error') {
              fileInputRef.current?.click();
              return;
            }
            if (isSubmitting) return;
            setIsSubmitting(true);
            try {
              const ok = await onGoToSurgeryUpload(uploadedFile ?? undefined);
              if (ok) onUploaded();
            } finally {
              setIsSubmitting(false);
            }
          }}
          className={`w-full py-3.5 text-sm font-bold rounded-2xl transition-all shrink-0 ${uploadState === 'done'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98]'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.98]'
            }`}
        >
          {isSubmitting
            ? '업로드 중...'
            : uploadState === 'idle' || uploadState === 'error'
              ? '파일 선택하기'
              : '수술기록 업로드하기'}
        </button>
      )}
    </div>
  );
}
