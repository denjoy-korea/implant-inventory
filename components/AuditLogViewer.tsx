import React, { useState, useEffect, useCallback } from 'react';
import { operationLogService, OperationLog, OperationAction } from '../services/operationLogService';

interface AuditLogViewerProps {
  hospitalId: string;
}

const ACTION_LABELS: Record<OperationAction, { label: string; color: string; bg: string }> = {
  raw_data_upload: { label: '데이터 업로드', color: 'text-blue-700', bg: 'bg-blue-100' },
  data_processing: { label: '마스터 반영', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  base_stock_edit: { label: '기초재고 수정', color: 'text-violet-700', bg: 'bg-violet-100' },
  manual_item_add: { label: '품목 추가', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  inventory_audit: { label: '재고 실사', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  order_create: { label: '주문 생성', color: 'text-amber-700', bg: 'bg-amber-100' },
  order_status_update: { label: '주문 상태변경', color: 'text-orange-700', bg: 'bg-orange-100' },
  order_delete: { label: '주문 삭제', color: 'text-rose-700', bg: 'bg-rose-100' },
  item_delete: { label: '품목 삭제', color: 'text-rose-700', bg: 'bg-rose-100' },
  member_approve: { label: '멤버 승인', color: 'text-green-700', bg: 'bg-green-100' },
  member_reject: { label: '멤버 거절', color: 'text-red-700', bg: 'bg-red-100' },
  member_invite: { label: '멤버 초대', color: 'text-teal-700', bg: 'bg-teal-100' },
  member_kick: { label: '멤버 방출', color: 'text-pink-700', bg: 'bg-pink-100' },
  surgery_upload: { label: '수술기록 업로드', color: 'text-purple-700', bg: 'bg-purple-100' },
  member_permission_update: { label: '권한 수정', color: 'text-indigo-700', bg: 'bg-indigo-100' },
};

const PAGE_SIZE = 50;

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ hospitalId }) => {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState<OperationAction | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    try {
      const result = await operationLogService.getOperationLogs(hospitalId, {
        action: filterAction || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setLogs(result.data);
      setTotal(result.total);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, filterAction, startDate, endDate, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">감사 로그</h2>
        <p className="text-sm text-slate-500 font-medium italic mt-1">모든 주요 작업의 이력을 확인할 수 있습니다.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value as OperationAction | ''); setPage(0); }}
          className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 cursor-pointer"
        >
          <option value="">전체 작업</option>
          {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
          />
          <span className="text-xs text-slate-400">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
          />
        </div>
        {(filterAction || startDate || endDate) && (
          <button
            onClick={() => { setFilterAction(''); setStartDate(''); setEndDate(''); setPage(0); }}
            className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            필터 초기화
          </button>
        )}
        <span className="text-xs text-slate-400 sm:ml-auto">총 {total}건</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="md:hidden p-3 space-y-2.5">
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400 italic">
              {filterAction || startDate || endDate ? '필터 조건에 맞는 로그가 없습니다.' : '감사 로그가 없습니다.'}
            </div>
          ) : (
            logs.map(log => {
              const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'text-slate-700', bg: 'bg-slate-100' };
              return (
                <article key={`mobile-log-${log.id}`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{formatDate(log.createdAt)}</span>
                    <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-lg ${actionInfo.bg} ${actionInfo.color}`}>
                      {actionInfo.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {(log.userName || log.userEmail || '?').charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {log.userName || log.userEmail}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 break-words">{log.description}</p>
                </article>
              );
            })
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[160px]">시간</th>
                <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[120px]">사용자</th>
                <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[130px]">작업</th>
                <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-sm text-slate-400 italic">
                    {filterAction || startDate || endDate ? '필터 조건에 맞는 로그가 없습니다.' : '감사 로그가 없습니다.'}
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'text-slate-700', bg: 'bg-slate-100' };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-3.5 text-[11px] font-medium text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {(log.userName || log.userEmail || '?').charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[80px]">
                            {log.userName || log.userEmail}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold rounded-lg ${actionInfo.bg} ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 truncate max-w-[400px]">
                        {log.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            이전
          </button>
          <span className="text-xs font-bold text-slate-500 tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
