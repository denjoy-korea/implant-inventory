import React from 'react';
import { useAnalyzePage, type ConsultationPrefill } from '../hooks/useAnalyzePage';
import AnalyzeProcessingStep from './analyze/AnalyzeProcessingStep';
import AnalyzeReportStep from './analyze/AnalyzeReportStep';
import AnalyzeUploadStep from './analyze/AnalyzeUploadStep';
import { buildAnalyzeReportStepProps, buildAnalyzeUploadStepProps } from './analyze/buildAnalyzeStepProps';

interface AnalyzePageProps {
  onSignup: () => void;
  onContact: (data: ConsultationPrefill) => void;
}

const AnalyzePage: React.FC<AnalyzePageProps> = ({ onSignup, onContact }) => {
  const analyze = useAnalyzePage({ onContact });
  const { step, report, progress, processingMsg } = analyze;

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
