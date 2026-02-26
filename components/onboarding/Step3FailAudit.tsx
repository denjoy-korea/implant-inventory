import React from 'react';

interface Props {
  onGoToFailManagement: () => void;
}

export default function Step3FailAudit({ onGoToFailManagement }: Props) {
  return (
    <div className="px-5 py-5 flex flex-col h-full">
      <h2 className="text-lg font-black text-slate-900 mb-0.5">교환 재고 정합 처리</h2>
      <p className="text-xs text-slate-500 mb-4">
        수술기록의 교환 항목을 확인하고 실제 재고와 맞춰 데이터를 정확하게 만들어요.
      </p>

      <div className="space-y-2 mb-4">
        {[
          {
            step: '1',
            title: '교환 항목 확인',
            desc: '교환 관리 탭에서 수술 중 교환 목록 확인',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            ),
          },
          {
            step: '2',
            title: '교환 처리',
            desc: '교환 완료된 항목 처리 → 재고 자동 차감',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            ),
          },
          {
            step: '3',
            title: '재고 동기화 완료',
            desc: '실제 재고 수량과 시스템 수량 최종 확인',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
          },
        ].map(({ step, title, desc, icon }) => (
          <div key={step} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-indigo-600 group-hover:animate-icon-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* 안내 박스 */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-4">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-pulse-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-xs font-bold text-amber-700 mb-0.5">교환 관리 탭에서 진행</p>
          <p className="text-[11px] text-amber-600 leading-snug">
            수술 중 발생한 교환 임플란트를 처리하여 재고를 정확하게 유지합니다.
          </p>
        </div>
      </div>

      <button
        onClick={onGoToFailManagement}
        className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all mt-auto"
      >
        교환 관리 진행하기
      </button>
    </div>
  );
}
