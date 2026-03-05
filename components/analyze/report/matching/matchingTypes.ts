export interface MatchingManufacturerCounts {
  fixtureOnly: number;
  surgeryOnly: number;
}

export interface MatchingEntry {
  manufacturer: string;
  counts: MatchingManufacturerCounts;
  total: number;
  fixturePercent: number;
  surgeryPercent: number;
}

export interface MatchingStats {
  totalUnmatched: number;
  totalFixtureOnly: number;
  totalSurgeryOnly: number;
  entries: MatchingEntry[];
}
