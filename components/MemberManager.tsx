import React, { useState, useEffect } from 'react';
import {
  User, UserRole, Hospital, HospitalPlanState, PLAN_LIMITS, PLAN_NAMES,
  MemberPermissions, PermissionLevel, DEFAULT_STAFF_PERMISSIONS, READONLY_PERMISSIONS, PERMISSION_LABELS,
  ClinicRole, CLINIC_ROLE_LABELS,
} from '../types';
import { hospitalService } from '../services/hospitalService';
import { dbToHospital } from '../services/mappers';
import { planService } from '../services/planService';
import { operationLogService } from '../services/operationLogService';
import { getErrorMessage } from '../utils/errors';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';

interface MemberManagerProps {
    currentUser: User;
    onClose: () => void;
    planState?: HospitalPlanState | null;
    onGoToPricing?: () => void;
}

type MemberWithId = User & { _id: string; permissions: MemberPermissions | null };
type InvitedMember = { id: string; email: string; name: string; clinic_role: ClinicRole | null; created_at: string; expires_at: string };

// ─── Permission Modal ────────────────────────────────────────────────────────

function detectLevel(perms: MemberPermissions): PermissionLevel {
    const allTrue = Object.values(perms).every(Boolean);
    if (allTrue) return 'full';
    const readonlyMatch = (Object.keys(READONLY_PERMISSIONS) as (keyof MemberPermissions)[]).every(
        k => perms[k] === READONLY_PERMISSIONS[k]
    );
    if (readonlyMatch) return 'readonly';
    return 'custom';
}

/** 세부 권한 카테고리 정의 */
const PERM_GROUPS: { label: string; keys: (keyof MemberPermissions)[] }[] = [
    {
        label: '재고 관리 권한',
        keys: ['canViewInventory', 'canEditInventory'],
    },
    {
        label: '수술기록 권한',
        keys: ['canViewSurgery', 'canEditSurgery'],
    },
    {
        label: '발주 · 실패 관리',
        keys: ['canManageOrders', 'canManageFails'],
    },
    {
        label: '분석 · 보고서',
        keys: ['canViewAnalytics'],
    },
    {
        label: '설정 권한',
        keys: ['canManageVendors', 'canManageWorkDays'],
    },
];

interface PermissionModalProps {
    member: MemberWithId;
    onClose: () => void;
    onSave: (permissions: MemberPermissions) => Promise<void>;
}

const PermissionModal: React.FC<PermissionModalProps> = ({ member, onClose, onSave }) => {
    // DB에 저장된 기존 permissions 객체에 새 필드(canManageVendors 등)가 없을 수 있으므로
    // 새 필드에 대해 ?? false 폴백을 적용해 항상 완전한 MemberPermissions를 보장
    const storedPerms = member.permissions as (MemberPermissions & { canManageVendors?: boolean; canManageWorkDays?: boolean }) | null;
    const initialPerms: MemberPermissions = storedPerms
        ? { ...storedPerms, canManageVendors: storedPerms.canManageVendors ?? false, canManageWorkDays: storedPerms.canManageWorkDays ?? false }
        : DEFAULT_STAFF_PERMISSIONS;
    const [level, setLevel] = useState<PermissionLevel>(detectLevel(initialPerms));
    const [custom, setCustom] = useState<MemberPermissions>({ ...initialPerms });
    const [isSaving, setIsSaving] = useState(false);

    const effectivePerms: MemberPermissions =
        level === 'full' ? DEFAULT_STAFF_PERMISSIONS :
        level === 'readonly' ? READONLY_PERMISSIONS :
        custom;

    const handleLevelChange = (next: PermissionLevel) => {
        setLevel(next);
        if (next === 'full') setCustom({ ...DEFAULT_STAFF_PERMISSIONS });
        else if (next === 'readonly') setCustom({ ...READONLY_PERMISSIONS });
        // custom: 현재 effectivePerms 그대로 유지
    };

    const togglePerm = (key: keyof MemberPermissions) => {
        const next = { ...effectivePerms, [key]: !effectivePerms[key] };
        setCustom(next);
        setLevel(detectLevel(next));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(effectivePerms);
        setIsSaving(false);
    };

    // 2열 분배: 짝수 인덱스 → 왼쪽, 홀수 인덱스 → 오른쪽
    const leftGroups  = PERM_GROUPS.filter((_, i) => i % 2 === 0);
    const rightGroups = PERM_GROUPS.filter((_, i) => i % 2 === 1);

    const renderGroup = (group: typeof PERM_GROUPS[0]) => (
        <div key={group.label} className="mb-4">
            <p className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-2">
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 8 8"><polygon points="0,0 8,4 0,8" /></svg>
                {group.label}
            </p>
            <div className="space-y-1.5 pl-1">
                {group.keys.map(key => (
                    <label
                        key={key}
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => togglePerm(key)}
                    >
                        {/* 체크박스 */}
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            effectivePerms[key]
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'bg-white border-slate-300 group-hover:border-indigo-400'
                        }`}>
                            {effectivePerms[key] && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <span className={`text-xs leading-tight select-none ${effectivePerms[key] ? 'text-slate-800' : 'text-slate-400'}`}>
                            {PERMISSION_LABELS[key]}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                            {member.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 leading-none">{member.name} <span className="font-normal text-slate-400 text-sm">세부권한 설정</span></h3>
                            <p className="text-xs text-slate-400 mt-0.5">{member.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* 권한 등급 (프리셋) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 mr-1">권한 등급</span>
                        {([
                            { value: 'full' as PermissionLevel, label: '전체 권한' },
                            { value: 'readonly' as PermissionLevel, label: '읽기 전용' },
                            { value: 'custom' as PermissionLevel, label: '직접 설정' },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleLevelChange(opt.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                    level === opt.value
                                        ? opt.value === 'full' ? 'bg-indigo-600 text-white border-indigo-600'
                                        : opt.value === 'readonly' ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-slate-700 text-white border-slate-700'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* 세부 권한 — 2열 그리드 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                        <div className="grid grid-cols-2 gap-x-6">
                            {/* 왼쪽 열 */}
                            <div>{leftGroups.map(renderGroup)}</div>
                            {/* 오른쪽 열 */}
                            <div>{rightGroups.map(renderGroup)}</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 pt-4 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-10 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 h-10 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {isSaving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const MemberManager: React.FC<MemberManagerProps> = ({ currentUser, onClose, planState, onGoToPricing }) => {
    const [members, setMembers] = useState<MemberWithId[]>([]);
    const [pendingMembers, setPendingMembers] = useState<MemberWithId[]>([]);
    const [readonlyMembers, setReadonlyMembers] = useState<MemberWithId[]>([]);
    const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteClinicRole, setInviteClinicRole] = useState<ClinicRole>('staff');
    const [isInviting, setIsInviting] = useState(false);
    const [currentHospital, setCurrentHospital] = useState<Hospital | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmColor?: 'rose' | 'indigo'; confirmLabel?: string; onConfirm: () => void } | null>(null);
    const [inviteUrlModal, setInviteUrlModal] = useState<{ url: string; name: string; email: string } | null>(null);
    const [permissionModal, setPermissionModal] = useState<MemberWithId | null>(null);
    const { toast, showToast } = useToast();

    useEffect(() => {
        loadData();
    }, [currentUser.hospitalId]);

    // 다른 탭에서 초대 수락 후 돌아왔을 때 자동 새로고침
    useEffect(() => {
        const handleFocus = () => loadData();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const loadData = async () => {
        if (!currentUser.hospitalId) return;

        const [activeData, pendingData, readonlyData, invitedData, hospital] = await Promise.all([
            hospitalService.getMembers(currentUser.hospitalId),
            hospitalService.getPendingMembers(currentUser.hospitalId),
            hospitalService.getReadonlyMembers(currentUser.hospitalId),
            hospitalService.getInvitedMembers(currentUser.hospitalId),
            hospitalService.getMyHospital(),
        ]);

        const mapProfile = (p: typeof activeData[0]) => ({ id: p.id, _id: p.id, name: p.name, email: p.email, role: p.role, clinicRole: p.clinic_role ?? null, hospitalId: p.hospital_id || '', status: p.status, permissions: p.permissions ?? null });
        setMembers(activeData.map(mapProfile));
        setPendingMembers(pendingData.map(mapProfile));
        setReadonlyMembers(readonlyData.map(mapProfile));
        setInvitedMembers(invitedData);
        if (hospital) setCurrentHospital(dbToHospital(hospital));
    };

    const checkUserLimit = (): boolean => {
        const currentPlan = planState?.plan ?? 'free';
        const activeCount = members.length;
        if (!planService.canAddUser(currentPlan, activeCount)) {
            const maxUsers = PLAN_LIMITS[currentPlan].maxUsers;
            const required = maxUsers === 1 ? 'Plus' : 'Business';
            showToast(`현재 플랜(${PLAN_NAMES[currentPlan]})에서는 최대 ${maxUsers}명까지 사용 가능합니다. ${required} 이상으로 업그레이드해 주세요.`, 'error');
            if (onGoToPricing) onGoToPricing();
            return false;
        }
        return true;
    };

    const handleApprove = (userId: string) => {
        if (!checkUserLimit()) return;
        setConfirmModal({
            title: '가입 승인',
            message: '가입을 승인하시겠습니까?',
            confirmColor: 'indigo',
            confirmLabel: '승인',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await hospitalService.approveMember(userId);
                    operationLogService.logOperation('member_approve', `구성원 승인`, { userId });
                    await loadData();
                    showToast('승인되었습니다.', 'success');
                } catch (error) {
                    showToast('승인에 실패했습니다.', 'error');
                }
            },
        });
    };

    const handleReject = (userId: string) => {
        setConfirmModal({
            title: '가입 거절',
            message: '가입 요청을 거절하시겠습니까?',
            confirmColor: 'rose',
            confirmLabel: '거절',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await hospitalService.rejectMember(userId);
                    operationLogService.logOperation('member_reject', `가입 요청 거절`, { userId });
                    await loadData();
                    showToast('거절되었습니다.', 'info');
                } catch (error) {
                    showToast('거절에 실패했습니다.', 'error');
                }
            },
        });
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteName || !inviteEmail || !currentUser.hospitalId) return;

        setIsInviting(true);
        try {
            const { inviteUrl } = await hospitalService.inviteMember(inviteEmail, inviteName, currentUser.hospitalId, inviteClinicRole);
            operationLogService.logOperation('member_invite', `구성원 초대: ${inviteName} (${inviteEmail}) [${CLINIC_ROLE_LABELS[inviteClinicRole]}]`, { email: inviteEmail, name: inviteName, clinicRole: inviteClinicRole });
            setInviteName('');
            setInviteEmail('');
            setInviteClinicRole('staff');
            setIsAdding(false);
            await loadData();
            // 초대 URL 복사 모달 표시
            setInviteUrlModal({ url: inviteUrl, name: inviteName, email: inviteEmail });
        } catch (error: unknown) {
            showToast(getErrorMessage(error, '초대에 실패했습니다.'), 'error');
        } finally {
            setIsInviting(false);
        }
    };

    const handleResendInvitation = (inv: InvitedMember) => {
        setConfirmModal({
            title: '초대 재발송',
            message: `${inv.name}님(${inv.email})에게 초대 이메일을 다시 발송하시겠습니까?`,
            confirmColor: 'indigo',
            confirmLabel: '재발송',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await hospitalService.cancelInvitation(inv.id);
                    const { inviteUrl } = await hospitalService.inviteMember(inv.email, inv.name, currentUser.hospitalId!, inv.clinic_role ?? 'staff');
                    operationLogService.logOperation('member_invite', `초대 재발송: ${inv.name} (${inv.email})`, { email: inv.email });
                    await loadData();
                    setInviteUrlModal({ url: inviteUrl, name: inv.name, email: inv.email });
                } catch (error: unknown) {
                    showToast(getErrorMessage(error, '재발송에 실패했습니다.'), 'error');
                }
            },
        });
    };

    const handleDeleteInvitation = (invitationId: string, name: string) => {
        setConfirmModal({
            title: '초대 삭제',
            message: `${name}님에 대한 초대를 삭제하시겠습니까?\n초대 링크가 즉시 무효화됩니다.`,
            confirmColor: 'rose',
            confirmLabel: '삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await hospitalService.deleteInvitation(invitationId);
                    await loadData();
                    showToast('초대가 삭제되었습니다.', 'info');
                } catch (error) {
                    showToast('초대 삭제에 실패했습니다.', 'error');
                }
            },
        });
    };

    const handleDeleteMember = (userId: string) => {
        setConfirmModal({
            title: '구성원 방출',
            message: '방출 시 해당 계정이 완전히 삭제됩니다.\n다시 합류하려면 새로 초대해야 합니다.',
            confirmColor: 'rose',
            confirmLabel: '방출 및 삭제',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await hospitalService.kickMember(userId);
                    operationLogService.logOperation('member_kick', `구성원 방출 및 계정 삭제`, { userId });
                    await loadData();
                    showToast('구성원이 방출되었습니다.', 'info');
                } catch (error: unknown) {
                    showToast(getErrorMessage(error, '방출에 실패했습니다.'), 'error');
                }
            },
        });
    };

    const handleReactivateMember = (userId: string) => {
        if (!checkUserLimit()) return;
        setConfirmModal({
            title: '멤버 활성화',
            message: '이 멤버를 다시 활성화하시겠습니까?',
            confirmColor: 'indigo',
            confirmLabel: '활성화',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await hospitalService.reactivateMember(userId);
                    await loadData();
                    showToast('활성화되었습니다.', 'success');
                } catch (error) {
                    showToast('활성화에 실패했습니다.', 'error');
                }
            },
        });
    };

    return (
        <>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">치과 구성원 관리</h2>
                        <p className="text-slate-500 mt-1 text-sm">{currentHospital?.name} ({currentUser.hospitalId})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">

                    {/* Readonly Members Warning Banner */}
                    {readonlyMembers.length > 0 && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-amber-800">
                                        인원 초과로 {readonlyMembers.length}명이 읽기 전용 상태입니다
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        현재 플랜({PLAN_NAMES[planState?.plan ?? 'free']})의 최대 인원을 초과하여 일부 구성원이 읽기 전용으로 전환되었습니다.
                                        플랜을 업그레이드하거나 구성원을 정리하여 해결할 수 있습니다.
                                    </p>
                                </div>
                                {onGoToPricing && (
                                    <button
                                        onClick={onGoToPricing}
                                        className="flex-shrink-0 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                                    >
                                        업그레이드
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Invited Members (이메일 초대 대기 중) */}
                    {invitedMembers.length > 0 && (
                        <div className="mb-10 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                초대 이메일 발송 완료 <span className="text-indigo-500">{invitedMembers.length}</span>
                                <span className="text-xs font-normal text-slate-400 ml-1">— 아직 가입 대기 중</span>
                            </h3>
                            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <tbody className="divide-y divide-indigo-100/50">
                                        {invitedMembers.map(inv => (
                                            <tr key={inv.id} className="hover:bg-indigo-100/20">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-xs flex-shrink-0">
                                                            {inv.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-sm">{inv.name}</div>
                                                            <div className="text-xs text-slate-400">{inv.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden sm:table-cell">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {inv.clinic_role && (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                                                {CLINIC_ROLE_LABELS[inv.clinic_role]}
                                                            </span>
                                                        )}
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                            초대 발송됨
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* 재발송 */}
                                                        <button
                                                            onClick={() => handleResendInvitation(inv)}
                                                            title="재발송"
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        </button>
                                                        {/* 삭제 */}
                                                        <button
                                                            onClick={() => handleDeleteInvitation(inv.id, inv.name)}
                                                            title="초대 삭제"
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pending Approvals */}
                    {pendingMembers.length > 0 && (
                        <div className="mb-10 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                가입 승인 대기 <span className="text-amber-600">{pendingMembers.length}</span>
                            </h3>
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <tbody className="divide-y divide-amber-100/50">
                                        {pendingMembers.map(member => (
                                            <tr key={member.email} className="hover:bg-amber-100/30">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{member.name}</div>
                                                    <div className="text-xs text-slate-500">{member.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleApprove(member._id)}
                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                    >
                                                        승인
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(member._id)}
                                                        className="px-4 py-2 bg-white text-slate-600 border border-slate-200 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                                    >
                                                        거절
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">등록된 구성원 <span className="text-indigo-600 ml-1">{members.length}</span>명</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                스태프를 등록하여 재고 관리 업무를 분담하세요.
                                {planState && (
                                    <span className="ml-2 text-slate-400">
                                        (최대 {PLAN_LIMITS[planState.plan].maxUsers === Infinity ? '무제한' : `${PLAN_LIMITS[planState.plan].maxUsers}명`})
                                    </span>
                                )}
                            </p>
                        </div>
                        {!isAdding && (
                            <button
                                onClick={() => { if (checkUserLimit()) setIsAdding(true); }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                구성원 초대
                            </button>
                        )}
                    </div>

                    {isAdding && (
                        <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
                            <h4 className="font-bold text-slate-800 mb-1">이메일로 구성원 초대</h4>
                            <p className="text-sm text-slate-500 mb-4">초대받은 구성원이 이메일에서 승인 후 비밀번호를 설정하면 등록됩니다.</p>
                            <form onSubmit={handleInvite} className="flex gap-3 flex-wrap sm:flex-nowrap">
                                <input
                                    type="text"
                                    placeholder="이름"
                                    value={inviteName}
                                    onChange={e => setInviteName(e.target.value)}
                                    className="w-28 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                                    required
                                />
                                <select
                                    value={inviteClinicRole}
                                    onChange={e => setInviteClinicRole(e.target.value as ClinicRole)}
                                    className="w-28 px-3 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm bg-white text-slate-700"
                                    required
                                >
                                    {(Object.entries(CLINIC_ROLE_LABELS) as [ClinicRole, string][]).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <input
                                    type="email"
                                    placeholder="이메일 주소"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isInviting}
                                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {isInviting ? '발송 중...' : '초대하기'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">이름</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">아이디</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">권한</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {/* Active Members */}
                                {members.map((member) => (
                                    <tr key={member.email} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs mr-3">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div className="text-sm font-bold text-slate-700">{member.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {member.role === 'master' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                        마스터 관리자
                                                    </span>
                                                ) : (
                                                    <>
                                                        {member.clinicRole && (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 w-fit">
                                                                {CLINIC_ROLE_LABELS[member.clinicRole]}
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] text-slate-400">
                                                            {member.role === 'dental_staff' ? '치과 스태프' : '개인 스태프'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                활성
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {member.role !== 'master' && (
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        onClick={() => setPermissionModal(member)}
                                                        title="권한 설정"
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMember(member._id)}
                                                        title="방출"
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-medium text-sm transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {/* Readonly Members */}
                                {readonlyMembers.map((member) => (
                                    <tr key={member.email} className="hover:bg-amber-50/30 transition-colors bg-amber-50/10">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs mr-3">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div className="text-sm font-bold text-slate-500">{member.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{member.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {member.clinicRole && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-500 w-fit">
                                                        {CLINIC_ROLE_LABELS[member.clinicRole]}
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-slate-400">
                                                    {member.role === 'dental_staff' ? '치과 스태프' : '개인 스태프'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                읽기 전용
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    onClick={() => setPermissionModal(member)}
                                                    title="권한 설정"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleReactivateMember(member._id)}
                                                    title="활성화"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 font-medium text-sm transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMember(member._id)}
                                                    title="방출"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-medium text-sm transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {members.length === 0 && readonlyMembers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            등록된 구성원이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        {permissionModal && (
            <PermissionModal
                member={permissionModal}
                onClose={() => setPermissionModal(null)}
                onSave={async (permissions) => {
                    try {
                        await hospitalService.updateMemberPermissions(permissionModal._id, permissions);
                        operationLogService.logOperation('member_permission_update', `구성원 권한 수정: ${permissionModal.name}`, { userId: permissionModal._id });
                        await loadData();
                        setPermissionModal(null);
                        showToast('권한이 저장되었습니다.', 'success');
                    } catch (error: unknown) {
                        showToast(getErrorMessage(error, '권한 저장에 실패했습니다.'), 'error');
                    }
                }}
            />
        )}
        {confirmModal && (
            <ConfirmModal
                title={confirmModal.title}
                message={confirmModal.message}
                confirmColor={confirmModal.confirmColor ?? 'indigo'}
                confirmLabel={confirmModal.confirmLabel ?? '확인'}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(null)}
            />
        )}
        {inviteUrlModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">초대 이메일 발송 완료</h3>
                            <p className="text-sm text-slate-500">{inviteUrlModal.name}님 ({inviteUrlModal.email})</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">초대 이메일이 발송되었습니다. 아래 링크를 직접 공유할 수도 있습니다.</p>
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 mb-5">
                        <p className="flex-1 text-xs text-slate-500 truncate">{inviteUrlModal.url}</p>
                        <button
                            onClick={() => { navigator.clipboard.writeText(inviteUrlModal.url); showToast('링크가 복사되었습니다.', 'success'); }}
                            className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            복사
                        </button>
                    </div>
                    <button
                        onClick={() => setInviteUrlModal(null)}
                        className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        )}
        {toast && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'}`}>
                {toast.message}
            </div>
        )}
        </>
    );
};

export default MemberManager;
