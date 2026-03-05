import { useState } from 'react';
import { contactService, ContactInquiry, InquiryStatus } from '../../services/contactService';
import { consultationService, ConsultationRequest, ConsultationStatus } from '../../services/consultationService';
import type { ShowToast, SetConfirmModal } from './adminTypes';

export function useAdminContacts(showToast: ShowToast, setConfirmModal: SetConfirmModal) {
    // Inquiries
    const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
    const [inquiriesLoading, setInquiriesLoading] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
    const [inquiryStatusUpdating, setInquiryStatusUpdating] = useState<string | null>(null);
    const [replyModal, setReplyModal] = useState<ContactInquiry | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [replySending, setReplySending] = useState(false);

    // Waitlist
    const [waitlist, setWaitlist] = useState<ContactInquiry[]>([]);
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistFilter, setWaitlistFilter] = useState<string>('');
    const [waitlistStatusUpdating, setWaitlistStatusUpdating] = useState<string | null>(null);

    // Plan change requests
    const [planChangeRequests, setPlanChangeRequests] = useState<ContactInquiry[]>([]);
    const [planChangeLoading, setPlanChangeLoading] = useState(false);
    const [selectedPlanChange, setSelectedPlanChange] = useState<ContactInquiry | null>(null);
    const [planChangeStatusUpdating, setPlanChangeStatusUpdating] = useState<string | null>(null);

    // Consultations
    const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
    const [consultationsLoading, setConsultationsLoading] = useState(false);
    const [consultationStatusUpdating, setConsultationStatusUpdating] = useState<string | null>(null);

    // ── Inquiries ──────────────────────────────────────────────

    const loadInquiries = () => {
        setInquiriesLoading(true);
        contactService.getAll()
            .then(setInquiries)
            .catch(() => showToast('문의 목록을 불러오지 못했습니다.', 'error'))
            .finally(() => setInquiriesLoading(false));
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

    // ── Waitlist ───────────────────────────────────────────────

    const loadWaitlist = () => {
        setWaitlistLoading(true);
        contactService.getWaitlist()
            .then(setWaitlist)
            .catch(() => showToast('대기자 목록을 불러오지 못했습니다.', 'error'))
            .finally(() => setWaitlistLoading(false));
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

    // ── Plan Change Requests ───────────────────────────────────

    const loadPlanChangeRequests = () => {
        setPlanChangeLoading(true);
        contactService.getPlanChangeRequests()
            .then(setPlanChangeRequests)
            .catch(() => showToast('플랜 변경 신청 목록을 불러오지 못했습니다.', 'error'))
            .finally(() => setPlanChangeLoading(false));
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

    // ── Consultations ──────────────────────────────────────────

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

    return {
        // Inquiries
        inquiries, inquiriesLoading, selectedInquiry, setSelectedInquiry,
        inquiryStatusUpdating, replyModal, setReplyModal, replyMessage, setReplyMessage, replySending,
        loadInquiries, handleInquiryStatusChange, openInquiryReplyModal, handleSendReply, requestDeleteInquiry,
        // Waitlist
        waitlist, waitlistLoading, waitlistFilter, setWaitlistFilter, waitlistStatusUpdating,
        loadWaitlist, handleWaitlistStatusChange, refreshWaitlist,
        // Plan changes
        planChangeRequests, planChangeLoading, selectedPlanChange, setSelectedPlanChange, planChangeStatusUpdating,
        loadPlanChangeRequests, handlePlanChangeStatusChange, refreshPlanChangeRequests, deletePlanChangeRequest,
        // Consultations
        consultations, consultationsLoading, consultationStatusUpdating,
        loadConsultations, handleConsultationStatusUpdate, handleDeleteConsultation,
    };
}
