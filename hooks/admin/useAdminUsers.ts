import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { DbProfile, PlanType, BillingCycle, DbResetRequest } from '../../types';
import { resetService } from '../../services/resetService';
import { pageViewService } from '../../services/pageViewService';
import { decryptProfile } from '../../services/mappers';
import { DbHospitalRow } from '../../components/system-admin/systemAdminDomain';
import { useAdminBizFile } from '../useAdminBizFile';
import { getBizFileName } from '../../utils/bizFileUtils';
import { sanitizeRichHtml } from '../../services/htmlSanitizer';
import { ManualEntry } from './useAdminManuals';
import type { ShowToast, SetConfirmModal } from './adminTypes';

export interface PlanCapacity { plan: string; capacity: number; }
export interface PlanUsage { plan: string; usage_count: number; }

export type PageViewRow = {
    page: string;
    session_id: string | null;
    user_id: string | null;
    referrer: string | null;
    event_type: string | null;
    event_data: Record<string, unknown> | null;
    created_at: string;
};

type ProfileLastAccessRow = {
    id: string;
    last_access_at: string | null;
};

export function useAdminUsers(
    showToast: ShowToast,
    setConfirmModal: SetConfirmModal,
    setManualEntries: (fn: (prev: ManualEntry[]) => ManualEntry[]) => void,
) {
    // Core data
    const [hospitals, setHospitals] = useState<DbHospitalRow[]>([]);
    const [profiles, setProfiles] = useState<DbProfile[]>([]);
    const [resetRequests, setResetRequests] = useState<DbResetRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Plan/trial
    const [planModal, setPlanModal] = useState<{ hospitalId: string; hospitalName: string } | null>(null);
    const [planForm, setPlanForm] = useState<{ plan: PlanType; cycle: BillingCycle }>({ plan: 'free', cycle: 'monthly' });
    const [planSaving, setPlanSaving] = useState(false);
    const [trialSaving, setTrialSaving] = useState<string | null>(null);
    const [planHospitalModal, setPlanHospitalModal] = useState<{ plan: string; label: string } | null>(null);

    // Reset/edit
    const [resetActionLoading, setResetActionLoading] = useState<string | null>(null);
    const [editCountResetting, setEditCountResetting] = useState<string | null>(null);

    // Delete/detail
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [hospitalDetailModal, setHospitalDetailModal] = useState<DbHospitalRow | null>(null);
    const [userDetailModal, setUserDetailModal] = useState<DbProfile | null>(null);

    // Plan capacities
    const [planCapacities, setPlanCapacities] = useState<PlanCapacity[]>([]);
    const [planUsages, setPlanUsages] = useState<PlanUsage[]>([]);
    const [planCapacityEditing, setPlanCapacityEditing] = useState<Record<string, number>>({});
    const [planCapacitySaving, setPlanCapacitySaving] = useState<string | null>(null);

    // Traffic
    const [trafficData, setTrafficData] = useState<PageViewRow[]>([]);
    const [trafficLoading, setTrafficLoading] = useState(false);
    const [trafficRange, setTrafficRange] = useState<7 | 14 | 30 | 90>(30);

    const { handlePreviewBizFile, handleDownloadBizFile, handleResetEditCount } = useAdminBizFile({
        showToast, setHospitals, setEditCountResetting,
    });

    const loadData = async () => {
        setIsLoading(true);
        const [profileRes, lastAccessRes, hospitalRes, resetData, manualRes, sessionRes] = await Promise.all([
            supabase.rpc('get_all_profiles_with_last_login'),
            supabase.rpc('get_profiles_last_access_map'),
            supabase.from('hospitals').select('*'),
            resetService.getAllRequests(),
            supabase.from('admin_manuals').select('*').order('created_at', { ascending: false }),
            supabase.auth.getUser(),
        ]);

        const lastAccessMap = new Map<string, string>();
        if (lastAccessRes.data) {
            for (const row of (lastAccessRes.data as ProfileLastAccessRow[])) {
                if (row.last_access_at) lastAccessMap.set(row.id, row.last_access_at);
            }
        }

        const mergeLastAccess = (rows: DbProfile[]): DbProfile[] => rows.map((row) => {
            const lastAccessAt = lastAccessMap.get(row.id);
            if (!lastAccessAt) return row;
            return {
                ...row,
                last_active_at: row.last_active_at ?? lastAccessAt,
                last_sign_in_at: row.last_sign_in_at ?? lastAccessAt,
            };
        });

        if (profileRes.error || !profileRes.data || (profileRes.data as DbProfile[]).length === 0) {
            const fallback = await supabase.rpc('get_all_profiles');
            if (fallback.data) {
                const decrypted = await Promise.all((fallback.data as DbProfile[]).map(decryptProfile));
                setProfiles(mergeLastAccess(decrypted));
            }
        } else {
            const decrypted = await Promise.all((profileRes.data as DbProfile[]).map(decryptProfile));
            setProfiles(mergeLastAccess(decrypted));
        }

        if (sessionRes.data?.user) setCurrentUserId(sessionRes.data.user.id);
        if (hospitalRes.data) setHospitals(hospitalRes.data as DbHospitalRow[]);
        setResetRequests(resetData);

        if (manualRes.data) {
            const sanitized = (manualRes.data as ManualEntry[]).map((entry) => ({
                ...entry,
                content: sanitizeRichHtml(String(entry.content || '')),
            }));
            setManualEntries(() => sanitized);
        }

        const [capRes, usageRes] = await Promise.all([
            supabase.from('plan_capacities').select('*').order('capacity', { ascending: false }),
            supabase.rpc('get_plan_usage_counts'),
        ]);
        if (capRes.data) setPlanCapacities(capRes.data as PlanCapacity[]);
        if (usageRes.data) setPlanUsages(usageRes.data as PlanUsage[]);

        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    // ── Derived ────────────────────────────────────────────────

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

    // ── Plan management ────────────────────────────────────────

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

    const openPlanAssignModal = (hospital: DbHospitalRow) => {
        setPlanModal({ hospitalId: hospital.id, hospitalName: hospital.name });
        setPlanForm({ plan: hospital.plan as PlanType, cycle: (hospital.billing_cycle as BillingCycle) || 'monthly' });
    };

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

    // ── Trial ──────────────────────────────────────────────────

    const handleStartTrial = async (hospitalId: string) => {
        setTrialSaving(hospitalId);
        const { data, error } = await supabase.rpc('start_hospital_trial', {
            p_hospital_id: hospitalId,
            p_plan: 'plus',
        });
        if (error || !data) {
            showToast('체험 시작 실패: ' + (error?.message || '체험이 이미 시작되었거나 리셋이 필요합니다'), 'error');
        } else {
            const now = new Date().toISOString();
            setHospitals(prev => prev.map(h => h.id === hospitalId
                ? { ...h, trial_started_at: now, trial_used: false, plan: 'plus', plan_expires_at: null, billing_cycle: null }
                : h
            ));
            showToast('14일 무료 체험(Plus)이 시작됐습니다.', 'success');
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

    const openStartTrialConfirm = (hospital: DbHospitalRow) => {
        setConfirmModal({
            title: '무료 체험 시작',
            message: `${hospital.name}의 14일 무료 체험을 시작하시겠습니까?`,
            confirmColor: 'indigo',
            confirmLabel: '시작',
            onConfirm: async () => { setConfirmModal(null); await handleStartTrial(hospital.id); },
        });
    };

    const openResetTrialConfirm = (hospital: DbHospitalRow) => {
        setConfirmModal({
            title: '체험 리셋',
            message: `${hospital.name}의 무료 체험 기록을 초기화하시겠습니까?\n재시작 가능 상태로 변경됩니다.`,
            confirmColor: 'amber',
            confirmLabel: '리셋',
            onConfirm: async () => { setConfirmModal(null); await handleResetTrial(hospital.id); },
        });
    };

    const openResetEditCountConfirm = (hospital: DbHospitalRow) => {
        setConfirmModal({
            title: '사용이력 초기화',
            message: `${hospital.name}의 기초재고 편집 사용이력을 0으로 초기화하시겠습니까?`,
            confirmColor: 'amber',
            confirmLabel: '초기화',
            onConfirm: async () => { setConfirmModal(null); await handleResetEditCount(hospital.id); },
        });
    };

    // ── User management ────────────────────────────────────────

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

    const handleDeactivateUser = (profile: DbProfile) => {
        if (profile.role === 'admin') {
            showToast('운영자 계정은 정지할 수 없습니다.', 'error');
            return;
        }
        setConfirmModal({
            title: '계정 정지',
            message: `"${profile.name}" 회원을 일시 정지하시겠습니까?\n\n해당 회원은 로그인은 가능하지만 서비스 접근이 제한됩니다.\n언제든지 복구할 수 있습니다.`,
            confirmColor: 'indigo',
            confirmLabel: '정지',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ status: 'paused' })
                        .eq('id', profile.id);
                    if (error) {
                        showToast('정지에 실패했습니다.', 'error');
                    } else {
                        showToast(`${profile.name} 회원이 정지되었습니다.`, 'success');
                        setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, status: 'paused' as const } : p));
                        if (profile.hospital_id && currentUserId) {
                            const adminProfile = profiles.find(p => p.id === currentUserId);
                            supabase.from('operation_logs').insert({
                                hospital_id: profile.hospital_id,
                                user_id: currentUserId,
                                user_email: adminProfile?.email ?? '',
                                user_name: adminProfile?.name ?? '',
                                action: 'account_deactivated',
                                description: `${profile.name || profile.email} 계정 정지`,
                                metadata: { target_user_id: profile.id, target_email: profile.email, target_role: profile.role },
                            }).then(({ error: logErr }) => {
                                if (logErr) console.warn('[audit] deactivate log failed:', logErr);
                            });
                        }
                    }
                } catch {
                    showToast('오류가 발생했습니다.', 'error');
                }
            },
        });
    };

    const handleReactivateUser = (profile: DbProfile) => {
        setConfirmModal({
            title: '계정 복구',
            message: `"${profile.name}" 회원의 정지를 해제하고 계정을 복구하시겠습니까?`,
            confirmColor: 'indigo',
            confirmLabel: '복구',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ status: 'active' })
                        .eq('id', profile.id);
                    if (error) {
                        showToast('복구에 실패했습니다.', 'error');
                    } else {
                        showToast(`${profile.name} 회원이 복구되었습니다.`, 'success');
                        setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, status: 'active' as const } : p));
                        if (profile.hospital_id && currentUserId) {
                            const adminProfile = profiles.find(p => p.id === currentUserId);
                            supabase.from('operation_logs').insert({
                                hospital_id: profile.hospital_id,
                                user_id: currentUserId,
                                user_email: adminProfile?.email ?? '',
                                user_name: adminProfile?.name ?? '',
                                action: 'account_reactivated',
                                description: `${profile.name || profile.email} 계정 복구`,
                                metadata: { target_user_id: profile.id, target_email: profile.email, target_role: profile.role },
                            }).then(({ error: logErr }) => {
                                if (logErr) console.warn('[audit] reactivate log failed:', logErr);
                            });
                        }
                    }
                } catch {
                    showToast('오류가 발생했습니다.', 'error');
                }
            },
        });
    };

    // ── Reset requests ─────────────────────────────────────────

    const handleApproveImmediateResetRequest = (request: DbResetRequest, hospitalName: string) => {
        setConfirmModal({
            title: '즉시 초기화',
            message: `${hospitalName}의 모든 데이터를 즉시 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            confirmColor: 'rose',
            confirmLabel: '즉시 초기화',
            onConfirm: async () => {
                setConfirmModal(null);
                setResetActionLoading(request.id);
                const ok = await resetService.approveImmediate(request.id, request.hospital_id);
                if (ok) await loadData();
                else showToast('초기화에 실패했습니다.', 'error');
                setResetActionLoading(null);
            },
        });
    };

    const handleApproveScheduledResetRequest = (request: DbResetRequest, hospitalName: string) => {
        setConfirmModal({
            title: '7일 후 초기화 예약',
            message: `${hospitalName}의 데이터를 7일 후 초기화 예약하시겠습니까?\n신청자가 기간 내 취소할 수 있습니다.`,
            confirmColor: 'amber',
            confirmLabel: '예약',
            onConfirm: async () => {
                setConfirmModal(null);
                setResetActionLoading(request.id);
                const ok = await resetService.approveScheduled(request.id);
                if (ok) await loadData();
                else showToast('예약에 실패했습니다.', 'error');
                setResetActionLoading(null);
            },
        });
    };

    const handleRejectResetRequest = (request: DbResetRequest) => {
        setConfirmModal({
            title: '요청 거절',
            message: '이 요청을 거절하시겠습니까?',
            confirmColor: 'rose',
            confirmLabel: '거절',
            onConfirm: async () => {
                setConfirmModal(null);
                setResetActionLoading(request.id);
                await resetService.rejectRequest(request.id);
                await loadData();
                setResetActionLoading(null);
            },
        });
    };

    const handleDeleteResetRequest = (request: DbResetRequest, hospitalName: string) => {
        setConfirmModal({
            title: '요청 삭제',
            message: `${hospitalName}의 초기화 요청 레코드를 삭제하시겠습니까?`,
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                setResetActionLoading(request.id);
                const ok = await resetService.deleteRequest(request.id);
                if (ok) await loadData();
                else showToast('삭제에 실패했습니다.', 'error');
                setResetActionLoading(null);
            },
        });
    };

    // ── Traffic ────────────────────────────────────────────────

    const loadTrafficData = (days: 7 | 14 | 30 | 90) => {
        setTrafficRange(days);
        setTrafficLoading(true);
        pageViewService.getRecent(days)
            .then(setTrafficData)
            .catch(() => showToast('트래픽 데이터를 불러오지 못했습니다.', 'error'))
            .finally(() => setTrafficLoading(false));
    };

    const handleResetTrafficData = () => {
        setConfirmModal({
            title: '트래픽 데이터 초기화',
            message: 'page_views 테이블 데이터를 전부 삭제합니다. 계속할까요?',
            confirmColor: 'rose',
            confirmLabel: '초기화',
            onConfirm: async () => {
                try {
                    await pageViewService.deleteAll();
                    setTrafficData([]);
                    showToast('트래픽 데이터가 초기화되었습니다.', 'success');
                } catch {
                    showToast('초기화에 실패했습니다.', 'error');
                }
            },
        });
    };

    return {
        // Core
        hospitals, profiles, resetRequests, isLoading, currentUserId,
        // Plan/trial
        planModal, setPlanModal, planForm, setPlanForm, planSaving,
        trialSaving, planHospitalModal, setPlanHospitalModal,
        // Reset/edit
        resetActionLoading, editCountResetting,
        // Delete/detail
        deletingUserId,
        hospitalDetailModal, setHospitalDetailModal,
        userDetailModal, setUserDetailModal,
        // Plan capacities
        planCapacities, planUsages, planCapacityEditing, setPlanCapacityEditing, planCapacitySaving,
        // Traffic
        trafficData, trafficLoading, trafficRange,
        // Derived
        getHospitalName, getMasterName, getHospitalMemberCount, getHospitalPlan, getBizFileName,
        // Handlers
        loadData,
        openPlanAssignModal, handleAssignPlan,
        openStartTrialConfirm, openResetTrialConfirm, openResetEditCountConfirm,
        handlePreviewBizFile, handleDownloadBizFile,
        handleSavePlanCapacity,
        handleDeleteUser, handleDeactivateUser, handleReactivateUser,
        handleApproveImmediateResetRequest, handleApproveScheduledResetRequest,
        handleRejectResetRequest, handleDeleteResetRequest,
        loadTrafficData, handleResetTrafficData,
    };
}
