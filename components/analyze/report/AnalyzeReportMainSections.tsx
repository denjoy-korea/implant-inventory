import React from 'react';
import type { AnalysisReport } from '../../../types';
import AnalyzeReportDiagnosticsSection from './AnalyzeReportDiagnosticsSection';
import AnalyzeReportMatchingSection from './AnalyzeReportMatchingSection';
import AnalyzeReportOverviewSection from './AnalyzeReportOverviewSection';
import AnalyzeReportRecommendationsSection from './AnalyzeReportRecommendationsSection';
import AnalyzeReportUsageSection from './AnalyzeReportUsageSection';

interface AnalyzeReportMainSectionsProps {
  report: AnalysisReport;
  sizeFormatDetailItems: string[] | null;
  setSizeFormatDetailItems: React.Dispatch<React.SetStateAction<string[] | null>>;
}

const AnalyzeReportMainSections: React.FC<AnalyzeReportMainSectionsProps> = ({
  report,
  sizeFormatDetailItems,
  setSizeFormatDetailItems,
}) => {
  return (
    <>
      <AnalyzeReportOverviewSection report={report} />
      <AnalyzeReportDiagnosticsSection
        diagnostics={report.diagnostics}
        sizeFormatDetailItems={sizeFormatDetailItems}
        setSizeFormatDetailItems={setSizeFormatDetailItems}
      />
      <AnalyzeReportMatchingSection unmatchedItems={report.unmatchedItems} />
      <AnalyzeReportUsageSection usagePatterns={report.usagePatterns} />
      <AnalyzeReportRecommendationsSection recommendations={report.recommendations} />
    </>
  );
};

export default AnalyzeReportMainSections;
