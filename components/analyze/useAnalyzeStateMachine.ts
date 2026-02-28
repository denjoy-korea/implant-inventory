import { useCallback, useEffect, useState } from 'react';
import { AnalysisReport } from '../../types';
import { formatPhoneNumber } from './analyzeHelpers';

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

  const [emailSent, setEmailSent] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [wantDetailedAnalysis, setWantDetailedAnalysis] = useState(false);
  const [leadHospital, setLeadHospital] = useState('');
  const [leadRegion, setLeadRegion] = useState('');
  const [leadContact, setLeadContact] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState('');

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

  const updateLeadEmail = useCallback((value: string) => {
    setLeadEmail(value);
    setLeadSubmitError('');
  }, []);

  const updateWantDetailedAnalysis = useCallback((value: boolean) => {
    setWantDetailedAnalysis(value);
    setLeadSubmitError('');
  }, []);

  const updateLeadHospital = useCallback((value: string) => {
    setLeadHospital(value);
    setLeadSubmitError('');
  }, []);

  const updateLeadRegion = useCallback((value: string) => {
    setLeadRegion(value);
    setLeadSubmitError('');
  }, []);

  const updateLeadContact = useCallback((value: string) => {
    setLeadContact(formatPhoneNumber(value));
    setLeadSubmitError('');
  }, []);

  return {
    step,
    report,
    progress,
    processingMsg,
    error,
    emailSent,
    leadEmail,
    wantDetailedAnalysis,
    leadHospital,
    leadRegion,
    leadContact,
    isSubmittingLead,
    leadSubmitError,
    setProgress,
    setProcessingMsg,
    setIsSubmittingLead,
    setLeadSubmitError,
    setEmailSent,
    clearAnalyzeError,
    setAnalyzeError,
    startAnalyzeProcessing,
    completeAnalyzeProcessing,
    failAnalyzeProcessing,
    updateLeadEmail,
    updateWantDetailedAnalysis,
    updateLeadHospital,
    updateLeadRegion,
    updateLeadContact,
  };
}
