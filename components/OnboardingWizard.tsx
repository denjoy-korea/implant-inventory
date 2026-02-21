import React, { useState, useRef } from 'react';
import { onboardingService } from '../services/onboardingService';
import Step1Welcome from './onboarding/Step1Welcome';
import Step2FixtureUpload from './onboarding/Step2FixtureUpload';
import Step4UploadGuide from './onboarding/Step4UploadGuide';
import Step3FailAudit from './onboarding/Step3FailAudit';

interface Props {
  hospitalId: string;
  hospitalName: string;
  initialStep: number;
  onComplete: () => void;
  onSkip: () => void;
  onGoToDataSetup: () => void;
  onGoToSurgeryUpload: () => void;
  onGoToFailManagement: () => void;
}

const TOTAL_STEPS = 4;

export default function OnboardingWizard({
  hospitalId,
  hospitalName,
  initialStep,
  onComplete,
  onSkip,
  onGoToDataSetup,
  onGoToSurgeryUpload,
  onGoToFailManagement,
}: Props) {
  const [step, setStep] = useState(initialStep);
  const [animating, setAnimating] = useState(false);
  const directionRef = useRef<'forward' | 'back'>('forward');

  const goToStep = (next: number) => {
    directionRef.current = next > step ? 'forward' : 'back';
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 150);
  };

  // 나중에: 영구 기록 없이 닫기 (다음 방문 시 해당 단계부터 다시 표시)
  const handleSkip = () => {
    onSkip();
  };

  // Step 1: 웰컴 확인 기록 후 다음
  const handleWelcomeNext = () => {
    onboardingService.markWelcomeSeen(hospitalId);
    goToStep(2);
  };

  // Step 3: 수술기록 업로드 화면으로 이동
  const handleSurgeryGuideNext = () => {
    onGoToSurgeryUpload();
  };

  // Step 4: FAIL 관리 화면으로 이동 + 완료 기록
  const handleFailAuditNext = () => {
    onboardingService.markFailAuditDone(hospitalId);
    onGoToFailManagement();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            시작 가이드
          </span>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
              <div
                key={s}
                className={`rounded-full transition-all ${
                  s === step
                    ? 'w-5 h-2 bg-indigo-600'
                    : s < step
                    ? 'w-2 h-2 bg-indigo-300'
                    : 'w-2 h-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            나중에
          </button>
        </div>

        {/* Step Content */}
        <div
          className="overflow-y-auto flex-1 transition-all duration-150"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${directionRef.current === 'forward' ? '12px' : '-12px'})`
              : 'translateX(0)',
          }}
        >
          {step === 1 ? (
            <Step1Welcome
              hospitalName={hospitalName}
              onNext={handleWelcomeNext}
              onSkip={handleSkip}
            />
          ) : step === 2 ? (
            <Step2FixtureUpload
              onNext={() => goToStep(3)}
              onBack={() => goToStep(1)}
              onGoToDataSetup={onGoToDataSetup}
            />
          ) : step === 3 ? (
            <Step4UploadGuide
              onNext={handleSurgeryGuideNext}
              onBack={() => goToStep(2)}
            />
          ) : (
            <Step3FailAudit
              onNext={handleFailAuditNext}
              onBack={() => goToStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
