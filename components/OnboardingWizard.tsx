import React, { useState, useRef } from 'react';
import { onboardingService } from '../services/onboardingService';
import { InventoryItem } from '../types';
import Step1Welcome from './onboarding/Step1Welcome';
import Step2DenwebFixtureDownload from './onboarding/Step2DenwebFixtureDownload';
import Step2FixtureUpload from './onboarding/Step2FixtureUpload';
import Step4DenwebSurgeryDownload from './onboarding/Step4DenwebSurgeryDownload';
import Step4UploadGuide from './onboarding/Step4UploadGuide';
import Step6InventoryAudit from './onboarding/Step6InventoryAudit';
import Step3FailAudit from './onboarding/Step3FailAudit';

// 각 단계 진입 시 표시할 진행률 (단계별 완료 후 사용자가 확정할 값)
const STEP_PROGRESS: Record<number, number> = {
  1: 0,
  2: 15,
  3: 15,
  4: 30,
  5: 50,
  6: 70,
  7: 85,
};


interface Props {
  hospitalId: string;
  hospitalName: string;
  initialStep: number;
  inventory: InventoryItem[];
  onSkip: (snooze: boolean) => void;
  onGoToDataSetup: (file?: File, sizeCorrections?: Map<string, string>) => void;
  onGoToSurgeryUpload: (file?: File) => Promise<boolean> | boolean;
  onGoToInventoryAudit: () => void;
  onGoToFailManagement: () => void;
}


export default function OnboardingWizard({
  hospitalId,
  hospitalName,
  initialStep,
  inventory,
  onSkip,
  onGoToDataSetup,
  onGoToSurgeryUpload,
  onGoToInventoryAudit,
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

  // Step 1: 웰컴 확인 기록 후 다음
  const handleWelcomeNext = () => {
    onboardingService.markWelcomeSeen(hospitalId);
    goToStep(2);
  };

  // Step 7: FAIL 관리 화면으로 이동 (완료 기록은 실제 재고 정리 완료 후 App에서 처리)
  const handleFailAuditNext = () => {
    onGoToFailManagement();
  };

  const handleBack = () => {
    goToStep(step - 1);
  };

  const handleNext = () => {
    if (step === 1) handleWelcomeNext();
    else if (step === 2) { onboardingService.markFixtureDownloaded(hospitalId); goToStep(3); }
    else if (step === 3) goToStep(4);
    else if (step === 4) { onboardingService.markSurgeryDownloaded(hospitalId); goToStep(5); }
    else if (step === 5) goToStep(6);
    else if (step === 6) goToStep(7);
    else handleFailAuditNext();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          {step === 1 ? (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              시작 가이드
            </span>
          ) : (
            <button
              onClick={handleBack}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              이전
            </button>
          )}

          {/* Progress bar */}
          <div className="flex-1 mx-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400">설정 진행률</span>
              <span className="text-[10px] font-bold text-indigo-600">{STEP_PROGRESS[step] ?? 0}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${STEP_PROGRESS[step] ?? 0}%` }}
              />
            </div>
          </div>

          <span className="w-8" />
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
          {step === 1 && <Step1Welcome hospitalName={hospitalName} onNext={handleNext} onSkip={onSkip} />}
          {step === 2 && <Step2DenwebFixtureDownload onNext={handleNext} />}
          {step === 3 && <Step2FixtureUpload onGoToDataSetup={(file, corrections) => {
            onGoToDataSetup(file, corrections);
            onSkip(false); // 데이터 편집 중 위저드 최소화 (토스트로 전환)
          }} />}
          {step === 4 && <Step4DenwebSurgeryDownload onNext={handleNext} />}
          {step === 5 && (
            <Step4UploadGuide
              inventory={inventory}
              onGoToSurgeryUpload={async (file?: File) => {
                const ok = await onGoToSurgeryUpload(file);
                if (!file) onSkip(false); // 탭 이동(파일 없음) 시에만 최소화 — 업로드 실패는 dismiss 안 함
                return ok;
              }}
              onUploaded={() => goToStep(6)}
            />
          )}
          {step === 6 && <Step6InventoryAudit onGoToBaseStockEdit={() => {
            onGoToInventoryAudit();
            onSkip(false); // 재고 편집 중 위저드 최소화 (토스트로 전환)
          }} />}
          {step === 7 && <Step3FailAudit onGoToFailManagement={handleFailAuditNext} />}
        </div>
      </div>
    </div>
  );
}
