
import React, { useState } from 'react';
import { User, HospitalPlanState, PLAN_NAMES, PLAN_PRICING } from '../types';
import { authService } from '../services/authService';
import PlanBadge from './PlanBadge';
import { UNLIMITED_DAYS } from '../constants';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';

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
    const [activeTab, setActiveTab] = useState<'info' | 'plan' | 'security'>('info');
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [editPhone, setEditPhone] = useState(user.phone || '');
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmColor?: 'rose' | 'indigo'; onConfirm: () => void } | null>(null);
    const { toast, showToast } = useToast();

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

                    {activeTab === 'plan' && (
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
                                    <button onClick={onChangePlan} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors">
                                        플랜 변경
                                    </button>
                                    <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors">
                                        결제 수단
                                    </button>
                                </div>
                            )}
                        </div>
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
                                                <p className="text-[11px] text-slate-400">마지막 변경: 30일 전</p>
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

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">로그인 기록</h4>
                                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                    {[
                                        { device: '현재 기기', time: '지금', active: true },
                                        { device: 'Chrome · macOS', time: '2시간 전', active: false },
                                        { device: 'Safari · iOS', time: '1일 전', active: false },
                                    ].map((log, i) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.active ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                                <span className={`text-sm ${log.active ? 'font-semibold text-slate-700' : 'font-medium text-slate-500'}`}>{log.device}</span>
                                            </div>
                                            <span className="text-xs text-slate-400">{log.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        setConfirmModal({
                                            title: '회원 탈퇴',
                                            message: '정말 탈퇴하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.',
                                            confirmColor: 'rose',
                                            onConfirm: () => { setConfirmModal(null); onDeleteAccount?.(); },
                                        });
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
        {toast && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {toast.message}
            </div>
        )}
        </>
    );
};

export default UserProfile;
