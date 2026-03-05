import type { AnalysisReport } from '../../../../types';
import type { MatchingEntry, MatchingManufacturerCounts, MatchingStats } from './matchingTypes';

export function buildMatchingStats(unmatchedItems: AnalysisReport['unmatchedItems']): MatchingStats {
  const byManufacturer: Record<string, MatchingManufacturerCounts> = {};

  for (const item of unmatchedItems) {
    const manufacturer = item.manufacturer || '기타';
    if (!byManufacturer[manufacturer]) {
      byManufacturer[manufacturer] = { fixtureOnly: 0, surgeryOnly: 0 };
    }

    if (item.source === 'fixture_only') byManufacturer[manufacturer].fixtureOnly += 1;
    else byManufacturer[manufacturer].surgeryOnly += 1;
  }

  const rawEntries = Object.entries(byManufacturer).sort(
    (a, b) => (b[1].fixtureOnly + b[1].surgeryOnly) - (a[1].fixtureOnly + a[1].surgeryOnly),
  );

  const maxCount = Math.max(...rawEntries.map(([, counts]) => counts.fixtureOnly + counts.surgeryOnly), 1);

  const entries: MatchingEntry[] = rawEntries.map(([manufacturer, counts]) => {
    const total = counts.fixtureOnly + counts.surgeryOnly;
    return {
      manufacturer,
      counts,
      total,
      fixturePercent: (counts.fixtureOnly / maxCount) * 100,
      surgeryPercent: (counts.surgeryOnly / maxCount) * 100,
    };
  });

  return {
    totalUnmatched: unmatchedItems.length,
    totalFixtureOnly: unmatchedItems.filter((item) => item.source === 'fixture_only').length,
    totalSurgeryOnly: unmatchedItems.filter((item) => item.source === 'surgery_only').length,
    entries,
  };
}
