import React from 'react';
import { DbProfile, DbResetRequest } from '../../../types';
import { DbHospitalRow } from '../systemAdminDomain';

interface SystemAdminResetRequestsTabProps {
  resetRequests: DbResetRequest[];
  hospitals: DbHospitalRow[];
  profiles: DbProfile[];
  resetActionLoading: string | null;
  onApproveImmediate: (request: DbResetRequest, hospitalName: string) => void;
  onApproveScheduled: (request: DbResetRequest, hospitalName: string) => void;
  onReject: (request: DbResetRequest) => void;
  onDelete: (request: DbResetRequest, hospitalName: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:   { label: '승인 대기', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  scheduled: { label: '초기화 예약', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: '완료', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: '취소됨', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  rejected:  { label: '거절', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const fmt = (iso: string) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });

const SystemAdminResetRequestsTab: React.FC<SystemAdminResetRequestsTabProps> = ({
  resetRequests,
  hospitals,
  profiles,
  resetActionLoading,
  onApproveImmediate,
  onApproveScheduled,
  onReject,
  onDelete,
}) => {
  if (resetRequests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
        초기화 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">워크스페이스</th>
              <th className="px-4 py-3">신청자</th>
              <th className="px-4 py-3">사유</th>
              <th className="px-4 py-3">신청일</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resetRequests.map((request) => {
              const hospital = hospitals.find((h) => h.id === request.hospital_id);
              const requester = profiles.find((p) => p.id === request.requested_by);
              const hospitalName = hospital?.name || '알 수 없는 병원';
              const isPending = request.status === 'pending';
              const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.rejected;
              const isLoading = resetActionLoading === request.id;

              return (
                <tr key={request.id} className={`${isPending ? 'bg-amber-50/30' : ''} hover:bg-slate-50 transition-colors`}>
                  {/* 워크스페이스 */}
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {hospitalName}
                  </td>

                  {/* 신청자 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-800">{requester?.name || '-'}</div>
                    <div className="text-xs text-slate-400">{requester?.email || '-'}</div>
                  </td>

                  {/* 사유 */}
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={request.reason || '-'}>
                    {request.reason || '-'}
                  </td>

                  {/* 신청일 */}
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                    <div>{fmt(request.created_at)}</div>
                    {request.status === 'scheduled' && request.scheduled_at && (
                      <div className="text-blue-600 font-semibold mt-0.5">예정: {fmt(request.scheduled_at)}</div>
                    )}
                    {request.status === 'completed' && request.completed_at && (
                      <div className="text-emerald-600 mt-0.5">완료: {fmt(request.completed_at)}</div>
                    )}
                  </td>

                  {/* 상태 */}
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.cls}`}>
                      {status.label}
                    </span>
                  </td>

                  {/* 액션 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {isPending && (
                        <>
                          <button
                            onClick={() => onApproveImmediate(request, hospitalName)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                          >
                            즉시 초기화
                          </button>
                          <button
                            onClick={() => onApproveScheduled(request, hospitalName)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            7일 후
                          </button>
                          <button
                            onClick={() => onReject(request)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                          >
                            거절
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onDelete(request, hospitalName)}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        title="레코드 삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemAdminResetRequestsTab;
