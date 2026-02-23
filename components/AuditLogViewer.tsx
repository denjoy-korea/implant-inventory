import React, { useState, useEffect, useCallback } from 'react';
import { operationLogService, OperationLog, OperationAction, AccessLog } from '../services/operationLogService';

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
  account_self_deleted: { label: '자발적 탈퇴', color: 'text-rose-700', bg: 'bg-rose-100' },
  account_force_deleted: { label: '강제 삭제', color: 'text-red-700', bg: 'bg-red-100' },
  account_deactivated: { label: '계정 비활성화', color: 'text-gray-700', bg: 'bg-gray-100' },
};

const PAGE_SIZE = 50;

const COUNTRY_FLAG: Record<string, string> = {
  KR: '🇰🇷', US: '🇺🇸', CN: '🇨🇳', JP: '🇯🇵', RU: '🇷🇺',
  DE: '🇩🇪', GB: '🇬🇧', FR: '🇫🇷', SG: '🇸🇬', AU: '🇦🇺',
};

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ hospitalId }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'access'>('audit');

  // 감사 로그
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState<OperationAction | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 접속 IP 로그
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [accessTotal, setAccessTotal] = useState(0);
  const [accessPage, setAccessPage] = useState(0);
  const [accessFilterBlocked, setAccessFilterBlocked] = useState<'all' | 'allowed' | 'blocked'>('all');
  const [accessStartDate, setAccessStartDate] = useState('');
  const [accessEndDate, setAccessEndDate] = useState('');
  const [isAccessLoading, setIsAccessLoading] = useState(false);

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

  const fetchAccessLogs = useCallback(async () => {
    setIsAccessLoading(true);
    try {
      const result = await operationLogService.getAccessLogs({
        blocked: accessFilterBlocked === 'all' ? undefined : accessFilterBlocked === 'blocked',
        startDate: accessStartDate ? new Date(accessStartDate).toISOString() : undefined,
        endDate: accessEndDate ? new Date(accessEndDate + 'T23:59:59').toISOString() : undefined,
        limit: PAGE_SIZE,
        offset: accessPage * PAGE_SIZE,
      });
      setAccessLogs(result.data);
      setAccessTotal(result.total);
    } finally {
      setIsAccessLoading(false);
    }
  }, [accessFilterBlocked, accessStartDate, accessEndDate, accessPage]);

  useEffect(() => {
    if (activeTab === 'access') fetchAccessLogs();
  }, [activeTab, fetchAccessLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const accessTotalPages = Math.ceil(accessTotal / PAGE_SIZE);

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

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          작업 이력
        </button>
        <button
          onClick={() => setActiveTab('access')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'access' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          접속 IP 로그
          {accessTotal > 0 && activeTab !== 'access' && (
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{accessTotal}</span>
          )}
        </button>
      </div>

      {/* ── 접속 IP 로그 탭 ── */}
      {activeTab === 'access' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <select
              value={accessFilterBlocked}
              onChange={e => { setAccessFilterBlocked(e.target.value as 'all' | 'allowed' | 'blocked'); setAccessPage(0); }}
              className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
            >
              <option value="all">전체</option>
              <option value="allowed">정상 접속</option>
              <option value="blocked">차단 (해외)</option>
            </select>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <input type="date" value={accessStartDate} onChange={e => { setAccessStartDate(e.target.value); setAccessPage(0); }}
                className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400" />
              <span className="text-xs text-slate-400">~</span>
              <input type="date" value={accessEndDate} onChange={e => { setAccessEndDate(e.target.value); setAccessPage(0); }}
                className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400" />
            </div>
            {(accessFilterBlocked !== 'all' || accessStartDate || accessEndDate) && (
              <button onClick={() => { setAccessFilterBlocked('all'); setAccessStartDate(''); setAccessEndDate(''); setAccessPage(0); }}
                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                필터 초기화
              </button>
            )}
            <span className="text-xs text-slate-400 sm:ml-auto">총 {accessTotal}건</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Mobile */}
            <div className="md:hidden p-3 space-y-2.5">
              {isAccessLoading ? (
                <div className="py-10 text-center"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div>
              ) : accessLogs.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400 italic">접속 기록이 없습니다.</div>
              ) : accessLogs.map(log => (
                <article key={log.id} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{formatDate(log.created_at)}</span>
                    {log.blocked
                      ? <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-100 text-rose-700">차단</span>
                      : <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-700">정상</span>
                    }
                  </div>
                  <p className="text-xs font-bold text-slate-700 font-mono">{log.ip}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {COUNTRY_FLAG[log.country ?? ''] ?? '🌐'} {log.country ?? '-'} {log.city ? `· ${log.city}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{log.path ?? '/'}</p>
                </article>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[160px]">시간</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[140px]">IP</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[130px]">위치</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">경로</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[80px]">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isAccessLoading ? (
                    <tr><td colSpan={5} className="px-5 py-16 text-center"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></td></tr>
                  ) : accessLogs.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400 italic">접속 기록이 없습니다.</td></tr>
                  ) : accessLogs.map(log => (
                    <tr key={log.id} className={`hover:bg-slate-50/40 transition-colors ${log.blocked ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-5 py-3.5 text-[11px] font-medium text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
                        {log.ip}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        <span className="mr-1">{COUNTRY_FLAG[log.country ?? ''] ?? '🌐'}</span>
                        {log.country ?? '-'}
                        {log.city && <span className="text-slate-400"> · {log.city}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 truncate max-w-[300px]">
                        {log.path ?? '/'}
                      </td>
                      <td className="px-5 py-3.5">
                        {log.blocked
                          ? <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-100 text-rose-700">차단</span>
                          : <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-700">정상</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {accessTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setAccessPage(p => Math.max(0, p - 1))} disabled={accessPage === 0}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">이전</button>
              <span className="text-xs font-bold text-slate-500 tabular-nums">{accessPage + 1} / {accessTotalPages}</span>
              <button onClick={() => setAccessPage(p => Math.min(accessTotalPages - 1, p + 1))} disabled={accessPage >= accessTotalPages - 1}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">다음</button>
            </div>
          )}
        </div>
      )}

      {/* ── 감사 로그 탭 ── */}
      {activeTab === 'audit' && <>

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
      </>}
    </div>
  );
};

export default AuditLogViewer;
