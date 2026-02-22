import React, { useState } from 'react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const GUIDE_STEPS = [
  {
    step: '1',
    title: '덴트웹 접속',
    desc: '수술기록 메뉴 → 엑셀 내보내기',
    img: '/guide-dentweb-step1.png',
    imgSm: '/guide-dentweb-step1-sm.png',
  },
  {
    step: '2',
    title: '기간 설정',
    desc: '조회 기간을 선택하고 엑셀 내보내기 클릭',
    img: '/guide-dentweb-step2.png',
    imgSm: '/guide-dentweb-step2-sm.png',
  },
  {
    step: '3',
    title: '파일 저장',
    desc: '다운로드된 .xlsx 파일 확인',
    img: '/guide-dentweb-step3.png',
    imgSm: '/guide-dentweb-step3-sm.png',
  },
  {
    step: '4',
    title: '덴조이 업로드',
    desc: '수술기록 업로드 탭 → 파일 선택',
    img: '/guide-dentweb-step4.png',
    imgSm: '/guide-dentweb-step4-sm.png',
  },
];

export default function Step4UploadGuide({ onNext, onBack }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const current = GUIDE_STEPS[activeStep];

  return (
    <div className="px-6 py-6">
      <h2 className="text-xl font-black text-slate-900 mb-1">수술기록 업로드 방법</h2>
      <p className="text-sm text-slate-500 mb-5">덴트웹 엑셀 파일을 그대로 올리면 됩니다</p>

      {/* 이미지 가이드 */}
      <div className="bg-slate-100 rounded-2xl overflow-hidden mb-4">
        <img
          src={current.imgSm}
          alt={`덴트웹 내보내기 STEP ${current.step}`}
          className="w-full object-cover"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* 스텝 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {GUIDE_STEPS.map((s, i) => (
          <button
            key={s.step}
            onClick={() => setActiveStep(i)}
            className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors
              ${i === activeStep
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
          >
            <span className="text-[10px] opacity-70">STEP {s.step}</span>
            <span className="text-[11px]">{s.title}</span>
          </button>
        ))}
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 mb-4">
        <p className="text-sm font-bold text-slate-800">{current.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{current.desc}</p>
      </div>

      {/* 샘플 다운로드 */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-indigo-800">엑셀 샘플 파일</p>
            <p className="text-xs text-indigo-600 mt-0.5">어떤 형식인지 미리 확인하세요</p>
          </div>
          <a
            href="/surgery_sample.xlsx"
            download="덴조이_수술기록_샘플.xlsx"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            onClick={e => {
              // 파일이 없으면 기본 동작 방지 후 안내
              fetch('/surgery_sample.xlsx', { method: 'HEAD' }).then(r => {
                if (!r.ok) {
                  e.preventDefault();
                  alert('샘플 파일 준비 중입니다. 덴트웹에서 직접 내보내기 해주세요.');
                }
              });
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            샘플 다운로드
          </a>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            업로드는 지금 당장 안 해도 됩니다. 재고 입력만으로도 대시보드에서 부족 품목을 바로 확인할 수 있어요.
          </p>
        </div>
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
          수술기록 업로드하기
        </button>
      </div>
    </div>
  );
}
