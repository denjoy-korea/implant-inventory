import React from 'react';
import { AuditHistoryItem } from '../../services/auditService';

interface GroupedHistoryEntry {
  date: string;
  createdAt: string;
  performedBy: string | null;
  items: AuditHistoryItem[];
}

interface AuditHistoryModalProps {
  show: boolean;
  modalRef: React.RefObject<HTMLDivElement | null>;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  groupedHistory: [string, GroupedHistoryEntry][];
  expandedAuditKeys: Set<string>;
  onClose: () => void;
  onToggleExpand: (key: string) => void;
}

const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  show,
  modalRef,
  closeButtonRef,
  groupedHistory,
  expandedAuditKeys,
  onClose,
  onToggleExpand,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-history-title"
        aria-describedby="audit-history-desc"
      >
        {/* 헤더 */}
        <div className="px-7 pt-6 pb-5 flex items-start justify-between flex-shrink-0 border-b border-slate-100">
          <div>
            <h3 id="audit-history-title" className="text-xl font-bold text-slate-900">실사 이력 조회</h3>
            <p id="audit-history-desc" className="text-sm text-slate-400 mt-0.5 tabular-nums">{groupedHistory.length}회의 실사 이력</p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="닫기"
            className="p-2 border-2 border-slate-200 hover:border-slate-400 rounded-full transition-colors text-slate-400 hover:text-slate-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-y-auto">
          {groupedHistory.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                <tr>
                  <th className="px-7 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">실사일</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">시스템</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">실제</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">오차</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">담당자</th>
                  <th className="px-7 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">상세</th>
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
                        <td className="px-7 py-4">
                          <span className="font-semibold text-slate-800">{dateStr}</span>
                          <span className="text-xs text-slate-400 ml-2">{timeStr}</span>
                        </td>
                        {isAllMatch ? (
                          <>
                            <td colSpan={2} className="px-4 py-4 text-center">
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">전 품목 일치</span>
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
                        <td className="px-4 py-4 text-center text-sm text-slate-500">{group.performedBy || '-'}</td>
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

                      {/* 상세 확장 행 */}
                      {isExpanded && !isAllMatch && (
                        <tr>
                          <td colSpan={6} className="px-7 pb-4 pt-0 bg-slate-50/60">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">브랜드</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">규격</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center">시스템</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center">실제</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide text-center">오차</th>
                                  <th className="py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">사유</th>
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
          ) : (
            <div className="py-20 text-center">
              <p className="text-sm text-slate-400">실사 이력이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditHistoryModal;
