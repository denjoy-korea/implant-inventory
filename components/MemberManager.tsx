import React, { useState, useEffect } from 'react';
import { User, UserRole, Hospital, HospitalPlanState, PLAN_LIMITS, PLAN_NAMES } from '../types';
import { hospitalService } from '../services/hospitalService';
import { dbToHospital } from '../services/mappers';
import { planService } from '../services/planService';
import { operationLogService } from '../services/operationLogService';

interface MemberManagerProps {
    currentUser: User;
    onClose: () => void;
    planState?: HospitalPlanState | null;
    onGoToPricing?: () => void;
}

type MemberWithId = User & { _id: string };

const MemberManager: React.FC<MemberManagerProps> = ({ currentUser, onClose, planState, onGoToPricing }) => {
    const [members, setMembers] = useState<MemberWithId[]>([]);
    const [pendingMembers, setPendingMembers] = useState<MemberWithId[]>([]);
    const [readonlyMembers, setReadonlyMembers] = useState<MemberWithId[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [currentHospital, setCurrentHospital] = useState<Hospital | null>(null);

    useEffect(() => {
        loadData();
    }, [currentUser.hospitalId]);

    const loadData = async () => {
        if (!currentUser.hospitalId) return;

        const [activeData, pendingData, readonlyData, hospital] = await Promise.all([
            hospitalService.getMembers(currentUser.hospitalId),
            hospitalService.getPendingMembers(currentUser.hospitalId),
            hospitalService.getReadonlyMembers(currentUser.hospitalId),
            hospitalService.getMyHospital(),
        ]);

        setMembers(activeData.map(p => ({ _id: p.id, name: p.name, email: p.email, role: p.role, hospitalId: p.hospital_id || '', status: p.status })));
        setPendingMembers(pendingData.map(p => ({ _id: p.id, name: p.name, email: p.email, role: p.role, hospitalId: p.hospital_id || '', status: p.status })));
        setReadonlyMembers(readonlyData.map(p => ({ _id: p.id, name: p.name, email: p.email, role: p.role, hospitalId: p.hospital_id || '', status: p.status })));
        if (hospital) setCurrentHospital(dbToHospital(hospital));
    };

    const checkUserLimit = (): boolean => {
        const currentPlan = planState?.plan ?? 'free';
        const activeCount = members.length;
        if (!planService.canAddUser(currentPlan, activeCount)) {
            const maxUsers = PLAN_LIMITS[currentPlan].maxUsers;
            const required = maxUsers === 1 ? 'Plus' : 'Business';
            alert(`현재 플랜(${PLAN_NAMES[currentPlan]})에서는 최대 ${maxUsers}명까지 사용 가능합니다. ${required} 이상으로 업그레이드해 주세요.`);
            if (onGoToPricing) onGoToPricing();
            return false;
        }
        return true;
    };

    const handleApprove = async (userId: string) => {
        if (!checkUserLimit()) return;
        if (!window.confirm('가입을 승인하시겠습니까?')) return;

        try {
            await hospitalService.approveMember(userId);
            operationLogService.logOperation('member_approve', `구성원 승인`, { userId });
            await loadData();
            alert('승인되었습니다.');
        } catch (error) {
            alert('승인에 실패했습니다.');
        }
    };

    const handleReject = async (userId: string) => {
        if (!window.confirm('가입 요청을 거절하시겠습니까?')) return;

        try {
            await hospitalService.rejectMember(userId);
            operationLogService.logOperation('member_reject', `가입 요청 거절`, { userId });
            await loadData();
            alert('거절되었습니다.');
        } catch (error) {
            alert('거절에 실패했습니다.');
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteName || !inviteEmail || !currentUser.hospitalId) return;

        setIsInviting(true);
        try {
            await hospitalService.inviteMember(inviteEmail, inviteName, currentUser.hospitalId);
            operationLogService.logOperation('member_invite', `구성원 초대: ${inviteName} (${inviteEmail})`, { email: inviteEmail, name: inviteName });
            alert(`${inviteName}님(${inviteEmail})에게 초대 이메일을 발송했습니다.`);
            setInviteName('');
            setInviteEmail('');
            setIsAdding(false);
        } catch (error: any) {
            alert(error.message || '초대에 실패했습니다.');
        } finally {
            setIsInviting(false);
        }
    };

    const handleDeleteMember = async (userId: string) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        try {
            await hospitalService.rejectMember(userId);
            operationLogService.logOperation('member_kick', `구성원 방출`, { userId });
            await loadData();
        } catch (error) {
            alert('구성원 방출에 실패했습니다.');
        }
    };

    const handleReactivateMember = async (userId: string) => {
        if (!checkUserLimit()) return;
        if (!window.confirm('이 멤버를 다시 활성화하시겠습니까?')) return;

        try {
            await hospitalService.reactivateMember(userId);
            await loadData();
            alert('활성화되었습니다.');
        } catch (error) {
            alert('활성화에 실패했습니다.');
        }
    };

    return (
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
                            <form onSubmit={handleInvite} className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="이름"
                                    value={inviteName}
                                    onChange={e => setInviteName(e.target.value)}
                                    className="w-32 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="이메일 주소"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'master'
                                                ? 'bg-purple-100 text-purple-800'
                                                : member.role === 'dental_staff'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-green-100 text-green-800'
                                                }`}>
                                                {member.role === 'master' ? '마스터 관리자' : (member.role === 'dental_staff' ? '치과 스태프' : '개인 스태프')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                활성
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {member.role !== 'master' && (
                                                <button
                                                    onClick={() => handleDeleteMember(member._id)}
                                                    className="text-slate-400 hover:text-rose-600 font-medium text-sm transition-colors"
                                                >
                                                    방출
                                                </button>
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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'dental_staff'
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'bg-green-50 text-green-600'
                                                }`}>
                                                {member.role === 'dental_staff' ? '치과 스태프' : '개인 스태프'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                읽기 전용
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                            <button
                                                onClick={() => handleReactivateMember(member._id)}
                                                className="text-indigo-500 hover:text-indigo-700 font-medium text-sm transition-colors"
                                            >
                                                활성화
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMember(member._id)}
                                                className="text-slate-400 hover:text-rose-600 font-medium text-sm transition-colors"
                                            >
                                                방출
                                            </button>
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
    );
};

export default MemberManager;
