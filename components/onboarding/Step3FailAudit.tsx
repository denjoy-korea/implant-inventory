import React from 'react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step3FailAudit({ onNext, onBack }: Props) {
  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">재고 실사 & FAIL 매칭</h2>
      <p className="text-sm text-slate-500 mb-5">
        수술기록의 FAIL 항목을 확인하고<br />
        실제 재고와 맞춰 데이터를 정확하게 만들어요.
      </p>

      <div className="space-y-3 mb-5">
        {[
          {
            step: '1',
            title: 'FAIL 항목 확인',
            desc: 'FAIL 관리 탭에서 수술 중 FAIL 목록 확인',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            ),
          },
          {
            step: '2',
            title: 'FAIL 교환 처리',
            desc: '교환 완료된 항목 처리 → 재고 자동 차감',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            ),
          },
          {
            step: '3',
            title: '재고 실사',
            desc: '실제 재고 수량과 시스템 수량 비교·조정',
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

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-colors"
        >
          이전
        </button>
        <button
          onClick={onNext}
          className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          FAIL 관리 페이지로 이동
        </button>
      </div>
    </div>
  );
}
