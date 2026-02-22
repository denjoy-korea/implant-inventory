import React from 'react';
import { AnalysisLead } from '../../../services/operationLogService';

export interface AnalysisLeadFilter {
  type?: 'report_only' | 'detailed_analysis';
  startDate?: string;
  endDate?: string;
}

interface SystemAdminAnalysisLeadsTabProps {
  filter: AnalysisLeadFilter;
  total: number;
  leads: AnalysisLead[];
  loading: boolean;
  page: number;
  perPage: number;
  deletingLeadId: string | null;
  onChangeFilter: (filter: AnalysisLeadFilter) => void;
  onDeleteLead: (leadId: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const SystemAdminAnalysisLeadsTab: React.FC<SystemAdminAnalysisLeadsTabProps> = ({
  filter,
  total,
  leads,
  loading,
  page,
  perPage,
  deletingLeadId,
  onChangeFilter,
  onDeleteLead,
  onPrevPage,
  onNextPage,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <select
          value={filter.type || ''}
          onChange={(event) => {
            const value = event.target.value as '' | 'report_only' | 'detailed_analysis';
            onChangeFilter({ ...filter, type: value || undefined });
          }}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">전체 유형</option>
          <option value="report_only">리포트만</option>
          <option value="detailed_analysis">상세분석</option>
        </select>
        <input
          type="date"
          value={filter.startDate || ''}
          onChange={(event) => onChangeFilter({ ...filter, startDate: event.target.value || undefined })}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <span className="text-xs text-slate-400">~</span>
        <input
          type="date"
          value={filter.endDate || ''}
          onChange={(event) => onChangeFilter({ ...filter, endDate: event.target.value || undefined })}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <span className="ml-auto text-xs text-slate-500 font-semibold">총 {total}건</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">수집된 리드가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">날짜</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">이메일</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">유형</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">치과명</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">지역</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">연락처</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-600">점수</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-600">등급</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(lead.created_at).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{lead.email}</td>
                    <td className="px-4 py-3">
                      {lead.type === 'detailed_analysis' ? (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold text-[10px]">상세분석</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px]">리포트만</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{lead.hospital_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.region || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.contact || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{lead.score ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[11px] ${lead.grade === 'A' ? 'bg-emerald-100 text-emerald-700' : lead.grade === 'B' ? 'bg-amber-100 text-amber-700' : lead.grade === 'C' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'}`}>{lead.grade || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeleteLead(lead.id)}
                        disabled={deletingLeadId === lead.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-40"
                      >
                        {deletingLeadId === lead.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > perPage && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onPrevPage}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <span className="text-xs text-slate-500">
            {page + 1} / {Math.ceil(total / perPage)}
          </span>
          <button
            onClick={onNextPage}
            disabled={(page + 1) * perPage >= total}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemAdminAnalysisLeadsTab;
