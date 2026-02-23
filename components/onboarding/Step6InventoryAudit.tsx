import React from 'react';

interface Props {
  onGoToBaseStockEdit: () => void;
}

export default function Step6InventoryAudit({ onGoToBaseStockEdit }: Props) {
  return (
    <div className="px-5 py-5 flex flex-col h-full">
      <h2 className="text-lg font-black text-slate-900 mb-0.5">기초재고 등록</h2>
      <p className="text-xs text-slate-500 mb-4">
        현재 실제로 보유한 재고 수량을 시스템에 입력하면 발주 및 재고 관리가 시작됩니다.
      </p>

      <div className="space-y-2 mb-4">
        {[
          {
            step: '1',
            title: '재고 관리 마스터 진입',
            desc: '기초재고 편집 버튼 클릭',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            ),
          },
          {
            step: '2',
            title: '현재 보유 수량 입력',
            desc: '각 품목의 실제 재고 수량을 직접 입력',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            ),
          },
          {
            step: '3',
            title: '저장 완료',
            desc: '저장하면 발주 권장 수량 계산이 활성화',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
          },
        ].map(({ step, title, desc, icon }) => (
          <div key={step} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-black text-indigo-500 leading-none mb-0.5">STEP {step}</div>
              <div className="text-xs font-bold text-slate-800">{title}</div>
              <div className="text-[11px] text-slate-500 leading-tight">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-4">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-xs font-bold text-amber-700 mb-0.5">실제 재고 기준으로 입력하세요</p>
          <p className="text-[11px] text-amber-600 leading-snug">
            지금 창고에 있는 수량을 그대로 입력하면 정확한 발주 권장량을 계산할 수 있습니다.
          </p>
        </div>
      </div>

      <button
        onClick={onGoToBaseStockEdit}
        className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all mt-auto"
      >
        기초재고 편집 시작
      </button>
    </div>
  );
}
