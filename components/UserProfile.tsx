
import React, { useState, useEffect, useCallback } from 'react';
import { User, HospitalPlanState, PLAN_NAMES, PLAN_PRICING, PlanType, TrustedDevice } from '../types';
import { contactService } from '../services/contactService';
import { authService } from '../services/authService';
import { planService } from '../services/planService';
import PlanBadge from './PlanBadge';
import { UNLIMITED_DAYS } from '../constants';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';
import { reviewService, UserReview, ReviewRole, formatReviewDisplayName } from '../services/reviewService';
import { resetService } from '../services/resetService';

const REVIEW_ROLES_LIST: ReviewRole[] = ['원장', '실장', '팀장', '스탭'];
const REVIEW_TYPE_META: Record<string, { label: string; color: string }> = {
    initial: { label: '첫 후기', color: 'bg-indigo-100 text-indigo-700' },
    '6month': { label: '6개월 기념', color: 'bg-emerald-100 text-emerald-700' },
};

function StarDisplay({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

/** 내 후기 탭 */
const ReviewsTab: React.FC<{ userId: string; showToast: (msg: string, type: 'success' | 'error') => void }> = ({ userId, showToast }) => {
    const [reviews, setReviews] = useState<UserReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRating, setEditRating] = useState(0);
    const [editHovered, setEditHovered] = useState(0);
    const [editContent, setEditContent] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editRole, setEditRole] = useState<ReviewRole | ''>('');
    const [editHospital, setEditHospital] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        reviewService.getMyReviews(userId)
            .then(setReviews)
            .catch(() => showToast('후기를 불러오지 못했습니다.', 'error'))
            .finally(() => setLoading(false));
    }, [userId]);

    const startEdit = (r: UserReview) => {
        setEditingId(r.id);
        setEditRating(r.rating);
        setEditHovered(0);
        setEditContent(r.content);
        setEditLastName(r.display_last_name ?? '');
        setEditRole((r.display_role as ReviewRole) ?? '');
        setEditHospital(r.display_hospital ?? '');
    };

    const handleSave = async (id: string) => {
        if (editRating === 0 || editContent.trim().length < 10) return;
        setIsSaving(true);
        try {
            const updated = await reviewService.updateReview(id, {
                rating: editRating,
                content: editContent,
                displayLastName: editLastName || undefined,
                displayRole: editRole as ReviewRole || undefined,
                displayHospital: editHospital || undefined,
            });
            setReviews(prev => prev.map(r => r.id === id ? updated : r));
            setEditingId(null);
            showToast('후기가 수정되었습니다.', 'success');
        } catch {
            showToast('수정에 실패했습니다.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    if (loading) return <div className="py-10 text-center text-sm text-slate-400">불러오는 중...</div>;

    if (reviews.length === 0) {
        return (
            <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">아직 작성한 후기가 없습니다</p>
                <p className="text-xs text-slate-400 mt-1">대시보드에서 후기 작성 알림을 확인해 보세요</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map(review => {
                const typeMeta = REVIEW_TYPE_META[review.review_type] ?? { label: review.review_type, color: 'bg-slate-100 text-slate-600' };
                const displayName = formatReviewDisplayName(review.display_last_name, review.display_role as ReviewRole | null, review.display_hospital);
                const isEditing = editingId === review.id;
                const editPreview = formatReviewDisplayName(editLastName || null, editRole as ReviewRole || null, editHospital || null);

                return (
                    <div key={review.id} className="rounded-xl border border-slate-200 overflow-hidden">
                        {/* 카드 헤더 */}
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${typeMeta.color}`}>{typeMeta.label}</span>
                                <StarDisplay rating={isEditing ? editRating : review.rating} />
                            </div>
                            {!isEditing ? (
                                <button onClick={() => startEdit(review)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    수정
                                </button>
                            ) : (
                                <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">취소</button>
                            )}
                        </div>

                        {/* 카드 본문 */}
                        <div className="px-4 py-4">
                            {isEditing ? (
                                <div className="space-y-4">
                                    {/* 별점 */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 mb-1.5">평점</p>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button key={s} type="button" onClick={() => setEditRating(s)} onMouseEnter={() => setEditHovered(s)} onMouseLeave={() => setEditHovered(0)} className="transition-transform hover:scale-110">
                                                    <svg className={`w-7 h-7 transition-colors ${s <= (editHovered || editRating) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 내용 */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-[10px] font-bold text-slate-500">후기 내용</p>
                                            <span className={`text-[10px] ${editContent.length > 500 ? 'text-rose-500' : 'text-slate-400'}`}>{editContent.length}/500</span>
                                        </div>
                                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)} maxLength={500} rows={4} className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 placeholder:text-slate-300" placeholder="실제 사용 경험을 자유롭게 작성해 주세요. (최소 10자)" />
                                    </div>

                                    {/* 표시 정보 */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 mb-2">표시 정보 <span className="font-normal text-slate-400">(선택)</span></p>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-1">성 (한 글자)</label>
                                                <input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value.slice(0, 2))} maxLength={2} placeholder="예: 김" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 placeholder:text-slate-300" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-1">역할</label>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {REVIEW_ROLES_LIST.map(r => (
                                                        <button key={r} type="button" onClick={() => setEditRole(prev => prev === r ? '' : r)} className={`text-xs font-bold py-1.5 rounded-lg border transition-colors ${editRole === r ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>{r}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <input type="text" value={editHospital} onChange={e => setEditHospital(e.target.value.slice(0, 30))} maxLength={30} placeholder="소속 병원 (선택)" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 placeholder:text-slate-300" />
                                        {(editLastName || editRole || editHospital) && (
                                            <div className="mt-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <p className="text-[10px] text-slate-400 mb-0.5">표시 미리보기</p>
                                                <p className="text-xs font-bold text-slate-700">{editPreview.line1}</p>
                                                {editPreview.line2 && <p className="text-[11px] text-slate-500">{editPreview.line2}</p>}
                                            </div>
                                        )}
                                    </div>

                                    {/* 저장 */}
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">취소</button>
                                        <button onClick={() => handleSave(review.id)} disabled={isSaving || editRating === 0 || editContent.trim().length < 10} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{isSaving ? '저장 중...' : '저장'}</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{review.content}</p>
                                    <div className="mt-3 flex items-end justify-between gap-2">
                                        <div>
                                            {(review.display_last_name || review.display_role) && (
                                                <p className="text-xs font-bold text-slate-600">{displayName.line1}</p>
                                            )}
                                            {displayName.line2 && <p className="text-[11px] text-slate-400">{displayName.line2}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-[10px] text-slate-400">작성일 {formatDate(review.created_at)}</p>
                                            {review.updated_at !== review.created_at && (
                                                <p className="text-[10px] text-slate-400">수정일 {formatDate(review.updated_at)}</p>
                                            )}
                                        </div>
                                    </div>
                                    {review.is_public && (
                                        <div className="mt-2 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span className="text-[10px] text-emerald-600 font-medium">홈에 공개됨</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface UserProfileProps {
    user: User;
    planState?: HospitalPlanState | null;
    hospitalName?: string;
    onClose: () => void;
    onDeleteAccount?: () => void;
    onChangePlan?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, planState, hospitalName, onClose, onDeleteAccount, onChangePlan }) => {
    const isStaff = user.role === 'staff';
    const isSystemAdmin = user.role === 'admin';
    const isUltimatePlan = isSystemAdmin || planState?.plan === 'ultimate';
    const linkSuccessProvider = localStorage.getItem('_link_success_provider');
    const [activeTab, setActiveTab] = useState<'info' | 'plan' | 'security' | 'reviews'>(
        linkSuccessProvider ? 'security' : 'info'
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
    // 이직 데이터 초기화
    const [resetReason, setResetReason] = useState('');
    const [isRequestingReset, setIsRequestingReset] = useState(false);
    const [activeResetRequest, setActiveResetRequest] = useState<{ id: string; status: string; created_at: string } | null>(null);
    const [showResetSection, setShowResetSection] = useState(false);
    const isMaster = user.role === 'master';

    // 활성 초기화 요청 조회
    useEffect(() => {
        if (isMaster && user.hospitalId) {
            resetService.getActiveRequest(user.hospitalId).then(req => {
                if (req) setActiveResetRequest({ id: req.id, status: req.status, created_at: req.created_at });
            });
        }
    }, [isMaster, user.hospitalId]);

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
    const [isRequestingPlan, setIsRequestingPlan] = useState(false);

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

    const handleRequestPlanChange = async () => {
        if (!pickerSelectedPlan) return;
        setIsRequestingPlan(true);
        try {
            await contactService.submit({
                hospital_name: hospitalName || '미등록',
                contact_name: user.name,
                email: user.email,
                phone: user.phone || '미등록',
                weekly_surgeries: '-',
                inquiry_type: `plan_change_${pickerSelectedPlan}`,
                content: `[플랜 변경 신청]\n현재 플랜: ${planName} (${billingLabel || '무료'})\n신청 플랜: ${PLAN_NAMES[pickerSelectedPlan]} (${pickerCycle === 'yearly' ? '연간' : '월간'})\nhospital_id: ${user.hospitalId ?? ''}`,
            });
            showToast('플랜 변경 신청이 완료되었습니다. 영업일 기준 1-2일 내 처리됩니다.', 'success');
            setShowPlanPicker(false);
            setPickerSelectedPlan(null);
        } catch {
            showToast('신청에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
        } finally {
            setIsRequestingPlan(false);
        }
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
        { id: 'info' as const, label: '내 정보', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        ...(canManagePlan ? [{ id: 'plan' as const, label: '구독 관리', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> }] : []),
        { id: 'security' as const, label: '보안', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
        { id: 'reviews' as const, label: '내 후기', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
    ];

    const roleLabel = isSystemAdmin ? '운영자' : user.role === 'master' ? '원장님' : user.role === 'dental_staff' ? '스태프' : '담당자';

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
            <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-2xl h-[640px] flex flex-col overflow-hidden">

                {/* 상단 프로필 헤더 */}
                <div className="relative flex-shrink-0">
                    <div className="h-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 h-16 opacity-30" style={{
                            backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 30% 50%, rgba(139,92,246,0.2) 0%, transparent 50%)'
                        }} />
                    </div>
                    <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all z-10">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
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
                <div className="flex px-6 pt-4 gap-1 flex-shrink-0 border-b border-slate-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all relative ${
                                activeTab === tab.id
                                    ? 'text-slate-800'
                                    : 'text-slate-400 hover:text-slate-500'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-slate-800" />
                            )}
                        </button>
                    ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="flex-1 overflow-y-auto px-6 py-4">

                    {activeTab === 'info' && (
                        <div className="space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">개인정보</h4>
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
                                        { label: '회원 유형', value: isSystemAdmin ? '운영자' : user.role === 'master' ? '치과 회원 (원장)' : user.role === 'dental_staff' ? '치과 회원 (스태프)' : '개인 회원 (담당자)', editable: false },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                                            <span className="text-xs font-medium text-slate-400">{item.label}</span>
                                            {isEditing && item.editable ? (
                                                <input
                                                    type={item.type || 'text'}
                                                    value={item.editValue}
                                                    onChange={e => item.onChange?.(e.target.value)}
                                                    placeholder={item.placeholder}
                                                    className="text-sm font-medium text-slate-700 text-right bg-white border border-slate-200 rounded-lg px-3 py-1 w-44 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                                />
                                            ) : (
                                                <span className={`text-sm font-semibold ${item.empty ? 'text-slate-300' : 'text-slate-700'}`}>{item.value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{isStaff ? '워크스페이스' : '소속 정보'}</h4>
                                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                                    {user.hospitalId ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-500">
                                                {isStaff ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{hospitalName || '워크스페이스'}</p>
                                                <p className="text-[11px] text-slate-400">데이터가 안전하게 보호되고 있습니다</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 text-center py-2">소속된 병원이 없습니다</p>
                                    )}
                                </div>
                            </div>

                            {/* 이직 데이터 초기화 — master(개인 워크스페이스 소유자)만 */}
                            {isMaster && user.hospitalId && (
                                <div className="mt-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">이직 시 데이터 초기화</h4>

                                    {activeResetRequest ? (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-amber-800">
                                                        초기화 요청 {activeResetRequest.status === 'pending' ? '검토 대기 중' : '처리 예정'}
                                                    </p>
                                                    <p className="text-[11px] text-amber-600 mt-0.5">
                                                        {new Date(activeResetRequest.created_at).toLocaleDateString('ko-KR')}에 요청됨 · 운영팀에서 검토 후 처리합니다
                                                    </p>
                                                    {activeResetRequest.status === 'scheduled' && (
                                                        <button
                                                            onClick={() => setConfirmModal({
                                                                title: '초기화 요청 취소',
                                                                message: '데이터 초기화 요청을 취소하시겠습니까?',
                                                                onConfirm: handleCancelReset,
                                                            })}
                                                            className="mt-2 text-xs font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                                                        >
                                                            요청 취소
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : showResetSection ? (
                                        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
                                            <div className="flex items-start gap-2">
                                                <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                <div>
                                                    <p className="text-xs font-bold text-rose-700">다음 데이터가 모두 삭제됩니다</p>
                                                    <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">
                                                        수술기록 · 재고 마스터 · 주문/발주 · 교환 내역 · 재고실사 · 활동로그
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-1">계정 정보와 구독 플랜은 유지됩니다.</p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-500 block mb-1">초기화 사유</label>
                                                <input
                                                    type="text"
                                                    value={resetReason}
                                                    onChange={e => setResetReason(e.target.value)}
                                                    placeholder="예: 이직으로 인한 데이터 초기화"
                                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setShowResetSection(false); setResetReason(''); }}
                                                    className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
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
                                                    className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {isRequestingReset ? '요청 중...' : '초기화 요청'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowResetSection(true)}
                                            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-4 bg-white hover:border-rose-200 hover:bg-rose-50/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-500 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-700 group-hover:text-rose-700 transition-colors">이직으로 인한 데이터 초기화</p>
                                                <p className="text-[11px] text-slate-400">수술기록, 재고, 주문, 교환, 재고실사 정보를 초기화합니다</p>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    )}

                    {activeTab === 'plan' && showPlanPicker && (() => {
                        const PLAN_PICKER_ITEMS: { plan: PlanType; label: string; monthlyPrice: number; yearlyPrice: number; tag?: string; features: string[] }[] = [
                            { plan: 'basic', label: 'Basic', monthlyPrice: 29000, yearlyPrice: 23000, features: ['최대 50품목', '1인 사용', '기본 대시보드', '엑셀 업로드'] },
                            { plan: 'plus', label: 'Plus', monthlyPrice: 69000, yearlyPrice: 55000, features: ['최대 200품목', '3인 사용', '브랜드 분석', '발주 자동화'] },
                            { plan: 'business', label: 'Business', monthlyPrice: 129000, yearlyPrice: 103000, tag: '추천', features: ['무제한 품목', '무제한 인원', 'AI 예측 발주', '우선 지원'] },
                            { plan: 'ultimate', label: 'Ultimate', monthlyPrice: 0, yearlyPrice: 0, tag: '별도 문의', features: ['Business 전체', '감사 로그', '장기 보관', '전담 담당자'] },
                        ];
                        return (
                            <div className="space-y-3">
                                {/* 헤더 */}
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setShowPlanPicker(false); setPickerSelectedPlan(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <h4 className="text-sm font-bold text-slate-700">플랜 선택</h4>
                                </div>

                                {/* 월간 / 연간 토글 */}
                                <div className="flex items-center justify-center">
                                    <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                                        <button onClick={() => setPickerCycle('monthly')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pickerCycle === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>월간</button>
                                        <button onClick={() => setPickerCycle('yearly')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pickerCycle === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                                            연간
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">-20%</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 플랜 카드 2x2 */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    {PLAN_PICKER_ITEMS.map(({ plan, label, monthlyPrice, yearlyPrice, tag, features }) => {
                                        const isCurrent = planState?.plan === plan;
                                        const isSelected = pickerSelectedPlan === plan;
                                        const price = pickerCycle === 'yearly' ? yearlyPrice : monthlyPrice;
                                        const isUltimateItem = plan === 'ultimate';
                                        return (
                                            <button
                                                key={plan}
                                                onClick={() => !isCurrent && setPickerSelectedPlan(isSelected ? null : plan)}
                                                disabled={isCurrent}
                                                className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                                                    isCurrent
                                                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                                                            : 'border-slate-200 bg-white hover:border-indigo-300'
                                                }`}
                                            >
                                                {tag && !isCurrent && (
                                                    <span className={`absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ${tag === '추천' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{tag}</span>
                                                )}
                                                {isCurrent && (
                                                    <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">현재</span>
                                                )}
                                                <p className="text-sm font-black text-slate-800 mb-0.5">{label}</p>
                                                {isUltimateItem ? (
                                                    <p className="text-xs text-slate-400 font-medium mb-1">별도 문의</p>
                                                ) : (
                                                    <p className="text-xs font-bold text-slate-700 mb-1">
                                                        {price.toLocaleString('ko-KR')}
                                                        <span className="text-[10px] font-normal text-slate-400">원/월</span>
                                                    </p>
                                                )}
                                                <ul className="space-y-0.5">
                                                    {features.map((f, i) => (
                                                        <li key={i} className="flex items-center gap-1 text-[10px] text-slate-500">
                                                            <svg className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                            {f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* 신청 버튼 영역 */}
                                {pickerSelectedPlan ? (
                                    <div>
                                        <p className="text-[11px] text-slate-500 text-center mb-2">
                                            <span className="font-bold text-slate-700">{PLAN_NAMES[pickerSelectedPlan]}</span> 플랜 ({pickerCycle === 'yearly' ? '연간' : '월간'}) 변경 신청 시<br />
                                            영업일 기준 1-2일 내 처리됩니다.
                                        </p>
                                        <button
                                            onClick={handleRequestPlanChange}
                                            disabled={isRequestingPlan}
                                            className="w-full py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isRequestingPlan ? '신청 중...' : `${PLAN_NAMES[pickerSelectedPlan]} 플랜으로 변경 신청`}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-slate-400 text-center">변경할 플랜을 선택해 주세요</p>
                                )}
                            </div>
                        );
                    })()}

                    {activeTab === 'plan' && !showPlanPicker && (
                        <div className="space-y-5">
                            <div className={`rounded-2xl p-5 text-white relative overflow-hidden bg-gradient-to-br ${currentPlanStyle.bg}`}>
                                <div className="absolute top-0 right-0 w-40 h-40 rounded-full -mr-16 -mt-16" style={{
                                    background: `radial-gradient(circle, ${currentPlanStyle.glow1} 0%, transparent 70%)`
                                }} />
                                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full -ml-12 -mb-12" style={{
                                    background: `radial-gradient(circle, ${currentPlanStyle.glow2} 0%, transparent 70%)`
                                }} />
                                <div className="relative">
                                    <div className="flex items-start justify-between mb-5">
                                        <div>
                                            <p className="text-slate-400 text-[11px] font-medium mb-1">현재 플랜</p>
                                            <h3 className="text-3xl font-black tracking-tight">{planName}</h3>
                                        </div>
                                        {!isUltimatePlan && planState?.plan !== 'free' && billingLabel && (
                                            <div className="text-right">
                                                <p className="text-slate-400 text-[11px] font-medium mb-1">{billingLabel} 결제</p>
                                                <p className="text-xl font-bold">{priceDisplay}<span className="text-sm font-normal text-slate-400">원/월</span></p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        {isUltimatePlan ? (
                                            <>
                                                <div className="flex items-center justify-between text-[11px] mb-2">
                                                    <span className="text-slate-400">이용 기간</span>
                                                    <span className="text-white font-bold">평생</span>
                                                </div>
                                                <div className="w-full bg-white/10 rounded-full h-1.5">
                                                    <div className="rounded-full h-1.5" style={{
                                                        width: '100%',
                                                        background: currentPlanStyle.bar
                                                    }} />
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                                                    <span>Ultimate 플랜</span>
                                                    <span>평생 이용</span>
                                                </div>
                                            </>
                                        ) : planState?.isTrialActive ? (
                                            <>
                                                <div className="flex items-center justify-between text-[11px] mb-2">
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
                                            <div className="text-center py-1">
                                                <p className="text-[11px] text-slate-400">무료 플랜 이용 중</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between text-[11px] mb-2">
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
                                                    <div className="text-[10px] text-slate-500 mt-1.5 text-right">
                                                        만료: {new Date(planState.expiresAt).toLocaleDateString('ko-KR')}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">결제 정보</h4>
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
                                        <div key={i} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                                            <span className="text-xs font-medium text-slate-400">{item.label}</span>
                                            <span className="text-sm font-semibold text-slate-700">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {!isUltimatePlan && (
                                <div className="flex gap-2">
                                    <button onClick={() => setShowPlanPicker(true)} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors">
                                        플랜 변경
                                    </button>
                                    <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors">
                                        결제 수단
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <ReviewsTab userId={user.id} showToast={showToast} />
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">비밀번호</h4>
                                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">비밀번호 변경</p>
                                                <p className="text-[11px] text-slate-400">재설정 이메일로 변경할 수 있습니다</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const result = await authService.resetPassword(user.email);
                                                if (result.success) {
                                                    showToast('비밀번호 재설정 이메일이 전송되었습니다.', 'success');
                                                } else {
                                                    showToast('이메일 전송에 실패했습니다.', 'error');
                                                }
                                            }}
                                            className="text-xs font-bold px-3 py-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                        >
                                            변경
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 2단계 인증 (MFA) */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2단계 인증</h4>
                                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${mfaEnabled ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">이메일 OTP 인증</p>
                                                <p className="text-[11px] text-slate-400">
                                                    {mfaEnabled ? '로그인 시 이메일로 코드를 발송합니다' : '비활성화 상태'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleToggleMfa}
                                            disabled={isMfaToggling}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
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
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">신뢰 기기</h4>
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        {isLoadingDevices ? (
                                            <div className="px-4 py-5 text-center text-sm text-slate-400">로딩 중...</div>
                                        ) : trustedDevices.length === 0 ? (
                                            <div className="px-4 py-5 text-center text-sm text-slate-400">등록된 신뢰 기기가 없습니다</div>
                                        ) : (
                                            trustedDevices.map((device) => {
                                                const expiresDate = new Date(device.expiresAt);
                                                const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / 86400000);
                                                return (
                                                    <div key={device.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 border-b last:border-b-0 border-slate-100 transition-colors">
                                                        <div className="flex items-center gap-2.5">
                                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700">{device.deviceName || '알 수 없는 기기'}</p>
                                                                <p className="text-[11px] text-slate-400">{daysLeft}일 후 만료</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveDevice(device.id)}
                                                            className="text-xs text-slate-400 hover:text-rose-500 transition-colors p-1"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                            {/* 소셜 계정 연동 */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">소셜 계정 연동</h4>
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                    {(['google', 'kakao'] as const).map((provider, idx) => {
                                        const linked = linkedIdentities.find(i => i.provider === provider);
                                        const isLoading = isLinkingProvider === provider;
                                        const label = provider === 'google' ? 'Google' : '카카오';
                                        const icon = provider === 'google' ? (
                                            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 flex-shrink-0 text-[#3C1E1E]" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 3C6.48 3 2 6.6 2 11c0 2.82 1.7 5.3 4.27 6.79l-1.09 4.05a.3.3 0 00.44.33L10.1 19.5A11.3 11.3 0 0012 19.6c5.52 0 10-3.6 10-8.04C22 6.6 17.52 3 12 3z"/>
                                            </svg>
                                        );
                                        return (
                                            <div key={provider} className={`flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 ${idx === 0 ? 'border-b border-slate-100' : ''} transition-colors`}>
                                                <div className="flex items-center gap-2.5">
                                                    {icon}
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700">{label}</p>
                                                        <p className="text-[11px] text-slate-400">{linked ? '연동됨' : '연동 안됨'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {linked ? (
                                                        <>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            <button
                                                                onClick={async () => {
                                                                                    setIsLinkingProvider(provider);
                                                                    const result = await authService.unlinkSocialProvider(linked.id);
                                                                    if (result.success) {
                                                                        setLinkedIdentities(prev => prev.filter(i => i.id !== linked.id));
                                                                        showToast(`${label} 연동이 해제되었습니다.`, 'success');
                                                                    } else {
                                                                        showToast(result.error || '연동 해제에 실패했습니다.', 'error');
                                                                    }
                                                                    setIsLinkingProvider(null);
                                                                }}
                                                                disabled={isLoading}
                                                                className="text-xs text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                                                            >
                                                                {isLoading ? '처리 중...' : '해제'}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={async () => {
                                                                setIsLinkingProvider(provider);
                                                                const result = await authService.linkSocialProvider(provider);
                                                                if (!result.success) {
                                                                    showToast(result.error || '연동에 실패했습니다.', 'error');
                                                                    setIsLinkingProvider(null);
                                                                }
                                                                // 성공 시 OAuth 리다이렉트 → 페이지가 이동하므로 상태 해제 불필요
                                                            }}
                                                            disabled={isLoading}
                                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                                                        >
                                                            {isLoading ? '연결 중...' : '연동하기'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">마지막 로그인</h4>
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 bg-white">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
                                            <span className="text-sm font-semibold text-slate-700">현재 세션</span>
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {lastSignInAt
                                                ? new Date(lastSignInAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                : '알 수 없음'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        setWithdrawReasons([]);
                                        setWithdrawCustom('');
                                        setShowWithdrawModal(true);
                                    }}
                                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold text-xs hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                                >
                                    회원 탈퇴
                                </button>
                                <p className="text-[11px] text-center text-slate-300 mt-2">
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
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(null)}
            />
        )}

        {showWithdrawModal && (() => {
            const isFeatureMissing = withdrawReasons.includes('필요한 기능이 없어서');
            const canWithdraw = withdrawReasons.length > 0 && !(withdrawReasons.includes('기타') && !withdrawCustom.trim());
            const today = new Date();
            const resumeDate = new Date(today);
            resumeDate.setMonth(resumeDate.getMonth() + 2);
            const notifyDate = new Date(resumeDate);
            notifyDate.setDate(notifyDate.getDate() - 7);
            const fmtKo = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

            return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-y-auto max-h-[85vh]">

                    {pauseSuccess ? (
                        /* ── 일시 중지 완료 타임라인 ── */
                        <div className="px-6 pt-6 pb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-slate-800">일시 중지가 요청되었습니다</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-5">소중한 의견을 남겨주셔서 감사합니다. 2개월 후 서비스가 자동으로 재개됩니다.</p>

                            <div className="bg-slate-50 rounded-2xl px-5 py-4 mb-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex flex-col items-center flex-shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-indigo-600 mt-0.5" />
                                        <div className="w-px flex-1 bg-indigo-200 my-1 min-h-[2.5rem]" />
                                    </div>
                                    <div className="pb-5">
                                        <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">오늘</p>
                                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmtKo(today)}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">일시 중지 시작</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex flex-col items-center flex-shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-indigo-300 mt-0.5" />
                                        <div className="w-px flex-1 bg-indigo-200 my-1 min-h-[2.5rem]" />
                                    </div>
                                    <div className="pb-5">
                                        <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">재개 1주 전</p>
                                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmtKo(notifyDate)}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">재개 알림 이메일 발송</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex flex-col items-center flex-shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-indigo-600 mt-0.5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">2개월 후</p>
                                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmtKo(resumeDate)}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">서비스 자동 재개</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCloseWithdrawModal}
                                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    ) : (
                        /* ── 탈퇴 사유 선택 ── */
                        <>
                            <div className="px-6 pt-6 pb-5">
                                <h3 className="text-base font-bold text-slate-800 mb-1">회원 탈퇴</h3>
                                <p className="text-sm text-slate-500">탈퇴 사유를 선택해주세요. 서비스 개선에 활용됩니다.</p>
                                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                    <p className="text-[11px] font-semibold text-amber-700 mb-1">개인정보 처리 안내</p>
                                    <ul className="space-y-0.5">
                                        <li className="text-[11px] text-amber-600">• 이름·연락처·환자정보는 탈퇴 즉시 파기됩니다.</li>
                                        <li className="text-[11px] text-amber-600">• 결제 기록은 전자상거래법에 따라 5년간 보관됩니다.</li>
                                        <li className="text-[11px] text-amber-600">• 탈퇴 후 동일 이메일로 재가입 시 이전 데이터 복구가 불가합니다.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="px-6 pb-4 space-y-2">
                                {[
                                    '더 이상 사용하지 않아서',
                                    '필요한 기능이 없어서',
                                    '가격이 부담돼서',
                                    '다른 서비스로 이동',
                                    '개인정보 삭제 원함',
                                    '기타',
                                ].map((option) => (
                                    <label key={option} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${withdrawReasons.includes(option) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
                                        <input
                                            type="checkbox"
                                            value={option}
                                            checked={withdrawReasons.includes(option)}
                                            onChange={(e) => {
                                                setWithdrawReasons(prev =>
                                                    e.target.checked ? [...prev, option] : prev.filter(r => r !== option)
                                                );
                                                if (!e.target.checked && option === '기타') setWithdrawCustom('');
                                                if (!e.target.checked && option === '필요한 기능이 없어서') {
                                                    setFeatureRequest('');
                                                    setWouldStayForFeature(null);
                                                }
                                            }}
                                            className="accent-indigo-600 w-4 h-4 flex-shrink-0"
                                        />
                                        <span className="text-sm font-medium text-slate-700">{option}</span>
                                    </label>
                                ))}

                                {withdrawReasons.includes('기타') && (
                                    <textarea
                                        value={withdrawCustom}
                                        onChange={(e) => setWithdrawCustom(e.target.value)}
                                        placeholder="탈퇴 사유를 직접 입력해주세요."
                                        rows={3}
                                        className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                                    />
                                )}
                            </div>

                            {/* 기능 부재 선택 시 인라인 섹션 */}
                            {isFeatureMissing && (
                                <div className="px-6 pb-4">
                                    <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 space-y-3">
                                        <p className="text-xs font-semibold text-indigo-700">어떤 기능이 필요하신가요?</p>
                                        <textarea
                                            value={featureRequest}
                                            onChange={(e) => {
                                                setFeatureRequest(e.target.value);
                                                if (!e.target.value.trim()) setWouldStayForFeature(null);
                                            }}
                                            placeholder="필요하신 기능을 자유롭게 적어주세요."
                                            rows={2}
                                            className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                        />
                                        {featureRequest.trim().length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-indigo-700 mb-2">해당 기능이 구현된다면 계속 사용하실 의향이 있으신가요?</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setWouldStayForFeature(true)}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${wouldStayForFeature === true ? 'bg-indigo-600 text-white' : 'border border-indigo-300 text-indigo-600 hover:bg-indigo-100'}`}
                                                    >
                                                        네, 사용할게요
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setWouldStayForFeature(false)}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${wouldStayForFeature === false ? 'bg-slate-600 text-white' : 'border border-slate-300 text-slate-500 hover:bg-slate-100'}`}
                                                    >
                                                        아니요
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {wouldStayForFeature === true && (
                                            <div className="pt-1 flex items-start gap-2 text-indigo-700">
                                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="text-xs">중지 기간에는 서비스 이용과 이용료 청구가 함께 중단됩니다. 2개월 후 자동으로 재개됩니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={handleCloseWithdrawModal}
                                    disabled={isWithdrawing || isPausing}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    취소
                                </button>
                                {wouldStayForFeature === true ? (
                                    <>
                                        <button
                                            onClick={handlePause}
                                            disabled={isPausing || isWithdrawing}
                                            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isPausing ? '처리 중...' : '2개월 일시 중지'}
                                        </button>
                                        <button
                                            onClick={handleWithdraw}
                                            disabled={isWithdrawing || !canWithdraw || isPausing}
                                            className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isWithdrawing ? '처리 중...' : '탈퇴 계속'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleWithdraw}
                                        disabled={isWithdrawing || !canWithdraw}
                                        className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {isWithdrawing ? '처리 중...' : '탈퇴하기'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            );
        })()}
        {toast && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {toast.message}
            </div>
        )}
        </>
    );
};

export default UserProfile;
