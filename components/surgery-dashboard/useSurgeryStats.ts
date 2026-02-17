import { useMemo } from 'react';
import { ExcelRow } from '../../types';
import {
  MonthlyDatum,
  DonutSegment,
  ManufacturerFailStat,
  SizeRankStat,
  DayOfWeekStat,
  ToothAnalysisData,
  ToothHeatmapData,
  SparklineData,
  DayInsight,
  TrendlineData,
  DONUT_COLORS,
  normalizeManufacturer,
} from './shared';

interface SurgeryStats {
  cleanRows: ExcelRow[];
  dateRange: { min: string; max: string; total: number; uniqueDays: number };
  classificationStats: Record<string, number>;
  monthlyData: MonthlyDatum[];
  manufacturerDonut: DonutSegment[];
  monthlyAvgPlacement: number;
  failRate: number;
  dailyAvgPlacement: number;
  recentDailyAvg: number;
  sparkline: SparklineData;
  trendline: TrendlineData | null;
  manufacturerFailStats: ManufacturerFailStat[];
  topSizes: SizeRankStat[];
  dayOfWeekStats: DayOfWeekStat[];
  toothAnalysis: ToothAnalysisData;
  toothHeatmap: ToothHeatmapData;
  dayInsight: DayInsight | null;
  nextDownloadDate: string;
}

function parseLocalDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function useSurgeryStats(rows: ExcelRow[]): SurgeryStats {
  const cleanRows = useMemo(() => {
    return rows.filter(row => !Object.values(row).some(val => String(val).includes('합계')));
  }, [rows]);

  const dateRange = useMemo(() => {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    const dateSet = new Set<string>();

    cleanRows.forEach(row => {
      const rawDate = String(row['날짜'] || '');
      const parsed = parseLocalDate(rawDate);
      if (!parsed) return;

      const dateKey = formatDateKey(parsed);
      dateSet.add(dateKey);
      if (!minDate || parsed < minDate) minDate = parsed;
      if (!maxDate || parsed > maxDate) maxDate = parsed;
    });

    return {
      min: minDate ? formatDateKey(minDate) : '',
      max: maxDate ? formatDateKey(maxDate) : '',
      total: cleanRows.length,
      uniqueDays: dateSet.size,
    };
  }, [cleanRows]);

  const classificationStats = useMemo(() => {
    const stats: Record<string, number> = {
      '식립': 0, '청구': 0, '수술중 FAIL': 0, '골이식만': 0, 'FAIL 교환완료': 0,
    };
    cleanRows.forEach(row => {
      const cls = String(row['구분'] || '');
      const qty = Number(row['갯수']) || 1;
      if (cls in stats) stats[cls] += qty;
    });
    return stats;
  }, [cleanRows]);

  const monthlyData = useMemo(() => {
    const map: Record<string, MonthlyDatum> = {};
    cleanRows.forEach(row => {
      const rawDate = String(row['날짜'] || '');
      const parsedDate = parseLocalDate(rawDate);
      if (!parsedDate) return;

      const month = formatMonthKey(parsedDate);
      if (!map[month]) map[month] = { month, '식립': 0, '청구': 0, '수술중 FAIL': 0 };
      const cls = String(row['구분'] || '');
      const qty = Number(row['갯수']) || 1;
      if (cls === '식립') map[month]['식립'] += qty;
      else if (cls === '청구') map[month]['청구'] += qty;
      else if (cls === '수술중 FAIL') map[month]['수술중 FAIL'] += qty;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [cleanRows]);

  const manufacturerStats = useMemo(() => {
    const stats: Record<string, number> = {};
    cleanRows.filter(r => r['구분'] === '식립').forEach(row => {
      const m = normalizeManufacturer(String(row['제조사'] || '기타'));
      const qty = Number(row['갯수']) || 1;
      stats[m] = (stats[m] || 0) + qty;
    });
    const sorted = Object.entries(stats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    if (sorted.length <= 6) return sorted;
    const top5 = sorted.slice(0, 5);
    const otherCount = sorted.slice(5).reduce((sum, s) => sum + s.count, 0);
    return [...top5, { name: '기타', count: otherCount }];
  }, [cleanRows]);

  const manufacturerDonut = useMemo(() => {
    const total = manufacturerStats.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return [];
    let cumulative = 0;
    const gap = 0.008;
    const r = 42;
    const circumference = 2 * Math.PI * r;
    return manufacturerStats.map((stat, i) => {
      const percent = stat.count / total;
      const startAngle = (cumulative + gap / 2) * 360;
      const endAngle = (cumulative + percent - gap / 2) * 360;
      const midAngle = ((cumulative + percent / 2) * 360 - 90) * (Math.PI / 180);
      cumulative += percent;
      const cx = 50, cy = 50;
      const x1 = cx + r * Math.cos((startAngle - 90) * (Math.PI / 180));
      const y1 = cy + r * Math.sin((startAngle - 90) * (Math.PI / 180));
      const x2 = cx + r * Math.cos((endAngle - 90) * (Math.PI / 180));
      const y2 = cy + r * Math.sin((endAngle - 90) * (Math.PI / 180));
      const largeArc = percent - gap > 0.5 ? 1 : 0;
      const arcLength = circumference * percent;
      return {
        ...stat, percent, midAngle, arcLength,
        path: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      };
    });
  }, [manufacturerStats]);

  const monthlyAvgPlacement = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const total = monthlyData.reduce((sum, d) => sum + d['식립'], 0);
    return Number((total / monthlyData.length).toFixed(1));
  }, [monthlyData]);

  const failRate = useMemo(() => {
    const total = classificationStats['식립'] + classificationStats['수술중 FAIL'];
    if (total === 0) return 0;
    return Number(((classificationStats['수술중 FAIL'] / total) * 100).toFixed(1));
  }, [classificationStats]);

  const WORK_DAYS_PER_MONTH = 25; // 평균 진료일수 고정값

  const dailyAvgPlacement = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const totalWorkDays = monthlyData.length * WORK_DAYS_PER_MONTH;
    return Number((classificationStats['식립'] / totalWorkDays).toFixed(1));
  }, [classificationStats, monthlyData.length]);

  const recentDailyAvg = useMemo(() => {
    if (!dateRange.max) return 0;
    const maxDate = parseLocalDate(dateRange.max);
    if (!maxDate) return 0;

    const windowStart = new Date(maxDate.getFullYear(), maxDate.getMonth() - 1, maxDate.getDate());
    let placementTotal = 0;

    cleanRows.forEach(row => {
      const rawDate = String(row['날짜'] || '');
      const parsedDate = parseLocalDate(rawDate);
      if (!parsedDate) return;
      if (parsedDate < windowStart || parsedDate > maxDate) return;

      if (String(row['구분'] || '') === '식립') {
        placementTotal += Number(row['갯수']) || 1;
      }
    });

    return Number((placementTotal / WORK_DAYS_PER_MONTH).toFixed(1));
  }, [cleanRows, dateRange.max]);

  const sparkline = useMemo(() => {
    const months = monthlyData;
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    return {
      placement: months.map(m => m['식립']),
      fail: months.map(m => m['수술중 FAIL']),
      claim: months.map(m => m['청구']),
      placementDelta: last && prev ? last['식립'] - prev['식립'] : 0,
      placementPrev: prev ? prev['식립'] : 0,
      failDelta: last && prev ? last['수술중 FAIL'] - prev['수술중 FAIL'] : 0,
      failPrev: prev ? prev['수술중 FAIL'] : 0,
      claimDelta: last && prev ? last['청구'] - prev['청구'] : 0,
      claimPrev: prev ? prev['청구'] : 0,
    };
  }, [monthlyData]);

  const trendline = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const n = monthlyData.length;
    const xVals = monthlyData.map((_, i) => i);
    const yVals = monthlyData.map(d => d['식립']);
    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const sumXY = xVals.reduce((a, x, i) => a + x * yVals[i], 0);
    const sumXX = xVals.reduce((a, x) => a + x * x, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }, [monthlyData]);

  const manufacturerFailStats = useMemo(() => {
    const failMap: Record<string, number> = {};
    const placeMap: Record<string, number> = {};

    cleanRows.forEach(row => {
      const m = normalizeManufacturer(String(row['제조사'] || '기타'));
      const cls = String(row['구분'] || '');
      const qty = Number(row['갯수']) || 1;

      if (cls === '수술중 FAIL') failMap[m] = (failMap[m] || 0) + qty;
      else if (cls === '식립') placeMap[m] = (placeMap[m] || 0) + qty;
    });

    const allNames = Array.from(new Set([...Object.keys(failMap), ...Object.keys(placeMap)]));

    return allNames
      .map(name => {
        const failCount = failMap[name] || 0;
        const placeCount = placeMap[name] || 0;
        // Total attempts = Success(Place) + Fail? 
        // Based on global logic: Total = Place + Fail
        const total = placeCount + failCount;
        const failRate = total > 0 ? Number(((failCount / total) * 100).toFixed(1)) : 0;

        return {
          name,
          failCount,
          placeCount: total, // Returning Total attempts as placeCount for display? 
          // types.ts says placeCount. The UI usually expects "Total Cases". 
          // Let's use total here to match "Cases" label.
          failRate,
        };
      })
      .filter(d => d.placeCount > 0) // Filter out noise
      .sort((a, b) => b.failCount - a.failCount);
  }, [cleanRows]);

  const dayOfWeekStats = useMemo(() => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    cleanRows.filter(r => r['구분'] === '식립').forEach(row => {
      const rawDate = String(row['날짜'] || '');
      const qty = Number(row['갯수']) || 1;

      const parsedDate = parseLocalDate(rawDate);
      if (!parsedDate) return;
      counts[parsedDate.getDay()] += qty;
    });
    const max = Math.max(...counts, 1);
    return days.map((name, i) => ({ name, count: counts[i], percent: Math.round((counts[i] / max) * 100) }));
  }, [cleanRows]);

  const toothAnalysis = useMemo(() => {
    let upper = 0, lower = 0, anterior = 0, posterior = 0;
    cleanRows.filter(r => r['구분'] === '식립').forEach(row => {
      const teeth = String(row['치아번호'] || '');
      teeth.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
        const num = parseInt(t.replace(/[^0-9]/g, ''));
        if (isNaN(num)) return;
        const tens = Math.floor(num / 10);
        const ones = num % 10;
        if (tens === 1 || tens === 2) upper++;
        else if (tens === 3 || tens === 4) lower++;
        if (ones >= 1 && ones <= 3) anterior++;
        else if (ones >= 4) posterior++;
      });
    });
    const total = upper + lower || 1;
    return {
      upper, lower, anterior, posterior,
      upperPercent: Math.round((upper / total) * 100),
      lowerPercent: Math.round((lower / total) * 100),
      anteriorPercent: Math.round((anterior / (anterior + posterior || 1)) * 100),
      posteriorPercent: Math.round((posterior / (anterior + posterior || 1)) * 100),
    };
  }, [cleanRows]);

  const toothHeatmap = useMemo(() => {
    const counts: Record<number, number> = {};
    const validFDI = new Set([
      11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27,
      31, 32, 33, 34, 35, 36, 37, 41, 42, 43, 44, 45, 46, 47,
    ]);
    cleanRows.filter(r => r['구분'] === '식립').forEach(row => {
      const teeth = String(row['치아번호'] || '');
      teeth.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
        const num = parseInt(t.replace(/[^0-9]/g, ''));
        if (!isNaN(num) && validFDI.has(num)) {
          counts[num] = (counts[num] || 0) + 1;
        }
      });
    });
    const vals = Object.values(counts);
    const maxCount = vals.length > 0 ? Math.max(...vals) : 1;
    return { counts, maxCount };
  }, [cleanRows]);

  const topSizes = useMemo(() => {
    const map: Record<string, { brand: string; size: string; count: number }> = {};
    cleanRows.filter(r => r['구분'] === '식립').forEach(row => {
      const brand = String(row['브랜드'] || '').trim();
      const size = String(row['규격(SIZE)'] || '').trim();
      const qty = Number(row['갯수']) || 1;
      if (!size) return;
      const key = `${brand}|${size}`;
      if (!map[key]) map[key] = { brand, size, count: 0 };
      map[key].count += qty;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [cleanRows]);

  const dayInsight = useMemo(() => {
    const active = dayOfWeekStats.filter(d => d.count > 0);
    if (active.length === 0) return null;
    const peakDay = dayOfWeekStats.reduce((a, b) => a.count > b.count ? a : b);
    const lowDay = active.reduce((a, b) => a.count < b.count ? a : b);
    const weekdayTotal = dayOfWeekStats.slice(1, 6).reduce((s, d) => s + d.count, 0);
    const weekendTotal = dayOfWeekStats[0].count + dayOfWeekStats[6].count;
    return { peakDay, lowDay, weekdayTotal, weekendTotal };
  }, [dayOfWeekStats]);

  const nextDownloadDate = useMemo(() => {
    if (!dateRange.max) return '';
    const parsed = parseLocalDate(dateRange.max);
    if (!parsed) return '';

    const next = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + 1);
    return formatDateKey(next);
  }, [dateRange.max]);

  return {
    cleanRows,
    dateRange,
    classificationStats,
    monthlyData,
    manufacturerDonut,
    monthlyAvgPlacement,
    failRate,
    dailyAvgPlacement,
    recentDailyAvg,
    sparkline,
    trendline,
    manufacturerFailStats,
    topSizes,
    dayOfWeekStats,
    toothAnalysis,
    toothHeatmap,
    dayInsight,
    nextDownloadDate,
  };
}
