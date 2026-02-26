
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { DbProfile, UserRole, PlanType, BillingCycle, DbResetRequest } from '../types';
import { resetService } from '../services/resetService';
import { sanitizeRichHtml } from '../services/htmlSanitizer';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../hooks/useToast';
import { reviewService, UserReview } from '../services/reviewService';
import { contactService, ContactInquiry, InquiryStatus } from '../services/contactService';
import { operationLogService, AnalysisLead } from '../services/operationLogService';
import { pageViewService } from '../services/pageViewService';
import SystemAdminManualTab from './system-admin/SystemAdminManualTab';
import { getErrorMessage } from '../utils/errors';
import { AdminTab, getAdminTabTitle } from './system-admin/adminTabs';
import { decryptProfile } from '../services/mappers';
import { DbHospitalRow, ROLE_MAP } from './system-admin/systemAdminDomain';
import SystemAdminSidebar from './system-admin/SystemAdminSidebar';
import SystemAdminOverviewTab, { SystemAdminKpiCard } from './system-admin/tabs/SystemAdminOverviewTab';
import SystemAdminHospitalsTab from './system-admin/tabs/SystemAdminHospitalsTab';
import SystemAdminResetRequestsTab from './system-admin/tabs/SystemAdminResetRequestsTab';
import SystemAdminUsersTab from './system-admin/tabs/SystemAdminUsersTab';
import SystemAdminBetaCodesTab from './system-admin/tabs/SystemAdminBetaCodesTab';
import SystemAdminPlanManagementTab from './system-admin/tabs/SystemAdminPlanManagementTab';
import SystemAdminReviewsTab from './system-admin/tabs/SystemAdminReviewsTab';
import SystemAdminWaitlistTab from './system-admin/tabs/SystemAdminWaitlistTab';
import SystemAdminInquiriesTab from './system-admin/tabs/SystemAdminInquiriesTab';
import SystemAdminPlanChangeTab from './system-admin/tabs/SystemAdminPlanChangeTab';
import SystemAdminAnalysisLeadsTab, { AnalysisLeadFilter } from './system-admin/tabs/SystemAdminAnalysisLeadsTab';
import SystemAdminTrafficTab from './system-admin/tabs/SystemAdminTrafficTab';
import SystemAdminContentTab from './system-admin/tabs/SystemAdminContentTab';
import SystemAdminConsultationTab from './system-admin/tabs/SystemAdminConsultationTab';
import SystemAdminIntegrationsTab from './system-admin/tabs/SystemAdminIntegrationsTab';
import { consultationService, ConsultationRequest, ConsultationStatus } from '../services/consultationService';
import {
    PlanAssignModal,
    PlanHospitalsModal,
    HospitalDetailModal,
    UserDetailModal,
    InquiryReplyModal,
} from './system-admin/SystemAdminOverlayModals';

interface SystemAdminDashboardProps {
    onLogout: () => void;
    onToggleView: () => void;
    onGoHome: () => void;
}

const SystemAdminDashboard: React.FC<SystemAdminDashboardProps> = ({ onLogout, onToggleView, onGoHome }) => {
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

    // 후기 관리 state
    const [allReviews, setAllReviews] = useState<UserReview[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewTogglingId, setReviewTogglingId] = useState<string | null>(null);
    const [reviewDeletingId, setReviewDeletingId] = useState<string | null>(null);
    const [reviewFeaturingId, setReviewFeaturingId] = useState<string | null>(null);

    // 문의내역 state
    const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
    const [inquiriesLoading, setInquiriesLoading] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
    const [inquiryStatusUpdating, setInquiryStatusUpdating] = useState<string | null>(null);
    const [replyModal, setReplyModal] = useState<ContactInquiry | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [replySending, setReplySending] = useState(false);

    // 대기자 관리 state
    const [waitlist, setWaitlist] = useState<ContactInquiry[]>([]);
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistFilter, setWaitlistFilter] = useState<string>('');
    const [waitlistStatusUpdating, setWaitlistStatusUpdating] = useState<string | null>(null);

    // 플랜 변경 신청 state
    const [planChangeRequests, setPlanChangeRequests] = useState<ContactInquiry[]>([]);
    const [planChangeLoading, setPlanChangeLoading] = useState(false);
    const [selectedPlanChange, setSelectedPlanChange] = useState<ContactInquiry | null>(null);
    const [planChangeStatusUpdating, setPlanChangeStatusUpdating] = useState<string | null>(null);

    // 분석 리드 state
    const [analysisLeads, setAnalysisLeads] = useState<AnalysisLead[]>([]);
    const [analysisLeadsTotal, setAnalysisLeadsTotal] = useState(0);
    const [analysisLeadFilter, setAnalysisLeadFilter] = useState<AnalysisLeadFilter>({});
    const [analysisLeadPage, setAnalysisLeadPage] = useState(0);
    const [analysisLeadsLoading, setAnalysisLeadsLoading] = useState(false);
    const [leadDeletingId, setLeadDeletingId] = useState<string | null>(null);
    const ANALYSIS_LEADS_PER_PAGE = 20;

    // 트래픽 state
    type PageViewRow = { page: string; session_id: string | null; user_id: string | null; referrer: string | null; event_type: string | null; event_data: Record<string, unknown> | null; created_at: string };
    const [trafficData, setTrafficData] = useState<PageViewRow[]>([]);
    const [trafficLoading, setTrafficLoading] = useState(false);
    const [trafficRange, setTrafficRange] = useState<7 | 14 | 30 | 90>(30);

    // 상담 관리 state
    const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
    const [consultationsLoading, setConsultationsLoading] = useState(false);
    const [consultationStatusUpdating, setConsultationStatusUpdating] = useState<string | null>(null);

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

    // 사이드바 배지용 분석 리드 총 건수 로드
    useEffect(() => {
        operationLogService.getAnalysisLeads({ limit: 1 }).then(({ total }) => setAnalysisLeadsTotal(total));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mediaQuery = window.matchMedia('(max-width: 1023px)');

        const syncViewport = () => {
            const isMobile = mediaQuery.matches;
            setIsMobileViewport(isMobile);
            if (!isMobile) {
                setIsMobileSidebarOpen(false);
            }
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

    const handleDeleteLead = async (id: string) => {
        if (!window.confirm('이 리드를 삭제하시겠습니까?')) return;
        setLeadDeletingId(id);
        const result = await operationLogService.deleteAnalysisLead(id);
        setLeadDeletingId(null);
        if (result.success) {
            setAnalysisLeads(prev => prev.filter(l => l.id !== id));
            setAnalysisLeadsTotal(prev => prev - 1);
        }
    };

    const handleTabChange = (tab: AdminTab) => {
        setActiveTab(tab);
        if (isMobileViewport) {
            setIsMobileSidebarOpen(false);
        }
        if (tab === 'reviews' && allReviews.length === 0) {
            setReviewsLoading(true);
            reviewService.getAllReviews()
                .then(setAllReviews)
                .catch(() => showToast('후기 목록을 불러오지 못했습니다.', 'error'))
                .finally(() => setReviewsLoading(false));
        }
        if (tab === 'analysis_leads') {
            loadAnalysisLeads(0, analysisLeadFilter);
        }
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
        if (tab === 'traffic') {
            loadTrafficData(trafficRange);
        }
        if (tab === 'consultations') {
            loadConsultations();
        }
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

    const handlePlanChangeStatusChange = async (item: ContactInquiry, status: InquiryStatus) => {
        setPlanChangeStatusUpdating(item.id);
        try {
            // 완료 처리 시 실제 병원 플랜도 변경
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

    const handleResetTrafficData = async () => {
        if (!window.confirm('page_views 테이블 데이터를 전부 삭제합니다. 계속할까요?')) return;
        try {
            await pageViewService.deleteAll();
            setTrafficData([]);
            showToast('트래픽 데이터가 초기화되었습니다.', 'success');
        } catch {
            showToast('초기화에 실패했습니다.', 'error');
        }
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
                        // 감사 로그 (대상 사용자의 hospital_id 사용)
                        if (profile.hospital_id && currentUserId) {
                            const adminProfile = profiles.find(p => p.id === currentUserId);
                            supabase.from('operation_logs').insert({
                                hospital_id: profile.hospital_id,
                                user_id: currentUserId,
                                user_email: adminProfile?.email ?? '',
                                user_name: adminProfile?.name ?? '',
                                action: 'account_deactivated',
                                description: `${profile.name || profile.email} 계정 정지`,
                                metadata: {
                                    target_user_id: profile.id,
                                    target_email: profile.email,
                                    target_role: profile.role,
                                },
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
                        // 감사 로그 (대상 사용자의 hospital_id 사용)
                        if (profile.hospital_id && currentUserId) {
                            const adminProfile = profiles.find(p => p.id === currentUserId);
                            supabase.from('operation_logs').insert({
                                hospital_id: profile.hospital_id,
                                user_id: currentUserId,
                                user_email: adminProfile?.email ?? '',
                                user_name: adminProfile?.name ?? '',
                                action: 'account_reactivated',
                                description: `${profile.name || profile.email} 계정 복구`,
                                metadata: {
                                    target_user_id: profile.id,
                                    target_email: profile.email,
                                    target_role: profile.role,
                                },
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
        // start_hospital_trial RPC: plan='plus', trial_started_at=now, trial_used=false, plan_expires_at=NULL 설정
        // 직접 DB 업데이트 대신 RPC 사용 → plan 필드도 'plus'로 올바르게 설정됨
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

    const kpiCards: SystemAdminKpiCard[] = [
        {
            label: '등록 병원', value: hospitals.length,
            sub: `플랜: Free ${hospitals.filter(h => h.plan === 'free').length} / 유료 ${hospitals.filter(h => h.plan !== 'free').length}`,
            icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>),
            color: 'indigo', onClick: () => handleTabChange('hospitals'), active: activeTab === 'hospitals',
        },
        {
            label: '전체 회원', value: profiles.length,
            sub: `활성 ${activeCount}명 / 대기 ${pendingCount}명`,
            icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>),
            color: 'purple', onClick: () => handleTabChange('users'), active: activeTab === 'users',
        },
        {
            label: '시스템 상태', value: 'OK',
            sub: 'Supabase 연결 정상',
            icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
            color: 'emerald', onClick: () => { }, active: false,
        },
    ];

    const colorMap: Record<string, { text: string; iconBg: string }> = {
        indigo: { text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
        purple: { text: 'text-purple-600', iconBg: 'bg-purple-100' },
        emerald: { text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
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

    return (
        <>
            <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
                <SystemAdminSidebar
                    activeTab={activeTab}
                    isMobileViewport={isMobileViewport}
                    isMobileSidebarOpen={isMobileSidebarOpen}
                    isSidebarCollapsed={isSidebarCollapsed}
                    pendingResetCount={pendingResetCount}
                    manualEntriesCount={manualEntries.length}
                    pendingInquiryCount={pendingInquiryCount}
                    pendingWaitlistCount={pendingWaitlistCount}
                    pendingPlanChangeCount={pendingPlanChangeCount}
                    analysisLeadsTotal={analysisLeadsTotal}
                    onTabChange={handleTabChange}
                    onToggleView={onToggleView}
                    onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
                    onCollapseSidebar={() => setIsSidebarCollapsed(true)}
                />

                {/* 사이드바 닫힘 시 재열기 버튼 */}
                {!isMobileViewport && isSidebarCollapsed && (
                    <div
                        className="fixed left-0 top-0 z-[260] h-20 w-20"
                        onMouseEnter={() => setIsSidebarToggleVisible(true)}
                        onMouseLeave={() => setIsSidebarToggleVisible(false)}
                    >
                        <div className={`absolute left-3 top-3 group/expand transition-all duration-200 ${isSidebarToggleVisible ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-2 pointer-events-none'}`}>
                            <button
                                type="button"
                                onClick={() => { setIsSidebarCollapsed(false); setIsSidebarToggleVisible(false); }}
                                className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-lg shadow-slate-300/40 hover:border-indigo-300 hover:text-indigo-600 inline-flex items-center justify-center transition-colors"
                                aria-label="사이드바 열기"
                            >
                                <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </button>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap shadow-xl opacity-0 transition-all duration-150 group-hover/expand:opacity-100 group-hover/expand:translate-x-1 pointer-events-none z-50 border border-slate-700">
                                사이드바 열기 (Ctrl/Cmd + \)
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 md:sticky md:top-0 z-[100] shadow-sm flex items-center justify-between gap-2 overflow-x-hidden">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            {isMobileViewport && (
                                <button
                                    type="button"
                                    onClick={() => setIsMobileSidebarOpen(true)}
                                    className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 active:scale-[0.98] transition-all lg:hidden"
                                    aria-label="운영자 메뉴 열기"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 7h16M4 12h16M4 17h16" />
                                    </svg>
                                </button>
                            )}
                            <span className="hidden sm:inline text-xs text-slate-400 font-medium">{dateStr} {dayStr}</span>
                            <div className="hidden sm:block h-4 w-px bg-slate-200" />
                            <h1 className="text-xs sm:text-sm font-bold text-slate-700 truncate whitespace-nowrap leading-tight max-w-[42vw] sm:max-w-none">
                                {getAdminTabTitle(activeTab)}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <button onClick={loadData} className="h-9 sm:h-auto px-2 sm:px-0 text-xs text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 rounded-lg hover:bg-slate-50">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                <span className="hidden sm:inline">새로고침</span>
                            </button>
                            <div className="bg-slate-900 text-white text-[10px] sm:text-xs font-bold py-1.5 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 sm:gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="hidden sm:inline">시스템 정상</span>
                                <span className="sm:hidden">정상</span>
                            </div>
                            <div className="h-4 w-px bg-slate-200" />
                            <button
                                onClick={onGoHome}
                                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                                </svg>
                                홈
                            </button>
                            <button
                                onClick={onLogout}
                                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                                로그아웃
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-x-hidden p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20 text-slate-400">불러오는 중...</div>
                        ) : (
                            <>
                                {activeTab === 'overview' && (
                                    <SystemAdminOverviewTab kpiCards={kpiCards} colorMap={colorMap} />
                                )}

                                {activeTab === 'hospitals' && (
                                    <SystemAdminHospitalsTab
                                        hospitals={hospitals}
                                        trialSaving={trialSaving}
                                        editCountResetting={editCountResetting}
                                        getMasterName={getMasterName}
                                        getHospitalMemberCount={getHospitalMemberCount}
                                        getBizFileName={getBizFileName}
                                        onOpenHospitalDetail={setHospitalDetailModal}
                                        onOpenPlanModal={openPlanAssignModal}
                                        onStartTrial={openStartTrialConfirm}
                                        onResetTrial={openResetTrialConfirm}
                                        onResetEditCount={openResetEditCountConfirm}
                                        onPreviewBizFile={handlePreviewBizFile}
                                        onDownloadBizFile={handleDownloadBizFile}
                                    />
                                )}

                                {activeTab === 'reset_requests' && (
                                    <SystemAdminResetRequestsTab
                                        resetRequests={resetRequests}
                                        hospitals={hospitals}
                                        profiles={profiles}
                                        resetActionLoading={resetActionLoading}
                                        onApproveImmediate={handleApproveImmediateResetRequest}
                                        onApproveScheduled={handleApproveScheduledResetRequest}
                                        onReject={handleRejectResetRequest}
                                        onDelete={handleDeleteResetRequest}
                                    />
                                )}

                                {activeTab === 'users' && (
                                    <SystemAdminUsersTab
                                        profiles={profiles}
                                        currentUserId={currentUserId}
                                        deletingUserId={deletingUserId}
                                        getHospitalName={getHospitalName}
                                        getHospitalPlan={getHospitalPlan}
                                        onOpenUserDetail={setUserDetailModal}
                                        onDeleteUser={handleDeleteUser}
                                        onDeactivateUser={handleDeactivateUser}
                                        onReactivateUser={handleReactivateUser}
                                    />
                                )}

                                {activeTab === 'beta_invites' && (
                                    <SystemAdminBetaCodesTab />
                                )}

                                {/* 사용자 매뉴얼 탭 */}
                                {activeTab === 'plan_management' && (
                                    <SystemAdminPlanManagementTab
                                        planCapacities={planCapacities}
                                        planUsages={planUsages}
                                        planCapacityEditing={planCapacityEditing}
                                        planCapacitySaving={planCapacitySaving}
                                        onSelectPlanHospital={(plan, label) => setPlanHospitalModal({ plan, label })}
                                        onStartEditCapacity={(plan, capacity) => setPlanCapacityEditing(prev => ({ ...prev, [plan]: capacity }))}
                                        onChangeEditCapacity={(plan, value) => setPlanCapacityEditing(prev => ({ ...prev, [plan]: value }))}
                                        onCancelEditCapacity={(plan) => setPlanCapacityEditing(prev => { const next = { ...prev }; delete next[plan]; return next; })}
                                        onSaveCapacity={handleSavePlanCapacity}
                                    />
                                )}

                                {activeTab === 'reviews' && (
                                    <SystemAdminReviewsTab
                                        reviewsLoading={reviewsLoading}
                                        reviews={allReviews}
                                        reviewTogglingId={reviewTogglingId}
                                        reviewDeletingId={reviewDeletingId}
                                        reviewFeaturingId={reviewFeaturingId}
                                        onTogglePublic={handleToggleReviewPublic}
                                        onToggleFeatured={handleToggleReviewFeatured}
                                        onRequestDelete={requestDeleteReview}
                                    />
                                )}

                                {activeTab === 'inquiries' && (
                                    <SystemAdminInquiriesTab
                                        inquiries={inquiries}
                                        inquiriesLoading={inquiriesLoading}
                                        selectedInquiry={selectedInquiry}
                                        inquiryStatusUpdating={inquiryStatusUpdating}
                                        onSelectInquiry={setSelectedInquiry}
                                        onUpdateInquiryStatus={handleInquiryStatusChange}
                                        onOpenReply={openInquiryReplyModal}
                                        onDeleteInquiry={requestDeleteInquiry}
                                    />
                                )}

                                {activeTab === 'waitlist' && (
                                    <SystemAdminWaitlistTab
                                        waitlist={waitlist}
                                        waitlistLoading={waitlistLoading}
                                        waitlistFilter={waitlistFilter}
                                        waitlistStatusUpdating={waitlistStatusUpdating}
                                        onChangeFilter={setWaitlistFilter}
                                        onRefresh={() => {
                                            setWaitlistLoading(true);
                                            contactService.getWaitlist()
                                                .then(setWaitlist)
                                                .catch(() => showToast('불러오기 실패', 'error'))
                                                .finally(() => setWaitlistLoading(false));
                                        }}
                                        onChangeStatus={handleWaitlistStatusChange}
                                    />
                                )}

                                {activeTab === 'plan_change_requests' && (
                                    <SystemAdminPlanChangeTab
                                        requests={planChangeRequests}
                                        loading={planChangeLoading}
                                        selected={selectedPlanChange}
                                        statusUpdating={planChangeStatusUpdating}
                                        onSelect={setSelectedPlanChange}
                                        onUpdateStatus={handlePlanChangeStatusChange}
                                        onDelete={(item) => {
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
                                        }}
                                        onRefresh={() => {
                                            setPlanChangeLoading(true);
                                            contactService.getPlanChangeRequests()
                                                .then(setPlanChangeRequests)
                                                .catch(() => showToast('불러오기 실패', 'error'))
                                                .finally(() => setPlanChangeLoading(false));
                                        }}
                                    />
                                )}

                                {activeTab === 'analysis_leads' && (
                                    <SystemAdminAnalysisLeadsTab
                                        filter={analysisLeadFilter}
                                        total={analysisLeadsTotal}
                                        leads={analysisLeads}
                                        loading={analysisLeadsLoading}
                                        page={analysisLeadPage}
                                        perPage={ANALYSIS_LEADS_PER_PAGE}
                                        deletingLeadId={leadDeletingId}
                                        onChangeFilter={handleAnalysisLeadFilterChange}
                                        onDeleteLead={handleDeleteLead}
                                        onPrevPage={handlePrevAnalysisLeadsPage}
                                        onNextPage={handleNextAnalysisLeadsPage}
                                    />
                                )}

                                {activeTab === 'traffic' && (
                                    <SystemAdminTrafficTab
                                        trafficData={trafficData}
                                        trafficLoading={trafficLoading}
                                        trafficRange={trafficRange}
                                        onLoadTrafficData={loadTrafficData}
                                        onResetTrafficData={handleResetTrafficData}
                                    />
                                )}

                                {activeTab === 'manual' && (
                                    <SystemAdminManualTab
                                        entries={manualEntries}
                                        selectedId={manualSelectedId}
                                        editingEntry={manualEditing}
                                        form={manualForm}
                                        categories={MANUAL_CATEGORIES}
                                        isSaving={manualSaving}
                                        onCreateNew={() => {
                                            setManualEditing(null);
                                            setManualForm({ title: '', content: '', category: '일반' });
                                            setManualSelectedId('__new__');
                                        }}
                                        onSelectEntry={(entryId) => {
                                            setManualSelectedId(entryId);
                                            setManualEditing(null);
                                            setManualForm({ title: '', content: '', category: '일반' });
                                        }}
                                        onCategoryChange={(category) => setManualForm((prev) => ({ ...prev, category }))}
                                        onTitleChange={(title) => setManualForm((prev) => ({ ...prev, title }))}
                                        onContentChange={(content) => setManualForm((prev) => ({ ...prev, content }))}
                                        onCancelEdit={() => {
                                            setManualEditing(null);
                                            setManualForm({ title: '', content: '', category: '일반' });
                                            setManualSelectedId(null);
                                        }}
                                        onSave={saveManual}
                                        onStartEdit={(entry) => {
                                            setManualEditing(entry);
                                            setManualForm({ title: entry.title, content: entry.content, category: entry.category });
                                        }}
                                        onDelete={deleteManual}
                                    />
                                )}

                                {activeTab === 'content' && (
                                    <SystemAdminContentTab />
                                )}

                                {activeTab === 'consultations' && (
                                    <SystemAdminConsultationTab
                                        consultations={consultations}
                                        loading={consultationsLoading}
                                        statusUpdating={consultationStatusUpdating}
                                        onUpdateStatus={handleConsultationStatusUpdate}
                                        onDelete={handleDeleteConsultation}
                                        onRefresh={loadConsultations}
                                    />
                                )}

                                {activeTab === 'integrations' && (
                                    <SystemAdminIntegrationsTab />
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
            <PlanAssignModal
                modal={planModal}
                hospitals={hospitals}
                planForm={planForm}
                planSaving={planSaving}
                trialSaving={trialSaving}
                onClose={() => setPlanModal(null)}
                onChangePlan={(plan) => setPlanForm(prev => ({ ...prev, plan }))}
                onChangeCycle={(cycle) => setPlanForm(prev => ({ ...prev, cycle }))}
                onAssignPlan={handleAssignPlan}
                onRequestStartTrial={openStartTrialConfirm}
                onRequestResetTrial={openResetTrialConfirm}
            />
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
            <PlanHospitalsModal
                modal={planHospitalModal}
                hospitals={hospitals}
                onClose={() => setPlanHospitalModal(null)}
                getHospitalMemberCount={getHospitalMemberCount}
                getMasterName={getMasterName}
            />
            <HospitalDetailModal
                hospital={hospitalDetailModal}
                onClose={() => setHospitalDetailModal(null)}
                getHospitalMemberCount={getHospitalMemberCount}
                getMasterName={getMasterName}
            />
            <UserDetailModal
                userDetail={userDetailModal}
                currentUserId={currentUserId}
                deletingUserId={deletingUserId}
                onClose={() => setUserDetailModal(null)}
                getHospitalName={getHospitalName}
                getHospitalPlan={getHospitalPlan}
                onDeleteUser={(profile) => {
                    setUserDetailModal(null);
                    handleDeleteUser(profile);
                }}
            />
            <InquiryReplyModal
                inquiry={replyModal}
                replyMessage={replyMessage}
                replySending={replySending}
                onClose={() => setReplyModal(null)}
                onChangeReplyMessage={setReplyMessage}
                onSend={handleSendReply}
            />
        </>
    );
};

export default SystemAdminDashboard;
