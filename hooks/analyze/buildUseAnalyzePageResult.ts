import type { useAnalyzeStateMachine } from '../../components/analyze/useAnalyzeStateMachine';
import type { UseAnalyzePageResult } from './useAnalyzePage.types';
import type { UseAnalyzeUploadFilesResult } from './useAnalyzeUploadFiles';

interface BuildUseAnalyzePageResultParams {
  uploadState: UseAnalyzeUploadFilesResult;
  analyzeState: ReturnType<typeof useAnalyzeStateMachine>;
  sizeFormatDetailItems: string[] | null;
  setSizeFormatDetailItems: UseAnalyzePageResult['setSizeFormatDetailItems'];
  demoVideoUrl: string | null;
  isVideoLoading: boolean;
  reportRef: UseAnalyzePageResult['reportRef'];
  handleAnalyze: UseAnalyzePageResult['handleAnalyze'];
  handleLeadSubmit: UseAnalyzePageResult['handleLeadSubmit'];
  handleGoToConsultation: UseAnalyzePageResult['handleGoToConsultation'];
  hasAnyUploadedFile: boolean;
  uploadRequirements: UseAnalyzePageResult['uploadRequirements'];
  analyzeDisabledReasons: string[];
  isAnalyzeDisabled: boolean;
  trialCopy: UseAnalyzePageResult['trialCopy'];
  analyzeTrialFootnoteText: string;
}

export function buildUseAnalyzePageResult({
  uploadState,
  analyzeState,
  sizeFormatDetailItems,
  setSizeFormatDetailItems,
  demoVideoUrl,
  isVideoLoading,
  reportRef,
  handleAnalyze,
  handleLeadSubmit,
  handleGoToConsultation,
  hasAnyUploadedFile,
  uploadRequirements,
  analyzeDisabledReasons,
  isAnalyzeDisabled,
  trialCopy,
  analyzeTrialFootnoteText,
}: BuildUseAnalyzePageResultParams): UseAnalyzePageResult {
  return {
    ...uploadState,
    step: analyzeState.step,
    report: analyzeState.report,
    progress: analyzeState.progress,
    processingMsg: analyzeState.processingMsg,
    error: analyzeState.error,
    emailSent: analyzeState.emailSent,
    leadEmail: analyzeState.leadEmail,
    wantDetailedAnalysis: analyzeState.wantDetailedAnalysis,
    leadHospital: analyzeState.leadHospital,
    leadRegion: analyzeState.leadRegion,
    leadContact: analyzeState.leadContact,
    isSubmittingLead: analyzeState.isSubmittingLead,
    leadSubmitError: analyzeState.leadSubmitError,
    setEmailSent: analyzeState.setEmailSent,
    updateLeadEmail: analyzeState.updateLeadEmail,
    updateWantDetailedAnalysis: analyzeState.updateWantDetailedAnalysis,
    updateLeadHospital: analyzeState.updateLeadHospital,
    updateLeadRegion: analyzeState.updateLeadRegion,
    updateLeadContact: analyzeState.updateLeadContact,
    sizeFormatDetailItems,
    setSizeFormatDetailItems,
    demoVideoUrl,
    isVideoLoading,
    reportRef,
    handleAnalyze,
    handleLeadSubmit,
    handleGoToConsultation,
    hasAnyUploadedFile,
    uploadRequirements,
    analyzeDisabledReasons,
    isAnalyzeDisabled,
    trialCopy,
    analyzeTrialFootnoteText,
  };
}
