import React from 'react';
import { ContactInquiry, InquiryStatus, PLAN_CHANGE_LABELS, STATUS_COLORS, STATUS_LABELS } from '../../../services/contactService';

interface SystemAdminPlanChangeTabProps {
  requests: ContactInquiry[];
  loading: boolean;
  selected: ContactInquiry | null;
  statusUpdating: string | null;
  onSelect: (item: ContactInquiry) => void;
  onUpdateStatus: (item: ContactInquiry, status: InquiryStatus) => void;
  onDelete: (item: ContactInquiry) => void;
  onRefresh: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  basic:    'Basic',
  plus:     'Plus',
  business: 'Business',
  ultimate: 'Ultimate',
};

const PLAN_COLORS: Record<string, string> = {
  basic:    'bg-blue-100 text-blue-700',
  plus:     'bg-indigo-100 text-indigo-700',
  business: 'bg-emerald-100 text-emerald-700',
  ultimate: 'bg-violet-100 text-violet-700',
};

function parsePlanChangeType(inquiryType: string): { targetPlan: string; label: string } {
  const match = inquiryType.match(/^plan_change_(.+)$/);
  const targetPlan = match?.[1] ?? '';
  return { targetPlan, label: PLAN_LABELS[targetPlan] ?? targetPlan };
}

/** 상세 내용에서 현재 플랜·신청 플랜·주기 파싱 */
function parseContent(content: string): { currentPlan?: string; requestedPlan?: string; cycle?: string } {
  const currentMatch = content.match(/현재 플랜:\s*(.+?)(?:\n|$)/);
  const requestedMatch = content.match(/신청 플랜:\s*(.+?)(?:\n|$)/);
  return {
    currentPlan: currentMatch?.[1]?.trim(),
    requestedPlan: requestedMatch?.[1]?.trim(),
  };
}

const SystemAdminPlanChangeTab: React.FC<SystemAdminPlanChangeTabProps> = ({
  requests,
  loading,
  selected,
  statusUpdating,
  onSelect,
  onUpdateStatus,
  onDelete,
  onRefresh,
}) => {
  const pending   = requests.filter(r => r.status === 'pending').length;
  const inProgress = requests.filter(r => r.status === 'in_progress').length;
  const resolved  = requests.filter(r => r.status === 'resolved').length;

  return (
    <div>
      {/* 요약 카드 */}
      {!loading && requests.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {[
            { label: '전체', value: `${requests.length}건`, highlight: false },
            { label: '접수', value: `${pending}건`, highlight: pending > 0 },
            { label: '처리중', value: `${inProgress}건`, highlight: false },
            { label: '완료', value: `${resolved}건`, highlight: false },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 flex-1 min-w-[80px] ${s.highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{s.label}</p>
              <p className={`text-lg font-black ${s.highlight ? 'text-amber-700' : 'text-slate-800'}`}>{s.value}</p>
            </div>
          ))}
          <button
            onClick={onRefresh}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
            title="새로고침"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">불러오는 중...</div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">플랜 변경 신청이 없습니다</div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-16rem)]">
          {/* 목록 */}
          <div className="w-72 flex-shrink-0 overflow-y-auto space-y-2 pr-1">
            {requests.map(item => {
              const { targetPlan, label } = parsePlanChangeType(item.inquiry_type);
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${selected?.id === item.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800 truncate">{item.hospital_name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${PLAN_COLORS[targetPlan] ?? 'bg-slate-100 text-slate-600'}`}>
                      → {label}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.contact_name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString('ko-KR')}</p>
                </button>
              );
            })}
          </div>

          {/* 상세 패널 */}
          {selected ? (
            <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selected.hospital_name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(selected.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['pending', 'in_progress', 'resolved'] as InquiryStatus[]).map(status => (
                    <button
                      key={status}
                      disabled={statusUpdating === selected.id}
                      onClick={() => onUpdateStatus(selected, status)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${selected.status === status ? `${STATUS_COLORS[status]} ring-1 ring-current` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 플랜 변경 정보 하이라이트 */}
              {(() => {
                const { currentPlan, requestedPlan } = parseContent(selected.content);
                const { targetPlan, label } = parsePlanChangeType(selected.inquiry_type);
                return (
                  <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div className="flex-1 text-center">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">현재 플랜</p>
                      <p className="text-sm font-black text-slate-700">{currentPlan ?? '-'}</p>
                    </div>
                    <div className="text-indigo-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">신청 플랜</p>
                      <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${PLAN_COLORS[targetPlan] ?? 'bg-slate-100 text-slate-700'}`}>
                        {requestedPlan ?? label}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 신청자 정보 */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: '담당자', value: selected.contact_name },
                  { label: '이메일', value: selected.email },
                  { label: '연락처', value: selected.phone },
                  { label: '소속 병원', value: selected.hospital_name },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* 상세 내용 */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-bold text-slate-400 mb-2">신청 내용</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => onDelete(selected)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
              목록에서 신청을 선택하세요
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemAdminPlanChangeTab;
