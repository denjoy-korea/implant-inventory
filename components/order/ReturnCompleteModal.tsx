import { useState, useMemo, useEffect } from 'react';
import ModalShell from '../shared/ModalShell';
import { RETURN_REASON_LABELS } from '../../types';
import { displayMfr } from '../../hooks/useOrderManagerData';
import { GroupedReturnRequest } from '../../hooks/useOrderManager';

interface Props {
  group: GroupedReturnRequest | null;
  isLoading: boolean;
  onConfirm: (actualQties: Record<string, number>) => Promise<void>;
  onClose: () => void;
}

export function ReturnCompleteModal({ group, isLoading, onConfirm, onClose }: Props) {
  const allItems = useMemo(
    () => (group ? group.requests.flatMap(r => r.items) : []),
    [group]
  );
  const totalRequested = allItems.reduce((s, i) => s + i.quantity, 0);

  const [rejectedQty, setRejectedQty] = useState(0);

  // group이 바뀔 때 초기화
  useEffect(() => {
    setRejectedQty(0);
  }, [group?.id]);

  const completedQty = Math.max(0, totalRequested - rejectedQty);

  // 완료 수량을 각 품목에 앞에서부터 채워서 분배
  const buildActualQties = (): Record<string, number> => {
    let remaining = completedQty;
    const result: Record<string, number> = {};
    for (const item of allItems) {
      const give = Math.min(item.quantity, remaining);
      result[item.id] = give;
      remaining -= give;
    }
    return result;
  };

  const handleConfirm = async () => {
    if (!group) return;
    await onConfirm(buildActualQties());
  };

  const reason = group?.requests[0]?.reason;

  return (
    <ModalShell
      isOpen={!!group}
      onClose={onClose}
      title="반품 완료 처리"
      maxWidth="sm:max-w-md"
      className="flex flex-col max-h-[90vh]"
      backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
    >
      {group && (
        <>
          {/* 헤더 */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-800">{displayMfr(group.manufacturer)}</span>
              {reason && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-teal-50 border border-teal-200 text-teal-700">
                  {RETURN_REASON_LABELS[reason]}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{group.date}</p>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* 총 신청 개수 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">총 신청 개수</span>
              <span className="text-2xl font-black text-slate-800 tabular-nums">{totalRequested}<span className="text-sm font-bold text-slate-400 ml-1">개</span></span>
            </div>

            {/* 불인정 개수 입력 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 space-y-3">
              <p className="text-sm font-bold text-slate-600">불인정 개수</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="수량 감소"
                  onClick={() => setRejectedQty(prev => Math.max(0, prev - 1))}
                  disabled={isLoading || rejectedQty <= 0}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                </button>
                <input
                  type="number"
                  min={0}
                  max={totalRequested}
                  value={rejectedQty}
                  onChange={e => setRejectedQty(Math.min(totalRequested, Math.max(0, parseInt(e.target.value) || 0)))}
                  aria-label="불인정 개수"
                  disabled={isLoading}
                  className={`flex-1 text-center text-3xl font-black tabular-nums bg-white border rounded-xl py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${rejectedQty > 0 ? 'text-rose-600 border-rose-300 focus:ring-rose-300' : 'text-slate-400 border-slate-200 focus:ring-slate-300'}`}
                />
                <button
                  type="button"
                  aria-label="수량 증가"
                  onClick={() => setRejectedQty(prev => Math.min(totalRequested, prev + 1))}
                  disabled={isLoading || rejectedQty >= totalRequested}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
              </div>
            </div>

            {/* 반품완료 자동 계산 */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5 flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-700">반품완료 개수</span>
              <span className="text-2xl font-black text-emerald-600 tabular-nums">
                {completedQty}<span className="text-sm font-bold ml-1">개</span>
              </span>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-[2] py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  처리 중...
                </>
              ) : '반품 완료 처리'}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
