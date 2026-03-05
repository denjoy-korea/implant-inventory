import type { AnalysisReport } from '../../../../types';

export type UsagePatterns = AnalysisReport['usagePatterns'];

export interface UsageSummaryMetrics {
  totalUsage: number;
  monthlyAvgUsage: string;
}
