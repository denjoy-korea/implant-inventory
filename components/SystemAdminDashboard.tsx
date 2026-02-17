
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { DbProfile, UserRole, PlanType, BillingCycle, PLAN_NAMES, DbResetRequest } from '../types';
import { resetService } from '../services/resetService';
import NoticeEditor from './NoticeEditor';
import { sanitizeRichHtml } from '../services/htmlSanitizer';

interface SystemAdminDashboardProps {
    onLogout: () => void;
    onToggleView: () => void;
}

interface DbHospitalRow {
    id: string;
    name: string;
    master_admin_id: string | null;
    phone: string | null;
    plan: string;
    plan_expires_at: string | null;
    plan_changed_at: string | null;
    billing_cycle: string | null;
    created_at: string;
}

const ROLE_MAP: Record<string, string> = {
    admin: '운영자', master: '원장', dental_staff: '치위생사', staff: '스태프',
};

const SystemAdminDashboard: React.FC<SystemAdminDashboardProps> = ({ onLogout, onToggleView }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'hospitals' | 'users' | 'reset_requests' | 'manual'>('overview');
    const [hospitals, setHospitals] = useState<DbHospitalRow[]>([]);
    const [profiles, setProfiles] = useState<DbProfile[]>([]);
    const [resetRequests, setResetRequests] = useState<DbResetRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [planForm, setPlanForm] = useState<{ plan: PlanType; cycle: BillingCycle }>({ plan: 'free', cycle: 'monthly' });
    const [planSaving, setPlanSaving] = useState(false);
    const [resetActionLoading, setResetActionLoading] = useState<string | null>(null);

    // 매뉴얼 관련 state
    interface ManualEntry { id: string; title: string; content: string; category: string; updated_at: string; created_at: string; }
    const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
    const [manualEditing, setManualEditing] = useState<ManualEntry | null>(null);
    const [manualForm, setManualForm] = useState({ title: '', content: '', category: '일반' });
    const [manualSaving, setManualSaving] = useState(false);
    const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
    const MANUAL_CATEGORIES = ['일반', '회원/인증', '플랜/결제', '재고관리', '수술기록', '주문관리', '초기화', '시스템'];

    const loadManuals = async () => {
        const { data } = await supabase.from('admin_manuals').select('*').order('created_at', { ascending: false });
        if (data) {
            const sanitized = (data as ManualEntry[]).map((entry) => ({
                ...entry,
                content: sanitizeRichHtml(String(entry.content || '')),
            }));
            setManualEntries(sanitized);
        }
    };

    const saveManual = async () => {
        if (!manualForm.title.trim() || !manualForm.content.trim()) return;
        setManualSaving(true);
        const safeContent = sanitizeRichHtml(manualForm.content);
        if (manualEditing) {
            await supabase.from('admin_manuals').update({
                title: manualForm.title, content: safeContent, category: manualForm.category, updated_at: new Date().toISOString(),
            }).eq('id', manualEditing.id);
        } else {
            await supabase.from('admin_manuals').insert({
                title: manualForm.title, content: safeContent, category: manualForm.category,
            });
        }
        await loadManuals();
        setManualEditing(null);
        setManualForm({ title: '', content: '', category: '일반' });
        setManualSaving(false);
    };

    const deleteManual = async (id: string) => {
        if (!window.confirm('이 매뉴얼을 삭제하시겠습니까?')) return;
        await supabase.from('admin_manuals').delete().eq('id', id);
        if (manualSelectedId === id) setManualSelectedId(null);
        await loadManuals();
    };

    const loadData = async () => {
        setIsLoading(true);
        const [profileRes, hospitalRes, resetData, manualRes] = await Promise.all([
            supabase.rpc('get_all_profiles'),
            supabase.from('hospitals').select('*'),
            resetService.getAllRequests(),
            supabase.from('admin_manuals').select('*').order('created_at', { ascending: false }),
        ]);
        if (profileRes.data) setProfiles(profileRes.data as DbProfile[]);
        if (hospitalRes.data) setHospitals(hospitalRes.data as DbHospitalRow[]);
        setResetRequests(resetData);
        if (manualRes.data) {
            const sanitized = (manualRes.data as ManualEntry[]).map((entry) => ({
                ...entry,
                content: sanitizeRichHtml(String(entry.content || '')),
            }));
            setManualEntries(sanitized);
        }
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const getHospitalName = (hospitalId: string | null) => {
        if (!hospitalId) return '-';
        return hospitals.find(h => h.id === hospitalId)?.name || '-';
    };

    const getMasterName = (masterAdminId: string | null) => {
        if (!masterAdminId) return '-';
        return profiles.find(p => p.id === masterAdminId)?.name || '-';
    };

    const getHospitalMemberCount = (hospitalId: string) => {
        return profiles.filter(p => p.hospital_id === hospitalId).length;
    };

    const getHospitalPlan = (hospitalId: string | null) => {
        if (!hospitalId) return null;
        return hospitals.find(h => h.id === hospitalId) || null;
    };

    const handleAssignPlan = async (hospitalId: string) => {
        setPlanSaving(true);
        const { data, error } = await supabase.rpc('admin_assign_plan', {
            p_hospital_id: hospitalId,
            p_plan: planForm.plan,
            p_billing_cycle: planForm.plan === 'free' || planForm.plan === 'ultimate' ? null : planForm.cycle,
        });
        if (error) {
            alert('플랜 배정 실패: ' + error.message);
        } else {
            setEditingPlan(null);
            await loadData();
        }
        setPlanSaving(false);
    };

    const activeCount = profiles.filter(p => p.status === 'active').length;
    const pendingCount = profiles.filter(p => p.status === 'pending').length;

    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayStr = dayNames[today.getDay()] + '요일';

    const kpiCards = [
        {
            label: '등록 병원', value: hospitals.length,
            sub: `플랜: Free ${hospitals.filter(h => h.plan === 'free').length} / 유료 ${hospitals.filter(h => h.plan !== 'free').length}`,
            icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>),
            color: 'indigo', onClick: () => setActiveTab('hospitals'), active: activeTab === 'hospitals',
        },
        {
            label: '전체 회원', value: profiles.length,
            sub: `활성 ${activeCount}명 / 대기 ${pendingCount}명`,
            icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>),
            color: 'purple', onClick: () => setActiveTab('users'), active: activeTab === 'users',
        },
        {
            label: '시스템 상태', value: 'OK',
            sub: 'Supabase 연결 정상',
            icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
            color: 'emerald', onClick: () => {}, active: false,
        },
    ];

    const colorMap: Record<string, { text: string; iconBg: string }> = {
        indigo: { text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
        purple: { text: 'text-purple-600', iconBg: 'bg-purple-100' },
        emerald: { text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* 사이드바 */}
            <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0 shadow-2xl relative z-20">
                <div className="p-6 pb-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">S</div>
                        <div>
                            <h1 className="text-white font-bold tracking-tight text-lg">시스템 관리</h1>
                            <div className="flex items-center gap-1.5 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity" onClick={onToggleView} title="사용자 뷰로 전환">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">운영자 모드</span>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {[
                        { id: 'overview' as const, label: '대시보드 개요', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}

                    <div className="pt-6 pb-2 px-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">플랫폼 관리</div>
                        <div className="space-y-1">
                            <button onClick={() => setActiveTab('hospitals')}
                                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'hospitals' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                <span className="font-medium">병원 관리</span>
                            </button>
                            <button onClick={() => setActiveTab('users')}
                                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                <span className="font-medium">전체 회원 관리</span>
                            </button>
                            <button onClick={() => setActiveTab('reset_requests')}
                                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'reset_requests' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                <span className="font-medium">초기화 요청</span>
                                {resetRequests.filter(r => r.status === 'pending').length > 0 && (
                                    <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        {resetRequests.filter(r => r.status === 'pending').length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 pb-2 px-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">문서</div>
                        <div className="space-y-1">
                            <button onClick={() => setActiveTab('manual')}
                                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                <span className="font-medium">사용자 매뉴얼</span>
                                {manualEntries.length > 0 && (
                                    <span className="ml-auto text-[10px] font-bold text-slate-500">{manualEntries.length}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="px-3 pb-2">
                    <button onClick={onToggleView} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-all font-bold text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        사용자 뷰로 전환
                    </button>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all font-bold text-sm group">
                        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 px-6 py-2.5 sticky top-0 z-[100] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 font-medium">{dateStr} {dayStr}</span>
                        <div className="h-4 w-px bg-slate-200" />
                        <h1 className="text-sm font-bold text-slate-700">
                            {activeTab === 'overview' && '시스템 개요'}
                            {activeTab === 'hospitals' && '병원 관리'}
                            {activeTab === 'users' && '전체 회원 관리'}
                            {activeTab === 'reset_requests' && '초기화 요청 관리'}
                            {activeTab === 'manual' && '사용자 매뉴얼'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={loadData} className="text-xs text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            새로고침
                        </button>
                        <div className="bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            시스템 정상
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden p-6 max-w-7xl mx-auto w-full space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 text-slate-400">불러오는 중...</div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {kpiCards.map((card, i) => {
                                            const c = colorMap[card.color];
                                            return (
                                                <button key={i} onClick={card.onClick}
                                                    className={`group bg-white px-5 py-5 rounded-2xl border transition-all text-left hover:shadow-md ${card.active ? 'border-indigo-200 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl ${c.iconBg} ${c.text} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>{card.icon}</div>
                                                        <div>
                                                            <div className="text-3xl font-black text-slate-800 leading-tight">{card.value}</div>
                                                            <p className="text-xs font-bold text-slate-500 mt-1">{card.label}</p>
                                                            <p className={`text-[11px] font-medium mt-0.5 ${c.text}`}>{card.sub}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'hospitals' && (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">병원명</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">원장 (관리자)</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">구성원</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">플랜</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">변경일</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">만료일</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {hospitals.map(h => (
                                                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                            </div>
                                                            <span className="font-bold text-slate-800">{h.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 font-medium">{getMasterName(h.master_admin_id)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-indigo-100">
                                                            {getHospitalMemberCount(h.id)}명
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${h.plan === 'free' ? 'bg-slate-50 text-slate-600 border-slate-200' : h.plan === 'ultimate' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                            {PLAN_NAMES[h.plan as PlanType] || h.plan}
                                                        </span>
                                                        {h.billing_cycle && (
                                                            <span className="ml-1 text-[10px] text-slate-400">{h.billing_cycle === 'yearly' ? '연간' : '월간'}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-400">
                                                        {h.plan_changed_at ? new Date(h.plan_changed_at).toLocaleDateString('ko-KR') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-400">
                                                        {h.plan_expires_at ? new Date(h.plan_expires_at).toLocaleDateString('ko-KR') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingPlan === h.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    value={planForm.plan}
                                                                    onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value as PlanType }))}
                                                                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                >
                                                                    <option value="free">Free</option>
                                                                    <option value="basic">Basic</option>
                                                                    <option value="plus">Plus</option>
                                                                    <option value="business">Business</option>
                                                                    <option value="ultimate">Ultimate</option>
                                                                </select>
                                                                {planForm.plan !== 'free' && planForm.plan !== 'ultimate' && (
                                                                    <select
                                                                        value={planForm.cycle}
                                                                        onChange={e => setPlanForm(f => ({ ...f, cycle: e.target.value as BillingCycle }))}
                                                                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                    >
                                                                        <option value="monthly">월간</option>
                                                                        <option value="yearly">연간</option>
                                                                    </select>
                                                                )}
                                                                <button
                                                                    onClick={() => handleAssignPlan(h.id)}
                                                                    disabled={planSaving}
                                                                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold"
                                                                >
                                                                    {planSaving ? '...' : '적용'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingPlan(null)}
                                                                    className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5"
                                                                >
                                                                    취소
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingPlan(h.id);
                                                                    setPlanForm({ plan: h.plan as PlanType, cycle: (h.billing_cycle as BillingCycle) || 'monthly' });
                                                                }}
                                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                                                            >
                                                                플랜 변경
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {hospitals.length === 0 && (
                                                <tr><td colSpan={7} className="p-12 text-center text-slate-400">등록된 병원이 없습니다.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'reset_requests' && (
                                <div className="space-y-4">
                                    {resetRequests.length === 0 ? (
                                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">초기화 요청이 없습니다.</div>
                                    ) : resetRequests.map(req => {
                                        const hospital = hospitals.find(h => h.id === req.hospital_id);
                                        const requester = profiles.find(p => p.id === req.requested_by);
                                        const isPending = req.status === 'pending';
                                        const isScheduled = req.status === 'scheduled';
                                        const isCompleted = req.status === 'completed';
                                        const isCancelled = req.status === 'cancelled';
                                        const isRejected = req.status === 'rejected';
                                        const isActionable = isPending;
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
                                            <div key={req.id} className={`bg-white rounded-2xl border shadow-sm p-6 ${isPending ? 'border-amber-200' : 'border-slate-200'}`}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-base font-bold text-slate-800">{hospital?.name || '알 수 없는 병원'}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors}`}>{statusLabel}</span>
                                                        </div>
                                                        <div className="space-y-1 text-xs text-slate-500">
                                                            <p>신청자: <span className="font-semibold text-slate-700">{requester?.name || '-'}</span> ({requester?.email || '-'})</p>
                                                            <p>사유: <span className="text-slate-700">{req.reason || '-'}</span></p>
                                                            <p>신청일: {new Date(req.created_at).toLocaleString('ko-KR')}</p>
                                                            {isScheduled && req.scheduled_at && (
                                                                <p className="text-blue-600 font-semibold">예정일: {new Date(req.scheduled_at).toLocaleString('ko-KR')}</p>
                                                            )}
                                                            {isCompleted && req.completed_at && (
                                                                <p className="text-emerald-600">완료일: {new Date(req.completed_at).toLocaleString('ko-KR')}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isActionable && (
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm(`${hospital?.name || ''}의 모든 데이터를 즉시 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
                                                                    setResetActionLoading(req.id);
                                                                    const ok = await resetService.approveImmediate(req.id, req.hospital_id);
                                                                    if (ok) await loadData();
                                                                    else alert('초기화에 실패했습니다.');
                                                                    setResetActionLoading(null);
                                                                }}
                                                                disabled={resetActionLoading === req.id}
                                                                className="px-3 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {resetActionLoading === req.id ? '...' : '즉시 초기화'}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm(`${hospital?.name || ''}의 데이터를 7일 후 초기화 예약하시겠습니까?\n신청자가 기간 내 취소할 수 있습니다.`)) return;
                                                                    setResetActionLoading(req.id);
                                                                    const ok = await resetService.approveScheduled(req.id);
                                                                    if (ok) await loadData();
                                                                    else alert('예약에 실패했습니다.');
                                                                    setResetActionLoading(null);
                                                                }}
                                                                disabled={resetActionLoading === req.id}
                                                                className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                            >
                                                                7일 후 초기화
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm('이 요청을 거절하시겠습니까?')) return;
                                                                    setResetActionLoading(req.id);
                                                                    await resetService.rejectRequest(req.id);
                                                                    await loadData();
                                                                    setResetActionLoading(null);
                                                                }}
                                                                disabled={resetActionLoading === req.id}
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
                            )}

                            {activeTab === 'users' && (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">이름</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">이메일</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">연락처</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">소속 병원</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">플랜</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">역할</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">가입일</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {profiles.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.role === 'admin' ? 'bg-rose-100 text-rose-600' : p.role === 'master' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                                                {p.name.charAt(0) || '?'}
                                                            </div>
                                                            <span className="font-bold text-slate-800">{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-sm">{p.email}</td>
                                                    <td className="px-6 py-4 text-slate-500 text-sm">{p.phone || '-'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{getHospitalName(p.hospital_id)}</td>
                                                    <td className="px-6 py-4">
                                                        {(() => {
                                                            if (p.role === 'admin') return <span className="text-xs text-slate-400">-</span>;
                                                            const hp = getHospitalPlan(p.hospital_id);
                                                            if (!hp) return (
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-slate-50 text-slate-600 border-slate-200">Free</span>
                                                            );
                                                            const planName = PLAN_NAMES[hp.plan as PlanType] || hp.plan;
                                                            const isMaster = p.role === 'master';
                                                            return (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${hp.plan === 'free' ? 'bg-slate-50 text-slate-600 border-slate-200' : hp.plan === 'ultimate' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                                        {planName}
                                                                    </span>
                                                                    {!isMaster && (
                                                                        <span className="text-[10px] text-slate-400">소속</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {(() => {
                                                            if (p.role === 'admin') return (
                                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-rose-50 text-rose-700 border-rose-100">운영자</span>
                                                            );
                                                            if (p.role === 'master') return (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-purple-50 text-purple-700 border-purple-100 w-fit">치과회원</span>
                                                                    <span className="text-[10px] text-slate-400 pl-1">원장</span>
                                                                </div>
                                                            );
                                                            if (p.hospital_id) return (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-100 w-fit">치과회원</span>
                                                                    <span className="text-[10px] text-slate-400 pl-1">스태프</span>
                                                                </div>
                                                            );
                                                            return (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-teal-50 text-teal-700 border-teal-100 w-fit">개인회원</span>
                                                                    <span className="text-[10px] text-slate-400 pl-1">담당자</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex w-fit items-center gap-1 ${
                                                            p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                            {p.status === 'active' ? '활성' : '대기'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                                                </tr>
                                            ))}
                                            {profiles.length === 0 && (
                                                <tr><td colSpan={8} className="p-12 text-center text-slate-400">등록된 회원이 없습니다.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 사용자 매뉴얼 탭 */}
                            {activeTab === 'manual' && (
                                <div className="flex gap-6 h-[calc(100vh-8rem)]">
                                    {/* 좌측: 문서 목록 */}
                                    <div className="w-72 flex-shrink-0 flex flex-col">
                                        <button
                                            onClick={() => { setManualEditing(null); setManualForm({ title: '', content: '', category: '일반' }); setManualSelectedId('__new__'); }}
                                            className="w-full mb-3 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            새 문서 작성
                                        </button>
                                        <div className="flex-1 overflow-y-auto space-y-1.5">
                                            {manualEntries.length === 0 && manualSelectedId !== '__new__' && (
                                                <p className="text-xs text-slate-400 text-center py-8">작성된 매뉴얼이 없습니다.</p>
                                            )}
                                            {manualEntries.map(entry => (
                                                <button
                                                    key={entry.id}
                                                    onClick={() => { setManualSelectedId(entry.id); setManualEditing(null); setManualForm({ title: '', content: '', category: '일반' }); }}
                                                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                                                        manualSelectedId === entry.id
                                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{entry.category}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 truncate">{entry.title}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(entry.updated_at || entry.created_at).toLocaleDateString('ko-KR')}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 우측: 문서 보기/편집 */}
                                    <div className="flex-1 min-w-0">
                                        {/* 초기 상태: 아무것도 선택 안됨 */}
                                        {!manualSelectedId && !manualEditing && (
                                            <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full flex flex-col items-center justify-center text-slate-400">
                                                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                <p className="text-sm font-bold">문서를 선택하거나 새로 작성하세요</p>
                                                <p className="text-xs mt-1">시스템 구축 시 대화 내용을 정리하여 기록할 수 있습니다</p>
                                            </div>
                                        )}

                                        {/* 새 문서 작성 / 수정 모드 */}
                                        {(manualSelectedId === '__new__' || manualEditing) && (
                                            <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full flex flex-col">
                                                <div className="flex items-center gap-1.5 mb-3">
                                                    {MANUAL_CATEGORIES.map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => setManualForm(f => ({ ...f, category: c }))}
                                                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                                                                manualForm.category === c
                                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                    : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                        >
                                                            {c}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    value={manualForm.title}
                                                    onChange={e => setManualForm(f => ({ ...f, title: e.target.value }))}
                                                    placeholder="제목을 입력하세요"
                                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 mb-3"
                                                />
                                                <div className="flex-1 min-h-0">
                                                    <NoticeEditor
                                                        key={manualEditing ? manualEditing.id : '__new__'}
                                                        onChange={(html) => setManualForm(f => ({ ...f, content: html }))}
                                                        initialValue={manualEditing ? manualEditing.content : ''}
                                                    />
                                                </div>
                                                <div className="flex gap-2 justify-end pt-3">
                                                    <button
                                                        onClick={() => { setManualEditing(null); setManualForm({ title: '', content: '', category: '일반' }); setManualSelectedId(null); }}
                                                        className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={saveManual}
                                                        disabled={manualSaving || !manualForm.title.trim() || !manualForm.content.trim()}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                                                    >
                                                        {manualSaving ? '저장 중...' : manualEditing ? '수정 완료' : '등록'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 보기 모드 */}
                                        {manualSelectedId && manualSelectedId !== '__new__' && !manualEditing && (() => {
                                            const selected = manualEntries.find(e => e.id === manualSelectedId);
                                            if (!selected) return null;
                                            return (
                                                <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full flex flex-col">
                                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">{selected.category}</span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    최종 수정: {new Date(selected.updated_at || selected.created_at).toLocaleString('ko-KR')}
                                                                </span>
                                                            </div>
                                                            <h2 className="text-lg font-bold text-slate-800">{selected.title}</h2>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setManualEditing(selected);
                                                                    setManualForm({ title: selected.title, content: selected.content, category: selected.category });
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                                            >
                                                                수정
                                                            </button>
                                                            <button
                                                                onClick={() => deleteManual(selected.id)}
                                                                className="px-3 py-1.5 text-xs font-bold text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                                                            >
                                                                삭제
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto text-sm text-slate-700 leading-relaxed notice-content" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(selected.content) }} />
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SystemAdminDashboard;
