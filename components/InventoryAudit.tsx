import React from 'react';
import { InventoryItem, PlanType } from '../types';
import AuditReportDashboard from './audit/AuditReportDashboard';
import AuditHistoryModal from './audit/AuditHistoryModal';
import AuditSummaryModal from './audit/AuditSummaryModal';
import AuditPlanGate from './audit/AuditPlanGate';
import AuditMismatchBanner from './audit/AuditMismatchBanner';
import { useInventoryAudit } from '../hooks/useInventoryAudit';
import { planService } from '../services/planService';


interface InventoryAuditProps {
  inventory: InventoryItem[];
  hospitalId: string;
  userName?: string;
  plan?: PlanType;
  onApplied: () => void;
  onAuditSessionComplete?: () => void;
  showHistory?: boolean;
  onCloseHistory?: () => void;
}

const MISMATCH_REASONS = ['기록 누락', '수술기록 오입력', '분실', '입고 수량 오류', '기타'] as const;

const InventoryAudit: React.FC<InventoryAuditProps> = ({ inventory, hospitalId, userName, plan, onApplied, onAuditSessionComplete, showHistory, onCloseHistory }) => {
  const {
    activeBrand, setActiveBrand,
    searchQuery, setSearchQuery,
    activeManufacturer, setActiveManufacturer,
    auditResults, setAuditResults,
    showAuditSummary,
    isApplying,
    isAuditActive, setIsAuditActive,
    customReasonMode, setCustomReasonMode,
    confirmedItems, setConfirmedItems,
    expandedAuditKeys,
    toast,
    isMobileViewport,
    isHistoryLoading,
    groupedHistory,
    visibleInventory,
    manufacturersList,
    brandsList,
    filteredInventory,
    totalItems, totalAudited, totalMatched, totalMismatched, totalMismatchedQty, progressPct,
    mismatchItems,
    brandStats,
    auditedCount,
    pendingAuditItems,
    toggleExpand,
    handleAuditComplete,
    handleAuditClose,
    handleApply,
    getBrandDotColor,
    summaryCloseButtonRef,
    auditHistory,
  } = useInventoryAudit({ inventory, hospitalId, userName, onApplied, onAuditSessionComplete, showHistory, onCloseHistory });

  // PC: 리포트 대시보드 (audit_history 권한 필요), 모바일: 기존 실사 입력 UI
  if (!isMobileViewport) {
    if (!planService.canAccess(plan ?? 'free', 'audit_history')) {
      return <AuditPlanGate />;
    }
    return <AuditReportDashboard auditHistory={auditHistory} isLoading={isHistoryLoading} />;
  }

  return (
    <>
      <div className="space-y-5 animate-in fade-in duration-500 pb-20">

        {/* 모바일 진행률 - 최상단 고정 */}
        <div className="md:hidden bg-white rounded-2xl border border-slate-100 p-3 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>실사 진행률</span>
            <span className="tabular-nums text-slate-700">{totalAudited}/{totalItems} ({progressPct}%)</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${totalMismatched > 0 ? 'bg-rose-500' : 'bg-indigo-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="hidden md:block bg-white/90 backdrop-blur-md border border-white/60 rounded-[28px] overflow-hidden relative [box-shadow:0_4px_12px_-4px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.6)]">
          {/* 장식용 백그라운드 효과 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 opacity-60"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100/50">
            {/* 총 실사 품목 */}
            <div className="px-8 py-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="p-1.5 bg-slate-100/80 rounded-lg text-slate-500 shadow-sm border border-slate-200/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">총 실사 품목</span>
              </div>
              <div className="text-[34px] font-black text-slate-800 tabular-nums leading-none tracking-tight relative z-10">{totalItems}</div>
              <div className="text-[11px] text-slate-400 font-bold mt-1.5 relative z-10">품목</div>
            </div>

            {/* 일치 */}
            <div className="px-8 py-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="p-1.5 bg-emerald-100/80 rounded-lg text-emerald-600 shadow-sm border border-emerald-200/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">일치</span>
              </div>
              <div className="text-[34px] font-black text-emerald-600 tabular-nums leading-none tracking-tight relative z-10 drop-shadow-sm">{totalMatched}</div>
              <div className="text-[11px] text-slate-400 font-bold mt-1.5 relative z-10">
                {totalAudited > 0 ? `${Math.round(totalMatched / totalAudited * 100)}%` : '-'}
              </div>
            </div>

            {/* 불일치 (항목) */}
            <div className="px-8 py-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="p-1.5 bg-rose-100/80 rounded-lg text-rose-500 shadow-sm border border-rose-200/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">불일치 항목</span>
              </div>
              <div className={`text-[34px] font-black tabular-nums leading-none tracking-tight relative z-10 drop-shadow-sm ${totalMismatched > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                {totalMismatched}
              </div>
              <div className="text-[11px] font-bold mt-1.5 relative z-10">
                {totalMismatched > 0
                  ? <span className="text-rose-400">품목</span>
                  : <span className="text-slate-400">-</span>
                }
              </div>
            </div>

            {/* 불일치 (개수) */}
            <div className="px-8 py-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="p-1.5 bg-orange-100/80 rounded-lg text-orange-500 shadow-sm border border-orange-200/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">불일치 개수</span>
              </div>
              <div className={`text-[34px] font-black tabular-nums leading-none tracking-tight relative z-10 drop-shadow-sm ${totalMismatchedQty > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                {totalMismatchedQty}
              </div>
              <div className="text-[11px] font-bold mt-1.5 relative z-10">
                {totalMismatchedQty > 0
                  ? <span className="text-orange-400">개 차이</span>
                  : <span className="text-slate-400">-</span>
                }
              </div>
            </div>
          </div>
        </div>


        {/* 진행률 프로그레스 바 */}
        <div className="hidden md:flex bg-white/80 backdrop-blur-sm border border-white/60 rounded-[20px] px-6 py-4 items-center gap-5 shadow-sm">
          <span className="text-[12px] font-black text-slate-500 whitespace-nowrap tracking-wide">실사 진행률</span>
          <div className="flex-1 h-3 bg-slate-100/80 rounded-full overflow-hidden shadow-inner border border-slate-200/50 relative">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.4)] ${totalMismatched > 0 ? 'bg-gradient-to-r from-rose-400 to-rose-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[13px] font-black text-slate-600 tabular-nums whitespace-nowrap tracking-tight">{totalAudited} / {totalItems}</span>
          <span className={`text-[13px] font-black tabular-nums whitespace-nowrap tracking-tight drop-shadow-sm ${progressPct === 100 ? 'text-emerald-500' : 'text-indigo-500'}`}>{progressPct}%</span>
        </div>


        <AuditMismatchBanner totalMismatched={totalMismatched} mismatchItems={mismatchItems} />

        {/* 검색 + 제조사 필터 (모바일 숨김) */}
        <div className="hidden md:flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="브랜드 / 규격 / 제조사 검색"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          {manufacturersList.length > 1 && (
            <select
              value={activeManufacturer ?? ''}
              onChange={e => { setActiveManufacturer(e.target.value || null); setActiveBrand(null); }}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-300 text-slate-700 font-medium"
            >
              <option value="">전체 제조사</option>
              {manufacturersList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>

        {/* 모바일 전용 실사 버튼 */}
        <div className="md:hidden">
          {!isAuditActive ? (
            <button
              onClick={() => setIsAuditActive(true)}
              className="w-full py-3.5 text-[14px] font-black bg-indigo-600 text-white rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-indigo-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              재고실사진행
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {confirmedItems.length > 0 && (
                <button
                  onClick={() => {
                    const lastId = confirmedItems[confirmedItems.length - 1];
                    setConfirmedItems(prev => prev.slice(0, -1));
                    setAuditResults(prev => { const { [lastId]: _, ...rest } = prev; return rest; });
                    setCustomReasonMode(prev => { const { [lastId]: _, ...rest } = prev; return rest; });
                  }}
                  className="flex-1 py-3 text-sm font-bold text-indigo-500 bg-white border border-indigo-200 rounded-xl active:bg-indigo-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  되돌리기
                </button>
              )}
              <button
                onClick={handleAuditClose}
                className="flex-1 py-3 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-xl active:bg-slate-50 transition-all"
              >
                초기화
              </button>
            </div>
          )}
        </div>

        {/* 브랜드 탭 + 버튼 (데스크톱) */}
        {brandsList.length > 0 && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="hidden md:flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap">
              <button
                onClick={() => setActiveBrand(null)}
                className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${activeBrand === null ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
              >
                전체
                <span className={`text-[10px] font-black ${activeBrand === null ? 'text-slate-300' : 'text-slate-400'}`}>{visibleInventory.length}</span>
              </button>
              {brandsList.map(b => {
                const s = brandStats[b] || { total: 0, audited: 0, mismatch: 0 };
                const isActive = activeBrand === b;
                return (
                  <button
                    key={b}
                    onClick={() => setActiveBrand(b)}
                    className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${isActive ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
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
            {/* 실사 버튼 (데스크톱) */}
            <div className="hidden md:flex items-center gap-2 flex-nowrap">
              {!isAuditActive ? (
                <button
                  onClick={() => setIsAuditActive(true)}
                  className="px-5 py-2.5 text-[13px] font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 min-h-11"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <span>재고실사진행</span>
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
                      className="px-4 py-2 text-xs font-bold text-indigo-500 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-all shadow-sm flex items-center gap-1.5 min-h-11"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      되돌리기
                    </button>
                  )}
                  {auditedCount > 0 && (
                    <button
                      onClick={handleAuditClose}
                      className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm min-h-11"
                    >
                      초기화
                    </button>
                  )}
                  <button
                    onClick={handleAuditComplete}
                    disabled={auditedCount < visibleInventory.length}
                    className={`px-5 py-2 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 min-h-11 ${auditedCount >= visibleInventory.length ? 'bg-slate-800 text-white hover:bg-slate-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
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
        <div className="hidden md:block bg-white/90 backdrop-blur-md rounded-[28px] border border-white/60 overflow-hidden relative [box-shadow:0_4px_12px_-4px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.6)]">
          <div className="hide-scrollbar overflow-y-auto overflow-x-auto max-h-[calc(100vh-260px)] sm:max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-340px)]">
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
              <thead className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 md:sticky md:top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">제조사</th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">브랜드</th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">규격</th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-400 text-center uppercase tracking-widest whitespace-nowrap">현재 재고</th>
                  <th className="px-3 py-4 text-[11px] font-black text-indigo-500 text-center uppercase tracking-widest whitespace-nowrap bg-indigo-50/50">실사결과</th>
                  <th className="px-4 py-4 text-[11px] font-black text-emerald-500 text-center uppercase tracking-widest whitespace-nowrap">일치</th>
                  <th className="px-4 py-4 text-[11px] font-black text-rose-500 text-center uppercase tracking-widest whitespace-nowrap">불일치</th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingAuditItems.map((item, idx) => {
                  const isEven = idx % 2 === 0;
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
                      setAuditResults(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                      setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                    } else {
                      setAuditResults(prev => ({ ...prev, [item.id]: { matched, actualCount: matched ? undefined : item.currentStock, reason: matched ? undefined : MISMATCH_REASONS[0] } }));
                      if (matched) {
                        setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                        confirmItem(item.id);
                      }
                    }
                  };
                  return (
                    <tr key={item.id} className={`group transition-all duration-200 relative ${isEven ? 'bg-slate-50/30' : 'bg-white'} hover:bg-indigo-50/40 hover:shadow-[inset_4px_0_0_0_#4f46e5] ${rowBg}`}>
                      <td className="px-5 py-4 text-[11px] font-bold text-slate-500">{item.manufacturer}</td>
                      <td className="px-5 py-4 text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-900 transition-colors">{item.brand}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600 group-hover:text-indigo-700 transition-colors">{item.size}</td>
                      <td className="px-5 py-4 text-center text-[15px] font-black text-slate-900 tabular-nums tracking-tight">{item.currentStock}</td>
                      {/* 실사결과 */}
                      <td className="px-3 py-3 text-center">
                        {result?.matched === true && (
                          <span className="inline-block px-2.5 py-1 text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg tabular-nums">
                            {item.currentStock}
                          </span>
                        )}
                        {result?.matched === false && (
                          <div className="flex items-center bg-rose-50 border border-rose-300 rounded-lg overflow-hidden">
                            <button
                              onClick={(e) => {
                                const delta = e.shiftKey ? 10 : 1;
                                setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: Math.max(0, (result.actualCount ?? item.currentStock) - delta) } }));
                              }}
                              title="−1 (Shift: −10)"
                              className="px-2 py-1.5 text-rose-500 hover:bg-rose-100 active:bg-rose-200 transition-colors font-bold text-base leading-none flex-shrink-0"
                            >−</button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={result.actualCount ?? item.currentStock}
                              onChange={(e) => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: Math.max(0, parseInt(e.target.value) || 0) } }))}
                              autoFocus
                              className="w-8 py-1 text-sm font-black text-center text-rose-700 bg-rose-50 outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                              onClick={(e) => {
                                const delta = e.shiftKey ? 10 : 1;
                                setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: (result.actualCount ?? item.currentStock) + delta } }));
                              }}
                              title="+1 (Shift: +10)"
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

        <div className="md:hidden space-y-3">
          {/* 실사 진행 중 + 전 품목 완료 */}
          {isAuditActive && pendingAuditItems.length === 0 && (
            <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center shadow-sm space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-700">전 품목 실사 완료!</p>
              <button
                onClick={handleAuditComplete}
                className="w-full min-h-12 rounded-xl bg-slate-800 text-white text-sm font-black active:scale-[0.98] transition-all"
              >
                실사 완료 · 재고 반영
              </button>
            </div>
          )}
          {/* 진행 중 위치 표시 */}
          {isAuditActive && pendingAuditItems.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-400">
                {filteredInventory.length - pendingAuditItems.length + 1} / {filteredInventory.length}
              </span>
              <span className="text-[11px] font-bold text-indigo-500">{pendingAuditItems[0].manufacturer}</span>
            </div>
          )}
          {isAuditActive && pendingAuditItems.slice(0, 1).map((item) => {
              const result = auditResults[item.id];
              const isCustom = customReasonMode[item.id];
              const confirmItem = (id: string) => setConfirmedItems(prev => (prev.includes(id) ? prev : [...prev, id]));

              const clearSelection = () => {
                setAuditResults(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
              };

              const toggleCheck = (matched: boolean) => {
                if (result?.matched === matched) {
                  clearSelection();
                } else {
                  setAuditResults(prev => ({
                    ...prev,
                    [item.id]: {
                      matched,
                      actualCount: matched ? undefined : item.currentStock,
                      reason: matched ? undefined : MISMATCH_REASONS[0],
                    },
                  }));
                  if (matched) {
                    setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                    confirmItem(item.id);
                  }
                }
              };

              return (
                <article key={`audit-mobile-${item.id}`} className="bg-white rounded-2xl border border-slate-100 px-4 pt-4 pb-4 shadow-sm">
                  {/* 제조사 · 브랜드 한 줄 */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">{item.manufacturer}</span>
                    <span className="text-slate-200 shrink-0">·</span>
                    <span className="text-sm font-black text-slate-800 truncate">{item.brand}</span>
                  </div>

                  {/* 사이즈 — 크게 */}
                  <p className="text-[22px] font-black text-slate-700 mt-2 leading-tight tracking-tight">{item.size}</p>

                  {/* 현재 재고 — 크게 */}
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-[11px] font-bold text-slate-400 mb-1 shrink-0">현재 재고</span>
                    <span className="text-5xl font-black text-slate-900 tabular-nums leading-none">{item.currentStock}</span>
                    <span className="text-base font-bold text-slate-400 mb-0.5">개</span>
                  </div>

                  {/* 일치 / 불일치 */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isAuditActive}
                      onClick={() => toggleCheck(true)}
                      className={`h-12 rounded-xl text-sm font-black transition-all ${result?.matched === true
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        } ${!isAuditActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      일치
                    </button>
                    <button
                      type="button"
                      disabled={!isAuditActive}
                      onClick={() => toggleCheck(false)}
                      className={`h-12 rounded-xl text-sm font-black transition-all ${result?.matched === false
                          ? 'bg-rose-500 text-white'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                        } ${!isAuditActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      불일치
                    </button>
                  </div>

                  {/* 불일치 수량 입력 — fixed bottom sheet (스크롤 없이) */}
                  {result?.matched === false && (
                    <>
                      {/* 배경 딤 */}
                      <div
                        className="fixed inset-0 z-[140] bg-slate-900/20"
                        onClick={() => clearSelection()}
                      />
                      {/* Bottom sheet */}
                      <div className="fixed bottom-[72px] left-0 right-0 z-[150] px-3">
                        <div className="bg-white rounded-2xl border border-rose-100 shadow-2xl p-4 space-y-3">
                          {/* 헤더 */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-rose-600">불일치 수량 입력</span>
                            <button
                              type="button"
                              onClick={() => clearSelection()}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* 실사 수량 */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-rose-500">실사 수량</span>
                            <div className="flex items-center rounded-lg border border-rose-200 bg-white overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: Math.max(0, (result.actualCount ?? item.currentStock) - 1) } }))}
                                className="h-9 w-9 text-rose-600 font-black text-base"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={result.actualCount ?? item.currentStock}
                                onChange={(e) => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: Math.max(0, parseInt(e.target.value) || 0) } }))}
                                className="w-14 text-center text-sm font-black text-rose-700 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], actualCount: (result.actualCount ?? item.currentStock) + 1 } }))}
                                className="h-9 w-9 text-rose-600 font-black text-base"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 사유 + 완료 */}
                          {isCustom ? (
                            <>
                              <input
                                type="text"
                                value={result.reason || ''}
                                placeholder="사유 직접 입력"
                                onChange={(e) => setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: e.target.value } }))}
                                className="w-full h-11 rounded-xl border border-indigo-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={!result.reason?.trim()}
                                  onClick={() => {
                                    if (!result.reason?.trim()) return;
                                    setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                                    confirmItem(item.id);
                                  }}
                                  className={`h-11 rounded-xl text-sm font-black ${result.reason?.trim() ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                >
                                  완료
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomReasonMode(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
                                    setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: MISMATCH_REASONS[0] } }));
                                  }}
                                  className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500"
                                >
                                  목록 선택
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
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
                                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                              >
                                {MISMATCH_REASONS.map(reason => (
                                  <option key={`${item.id}-${reason}`} value={reason}>{reason}</option>
                                ))}
                              </select>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => confirmItem(item.id)}
                                  className="h-11 rounded-xl bg-indigo-600 text-white text-sm font-black"
                                >
                                  완료
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomReasonMode(prev => ({ ...prev, [item.id]: true }));
                                    setAuditResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: '' } }));
                                  }}
                                  className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500"
                                >
                                  기타 입력
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </article>
              );
          })}
        </div>

        <AuditHistoryModal
          show={!!showHistory}
          groupedHistory={groupedHistory}
          expandedAuditKeys={expandedAuditKeys}
          onClose={() => onCloseHistory?.()}
          onToggleExpand={toggleExpand}
        />

        <AuditSummaryModal
          show={showAuditSummary}

          summaryCloseButtonRef={summaryCloseButtonRef}
          auditedCount={auditedCount}
          mismatchItems={mismatchItems}
          isApplying={isApplying}
          onClose={handleAuditClose}
          onApply={handleApply}
        />
      </div>

      {toast && (
        <div
          style={isMobileViewport ? { bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' } : undefined}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
};

export default InventoryAudit;
