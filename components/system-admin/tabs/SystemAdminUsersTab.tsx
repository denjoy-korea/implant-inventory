import React, { useState, useMemo } from 'react';
import { DbProfile, PLAN_SHORT_NAMES, PlanType, UserRole } from '../../../types';
import { DbHospitalRow } from '../systemAdminDomain';

interface SystemAdminUsersTabProps {
  profiles: DbProfile[];
  currentUserId: string | null;
  deletingUserId: string | null;
  getHospitalName: (hospitalId: string | null) => string;
  getHospitalPlan: (hospitalId: string | null) => DbHospitalRow | null;
  onOpenUserDetail: (profile: DbProfile) => void;
  onDeleteUser: (profile: DbProfile) => void;
  onDeactivateUser?: (profile: DbProfile) => void;
  onReactivateUser?: (profile: DbProfile) => void;
}

const ROLE_OPTIONS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: '전체 역할' },
  { value: 'master', label: '원장' },
  { value: 'dental_staff', label: '스태프' },
  { value: 'staff', label: '개인' },
  { value: 'admin', label: '운영자' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'active', label: '활성' },
  { value: 'pending', label: '대기' },
  { value: 'paused', label: '정지' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-100">
        <span className="w-1 h-1 rounded-full bg-emerald-500" />
        활성
      </span>
    );
  }
  if (status === 'paused') {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 bg-slate-100 text-slate-500 border-slate-200">
        <span className="w-1 h-1 rounded-full bg-slate-400" />
        정지
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-100">
      <span className="w-1 h-1 rounded-full bg-amber-500" />
      대기
    </span>
  );
}

const SystemAdminUsersTab: React.FC<SystemAdminUsersTabProps> = ({
  profiles,
  currentUserId,
  deletingUserId,
  getHospitalName,
  getHospitalPlan,
  onOpenUserDetail,
  onDeleteUser,
  onDeactivateUser,
  onReactivateUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [profiles, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="space-y-3">
      {/* 검색/필터 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 이메일 검색..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 placeholder:text-slate-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 text-slate-600"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 text-slate-600"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-[11px] text-slate-400 ml-1 whitespace-nowrap">
          {filteredProfiles.length} / {profiles.length}명
        </span>
      </div>

      {/* 테이블 */}
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
            {filteredProfiles.map((profile) => (
              <tr key={profile.id} className={`hover:bg-slate-50/50 transition-colors ${profile.status === 'paused' ? 'opacity-60' : ''}`}>
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
                  <StatusBadge status={profile.status ?? 'pending'} />
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
                <td className="px-3 py-3 whitespace-nowrap">
                  {profile.role !== 'admin' && profile.id !== currentUserId ? (
                    <div className="flex items-center justify-center gap-1">
                      {/* 비활성화 / 재활성화 */}
                      {profile.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => onReactivateUser?.(profile)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          복구
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDeactivateUser?.(profile)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          정지
                        </button>
                      )}
                      {/* 삭제 */}
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
                    </div>
                  ) : (
                    <span className="text-slate-300 block text-center">-</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredProfiles.length === 0 && (
              <tr>
                <td colSpan={10} className="p-12 text-center text-slate-400">
                  {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                    ? '검색 결과가 없습니다.'
                    : '등록된 회원이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemAdminUsersTab;
