import React, { useState, useRef, useCallback } from 'react';
import { parseExcelFile } from '../../services/excelService';

interface Props {
  onGoToDataSetup: () => void;
}

interface BrandGroup {
  brand: string;
  sizes: string[];
  anomalousSizes: Set<string>;
}

interface ManufacturerGroup {
  manufacturer: string;
  brands: BrandGroup[];
  total: number;
  anomalousCount: number;
}

type UploadState = 'idle' | 'parsing' | 'done' | 'error';

// 숫자를 N으로 치환해 구조적 패턴 추출
function extractSizePattern(size: string): string {
  return size
    .replace(/\d+\.?\d*/g, 'N')
    .replace(/\s+/g, ' ')
    .trim();
}

// 브랜드 내 사이즈 패턴 이상 감지
function detectAnomalies(sizes: string[]): Set<string> {
  if (sizes.length < 4) return new Set();

  const patternCount = new Map<string, number>();
  for (const size of sizes) {
    const pat = extractSizePattern(size);
    patternCount.set(pat, (patternCount.get(pat) || 0) + 1);
  }

  // 지배적 패턴 탐색
  let dominantPattern = '';
  let maxCount = 0;
  for (const [pat, count] of patternCount) {
    if (count > maxCount) { maxCount = count; dominantPattern = pat; }
  }

  // 지배 패턴이 60% 미만이면 혼합 브랜드로 간주, 이상 감지 스킵
  if (maxCount < sizes.length * 0.6) return new Set();

  const anomalous = new Set<string>();
  for (const size of sizes) {
    if (extractSizePattern(size) !== dominantPattern) anomalous.add(size);
  }
  return anomalous;
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
      const anomalousSizes = detectAnomalies(sizesArr);
      brands.push({ brand, sizes: sizesArr, anomalousSizes });
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMsg('.xlsx 또는 .xls 파일만 업로드할 수 있습니다.');
      setUploadState('error');
      return;
    }
    setUploadState('parsing');
    setFileName(file.name);
    try {
      const data = await parseExcelFile(file);
      // 모든 시트 중 픽스처 데이터가 가장 많은 시트 사용
      let bestResult: ManufacturerGroup[] = [];
      for (const sheetName of Object.keys(data.sheets)) {
        const rows = data.sheets[sheetName].rows as Record<string, unknown>[];
        const result = analyzeFixtureRows(rows);
        if (result.length > bestResult.length) bestResult = result;
      }
      if (bestResult.length === 0) {
        throw new Error('제조사/브랜드 데이터를 찾을 수 없습니다. 파일 형식을 확인해주세요.');
      }
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
  const totalAnomalous = groups.reduce((s, g) => s + g.anomalousCount, 0);
  const healthScore = totalItems > 0 ? Math.round(((totalItems - totalAnomalous) / totalItems) * 100) : 100;

  const healthMeta = healthScore === 100
    ? { label: '완벽', barColor: 'bg-emerald-500', badgeClass: 'text-emerald-700 bg-emerald-100', scoreClass: 'text-emerald-600', borderClass: 'border-emerald-100 bg-emerald-50' }
    : healthScore >= 95
    ? { label: '양호', barColor: 'bg-green-500', badgeClass: 'text-green-700 bg-green-100', scoreClass: 'text-green-600', borderClass: 'border-green-100 bg-green-50' }
    : healthScore >= 85
    ? { label: '주의', barColor: 'bg-amber-400', badgeClass: 'text-amber-700 bg-amber-100', scoreClass: 'text-amber-600', borderClass: 'border-amber-100 bg-amber-50' }
    : { label: '점검 필요', barColor: 'bg-red-500', badgeClass: 'text-red-700 bg-red-100', scoreClass: 'text-red-600', borderClass: 'border-red-100 bg-red-50' };

  return (
    <div className="px-6 py-6 flex flex-col h-full">
      <h2 className="text-xl font-black text-slate-900 mb-1">픽스처 파일 업로드</h2>
      <p className="text-sm text-slate-500 mb-4">
        파일을 업로드하면 제조사·브랜드별 사이즈 패턴을 분석하고 데이터 건강도를 측정합니다.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

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
      {uploadState === 'parsing' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500">파일 분석 중...</p>
        </div>
      )}

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
          <button
            onClick={() => setUploadState('idle')}
            className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
          >
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
            <span className="text-xs text-green-600 font-bold shrink-0">
              {groups.length}개 제조사 · {totalItems}개 사이즈
            </span>
          </div>

          {/* Health score */}
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 border ${healthMeta.borderClass}`}>
            <span className="text-[11px] font-bold text-slate-600 shrink-0">데이터 건강도</span>
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${healthMeta.barColor}`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <span className={`text-sm font-black tabular-nums shrink-0 ${healthMeta.scoreClass}`}>
              {healthScore}%
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${healthMeta.badgeClass}`}>
              {healthMeta.label}
            </span>
            {totalAnomalous > 0 && (
              <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                이상 {totalAnomalous}개
              </span>
            )}
          </div>

          {/* Groups */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-0.5">
            {groups.map((g) => (
              <div key={g.manufacturer} className="bg-slate-50 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800">{g.manufacturer}</span>
                  <div className="flex items-center gap-1.5">
                    {g.anomalousCount > 0 && (
                      <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.5 rounded-full">
                        이상 {g.anomalousCount}개
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium">{g.total}개</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {g.brands.map((b) => (
                    <div key={b.brand}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-indigo-500">{b.brand}</span>
                        {b.anomalousSizes.size > 0 && (
                          <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 font-bold px-1 py-0.5 rounded">
                            ⚠ {b.anomalousSizes.size}개 패턴 불일치
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {b.sizes.map((s) =>
                          b.anomalousSizes.has(s) ? (
                            <span
                              key={s}
                              title="패턴 불일치 항목"
                              className="text-[10px] text-amber-700 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 font-medium"
                            >
                              {s}
                            </span>
                          ) : (
                            <span key={s} className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                              {s}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bottom CTA */}
      {uploadState !== 'parsing' && (
        <button
          onClick={onGoToDataSetup}
          className="w-full py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all shrink-0"
        >
          {uploadState === 'done' ? '데이터 설정 페이지에서 저장하기' : '데이터 설정 페이지로 이동'}
        </button>
      )}
    </div>
  );
}
