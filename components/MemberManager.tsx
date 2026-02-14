import React, { useState, useEffect } from 'react';
import { User, UserRole, Hospital } from '../types';

interface MemberManagerProps {
    currentUser: User;
    onClose: () => void;
}

const MemberManager: React.FC<MemberManagerProps> = ({ currentUser, onClose }) => {
    const [members, setMembers] = useState<User[]>([]);
    const [pendingMembers, setPendingMembers] = useState<User[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberPassword, setNewMemberPassword] = useState('');
    const [currentHospital, setCurrentHospital] = useState<Hospital | null>(null);

    useEffect(() => {
        loadData();
    }, [currentUser.hospitalId]);

    const loadData = () => {
        const storedUsersJson = localStorage.getItem('app_users');
        const allUsers: User[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];

        // Active Members
        const active = allUsers.filter(u => u.hospitalId === currentUser.hospitalId && u.status !== 'pending');
        setMembers(active);

        // Pending Members (Staff requesting to join)
        const pending = allUsers.filter(u => u.hospitalId === currentUser.hospitalId && u.status === 'pending');
        setPendingMembers(pending);

        // Hospital Info
        const storedHospitalsJson = localStorage.getItem('app_hospitals');
        const hospitals: Hospital[] = storedHospitalsJson ? JSON.parse(storedHospitalsJson) : [];
        const myHospital = hospitals.find(h => h.id === currentUser.hospitalId);
        setCurrentHospital(myHospital || null);
    };

    const handleApprove = (emailToApprove: string) => {
        if (!window.confirm('가입을 승인하시겠습니까?')) return;

        const storedUsersJson = localStorage.getItem('app_users');
        let allUsers: User[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];

        allUsers = allUsers.map(u => {
            if (u.email === emailToApprove) {
                return { ...u, status: 'active' };
            }
            return u;
        });

        localStorage.setItem('app_users', JSON.stringify(allUsers));
        loadData();
        alert('승인되었습니다.');
    };

    const handleReject = (emailToReject: string) => {
        if (!window.confirm('가입 요청을 거절하시겠습니까?')) return;

        const storedUsersJson = localStorage.getItem('app_users');
        let allUsers: User[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];

        allUsers = allUsers.map(u => {
            if (u.email === emailToReject) {
                // Reset hospitalId so they can search again
                return { ...u, hospitalId: '', status: 'pending' };
            }
            return u;
        });

        localStorage.setItem('app_users', JSON.stringify(allUsers));
        loadData();
        alert('거절되었습니다.');
    };

    const handleAddMember = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberName || !newMemberEmail || !newMemberPassword) return;

        const storedUsersJson = localStorage.getItem('app_users');
        const allUsers: User[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];

        if (allUsers.some(u => u.email === newMemberEmail)) {
            alert('이미 사용 중인 이메일/아이디입니다.');
            return;
        }

        const newMember: User = {
            name: newMemberName,
            email: newMemberEmail,
            role: 'dental_staff',
            hospitalId: currentUser.hospitalId,
            status: 'active' // Direct add by admin is auto-active
        } as any;
        (newMember as any).password = newMemberPassword;

        const updatedUsers = [...allUsers, newMember];
        localStorage.setItem('app_users', JSON.stringify(updatedUsers));

        loadData();
        setIsAdding(false);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberPassword('');
        alert('구성원이 추가되었습니다.');
    };

    const handleDeleteMember = (emailToDelete: string) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        const storedUsersJson = localStorage.getItem('app_users');
        const allUsers: User[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];

        // For "Leave Hospital" effect, we might just clear hospitalId depending on requirement,
        // but "Delete Member" usually implies removing them from the system or the hospital.
        // Let's remove them from the system for now (or reset them).
        // The user said "Job Change" resets data. 
        // If Admin deletes them, let's just remove them from this hospital (reset hospitalId).

        const updatedUsers = allUsers.map(u => {
            if (u.email === emailToDelete) {
                return { ...u, hospitalId: '', status: 'pending' };
            }
            return u;
        });

        localStorage.setItem('app_users', JSON.stringify(updatedUsers));
        loadData();
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
                                                        onClick={() => handleApprove(member.email)}
                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                    >
                                                        승인
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(member.email)}
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
                            <p className="text-sm text-slate-500 mt-1">스태프를 등록하여 재고 관리 업무를 분담하세요.</p>
                        </div>
                        {!isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                구성원 추가
                            </button>
                        )}
                    </div>

                    {isAdding && (
                        <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
                            <h4 className="font-bold text-slate-800 mb-4">새 구성원 정보 입력</h4>
                            <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    placeholder="이름"
                                    value={newMemberName}
                                    onChange={e => setNewMemberName(e.target.value)}
                                    className="px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="아이디 (이메일)"
                                    value={newMemberEmail}
                                    onChange={e => setNewMemberEmail(e.target.value)}
                                    className="px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="비밀번호"
                                    value={newMemberPassword}
                                    onChange={e => setNewMemberPassword(e.target.value)}
                                    className="px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                    required
                                />
                                <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors"
                                    >
                                        등록하기
                                    </button>
                                </div>
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
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {member.role !== 'master' && (
                                                <button
                                                    onClick={() => handleDeleteMember(member.email)}
                                                    className="text-slate-400 hover:text-rose-600 font-medium text-sm transition-colors"
                                                >
                                                    방출
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {members.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
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
