import { useState, useCallback, useRef } from 'react';
import {
  classifyAnalyzeError,
  classifyLeadSubmitError,
  PROCESSING_MESSAGES,
} from '../components/analyze/analyzeHelpers';
import { useAnalyzeStateMachine } from '../components/analyze/useAnalyzeStateMachine';
import { getTrialCopy } from '../utils/trialPolicy';
import { pageViewService } from '../services/pageViewService';
import { buildUseAnalyzePageResult } from './analyze/buildUseAnalyzePageResult';
import { useAnalyzeDemoVideo } from './analyze/useAnalyzeDemoVideo';
import { useAnalyzeExecution } from './analyze/useAnalyzeExecution';
import { useAnalyzeHandleAnalyze } from './analyze/useAnalyzeHandleAnalyze';
import { useAnalyzeLeadSubmit } from './analyze/useAnalyzeLeadSubmit';
import type { UseAnalyzePageResult } from './analyze/useAnalyzePage.types';
import { useAnalyzeUploadFiles } from './analyze/useAnalyzeUploadFiles';

export interface ConsultationPrefill {
  email: string;
  hospitalName?: string;
  region?: string;
  contact?: string;
}

interface UseAnalyzePageOptions {
  onContact: (data: ConsultationPrefill) => void;
}

export function useAnalyzePage({ onContact }: UseAnalyzePageOptions): UseAnalyzePageResult {
  const [sizeFormatDetailItems, setSizeFormatDetailItems] = useState<string[] | null>(null);
  const { demoVideoUrl, isVideoLoading } = useAnalyzeDemoVideo();
  const reportRef = useRef<HTMLDivElement>(null);
  const analyzeState = useAnalyzeStateMachine({ reportRef });
  const trialCopy = getTrialCopy();
  const analyzeTrialFootnoteText = `${trialCopy.footnoteWithDot} · ${trialCopy.trialPolicyShort}`;
  const uploadState = useAnalyzeUploadFiles({ clearAnalyzeError: analyzeState.clearAnalyzeError });

  const onUnknownLeadSubmitError = useCallback((err: unknown) => {
    const message = classifyLeadSubmitError(err);
    analyzeState.setLeadSubmitError(classifyLeadSubmitError(err));
    return message;
  }, [analyzeState.setLeadSubmitError]);
  const { executeAnalyze } = useAnalyzeExecution({
    setProgress: analyzeState.setProgress,
    setProcessingMsg: analyzeState.setProcessingMsg,
  });
  const trackAnalyzeStart = useCallback(() => {
    pageViewService.trackEvent(
      'analyze_start',
      {
        fixture_uploaded: Boolean(uploadState.fixtureFile),
        surgery_file_count: uploadState.surgeryFiles.length,
      },
      'analyze',
    );
  }, [uploadState.fixtureFile, uploadState.surgeryFiles.length]);

  const trackAnalyzeComplete = useCallback((result: Awaited<ReturnType<typeof executeAnalyze>>) => {
    pageViewService.trackEvent(
      'analyze_complete',
      {
        score: result.dataQualityScore,
        matched_count: result.matchedCount,
        unmatched_count: result.unmatchedItems.length,
      },
      'analyze',
    );
  }, [executeAnalyze]);

  const trackAnalyzeError = useCallback((message: string) => {
    pageViewService.trackEvent('analyze_error', { message }, 'analyze');
  }, []);

  const { handleAnalyze } = useAnalyzeHandleAnalyze({
    fixtureFile: uploadState.fixtureFile,
    surgeryFiles: uploadState.surgeryFiles,
    analyzeStartMessage: PROCESSING_MESSAGES[0],
    executeAnalyze,
    setAnalyzeError: analyzeState.setAnalyzeError,
    startAnalyzeProcessing: analyzeState.startAnalyzeProcessing,
    completeAnalyzeProcessing: analyzeState.completeAnalyzeProcessing,
    failAnalyzeProcessing: analyzeState.failAnalyzeProcessing,
    classifyAnalyzeError,
    trackAnalyzeStart,
    trackAnalyzeComplete,
    trackAnalyzeError,
  });

  const { handleLeadSubmit } = useAnalyzeLeadSubmit({
    leadEmail: analyzeState.leadEmail,
    wantDetailedAnalysis: analyzeState.wantDetailedAnalysis,
    leadHospital: analyzeState.leadHospital,
    leadRegion: analyzeState.leadRegion,
    leadContact: analyzeState.leadContact,
    report: analyzeState.report,
    isSubmittingLead: analyzeState.isSubmittingLead,
    setIsSubmittingLead: analyzeState.setIsSubmittingLead,
    setLeadSubmitError: analyzeState.setLeadSubmitError,
    setEmailSent: analyzeState.setEmailSent,
    onUnknownSubmitError: onUnknownLeadSubmitError,
  });

  const handleGoToConsultation = useCallback(
    () => onContact({
      email: analyzeState.leadEmail,
      hospitalName: analyzeState.leadHospital,
      region: analyzeState.leadRegion,
      contact: analyzeState.leadContact,
    }),
    [analyzeState.leadContact, analyzeState.leadEmail, analyzeState.leadHospital, analyzeState.leadRegion, onContact],
  );

  const hasAnyUploadedFile = Boolean(uploadState.fixtureFile) || uploadState.surgeryFiles.length > 0;
  const uploadRequirements: UseAnalyzePageResult['uploadRequirements'] = [
    { label: '재고 목록 파일 업로드', status: uploadState.fixtureFile ? 'done' : 'pending' },
    {
      label: '수술기록 파일 1개 이상 업로드',
      detail: '* 6개월 이상 데이터 권장 (분석 정확도 향상)',
      status: uploadState.surgeryFiles.length > 0 ? 'done' : 'pending',
    },
    {
      label: '엑셀 형식(.xlsx/.xls) 확인',
      status: uploadState.uploadFormatWarning ? 'warning' : hasAnyUploadedFile ? 'done' : 'pending',
    },
  ];
  const analyzeDisabledReasons = [
    !uploadState.fixtureFile ? '재고 목록 파일을 업로드해주세요.' : '',
    uploadState.surgeryFiles.length === 0 ? '수술기록 파일을 1개 이상 업로드해주세요.' : '',
  ].filter(Boolean);
  const isAnalyzeDisabled = analyzeDisabledReasons.length > 0;

  return buildUseAnalyzePageResult({
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
  });
}
