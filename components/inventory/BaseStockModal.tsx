import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem } from '../../types';
import { planService } from '../../services/planService';

interface BaseStockModalProps {
  visibleInventory: InventoryItem[];
  isUnlimited: boolean;
  hospitalId?: string;
  onRefreshLatestSurgeryUsage?: () => Promise<Record<string, number> | null>;
  onBulkUpdateStocks?: (changes: Array<{ id: string; initialStock: number; nextCurrentStock: number }>) => Promise<void>;
  onUpdateStock: (id: string, initialStock: number, nextCurrentStock?: number) => void | Promise<void>;
  onClose: () => void;
  onAfterSave: (serverCount: number) => void;
}

const BaseStockModal: React.FC<BaseStockModalProps> = ({
  visibleInventory,
  isUnlimited,
  hospitalId,
  onRefreshLatestSurgeryUsage,
  onBulkUpdateStocks,
  onUpdateStock,
  onClose,
  onAfterSave,
}) => {
  const [baseStockInputs, setBaseStockInputs] = useState<Record<string, number>>(() => {
    const seeded: Record<string, number> = {};
    visibleInventory.forEach(item => {
      const safeCurrentStock = Number.isFinite(item.currentStock) ? item.currentStock : 0;
      seeded[item.id] = Math.max(0, Math.round(safeCurrentStock));
    });
    return seeded;
  });
  const [manufacturerFilter, setManufacturerFilter] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 포커스된 입력을 추적 (모바일에서 전체 선택)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const manufacturerOptions = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => { if (item.manufacturer) set.add(item.manufacturer); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [visibleInventory]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => {
      if (manufacturerFilter !== null && item.manufacturer !== manufacturerFilter) return;
      if (item.brand) set.add(item.brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [visibleInventory, manufacturerFilter]);

  useEffect(() => {
    if (brandFilter === null) return;
    if (!brandOptions.includes(brandFilter)) {
      setBrandFilter(null);
    }
  }, [brandFilter, brandOptions]);

  const filteredRows = useMemo(() => {
    return visibleInventory
      .filter(item => manufacturerFilter === null || item.manufacturer === manufacturerFilter)
      .filter(item => brandFilter === null || item.brand === brandFilter)
      .sort((a, b) => {
        const mComp = a.manufacturer.localeCompare(b.manufacturer, 'ko');
        if (mComp !== 0) return mComp;
        const bComp = a.brand.localeCompare(b.brand, 'ko');
        if (bComp !== 0) return bComp;
        return a.size.localeCompare(b.size, 'ko', { numeric: true });
      });
  }, [visibleInventory, manufacturerFilter, brandFilter]);

  const handleInputChange = (itemId: string, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    const next = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setBaseStockInputs(prev => ({ ...prev, [itemId]: next }));
  };

  const handleStep = (itemId: string, delta: number) => {
    setBaseStockInputs(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta),
    }));
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleApply = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const latestUsageMap = (await onRefreshLatestSurgeryUsage?.()) ?? null;
      if (onRefreshLatestSurgeryUsage && latestUsageMap === null) {
        return;
      }
      const stockUpdates: Array<{ id: string; initialStock: number; nextCurrentStock: number }> = [];

      for (const item of visibleInventory) {
        const countedCurrentStock = Math.max(0, Math.round(baseStockInputs[item.id] ?? 0));
        const latestUsage = Math.max(0, Math.round(latestUsageMap?.[item.id] ?? item.usageCount ?? 0));
        const nextInitialStock = countedCurrentStock + latestUsage;

        if (nextInitialStock === item.initialStock) continue;

        stockUpdates.push({
          id: item.id,
          initialStock: nextInitialStock,
          nextCurrentStock: countedCurrentStock,
        });
      }

      if (stockUpdates.length > 0) {
        if (onBulkUpdateStocks) {
          await onBulkUpdateStocks(stockUpdates);
        } else {
          for (const update of stockUpdates) {
            await Promise.resolve(onUpdateStock(update.id, update.initialStock, update.nextCurrentStock));
          }
        }
      }

      if (hospitalId && !isUnlimited) {
        const serverCount = await planService.incrementBaseStockEditCount(hospitalId);
        onAfterSave(serverCount);
      } else {
        onAfterSave(-1);
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // 변경된 항목 수
  const changedCount = useMemo(() => {
    return visibleInventory.filter(item => {
      const input = Math.max(0, Math.round(baseStockInputs[item.id] ?? 0));
      const usage = Math.max(0, Math.round(item.usageCount ?? 0));
      return (input + usage) !== item.initialStock;
    }).length;
  }, [baseStockInputs, visibleInventory]);

  return (
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      {/* 모바일: 풀스크린 / 데스크톱: 중앙 모달 */}
      <div className="bg-white w-full max-w-6xl h-[100dvh] sm:h-[84vh] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* ── 헤더 ── */}
        <div className="px-5 sm:px-6 pt-4 pb-3 sm:py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          {/* 모바일 drag indicator */}
          <div className="sm:hidden w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">기초재고 실사 입력</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                실제 보유 수량을 입력하면 기초재고가 자동 계산됩니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {changedCount > 0 && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600">
                  {changedCount}개 변경됨
                </span>
              )}
              <button
                onClick={handleClose}
                disabled={isSaving}
                aria-label="닫기"
                className={`p-2 rounded-xl transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200'}`}
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── 필터 ── */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 bg-white shrink-0 space-y-2">
          {/* 제조사 필터 - 가로 스크롤 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[10px] font-bold text-slate-400 shrink-0 mr-0.5">제조사</span>
            <button
              onClick={() => setManufacturerFilter(null)}
              className={`shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                manufacturerFilter === null ? 'bg-slate-800 text-white' : 'text-slate-500 bg-slate-100'
              }`}
            >
              전체
              <span className={`ml-1 text-[10px] px-1 py-0.5 rounded-full ${manufacturerFilter === null ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                {visibleInventory.length}
              </span>
            </button>
            {manufacturerOptions.map(mfr => {
              const count = visibleInventory.filter(item => item.manufacturer === mfr).length;
              const active = manufacturerFilter === mfr;
              return (
                <button
                  key={mfr}
                  onClick={() => setManufacturerFilter(mfr)}
                  className={`shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${active ? 'bg-slate-800 text-white' : 'text-slate-500 bg-slate-100'}`}
                >
                  {mfr}
                  <span className={`ml-1 text-[10px] px-1 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 브랜드 필터 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[10px] font-bold text-slate-400 shrink-0 mr-0.5">브랜드</span>
            <button
              onClick={() => setBrandFilter(null)}
              className={`shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                brandFilter === null ? 'bg-indigo-600 text-white' : 'text-slate-500 bg-slate-100'
              }`}
            >
              전체
              <span className={`ml-1 text-[10px] px-1 py-0.5 rounded-full ${brandFilter === null ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                {filteredRows.length}
              </span>
            </button>
            {brandOptions.map(brand => {
              const count = visibleInventory.filter(item => {
                if (manufacturerFilter !== null && item.manufacturer !== manufacturerFilter) return false;
                return item.brand === brand;
              }).length;
              const active = brandFilter === brand;
              return (
                <button
                  key={brand}
                  onClick={() => setBrandFilter(brand)}
                  className={`shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${active ? 'bg-indigo-600 text-white' : 'text-slate-500 bg-slate-100'}`}
                >
                  {brand}
                  <span className={`ml-1 text-[10px] px-1 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            <span className="ml-auto shrink-0 text-[10px] text-slate-400 font-medium">{filteredRows.length}개</span>
          </div>
        </div>

        {/* ── 목록 영역 ── */}
        <div className="flex-1 overflow-auto">
          {filteredRows.length === 0 ? (
            <div className="h-full min-h-[240px] flex items-center justify-center text-sm font-semibold text-slate-400">
              선택한 필터에 해당하는 품목이 없습니다.
            </div>
          ) : (
            <>
              {/* ── 모바일: 카드 목록 ── */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredRows.map((item, idx) => {
                  const countedCurrentStock = Math.max(0, Math.round(baseStockInputs[item.id] ?? 0));
                  const usage = Math.max(0, Math.round(item.usageCount ?? 0));
                  const nextBaseStock = countedCurrentStock + usage;
                  return (
                    <div key={item.id} className="px-4 py-3.5">
                      {/* 품목 정보 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-slate-400 leading-none mb-0.5">
                            {idx + 1}. {item.manufacturer}
                          </p>
                          <p className="text-sm font-black text-slate-800 leading-snug">
                            {item.brand} <span className="font-semibold text-slate-600">{item.size}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-[10px] text-slate-400 font-medium">사용량</p>
                          <p className="text-sm font-black text-rose-500 tabular-nums">{usage}</p>
                        </div>
                      </div>

                      {/* 스테퍼 입력 */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0 bg-indigo-50 rounded-xl border border-indigo-200 overflow-hidden flex-1">
                          {/* 감소 버튼 */}
                          <button
                            type="button"
                            onPointerDown={(e) => { e.preventDefault(); handleStep(item.id, -1); }}
                            className="w-12 h-12 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 transition-colors font-black text-xl shrink-0"
                            aria-label="1 감소"
                          >
                            −
                          </button>
                          {/* 숫자 입력 */}
                          <input
                            ref={(el) => { if (el) inputRefs.current.set(item.id, el); }}
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min={0}
                            step={1}
                            value={countedCurrentStock}
                            onChange={(e) => {
                              // 앞자리 0 즉시 제거: "08" → "8"
                              if (/^0\d/.test(e.target.value)) {
                                e.target.value = e.target.value.replace(/^0+(\d)/, '$1');
                              }
                              handleInputChange(item.id, e.target.value);
                            }}
                            onFocus={(e) => e.target.select()}
                            className="flex-1 h-12 text-center text-xl font-black text-indigo-700 bg-transparent outline-none tabular-nums min-w-0"
                          />
                          {/* 증가 버튼 */}
                          <button
                            type="button"
                            onPointerDown={(e) => { e.preventDefault(); handleStep(item.id, 1); }}
                            className="w-12 h-12 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 transition-colors font-black text-xl shrink-0"
                            aria-label="1 증가"
                          >
                            +
                          </button>
                        </div>

                        {/* 기초재고 결과 */}
                        <div className="text-right shrink-0 w-16">
                          <p className="text-[10px] text-slate-400 font-medium">기초재고</p>
                          <p className="text-base font-black text-emerald-600 tabular-nums">{nextBaseStock}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── 데스크톱: 테이블 ── */}
              <table className="hidden sm:table w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[64px] text-center">No</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">브랜드</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">규격</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-rose-500 uppercase tracking-wider text-center">최신 사용량</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-indigo-500 uppercase tracking-wider text-center">현재재고(실사)</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-emerald-600 uppercase tracking-wider text-center">반영 기초재고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((item, idx) => {
                    const countedCurrentStock = Math.max(0, Math.round(baseStockInputs[item.id] ?? 0));
                    const usage = Math.max(0, Math.round(item.usageCount ?? 0));
                    const nextBaseStock = countedCurrentStock + usage;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs font-black text-slate-400 text-center tabular-nums">{idx + 1}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-500">{item.manufacturer}</td>
                        <td className="px-4 py-3 text-sm font-black text-slate-800">{item.brand}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-600">{item.size}</td>
                        <td className="px-4 py-3 text-center text-sm font-black text-rose-500 tabular-nums">{usage}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={countedCurrentStock}
                            onChange={(e) => {
                              if (/^0\d/.test(e.target.value)) {
                                e.target.value = e.target.value.replace(/^0+(\d)/, '$1');
                              }
                              handleInputChange(item.id, e.target.value);
                            }}
                            className="w-24 px-2 py-1.5 text-sm text-center font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-black text-emerald-600 tabular-nums">{nextBaseStock}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          {/* 모바일: 세로 레이아웃 */}
          <div className="sm:hidden space-y-2">
            {changedCount > 0 && (
              <p className="text-[11px] text-center text-indigo-600 font-bold">{changedCount}개 항목 변경됨</p>
            )}
            <button
              onClick={handleApply}
              disabled={isSaving || visibleInventory.length === 0}
              className={`w-full h-14 rounded-2xl text-base font-black transition-colors flex items-center justify-center gap-2 ${
                !isSaving && visibleInventory.length > 0
                  ? 'bg-indigo-600 text-white active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  저장 중...
                </>
              ) : '기초재고 반영'}
            </button>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="w-full h-11 rounded-2xl text-sm font-bold text-slate-500 bg-white border border-slate-200 active:scale-[0.99] transition-colors"
            >
              취소
            </button>
          </div>

          {/* 데스크톱: 가로 레이아웃 */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500 font-medium">
              저장 시 최신 수술기록을 다시 조회한 뒤 기초재고를 계산합니다.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                disabled={isSaving}
                className={`px-5 py-2 text-sm font-bold rounded-xl border transition-colors ${
                  isSaving
                    ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                    : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                취소
              </button>
              <button
                onClick={handleApply}
                disabled={isSaving || visibleInventory.length === 0}
                className={`px-5 py-2 text-sm font-black rounded-xl transition-colors flex items-center gap-2 ${
                  !isSaving && visibleInventory.length > 0
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    저장 중...
                  </>
                ) : '기초재고 반영'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseStockModal;
