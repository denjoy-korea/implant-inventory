import { useState, useMemo } from 'react';
import ModalShell from '../shared/ModalShell';
import { RETURN_REASON_LABELS } from '../../types';
import { displayMfr } from '../../hooks/useOrderManagerData';
import { GroupedReturnRequest } from '../../hooks/useOrderManager';
import { ReturnRequestItem } from '../../types/return';

interface Props {
  group: GroupedReturnRequest | null;
  isLoading: boolean;
  onConfirm: (actualQties: Record<string, number>) => Promise<void>;
  onClose: () => void;
}

export function ReturnCompleteModal({ group, isLoading, onConfirm, onClose }: Props) {
  const allItems: ReturnRequestItem[] = useMemo(
    () => (group ? group.requests.flatMap(r => r.items) : []),
    [group]
  );

  // 초기값 = 신청 수량 그대로
  const [actualQties, setActualQties] = useState<Record<string, number>>(
    () => Object.fromEntries(allItems.map(item => [item.id, item.quantity]))
  );

  // group이 바뀔 때 초기화
  const [lastGroupId, setLastGroupId] = useState<string | null>(null);
  if (group && group.id !== lastGroupId) {
    setLastGroupId(group.id);
    setActualQties(Object.fromEntries(
      group.requests.flatMap(r => r.items).map(item => [item.id, item.quantity])
    ));
  }

  const totalRequested = allItems.reduce((s, i) => s + i.quantity, 0);
  const totalActual = allItems.reduce((s, i) => s + (actualQties[i.id] ?? i.quantity), 0);
  const stockDelta = totalRequested - totalActual; // 양수 = 재고 복구할 수량

  const handleQtyChange = (id: string, value: number) => {
    setActualQties(prev => ({ ...prev, [id]: Math.max(0, value) }));
  };

  const handleConfirm = async () => {
    if (!group) return;
    await onConfirm(actualQties);
  };

  const reason = group?.requests[0]?.reason;

  return (
    <ModalShell
      isOpen={!!group}
      onClose={onClose}
      title="반품 완료 처리"
      maxWidth="sm:max-w-lg"
      className="flex flex-col max-h-[90vh]"
      backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
    >
      {group && (
        <>
          {/* 헤더 정보 */}
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

          {/* 안내 */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-700 leading-relaxed">
                실제 수거된 수량을 입력해주세요. 신청 수량과 다를 경우 재고가 자동 보정됩니다.
              </p>
            </div>
          </div>

          {/* 품목 목록 */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {/* 헤더 */}
            <div className="flex items-center gap-2 px-2 pb-1.5 border-b border-slate-100">
              <span className="flex-1 text-[11px] font-bold text-slate-400">품목</span>
              <span className="w-14 text-[11px] font-bold text-slate-400 text-center">신청</span>
              <span className="w-20 text-[11px] font-bold text-slate-500 text-center">실수령</span>
            </div>

            <div className="space-y-1 mt-1">
              {allItems.map(item => {
                const actual = actualQties[item.id] ?? item.quantity;
                const diff = item.quantity - actual;
                return (
                  <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{item.brand}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.size}</p>
                    </div>
                    <span className="w-14 text-xs text-slate-500 text-center font-mono">{item.quantity}</span>
                    <div className="w-20 flex items-center gap-1">
                      <div className={`flex items-center gap-1 rounded-lg border px-2 py-1 w-full ${
                        diff > 0 ? 'border-amber-300 bg-amber-50' :
                        diff < 0 ? 'border-rose-300 bg-rose-50' :
                        'border-slate-200 bg-white'
                      }`}>
                        <button
                          onClick={() => handleQtyChange(item.id, actual - 1)}
                          className="text-slate-400 hover:text-slate-600 leading-none text-sm font-bold"
                          disabled={isLoading}
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          value={actual}
                          onChange={e => handleQtyChange(item.id, parseInt(e.target.value, 10) || 0)}
                          className="w-8 text-xs font-mono font-bold text-center bg-transparent outline-none"
                          disabled={isLoading}
                        />
                        <button
                          onClick={() => handleQtyChange(item.id, actual + 1)}
                          className="text-slate-400 hover:text-slate-600 leading-none text-sm font-bold"
                          disabled={isLoading}
                        >+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 합계 및 보정 정보 */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-500">신청 <strong className="text-slate-700 font-mono">{totalRequested}</strong>개</span>
                <span className="text-slate-300">→</span>
                <span className={`font-bold font-mono ${stockDelta !== 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  실수령 {totalActual}개
                </span>
              </div>
              {stockDelta !== 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                  stockDelta > 0
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}>
                  재고 {stockDelta > 0 ? `+${stockDelta}` : stockDelta} 보정
                </span>
              )}
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
