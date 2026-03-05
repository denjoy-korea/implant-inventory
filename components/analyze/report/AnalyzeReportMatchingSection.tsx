import React from 'react';
import type { AnalysisReport } from '../../../types';
import AnalyzeMatchingHeader from './matching/AnalyzeMatchingHeader';
import AnalyzeMatchingManufacturerChart from './matching/AnalyzeMatchingManufacturerChart';
import AnalyzeMatchingPerfectState from './matching/AnalyzeMatchingPerfectState';
import AnalyzeMatchingSummaryCards from './matching/AnalyzeMatchingSummaryCards';
import { buildMatchingStats } from './matching/matchingStats';

interface AnalyzeReportMatchingSectionProps {
  unmatchedItems: AnalysisReport['unmatchedItems'];
}

const AnalyzeReportMatchingSection: React.FC<AnalyzeReportMatchingSectionProps> = ({ unmatchedItems }) => {
  const hasUnmatched = unmatchedItems.length > 0;
  const stats = hasUnmatched ? buildMatchingStats(unmatchedItems) : null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <AnalyzeMatchingHeader />

        {!hasUnmatched || !stats ? (
          <AnalyzeMatchingPerfectState />
        ) : (
          <div className="space-y-8">
            <AnalyzeMatchingSummaryCards
              totalUnmatched={stats.totalUnmatched}
              totalFixtureOnly={stats.totalFixtureOnly}
              totalSurgeryOnly={stats.totalSurgeryOnly}
            />
            <AnalyzeMatchingManufacturerChart entries={stats.entries} />
          </div>
        )}
      </div>
    </section>
  );
};

export default AnalyzeReportMatchingSection;
