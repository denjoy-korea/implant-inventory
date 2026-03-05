import type { UseAnalyzePageResult } from '../../hooks/analyze/useAnalyzePage.types';
import type { AnalyzeReportStepProps } from './AnalyzeReportStep';
import type { AnalyzeUploadStepProps } from './AnalyzeUploadStep';

export function buildAnalyzeUploadStepProps(analyze: UseAnalyzePageResult): AnalyzeUploadStepProps {
  return {
    fixtureFile: analyze.fixtureFile,
    setFixtureFile: analyze.setFixtureFile,
    surgeryFiles: analyze.surgeryFiles,
    demoVideoUrl: analyze.demoVideoUrl,
    isVideoLoading: analyze.isVideoLoading,
    uploadFormatWarning: analyze.uploadFormatWarning,
    error: analyze.error,
    fixtureDrop: analyze.fixtureDrop,
    surgeryDrop: analyze.surgeryDrop,
    uploadRequirements: analyze.uploadRequirements,
    analyzeDisabledReasons: analyze.analyzeDisabledReasons,
    isAnalyzeDisabled: analyze.isAnalyzeDisabled,
    handleFixtureChange: analyze.handleFixtureChange,
    handleSurgeryChange: analyze.handleSurgeryChange,
    removeSurgeryFile: analyze.removeSurgeryFile,
    handleDrop: analyze.handleDrop,
    handleDragOver: analyze.handleDragOver,
    handleAnalyze: analyze.handleAnalyze,
  };
}

export function buildAnalyzeReportStepProps(
  analyze: UseAnalyzePageResult,
  onSignup: () => void,
): AnalyzeReportStepProps {
  if (!analyze.report) {
    throw new Error('buildAnalyzeReportStepProps requires report state.');
  }

  return {
    reportRef: analyze.reportRef,
    report: analyze.report,
    sizeFormatDetailItems: analyze.sizeFormatDetailItems,
    setSizeFormatDetailItems: analyze.setSizeFormatDetailItems,
    emailSent: analyze.emailSent,
    leadEmail: analyze.leadEmail,
    wantDetailedAnalysis: analyze.wantDetailedAnalysis,
    leadHospital: analyze.leadHospital,
    leadRegion: analyze.leadRegion,
    leadContact: analyze.leadContact,
    isSubmittingLead: analyze.isSubmittingLead,
    leadSubmitError: analyze.leadSubmitError,
    updateLeadEmail: analyze.updateLeadEmail,
    updateWantDetailedAnalysis: analyze.updateWantDetailedAnalysis,
    updateLeadHospital: analyze.updateLeadHospital,
    updateLeadRegion: analyze.updateLeadRegion,
    updateLeadContact: analyze.updateLeadContact,
    handleLeadSubmit: analyze.handleLeadSubmit,
    handleGoToConsultation: analyze.handleGoToConsultation,
    onSignup,
    analyzeTrialFootnoteText: analyze.analyzeTrialFootnoteText,
  };
}
