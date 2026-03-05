import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AnalysisReport } from '../../types';
import { runAnalyzeLeadSubmitFlow } from './analyzeLeadSubmitFlow';

interface UseAnalyzeLeadSubmitParams {
  leadEmail: string;
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  report: AnalysisReport | null;
  isSubmittingLead: boolean;
  setIsSubmittingLead: Dispatch<SetStateAction<boolean>>;
  setLeadSubmitError: Dispatch<SetStateAction<string>>;
  setEmailSent: Dispatch<SetStateAction<boolean>>;
  onUnknownSubmitError: (err: unknown) => string;
}

interface UseAnalyzeLeadSubmitResult {
  handleLeadSubmit: () => Promise<void>;
}

export function useAnalyzeLeadSubmit({
  leadEmail,
  wantDetailedAnalysis,
  leadHospital,
  leadRegion,
  leadContact,
  report,
  isSubmittingLead,
  setIsSubmittingLead,
  setLeadSubmitError,
  setEmailSent,
  onUnknownSubmitError,
}: UseAnalyzeLeadSubmitParams): UseAnalyzeLeadSubmitResult {
  const handleLeadSubmit = useCallback(async () => {
    if (!leadEmail || !report) return;
    if (wantDetailedAnalysis && (!leadHospital || !leadRegion || !leadContact)) return;
    if (isSubmittingLead) return;

    await runAnalyzeLeadSubmitFlow({
      leadEmail,
      wantDetailedAnalysis,
      leadHospital,
      leadRegion,
      leadContact,
      report,
      setIsSubmittingLead,
      setLeadSubmitError,
      setEmailSent,
      onUnknownSubmitError,
    });
  }, [
    isSubmittingLead,
    leadContact,
    leadEmail,
    leadHospital,
    leadRegion,
    onUnknownSubmitError,
    report,
    setEmailSent,
    setIsSubmittingLead,
    setLeadSubmitError,
    wantDetailedAnalysis,
  ]);

  return { handleLeadSubmit };
}
