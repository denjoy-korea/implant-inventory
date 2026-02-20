
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types';
import { auditService, AuditEntry, AuditHistoryItem } from '../services/auditService';
import { operationLogService } from '../services/operationLogService';
import { useToast } from '../hooks/useToast';

interface InventoryAuditProps {
  inventory: InventoryItem[];
  hospitalId: string;
  onApplied: () => void;
  showHistory?: boolean;
  onCloseHistory?: () => void;
}

const MISMATCH_REASONS = ['기록 누락', '수술기록 오입력', '분실', '입고 수량 오류', '기타'] as const;

const InventoryAudit: React.FC<InventoryAuditProps> = ({ inventory, hospitalId, onApplied, showHistory, onCloseHistory }) => {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [auditResults, setAuditResults] = useState<Record<string, { matched: boolean; actualCount?: number; reason?: string }>>({});
  const [showAuditSummary, setShowAuditSummary] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isAuditActive, setIsAuditActive] = useState(false);
  const [customReasonMode, setCustomReasonMode] = useState<Record<string, boolean>>({});
  const [confirmedItems, setConfirmedItems] = useState<string[]>([]); // 확정 순서 추적 (되돌리기용)
  const { toast, showToast } = useToast();
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    if (!hospitalId) return;
    const data = await auditService.getAuditHistory(hospitalId);
    setAuditHistory(data);
  }, [hospitalId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const visibleInventory = useMemo(() => {
    return inventory.filter(item =>
      !item.manufacturer.startsWith('수술중FAIL_') && item.manufacturer !== '보험청구' && item.brand !== '보험임플란트'
    );
  }, [inventory]);

  const brandsList = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => { if (item.brand) set.add(item.brand); });
    return Array.from(set).sort();
  }, [visibleInventory]);

  useEffect(() => {
    if (activeBrand === null && brandsList.length > 0) {
      setActiveBrand(brandsList[0]);
    }
  }, [brandsList]);

  const filteredInventory = useMemo(() => {
    return visibleInventory
      .filter(item => activeBrand === null || item.brand === activeBrand)
      .sort((a, b) => {
        const mComp = a.manufacturer.localeCompare(b.manufacturer, 'ko');
        if (mComp !== 0) return mComp;
        const bComp = a.brand.localeCompare(b.brand, 'ko');
        if (bComp !== 0) return bComp;
        return a.size.localeCompare(b.size, 'ko', { numeric: true });
      });
  }, [visibleInventory, activeBrand]);

  // KPI: 현재 선택된 브랜드 기준 (탭 연동)
  const { totalItems, totalAudited, totalMatched, totalMismatched, totalMismatchedQty, progressPct } = useMemo(() => {
    const filteredIds = new Set(filteredInventory.map(i => i.id));
    const items = filteredInventory.length;
    const audited = Object.entries(auditResults).filter(([id]) => filteredIds.has(id));
    const matched = audited.filter(([, r]) => r.matched).length;
    const mismatchedEntries = audited.filter(([, r]) => !r.matched);
    const mismatchedQty = mismatchedEntries.reduce((sum, [id, r]) => {
      const item = filteredInventory.find(i => i.id === id);
      return sum + Math.abs((r.actualCount ?? 0) - (item?.currentStock ?? 0));
    }, 0);
    return {
      totalItems: items,
      totalAudited: audited.length,
      totalMatched: matched,
      totalMismatched: mismatchedEntries.length,
      totalMismatchedQty: mismatchedQty,
      progressPct: items > 0 ? Math.round((audited.length / items) * 100) : 0,
    };
  }, [filteredInventory, auditResults]);

  // 불일치 item 상세 (배너용) — 현재 브랜드 기준
  const mismatchItems = useMemo(() => {
    const filteredIds = new Set(filteredInventory.map(i => i.id));
    return Object.entries(auditResults)
      .filter(([id, r]) => filteredIds.has(id) && !r.matched)
      .map(([id, r]) => ({ id, result: r, item: inventory.find(i => i.id === id) }))
      .filter(x => x.item != null) as { id: string; result: { matched: boolean; actualCount?: number; reason?: string }; item: InventoryItem }[];
  }, [auditResults, filteredInventory, inventory]);

  // 브랜드별 실사 통계 (탭 dot 색 계산용)
  const brandStats = useMemo(() => {
    const stats: Record<string, { total: number; audited: number; mismatch: number }> = {};
    visibleInventory.forEach(item => {
      if (!stats[item.brand]) stats[item.brand] = { total: 0, audited: 0, mismatch: 0 };
      stats[item.brand].total++;
      if (auditResults[item.id] !== undefined) {
        stats[item.brand].audited++;
        if (!auditResults[item.id].matched) stats[item.brand].mismatch++;
      }
    });
    return stats;
  }, [visibleInventory, auditResults]);

  const auditedCount = Object.keys(auditResults).length; // 전체 기준 (버튼 활성화용)

  // 브랜드 진행률 100% 시 자동으로 다음 브랜드로 이동 (모든 브랜드 완료 시 중단)
  useEffect(() => {
    if (!isAuditActive || progressPct < 100 || activeBrand === null) return;
    const allBrandsDone = brandsList.every(b => {
      const s = brandStats[b];
      return s && s.total > 0 && s.audited === s.total;
    });
    if (allBrandsDone) return;
    const currentIdx = brandsList.indexOf(activeBrand);
    const nextBrand = brandsList[currentIdx + 1];
    if (!nextBrand) return;
    const timer = setTimeout(() => setActiveBrand(nextBrand), 600);
    return () => clearTimeout(timer);
  }, [progressPct, activeBrand, brandsList, isAuditActive, brandStats]);

  const handleAuditComplete = () => setShowAuditSummary(true);
  const handleAuditClose = () => { setAuditResults({}); setShowAuditSummary(false); setIsAuditActive(false); setCustomReasonMode({}); setConfirmedItems([]); };

  const handleApply = async () => {
    if (mismatchItems.length === 0) { handleAuditClose(); return; }
    setIsApplying(true);
    try {
      const entries: AuditEntry[] = mismatchItems
        .map(({ id, result }) => {
          const item = inventory.find(i => i.id === id);
          if (!item) return null;
          return {
            inventoryId: id,
            systemStock: item.currentStock,
            actualStock: result.actualCount ?? 0,
            difference: (result.actualCount ?? 0) - item.currentStock,
            reason: result.reason || MISMATCH_REASONS[0],
          };
        })
        .filter((e): e is AuditEntry => e !== null);
      const { success, error } = await auditService.applyAudit(hospitalId, entries);
      if (success) {
        operationLogService.logOperation('inventory_audit', `재고 실사 적용: 불일치 ${entries.length}건`, { mismatchCount: entries.length });
        handleAuditClose();
        loadHistory();
        onApplied();
      } else {
        showToast(`실사 적용 실패: ${error}`, 'error');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const getBrandDotColor = (brand: string) => {
    const s = brandStats[brand];
    if (!s || s.audited === 0) return 'bg-slate-300';
    if (s.mismatch > 0) return 'bg-rose-500';
    if (s.audited === s.total) return 'bg-emerald-500';
    return 'bg-indigo-400';
  };

  return (
    <>
    <div className="space-y-5 animate-in fade-in duration-500 pb-20">

      {/* KPI 카드 */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="grid grid-cols-4 divide-x divide-slate-100">
          {/* 총 실사 품목 */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">총 실사 품목</span>
            </div>
            <div className="text-3xl font-black text-slate-800 tabular-nums leading-none">{totalItems}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-1">품목</div>
          </div>

          {/* 일치 */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">일치</span>
            </div>
            <div className="text-3xl font-black text-emerald-600 tabular-nums leading-none">{totalMatched}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-1">
              {totalAudited > 0 ? `${Math.round(totalMatched / totalAudited * 100)}%` : '-'}
            </div>
          </div>

          {/* 불일치 (항목) */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">불일치 항목</span>
            </div>
            <div className={`text-3xl font-black tabular-nums leading-none ${totalMismatched > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
              {totalMismatched}
            </div>
            <div className="text-[10px] font-medium mt-1">
              {totalMismatched > 0
                ? <span className="text-rose-400">품목</span>
                : <span className="text-slate-400">-</span>
              }
            </div>
          </div>

          {/* 불일치 (개수) */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">불일치 개수</span>
            </div>
            <div className={`text-3xl font-black tabular-nums leading-none ${totalMismatchedQty > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
              {totalMismatchedQty}
            </div>
            <div className="text-[10px] font-medium mt-1">
              {totalMismatchedQty > 0
                ? <span className="text-orange-400">개 차이</span>
                : <span className="text-slate-400">-</span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* 진행률 프로그레스 바 */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-4">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">실사 진행률</span>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${totalMismatched > 0 ? 'bg-gradient-to-r from-indigo-400 to-rose-400' : 'bg-indigo-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-[11px] font-black text-slate-600 tabular-nums whitespace-nowrap">{totalAudited} / {totalItems}</span>
        <span className={`text-[11px] font-black tabular-nums whitespace-nowrap ${progressPct === 100 ? 'text-emerald-600' : 'text-indigo-500'}`}>{progressPct}%</span>
      </div>

      {/* 불일치 Alert 배너 */}
      {totalMismatched > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              불일치 {totalMismatched}건 발견 — 실사 완료 후 재고에 자동 반영됩니다.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {mismatchItems.slice(0, 6).map(({ id, result, item }) => {
                const diff = (result.actualCount ?? 0) - item.currentStock;
                return (
                  <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg">
                    {item.brand} {item.size}
                    <span className="text-rose-500 font-black">{diff > 0 ? `+${diff}` : diff}개</span>
                  </span>
                );
              })}
              {mismatchItems.length > 6 && (
                <span className="inline-flex items-center px-2.5 py-1 bg-rose-100 text-rose-500 text-[11px] font-bold rounded-lg">+{mismatchItems.length - 6}건</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 브랜드 탭 + 진행 표시 */}
      {brandsList.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveBrand(null)}
              className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeBrand === null ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
            >
              전체
              <span className={`text-[10px] font-black ${activeBrand === null ? 'text-slate-300' : 'text-slate-400'}`}>{totalItems}</span>
            </button>
            {brandsList.map(b => {
              const s = brandStats[b] || { total: 0, audited: 0, mismatch: 0 };
              const isActive = activeBrand === b;
              return (
                <button
                  key={b}
                  onClick={() => setActiveBrand(b)}
                  className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${isActive ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getBrandDotColor(b)}`} />
                  {b}
                  <span className={`text-[10px] font-black tabular-nums ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {s.audited}/{s.total}
                  </span>
                </button>
              );
            })}
          </div>
          {/* 실사 버튼 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isAuditActive ? (
              <button
                onClick={() => setIsAuditActive(true)}
                className="px-5 py-2 text-xs font-black bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                재고실사진행
              </button>
            ) : (
              <>
                {confirmedItems.length > 0 && (
                  <button
                    onClick={() => {
                      const lastId = confirmedItems[confirmedItems.length - 1];
                      setConfirmedItems(prev => prev.slice(0, -1));
                      setAuditResults(prev => { const { [lastId]: _, ...rest } = prev; return rest; });
                      setCustomReasonMode(prev => { const { [lastId]: _, ...rest } = prev; return rest; });
                    }}
                    className="px-4 py-2 text-xs font-bold text-indigo-500 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    되돌리기
                  </button>
                )}
                {auditedCount > 0 && (
                  <button
                    onClick={handleAuditClose}
                    className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                  >
                    초기화
                  </button>
                )}
                <button
                  onClick={handleAuditComplete}
                  disabled={auditedCount === 0}
                  className={`px-5 py-2 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 ${auditedCount > 0 ? 'bg-slate-800 text-white hover:bg-slate-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  실사 완료
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden">
        <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto', overflowX: 'auto' }}>
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[13%]" />
              <col className="w-[18%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[28%]" />
            </colgroup>
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">브랜드</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">규격</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 text-center">현재 재고</th>
                <th className="px-4 py-4 text-[11px] font-bold text-indigo-400 text-center">실사결과</th>
                <th className="px-4 py-4 text-[11px] font-bold text-emerald-500 text-center">일치</th>
                <th className="px-4 py-4 text-[11px] font-bold text-rose-400 text-center">불일치</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.filter(item => !confirmedItems.includes(item.id)).map((item) => {
                const result = auditResults[item.id];
                const rowBg = result
                  ? result.matched
                    ? 'bg-emerald-50/60'
                    : 'bg-rose-50/50'
                  : '';
                const isCustom = customReasonMode[item.id];
                const confirmItem = (id: string) => setConfirmedItems(prev => prev.includes(id) ? prev : [...prev, id]);
                const toggleCheck = (matched: boolean) => {
                  if (result?.matched === matched) {
                    // 이미 선택된 것 다시 클릭 → 해제 (입력값·사유 모두 초기화)
                    setAuditResults(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                    setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                  } else {
                    setAuditResults(prev => ({ ...prev, [item.id]: { matched, actualCount: matched ? undefined : item.currentStock, reason: matched ? undefined : MISMATCH_REASONS[0] } }));
                    if (matched) {
                      // 일치: 즉시 숨김
                      setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                      confirmItem(item.id);
                    }
                  }
                };
                return (
                  <tr key={item.id} className={`group transition-colors hover:brightness-[0.97] ${rowBg}`}>
                    <td className="px-4 py-3.5 text-[10px] font-bold text-slate-400">{item.manufacturer}</td>
                    <td className="px-4 py-3.5 text-sm font-black text-slate-800 tracking-tight">{item.brand}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-600">{item.size}</td>
                    <td className="px-4 py-3.5 text-center text-sm font-black text-slate-900 tabular-nums">{item.currentStock}</td>
                    {/* 실사결과 */}
                    <td className="px-2 py-3 text-center">
                      {result?.matched === true && (
                        <span className="inline-block px-2.5 py-1 text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg tabular-nums">
                          {item.currentStock}
                        </span>
                      )}
                      {result?.matched === false && (
                        <div className="flex items-center bg-rose-50 border border-rose-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: Math.max(0, (result.actualCount ?? item.currentStock) - 1) } }))}
                            className="px-2 py-1.5 text-rose-500 hover:bg-rose-100 active:bg-rose-200 transition-colors font-bold text-base leading-none flex-shrink-0"
                          >−</button>
                          <input
                            type="number"
                            min={0}
                            value={result.actualCount ?? item.currentStock}
                            onChange={(e) => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: Math.max(0, parseInt(e.target.value) || 0) } }))}
                            autoFocus
                            className="w-8 py-1 text-sm font-black text-center text-rose-700 bg-rose-50 outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: (result.actualCount ?? item.currentStock) + 1 } }))}
                            className="px-2 py-1.5 text-rose-500 hover:bg-rose-100 active:bg-rose-200 transition-colors font-bold text-base leading-none flex-shrink-0"
                          >+</button>
                        </div>
                      )}
                    </td>
                    {/* 일치 체크박스 */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={result?.matched === true}
                        disabled={!isAuditActive}
                        onChange={() => toggleCheck(true)}
                        className="w-4 h-4 rounded accent-emerald-600 cursor-pointer disabled:opacity-30 disabled:cursor-default"
                      />
                    </td>
                    {/* 불일치 체크박스 */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={result?.matched === false}
                        disabled={!isAuditActive}
                        onChange={() => toggleCheck(false)}
                        className="w-4 h-4 rounded accent-rose-500 cursor-pointer disabled:opacity-30 disabled:cursor-default"
                      />
                    </td>
                    {/* 비고 */}
                    <td className="px-4 py-3">
                      {result?.matched === false && (
                        isCustom ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={result.reason || ''}
                              onChange={(e) => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: e.target.value } }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && result.reason?.trim()) {
                                  setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                                  confirmItem(item.id);
                                }
                              }}
                              placeholder="사유 직접 입력"
                              autoFocus
                              className="flex-1 min-w-0 px-2 py-1 text-[11px] text-slate-700 bg-white border border-indigo-300 rounded-lg outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={() => {
                                if (result.reason?.trim()) {
                                  setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                                  confirmItem(item.id);
                                }
                              }}
                              disabled={!result.reason?.trim()}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap transition-all ${result.reason?.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                            >완료</button>
                            <button
                              onClick={() => {
                                setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                                setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: MISMATCH_REASONS[0] } }));
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg whitespace-nowrap"
                            >목록</button>
                          </div>
                        ) : (() => {
                          const isCustomReason = result.reason && !(MISMATCH_REASONS as readonly string[]).includes(result.reason);
                          return isCustomReason ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex-1 min-w-0 px-2 py-1 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg truncate">{result.reason}</span>
                              <button
                                onClick={() => setCustomReasonMode(prev => ({ ...prev, [item.id]: true }))}
                                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg whitespace-nowrap"
                              >수정</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={result.reason || MISMATCH_REASONS[0]}
                                onChange={(e) => {
                                  if (e.target.value === '기타') {
                                    setCustomReasonMode(prev => ({ ...prev, [item.id]: true }));
                                    setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: '' } }));
                                  } else {
                                    setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: e.target.value } }));
                                  }
                                }}
                                className="flex-1 min-w-0 px-2 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 cursor-pointer"
                              >
                                {MISMATCH_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <button
                                onClick={() => confirmItem(item.id)}
                                className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-lg whitespace-nowrap hover:bg-indigo-700 transition-all"
                              >완료</button>
                              <button
                                onClick={() => {
                                  setCustomReasonMode(prev => ({ ...prev, [item.id]: true }));
                                  setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: '' } }));
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg whitespace-nowrap"
                              >기타</button>
                            </div>
                          );
                        })()
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 실사 이력 모달 */}
      {showHistory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-6 bg-slate-800 text-white flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-black">실사 이력 조회</h3>
                <p className="text-slate-400 text-xs mt-0.5">{auditHistory.length}건의 이력</p>
              </div>
              <button onClick={onCloseHistory} aria-label="닫기" className="p-2 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {auditHistory.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400">실사일</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400">브랜드</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400">규격</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 text-center">시스템</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 text-center">실제</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 text-center">오차</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400">사유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditHistory.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-3 text-[11px] font-medium text-slate-500">{h.auditDate}</td>
                        <td className="px-5 py-3 text-xs font-bold text-slate-800">{h.brand}</td>
                        <td className="px-5 py-3 text-xs font-medium text-slate-600">{h.size}</td>
                        <td className="px-5 py-3 text-xs font-bold text-slate-600 text-center tabular-nums">{h.systemStock}</td>
                        <td className="px-5 py-3 text-xs font-bold text-slate-900 text-center tabular-nums">{h.actualStock}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${h.difference < 0 ? 'bg-rose-100 text-rose-600' : h.difference > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            {h.difference > 0 ? '+' : ''}{h.difference}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[11px] text-slate-500">{h.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-20 text-center">
                  <p className="text-sm text-slate-400 italic">실사 이력이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 실사 결과 모달 */}
      {showAuditSummary && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-black">재고실사 결과</h3>
                <p className="text-indigo-200 text-xs mt-1">{new Date().toLocaleDateString('ko-KR')} 실사</p>
              </div>
              <button onClick={handleAuditClose} aria-label="닫기" className="p-2 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-slate-800">{auditedCount}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">전체 실사</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{auditedCount - mismatchItems.length}</p>
                  <p className="text-[10px] font-bold text-emerald-500 mt-1">일치</p>
                </div>
                <div className="bg-rose-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-rose-600">{mismatchItems.length}</p>
                  <p className="text-[10px] font-bold text-rose-500 mt-1">불일치</p>
                </div>
              </div>

              {mismatchItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    불일치 내역
                  </h4>
                  <div className="space-y-2">
                    {mismatchItems.map(({ id, result, item }) => {
                      const diff = (result.actualCount ?? 0) - item.currentStock;
                      return (
                        <div key={id} className="flex items-center justify-between bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{item.brand} {item.size}</p>
                            <p className="text-[10px] text-slate-400 truncate">{item.manufacturer}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400">시스템</span>
                              <p className="text-xs font-black text-slate-600">{item.currentStock}</p>
                            </div>
                            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400">실제</span>
                              <p className="text-xs font-black text-rose-600">{result.actualCount}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${diff < 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">{result.reason}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {mismatchItems.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-emerald-600 font-bold">모든 품목이 일치합니다.</p>
                </div>
              )}
            </div>
            <div className="px-8 pb-8 flex-shrink-0 flex gap-3">
              <button
                onClick={handleAuditClose}
                className="flex-1 py-3 bg-white text-slate-600 text-sm font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? '적용 중...' : mismatchItems.length > 0 ? `불일치 ${mismatchItems.length}건 적용` : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {toast && (
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
        {toast.message}
      </div>
    )}
    </>
  );
};

export default InventoryAudit;
