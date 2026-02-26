import { useMemo } from 'react';
import { ExcelRow } from '../../types';

export interface ClinicalMatrixCell {
  density: string;
  rangeLabel: string;
  rangeIndex: number; // 0: <15, 1: 15-30, 2: 30-45, 3: >45
  total: number;
  fail: number;
  failRate: number;
}

export interface BoneDensityStat {
  density: string;
  total: number;
  fail: number;
  failRate: number;
  avgFixation: number;
}

export interface ClinicalStats {
  matrix: ClinicalMatrixCell[];
  maxCellTotal: number;
  densityStats: BoneDensityStat[];
  hasClinicalData: boolean;
}

const FIXATION_RANGES = [
  { label: 'Low (<15N)', check: (n: number) => n < 15 },
  { label: 'Medium (15~30N)', check: (n: number) => n >= 15 && n < 30 },
  { label: 'Optimal (30~45N)', check: (n: number) => n >= 30 && n < 45 },
  { label: 'High (>45N)', check: (n: number) => n >= 45 },
];

export function useClinicalStats(rows: ExcelRow[]): ClinicalStats {
  const stats = useMemo(() => {
    // Initialize Matrix Grid (4 Densities x 4 Ranges)
    const densities = ['D1', 'D2', 'D3', 'D4'];
    const matrixMap: Record<string, ClinicalMatrixCell> = {};

    densities.forEach(d => {
      FIXATION_RANGES.forEach((r, idx) => {
        const key = `${d}-${idx}`;
        matrixMap[key] = {
          density: d,
          rangeLabel: r.label,
          rangeIndex: idx,
          total: 0,
          fail: 0,
          failRate: 0
        };
      });
    });

    const densityGroups: Record<string, { total: number; fail: number; fixationSum: number; fixationCount: number }> = {
      'D1': { total: 0, fail: 0, fixationSum: 0, fixationCount: 0 },
      'D2': { total: 0, fail: 0, fixationSum: 0, fixationCount: 0 },
      'D3': { total: 0, fail: 0, fixationSum: 0, fixationCount: 0 },
      'D4': { total: 0, fail: 0, fixationSum: 0, fixationCount: 0 },
      'Other': { total: 0, fail: 0, fixationSum: 0, fixationCount: 0 },
    };

    let maxCell = 0;

    rows.forEach((row) => {
      const cls = String(row['구분'] || '');
      if (cls !== '식립' && cls !== '수술중교환') return;

      const isFail = cls === '수술중교환';
      const qty = Number(row['갯수']) > 0 ? Number(row['갯수']) : 1;

      // Parse Bone Density
      let density = 'Other';
      const rawDensity = String(row['골질'] || '').toUpperCase().trim();
      if (rawDensity.includes('D1')) density = 'D1';
      else if (rawDensity.includes('D2')) density = 'D2';
      else if (rawDensity.includes('D3')) density = 'D3';
      else if (rawDensity.includes('D4')) density = 'D4';

      // Parse Initial Fixation
      let fixation = 0;
      const rawFixation = String(row['초기고정'] || '').trim();
      if (rawFixation) {
        const match = rawFixation.match(/(\d+)/);
        if (match) {
          fixation = parseInt(match[1], 10);
        }
      }

      // Parse Diameter (no longer needed for bubbles, but keeping for potential future use or if other parts of the code still rely on it)
      // let diameter = 4.0; // Default average
      // const rawSize = String(row['규격(SIZE)'] || '').trim();
      // if (rawSize) {
      //   const diamMatch = rawSize.match(/([3-8]\.\d|[3-8])/);
      //   if (diamMatch) {
      //     diameter = parseFloat(diamMatch[0]);
      //   }
      // }

      const hasValidProps = density !== 'Other' && fixation > 0;

      // Update Density Stats
      if (densityGroups[density]) {
        densityGroups[density].total += qty;
        if (isFail) densityGroups[density].fail += qty;
        if (fixation > 0) {
          densityGroups[density].fixationSum += fixation * qty;
          densityGroups[density].fixationCount += qty;
        }
      }

      // Populate Matrix
      if (hasValidProps) {
        const rangeIdx = FIXATION_RANGES.findIndex(r => r.check(fixation));
        if (rangeIdx !== -1) {
          const key = `${density}-${rangeIdx}`;
          if (matrixMap[key]) {
            matrixMap[key].total += qty;
            if (isFail) matrixMap[key].fail += qty;
          }
        }
      }
    });

    // Finalize Matrix
    const matrix = Object.values(matrixMap).map(cell => {
      cell.failRate = cell.total > 0 ? (cell.fail / cell.total) * 100 : 0;
      maxCell = Math.max(maxCell, cell.total);
      return cell;
    });

    // Compute Aggregated Stats
    const densityStats: BoneDensityStat[] = Object.entries(densityGroups).map(([key, grp]) => ({
      density: key,
      total: grp.total,
      fail: grp.fail,
      failRate: grp.total > 0 ? (grp.fail / grp.total) * 100 : 0,
      avgFixation: grp.fixationCount > 0 ? grp.fixationSum / grp.fixationCount : 0
    })).filter(s => s.total > 0 && s.density !== 'Other'); // Filter out empty or 'Other' for cleaner charts

    const hasClinicalData = matrix.some(cell => cell.total > 0) || densityStats.length > 0;

    return {
      matrix,
      maxCellTotal: maxCell,
      densityStats,
      hasClinicalData
    };
  }, [rows]);

  return stats;
}
