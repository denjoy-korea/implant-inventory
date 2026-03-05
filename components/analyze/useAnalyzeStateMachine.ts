import { useCallback, useEffect, useState } from 'react';
import { AnalysisReport } from '../../types';
import { useAnalyzeLeadFormState } from './useAnalyzeLeadFormState';

export type AnalyzeStep = 'upload' | 'processing' | 'report';

interface UseAnalyzeStateMachineParams {
  reportRef: React.RefObject<HTMLDivElement | null>;
}

export function useAnalyzeStateMachine({ reportRef }: UseAnalyzeStateMachineParams) {
  const [step, setStep] = useState<AnalyzeStep>('upload');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingMsg, setProcessingMsg] = useState('');
  const [error, setError] = useState('');
  const leadFormState = useAnalyzeLeadFormState();

  useEffect(() => {
    if (step === 'report' && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step, reportRef]);

  const clearAnalyzeError = useCallback(() => {
    setError('');
  }, []);

  const setAnalyzeError = useCallback((message: string) => {
    setError(message);
  }, []);

  const startAnalyzeProcessing = useCallback((initialMessage: string) => {
    setError('');
    setStep('processing');
    setProgress(0);
    setProcessingMsg(initialMessage);
  }, []);

  const completeAnalyzeProcessing = useCallback((nextReport: AnalysisReport) => {
    setProgress(100);
    setProcessingMsg('분석이 완료되었습니다!');
    setTimeout(() => {
      setReport(nextReport);
      setStep('report');
    }, 600);
  }, []);

  const failAnalyzeProcessing = useCallback((message: string) => {
    setError(message);
    setStep('upload');
  }, []);

  return {
    step,
    report,
    progress,
    processingMsg,
    error,
    setProgress,
    setProcessingMsg,
    clearAnalyzeError,
    setAnalyzeError,
    startAnalyzeProcessing,
    completeAnalyzeProcessing,
    failAnalyzeProcessing,
    ...leadFormState,
  };
}
