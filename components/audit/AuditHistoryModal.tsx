import React from 'react';
import { AuditHistoryItem } from '../../services/auditService';
import ModalShell from '../shared/ModalShell';

interface GroupedHistoryEntry {
  date: string;
  createdAt: string;
  performedBy: string | null;
  items: AuditHistoryItem[];
}

interface AuditHistoryModalProps {
  show: boolean;
  groupedHistory: [string, GroupedHistoryEntry][];
  expandedAuditKeys: Set<string>;
  onClose: () => void;
  onToggleExpand: (key: string) => void;
}

const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  show,
  groupedHistory,
  expandedAuditKeys,
  onClose,
  onToggleExpand,
}) => {
  return (
    <ModalShell
      isOpen={show}
      onClose={onClose}
      title="실사 이력 조회"
      titleId="audit-history-title"
      describedBy="audit-history-desc"
      maxWidth="max-w-3xl"
      className="max-h-[88vh] flex flex-col"
    >
      {/* 헤더 */}
      <div className="px-5 sm:px-7 pt-6 pb-4 flex items-start justify-between flex-shrink-0 border-b border-slate-100">
        <div>
          <h3 id="audit-history-title" className="text-xl font-bold text-slate-900">실사 이력 조회</h3>
          <p id="audit-history-desc" className="text-sm text-slate-400 mt-0.5 tabular-nums">{groupedHistory.length}회의 실사 이력</p>
        </div>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="p-2 border-2 border-slate-200 hover:border-slate-400 rounded-full transition-colors text-slate-400 hover:text-slate-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {groupedHistory.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-400">실사 이력이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="sm:hidden divide-y divide-slate-100">
              {groupedHistory.map(([key, group]) => {
                const isExpanded = expandedAuditKeys.has(key);
                const mismatchOnly = group.items.filter(h => h.difference !== 0);
                const isAllMatch = mismatchOnly.length === 0;
                const totalDiff = group.items.reduce((s, h) => s + h.difference, 0);
                const localTime = new Date(group.createdAt);
                const timeStr = localTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                const dateStr = localTime.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');

                return (
                  <div key={key} className="px-5 py-4">
                    {/* 날짜 + 상태 */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[15px] font-bold text-slate-800 tabular-nums whitespace-nowrap">{dateStr}</span>
                        <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">{timeStr}</span>
                      </div>
                      {isAllMatch ? (
                        <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full whitespace-nowrap">전 품목 일치</span>
                      ) : (
                        <span className="shrink-0 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full whitespace-nowrap">불일치 {mismatchOnly.length}건</span>
                      )}
                    </div>

                    {/* 수치 + 담당자 */}
                    <div className="mt-2 flex items-center justify-between">
                      {isAllMatch ? (
                        <span className="text-xs text-slate-400">오차 없음</span>
                      ) : (
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>시스템 <span className="font-semibold text-slate-700 tabular-nums">{mismatchOnly.reduce((s, h) => s + h.systemStock, 0)}</span></span>
                          <span className="text-slate-300">→</span>
                          <span>실제 <span className="font-semibold text-slate-700 tabular-nums">{mismatchOnly.reduce((s, h) => s + h.actualStock, 0)}</span></span>
                          <span className={`font-bold tabular-nums ${totalDiff < 0 ? 'text-rose-500' : totalDiff > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                            {totalDiff > 0 ? '+' : ''}{totalDiff}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-slate-400 whitespace-nowrap">{group.performedBy || '-'}</span>
                    </div>

                    {/* 상세 보기 버튼 */}
                    {!isAllMatch && (
                      <button
                        onClick={() => onToggleExpand(key)}
                        className="mt-3 w-full py-2 text-xs font-semibold text-indigo-500 bg-indigo-50 rounded-xl active:bg-indigo-100 transition-colors"
                      >
                        {isExpanded ? '접기 ▲' : '상세 보기 ▼'}
                      </button>
                    )}

                    {/* 상세 확장 */}
                    {isExpanded && !isAllMatch && (
                      <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">브랜드</th>
                              <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">규격</th>
                              <th className="px-2 py-2 text-[10px] font-bold text-slate-400 text-center whitespace-nowrap">시스템</th>
                              <th className="px-2 py-2 text-[10px] font-bold text-slate-400 text-center whitespace-nowrap">실제</th>
                              <th className="px-2 py-2 text-[10px] font-bold text-slate-400 text-center whitespace-nowrap">오차</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {mismatchOnly.map(h => (
                              <tr key={h.id}>
                                <td className="px-3 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap">{h.brand}</td>
                                <td className="px-3 py-2 text-xs text-slate-500">{h.size}</td>
                                <td className="px-2 py-2 text-xs text-slate-500 text-center tabular-nums">{h.systemStock}</td>
                                <td className="px-2 py-2 text-xs font-bold text-slate-900 text-center tabular-nums">{h.actualStock}</td>
                                <td className="px-2 py-2 text-center">
                                  <span className={`text-xs font-bold tabular-nums ${h.difference < 0 ? 'text-rose-500' : h.difference > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                                    {h.difference > 0 ? '+' : ''}{h.difference}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {mismatchOnly.some(h => h.reason) && (
                          <div className="px-3 py-2 border-t border-slate-100 space-y-1">
                            {mismatchOnly.filter(h => h.reason).map(h => (
                              <div key={h.id} className="flex gap-2 text-xs text-slate-400">
                                <span className="font-semibold text-slate-600 shrink-0">{h.brand}</span>
                                <span>{h.reason}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 데스크톱: 테이블 */}
            <table className="hidden sm:table w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                <tr>
                  <th className="px-7 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">실사일</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">시스템</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">실제</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">오차</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">담당자</th>
                  <th className="px-7 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedHistory.map(([key, group]) => {
                  const isExpanded = expandedAuditKeys.has(key);
                  const mismatchOnly = group.items.filter(h => h.difference !== 0);
                  const isAllMatch = mismatchOnly.length === 0;
                  const totalDiff = group.items.reduce((s, h) => s + h.difference, 0);
                  const localTime = new Date(group.createdAt);
                  const timeStr = localTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                  const dateStr = localTime.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
                  return (
                    <React.Fragment key={key}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-7 py-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{dateStr}</span>
                          <span className="text-xs text-slate-400 ml-2">{timeStr}</span>
                        </td>
                        {isAllMatch ? (
                          <>
                            <td colSpan={2} className="px-4 py-4 text-center">
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full whitespace-nowrap">전 품목 일치</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-sm font-bold text-slate-300">0</span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 text-center font-semibold text-slate-600 tabular-nums">{mismatchOnly.reduce((s, h) => s + h.systemStock, 0)}</td>
                            <td className="px-4 py-4 text-center font-bold text-slate-900 tabular-nums">{mismatchOnly.reduce((s, h) => s + h.actualStock, 0)}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`text-sm font-bold tabular-nums ${totalDiff < 0 ? 'text-rose-500' : totalDiff > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                                {totalDiff > 0 ? '+' : ''}{totalDiff}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-4 text-center text-sm text-slate-500 whitespace-nowrap">{group.performedBy || '-'}</td>
                        <td className="px-7 py-4 text-center">
                          {isAllMatch ? (
                            <span className="text-slate-300 text-sm">-</span>
                          ) : (
                            <button
                              onClick={() => onToggleExpand(key)}
                              className="text-sm font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                            >
                              {isExpanded ? '접기' : '보기'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && !isAllMatch && (
                        <tr>
                          <td colSpan={6} className="px-7 pb-4 pt-0 bg-slate-50/60">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">브랜드</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">규격</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center whitespace-nowrap">시스템</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center whitespace-nowrap">실제</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center whitespace-nowrap">오차</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">사유</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {mismatchOnly.map(h => (
                                  <tr key={h.id}>
                                    <td className="py-2.5 pr-4 text-sm font-semibold text-slate-700">{h.brand}</td>
                                    <td className="py-2.5 pr-4 text-sm text-slate-500">{h.size}</td>
                                    <td className="py-2.5 text-sm text-slate-500 text-center tabular-nums">{h.systemStock}</td>
                                    <td className="py-2.5 text-sm font-bold text-slate-900 text-center tabular-nums">{h.actualStock}</td>
                                    <td className="py-2.5 text-center">
                                      <span className={`text-sm font-bold tabular-nums ${h.difference < 0 ? 'text-rose-500' : h.difference > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                                        {h.difference > 0 ? '+' : ''}{h.difference}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-sm text-slate-400">{h.reason || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </ModalShell>
  );
};

export default AuditHistoryModal;
