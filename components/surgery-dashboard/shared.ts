import { useState, useEffect } from 'react';

// ============================================================
// COLOR CONSTANTS
// ============================================================
export const CLASSIFICATION_COLORS: Record<string, string> = {
  '식립': '#4F46E5',
  '청구': '#0EA5E9',
  '수술중 FAIL': '#F43F5E',
  '골이식만': '#F59E0B',
  'FAIL 교환완료': '#10B981',
};

export const DONUT_COLORS = ['#4F46E5', '#8B5CF6', '#0EA5E9', '#F59E0B', '#10B981', '#64748b'];

export const BAR_SERIES = [
  { key: '식립' as const, color: '#4F46E5' },
  { key: '청구' as const, color: '#0EA5E9' },
  { key: '수술중 FAIL' as const, color: '#F43F5E' },
];

// ============================================================
// TYPES
// ============================================================
export interface MonthlyDatum {
  month: string;
  '식립': number;
  '청구': number;
  '수술중 FAIL': number;
}

export interface DonutSegment {
  name: string;
  count: number;
  percent: number;
  midAngle: number;
  arcLength: number;
  path: string;
  color: string;
}

export interface ManufacturerFailStat {
  name: string;
  failCount: number;
  placeCount: number;
  failRate: number;
}

export interface SizeRankStat {
  brand: string;
  size: string;
  count: number;
}

export interface DayOfWeekStat {
  name: string;
  count: number;
  percent: number;
}

export interface ToothAnalysisData {
  upper: number;
  lower: number;
  anterior: number;
  posterior: number;
  upperPercent: number;
  lowerPercent: number;
  anteriorPercent: number;
  posteriorPercent: number;
}

export interface ToothHeatmapData {
  counts: Record<number, number>;
  maxCount: number;
}

export interface SparklineData {
  placement: number[];
  fail: number[];
  claim: number[];
  placementDelta: number;
  placementPrev: number;
  failDelta: number;
  failPrev: number;
  claimDelta: number;
  claimPrev: number;
}

export interface DayInsight {
  peakDay: DayOfWeekStat;
  lowDay: DayOfWeekStat;
  weekdayTotal: number;
  weekendTotal: number;
}

export interface TrendlineData {
  slope: number;
  intercept: number;
}

// ============================================================
// SVG PATH UTILITIES
// ============================================================
export function smoothLine(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function smoothArea(points: { x: number; y: number }[], baseY: number): string {
  if (points.length < 2) return '';
  const line = smoothLine(points);
  return `${line} L ${points[points.length - 1].x},${baseY} L ${points[0].x},${baseY} Z`;
}

// ============================================================
// HOOKS
// ============================================================
export function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(target);
      return;
    }
    let rafId: number;
    const startTime = performance.now();
    const step = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return current;
}

// Chart keyboard navigation helper — enhanced focus ring for accessibility (#7)
export const CHART_FOCUS_CLASS = 'w-full focus:outline-none focus-visible:ring-[3px] focus-visible:ring-indigo-400 focus-visible:ring-offset-4 focus-visible:ring-offset-white rounded-xl';

// ============================================================
// TOOTH UTILITIES
// ============================================================
export function parseTeeth(raw: string): number[] {
  const result: number[] = [];
  String(raw || '').split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
    const num = parseInt(t.replace(/[^0-9]/g, ''));
    if (!isNaN(num)) result.push(num);
  });
  return result;
}

export const TOOTH_REGIONS = [
  { id: 'all', label: '전체 치아 (All)' },
  { id: 'maxilla', label: '상악 (Maxilla, 10/20)' },
  { id: 'mandible', label: '하악 (Mandible, 30/40)' },
  { id: 'anterior', label: '전치부 (Anterior)' },
  { id: 'posterior', label: '구치부 (Posterior)' },
] as const;

export function isToothInRegion(tooth: number, region: string): boolean {
  if (region === 'all') return true;

  const tens = Math.floor(tooth / 10);
  const ones = tooth % 10;

  if (region === 'maxilla') return tens === 1 || tens === 2;
  if (region === 'mandible') return tens === 3 || tens === 4;
  if (region === 'anterior') return ones >= 1 && ones <= 3;
  if (region === 'posterior') return ones >= 4;

  return false;
}

export function normalizeManufacturer(rawName: string): string {
  const name = rawName.trim();
  if (name.toUpperCase() === 'IBS') return 'IBS Implant';
  return name;
}
