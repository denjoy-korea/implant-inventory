import React from 'react';
import type { AnalysisReport } from '../../types';
import { buildQuickInsights } from './analyzeReportUtils';
import PublicInfoFooter from '../shared/PublicInfoFooter';
import AnalyzeReportMainSections from './report/AnalyzeReportMainSections';
import AnalyzeReportLeadSection from './report/AnalyzeReportLeadSection';
import AnalyzeReportNextActionSection from './report/AnalyzeReportNextActionSection';

export interface AnalyzeReportStepProps {
  reportRef: React.RefObject<HTMLDivElement | null>;
  report: AnalysisReport;
  sizeFormatDetailItems: string[] | null;
  setSizeFormatDetailItems: React.Dispatch<React.SetStateAction<string[] | null>>;
  emailSent: boolean;
  leadEmail: string;
  wantDetailedAnalysis: boolean;
  leadHospital: string;
  leadRegion: string;
  leadContact: string;
  isSubmittingLead: boolean;
  leadSubmitError: string;
  updateLeadEmail: (value: string) => void;
  updateWantDetailedAnalysis: (value: boolean) => void;
  updateLeadHospital: (value: string) => void;
  updateLeadRegion: (value: string) => void;
  updateLeadContact: (value: string) => void;
  handleLeadSubmit: () => void;
  handleGoToConsultation: () => void;
  onSignup: () => void;
  analyzeTrialFootnoteText: string;
}

const AnalyzeReportStep: React.FC<AnalyzeReportStepProps> = ({
  reportRef,
  report,
  sizeFormatDetailItems,
  setSizeFormatDetailItems,
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
  handleLeadSubmit,
  handleGoToConsultation,
  onSignup,
  analyzeTrialFootnoteText,
}) => {
  const quickInsights = buildQuickInsights(report);

  return (
    <div ref={reportRef} className="min-h-screen bg-slate-50">
      <AnalyzeReportMainSections
        report={report}
        sizeFormatDetailItems={sizeFormatDetailItems}
        setSizeFormatDetailItems={setSizeFormatDetailItems}
      />
      <AnalyzeReportLeadSection
        quickInsights={quickInsights}
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
      />
      <AnalyzeReportNextActionSection
        onSignup={onSignup}
        handleGoToConsultation={handleGoToConsultation}
        analyzeTrialFootnoteText={analyzeTrialFootnoteText}
      />
      <PublicInfoFooter showLegalLinks />
    </div>
  );
};

export default AnalyzeReportStep;
