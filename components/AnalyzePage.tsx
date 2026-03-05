import React from 'react';
import { useAnalyzePage, type ConsultationPrefill } from '../hooks/useAnalyzePage';
import AnalyzeProcessingStep from './analyze/AnalyzeProcessingStep';
import AnalyzeReportStep from './analyze/AnalyzeReportStep';
import AnalyzeUploadStep from './analyze/AnalyzeUploadStep';

interface AnalyzePageProps {
  onSignup: () => void;
  onContact: (data: ConsultationPrefill) => void;
}

const AnalyzePage: React.FC<AnalyzePageProps> = ({ onSignup, onContact }) => {
  const {
    fixtureFile,
    setFixtureFile,
    surgeryFiles,
    sizeFormatDetailItems,
    setSizeFormatDetailItems,
    demoVideoUrl,
    isVideoLoading,
    uploadFormatWarning,
    reportRef,
    fixtureDrop,
    surgeryDrop,
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
    updateLeadEmail,
    updateWantDetailedAnalysis,
    updateLeadHospital,
    updateLeadRegion,
    updateLeadContact,
    handleFixtureChange,
    handleSurgeryChange,
    removeSurgeryFile,
    handleDrop,
    handleDragOver,
    handleAnalyze,
    handleLeadSubmit,
    handleGoToConsultation,
    uploadRequirements,
    analyzeDisabledReasons,
    isAnalyzeDisabled,
    analyzeTrialFootnoteText,
  } = useAnalyzePage({ onContact });

  if (step === 'upload') {
    return (
      <AnalyzeUploadStep
        fixtureFile={fixtureFile}
        setFixtureFile={setFixtureFile}
        surgeryFiles={surgeryFiles}
        demoVideoUrl={demoVideoUrl}
        isVideoLoading={isVideoLoading}
        uploadFormatWarning={uploadFormatWarning}
        error={error}
        fixtureDrop={fixtureDrop}
        surgeryDrop={surgeryDrop}
        uploadRequirements={uploadRequirements}
        analyzeDisabledReasons={analyzeDisabledReasons}
        isAnalyzeDisabled={isAnalyzeDisabled}
        handleFixtureChange={handleFixtureChange}
        handleSurgeryChange={handleSurgeryChange}
        removeSurgeryFile={removeSurgeryFile}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        handleAnalyze={handleAnalyze}
      />
    );
  }

  if (step === 'processing') {
    return <AnalyzeProcessingStep progress={progress} processingMsg={processingMsg} />;
  }

  if (!report) return null;

  return (
    <AnalyzeReportStep
      reportRef={reportRef}
      report={report}
      sizeFormatDetailItems={sizeFormatDetailItems}
      setSizeFormatDetailItems={setSizeFormatDetailItems}
      emailSent={emailSent}
      leadEmail={leadEmail}
      wantDetailedAnalysis={wantDetailedAnalysis}
      leadHospital={leadHospital}
      leadRegion={leadRegion}
      leadContact={leadContact}
      isSubmittingLead={isSubmittingLead}
      leadSubmitError={leadSubmitError}
      updateLeadEmail={updateLeadEmail}
      updateWantDetailedAnalysis={updateWantDetailedAnalysis}
      updateLeadHospital={updateLeadHospital}
      updateLeadRegion={updateLeadRegion}
      updateLeadContact={updateLeadContact}
      handleLeadSubmit={handleLeadSubmit}
      handleGoToConsultation={handleGoToConsultation}
      onSignup={onSignup}
      analyzeTrialFootnoteText={analyzeTrialFootnoteText}
    />
  );
};

export default AnalyzePage;
