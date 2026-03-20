import { useState, useMemo, useEffect } from 'react';
import ModalShell from '../shared/ModalShell';
import { RETURN_REASON_LABELS } from '../../types';
import { displayMfr } from '../../hooks/useOrderManagerData';
import { GroupedReturnRequest } from '../../hooks/useOrderManager';

interface Props {
  group: GroupedReturnRequest | null;
  isLoading: boolean;
  /** approvedTotal: 인정된 총 수량 → 비율로 품목별 actual_received_qty 분배 */
  onConfirm: (actualQties: Record<string, number>) => Promise<void>;
  onClose: () => void;
}

export function ReturnResultModal({ group, isLoading, onConfirm, onClose }: Props) {
  const allItems = useMemo(
    () => (group ? group.requests.flatMap(r => r.items) : []),
    [group]
  );

  const totalRequested = allItems.reduce((s, i) => s + i.quantity, 0);

  const [approvedTotal, setApprovedTotal] = useState(totalRequested);

  // group이 바뀔 때 초기화
  useEffect(() => {
    setApprovedTotal(totalRequested);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  const rejectedTotal = totalRequested - approvedTotal;
  const approvedRate = totalRequested > 0 ? Math.round((approvedTotal / totalRequested) * 100) : 0;

  const handleApprovedChange = (v: number) => {
    setApprovedTotal(Math.min(totalRequested, Math.max(0, v)));
  };

  const handleConfirm = async () => {
    if (!group) return;

    // 인정 수량을 품목 수량 비율로 분배 (합계가 approvedTotal과 일치하도록 보정)
    const ratio = totalRequested > 0 ? approvedTotal / totalRequested : 0;
    let remaining = approvedTotal;
    const actualQties: Record<string, number> = {};

    allItems.forEach((item, idx) => {
      if (idx === allItems.length - 1) {
        // 마지막 품목에 나머지 전부 배정 (반올림 오차 보정)
        actualQties[item.id] = Math.max(0, remaining);
      } else {
        const qty = Math.min(item.quantity, Math.floor(item.quantity * ratio));
        actualQties[item.id] = qty;
        remaining -= qty;
      }
    });

    await onConfirm(actualQties);
  };

  const reason = group?.requests[0]?.reason;

  return (
    <ModalShell
      isOpen={!!group}
      onClose={onClose}
      title="반품 처리 결과 입력"
      maxWidth="sm:max-w-md"
      className="flex flex-col"
      backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
    >
      {group && (
        <>
          {/* Drag indicator (mobile only) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>
          {/* 헤더 정보 */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-800">{displayMfr(group.manufacturer)}</span>
              {reason && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-orange-50 border border-orange-200 text-orange-700">
                  {RETURN_REASON_LABELS[reason]}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{group.date}</p>
          </div>

          {/* 안내 */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-start gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3.5 py-3">
              <svg className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-teal-700 leading-relaxed">
                제조사에서 인정한 총 수량을 입력하세요.
                <strong className="block mt-0.5">인정 수량만큼 동일 품목 재발주가 가능합니다.</strong>
              </p>
            </div>
          </div>

          {/* 수량 입력 영역 */}
          <div className="px-5 py-4 flex flex-col gap-4">
            {/* 총 반품 수량 (읽기 전용) */}
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm font-bold text-slate-500">총 반품 수량</span>
              <span className="text-lg font-black text-slate-800 tabular-nums">{totalRequested}개</span>
            </div>

            {/* 인정 수량 입력 */}
            <div className="flex items-center justify-between py-3 px-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div>
                <span className="text-sm font-black text-emerald-700">인정 수량</span>
                <p className="text-[10px] text-emerald-500 mt-0.5">재발주 가능</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white rounded-lg border border-emerald-300 px-2 py-1.5">
                  <button
                    onClick={() => handleApprovedChange(approvedTotal - 1)}
                    disabled={isLoading || approvedTotal <= 0}
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold disabled:opacity-30"
                  >−</button>
                  <input
                    type="number"
                    min={0}
                    max={totalRequested}
                    value={approvedTotal}
                    onChange={e => handleApprovedChange(parseInt(e.target.value, 10) || 0)}
                    disabled={isLoading}
                    className="w-12 text-center text-base font-black text-emerald-700 tabular-nums bg-transparent outline-none"
                  />
                  <button
                    onClick={() => handleApprovedChange(approvedTotal + 1)}
                    disabled={isLoading || approvedTotal >= totalRequested}
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold disabled:opacity-30"
                  >+</button>
                </div>
                <span className="text-sm font-bold text-emerald-600">개</span>
              </div>
            </div>

            {/* 불인정 수량 (자동 계산) */}
            <div className="flex items-center justify-between py-3 px-4 bg-rose-50 rounded-xl border border-rose-200">
              <div>
                <span className="text-sm font-black text-rose-600">불인정 수량</span>
                <p className="text-[10px] text-rose-400 mt-0.5">손실 처리</p>
              </div>
              <span className="text-lg font-black text-rose-600 tabular-nums">{rejectedTotal}개</span>
            </div>

            {/* 시각적 비율 바 */}
            {totalRequested > 0 && (
              <div className="space-y-1.5">
                <div className="flex h-3 rounded-full overflow-hidden bg-rose-100">
                  <div
                    className="bg-emerald-400 transition-all duration-200"
                    style={{ width: `${approvedRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="text-emerald-600">인정 {approvedRate}%</span>
                  <span className="text-rose-400">불인정 {100 - approvedRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2"
               style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-[2] py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm flex items-center justify-center gap-2"
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
