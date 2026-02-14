
import React from 'react';
import { User } from '../types';

interface UserProfileProps {
    user: User;
    onClose: () => void;
    onLeaveHospital: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onClose, onLeaveHospital }) => {
    const isStaff = user.role === 'staff';

    const handleLeave = () => {
        if (window.confirm('정말 이 병원을 떠나시겠습니까?\n이직 시 현재 병원에서의 모든 설정과 권한이 초기화됩니다.')) {
            onLeaveHospital();
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-8 pb-6">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">내 정보</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 text-3xl font-bold border-4 border-white shadow-lg">
                            {user.name.charAt(0)}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{user.name}</h3>
                        <p className="text-slate-500">{user.email}</p>
                        <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${isStaff ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {isStaff ? '개인 회원 (스태프)' : '치과 회원 (원장님)'}
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">소속 정보</h4>
                        {user.hospitalId ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">소속 치과 ID: {user.hospitalId}</p>
                                    <p className="text-xs text-slate-500">데이터가 안전하게 보호되고 있습니다.</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">소속된 병원이 없습니다.</p>
                        )}
                    </div>

                    {isStaff && user.hospitalId && (
                        <div className="pt-4 border-t border-slate-100">
                            <button
                                onClick={handleLeave}
                                className="w-full py-3.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                이직하기 (데이터 초기화)
                            </button>
                            <p className="text-xs text-center text-slate-400 mt-3 px-4">
                                현재 병원과의 연결이 해제되며, 기기에서 관련 설정이 초기화됩니다. 병원의 데이터는 삭제되지 않습니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
