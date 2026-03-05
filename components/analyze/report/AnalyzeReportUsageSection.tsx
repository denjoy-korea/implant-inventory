import React from 'react';
import type { AnalysisReport } from '../../../types';
import AnalyzeUsageHeader from './usage/AnalyzeUsageHeader';
import AnalyzeUsageKpiCards from './usage/AnalyzeUsageKpiCards';
import AnalyzeUsageManufacturerCard from './usage/AnalyzeUsageManufacturerCard';
import AnalyzeUsageTopUsedCard from './usage/AnalyzeUsageTopUsedCard';
import { buildUsageSummaryMetrics } from './usage/usageStats';

interface AnalyzeReportUsageSectionProps {
  usagePatterns: AnalysisReport['usagePatterns'];
}

const AnalyzeReportUsageSection: React.FC<AnalyzeReportUsageSectionProps> = ({ usagePatterns }) => {
  const usageSummary = buildUsageSummaryMetrics(usagePatterns);

  return (
    <section className="py-20 bg-slate-50 border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-6">
        <AnalyzeUsageHeader periodMonths={usagePatterns.periodMonths} />
        <AnalyzeUsageKpiCards usagePatterns={usagePatterns} summary={usageSummary} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <AnalyzeUsageTopUsedCard topUsedItems={usagePatterns.topUsedItems} />
          <AnalyzeUsageManufacturerCard manufacturerDistribution={usagePatterns.manufacturerDistribution} />
        </div>
      </div>
    </section>
  );
};

export default AnalyzeReportUsageSection;
