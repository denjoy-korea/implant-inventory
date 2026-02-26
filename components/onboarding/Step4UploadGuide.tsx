import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseExcelFile } from '../../services/excelService';
import { buildBrandSizeFormatIndex, hasRegisteredBrandSize, isListBasedSurgeryInput, buildUnregisteredSample, appendUnregisteredSample } from '../../services/surgeryUnregisteredUtils';
import { normalizeSurgery } from '../../services/normalizationService';
import { getSizeMatchKey, isIbsImplantManufacturer } from '../../services/sizeNormalizer';
import { isExchangePrefix } from '../../services/appUtils';
import type { ExcelRow } from '../../types';
import { InventoryItem, SurgeryUnregisteredItem } from '../../types';

const PARSING_STEPS = [
  '파일을 읽는 중...',
  '수술기록 파싱 중...',
  '재고 마스터와 비교 중...',
  '미등록 규격 분석 중...',
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

type UploadState = 'idle' | 'parsing' | 'done' | 'error';

interface AnalysisResult {
  totalRecords: number;
  unregistered: SurgeryUnregisteredItem[];
}

interface Props {
  inventory: InventoryItem[];
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

function analyzeSurgeryRows(
  rows: Record<string, unknown>[],
  inventory: InventoryItem[]
): AnalysisResult {
  const formatIndex = buildBrandSizeFormatIndex(inventory);
  const missingMap = new Map<string, SurgeryUnregisteredItem>();
  let totalRecords = 0;

  // 포맷 감지: "구분" 컬럼 → DentWeb 원시 수출 포맷 / "수술기록" 컬럼 → 수술기록지 포맷
  const firstRow = rows[0] ?? {};
  const isDenwebFormat = '구분' in firstRow;
  const isStatisticsFormat = !isDenwebFormat && '수술기록' in firstRow;

  for (const row of rows) {
    let manufacturer: string;
    let brand: string;
    let size: string;
    let qty = 1;

    if (isDenwebFormat) {
      // ── DentWeb 원시 수술기록 포맷 ──
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
      if (manufacturer === '보험청구' || brand === '보험임플란트') continue;

      const qtyRaw = row['갯수'] !== undefined ? Number(row['갯수']) : 1;
      qty = Number.isFinite(qtyRaw) ? qtyRaw : 1;

    } else if (isStatisticsFormat) {
      // ── 수술기록지 시트 포맷 ──
      const surgeryRecord = String(row['수술기록'] || '').trim();
      const parsed = parseFixtureFromRecord(surgeryRecord);
      if (!parsed) continue;

      manufacturer = parsed.manufacturer;
      brand = parsed.brand;
      size = parsed.size;
      qty = 1; // 각 행 = 1건

    } else {
      continue;
    }

    totalRecords += qty;

    // 등록된 사이즈 텍스트와 정확히 일치하는 경우만 등록된 것으로 인정.
    // 형식이 다른 수술기록(e.g. "Φ5.0 ×10" vs "Φ5.0 × 10")도 미등록으로 잡기 위함.
    const isListBased = isListBasedSurgeryInput(formatIndex, manufacturer, brand, size);
    if (isListBased) continue;

    // IBS: D:X L:Y Cuff:Z 포맷 ↔ canonical(C3 Φ... X ...) 포맷 간 불일치 허용
    // 이전 DB에 canonical로 저장된 항목과 원래 포맷 수술기록 간 false positive 방지
    const isIbs = isIbsImplantManufacturer(manufacturer) || isIbsImplantManufacturer(brand);
    if (isIbs && hasRegisteredBrandSize(formatIndex, manufacturer, brand, size)) continue;

    const normM = normalizeSurgery(manufacturer);
    const normB = normalizeSurgery(brand);
    const normS = getSizeMatchKey(size, manufacturer);
    const itemKey = `${normM}|${normB}|${normS}`;

    const sample = buildUnregisteredSample(row as ExcelRow);

    const existing = missingMap.get(itemKey);
    if (existing) {
      existing.usageCount += qty;
      appendUnregisteredSample(existing, sample);
    } else {
      missingMap.set(itemKey, {
        manufacturer: manufacturer || '-',
        brand: brand || '-',
        size: size || '-',
        usageCount: qty,
        reason: 'not_in_inventory',
        samples: [sample],
      });
    }
  }

  return {
    totalRecords,
    unregistered: Array.from(missingMap.values()).sort((a, b) => b.usageCount - a.usageCount),
  };
}

export default function Step4UploadGuide({ inventory, onGoToSurgeryUpload, onUploaded }: Props) {
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

      const result = analyzeSurgeryRows(rows, inventory);
      setAnalysis(result);
      setUploadState('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '파일을 읽을 수 없습니다.');
      setUploadState('error');
    }
  }, [inventory]);

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
        파일을 업로드하면 재고 마스터에 없는 미등록 규격 수술 기록을 찾아드립니다.
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
          {analysis.unregistered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-5 text-center">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 animate-icon-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-bold text-emerald-700">모두 등록된 품목</p>
              <p className="text-[11px] text-emerald-600">
                {analysis.totalRecords}건 수술기록을 확인했습니다.<br />
                미등록 규격이 없습니다.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header badge */}
              <div className="flex items-center gap-2 mb-2 shrink-0">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-black rounded-full">
                  미등록 품목 {analysis.unregistered.length}종 · {analysis.unregistered.reduce((s, i) => s + i.usageCount, 0)}건
                </span>
                <span className="text-[11px] text-slate-400">총 {analysis.totalRecords}건 수술기록 중</span>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-0.5">
                {analysis.unregistered.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {item.manufacturer} · {item.brand}
                      </p>
                      <p className="text-[11px] text-slate-400">{item.size}</p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 shrink-0">{item.usageCount}건</span>
                  </div>
                ))}
              </div>

              {/* Tip */}
              <p className="text-[10px] text-slate-400 mt-2 shrink-0">
                업로드 후 수술기록 DB 페이지에서 상세 확인 가능합니다.
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
