import type { UsagePatterns, UsageSummaryMetrics } from './usageTypes';

export function buildUsageSummaryMetrics(usagePatterns: UsagePatterns): UsageSummaryMetrics {
  const totalUsage = usagePatterns.fixtureUsageCount + usagePatterns.insuranceClaimCount + usagePatterns.failUsageCount;
  const monthlyAvgUsage = usagePatterns.periodMonths > 0 ? (totalUsage / usagePatterns.periodMonths).toFixed(1) : '0';

  return {
    totalUsage,
    monthlyAvgUsage,
  };
}
