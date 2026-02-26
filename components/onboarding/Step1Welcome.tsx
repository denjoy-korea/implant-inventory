import { useState } from 'react';

interface Props {
  hospitalName: string;
  onNext: () => void;
  onSkip: (snooze: boolean) => void;
}

export default function Step1Welcome({ hospitalName, onNext, onSkip }: Props) {
  const [snooze, setSnooze] = useState(false);
  return (
    <div className="flex flex-col items-center text-center px-6 py-3">
      <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-indigo-600 animate-icon-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>

      <h2 className="text-xl font-black text-slate-900 mb-1">
        {hospitalName}에 오신 것을 환영합니다
      </h2>
      <p className="text-slate-500 text-sm mb-1 max-w-sm leading-relaxed">
        4단계만 따라하면 임플란트 재고가 바로 정리됩니다.<br />
        지금 설정하지 않아도 언제든 수정 가능해요.
      </p>
      <span className="text-xs text-slate-400 mb-3">총 약 20~30분 소요</span>

      <div className="w-full max-w-md space-y-1.5 mb-4">
        {[
          { step: '01', label: '픽스처 품목 마스터 등록', desc: '사용 중인 임플란트 품목을 등록합니다', time: '5분' },
          { step: '02', label: '수술 기록 연동', desc: '과거 수술 기록을 불러옵니다', time: '2분' },
          { step: '03', label: '실재고 등록 및 동기화', desc: '실제 보유 수량을 확인하고 입력합니다', time: '10~20분' },
          { step: '04', label: '교환 재고 정합 처리', desc: '불량·분실 항목을 정리합니다', time: '3분' },
        ].map(({ step, label, desc, time }) => (
          <div key={step} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-2 text-left">
            <span className="text-xs font-black text-indigo-500 w-6 shrink-0 pt-0.5">{step}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-700 block">{label}</span>
              <span className="text-xs text-slate-400 block">{desc}</span>
            </div>
            <span className="text-xs text-slate-400 shrink-0 pt-0.5">{time}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-md py-3 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all mb-3"
      >
        시작하기
      </button>

      <div className="flex flex-col items-center gap-1.5">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={snooze}
            onChange={e => setSnooze(e.target.checked)}
            className="w-3 h-3 rounded accent-slate-400"
          />
          <span className="text-[11px] text-slate-400">오늘 하루 이 창 숨기기</span>
        </label>
        <button
          onClick={() => onSkip(snooze)}
          className="text-xs text-slate-400 hover:text-slate-500 transition-colors"
        >
          나중에 직접 설정할게요
        </button>
      </div>
    </div>
  );
}
