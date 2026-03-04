import React, { useState } from 'react';
import { AuditSession } from './utils/auditReportUtils';
import { AuditHistoryItem } from '../../services/auditService';

interface Props {
  sessions: AuditSession[];
}

const AuditSessionTable: React.FC<Props> = ({ sessions }) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [detailShowAll, setDetailShowAll] = useState(false);

  if (sessions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-black text-slate-900 mb-4">실사 이력</p>
        <p className="text-xs text-slate-400">아직 실사 이력이 없습니다. 모바일에서 첫 실사를 시작해보세요.</p>
      </div>
    );
  }

  const handleExpand = (key: string) => {
    if (expandedKey === key) {
      setExpandedKey(null);
    } else {
      setExpandedKey(key);
      setDetailShowAll(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <p className="text-sm font-black text-slate-900">실사 이력</p>
        <p className="text-[11px] font-semibold text-slate-400">총 {sessions.length}회</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">날짜</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">시각</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">담당자</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">실사 품목</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">불일치</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">총 오차</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wide w-16">상세</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(sess => {
              const isExpanded = expandedKey === sess.key;
              const hasMismatch = sess.mismatchCount > 0;
              const mismatchItems = sess.items.filter(r => r.difference !== 0);
              const displayItems: AuditHistoryItem[] = isExpanded
                ? (detailShowAll ? sess.items : mismatchItems.length > 0 ? mismatchItems : sess.items)
                : [];

              return (
                <React.Fragment key={sess.key}>
                  <tr
                    className={`border-b border-slate-50 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-indigo-50/50' : hasMismatch ? 'hover:bg-orange-50/40' : 'hover:bg-slate-50/60'
                    }`}
                    onClick={() => handleExpand(sess.key)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">{sess.date}</td>
                    <td className="px-3 py-3 text-slate-500">{sess.createdAt.substring(11, 16)}</td>
                    <td className="px-3 py-3 text-slate-600 font-medium">{sess.performedBy || '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600">{sess.totalItems}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {hasMismatch
                        ? <span className="font-black text-rose-600">{sess.mismatchCount}</span>
                        : <span className="text-emerald-600 font-bold">0</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-500">
                      {hasMismatch ? `±${sess.totalDiff}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <svg
                        className={`w-4 h-4 mx-auto text-slate-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        viewBox="0 0 16 16" fill="none"
                      >
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </td>
                  </tr>

                  {/* Drill-down rows */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50/80 px-0 py-0">
                        {/* Filter toggle */}
                        {mismatchItems.length > 0 && mismatchItems.length < sess.items.length && (
                          <div className="flex items-center gap-2 px-6 pt-3 pb-2">
                            <button
                              onClick={e => { e.stopPropagation(); setDetailShowAll(false); }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${!detailShowAll ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              불일치 {mismatchItems.length}건
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDetailShowAll(true); }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${detailShowAll ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              전체 {sess.items.length}건
                            </button>
                          </div>
                        )}
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="pl-8 pr-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wide">브랜드</th>
                              <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wide">규격</th>
                              <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase tracking-wide">시스템</th>
                              <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase tracking-wide">실재고</th>
                              <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase tracking-wide">차이</th>
                              <th className="px-4 py-2 text-left font-bold text-slate-400 uppercase tracking-wide">사유</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {displayItems.map(row => {
                              const diff = row.difference;
                              return (
                                <tr key={row.id} className="hover:bg-white/60">
                                  <td className="pl-8 pr-3 py-2">
                                    <p className="font-semibold text-slate-700">{row.brand || row.manufacturer}</p>
                                    <p className="text-[10px] text-slate-400">{row.manufacturer}</p>
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">{(!row.size || row.size === '기타') ? '—' : row.size}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-600 tabular-nums">{row.systemStock}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-600 tabular-nums">{row.actualStock}</td>
                                  <td className={`px-3 py-2 text-right font-black tabular-nums ${diff < 0 ? 'text-rose-500' : diff > 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                                    {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                                  </td>
                                  <td className="px-4 py-2 text-slate-400">{row.reason || ''}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="px-6 py-2 text-[10px] text-slate-400">총 {sess.items.length}품목 실사</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditSessionTable;
