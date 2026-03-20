
import React from 'react';
import ConfirmModal from './ConfirmModal';
import { getAdminTabTitle } from './system-admin/adminTabs';
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
import SystemAdminSupportChatTab from './system-admin/tabs/SystemAdminSupportChatTab';
import SystemAdminPlanChangeTab from './system-admin/tabs/SystemAdminPlanChangeTab';
import SystemAdminAnalysisLeadsTab from './system-admin/tabs/SystemAdminAnalysisLeadsTab';
import SystemAdminTrafficTab from './system-admin/tabs/SystemAdminTrafficTab';
import SystemAdminContentTab from './system-admin/tabs/SystemAdminContentTab';
import SystemAdminLecturesTab from './system-admin/tabs/SystemAdminLecturesTab';
import SystemAdminConsultationTab from './system-admin/tabs/SystemAdminConsultationTab';
import SystemAdminIntegrationsTab from './system-admin/tabs/SystemAdminIntegrationsTab';
import SystemAdminBillingTab from './system-admin/tabs/SystemAdminBillingTab';
import SystemAdminManualTab from './system-admin/SystemAdminManualTab';
import {
    PlanAssignModal,
    PlanHospitalsModal,
    HospitalDetailModal,
    UserDetailModal,
    InquiryReplyModal,
} from './system-admin/SystemAdminOverlayModals';
import { useSystemAdminDashboard } from '../hooks/useSystemAdminDashboard';

interface SystemAdminDashboardProps {
    onLogout: () => void;
    onToggleView: () => void;
    onGoHome: () => void;
}

const SystemAdminDashboard: React.FC<SystemAdminDashboardProps> = ({ onLogout, onToggleView, onGoHome }) => {
    const {
        activeTab, isMobileViewport,
        isMobileSidebarOpen, setIsMobileSidebarOpen,
        isSidebarCollapsed, setIsSidebarCollapsed,
        isSidebarToggleVisible, setIsSidebarToggleVisible,
        hospitals, profiles, resetRequests, isLoading,
        planModal, setPlanModal, planForm, setPlanForm, planSaving,
        trialSaving, resetActionLoading, editCountResetting,
        confirmModal, setConfirmModal,
        deletingUserId, currentUserId,
        hospitalDetailModal, setHospitalDetailModal,
        userDetailModal, setUserDetailModal,
        planHospitalModal, setPlanHospitalModal,
        allReviews, reviewsLoading, reviewTogglingId, reviewDeletingId, reviewFeaturingId,
        inquiries, inquiriesLoading, selectedInquiry, setSelectedInquiry, inquiryStatusUpdating,
        replyModal, setReplyModal, replyMessage, setReplyMessage, replySending,
        supportThreads, supportThreadsLoading, selectedSupportThread, supportMessages, supportMessagesLoading,
        supportDraft, setSupportDraft, supportSending, supportStatusUpdating, pendingSupportChatCount,
        supportAlertState, handleSelectSupportThread, handleClearSelectedSupportThread,
        handleSendSupportMessage, handleUpdateSupportThreadStatus, handleEnableSupportAlerts, handleDisableSupportAlerts,
        waitlist, waitlistLoading, waitlistFilter, setWaitlistFilter, waitlistStatusUpdating,
        planChangeRequests, planChangeLoading, selectedPlanChange, setSelectedPlanChange, planChangeStatusUpdating,
        analysisLeads, analysisLeadsTotal, analysisLeadFilter, analysisLeadPage, analysisLeadsLoading,
        leadDeletingId, ANALYSIS_LEADS_PER_PAGE,
        trafficData, trafficLoading, trafficRange,
        consultations, consultationsLoading, consultationStatusUpdating,
        planCapacities, planUsages, planCapacityEditing, setPlanCapacityEditing, planCapacitySaving,
        manualEntries, manualEditing, manualForm, setManualForm,
        manualSaving, manualSelectedId, MANUAL_CATEGORIES,
        activeCount, pendingCount,
        pendingResetCount, pendingInquiryCount, pendingWaitlistCount, pendingPlanChangeCount,
        dateStr, dayStr, toast,
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
    } = useSystemAdminDashboard();

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
                    pendingSupportChatCount={pendingSupportChatCount}
                    pendingWaitlistCount={pendingWaitlistCount}
                    pendingPlanChangeCount={pendingPlanChangeCount}
                    analysisLeadsTotal={analysisLeadsTotal}
                    onTabChange={handleTabChange}
                    onToggleView={onToggleView}
                    onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
                    onCollapseSidebar={() => setIsSidebarCollapsed(true)}
                />

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

                    <main className={`flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 ${
                        activeTab === 'support_chat'
                            ? 'flex min-h-0 flex-col overflow-hidden'
                            : 'overflow-x-hidden space-y-6'
                    }`}>
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

                                {activeTab === 'support_chat' && (
                                    <div className="min-h-0 flex-1">
                                        <SystemAdminSupportChatTab
                                            isMobileViewport={isMobileViewport}
                                            supportThreads={supportThreads}
                                            supportThreadsLoading={supportThreadsLoading}
                                            selectedSupportThread={selectedSupportThread}
                                            supportMessages={supportMessages}
                                            supportMessagesLoading={supportMessagesLoading}
                                            supportDraft={supportDraft}
                                            supportSending={supportSending}
                                            supportStatusUpdating={supportStatusUpdating}
                                            supportAlertState={supportAlertState}
                                            getHospitalName={getHospitalName}
                                            onSelectSupportThread={handleSelectSupportThread}
                                            onClearSelectedSupportThread={handleClearSelectedSupportThread}
                                            onSupportDraftChange={setSupportDraft}
                                            onSendSupportMessage={handleSendSupportMessage}
                                            onUpdateSupportThreadStatus={handleUpdateSupportThreadStatus}
                                            onEnableSupportAlerts={handleEnableSupportAlerts}
                                            onDisableSupportAlerts={handleDisableSupportAlerts}
                                        />
                                    </div>
                                )}

                                {activeTab === 'waitlist' && (
                                    <SystemAdminWaitlistTab
                                        waitlist={waitlist}
                                        waitlistLoading={waitlistLoading}
                                        waitlistFilter={waitlistFilter}
                                        waitlistStatusUpdating={waitlistStatusUpdating}
                                        onChangeFilter={setWaitlistFilter}
                                        onRefresh={refreshWaitlist}
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
                                        onDelete={deletePlanChangeRequest}
                                        onRefresh={refreshPlanChangeRequests}
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
                                        onCreateNew={handleCreateNewManual}
                                        onSelectEntry={handleSelectManualEntry}
                                        onCategoryChange={(category) => setManualForm((prev) => ({ ...prev, category }))}
                                        onTitleChange={(title) => setManualForm((prev) => ({ ...prev, title }))}
                                        onContentChange={(content) => setManualForm((prev) => ({ ...prev, content }))}
                                        onCancelEdit={handleCancelManualEdit}
                                        onSave={saveManual}
                                        onStartEdit={handleStartManualEdit}
                                        onDelete={deleteManual}
                                    />
                                )}

                                {activeTab === 'content' && (
                                    <SystemAdminContentTab />
                                )}
                                {activeTab === 'lectures' && (
                                    <SystemAdminLecturesTab />
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

                                {activeTab === 'billing' && (
                                    <SystemAdminBillingTab />
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
