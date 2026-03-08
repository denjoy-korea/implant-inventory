import React, { useEffect, useState } from 'react';
import ModalShell from '../shared/ModalShell';
import { DbProfile, PLAN_LIMITS, PLAN_NAMES, PlanType } from '../../types';
import { hospitalService } from '../../services/hospitalService';

interface DowngradeMemberSelectModalProps {
  hospitalId: string;
  newPlan: PlanType;
  onConfirm: (memberIdsToSuspend: string[]) => void;
  onCancel: () => void;
}

const DowngradeMemberSelectModal: React.FC<DowngradeMemberSelectModalProps> = ({
  hospitalId,
  newPlan,
  onConfirm,
  onCancel,
}) => {
  const [members, setMembers] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [keepIds, setKeepIds] = useState<Set<string>>(new Set());

  const maxUsers = PLAN_LIMITS[newPlan].maxUsers;
  const maxStaff = maxUsers === Infinity ? Infinity : maxUsers - 1;

  useEffect(() => {
    hospitalService.getMembers(hospitalId).then(m => {
      setMembers(m);
      const nonMaster = m.filter(p => p.role !== 'master');
      const initial = new Set(
        nonMaster.slice(0, maxStaff === Infinity ? nonMaster.length : maxStaff).map(p => p.id)
      );
      setKeepIds(initial);
      setLoading(false);
    });
  }, [hospitalId, maxStaff]);

  const masterMembers = members.filter(p => p.role === 'master');
  const staffMembers = members.filter(p => p.role !== 'master');
  const suspendCount = staffMembers.filter(p => !keepIds.has(p.id)).length;

  const toggle = (id: string) => {
    setKeepIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (maxStaff !== Infinity && next.size >= maxStaff) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const masterIds = masterMembers.map(p => p.id);
    const allKeep = new Set([...masterIds, ...Array.from(keepIds)]);
    const toSuspend = staffMembers.filter(p => !allKeep.has(p.id)).map(p => p.id);
    onConfirm(toSuspend);
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onCancel}
      title="유지할 멤버 선택"
      titleId="downgrade-member-select-title"
      maxWidth="max-w-md"
    >
      <div className="px-6 pt-2 pb-6">
        {/* 안내 배너 */}
        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-bold">{PLAN_NAMES[newPlan]} 플랜은 최대 {maxUsers}명</span>까지 이용 가능합니다.
              {maxStaff > 0
                ? ` 유지할 멤버 최대 ${maxStaff}명을 선택해주세요.`
                : ' 관리자 외 멤버는 모두 접근이 제한됩니다.'
              }
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
            {/* 관리자 (고정 유지) */}
            {masterMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="w-5 h-5 rounded bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                </div>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">관리자</span>
              </div>
            ))}

            {/* 스탭 멤버 */}
            {staffMembers.map(m => {
              const isKeep = keepIds.has(m.id);
              const isFull = !isKeep && maxStaff !== Infinity && keepIds.size >= maxStaff;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => !isFull && toggle(m.id)}
                  disabled={isFull}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    isKeep
                      ? 'bg-white border-slate-300 shadow-sm'
                      : isFull
                      ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isKeep ? 'bg-slate-800 border-slate-800' : 'border-slate-300'
                  }`}>
                    {isKeep && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isKeep ? 'text-slate-800' : 'text-slate-400'}`}>{m.name}</p>
                    <p className="text-xs text-slate-400 truncate">{m.email}</p>
                  </div>
                  {!isKeep && (
                    <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full flex-shrink-0">접근 제한</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 요약 */}
        {!loading && suspendCount > 0 && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <p className="text-xs text-rose-700 text-center leading-relaxed">
              <span className="font-bold">{suspendCount}명</span>의 멤버가 접근 제한됩니다.
              제한된 멤버는 로그인 시 관리자에게 업그레이드를 요청하는 안내를 받습니다.
            </p>
          </div>
        )}

        {/* 버튼 */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-[0.98]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            확인 후 플랜 변경
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default DowngradeMemberSelectModal;
