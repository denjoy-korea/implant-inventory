import React from 'react';
import { ContactInquiry, InquiryStatus, WAITLIST_PLAN_LABELS } from '../../../services/contactService';

interface SystemAdminWaitlistTabProps {
  waitlist: ContactInquiry[];
  waitlistLoading: boolean;
  waitlistFilter: string;
  waitlistStatusUpdating: string | null;
  onChangeFilter: (value: string) => void;
  onRefresh: () => void;
  onChangeStatus: (id: string, status: InquiryStatus) => void;
}

const PLAN_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'basic', label: 'Basic' },
  { value: 'plus', label: 'Plus' },
  { value: 'business', label: 'Business' },
  { value: 'ultimate', label: 'Ultimate' },
];

const WAITLIST_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '대기 중',
  in_progress: '연락 완료',
  resolved: '가입 완료',
};

const WAITLIST_STATUS_COLORS: Record<InquiryStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

const SystemAdminWaitlistTab: React.FC<SystemAdminWaitlistTabProps> = ({
  waitlist,
  waitlistLoading,
  waitlistFilter,
  waitlistStatusUpdating,
  onChangeFilter,
  onRefresh,
  onChangeStatus,
}) => {
  const filteredWaitlist = waitlistFilter
    ? waitlist.filter((item) => item.inquiry_type === `plan_waitlist_${waitlistFilter}`)
    : waitlist;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">대기자 관리</h2>
          <p className="text-sm text-slate-500 mt-0.5">플랜 대기 신청자를 관리합니다. 총 {waitlist.length}명</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          새로고침
        </button>
      </div>

      {waitlistLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {(['basic', 'plus', 'business', 'ultimate'] as const).map((plan) => {
              const count = waitlist.filter((item) => item.inquiry_type === `plan_waitlist_${plan}` && item.status === 'pending').length;
              return (
                <button
                  key={plan}
                  onClick={() => onChangeFilter(waitlistFilter === plan ? '' : plan)}
                  className={`rounded-xl p-4 text-left border-2 transition-all ${waitlistFilter === plan ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                >
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{WAITLIST_PLAN_LABELS[`plan_waitlist_${plan}`]}</p>
                  <p className="text-2xl font-black text-slate-800">{count}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">대기 중</p>
                </button>
              );
            })}
          </div>

          <div className="flex gap-1.5 flex-wrap mb-4">
            {PLAN_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onChangeFilter(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${waitlistFilter === option.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {option.label}
                {option.value && (
                  <span className="ml-1 text-[10px] opacity-70">
                    {waitlist.filter((item) => item.inquiry_type === `plan_waitlist_${option.value}`).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">접수일시</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">플랜</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">이메일</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWaitlist.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                        {WAITLIST_PLAN_LABELS[item.inquiry_type] ?? item.inquiry_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{item.contact_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${WAITLIST_STATUS_COLORS[item.status]}`}>
                        {WAITLIST_STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={waitlistStatusUpdating === item.id}
                        value={item.status}
                        onChange={(event) => onChangeStatus(item.id, event.target.value as InquiryStatus)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 disabled:opacity-50 focus:outline-none focus:border-indigo-400"
                      >
                        <option value="pending">대기 중</option>
                        <option value="in_progress">연락 완료</option>
                        <option value="resolved">가입 완료</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredWaitlist.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                      {waitlistFilter ? `${PLAN_FILTER_OPTIONS.find((option) => option.value === waitlistFilter)?.label} 플랜 대기자가 없습니다.` : '대기자 신청이 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemAdminWaitlistTab;
