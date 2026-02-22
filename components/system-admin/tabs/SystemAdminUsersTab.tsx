import React from 'react';
import { DbProfile, PLAN_SHORT_NAMES, PlanType } from '../../../types';
import { DbHospitalRow } from '../systemAdminDomain';

interface SystemAdminUsersTabProps {
  profiles: DbProfile[];
  currentUserId: string | null;
  deletingUserId: string | null;
  getHospitalName: (hospitalId: string | null) => string;
  getHospitalPlan: (hospitalId: string | null) => DbHospitalRow | null;
  onOpenUserDetail: (profile: DbProfile) => void;
  onDeleteUser: (profile: DbProfile) => void;
}

const SystemAdminUsersTab: React.FC<SystemAdminUsersTabProps> = ({
  profiles,
  currentUserId,
  deletingUserId,
  getHospitalName,
  getHospitalPlan,
  onOpenUserDetail,
  onDeleteUser,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">이름</th>
            <th className="hidden lg:table-cell px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">이메일</th>
            <th className="hidden xl:table-cell px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">연락처</th>
            <th className="hidden md:table-cell px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">소속 병원</th>
            <th className="hidden md:table-cell px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">플랜</th>
            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">역할</th>
            <th className="hidden sm:table-cell px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">상태</th>
            <th className="hidden xl:table-cell px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">가입일</th>
            <th className="hidden xl:table-cell px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">마지막 접속</th>
            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {profiles.map((profile) => (
            <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-3 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${profile.role === 'admin' ? 'bg-rose-100 text-rose-600' : profile.role === 'master' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                    {profile.name.charAt(0) || '?'}
                  </div>
                  <span className="font-bold text-slate-800 text-xs">{profile.name}</span>
                  <button
                    onClick={() => onOpenUserDetail(profile)}
                    className="ml-1 flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    상세
                  </button>
                </div>
              </td>
              <td className="hidden lg:table-cell px-3 py-3 text-slate-500 whitespace-nowrap">{profile.email}</td>
              <td className="hidden xl:table-cell px-3 py-3 text-slate-500 whitespace-nowrap">{profile.phone || '-'}</td>
              <td className="hidden md:table-cell px-3 py-3 text-slate-600 font-medium whitespace-nowrap">
                {(() => {
                  const name = getHospitalName(profile.hospital_id);
                  if (name === '-' || name.includes('워크스페이스')) return <span className="text-slate-300">-</span>;
                  return name;
                })()}
              </td>
              <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap">
                {(() => {
                  if (profile.role === 'admin') return <span className="text-slate-300">-</span>;
                  const hospitalPlan = getHospitalPlan(profile.hospital_id);
                  if (!hospitalPlan) {
                    return (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200">Free</span>
                    );
                  }
                  const planName = PLAN_SHORT_NAMES[hospitalPlan.plan as PlanType] || hospitalPlan.plan;
                  return (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${hospitalPlan.plan === 'free' ? 'bg-slate-50 text-slate-600 border-slate-200' : hospitalPlan.plan === 'ultimate' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                      {planName}
                    </span>
                  );
                })()}
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                {(() => {
                  if (profile.role === 'admin') {
                    return (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-100">운영자</span>
                    );
                  }
                  if (profile.role === 'master') {
                    return (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-100">원장</span>
                    );
                  }
                  if (profile.hospital_id) {
                    return (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">스태프</span>
                    );
                  }
                  return (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-teal-50 text-teal-700 border-teal-100">개인</span>
                  );
                })()}
              </td>
              <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${profile.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                  <span className={`w-1 h-1 rounded-full ${profile.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {profile.status === 'active' ? '활성' : '대기'}
                </span>
              </td>
              <td className="hidden xl:table-cell px-3 py-3 text-slate-400 whitespace-nowrap tabular-nums">
                {new Date(profile.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' })}
              </td>
              <td className="hidden xl:table-cell px-3 py-3 text-slate-400 whitespace-nowrap tabular-nums">
                {profile.last_sign_in_at
                  ? new Date(profile.last_sign_in_at).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' })
                  : <span className="text-slate-300">-</span>
                }
              </td>
              <td className="px-3 py-3 text-center whitespace-nowrap">
                {profile.role !== 'admin' && profile.id !== currentUserId ? (
                  <button
                    type="button"
                    onClick={() => onDeleteUser(profile)}
                    disabled={deletingUserId === profile.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingUserId === profile.id ? (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    )}
                    삭제
                  </button>
                ) : (
                  <span className="text-slate-300">-</span>
                )}
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr><td colSpan={10} className="p-12 text-center text-slate-400">등록된 회원이 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SystemAdminUsersTab;
