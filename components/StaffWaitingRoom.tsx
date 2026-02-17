import React, { useState, useEffect } from 'react';
import { User, Hospital } from '../types';
import { hospitalService } from '../services/hospitalService';

interface StaffWaitingRoomProps {
    currentUser: User;
    onUpdateUser: (user: User) => void;
    onLogout: () => void;
}

const StaffWaitingRoom: React.FC<StaffWaitingRoomProps> = ({ currentUser, onUpdateUser, onLogout }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Hospital[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        const results = await hospitalService.searchHospitals(searchTerm);
        setSearchResults(results);
        setHasSearched(true);
    };

    const handleJoinRequest = async (hospitalId: string) => {
        if (!window.confirm('해당 병원에 가입 신청하시겠습니까?')) return;

        try {
            await hospitalService.requestJoin(hospitalId);
            onUpdateUser({ ...currentUser, hospitalId: hospitalId, status: 'pending' });
            alert('가입 신청이 완료되었습니다. 원장님의 승인을 기다려주세요.');
        } catch (error) {
            alert('가입 신청에 실패했습니다.');
        }
    };

    const [targetHospitalName, setTargetHospitalName] = useState<string>('');

    // 대기 중인 경우 병원명 조회
    useEffect(() => {
        if (currentUser.hospitalId) {
            hospitalService.getHospitalById(currentUser.hospitalId).then(hospital => {
                if (hospital) setTargetHospitalName(hospital.name);
            });
        }
    }, [currentUser.hospitalId]);

    const handleCancelRequest = async () => {
        if (!window.confirm('가입 신청을 취소하시겠습니까?')) return;

        try {
            await hospitalService.leaveHospital();
            onUpdateUser({ ...currentUser, hospitalId: '' });
        } catch (error) {
            alert('가입 취소에 실패했습니다.');
        }
    };

    // If user already requested a hospital (has hospitalId but status is pending)
    if (currentUser.hospitalId) {

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">승인 대기중</h2>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-sm text-slate-500 mb-1">신청한 병원</p>
                        <p className="text-lg font-bold text-indigo-600">{targetHospitalName || '조회 중...'}</p>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                        병원 관리자(원장님)의 승인을 기다리고 있습니다.<br />
                        승인이 완료되면 자동으로 서비스 이용이 가능합니다.
                    </p>
                    <div className="pt-6 flex flex-col gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                        >
                            승인 상태 확인하기 (새로고침)
                        </button>
                        <button
                            onClick={handleCancelRequest}
                            className="w-full py-3 bg-white text-slate-600 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 transition-all"
                        >
                            가입 신청 취소
                        </button>
                        <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 text-sm mt-2">로그아웃</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-10 rounded-3xl shadow-xl max-w-[520px] w-full">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">병원 찾기</h2>
                    <p className="text-slate-500 mt-2">근무 중인 치과 병원을 검색하여 가입을 요청하세요.</p>
                </div>

                <form onSubmit={handleSearch} className="mb-8 relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="병원명 검색 (예: 덴조이)"
                        className="w-full h-14 pl-5 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-2 h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                </form>

                {hasSearched && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-400 ml-1 mb-2">검색 결과</h3>
                        {searchResults.length > 0 ? (
                            searchResults.map(hospital => (
                                <div key={hospital.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{hospital.name}</h4>
                                        <p className="text-xs text-slate-400 mt-1">병원 코드: {hospital.id.slice(0, 8)}</p>
                                    </div>
                                    <button
                                        onClick={() => handleJoinRequest(hospital.id)}
                                        className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"
                                    >
                                        가입요청
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </div>
                )}

                {!hasSearched && (
                    <div className="text-center py-12 text-slate-400 border-t border-slate-100 mt-6">
                        병원명을 입력하여 검색해주세요.
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 font-medium">로그아웃</button>
                </div>
            </div>
        </div>
    );
};

export default StaffWaitingRoom;
