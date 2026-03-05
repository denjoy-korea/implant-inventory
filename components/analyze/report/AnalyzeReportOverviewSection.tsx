import React from 'react';
import type { AnalysisReport } from '../../../types';
import AnalyzeOverviewCriteriaSection from './overview/AnalyzeOverviewCriteriaSection';
import AnalyzeOverviewScoreSection from './overview/AnalyzeOverviewScoreSection';

interface AnalyzeReportOverviewSectionProps {
  report: AnalysisReport;
}

const AnalyzeReportOverviewSection: React.FC<AnalyzeReportOverviewSectionProps> = ({ report }) => {
  return (
    <>
      <AnalyzeOverviewScoreSection report={report} />
      <AnalyzeOverviewCriteriaSection />
    </>
  );
};

export default AnalyzeReportOverviewSection;
