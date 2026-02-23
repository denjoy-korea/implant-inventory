
import React, { useState, useEffect, useCallback } from 'react';
import { User, HospitalPlanState, PLAN_NAMES, PLAN_PRICING, PlanType, TrustedDevice } from '../types';
import { contactService } from '../services/contactService';
import { authService } from '../services/authService';
import PlanBadge from './PlanBadge';
import { UNLIMITED_DAYS } from '../constants';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';
import { reviewService, UserReview, ReviewRole, formatReviewDisplayName } from '../services/reviewService';

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
    onLeaveHospital: () => void;
    onDeleteAccount?: () => void;
    onChangePlan?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, planState, hospitalName, onClose, onLeaveHospital, onDeleteAccount, onChangePlan }) => {
    const isStaff = user.role === 'staff';
    const isSystemAdmin = user.role === 'admin';
    const isUltimatePlan = isSystemAdmin || planState?.plan === 'ultimate';
    const [activeTab, setActiveTab] = useState<'info' | 'plan' | 'security' | 'reviews'>('info');
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
    // 탈퇴 사유 모달
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawReasons, setWithdrawReasons] = useState<string[]>([]);
    const [withdrawCustom, setWithdrawCustom] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
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

    const handleLeave = () => {
        setConfirmModal({
            title: '병원 탈퇴',
            message: '정말 이 병원을 떠나시겠습니까?\n이직 시 현재 병원에서의 모든 설정과 권한이 초기화됩니다.',
            confirmColor: 'rose',
            onConfirm: () => { setConfirmModal(null); onLeaveHospital(); },
        });
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

    // 보안 탭 진입 시 신뢰 기기 목록 + 마지막 로그인 시각 로드
    useEffect(() => {
        if (activeTab === 'security') {
            loadTrustedDevices();
            authService.getLastSignInAt().then(setLastSignInAt);
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
                content: `[플랜 변경 신청]\n현재 플랜: ${planName} (${billingLabel || '무료'})\n신청 플랜: ${PLAN_NAMES[pickerSelectedPlan]} (${pickerCycle === 'yearly' ? '연간' : '월간'})`,
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

    const tabs = [
        { id: 'info' as const, label: '내 정보', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        { id: 'plan' as const, label: '구독 관리', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
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
                <div className="flex-1 overflow-y-auto px-6 py-5">

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

                            {user.role === 'dental_staff' && user.hospitalId && (
                                <button
                                    onClick={handleLeave}
                                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold text-xs hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    이직하기 (설정 초기화)
                                </button>
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
                            <div className="space-y-4">
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
                                                className={`relative text-left p-3.5 rounded-xl border-2 transition-all ${
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
                                                <p className="text-sm font-black text-slate-800 mb-1">{label}</p>
                                                {isUltimateItem ? (
                                                    <p className="text-xs text-slate-400 font-medium mb-2">별도 문의</p>
                                                ) : (
                                                    <p className="text-xs font-bold text-slate-700 mb-2">
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
                                    <div className="pt-1">
                                        <p className="text-[11px] text-slate-500 text-center mb-3">
                                            <span className="font-bold text-slate-700">{PLAN_NAMES[pickerSelectedPlan]}</span> 플랜 ({pickerCycle === 'yearly' ? '연간' : '월간'}) 변경 신청 시<br />
                                            영업일 기준 1-2일 내 처리됩니다.
                                        </p>
                                        <button
                                            onClick={handleRequestPlanChange}
                                            disabled={isRequestingPlan}
                                            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다
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

        {showWithdrawModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-6 pt-6 pb-5">
                        <h3 className="text-base font-bold text-slate-800 mb-1">회원 탈퇴</h3>
                        <p className="text-sm text-slate-500">탈퇴 사유를 선택해주세요. 서비스 개선에 활용됩니다.</p>
                    </div>

                    <div className="px-6 pb-5 space-y-2">
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

                    <div className="px-6 pb-6 flex gap-3">
                        <button
                            onClick={() => setShowWithdrawModal(false)}
                            disabled={isWithdrawing}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            취소
                        </button>
                        <button
                            onClick={async () => {
                                if (withdrawReasons.length === 0) return;
                                if (withdrawReasons.includes('기타') && !withdrawCustom.trim()) return;
                                setIsWithdrawing(true);
                                await authService.saveWithdrawalReason(
                                    withdrawReasons.join(', '),
                                    withdrawReasons.includes('기타') ? withdrawCustom.trim() : undefined
                                );
                                setIsWithdrawing(false);
                                setShowWithdrawModal(false);
                                onDeleteAccount?.();
                            }}
                            disabled={isWithdrawing || withdrawReasons.length === 0 || (withdrawReasons.includes('기타') && !withdrawCustom.trim())}
                            className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isWithdrawing ? '처리 중...' : '탈퇴하기'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        {toast && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {toast.message}
            </div>
        )}
        </>
    );
};

export default UserProfile;
