
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types';
import { auditService, AuditEntry, AuditHistoryItem } from '../services/auditService';
import { operationLogService } from '../services/operationLogService';

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

  // 브랜드 목록
  const brandsList = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => { if (item.brand) set.add(item.brand); });
    return Array.from(set).sort();
  }, [visibleInventory]);

  // 초기 브랜드 선택 (첫 번째)
  useEffect(() => {
    if (activeBrand === null && brandsList.length > 0) {
      setActiveBrand(brandsList[0]);
    }
  }, [brandsList]);

  const selectBrand = (b: string) => {
    setActiveBrand(b);
  };

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

  const auditedCount = Object.keys(auditResults).length;
  const auditTotal = filteredInventory.length;
  const mismatchItems = Object.entries(auditResults).filter(([, r]: [string, { matched: boolean; actualCount?: number; reason?: string }]) => !r.matched) as [string, { matched: boolean; actualCount?: number; reason?: string }][];

  const handleAuditComplete = () => {
    setShowAuditSummary(true);
  };

  const handleAuditClose = () => {
    setAuditResults({});
    setShowAuditSummary(false);
  };

  const handleApply = async () => {
    if (mismatchItems.length === 0) {
      handleAuditClose();
      return;
    }

    setIsApplying(true);
    try {
      const entries: AuditEntry[] = mismatchItems
        .map(([id, result]) => {
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
        alert(`실사 적용 실패: ${error}`);
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">재고 실사</h2>
          <p className="text-sm text-slate-500 font-medium italic mt-1">현재 재고 수량과 실물을 대조하여 일치 여부를 확인하세요.</p>
        </div>
      </div>

      {/* 브랜드 필터 */}
      {brandsList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {brandsList.map(b => (
            <button
              key={b}
              onClick={() => selectBrand(b)}
              className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeBrand === b ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      {/* 실사 진행 바 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${auditTotal > 0 ? (auditedCount / auditTotal) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] font-bold text-slate-500">{auditedCount}/{auditTotal}</span>
        </div>
        <button
          onClick={handleAuditComplete}
          disabled={auditedCount === 0}
          className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 ${auditedCount > 0 ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          실사 완료
        </button>
        {auditedCount > 0 && (
          <button
            onClick={handleAuditClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            초기화
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[18%]" />
              <col className="w-[22%]" />
              <col className="w-[10%]" />
              <col className="w-[40%]" />
            </colgroup>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">브랜드</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">규격</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 text-center">현재 재고</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 text-center">실사</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((item) => {
                const result = auditResults[item.id];
                return (
                  <tr key={item.id} className="group transition-colors hover:bg-slate-50/40">
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-400">{item.manufacturer}</td>
                    <td className="px-4 py-4 text-sm font-black text-slate-800 tracking-tight">{item.brand}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">{item.size}</td>
                    <td className="px-4 py-4 text-center text-sm font-black text-slate-900 tabular-nums">{item.currentStock}</td>
                    <td className="px-4 py-3">
                      {!result ? (
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => setAuditResults(prev => ({ ...prev, [item.id]: { matched: true } }))}
                            className="px-3 py-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
                          >
                            일치
                          </button>
                          <button
                            onClick={() => setAuditResults(prev => ({ ...prev, [item.id]: { matched: false, actualCount: item.currentStock, reason: MISMATCH_REASONS[0] } }))}
                            className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                          >
                            불일치
                          </button>
                        </div>
                      ) : result.matched ? (
                        <div className="flex justify-center items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-lg border border-emerald-200">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            일치
                          </span>
                          <button onClick={() => setAuditResults(prev => { const { [item.id]: _, ...rest } = prev; return rest; })} aria-label="실사 취소" className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-1.5">
                          <input
                            type="number"
                            value={result.actualCount ?? 0}
                            onChange={(e) => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: parseInt(e.target.value) || 0 } }))}
                            className="w-14 p-1 text-xs text-center font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg outline-none focus:border-rose-400"
                          />
                          <select
                            value={result.reason || MISMATCH_REASONS[0]}
                            onChange={(e) => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: e.target.value } }))}
                            className="px-1.5 py-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 cursor-pointer"
                          >
                            {MISMATCH_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => setAuditResults(prev => { const { [item.id]: _, ...rest } = prev; return rest; })} aria-label="실사 취소" className="p-1 text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
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
                    {mismatchItems.map(([id, result]) => {
                      const item = inventory.find(i => i.id === id);
                      if (!item) return null;
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
                            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
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
  );
};

export default InventoryAudit;
