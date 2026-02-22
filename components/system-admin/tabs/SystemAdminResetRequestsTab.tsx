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
}

const SystemAdminResetRequestsTab: React.FC<SystemAdminResetRequestsTabProps> = ({
  resetRequests,
  hospitals,
  profiles,
  resetActionLoading,
  onApproveImmediate,
  onApproveScheduled,
  onReject,
}) => {
  return (
    <div className="space-y-4">
      {resetRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">초기화 요청이 없습니다.</div>
      ) : resetRequests.map((request) => {
        const hospital = hospitals.find((h) => h.id === request.hospital_id);
        const requester = profiles.find((p) => p.id === request.requested_by);
        const hospitalName = hospital?.name || '알 수 없는 병원';
        const isPending = request.status === 'pending';
        const isScheduled = request.status === 'scheduled';
        const isCompleted = request.status === 'completed';
        const isCancelled = request.status === 'cancelled';
        const statusColors = isPending ? 'bg-amber-50 text-amber-700 border-amber-100'
          : isScheduled ? 'bg-blue-50 text-blue-700 border-blue-100'
            : isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : isCancelled ? 'bg-slate-50 text-slate-500 border-slate-200'
                : 'bg-rose-50 text-rose-700 border-rose-100';
        const statusLabel = isPending ? '승인 대기'
          : isScheduled ? '초기화 예약'
            : isCompleted ? '완료'
              : isCancelled ? '취소됨'
                : '거절';

        return (
          <div key={request.id} className={`bg-white rounded-2xl border shadow-sm p-6 ${isPending ? 'border-amber-200' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-base font-bold text-slate-800">{hospitalName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors}`}>{statusLabel}</span>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>신청자: <span className="font-semibold text-slate-700">{requester?.name || '-'}</span> ({requester?.email || '-'})</p>
                  <p>사유: <span className="text-slate-700">{request.reason || '-'}</span></p>
                  <p>신청일: {new Date(request.created_at).toLocaleString('ko-KR')}</p>
                  {isScheduled && request.scheduled_at && (
                    <p className="text-blue-600 font-semibold">예정일: {new Date(request.scheduled_at).toLocaleString('ko-KR')}</p>
                  )}
                  {isCompleted && request.completed_at && (
                    <p className="text-emerald-600">완료일: {new Date(request.completed_at).toLocaleString('ko-KR')}</p>
                  )}
                </div>
              </div>
              {isPending && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onApproveImmediate(request, hospitalName)}
                    disabled={resetActionLoading === request.id}
                    className="px-3 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                  >
                    {resetActionLoading === request.id ? '...' : '즉시 초기화'}
                  </button>
                  <button
                    onClick={() => onApproveScheduled(request, hospitalName)}
                    disabled={resetActionLoading === request.id}
                    className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    7일 후 초기화
                  </button>
                  <button
                    onClick={() => onReject(request)}
                    disabled={resetActionLoading === request.id}
                    className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    거절
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SystemAdminResetRequestsTab;
