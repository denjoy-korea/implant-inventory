
import React, { useState, useEffect, useCallback } from 'react';
import { User, HospitalPlanState, PLAN_NAMES, PLAN_PRICING, PlanType, BillingCycle, TrustedDevice, isSystemAdminRole } from '../types';
import type { DbBillingHistory } from '../types';
import { authService } from '../services/authService';
import { planService } from '../services/planService';
import { calcRefundPreview, requestRefund } from '../services/refundService';
import type { RefundPreview } from '../services/refundService';
import PlanBadge from './PlanBadge';
import { UNLIMITED_DAYS } from '../constants';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';
import { resetService } from '../services/resetService';
import ReviewsTab from './profile/ReviewsTab';
import WithdrawFlowModal from './profile/WithdrawFlowModal';
import UserPlanPickerPanel from './profile/UserPlanPickerPanel';
import SocialIdentityLinkSection from './profile/SocialIdentityLinkSection';
import ReferralSection from './profile/ReferralSection';

interface UserProfileProps {
    user: User;
    planState?: HospitalPlanState | null;
    hospitalName?: string;
    onClose: () => void;
    onDeleteAccount?: () => void;
    onChangePlan?: (plan: PlanType, billing: BillingCycle) => void;
    initialTab?: 'info' | 'plan' | 'security' | 'reviews' | 'referral';
}

const UserProfile: React.FC<UserProfileProps> = ({ user, planState, hospitalName, onClose, onDeleteAccount, onChangePlan, initialTab }) => {
    const isStaff = user.role === 'staff';
    const isSystemAdmin = isSystemAdminRole(user.role, user.email);
    const isUltimatePlan = isSystemAdmin || planState?.plan === 'ultimate';
    const canShowReferral = !isStaff && !isSystemAdmin;
    const linkSuccessProvider = localStorage.getItem('_link_success_provider');
    const [activeTab, setActiveTab] = useState<'info' | 'plan' | 'security' | 'reviews' | 'referral'>(
        initialTab ?? (linkSuccessProvider ? 'security' : 'info')
    );
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [editPhone, setEditPhone] = useState(user.phone || '');
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmColor?: 'rose' | 'indigo'; onConfirm: () => void } | null>(null);
    const { toast, showToast } = useToast();
    // MFA 상태
    const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled ?? false);
    const [isMfaToggling, setIsMfaToggling] = useState(false);
    const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);
    const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
    const [linkedIdentities, setLinkedIdentities] = useState<{ id: string; provider: string }[]>([]);
    const [isLinkingProvider, setIsLinkingProvider] = useState<string | null>(null);
    // 탈퇴 사유 모달
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawReasons, setWithdrawReasons] = useState<string[]>([]);
    const [withdrawCustom, setWithdrawCustom] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [featureRequest, setFeatureRequest] = useState('');
    const [wouldStayForFeature, setWouldStayForFeature] = useState<boolean | null>(null);
    const [isPausing, setIsPausing] = useState(false);
    const [pauseSuccess, setPauseSuccess] = useState(false);
    // 비밀번호 변경
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    // 이직 데이터 초기화
    const [resetReason, setResetReason] = useState('');
    const [isRequestingReset, setIsRequestingReset] = useState(false);
    const [activeResetRequest, setActiveResetRequest] = useState<{ id: string; status: string; created_at: string } | null>(null);
    const [showResetSection, setShowResetSection] = useState(false);
    const isMaster = user.role === 'master';

    // 활성 초기화 요청 조회
    useEffect(() => {
        if ((isMaster || isSystemAdmin) && user.hospitalId) {
            resetService.getActiveRequest(user.hospitalId).then(req => {
                if (req) setActiveResetRequest({ id: req.id, status: req.status, created_at: req.created_at });
            });
        }
    }, [isMaster, isSystemAdmin, user.hospitalId]);

    const handleRequestReset = async () => {
        if (!user.hospitalId || !resetReason.trim()) return;
        setIsRequestingReset(true);
        const req = await resetService.requestReset(user.hospitalId, resetReason.trim());
        setIsRequestingReset(false);
        if (req) {
            setActiveResetRequest({ id: req.id, status: req.status, created_at: req.created_at });
            setShowResetSection(false);
            setResetReason('');
            showToast('데이터 초기화 요청이 접수되었습니다. 운영팀 검토 후 처리됩니다.', 'success');
        } else {
            showToast('요청에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
        }
    };

    const handleCancelReset = async () => {
        if (!activeResetRequest) return;
        const ok = await resetService.cancelRequest(activeResetRequest.id);
        if (ok) {
            setActiveResetRequest(null);
            showToast('초기화 요청이 취소되었습니다.', 'success');
        } else {
            showToast('취소에 실패했습니다.', 'error');
        }
    };

    // 인라인 플랜 변경
    const [showPlanPicker, setShowPlanPicker] = useState(false);
    const [pickerCycle, setPickerCycle] = useState<'monthly' | 'yearly'>(planState?.billingCycle ?? 'monthly');
    const [pickerSelectedPlan, setPickerSelectedPlan] = useState<PlanType | null>(null);

    // 구독 취소 + 환불 미리보기
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelBilling, setCancelBilling] = useState<DbBillingHistory | null>(null);
    const [cancelRefundPreview, setCancelRefundPreview] = useState<RefundPreview | null>(null);
    const [isCancelLoading, setIsCancelLoading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const handleOpenCancelModal = async () => {
        if (!user.hospitalId) return;
        setIsCancelLoading(true);
        try {
            const billing = await planService.getLatestCompletedBilling(user.hospitalId);
            const preview = billing ? calcRefundPreview(billing) : null;
            setCancelBilling(billing);
            setCancelRefundPreview(preview);
        } catch (error) {
            console.error('[UserProfile] getLatestCompletedBilling failed:', error);
            setCancelBilling(null);
            setCancelRefundPreview(null);
        } finally {
            setIsCancelLoading(false);
            setShowCancelConfirm(true);
        }
    };

    const handleCancelSubscription = async () => {
        if (!user.hospitalId) return;
        setIsCancelling(true);
        try {
            // TossPayments 자동 환불 가능한 경우
            if (cancelBilling?.id && cancelBilling.payment_ref) {
                const result = await requestRefund(cancelBilling.id);
                if (!result.ok) {
                    if (result.isManualPayment) {
                        // 수동 결제: 환불은 이메일로, 플랜만 즉시 취소
                        await planService.cancelSubscription(user.hospitalId);
                        showToast('구독이 취소되었습니다. 환불은 고객지원(admin@denjoy.info)으로 문의해 주세요.', 'success');
                    } else {
                        showToast(result.error ?? '구독 취소에 실패했습니다.', 'error');
                        return;
                    }
                } else {
                    const refundMsg = result.refundAmount > 0
                        ? `구독이 취소되었습니다. ${result.refundAmount.toLocaleString('ko-KR')}원이 환불됩니다 (영업일 5~7일 소요).`
                        : '구독이 취소되었습니다. 무료 플랜으로 전환되었습니다.';
                    showToast(refundMsg, 'success');
                }
            } else {
                // payment_ref 없는 수동 결제 or billing 없음
                await planService.cancelSubscription(user.hospitalId);
                showToast('구독이 취소되었습니다. 환불은 고객지원(admin@denjoy.info)으로 문의해 주세요.', 'success');
            }
            setShowCancelConfirm(false);
            onClose();
        } catch (error) {
            console.error('[UserProfile] cancelSubscription failed:', error);
            showToast('구독 취소에 실패했습니다. 다시 시도해 주세요.', 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    const planName = isUltimatePlan ? 'Ultimate' : (planState ? PLAN_NAMES[planState.plan] : 'Free');
    const billingLabel = planState?.billingCycle === 'yearly' ? '연간' : planState?.billingCycle === 'monthly' ? '월간' : null;
    const pricing = planState ? PLAN_PRICING[planState.plan] : { monthlyPrice: 0, yearlyPrice: 0 };
    const pricePerMonth = billingLabel === '연간' ? pricing.yearlyPrice : pricing.monthlyPrice;
    const priceDisplay = pricePerMonth.toLocaleString('ko-KR');
    const remainingDays = isUltimatePlan ? UNLIMITED_DAYS : (planState?.daysUntilExpiry ?? UNLIMITED_DAYS);
    const totalBillingDays = planState?.billingCycle === 'yearly' ? 365 : 30;
    const progressPercent = remainingDays >= UNLIMITED_DAYS ? 100 : Math.min(100, Math.round(((totalBillingDays - remainingDays) / totalBillingDays) * 100));


    const handleCloseWithdrawModal = () => {
        setShowWithdrawModal(false);
        setWithdrawReasons([]);
        setWithdrawCustom('');
        setFeatureRequest('');
        setWouldStayForFeature(null);
        setPauseSuccess(false);
    };

    const handleWithdraw = async () => {
        if (withdrawReasons.length === 0) return;
        if (withdrawReasons.includes('기타') && !withdrawCustom.trim()) return;
        setIsWithdrawing(true);
        await authService.saveWithdrawalReason(
            withdrawReasons.join(', '),
            withdrawReasons.includes('기타') ? withdrawCustom.trim() : undefined,
        );
        setIsWithdrawing(false);
        setShowWithdrawModal(false);
        onDeleteAccount?.();
    };

    const handlePause = async () => {
        setIsPausing(true);
        await Promise.all([
            authService.pauseAccount(featureRequest),
            planService.cancelSubscription(user.hospitalId),
        ]);
        setIsPausing(false);
        setPauseSuccess(true);
    };

    const formatPhone = (value: string) => {
        const nums = value.replace(/\D/g, '').slice(0, 11);
        if (nums.length <= 3) return nums;
        if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
        return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
    };

    const handlePhoneChange = (val: string) => setEditPhone(formatPhone(val));

    const [isSaving, setIsSaving] = useState(false);

    const loadTrustedDevices = useCallback(async () => {
        setIsLoadingDevices(true);
        const devices = await authService.getTrustedDevices();
        setTrustedDevices(devices);
        setIsLoadingDevices(false);
    }, []);

    // 소셜 연동 완료 후 복귀 시 토스트 표시
    useEffect(() => {
        const provider = localStorage.getItem('_link_success_provider');
        if (provider) {
            localStorage.removeItem('_link_success_provider');
            const label = provider === 'google' ? 'Google' : '카카오';
            showToast(`${label} 계정 연동이 완료되었습니다.`, 'success');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 보안 탭 진입 시 신뢰 기기 목록 + 마지막 로그인 시각 + 소셜 연동 로드
    useEffect(() => {
        if (activeTab === 'security') {
            loadTrustedDevices();
            authService.getLastSignInAt().then(setLastSignInAt);
            authService.getLinkedIdentities().then(setLinkedIdentities);
        }
    }, [activeTab, loadTrustedDevices]);

    const handleToggleMfa = async () => {
        setIsMfaToggling(true);
        const newValue = !mfaEnabled;
        const result = await authService.toggleMfa(newValue);
        setIsMfaToggling(false);
        if (result.success) {
            setMfaEnabled(newValue);
            showToast(newValue ? '2단계 인증이 활성화되었습니다.' : '2단계 인증이 비활성화되었습니다.', 'success');
        } else {
            showToast('설정 변경에 실패했습니다.', 'error');
        }
    };

    const handleRemoveDevice = async (id: string) => {
        const result = await authService.removeTrustedDevice(id);
        if (result.success) {
            setTrustedDevices(prev => prev.filter(d => d.id !== id));
            showToast('신뢰 기기가 제거되었습니다.', 'success');
        } else {
            showToast('기기 제거에 실패했습니다.', 'error');
        }
    };

    const handleUnlinkSocialProvider = async (provider: 'google' | 'kakao', linkedId: string) => {
        const label = provider === 'google' ? 'Google' : '카카오';
        setIsLinkingProvider(provider);
        const result = await authService.unlinkSocialProvider(linkedId);
        if (result.success) {
            setLinkedIdentities(prev => prev.filter(identity => identity.id !== linkedId));
            showToast(`${label} 연동이 해제되었습니다.`, 'success');
        } else {
            showToast(result.error || '연동 해제에 실패했습니다.', 'error');
        }
        setIsLinkingProvider(null);
    };

    const handleLinkSocialProvider = async (provider: 'google' | 'kakao') => {
        setIsLinkingProvider(provider);
        const result = await authService.linkSocialProvider(provider);
        if (!result.success) {
            showToast(result.error || '연동에 실패했습니다.', 'error');
            setIsLinkingProvider(null);
        }
        // 성공 시 OAuth 리다이렉트 → 페이지가 이동하므로 상태 해제 불필요
    };

    const handleRequestPlanChange = () => {
        if (!pickerSelectedPlan) return;
        setShowPlanPicker(false);
        setPickerSelectedPlan(null);
        onChangePlan?.(pickerSelectedPlan, pickerCycle);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await authService.updateProfile({
                name: editName,
                phone: editPhone || null,
            });
            setIsEditing(false);
        } catch (error) {
            showToast('프로필 저장에 실패했습니다.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const canManagePlan = user.role !== 'dental_staff';
    const tabs = [
        { id: 'info' as const, label: '내 정보', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        ...(canManagePlan ? [{ id: 'plan' as const, label: '구독 관리', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> }] : []),
        ...(canShowReferral ? [{ id: 'referral' as const, label: '친구 초대', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }] : []),
        { id: 'security' as const, label: '보안', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
        { id: 'reviews' as const, label: '내 후기', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
    ];

    const roleLabel = isSystemAdmin ? '운영자' : user.role === 'master' ? '담당자' : user.role === 'dental_staff' ? '스태프' : '담당자';

    // 플랜별 카드 스타일
    const planStyles: Record<string, { bg: string; glow1: string; glow2: string; bar: string }> = {
        Free: { bg: 'from-slate-600 via-slate-700 to-slate-600', glow1: 'rgba(148,163,184,0.2)', glow2: 'rgba(100,116,139,0.15)', bar: 'linear-gradient(90deg, #94a3b8, #64748b)' },
        Basic: { bg: 'from-blue-700 via-blue-800 to-blue-700', glow1: 'rgba(59,130,246,0.3)', glow2: 'rgba(37,99,235,0.2)', bar: 'linear-gradient(90deg, #60a5fa, #3b82f6)' },
        Plus: { bg: 'from-indigo-700 via-indigo-800 to-indigo-700', glow1: 'rgba(99,102,241,0.3)', glow2: 'rgba(79,70,229,0.2)', bar: 'linear-gradient(90deg, #818cf8, #6366f1)' },
        Business: { bg: 'from-emerald-700 via-emerald-800 to-emerald-700', glow1: 'rgba(16,185,129,0.3)', glow2: 'rgba(5,150,105,0.2)', bar: 'linear-gradient(90deg, #34d399, #10b981)' },
        Ultimate: { bg: 'from-violet-700 via-purple-900 to-violet-700', glow1: 'rgba(167,139,250,0.35)', glow2: 'rgba(139,92,246,0.25)', bar: 'linear-gradient(90deg, #c4b5fd, #8b5cf6)' },
    };
    const currentPlanStyle = planStyles[planName] || planStyles['Free'];

    return (
        <>
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-2xl flex flex-col overflow-hidden h-[calc(100dvh-112px)] max-h-[640px] md:h-[640px] md:max-h-none">

                {/* 상단 프로필 헤더 */}
                <div className="relative flex-shrink-0">
                    <div className="h-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 h-16 opacity-30" style={{
                            backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 30% 50%, rgba(139,92,246,0.2) 0%, transparent 50%)'
                        }} />
                    </div>
                    <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all z-10">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="px-6 -mt-5 flex items-end gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg border-[3px] border-white bg-gradient-to-br from-slate-700 to-slate-900 text-white flex-shrink-0">
                            {editName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0 pt-6 pb-0.5">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800 truncate">{editName}</h3>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 flex-shrink-0">
                                    {roleLabel}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        </div>
                        {isUltimatePlan ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 mb-0.5 bg-violet-600 text-white">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-300" />
                                Ultimate
                            </span>
                        ) : (
                            <PlanBadge plan={planState?.plan ?? 'free'} size="md" />
                        )}
                    </div>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex flex-shrink-0 border-b border-slate-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2.5 text-[10px] font-bold transition-all relative ${
                                activeTab === tab.id
                                    ? 'text-slate-800'
                                    : 'text-slate-400 hover:text-slate-500'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-slate-800" />
                            )}
                        </button>
                    ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="flex-1 overflow-y-auto px-6 py-4">

                    {activeTab === 'info' && (
                        <div className="space-y-2.5">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">개인정보</h4>
                                    {!isEditing ? (
                                        <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            수정
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">취소</button>
                                            <button onClick={handleSave} disabled={isSaving} className="text-xs font-bold bg-slate-800 text-white px-3 py-1 rounded-lg hover:bg-slate-900 disabled:opacity-50">{isSaving ? '저장 중...' : '저장'}</button>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                    {[
                                        { label: '이름', value: editName, editable: true, editValue: editName, onChange: setEditName, type: 'text' },
                                        { label: '이메일', value: user.email, editable: false },
                                        { label: '연락처', value: editPhone || '미등록', editable: true, editValue: editPhone, onChange: handlePhoneChange, type: 'tel', placeholder: '010-0000-0000', empty: !editPhone },
                                        { label: '회원 유형', value: isSystemAdmin ? '운영자' : user.role === 'master' ? '치과 회원 (담당자)' : user.role === 'dental_staff' ? '치과 회원 (스태프)' : '개인 회원 (담당자)', editable: false },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50/50 transition-colors">
                                            <span className="text-[10px] font-medium text-slate-400 shrink-0">{item.label}</span>
                                            {isEditing && item.editable ? (
                                                <input
                                                    type={item.type || 'text'}
                                                    value={item.editValue}
                                                    onChange={e => item.onChange?.(e.target.value)}
                                                    placeholder={item.placeholder}
                                                    className="text-xs font-medium text-slate-700 text-right bg-white border border-slate-200 rounded-lg px-2 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                                />
                                            ) : (
                                                <span className={`text-xs font-semibold truncate ml-2 ${item.empty ? 'text-slate-300' : 'text-slate-700'}`}>{item.value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{isStaff ? '워크스페이스' : '소속 정보'}</h4>
                                <div className="rounded-xl border border-slate-200 px-3 py-2.5 bg-white">
                                    {user.hospitalId ? (
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-500">
                                                {isStaff ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">{hospitalName || '워크스페이스'}</p>
                                                <p className="text-[10px] text-slate-400">데이터가 안전하게 보호되고 있습니다</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-1">소속된 병원이 없습니다</p>
                                    )}
                                </div>
                            </div>

                            {/* 데이터 초기화 — master 또는 운영자 */}
                            {(isMaster || isSystemAdmin) && user.hospitalId && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">데이터 초기화</h4>

                                    {activeResetRequest ? (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-amber-800">
                                                        초기화 요청 {activeResetRequest.status === 'pending' ? '검토 대기 중' : '처리 예정'}
                                                    </p>
                                                    <p className="text-[10px] text-amber-600 mt-0.5">
                                                        {new Date(activeResetRequest.created_at).toLocaleDateString('ko-KR')}에 요청됨 · 운영팀 검토 후 처리
                                                    </p>
                                                    {activeResetRequest.status === 'scheduled' && (
                                                        <button
                                                            onClick={() => setConfirmModal({
                                                                title: '초기화 요청 취소',
                                                                message: '데이터 초기화 요청을 취소하시겠습니까?',
                                                                onConfirm: handleCancelReset,
                                                            })}
                                                            className="mt-1.5 text-xs font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                                                        >
                                                            요청 취소
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : showResetSection ? (
                                        <div className="rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2.5 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                <div>
                                                    <p className="text-[10px] font-bold text-rose-700">다음 데이터가 모두 삭제됩니다</p>
                                                    <p className="text-[10px] text-rose-600 mt-0.5 leading-relaxed">
                                                        수술기록 · 재고 마스터 · 주문/발주 · 반품/교환 · 재고실사 · FAIL 내역 · 활동로그
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">계정 정보와 구독 플랜은 유지됩니다.</p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1">초기화 사유</label>
                                                <input
                                                    type="text"
                                                    value={resetReason}
                                                    onChange={e => setResetReason(e.target.value)}
                                                    placeholder="예: 데이터 초기화 요청"
                                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setShowResetSection(false); setResetReason(''); }}
                                                    className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({
                                                        title: '데이터 초기화 요청',
                                                        message: '운영팀에 데이터 초기화를 요청합니다.\n승인되면 모든 병원 데이터가 삭제되며 복구할 수 없습니다.\n\n정말 요청하시겠습니까?',
                                                        confirmColor: 'rose',
                                                        onConfirm: handleRequestReset,
                                                    })}
                                                    disabled={!resetReason.trim() || isRequestingReset}
                                                    className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {isRequestingReset ? '요청 중...' : '초기화 요청'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowResetSection(true)}
                                            className="w-full flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 bg-white hover:border-rose-200 hover:bg-rose-50/30 transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-500 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-slate-700 group-hover:text-rose-700 transition-colors">데이터 초기화</p>
                                                <p className="text-[10px] text-slate-400">수술기록, 재고, 주문, 반품/교환, FAIL, 실사 등을 초기화합니다</p>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    )}

                    {activeTab === 'plan' && showPlanPicker && (
                        <UserPlanPickerPanel
                            planState={planState}
                            pickerCycle={pickerCycle}
                            pickerSelectedPlan={pickerSelectedPlan}
                            onClose={() => { setShowPlanPicker(false); setPickerSelectedPlan(null); }}
                            onChangeCycle={setPickerCycle}
                            onSelectPlan={setPickerSelectedPlan}
                            onRequestPlanChange={handleRequestPlanChange}
                        />
                    )}

                    {activeTab === 'plan' && !showPlanPicker && (
                        <div className="space-y-2.5">
                            {/* 만료 임박 배너 (D-30 이하 유료 플랜) */}
                            {planState?.plan !== 'free' && !planState?.isTrialActive && !isUltimatePlan
                              && planState?.daysUntilExpiry !== undefined
                              && planState.daysUntilExpiry <= 30 && planState.daysUntilExpiry > 0 && (
                              <button
                                onClick={() => setShowPlanPicker(true)}
                                className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                                  planState.daysUntilExpiry <= 7
                                    ? 'bg-red-50 border border-red-200 hover:bg-red-100'
                                    : 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${planState.daysUntilExpiry <= 7 ? 'text-red-500' : 'text-amber-500'}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span className={`text-[10px] font-bold ${planState.daysUntilExpiry <= 7 ? 'text-red-700' : 'text-amber-700'}`}>
                                    {planState.daysUntilExpiry <= 7
                                      ? `D-${planState.daysUntilExpiry} — 곧 만료됩니다. 지금 갱신하세요.`
                                      : `D-${planState.daysUntilExpiry} — 만료 전 갱신하면 이어서 이용할 수 있습니다.`}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-black flex-shrink-0 ${planState.daysUntilExpiry <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                                  갱신 →
                                </span>
                              </button>
                            )}
                            <div className={`rounded-2xl px-4 py-3.5 text-white relative overflow-hidden bg-gradient-to-br ${currentPlanStyle.bg}`}>
                                <div className="absolute top-0 right-0 w-40 h-40 rounded-full -mr-16 -mt-16" style={{
                                    background: `radial-gradient(circle, ${currentPlanStyle.glow1} 0%, transparent 70%)`
                                }} />
                                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full -ml-12 -mb-12" style={{
                                    background: `radial-gradient(circle, ${currentPlanStyle.glow2} 0%, transparent 70%)`
                                }} />
                                <div className="relative">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-slate-400 text-[10px] font-medium mb-0.5">현재 플랜</p>
                                            <h3 className="text-2xl font-black tracking-tight">{planName}</h3>
                                        </div>
                                        {!isUltimatePlan && planState?.plan !== 'free' && billingLabel && (
                                            <div className="text-right">
                                                <p className="text-slate-400 text-[10px] font-medium mb-0.5">{billingLabel} 결제</p>
                                                <p className="text-base font-bold">{priceDisplay}<span className="text-xs font-normal text-slate-400">원/월</span></p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        {isUltimatePlan ? (
                                            <>
                                                <div className="flex items-center justify-between text-[10px] mb-1.5">
                                                    <span className="text-slate-400">이용 기간</span>
                                                    <span className="text-white font-bold">평생</span>
                                                </div>
                                                <div className="w-full bg-white/10 rounded-full h-1.5">
                                                    <div className="rounded-full h-1.5" style={{ width: '100%', background: currentPlanStyle.bar }} />
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                                    <span>Ultimate 플랜</span>
                                                    <span>평생 이용</span>
                                                </div>
                                            </>
                                        ) : planState?.isTrialActive ? (
                                            <>
                                                <div className="flex items-center justify-between text-[10px] mb-1.5">
                                                    <span className="text-amber-300">무료 체험</span>
                                                    <span className="text-white font-bold">{planState.trialDaysRemaining}일 남음</span>
                                                </div>
                                                <div className="w-full bg-white/10 rounded-full h-1.5">
                                                    <div className="rounded-full h-1.5 transition-all duration-500" style={{
                                                        width: `${Math.round(((14 - planState.trialDaysRemaining) / 14) * 100)}%`,
                                                        background: currentPlanStyle.bar
                                                    }} />
                                                </div>
                                            </>
                                        ) : planState?.plan === 'free' ? (
                                            <div className="text-center py-0.5">
                                                <p className="text-[10px] text-slate-400">무료 플랜 이용 중</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between text-[10px] mb-1.5">
                                                    <span className="text-slate-400">이용 기간</span>
                                                    <span className="text-white font-bold">{remainingDays >= UNLIMITED_DAYS ? '무기한' : `${remainingDays}일 남음`}</span>
                                                </div>
                                                <div className="w-full bg-white/10 rounded-full h-1.5">
                                                    <div className="rounded-full h-1.5 transition-all duration-500" style={{
                                                        width: `${Math.min(progressPercent, 100)}%`,
                                                        background: currentPlanStyle.bar
                                                    }} />
                                                </div>
                                                {planState?.expiresAt && (
                                                    <div className="text-[10px] text-slate-500 mt-1 text-right">
                                                        만료: {new Date(planState.expiresAt).toLocaleDateString('ko-KR')}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">결제 정보</h4>
                                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                    {(isUltimatePlan ? [
                                        { label: '회원 유형', value: 'Ultimate' },
                                        { label: '다음 결제일', value: '없음' },
                                        { label: '결제 금액', value: '없음' },
                                    ] : planState?.plan === 'free' ? [
                                        { label: '현재 플랜', value: '무료' },
                                        { label: '다음 결제일', value: '없음' },
                                        { label: '결제 금액', value: '0원' },
                                    ] : [
                                        { label: '결제 방식', value: billingLabel ? `${billingLabel} 결제` : '-' },
                                        { label: '다음 결제일', value: planState?.expiresAt ? new Date(planState.expiresAt).toLocaleDateString('ko-KR') : '-' },
                                        { label: '결제 금액', value: billingLabel === '연간' ? `${(pricePerMonth * 12).toLocaleString('ko-KR')}원/년` : `${priceDisplay}원/월` },
                                    ]).map((item, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50/50 transition-colors">
                                            <span className="text-[10px] font-medium text-slate-400">{item.label}</span>
                                            <span className="text-xs font-semibold text-slate-700">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={`rounded-xl border px-3 py-2.5 ${(planState?.creditBalance ?? 0) > 0 ? 'border-teal-200 bg-teal-50' : 'border-slate-200 bg-slate-50'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <svg className={`w-3.5 h-3.5 ${(planState?.creditBalance ?? 0) > 0 ? 'text-teal-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className={`text-[10px] font-bold ${(planState?.creditBalance ?? 0) > 0 ? 'text-teal-700' : 'text-slate-500'}`}>보유 크레딧</span>
                                    </div>
                                    <span className={`text-sm font-bold ${(planState?.creditBalance ?? 0) > 0 ? 'text-teal-700' : 'text-slate-400'}`}>
                                        {(planState?.creditBalance ?? 0).toLocaleString('ko-KR')}원
                                    </span>
                                </div>
                                <p className={`text-[9px] mt-1 ${(planState?.creditBalance ?? 0) > 0 ? 'text-teal-500' : 'text-slate-400'}`}>
                                    {(planState?.creditBalance ?? 0) > 0 ? '다음 결제 시 원하는 금액만큼 차감 적용됩니다' : '다운그레이드 환불 시 크레딧으로 적립됩니다'}
                                </p>
                            </div>

                            {!isUltimatePlan && (
                                <div className="flex gap-2">
                                    <button onClick={() => setShowPlanPicker(true)} className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors">
                                        {planState?.daysUntilExpiry !== undefined && planState.daysUntilExpiry <= 30
                                          ? '갱신 / 변경'
                                          : '플랜 변경'}
                                    </button>
                                    <button className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50 transition-colors">
                                        결제 수단
                                    </button>
                                </div>
                            )}

                            {!isUltimatePlan && planState?.plan !== 'free' && !planState?.isTrialActive && (
                                <button
                                    onClick={handleOpenCancelModal}
                                    disabled={isCancelLoading}
                                    className="w-full py-2 rounded-xl border border-rose-200 text-rose-400 font-bold text-xs hover:bg-rose-50 hover:text-rose-500 hover:border-rose-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {isCancelLoading && (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    )}
                                    구독 취소
                                </button>
                            )}

                        </div>
                    )}

                    {activeTab === 'referral' && canShowReferral && (
                        <ReferralSection
                            hospitalId={user.hospitalId || ''}
                            plan={planState?.plan || 'free'}
                        />
                    )}

                    {activeTab === 'reviews' && (
                        <ReviewsTab userId={user.id} showToast={showToast} />
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-2.5">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">비밀번호</h4>
                                <div className="rounded-xl border border-slate-200 px-3 py-2.5 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-700">비밀번호 변경</p>
                                                <p className="text-[10px] text-slate-400">새 비밀번호를 직접 설정합니다</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setShowPasswordForm(v => !v); setNewPassword(''); setConfirmPassword(''); }}
                                            className="text-xs font-bold px-3 py-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0"
                                        >
                                            {showPasswordForm ? '취소' : '변경'}
                                        </button>
                                    </div>
                                    {showPasswordForm && (
                                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                            <input
                                                type="password"
                                                placeholder="새 비밀번호 (8자 이상, 대·소문자·숫자·특수문자 포함)"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                            <input
                                                type="password"
                                                placeholder="새 비밀번호 확인"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                            <button
                                                disabled={isChangingPassword || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(newPassword) || newPassword !== confirmPassword}
                                                onClick={async () => {
                                                    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(newPassword)) { showToast('비밀번호는 8자 이상, 대·소문자·숫자·특수문자를 각 1개 이상 포함해야 합니다.', 'error'); return; }
                                                    if (newPassword !== confirmPassword) { showToast('비밀번호가 일치하지 않습니다.', 'error'); return; }
                                                    setIsChangingPassword(true);
                                                    const result = await authService.changePassword(newPassword);
                                                    setIsChangingPassword(false);
                                                    if (result.success) {
                                                        showToast('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.', 'success');
                                                        setShowPasswordForm(false);
                                                        setNewPassword('');
                                                        setConfirmPassword('');
                                                        // 비밀번호 변경 시 기존 세션 무효화 → 명시적 로그아웃
                                                        setTimeout(() => { void authService.signOut(); }, 1500);
                                                    } else {
                                                        showToast(result.error ?? '비밀번호 변경에 실패했습니다.', 'error');
                                                    }
                                                }}
                                                className="w-full text-xs font-bold py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {isChangingPassword ? '변경 중...' : '비밀번호 저장'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2단계 인증 (MFA) */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">2단계 인증</h4>
                                <div className="rounded-xl border border-slate-200 px-3 py-2.5 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${mfaEnabled ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-700">이메일 OTP 인증</p>
                                                <p className="text-[10px] text-slate-400">
                                                    {mfaEnabled ? '로그인 시 이메일로 코드를 발송합니다' : '비활성화 상태'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleToggleMfa}
                                            disabled={isMfaToggling}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 flex-shrink-0 ${
                                                mfaEnabled ? 'bg-indigo-500' : 'bg-slate-200'
                                            }`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                                mfaEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 신뢰 기기 목록 */}
                            {mfaEnabled && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">신뢰 기기</h4>
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        {isLoadingDevices ? (
                                            <div className="px-4 py-3 text-center text-xs text-slate-400">로딩 중...</div>
                                        ) : trustedDevices.length === 0 ? (
                                            <div className="px-4 py-3 text-center text-xs text-slate-400">등록된 신뢰 기기가 없습니다</div>
                                        ) : (
                                            trustedDevices.map((device) => {
                                                const expiresDate = new Date(device.expiresAt);
                                                const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / 86400000);
                                                return (
                                                    <div key={device.id} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50/50 border-b last:border-b-0 border-slate-100 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                            <div>
                                                                <p className="text-xs font-medium text-slate-700">{device.deviceName || '알 수 없는 기기'}</p>
                                                                <p className="text-[10px] text-slate-400">{daysLeft}일 후 만료</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveDevice(device.id)}
                                                            className="text-xs text-slate-400 hover:text-rose-500 transition-colors p-1"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            <SocialIdentityLinkSection
                                linkedIdentities={linkedIdentities}
                                isLinkingProvider={isLinkingProvider}
                                onLink={handleLinkSocialProvider}
                                onUnlink={handleUnlinkSocialProvider}
                            />

                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">마지막 로그인</h4>
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-white">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
                                            <span className="text-xs font-semibold text-slate-700">현재 세션</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                            {lastSignInAt
                                                ? new Date(lastSignInAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                : '알 수 없음'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-1">
                                <button
                                    onClick={() => {
                                        setWithdrawReasons([]);
                                        setWithdrawCustom('');
                                        setShowWithdrawModal(true);
                                    }}
                                    className="w-full py-2 rounded-xl border border-slate-200 text-slate-400 font-bold text-xs hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                                >
                                    회원 탈퇴
                                </button>
                                <p className="text-[10px] text-center text-slate-300 mt-1.5">
                                    개인정보(이름, 연락처, 환자정보)가 즉시 파기되며 복구할 수 없습니다
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {confirmModal && (
            <ConfirmModal
                title={confirmModal.title}
                message={confirmModal.message}
                confirmColor={confirmModal.confirmColor ?? 'indigo'}
                confirmLabel="확인"
                onConfirm={() => { setConfirmModal(null); confirmModal.onConfirm(); }}
                onCancel={() => setConfirmModal(null)}
            />
        )}

        {showCancelConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => !isCancelling && setShowCancelConfirm(false)}>
                <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="p-7">
                        {/* 아이콘 + 제목 */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900">구독 취소</h3>
                                <p className="text-xs text-slate-400 mt-0.5">취소 즉시 무료 플랜으로 전환됩니다</p>
                            </div>
                        </div>

                        {/* 환불 정보 */}
                        <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-2.5">
                            {cancelRefundPreview ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400">결제금액</span>
                                        <span className="text-sm font-bold text-slate-700">{cancelBilling?.amount.toLocaleString('ko-KR')}원</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400">이용 기간</span>
                                        <span className="text-sm font-bold text-slate-700">{cancelRefundPreview.usedDays}일</span>
                                    </div>
                                    <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">예상 환불금액</span>
                                        <span className={`text-base font-black ${cancelRefundPreview.refundAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {cancelRefundPreview.refundAmount > 0
                                                ? `${cancelRefundPreview.refundAmount.toLocaleString('ko-KR')}원`
                                                : '없음'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{cancelRefundPreview.reason}</p>
                                    {cancelRefundPreview.refundAmount > 0 && (
                                        <p className="text-[11px] text-slate-400">환불 처리: 영업일 5~7일 소요</p>
                                    )}
                                    {/* payment_ref 없으면 수동 처리 안내 */}
                                    {cancelBilling && !cancelBilling.payment_ref && (
                                        <p className="text-[11px] text-amber-600 font-medium">환불은 고객지원(admin@denjoy.info)으로 신청해 주세요.</p>
                                    )}
                                </>
                            ) : (
                                /* 결제 내역 없는 경우 */
                                <p className="text-xs text-slate-400 text-center py-1">결제 내역을 확인할 수 없습니다.<br />환불이 필요하면 고객지원으로 문의해 주세요.</p>
                            )}
                        </div>

                        <p className="text-xs text-slate-500 mb-5">취소 후 현재 구독 기간의 미이용 혜택은 소멸됩니다. 정말 구독을 취소하시겠습니까?</p>
                    </div>

                    {/* 버튼 */}
                    <div className="px-7 pb-7 flex gap-2">
                        <button
                            onClick={() => setShowCancelConfirm(false)}
                            disabled={isCancelling}
                            className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all disabled:opacity-50"
                        >
                            돌아가기
                        </button>
                        <button
                            onClick={handleCancelSubscription}
                            disabled={isCancelling}
                            className="flex-1 py-3 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 active:scale-95 rounded-2xl shadow-lg shadow-rose-100 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {isCancelling && (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            )}
                            {isCancelling ? '처리 중...' : '구독 취소'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <WithdrawFlowModal
            open={showWithdrawModal}
            pauseSuccess={pauseSuccess}
            withdrawReasons={withdrawReasons}
            setWithdrawReasons={setWithdrawReasons}
            withdrawCustom={withdrawCustom}
            setWithdrawCustom={setWithdrawCustom}
            featureRequest={featureRequest}
            setFeatureRequest={setFeatureRequest}
            wouldStayForFeature={wouldStayForFeature}
            setWouldStayForFeature={setWouldStayForFeature}
            isWithdrawing={isWithdrawing}
            isPausing={isPausing}
            onClose={handleCloseWithdrawModal}
            onPause={handlePause}
            onWithdraw={handleWithdraw}
        />
        {toast && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {toast.message}
            </div>
        )}
        </>
    );
};

export default UserProfile;
