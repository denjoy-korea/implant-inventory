
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { DbProfile, UserRole, PlanType, BillingCycle, PLAN_LIMITS, DbResetRequest } from '../types';
import { resetService } from '../services/resetService';
import NoticeEditor from './NoticeEditor';
import { sanitizeRichHtml } from '../services/htmlSanitizer';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../hooks/useToast';

interface SystemAdminDashboardProps {
    onLogout: () => void;
    onToggleView: () => void;
}

interface DbHospitalRow {
    id: string;
    name: string;
    master_admin_id: string | null;
    phone: string | null;
    biz_file_url: string | null;
    plan: string;
    plan_expires_at: string | null;
    plan_changed_at: string | null;
    billing_cycle: string | null;
    created_at: string;
    base_stock_edit_count: number;
    trial_started_at: string | null;
    trial_used: boolean;
}

const TRIAL_DAYS = 14;

function getTrialInfo(h: DbHospitalRow): { status: 'unused' | 'active' | 'expired'; daysLeft?: number } {
    if (!h.trial_started_at && !h.trial_used) return { status: 'unused' };
    if (h.trial_used) return { status: 'expired' };
    if (h.trial_started_at) {
        const trialEnd = new Date(new Date(h.trial_started_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        if (new Date() < trialEnd) {
            const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            return { status: 'active', daysLeft };
        }
        return { status: 'expired' };
    }
    return { status: 'unused' };
}

const ROLE_MAP: Record<string, string> = {
    admin: '운영자', master: '원장', dental_staff: '치위생사', staff: '스태프',
};

const PLAN_SHORT_LABELS: Record<PlanType, string> = {
    free: 'Free',
    basic: 'Base',
    plus: 'Plus',
    business: 'Bizs',
    ultimate: 'Maxs',
};

const SystemAdminDashboard: React.FC<SystemAdminDashboardProps> = ({ onLogout, onToggleView }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'hospitals' | 'users' | 'reset_requests' | 'manual' | 'plan_management'>('overview');
    const [hospitals, setHospitals] = useState<DbHospitalRow[]>([]);
    const [profiles, setProfiles] = useState<DbProfile[]>([]);
    const [resetRequests, setResetRequests] = useState<DbResetRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [planModal, setPlanModal] = useState<{ hospitalId: string; hospitalName: string } | null>(null);
    const [planForm, setPlanForm] = useState<{ plan: PlanType; cycle: BillingCycle }>({ plan: 'free', cycle: 'monthly' });
    const [planSaving, setPlanSaving] = useState(false);
    const [trialSaving, setTrialSaving] = useState<string | null>(null);
    const [resetActionLoading, setResetActionLoading] = useState<string | null>(null);
    const [editCountResetting, setEditCountResetting] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmColor?: 'rose' | 'amber' | 'indigo'; confirmLabel?: string; onConfirm: () => void } | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const { toast, showToast } = useToast();

    // 플랜 관리 state
    interface PlanCapacity { plan: string; capacity: number; }
    interface PlanUsage { plan: string; usage_count: number; }
    const [planCapacities, setPlanCapacities] = useState<PlanCapacity[]>([]);
    const [planUsages, setPlanUsages] = useState<PlanUsage[]>([]);
    const [planCapacityEditing, setPlanCapacityEditing] = useState<Record<string, number>>({});
    const [planCapacitySaving, setPlanCapacitySaving] = useState<string | null>(null);

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

    const deleteManual = (id: string) => {
        setConfirmModal({
            title: '매뉴얼 삭제',
            message: '이 매뉴얼을 삭제하시겠습니까?',
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                await supabase.from('admin_manuals').delete().eq('id', id);
                if (manualSelectedId === id) setManualSelectedId(null);
                await loadManuals();
            },
        });
    };

    const loadData = async () => {
        setIsLoading(true);
        const [profileRes, hospitalRes, resetData, manualRes, sessionRes] = await Promise.all([
            supabase.rpc('get_all_profiles_with_last_login'),
            supabase.from('hospitals').select('*'),
            resetService.getAllRequests(),
            supabase.from('admin_manuals').select('*').order('created_at', { ascending: false }),
            supabase.auth.getUser(),
        ]);

        // 새 함수 실패 시 기존 함수로 fallback
        if (profileRes.error || !profileRes.data || (profileRes.data as DbProfile[]).length === 0) {
            const fallback = await supabase.rpc('get_all_profiles');
            if (fallback.data) setProfiles(fallback.data as DbProfile[]);
        } else {
            setProfiles(profileRes.data as DbProfile[]);
        }

        if (sessionRes.data?.user) setCurrentUserId(sessionRes.data.user.id);
        if (hospitalRes.data) setHospitals(hospitalRes.data as DbHospitalRow[]);
        setResetRequests(resetData);
        if (manualRes.data) {
            const sanitized = (manualRes.data as ManualEntry[]).map((entry) => ({
                ...entry,
                content: sanitizeRichHtml(String(entry.content || '')),
            }));
            setManualEntries(sanitized);
        }

        // 플랜 용량 및 사용 현황 로드
        const [capRes, usageRes] = await Promise.all([
            supabase.from('plan_capacities').select('*').order('capacity', { ascending: false }),
            supabase.rpc('get_plan_usage_counts'),
        ]);
        if (capRes.data) setPlanCapacities(capRes.data as PlanCapacity[]);
        if (usageRes.data) setPlanUsages(usageRes.data as PlanUsage[]);

        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleSavePlanCapacity = async (plan: string) => {
        const newCapacity = planCapacityEditing[plan];
        if (newCapacity === undefined || newCapacity < 0) return;
        setPlanCapacitySaving(plan);
        const { error } = await supabase
            .from('plan_capacities')
            .update({ capacity: newCapacity, updated_at: new Date().toISOString() })
            .eq('plan', plan);
        if (!error) {
            setPlanCapacities(prev => prev.map(p => p.plan === plan ? { ...p, capacity: newCapacity } : p));
            setPlanCapacityEditing(prev => { const n = { ...prev }; delete n[plan]; return n; });
            showToast(`${plan} 플랜 용량이 ${newCapacity}개로 업데이트되었습니다.`, 'success');
        } else {
            showToast('저장 실패. 다시 시도해 주세요.', 'error');
        }
        setPlanCapacitySaving(null);
    };

    const handleDeleteUser = (profile: DbProfile) => {
        setConfirmModal({
            title: '회원 삭제',
            message: `"${profile.name}" (${profile.email}) 회원을 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 계정의 모든 데이터가 삭제됩니다.`,
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                setDeletingUserId(profile.id);
                try {
                    const { error } = await supabase.functions.invoke('admin-delete-user', {
                        body: { targetUserId: profile.id },
                    });
                    if (error) {
                        showToast(error.message || '삭제에 실패했습니다.', 'error');
                    } else {
                        showToast(`${profile.name} 회원이 삭제되었습니다.`, 'success');
                        await loadData();
                    }
                } catch {
                    showToast('삭제 중 오류가 발생했습니다.', 'error');
                } finally {
                    setDeletingUserId(null);
                }
            },
        });
    };

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

    const getBizFileName = (hospital: DbHospitalRow): string => {
        const fallback = `${hospital.name}-증빙파일`;
        if (!hospital.biz_file_url) return fallback;
        try {
            const url = new URL(hospital.biz_file_url);
            const last = decodeURIComponent(url.pathname.split('/').pop() || '').trim();
            return last || fallback;
        } catch {
            const raw = String(hospital.biz_file_url || '').trim().replace(/^\/+/, '');
            if (!raw) return fallback;
            const tail = decodeURIComponent(raw.split('/').pop() || '').trim();
            return tail || fallback;
        }
    };

    const isSupabaseStorageObjectUrl = (value: string): boolean => /\/storage\/v1\/object\//i.test(value);

    const parseBizFileRef = (rawRef: string): { bucket: string; objectPath: string } | null => {
        const raw = rawRef.trim();
        if (!raw) return null;

        // 1) Full URL format: /storage/v1/object/{public|sign|authenticated}/{bucket}/{path...}
        try {
            const url = new URL(raw);
            const parts = url.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
            const objectIdx = parts.findIndex((p) => p === 'object');
            if (objectIdx >= 0 && parts.length >= objectIdx + 4) {
                const bucket = parts[objectIdx + 2];
                const objectPath = parts.slice(objectIdx + 3).join('/');
                if (bucket && objectPath) return { bucket, objectPath };
            }
            // absolute URL인데 storage object URL이 아니면 경로 파싱 대상이 아님
            return null;
        } catch {
            // continue: non-URL string
        }

        // 2) "bucket/path" or plain "path" format
        const cleaned = raw.replace(/^\/+/, '');
        const seg = cleaned.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
        if (seg.length >= 2) {
            return { bucket: seg[0], objectPath: seg.slice(1).join('/') };
        }
        if (seg.length === 1) {
            return { bucket: 'biz-documents', objectPath: seg[0] };
        }
        return null;
    };

    const resolveBizFileAccessUrl = async (hospital: DbHospitalRow): Promise<string> => {
        const rawRef = String(hospital.biz_file_url || '').trim();
        if (!rawRef) throw new Error('NO_BIZ_FILE');

        const parsed = parseBizFileRef(rawRef);
        let lastError: any = null;

        if (parsed) {
            const attempts: Array<{ bucket: string; objectPath: string }> = [parsed];
            const fallbackBuckets = ['biz-documents', 'biz_document', 'biz-docs'];
            fallbackBuckets.forEach((bucket) => {
                if (bucket !== parsed.bucket) attempts.push({ bucket, objectPath: parsed.objectPath });
            });

            for (const attempt of attempts) {
                const { data, error } = await supabase.storage
                    .from(attempt.bucket)
                    .createSignedUrl(attempt.objectPath, 60 * 10);
                if (!error && data?.signedUrl) return data.signedUrl;
                lastError = error;
            }
        }

        // storage URL이 아닌 외부 URL은 그대로 접근
        if (!parsed && /^https?:\/\//i.test(rawRef)) return rawRef;

        if (lastError) throw lastError;
        throw new Error('BIZ_FILE_RESOLVE_FAILED');
    };

    const handlePreviewBizFile = (hospital: DbHospitalRow) => {
        void (async () => {
            try {
                const url = await resolveBizFileAccessUrl(hospital);
                window.open(url, '_blank', 'noopener,noreferrer');
            } catch (error: any) {
                const msg = String(error?.message || '');
                if (msg.toLowerCase().includes('bucket not found')) {
                    showToast('스토리지 버킷 설정이 없어 파일을 열 수 없습니다. 운영자 DB에 스토리지 마이그레이션 적용이 필요합니다.', 'error');
                    return;
                }
                if (msg === 'NO_BIZ_FILE') {
                    showToast('등록된 세금계산서/증빙 파일이 없습니다.', 'error');
                    return;
                }
                showToast('파일 미리보기에 실패했습니다.', 'error');
            }
        })();
    };

    const handleDownloadBizFile = async (hospital: DbHospitalRow) => {
        try {
            const accessUrl = await resolveBizFileAccessUrl(hospital);
            const response = await fetch(accessUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = getBizFileName(hospital);
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
            showToast('파일 다운로드를 시작했습니다.', 'success');
        } catch (error: any) {
            const msg = String(error?.message || '');
            if (msg.toLowerCase().includes('bucket not found')) {
                showToast('스토리지 버킷 설정이 없어 다운로드할 수 없습니다. 운영자 DB에 스토리지 마이그레이션 적용이 필요합니다.', 'error');
                return;
            }
            if (msg === 'NO_BIZ_FILE') {
                showToast('등록된 세금계산서/증빙 파일이 없습니다.', 'error');
                return;
            }
            if (
                hospital.biz_file_url &&
                /^https?:\/\//i.test(hospital.biz_file_url) &&
                !isSupabaseStorageObjectUrl(hospital.biz_file_url)
            ) {
                window.open(hospital.biz_file_url, '_blank', 'noopener,noreferrer');
                showToast('브라우저에서 파일을 열었습니다. 저장해 주세요.', 'info');
                return;
            }
            showToast('파일 다운로드에 실패했습니다.', 'error');
        }
    };

    const handleResetEditCount = async (hospitalId: string) => {
        setEditCountResetting(hospitalId);
        const { error } = await supabase
            .from('hospitals')
            .update({ base_stock_edit_count: 0 })
            .eq('id', hospitalId);
        if (error) {
            showToast('초기화 실패: ' + error.message, 'error');
        } else {
            setHospitals(prev => prev.map(h => h.id === hospitalId ? { ...h, base_stock_edit_count: 0 } : h));
            showToast('사용이력이 초기화됐습니다.', 'success');
        }
        setEditCountResetting(null);
    };

    const handleStartTrial = async (hospitalId: string) => {
        setTrialSaving(hospitalId);
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('hospitals')
            .update({ trial_started_at: now, trial_used: false })
            .eq('id', hospitalId);
        if (error) {
            showToast('체험 시작 실패: ' + error.message, 'error');
        } else {
            setHospitals(prev => prev.map(h => h.id === hospitalId ? { ...h, trial_started_at: now, trial_used: false } : h));
            showToast('14일 무료 체험이 시작됐습니다.', 'success');
        }
        setTrialSaving(null);
    };

    const handleResetTrial = async (hospitalId: string) => {
        setTrialSaving(hospitalId);
        const { error } = await supabase
            .from('hospitals')
            .update({ trial_started_at: null, trial_used: false })
            .eq('id', hospitalId);
        if (error) {
            showToast('체험 리셋 실패: ' + error.message, 'error');
        } else {
            setHospitals(prev => prev.map(h => h.id === hospitalId ? { ...h, trial_started_at: null, trial_used: false } : h));
            showToast('무료 체험이 리셋됐습니다.', 'success');
        }
        setTrialSaving(null);
    };

    const handleAssignPlan = async () => {
        if (!planModal) return;
        setPlanSaving(true);
        const { error } = await supabase.rpc('admin_assign_plan', {
            p_hospital_id: planModal.hospitalId,
            p_plan: planForm.plan,
            p_billing_cycle: planForm.plan === 'free' || planForm.plan === 'ultimate' ? null : planForm.cycle,
        });
        if (error) {
            showToast('플랜 배정 실패: ' + error.message, 'error');
        } else {
            setPlanModal(null);
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
        <>
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
                            <button onClick={() => setActiveTab('plan_management')}
                                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeTab === 'plan_management' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                <span className="font-medium">플랜 관리</span>
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
                            {activeTab === 'plan_management' && '플랜 관리'}
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
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">병원명</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">원장 (관리자)</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">구성원</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">플랜</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">변경일</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">만료일</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">무료체험</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">세금계산서 파일</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">기초재고 편집</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {hospitals.map(h => (
                                                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-800">{h.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">{getMasterName(h.master_admin_id)}</td>
                                                    <td className="px-4 py-3">
                                                        {(() => {
                                                            const current = getHospitalMemberCount(h.id);
                                                            const max = PLAN_LIMITS[h.plan as PlanType]?.maxUsers ?? 1;
                                                            const maxLabel = max === Infinity ? '∞' : String(max);
                                                            const isFull = max !== Infinity && current >= max;
                                                            return (
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${isFull ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                                    {current}<span className="font-normal opacity-60">/{maxLabel}</span>
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => {
                                                                setPlanModal({ hospitalId: h.id, hospitalName: h.name });
                                                                setPlanForm({ plan: h.plan as PlanType, cycle: (h.billing_cycle as BillingCycle) || 'monthly' });
                                                            }}
                                                            className={`px-2 py-0.5 rounded-full text-xs font-bold border cursor-pointer hover:opacity-75 transition-opacity ${h.plan === 'free' ? 'bg-slate-50 text-slate-600 border-slate-200' : h.plan === 'ultimate' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}
                                                        >
                                                            {PLAN_SHORT_LABELS[h.plan as PlanType] || h.plan}
                                                        </button>
                                                        {h.billing_cycle && (
                                                            <span className="ml-1 text-[10px] text-slate-400">{h.billing_cycle === 'yearly' ? '연간' : '월간'}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-400">
                                                        {h.plan_changed_at ? new Date(h.plan_changed_at).toLocaleDateString('ko-KR') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-400">
                                                        {h.plan_expires_at ? new Date(h.plan_expires_at).toLocaleDateString('ko-KR') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {(() => {
                                                            const trial = getTrialInfo(h);
                                                            const isBusy = trialSaving === h.id;
                                                            if (trial.status === 'unused') {
                                                                return (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">미사용</span>
                                                                        <button
                                                                            onClick={() => setConfirmModal({
                                                                                title: '무료 체험 시작',
                                                                                message: `${h.name}의 14일 무료 체험을 시작하시겠습니까?`,
                                                                                confirmColor: 'indigo',
                                                                                confirmLabel: '시작',
                                                                                onConfirm: async () => { setConfirmModal(null); await handleStartTrial(h.id); },
                                                                            })}
                                                                            disabled={isBusy}
                                                                            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
                                                                        >
                                                                            {isBusy ? '...' : '시작'}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }
                                                            if (trial.status === 'active') {
                                                                const color = (trial.daysLeft ?? 0) <= 3 ? 'text-rose-600 bg-rose-50 border-rose-200' : (trial.daysLeft ?? 0) <= 7 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
                                                                return (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
                                                                            D-{trial.daysLeft}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => setConfirmModal({
                                                                                title: '체험 리셋',
                                                                                message: `${h.name}의 무료 체험 기록을 초기화하시겠습니까?\n재시작 가능 상태로 변경됩니다.`,
                                                                                confirmColor: 'amber',
                                                                                confirmLabel: '리셋',
                                                                                onConfirm: async () => { setConfirmModal(null); await handleResetTrial(h.id); },
                                                                            })}
                                                                            disabled={isBusy}
                                                                            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                                                        >
                                                                            {isBusy ? '...' : '리셋'}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }
                                                            // expired
                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">종료</span>
                                                                    <button
                                                                        onClick={() => setConfirmModal({
                                                                            title: '체험 리셋',
                                                                            message: `${h.name}의 무료 체험 기록을 초기화하시겠습니까?\n재시작 가능 상태로 변경됩니다.`,
                                                                            confirmColor: 'amber',
                                                                            confirmLabel: '리셋',
                                                                            onConfirm: async () => { setConfirmModal(null); await handleResetTrial(h.id); },
                                                                        })}
                                                                        disabled={isBusy}
                                                                        className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                                                    >
                                                                        {isBusy ? '...' : '리셋'}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {h.biz_file_url ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    onClick={() => handlePreviewBizFile(h)}
                                                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                                                    title="미리보기"
                                                                    aria-label="세금계산서 파일 미리보기"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadBizFile(h)}
                                                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors"
                                                                    title={getBizFileName(h)}
                                                                    aria-label="세금계산서 파일 다운로드"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-slate-300">없음</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {(() => {
                                                            const used = h.base_stock_edit_count ?? 0;
                                                            const max = PLAN_LIMITS[h.plan as PlanType]?.maxBaseStockEdits ?? 0;
                                                            const maxLabel = max === Infinity ? '∞' : String(max);
                                                            const isExhausted = max !== Infinity && used >= max;
                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs font-bold tabular-nums ${isExhausted ? 'text-rose-600' : 'text-slate-700'}`}>
                                                                        {used}<span className="text-slate-400 font-normal">/{maxLabel}</span>
                                                                    </span>
                                                                    <button
                                                                        onClick={() => setConfirmModal({
                                                                            title: '사용이력 초기화',
                                                                            message: `${h.name}의 기초재고 편집 사용이력을 0으로 초기화하시겠습니까?`,
                                                                            confirmColor: 'amber',
                                                                            confirmLabel: '초기화',
                                                                            onConfirm: async () => { setConfirmModal(null); await handleResetEditCount(h.id); },
                                                                        })}
                                                                        disabled={editCountResetting === h.id || used === 0}
                                                                        className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        {editCountResetting === h.id ? '...' : '초기화'}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {hospitals.length === 0 && (
                                                <tr><td colSpan={9} className="p-12 text-center text-slate-400">등록된 병원이 없습니다.</td></tr>
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
                                                                onClick={() => {
                                                                    setConfirmModal({
                                                                        title: '즉시 초기화',
                                                                        message: `${hospital?.name || ''}의 모든 데이터를 즉시 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
                                                                        confirmColor: 'rose',
                                                                        confirmLabel: '즉시 초기화',
                                                                        onConfirm: async () => {
                                                                            setConfirmModal(null);
                                                                            setResetActionLoading(req.id);
                                                                            const ok = await resetService.approveImmediate(req.id, req.hospital_id);
                                                                            if (ok) await loadData();
                                                                            else showToast('초기화에 실패했습니다.', 'error');
                                                                            setResetActionLoading(null);
                                                                        },
                                                                    });
                                                                }}
                                                                disabled={resetActionLoading === req.id}
                                                                className="px-3 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {resetActionLoading === req.id ? '...' : '즉시 초기화'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmModal({
                                                                        title: '7일 후 초기화 예약',
                                                                        message: `${hospital?.name || ''}의 데이터를 7일 후 초기화 예약하시겠습니까?\n신청자가 기간 내 취소할 수 있습니다.`,
                                                                        confirmColor: 'amber',
                                                                        confirmLabel: '예약',
                                                                        onConfirm: async () => {
                                                                            setConfirmModal(null);
                                                                            setResetActionLoading(req.id);
                                                                            const ok = await resetService.approveScheduled(req.id);
                                                                            if (ok) await loadData();
                                                                            else showToast('예약에 실패했습니다.', 'error');
                                                                            setResetActionLoading(null);
                                                                        },
                                                                    });
                                                                }}
                                                                disabled={resetActionLoading === req.id}
                                                                className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                            >
                                                                7일 후 초기화
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmModal({
                                                                        title: '요청 거절',
                                                                        message: '이 요청을 거절하시겠습니까?',
                                                                        confirmColor: 'rose',
                                                                        confirmLabel: '거절',
                                                                        onConfirm: async () => {
                                                                            setConfirmModal(null);
                                                                            setResetActionLoading(req.id);
                                                                            await resetService.rejectRequest(req.id);
                                                                            await loadData();
                                                                            setResetActionLoading(null);
                                                                        },
                                                                    });
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
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">이름</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">이메일</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">연락처</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">소속 병원</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">플랜</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">역할</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">상태</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">가입일</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">마지막 접속</th>
                                                <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {profiles.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${p.role === 'admin' ? 'bg-rose-100 text-rose-600' : p.role === 'master' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                                                {p.name.charAt(0) || '?'}
                                                            </div>
                                                            <span className="font-bold text-slate-800 text-xs">{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{p.email}</td>
                                                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{p.phone || '-'}</td>
                                                    <td className="px-3 py-3 text-slate-600 font-medium whitespace-nowrap">
                                                        {(() => {
                                                            const name = getHospitalName(p.hospital_id);
                                                            if (name === '-' || name.includes('워크스페이스')) return <span className="text-slate-300">-</span>;
                                                            return name;
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        {(() => {
                                                            if (p.role === 'admin') return <span className="text-slate-300">-</span>;
                                                            const hp = getHospitalPlan(p.hospital_id);
                                                            if (!hp) return (
                                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200">Free</span>
                                                            );
                                                            const planName = PLAN_SHORT_LABELS[hp.plan as PlanType] || hp.plan;
                                                            return (
                                                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${hp.plan === 'free' ? 'bg-slate-50 text-slate-600 border-slate-200' : hp.plan === 'ultimate' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                                    {planName}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        {(() => {
                                                            if (p.role === 'admin') return (
                                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-100">운영자</span>
                                                            );
                                                            if (p.role === 'master') return (
                                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-100">원장</span>
                                                            );
                                                            if (p.hospital_id) return (
                                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">스태프</span>
                                                            );
                                                            return (
                                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-teal-50 text-teal-700 border-teal-100">개인</span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                                                            p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                            <span className={`w-1 h-1 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                            {p.status === 'active' ? '활성' : '대기'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-400 whitespace-nowrap tabular-nums">
                                                        {new Date(p.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' })}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-400 whitespace-nowrap tabular-nums">
                                                        {p.last_sign_in_at
                                                            ? new Date(p.last_sign_in_at).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' })
                                                            : <span className="text-slate-300">-</span>
                                                        }
                                                    </td>
                                                    <td className="px-3 py-3 text-center whitespace-nowrap">
                                                        {p.role !== 'admin' && p.id !== currentUserId ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteUser(p)}
                                                                disabled={deletingUserId === p.id}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {deletingUserId === p.id ? (
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
                            )}

                            {/* 사용자 매뉴얼 탭 */}
                            {activeTab === 'plan_management' && (() => {
                                const PLAN_DISPLAY: { key: string; label: string; color: string; bgColor: string; borderColor: string }[] = [
                                    { key: 'free',     label: 'Free',     color: 'text-slate-600',  bgColor: 'bg-slate-50',   borderColor: 'border-slate-200' },
                                    { key: 'basic',    label: 'Basic',    color: 'text-violet-600', bgColor: 'bg-violet-50',  borderColor: 'border-violet-200' },
                                    { key: 'plus',     label: 'Plus',     color: 'text-indigo-600', bgColor: 'bg-indigo-50',  borderColor: 'border-indigo-200' },
                                    { key: 'business', label: 'Business', color: 'text-emerald-600',bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
                                ];
                                return (
                                    <div className="space-y-6">
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                                            <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p className="text-xs text-amber-700 leading-relaxed">
                                                각 플랜의 <strong>최대 수용 가능 워크스페이스 수</strong>를 설정합니다. 사용 카운트는 무료체험 중인 워크스페이스를 포함합니다.<br />
                                                한도가 가득 찬 플랜은 가입 화면에서 <strong>품절</strong>로 표시되며 신규 가입이 제한됩니다.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {PLAN_DISPLAY.map(({ key, label, color, bgColor, borderColor }) => {
                                                const cap = planCapacities.find(p => p.plan === key);
                                                const usage = planUsages.find(p => p.plan === key);
                                                const capacity = cap?.capacity ?? 0;
                                                const usageCount = Number(usage?.usage_count ?? 0);
                                                const pct = capacity > 0 ? Math.min(100, Math.round(usageCount / capacity * 100)) : 0;
                                                const isFull = usageCount >= capacity && capacity > 0;
                                                const isEditing = key in planCapacityEditing;
                                                const editVal = planCapacityEditing[key] ?? capacity;

                                                return (
                                                    <div key={key} className={`rounded-2xl border-2 ${borderColor} ${bgColor} p-5 flex flex-col gap-4`}>
                                                        {/* 헤더 */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-base font-bold ${color}`}>{label}</span>
                                                                {isFull && (
                                                                    <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">품절</span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-slate-400">
                                                                {usageCount} / {capacity}개
                                                            </span>
                                                        </div>

                                                        {/* 프로그레스바 */}
                                                        <div className="space-y-1">
                                                            <div className="w-full bg-white rounded-full h-2.5 overflow-hidden border border-slate-100">
                                                                <div
                                                                    className={`h-2.5 rounded-full transition-all duration-500 ${
                                                                        pct >= 100 ? 'bg-rose-500' :
                                                                        pct >= 80  ? 'bg-amber-400' :
                                                                                     'bg-indigo-500'
                                                                    }`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-between text-[10px] text-slate-400">
                                                                <span>사용 {pct}%</span>
                                                                <span>{capacity - usageCount > 0 ? `잔여 ${capacity - usageCount}개` : '잔여 없음'}</span>
                                                            </div>
                                                        </div>

                                                        {/* 한도 편집 */}
                                                        <div className="flex items-center gap-2 pt-1 border-t border-slate-200/70">
                                                            <span className="text-xs text-slate-500 flex-shrink-0">최대 한도</span>
                                                            {isEditing ? (
                                                                <>
                                                                    <input
                                                                        type="number"
                                                                        min={usageCount}
                                                                        value={editVal}
                                                                        onChange={e => setPlanCapacityEditing(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                                                        className="flex-1 min-w-0 border border-indigo-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleSavePlanCapacity(key)}
                                                                        disabled={planCapacitySaving === key}
                                                                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                                                                    >
                                                                        {planCapacitySaving === key ? '저장중…' : '저장'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setPlanCapacityEditing(prev => { const n = { ...prev }; delete n[key]; return n; })}
                                                                        className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg transition-colors flex-shrink-0"
                                                                    >
                                                                        취소
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="flex-1 text-xs font-bold text-slate-800">{capacity}개</span>
                                                                    <button
                                                                        onClick={() => setPlanCapacityEditing(prev => ({ ...prev, [key]: capacity }))}
                                                                        className="text-xs font-medium text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0 flex items-center gap-1"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                        수정
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* 전체 요약 */}
                                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                                            <h3 className="text-sm font-bold text-slate-700 mb-3">전체 요약</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-left text-slate-400 border-b border-slate-100">
                                                            <th className="pb-2 font-bold">플랜</th>
                                                            <th className="pb-2 font-bold text-center">한도</th>
                                                            <th className="pb-2 font-bold text-center">사용</th>
                                                            <th className="pb-2 font-bold text-center">잔여</th>
                                                            <th className="pb-2 font-bold text-center">점유율</th>
                                                            <th className="pb-2 font-bold text-center">상태</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {PLAN_DISPLAY.map(({ key, label }) => {
                                                            const cap = planCapacities.find(p => p.plan === key);
                                                            const usage = planUsages.find(p => p.plan === key);
                                                            const capacity = cap?.capacity ?? 0;
                                                            const usageCount = Number(usage?.usage_count ?? 0);
                                                            const pct = capacity > 0 ? Math.min(100, Math.round(usageCount / capacity * 100)) : 0;
                                                            const isFull = usageCount >= capacity && capacity > 0;
                                                            return (
                                                                <tr key={key} className="text-slate-600">
                                                                    <td className="py-2.5 font-bold">{label}</td>
                                                                    <td className="py-2.5 text-center">{capacity}</td>
                                                                    <td className="py-2.5 text-center">{usageCount}</td>
                                                                    <td className="py-2.5 text-center">{Math.max(0, capacity - usageCount)}</td>
                                                                    <td className="py-2.5 text-center">
                                                                        <span className={`font-bold ${pct >= 100 ? 'text-rose-500' : pct >= 80 ? 'text-amber-500' : 'text-emerald-600'}`}>{pct}%</span>
                                                                    </td>
                                                                    <td className="py-2.5 text-center">
                                                                        {isFull
                                                                            ? <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">품절</span>
                                                                            : <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">가입 가능</span>
                                                                        }
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

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
        {planModal && (
            <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4" onClick={() => !planSaving && setPlanModal(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                    <h2 className="text-base font-bold text-slate-800 mb-1">플랜 변경</h2>
                    <p className="text-xs text-slate-500 mb-5">{planModal.hospitalName}</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">플랜</label>
                            <select
                                value={planForm.plan}
                                onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value as PlanType }))}
                                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="free">Free</option>
                                <option value="basic">Basic</option>
                                <option value="plus">Plus</option>
                                <option value="business">Business</option>
                                <option value="ultimate">Maxs</option>
                            </select>
                        </div>
                        {planForm.plan !== 'free' && planForm.plan !== 'ultimate' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">결제 주기</label>
                                <select
                                    value={planForm.cycle}
                                    onChange={e => setPlanForm(f => ({ ...f, cycle: e.target.value as BillingCycle }))}
                                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="monthly">월간</option>
                                    <option value="yearly">연간</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end mt-6">
                        <button
                            onClick={() => setPlanModal(null)}
                            disabled={planSaving}
                            className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleAssignPlan}
                            disabled={planSaving}
                            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {planSaving ? '적용 중...' : '적용'}
                        </button>
                    </div>

                    {/* 무료 체험 관리 섹션 */}
                    {(() => {
                        const h = hospitals.find(x => x.id === planModal.hospitalId);
                        if (!h) return null;
                        const trial = getTrialInfo(h);
                        const isBusy = trialSaving === h.id;
                        return (
                            <div className="mt-5 pt-5 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">무료 체험 관리</p>
                                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                                    <div>
                                        {trial.status === 'unused' && (
                                            <>
                                                <p className="text-xs font-bold text-slate-600">미사용</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">14일 체험 시작 가능</p>
                                            </>
                                        )}
                                        {trial.status === 'active' && (
                                            <>
                                                <p className="text-xs font-bold text-emerald-600">체험 중</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(h.trial_started_at!).toLocaleDateString('ko-KR')} 시작 ·{' '}
                                                    <span className={`font-bold ${(trial.daysLeft ?? 0) <= 3 ? 'text-rose-500' : 'text-slate-600'}`}>D-{trial.daysLeft}</span>
                                                </p>
                                            </>
                                        )}
                                        {trial.status === 'expired' && (
                                            <>
                                                <p className="text-xs font-bold text-rose-500">체험 종료</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">사용 완료됨</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {trial.status === 'unused' && (
                                            <button
                                                onClick={() => setConfirmModal({
                                                    title: '무료 체험 시작',
                                                    message: `${h.name}의 14일 무료 체험을 시작하시겠습니까?`,
                                                    confirmColor: 'indigo',
                                                    confirmLabel: '시작',
                                                    onConfirm: async () => { setConfirmModal(null); await handleStartTrial(h.id); },
                                                })}
                                                disabled={isBusy}
                                                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                            >
                                                {isBusy ? '...' : '체험 시작'}
                                            </button>
                                        )}
                                        {(trial.status === 'active' || trial.status === 'expired') && (
                                            <button
                                                onClick={() => setConfirmModal({
                                                    title: '체험 리셋',
                                                    message: `${h.name}의 무료 체험 기록을 초기화하시겠습니까?\n재시작 가능 상태로 변경됩니다.`,
                                                    confirmColor: 'amber',
                                                    confirmLabel: '리셋',
                                                    onConfirm: async () => { setConfirmModal(null); await handleResetTrial(h.id); },
                                                })}
                                                disabled={isBusy}
                                                className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                            >
                                                {isBusy ? '...' : '체험 리셋'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        )}
        {confirmModal && (
            <ConfirmModal
                title={confirmModal.title}
                message={confirmModal.message}
                confirmColor={confirmModal.confirmColor ?? 'rose'}
                confirmLabel={confirmModal.confirmLabel ?? '확인'}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(null)}
            />
        )}
        {toast && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {toast.message}
            </div>
        )}
        </>
    );
};

export default SystemAdminDashboard;
