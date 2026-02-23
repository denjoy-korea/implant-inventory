import React from 'react';

export default function Step6InventoryAudit() {
  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">재고 실사 및 반영</h2>
      <p className="text-sm text-slate-500 mb-5">
        실제 재고 수량과 시스템 수량을 비교하여<br />
        차이가 있는 항목을 조정합니다.
      </p>

      <div className="space-y-3 mb-5">
        {[
          {
            step: '1',
            title: '재고 현황 확인',
            desc: '재고 탭에서 현재 시스템 수량 확인',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            ),
          },
          {
            step: '2',
            title: '실제 수량과 비교',
            desc: '실물 재고를 직접 세어 시스템 수량과 대조',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            ),
          },
          {
            step: '3',
            title: '실사 조정 적용',
            desc: '차이 항목의 수량을 수정하여 동기화 완료',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
          },
        ].map(({ step, title, desc, icon }) => (
          <div key={step} className="flex items-start gap-3 bg-slate-50 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
              </svg>
            </div>
            <div>
              <div className="text-xs font-black text-indigo-500 mb-0.5">STEP {step}</div>
              <div className="text-sm font-bold text-slate-800">{title}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
