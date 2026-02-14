import React, { useState, useEffect } from 'react';
import { User, Hospital } from '../types';

const SystemAdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'hospitals' | 'users'>('overview');
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const storedHospitals = localStorage.getItem('app_hospitals');
        const storedUsers = localStorage.getItem('app_users');
        if (storedHospitals) setHospitals(JSON.parse(storedHospitals));
        if (storedUsers) setUsers(JSON.parse(storedUsers));
    }, []);

    const getHospitalMemberCount = (hospitalId: string) => {
        return users.filter(u => u.hospitalId === hospitalId).length;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Admin Header */}
            <header className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-lg z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl">S</div>
                    <h1 className="text-xl font-bold tracking-tight">System Admin</h1>
                </div>
                <div className="text-sm text-slate-400">
                    시스템 최고 관리자 모드
                </div>
            </header>

            <div className="flex flex-1">
                {/* Admin Sidebar */}
                <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                    <nav className="p-4 space-y-1">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            대시보드 개요
                        </button>
                        <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">MEMBER MANAGEMENT</div>
                        <button
                            onClick={() => setActiveTab('hospitals')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'hospitals' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            병원 관리 (치과회원)
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            전체 회원 관리
                        </button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 overflow-y-auto">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-slate-800">시스템 현황</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="text-slate-500 text-sm font-bold mb-2">등록된 병원 수</div>
                                    <div className="text-4xl font-bold text-slate-800">{hospitals.length}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="text-slate-500 text-sm font-bold mb-2">전체 회원 수</div>
                                    <div className="text-4xl font-bold text-slate-800">{users.length}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="text-slate-500 text-sm font-bold mb-2">시스템 상태</div>
                                    <div className="text-emerald-600 font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        정상 운영 중
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'hospitals' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-slate-800">병원 관리</h2>
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">병원명</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">대표 관리자</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">구성원 수</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">등록일</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {hospitals.map(hospital => (
                                            <tr key={hospital.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-bold text-slate-800">{hospital.name}</td>
                                                <td className="px-6 py-4 text-slate-600">{hospital.masterAdminId}</td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold">
                                                        {getHospitalMemberCount(hospital.id)}명
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">{new Date(hospital.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {hospitals.length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">등록된 병원이 없습니다.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-slate-800">전체 회원 관리</h2>
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">이름</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">이메일</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">소속 병원</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">권한</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map(user => {
                                            const hospital = hospitals.find(h => h.id === user.hospitalId);
                                            return (
                                                <tr key={user.email} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-4 font-bold text-slate-800">{user.name}</td>
                                                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{hospital ? hospital.name : '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'master' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {user.status || 'pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SystemAdminDashboard;
