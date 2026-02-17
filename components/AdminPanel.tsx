
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { DbProfile, UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  admin: { label: '운영자', color: 'bg-rose-50 text-rose-600' },
  master: { label: '치과관리자', color: 'bg-indigo-50 text-indigo-600' },
  dental_staff: { label: '치과스태프', color: 'bg-emerald-50 text-emerald-600' },
  staff: { label: '개인회원', color: 'bg-slate-100 text-slate-600' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: '활성', color: 'bg-emerald-50 text-emerald-600' },
  pending: { label: '대기', color: 'bg-amber-50 text-amber-600' },
};

const AdminPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [hospitals, setHospitals] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [profileRes, hospitalRes] = await Promise.all([
      supabase.rpc('get_all_profiles'),
      supabase.from('hospitals').select('id, name'),
    ]);

    if (profileRes.data) setProfiles(profileRes.data as DbProfile[]);
    if (hospitalRes.data) {
      const map: Record<string, string> = {};
      hospitalRes.data.forEach((h: { id: string; name: string }) => { map[h.id] = h.name; });
      setHospitals(map);
    }
    setIsLoading(false);
  };

  const updateRole = async (profileId: string, newRole: UserRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    loadData();
  };

  const updateStatus = async (profileId: string, newStatus: 'active' | 'pending') => {
    await supabase.from('profiles').update({ status: newStatus }).eq('id', profileId);
    loadData();
  };

  const deleteUser = async (profileId: string, email: string) => {
    if (!confirm(`${email} 사용자를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    await supabase.from('profiles').delete().eq('id', profileId);
    loadData();
  };

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = profiles.filter(p => p.status === 'active').length;
  const masterCount = profiles.filter(p => p.role === 'master').length;

  return (
    <div className="max-w-6xl mx-auto my-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            전체 회원 관리
          </h2>
          <p className="text-slate-500 mt-2">Supabase에 등록된 전체 회원을 관리합니다.</p>
        </div>

        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">전체</p>
            <p className="text-2xl font-black text-indigo-600">{profiles.length}</p>
          </div>
          <div className="w-px h-8 bg-slate-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">활성</p>
            <p className="text-2xl font-black text-emerald-500">{activeCount}</p>
          </div>
          <div className="w-px h-8 bg-slate-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">병원</p>
            <p className="text-2xl font-black text-violet-500">{masterCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
            title="새로고침"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="px-6 py-20 text-center text-slate-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">사용자</th>
                  <th className="px-6 py-4">이메일</th>
                  <th className="px-6 py-4">연락처</th>
                  <th className="px-6 py-4">역할</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4">소속 병원</th>
                  <th className="px-6 py-4">가입일</th>
                  <th className="px-6 py-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.map((p) => {
                  const role = ROLE_LABELS[p.role] || ROLE_LABELS.staff;
                  const status = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                            {p.name.charAt(0) || '?'}
                          </div>
                          <span className="font-semibold text-slate-700">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{p.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{p.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <select
                          value={p.role}
                          onChange={(e) => updateRole(p.id, e.target.value as UserRole)}
                          className={`text-xs font-bold px-2 py-1 rounded cursor-pointer border-0 ${role.color}`}
                        >
                          <option value="admin">운영자</option>
                          <option value="master">치과관리자</option>
                          <option value="dental_staff">치과스태프</option>
                          <option value="staff">개인회원</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => updateStatus(p.id, p.status === 'active' ? 'pending' : 'active')}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${status.color} hover:opacity-80 transition-opacity`}
                        >
                          {status.label}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {p.hospital_id ? hospitals[p.hospital_id] || p.hospital_id.slice(0, 8) : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(p.id, p.email)}
                            className="text-slate-300 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                            title="회원 삭제"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-slate-400 italic">등록된 회원이 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <p>Admin Authorization Level: FULL</p>
        <p>Supabase DB Connected</p>
      </div>
    </div>
  );
};

export default AdminPanel;
