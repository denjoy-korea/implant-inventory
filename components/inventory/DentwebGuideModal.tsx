import React, { useState } from 'react';

interface DentwebGuideStep {
  title: string;
  imageSrc: string;
  imageAlt: string;
  description: string;
  isWarning?: boolean;
}

const DENTWEB_GUIDE_STEPS: DentwebGuideStep[] = [
  {
    title: '1) 경영/통계 → 임플란트 수술통계 → 기간설정 → 해당 기록지 더블클릭',
    imageSrc: '/guide-dentweb-step4.png',
    imageAlt: '경영통계 진입 가이드',
    description: '상단 메뉴와 좌측 메뉴에서 임플란트 수술 통계 화면으로 이동한 뒤, 기간을 맞추고 우측 기록을 더블클릭합니다.',
  },
  {
    title: '2) 수술기록지에서 편집가능상태 전환 후 Fixture 클릭',
    imageSrc: '/guide-dentweb-step3.png',
    imageAlt: '수술기록지 편집 상태 전환 및 Fixture 클릭 가이드',
    description: '수술기록지 하단 편집가능상태로 전환 버튼을 누르고 Fixture 영역을 클릭해 선택 팝업을 엽니다.',
  },
  {
    title: '3) 제조사-브랜드-규격 목록에서 선택 후 선택완료',
    imageSrc: '/guide-dentweb-step2.png',
    imageAlt: '제조사-브랜드-규격 목록 선택 가이드',
    description: '직접 타이핑하지 말고 제조사/브랜드/규격을 목록에서 선택한 뒤 선택완료를 누릅니다.',
  },
  {
    title: '4) 직접입력은 절대 사용 금지 (목록 선택만 허용)',
    imageSrc: '/guide-dentweb-step1.png',
    imageAlt: '직접입력 금지 가이드',
    description: '이 화면의 직접입력 칸은 금지 입력 방식입니다. 반드시 목록 선택으로만 입력해야 통계/재고 데이터가 정확합니다.',
    isWarning: true,
  },
];

interface DentwebGuideModalProps {
  onClose: () => void;
}

const DentwebGuideModal: React.FC<DentwebGuideModalProps> = ({ onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = DENTWEB_GUIDE_STEPS[stepIndex] ?? DENTWEB_GUIDE_STEPS[0];
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= DENTWEB_GUIDE_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
        <div className="px-6 py-5 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <h3 className="text-lg font-black">덴트웹 수술기록지 수정 가이드</h3>
            <p className="text-slate-300 text-xs font-medium mt-1">
              수기 입력 건은 반드시 목록 선택 방식으로 수정해야 합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-500">
            단계별로 한 장씩 확인하세요. ({stepIndex + 1}/{DENTWEB_GUIDE_STEPS.length})
          </p>
          <div className="flex items-center gap-1.5">
            {DENTWEB_GUIDE_STEPS.map((_, idx) => (
              <span
                key={`guide-dot-${idx}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === stepIndex ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-4 flex-1 overflow-hidden">
          <section className={`h-full rounded-xl border p-4 flex flex-col gap-3 ${
            currentStep.isWarning
              ? 'border-rose-200 bg-rose-50'
              : 'border-slate-200 bg-white'
          }`}>
            <h4 className={`text-sm font-black break-keep ${
              currentStep.isWarning ? 'text-rose-600' : 'text-slate-800'
            }`}>
              {currentStep.title}
            </h4>
            <p className={`text-xs font-semibold break-keep ${
              currentStep.isWarning ? 'text-rose-500' : 'text-slate-500'
            }`}>
              {currentStep.description}
            </p>
            <div className={`flex-1 min-h-0 rounded-xl overflow-hidden border ${
              currentStep.isWarning ? 'border-rose-200 bg-white' : 'border-slate-200 bg-slate-50'
            }`}>
              <img
                src={currentStep.imageSrc}
                alt={currentStep.imageAlt}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={() => setStepIndex(prev => Math.max(0, prev - 1))}
            disabled={isFirst}
            className={`px-4 py-2 rounded-xl text-sm font-black transition-colors ${
              isFirst
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            이전
          </button>
          {!isLast ? (
            <button
              onClick={() => setStepIndex(prev => Math.min(DENTWEB_GUIDE_STEPS.length - 1, prev + 1))}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition-colors"
            >
              다음
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-700 transition-colors"
            >
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DentwebGuideModal;
