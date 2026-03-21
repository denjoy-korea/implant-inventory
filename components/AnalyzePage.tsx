import React, { useState, useEffect } from 'react';
import { useAnalyzePage, type ConsultationPrefill } from '../hooks/useAnalyzePage';
import AnalyzeProcessingStep from './analyze/AnalyzeProcessingStep';
import AnalyzeReportStep from './analyze/AnalyzeReportStep';
import AnalyzeUploadStep from './analyze/AnalyzeUploadStep';
import MobileAnalyzeGate from './analyze/MobileAnalyzeGate';
import { buildAnalyzeReportStepProps, buildAnalyzeUploadStepProps } from './analyze/buildAnalyzeStepProps';

interface AnalyzePageProps {
  onSignup: () => void;
  onContact: (data: ConsultationPrefill) => void;
}

const AnalyzePage: React.FC<AnalyzePageProps> = ({ onSignup, onContact }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobileSize = window.matchMedia('(max-width: 1023px)').matches;
      const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      setIsMobile(isMobileSize || isTouchDevice);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const analyze = useAnalyzePage({ onContact });
  const { step, report, progress, processingMsg } = analyze;

  if (isMobile) {
    return (
      <MobileAnalyzeGate
        onSignup={onSignup}
        onContact={() => onContact({ email: '' })}
      />
    );
  }

  if (step === 'upload') {
    const uploadStepProps = buildAnalyzeUploadStepProps(analyze);
    return (
      <AnalyzeUploadStep {...uploadStepProps} />
    );
  }

  if (step === 'processing') {
    return <AnalyzeProcessingStep progress={progress} processingMsg={processingMsg} />;
  }

  if (!report) return null;

  const reportStepProps = buildAnalyzeReportStepProps(analyze, onSignup);
  return <AnalyzeReportStep {...reportStepProps} />;
};

export default AnalyzePage;
