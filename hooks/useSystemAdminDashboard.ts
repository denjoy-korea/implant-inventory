import { useState, useEffect } from 'react';
import { useToast } from './useToast';
import { AdminTab } from '../components/system-admin/adminTabs';
import { useAdminReviews } from './admin/useAdminReviews';
import { useAdminManuals, MANUAL_CATEGORIES } from './admin/useAdminManuals';
import { useAdminAnalysisLeads, ANALYSIS_LEADS_PER_PAGE } from './admin/useAdminAnalysisLeads';
import { useAdminContacts } from './admin/useAdminContacts';
import { useAdminUsers } from './admin/useAdminUsers';
import type { ConfirmModalState } from './admin/adminTypes';

export type { PageViewRow } from './admin/useAdminUsers';
export type { PlanCapacity, PlanUsage } from './admin/useAdminUsers';
export type { ManualEntry } from './admin/useAdminManuals';
export { ANALYSIS_LEADS_PER_PAGE, MANUAL_CATEGORIES };

export function useSystemAdminDashboard() {
    // ── Shared UI state ────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSidebarToggleVisible, setIsSidebarToggleVisible] = useState(false);
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

    const { toast, showToast } = useToast();

    // ── Sub-hooks ──────────────────────────────────────────────
    const manuals = useAdminManuals(setConfirmModal);
    const reviews = useAdminReviews(showToast, setConfirmModal);
    const analysisLeads = useAdminAnalysisLeads(setConfirmModal);
    const contacts = useAdminContacts(showToast, setConfirmModal);
    const users = useAdminUsers(showToast, setConfirmModal, manuals.setManualEntries);

    // ── Derived counts ─────────────────────────────────────────
    const activeCount = users.profiles.filter(p => p.status === 'active').length;
    const pendingCount = users.profiles.filter(p => p.status === 'pending').length;
    const pendingResetCount = users.resetRequests.filter(r => r.status === 'pending').length;
    const pendingInquiryCount = contacts.inquiries.filter(i => i.status === 'pending').length;
    const pendingWaitlistCount = contacts.waitlist.filter(w => w.status === 'pending').length;
    const pendingPlanChangeCount = contacts.planChangeRequests.filter(r => r.status === 'pending').length;

    const today = new Date();
    const dateStr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayStr = dayNames[today.getDay()] + '요일';

    // ── Viewport detection ─────────────────────────────────────
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

    // ── Tab change orchestration ───────────────────────────────
    const handleTabChange = (tab: AdminTab) => {
        setActiveTab(tab);
        if (isMobileViewport) setIsMobileSidebarOpen(false);
        if (tab === 'reviews' && reviews.allReviews.length === 0) reviews.loadReviews();
        if (tab === 'analysis_leads') analysisLeads.loadAnalysisLeads(0, analysisLeads.analysisLeadFilter);
        if (tab === 'inquiries' && contacts.inquiries.length === 0) contacts.loadInquiries();
        if (tab === 'waitlist' && contacts.waitlist.length === 0) contacts.loadWaitlist();
        if (tab === 'plan_change_requests' && contacts.planChangeRequests.length === 0) contacts.loadPlanChangeRequests();
        if (tab === 'traffic') users.loadTrafficData(users.trafficRange);
        if (tab === 'consultations') contacts.loadConsultations();
    };

    return {
        activeCount, pendingCount,
        // UI state
        activeTab, isMobileViewport,
        isMobileSidebarOpen, setIsMobileSidebarOpen,
        isSidebarCollapsed, setIsSidebarCollapsed,
        isSidebarToggleVisible, setIsSidebarToggleVisible,
        confirmModal, setConfirmModal,
        toast, dateStr, dayStr,
        handleTabChange,
        // Users domain
        ...users,
        // Manuals domain
        ...manuals,
        // Reviews domain
        ...reviews,
        // Contacts domain
        ...contacts,
        // Analysis leads domain
        ...analysisLeads,
        // Derived
        pendingResetCount, pendingInquiryCount, pendingWaitlistCount, pendingPlanChangeCount,
        ANALYSIS_LEADS_PER_PAGE, MANUAL_CATEGORIES,
    };
}
