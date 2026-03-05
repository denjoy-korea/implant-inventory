import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { DbProfile, PlanType, BillingCycle, DbResetRequest } from '../types';
import { resetService } from '../services/resetService';
import { sanitizeRichHtml } from '../services/htmlSanitizer';
import { useToast } from './useToast';
import { reviewService, UserReview } from '../services/reviewService';
import { contactService, ContactInquiry, InquiryStatus } from '../services/contactService';
import { operationLogService, AnalysisLead } from '../services/operationLogService';
import { pageViewService } from '../services/pageViewService';
import { getErrorMessage } from '../utils/errors';
import { AdminTab } from '../components/system-admin/adminTabs';
import { decryptProfile } from '../services/mappers';
import { DbHospitalRow } from '../components/system-admin/systemAdminDomain';
import type { AnalysisLeadFilter } from '../components/system-admin/tabs/SystemAdminAnalysisLeadsTab';
import { consultationService, ConsultationRequest, ConsultationStatus } from '../services/consultationService';

export type PageViewRow = {
    page: string;
    session_id: string | null;
    user_id: string | null;
    referrer: string | null;
    event_type: string | null;
    event_data: Record<string, unknown> | null;
    created_at: string;
};

export interface PlanCapacity { plan: string; capacity: number; }
export interface PlanUsage { plan: string; usage_count: number; }
export interface ManualEntry { id: string; title: string; content: string; category: string; updated_at: string; created_at: string; }

export const ANALYSIS_LEADS_PER_PAGE = 20;
export const MANUAL_CATEGORIES = ['일반', '회원/인증', '플랜/결제', '재고관리', '수술기록', '주문관리', '초기화', '시스템'];

export function useSystemAdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSidebarToggleVisible, setIsSidebarToggleVisible] = useState(false);
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
    const [hospitalDetailModal, setHospitalDetailModal] = useState<DbHospitalRow | null>(null);
    const [userDetailModal, setUserDetailModal] = useState<DbProfile | null>(null);
    const [planHospitalModal, setPlanHospitalModal] = useState<{ plan: string; label: string } | null>(null);

    const [allReviews, setAllReviews] = useState<UserReview[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewTogglingId, setReviewTogglingId] = useState<string | null>(null);
    const [reviewDeletingId, setReviewDeletingId] = useState<string | null>(null);
    const [reviewFeaturingId, setReviewFeaturingId] = useState<string | null>(null);

    const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
    const [inquiriesLoading, setInquiriesLoading] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
    const [inquiryStatusUpdating, setInquiryStatusUpdating] = useState<string | null>(null);
    const [replyModal, setReplyModal] = useState<ContactInquiry | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [replySending, setReplySending] = useState(false);

    const [waitlist, setWaitlist] = useState<ContactInquiry[]>([]);
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistFilter, setWaitlistFilter] = useState<string>('');
    const [waitlistStatusUpdating, setWaitlistStatusUpdating] = useState<string | null>(null);

    const [planChangeRequests, setPlanChangeRequests] = useState<ContactInquiry[]>([]);
    const [planChangeLoading, setPlanChangeLoading] = useState(false);
    const [selectedPlanChange, setSelectedPlanChange] = useState<ContactInquiry | null>(null);
    const [planChangeStatusUpdating, setPlanChangeStatusUpdating] = useState<string | null>(null);

    const [analysisLeads, setAnalysisLeads] = useState<AnalysisLead[]>([]);
    const [analysisLeadsTotal, setAnalysisLeadsTotal] = useState(0);
    const [analysisLeadFilter, setAnalysisLeadFilter] = useState<AnalysisLeadFilter>({});
    const [analysisLeadPage, setAnalysisLeadPage] = useState(0);
    const [analysisLeadsLoading, setAnalysisLeadsLoading] = useState(false);
    const [leadDeletingId, setLeadDeletingId] = useState<string | null>(null);

    const [trafficData, setTrafficData] = useState<PageViewRow[]>([]);
    const [trafficLoading, setTrafficLoading] = useState(false);
    const [trafficRange, setTrafficRange] = useState<7 | 14 | 30 | 90>(30);

    const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
    const [consultationsLoading, setConsultationsLoading] = useState(false);
    const [consultationStatusUpdating, setConsultationStatusUpdating] = useState<string | null>(null);

    const [planCapacities, setPlanCapacities] = useState<PlanCapacity[]>([]);
    const [planUsages, setPlanUsages] = useState<PlanUsage[]>([]);
    const [planCapacityEditing, setPlanCapacityEditing] = useState<Record<string, number>>({});
    const [planCapacitySaving, setPlanCapacitySaving] = useState<string | null>(null);

    const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
    const [manualEditing, setManualEditing] = useState<ManualEntry | null>(null);
    const [manualForm, setManualForm] = useState({ title: '', content: '', category: '일반' });
    const [manualSaving, setManualSaving] = useState(false);
    const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);

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

    const handleCreateNewManual = () => {
        setManualEditing(null);
        setManualForm({ title: '', content: '', category: '일반' });
        setManualSelectedId('__new__');
    };

    const handleSelectManualEntry = (entryId: string) => {
        setManualSelectedId(entryId);
        setManualEditing(null);
        setManualForm({ title: '', content: '', category: '일반' });
    };

    const handleCancelManualEdit = () => {
        setManualEditing(null);
        setManualForm({ title: '', content: '', category: '일반' });
        setManualSelectedId(null);
    };

    const handleStartManualEdit = (entry: ManualEntry) => {
        setManualEditing(entry);
        setManualForm({ title: entry.title, content: entry.content, category: entry.category });
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

        if (profileRes.error || !profileRes.data || (profileRes.data as DbProfile[]).length === 0) {
            const fallback = await supabase.rpc('get_all_profiles');
            if (fallback.data) {
                const decrypted = await Promise.all((fallback.data as DbProfile[]).map(decryptProfile));
                setProfiles(decrypted);
            }
        } else {
            const decrypted = await Promise.all((profileRes.data as DbProfile[]).map(decryptProfile));
            setProfiles(decrypted);
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

        const [capRes, usageRes] = await Promise.all([
            supabase.from('plan_capacities').select('*').order('capacity', { ascending: false }),
            supabase.rpc('get_plan_usage_counts'),
        ]);
        if (capRes.data) setPlanCapacities(capRes.data as PlanCapacity[]);
        if (usageRes.data) setPlanUsages(usageRes.data as PlanUsage[]);

        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        operationLogService.getAnalysisLeads({ limit: 1 }).then(({ total }) => setAnalysisLeadsTotal(total));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mediaQuery = window.matchMedia('(max-width: 1023px)');

        const syncViewport = () => {
            const isMobile = mediaQuery.matches;
            setIsMobileViewport(isMobile);
            if (!isMobile) setIsMobileSidebarOpen(false);
        };

        syncViewport();
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncViewport);
            return () => mediaQuery.removeEventListener('change', syncViewport);
        }
        mediaQuery.addListener(syncViewport);
        return () => mediaQuery.removeListener(syncViewport);
    }, []);

    const loadAnalysisLeads = async (page = analysisLeadPage, filter = analysisLeadFilter) => {
        setAnalysisLeadsLoading(true);
        const { data, total } = await operationLogService.getAnalysisLeads({
            type: filter.type,
            startDate: filter.startDate,
            endDate: filter.endDate,
            limit: ANALYSIS_LEADS_PER_PAGE,
            offset: page * ANALYSIS_LEADS_PER_PAGE,
        });
        setAnalysisLeads(data);
        setAnalysisLeadsTotal(total);
        setAnalysisLeadsLoading(false);
    };

    const handleSendReply = async () => {
        if (!replyModal || !replyMessage.trim()) return;
        setReplySending(true);
        try {
            await contactService.replyInquiry({
                inquiryId: replyModal.id,
                to: replyModal.email,
                contactName: replyModal.contact_name,
                hospitalName: replyModal.hospital_name,
                inquiryType: replyModal.inquiry_type,
                originalContent: replyModal.content,
                replyMessage: replyMessage.trim(),
            });
            const updated = { ...replyModal, status: 'in_progress' as InquiryStatus, admin_note: replyMessage.trim() };
            setInquiries(prev => prev.map(i => i.id === replyModal.id ? updated : i));
            setSelectedInquiry(updated);
            showToast('답변 이메일이 발송되었습니다.', 'success');
            setReplyModal(null);
            setReplyMessage('');
        } catch {
            showToast('이메일 발송에 실패했습니다.', 'error');
        } finally {
            setReplySending(false);
        }
    };

    const handleDeleteLead = (id: string) => {
        setConfirmModal({
            title: '리드 삭제',
            message: '이 리드를 삭제하시겠습니까?',
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setLeadDeletingId(id);
                const result = await operationLogService.deleteAnalysisLead(id);
                setLeadDeletingId(null);
                if (result.success) {
                    setAnalysisLeads(prev => prev.filter(l => l.id !== id));
                    setAnalysisLeadsTotal(prev => prev - 1);
                }
            },
        });
    };

    const handleTabChange = (tab: AdminTab) => {
        setActiveTab(tab);
        if (isMobileViewport) setIsMobileSidebarOpen(false);
        if (tab === 'reviews' && allReviews.length === 0) {
            setReviewsLoading(true);
            reviewService.getAllReviews()
                .then(setAllReviews)
                .catch(() => showToast('후기 목록을 불러오지 못했습니다.', 'error'))
                .finally(() => setReviewsLoading(false));
        }
        if (tab === 'analysis_leads') loadAnalysisLeads(0, analysisLeadFilter);
        if (tab === 'inquiries' && inquiries.length === 0) {
            setInquiriesLoading(true);
            contactService.getAll()
                .then(setInquiries)
                .catch(() => showToast('문의 목록을 불러오지 못했습니다.', 'error'))
                .finally(() => setInquiriesLoading(false));
        }
        if (tab === 'waitlist' && waitlist.length === 0) {
            setWaitlistLoading(true);
            contactService.getWaitlist()
                .then(setWaitlist)
                .catch(() => showToast('대기자 목록을 불러오지 못했습니다.', 'error'))
                .finally(() => setWaitlistLoading(false));
        }
        if (tab === 'plan_change_requests' && planChangeRequests.length === 0) {
            setPlanChangeLoading(true);
            contactService.getPlanChangeRequests()
                .then(setPlanChangeRequests)
                .catch(() => showToast('플랜 변경 신청 목록을 불러오지 못했습니다.', 'error'))
                .finally(() => setPlanChangeLoading(false));
        }
        if (tab === 'traffic') loadTrafficData(trafficRange);
        if (tab === 'consultations') loadConsultations();
    };

    const loadConsultations = () => {
        setConsultationsLoading(true);
        consultationService.getAll()
            .then(setConsultations)
            .catch(() => showToast('상담 목록을 불러오지 못했습니다.', 'error'))
            .finally(() => setConsultationsLoading(false));
    };

    const handleConsultationStatusUpdate = async (
        item: ConsultationRequest,
        status: ConsultationStatus,
        adminNotes?: string,
        scheduledAt?: string | null,
    ) => {
        setConsultationStatusUpdating(item.id);
        try {
            await consultationService.updateStatus(item.id, status, adminNotes, scheduledAt ?? undefined);
            setConsultations(prev => prev.map(c => c.id === item.id
                ? { ...c, status, ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}), ...(scheduledAt !== undefined ? { scheduled_at: scheduledAt } : {}) }
                : c
            ));
        } catch {
            showToast('상태 변경에 실패했습니다.', 'error');
        } finally {
            setConsultationStatusUpdating(null);
        }
    };

    const handleDeleteConsultation = (item: ConsultationRequest) => {
        setConfirmModal({
            title: '상담 신청 삭제',
            message: `${item.name} (${item.hospital_name})의 상담 신청을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`,
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                await consultationService.delete(item.id);
                setConsultations(prev => prev.filter(c => c.id !== item.id));
                showToast('상담 신청이 삭제되었습니다.', 'success');
            },
        });
    };

    const loadTrafficData = (days: 7 | 14 | 30 | 90) => {
        setTrafficRange(days);
        setTrafficLoading(true);
        pageViewService.getRecent(days)
            .then(setTrafficData)
            .catch(() => showToast('트래픽 데이터를 불러오지 못했습니다.', 'error'))
            .finally(() => setTrafficLoading(false));
    };

    const handleToggleReviewPublic = async (review: UserReview) => {
        setReviewTogglingId(review.id);
        try {
            await reviewService.togglePublic(review.id, !review.is_public);
            setAllReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_public: !review.is_public } : r));
        } catch {
            showToast('공개 설정 변경에 실패했습니다.', 'error');
        } finally {
            setReviewTogglingId(null);
        }
    };

    const handleToggleReviewFeatured = async (review: UserReview) => {
        setReviewFeaturingId(review.id);
        try {
            await reviewService.toggleFeatured(review.id, !review.is_featured);
            setAllReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_featured: !review.is_featured } : r));
        } catch {
            showToast('기능소개 설정 변경에 실패했습니다.', 'error');
        } finally {
            setReviewFeaturingId(null);
        }
    };

    const handleDeleteReview = async (id: string) => {
        setReviewDeletingId(id);
        try {
            await reviewService.deleteReview(id);
            setAllReviews(prev => prev.filter(r => r.id !== id));
            showToast('후기가 삭제되었습니다.', 'success');
        } catch {
            showToast('후기 삭제에 실패했습니다.', 'error');
        } finally {
            setReviewDeletingId(null);
        }
    };

    const requestDeleteReview = (review: UserReview) => {
        setConfirmModal({
            title: '후기 삭제',
            message: '이 후기를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.',
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: () => {
                setConfirmModal(null);
                handleDeleteReview(review.id);
            },
        });
    };

    const handleWaitlistStatusChange = async (id: string, status: InquiryStatus) => {
        setWaitlistStatusUpdating(id);
        try {
            await contactService.updateStatus(id, status);
            setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status } : w));
        } catch {
            showToast('상태 변경에 실패했습니다.', 'error');
        } finally {
            setWaitlistStatusUpdating(null);
        }
    };

    const refreshWaitlist = () => {
        setWaitlistLoading(true);
        contactService.getWaitlist()
            .then(setWaitlist)
            .catch(() => showToast('불러오기 실패', 'error'))
            .finally(() => setWaitlistLoading(false));
    };

    const handlePlanChangeStatusChange = async (item: ContactInquiry, status: InquiryStatus) => {
        setPlanChangeStatusUpdating(item.id);
        try {
            if (status === 'resolved') {
                const { success, hospitalId } = await contactService.applyPlanChange(item);
                if (!success) {
                    showToast(
                        hospitalId
                            ? '플랜 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.'
                            : '병원 정보를 찾을 수 없습니다. 이메일을 확인해 주세요.',
                        'error'
                    );
                    return;
                }
            }
            await contactService.updateStatus(item.id, status);
            const updated = { ...item, status };
            setPlanChangeRequests(prev => prev.map(r => r.id === item.id ? updated : r));
            setSelectedPlanChange(updated);
            if (status === 'resolved') showToast('플랜이 변경되었습니다.', 'success');
        } catch {
            showToast('상태 변경에 실패했습니다.', 'error');
        } finally {
            setPlanChangeStatusUpdating(null);
        }
    };

    const refreshPlanChangeRequests = () => {
        setPlanChangeLoading(true);
        contactService.getPlanChangeRequests()
            .then(setPlanChangeRequests)
            .catch(() => showToast('불러오기 실패', 'error'))
            .finally(() => setPlanChangeLoading(false));
    };

    const deletePlanChangeRequest = (item: ContactInquiry) => {
        setConfirmModal({
            title: '신청 삭제',
            message: '이 플랜 변경 신청을 삭제하시겠습니까?',
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                await contactService.delete(item.id);
                setPlanChangeRequests(prev => prev.filter(r => r.id !== item.id));
                if (selectedPlanChange?.id === item.id) setSelectedPlanChange(null);
            },
        });
    };

    const handleInquiryStatusChange = async (inquiry: ContactInquiry, status: InquiryStatus) => {
        setInquiryStatusUpdating(inquiry.id);
        try {
            await contactService.updateStatus(inquiry.id, status);
            const updated = { ...inquiry, status };
            setInquiries(prev => prev.map(item => item.id === inquiry.id ? updated : item));
            setSelectedInquiry(updated);
        } catch {
            showToast('상태 변경에 실패했습니다.', 'error');
        } finally {
            setInquiryStatusUpdating(null);
        }
    };

    const openInquiryReplyModal = (inquiry: ContactInquiry) => {
        setReplyMessage('');
        setReplyModal(inquiry);
    };

    const requestDeleteInquiry = (inquiry: ContactInquiry) => {
        setConfirmModal({
            title: '문의 삭제',
            message: '이 문의를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.',
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                await contactService.delete(inquiry.id);
                setInquiries(prev => prev.filter(item => item.id !== inquiry.id));
                setSelectedInquiry(prev => (prev?.id === inquiry.id ? null : prev));
            },
        });
    };

    const handleAnalysisLeadFilterChange = (filter: AnalysisLeadFilter) => {
        setAnalysisLeadFilter(filter);
        setAnalysisLeadPage(0);
        loadAnalysisLeads(0, filter);
    };

    const handlePrevAnalysisLeadsPage = () => {
        const prevPage = Math.max(0, analysisLeadPage - 1);
        setAnalysisLeadPage(prevPage);
        loadAnalysisLeads(prevPage);
    };

    const handleNextAnalysisLeadsPage = () => {
        const nextPage = analysisLeadPage + 1;
        setAnalysisLeadPage(nextPage);
        loadAnalysisLeads(nextPage);
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
        try {
            const url = new URL(raw);
            const parts = url.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
            const objectIdx = parts.findIndex((p) => p === 'object');
            if (objectIdx >= 0 && parts.length >= objectIdx + 4) {
                const bucket = parts[objectIdx + 2];
                const objectPath = parts.slice(objectIdx + 3).join('/');
                if (bucket && objectPath) return { bucket, objectPath };
            }
            return null;
        } catch {
            // continue
        }
        const cleaned = raw.replace(/^\/+/, '');
        const seg = cleaned.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
        if (seg.length >= 2) return { bucket: seg[0], objectPath: seg.slice(1).join('/') };
        if (seg.length === 1) return { bucket: 'biz-documents', objectPath: seg[0] };
        return null;
    };

    const resolveBizFileAccessUrl = async (hospital: DbHospitalRow): Promise<string> => {
        const rawRef = String(hospital.biz_file_url || '').trim();
        if (!rawRef) throw new Error('NO_BIZ_FILE');

        const parsed = parseBizFileRef(rawRef);
        let lastError: unknown = null;

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

        if (!parsed && /^https?:\/\//i.test(rawRef)) return rawRef;
        if (lastError) throw lastError;
        throw new Error('BIZ_FILE_RESOLVE_FAILED');
    };

    const handlePreviewBizFile = (hospital: DbHospitalRow) => {
        void (async () => {
            try {
                const url = await resolveBizFileAccessUrl(hospital);
                window.open(url, '_blank', 'noopener,noreferrer');
            } catch (error: unknown) {
                const msg = getErrorMessage(error, '');
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
        } catch (error: unknown) {
            const msg = getErrorMessage(error, '');
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

    // Derived values
    const activeCount = profiles.filter(p => p.status === 'active').length;
    const pendingCount = profiles.filter(p => p.status === 'pending').length;
    const pendingResetCount = resetRequests.filter(r => r.status === 'pending').length;
    const pendingInquiryCount = inquiries.filter(i => i.status === 'pending').length;
    const pendingWaitlistCount = waitlist.filter(w => w.status === 'pending').length;
    const pendingPlanChangeCount = planChangeRequests.filter(r => r.status === 'pending').length;

    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayStr = dayNames[today.getDay()] + '요일';

    return {
        activeCount, pendingCount,
        // UI state
        activeTab, isMobileViewport,
        isMobileSidebarOpen, setIsMobileSidebarOpen,
        isSidebarCollapsed, setIsSidebarCollapsed,
        isSidebarToggleVisible, setIsSidebarToggleVisible,
        // Core data
        hospitals, profiles, resetRequests, isLoading,
        // Modal state
        planModal, setPlanModal, planForm, setPlanForm, planSaving,
        trialSaving, resetActionLoading, editCountResetting,
        confirmModal, setConfirmModal,
        deletingUserId, currentUserId,
        hospitalDetailModal, setHospitalDetailModal,
        userDetailModal, setUserDetailModal,
        planHospitalModal, setPlanHospitalModal,
        // Reviews
        allReviews, reviewsLoading, reviewTogglingId, reviewDeletingId, reviewFeaturingId,
        // Inquiries
        inquiries, inquiriesLoading, selectedInquiry, setSelectedInquiry, inquiryStatusUpdating,
        replyModal, setReplyModal, replyMessage, setReplyMessage, replySending,
        // Waitlist
        waitlist, waitlistLoading, waitlistFilter, setWaitlistFilter, waitlistStatusUpdating,
        // Plan changes
        planChangeRequests, planChangeLoading, selectedPlanChange, setSelectedPlanChange, planChangeStatusUpdating,
        // Analysis leads
        analysisLeads, analysisLeadsTotal, analysisLeadFilter, analysisLeadPage, analysisLeadsLoading,
        leadDeletingId, ANALYSIS_LEADS_PER_PAGE,
        // Traffic
        trafficData, trafficLoading, trafficRange,
        // Consultations
        consultations, consultationsLoading, consultationStatusUpdating,
        // Plan management
        planCapacities, planUsages, planCapacityEditing, setPlanCapacityEditing, planCapacitySaving,
        // Manuals
        manualEntries, manualEditing, setManualEditing, manualForm, setManualForm,
        manualSaving, manualSelectedId, setManualSelectedId, MANUAL_CATEGORIES,
        // Derived
        pendingResetCount, pendingInquiryCount, pendingWaitlistCount, pendingPlanChangeCount,
        dateStr, dayStr, toast,
        // Handlers
        loadData, handleTabChange,
        getMasterName, getHospitalMemberCount, getBizFileName, getHospitalName, getHospitalPlan,
        openPlanAssignModal, openStartTrialConfirm, openResetTrialConfirm, openResetEditCountConfirm,
        handlePreviewBizFile, handleDownloadBizFile,
        handleApproveImmediateResetRequest, handleApproveScheduledResetRequest,
        handleRejectResetRequest, handleDeleteResetRequest,
        handleDeleteUser, handleDeactivateUser, handleReactivateUser,
        handleSavePlanCapacity,
        handleToggleReviewPublic, handleToggleReviewFeatured, requestDeleteReview,
        handleInquiryStatusChange, openInquiryReplyModal, requestDeleteInquiry,
        handleWaitlistStatusChange, refreshWaitlist,
        handlePlanChangeStatusChange, refreshPlanChangeRequests, deletePlanChangeRequest,
        handleAnalysisLeadFilterChange, handleDeleteLead,
        handlePrevAnalysisLeadsPage, handleNextAnalysisLeadsPage,
        loadTrafficData, handleResetTrafficData,
        handleAssignPlan,
        saveManual, deleteManual,
        handleCreateNewManual, handleSelectManualEntry, handleCancelManualEdit, handleStartManualEdit,
        handleConsultationStatusUpdate, handleDeleteConsultation, loadConsultations,
        handleSendReply,
    };
}
