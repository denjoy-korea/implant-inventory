import React from 'react';

interface AuditHistoryRow {
  id: string;
  createdAt: string;
  performedBy?: string | null;
  brand?: string | null;
  manufacturer: string;
  size?: string | null;
  systemStock: number;
  actualStock: number;
  difference: number;
  reason?: string | null;
}

interface AuditSessionSummary {
  key: string;
  date: string;
  createdAt: string;
  performedBy?: string | null;
  mismatchCount: number;
}

interface AuditSessionDetailModalProps {
  selectedAuditSessionKey: string | null;
  auditHistory: AuditHistoryRow[];
  recentAuditSessions: AuditSessionSummary[];
  auditDetailShowAll: boolean;
  setAuditDetailShowAll: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
}

const AuditSessionDetailModal: React.FC<AuditSessionDetailModalProps> = ({
  selectedAuditSessionKey,
  auditHistory,
  recentAuditSessions,
  auditDetailShowAll,
  setAuditDetailShowAll,
  onClose,
}) => {
  if (selectedAuditSessionKey === null) return null;

  const sessionItems = auditHistory.filter((row) => {
    const minute = row.createdAt.substring(0, 16);
    const rowKey = `${minute}__${row.performedBy || ''}`;
    return rowKey === selectedAuditSessionKey;
  });
  const session = recentAuditSessions.find((entry) => entry.key === selectedAuditSessionKey);
  const mismatchItems = sessionItems.filter((row) => row.difference !== 0);
  const displayItems = auditDetailShowAll ? sessionItems : mismatchItems.length > 0 ? mismatchItems : sessionItems;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-80px)] md:max-h-[85vh]" onClick={(event) => event.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-bold text-slate-900">재고 실사 상세</h3>
            </div>
            <div className="flex items-center gap-2 mt-1 ml-6">
              <p className="text-xs text-slate-500">
                {session?.date} {session?.createdAt.substring(11, 16)}
              </p>
              {session?.performedBy && (
                <>
                  <span className="text-slate-200">·</span>
                  <p className="text-xs font-semibold text-slate-600">{session.performedBy}</p>
                </>
              )}
              <span className="text-slate-200">·</span>
              {mismatchItems.length > 0 ? (
                <p className="text-xs font-semibold text-orange-500">불일치 {mismatchItems.length}건</p>
              ) : (
                <p className="text-xs font-semibold text-emerald-600">전 품목 일치</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter toggle */}
        {mismatchItems.length > 0 && mismatchItems.length < sessionItems.length && (
          <div className="px-6 py-2 border-b border-slate-50 flex items-center gap-2">
            <button
              onClick={() => setAuditDetailShowAll(false)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${!auditDetailShowAll ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              불일치 {mismatchItems.length}건
            </button>
            <button
              onClick={() => setAuditDetailShowAll(true)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${auditDetailShowAll ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              전체 {sessionItems.length}건
            </button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">제조사 / 브랜드</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">규격</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">시스템</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">실재고</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">차이</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayItems.map((row) => {
                const difference = row.difference;
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{row.brand || row.manufacturer}</p>
                      <p className="text-[10px] text-slate-400">{row.manufacturer}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{!row.size || row.size === '기타' ? '-' : row.size}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-600 tabular-nums">{row.systemStock}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-600 tabular-nums">{row.actualStock}</td>
                    <td className={`px-3 py-2.5 text-right font-black tabular-nums ${difference < 0 ? 'text-rose-500' : difference > 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                      {difference > 0 ? `+${difference}` : difference === 0 ? '—' : difference}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-400">{row.reason || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">총 {sessionItems.length}품목 실사</p>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditSessionDetailModal;
