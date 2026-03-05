import { useMemo } from 'react';
import { InventoryItem, ExcelData } from '../types';
import { fixIbsImplant } from '../services/mappers';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { normalizeSurgery } from '../services/normalizationService';
import { toMonthKey } from '../services/dateUtils';

/**
 * 품목별 월별 사용량 sparkline 시리즈를 계산하는 커스텀 훅.
 * InventoryManager에서 분리하여 가독성 및 재사용성을 높임.
 */
export function useSparklineSeries(
  chartData: InventoryItem[],
  surgeryData: ExcelData | null | undefined,
  sparklineMonths: number
): Map<string, number[]> {
  return useMemo(() => {
    const series = new Map<string, number[]>();
    if (!surgeryData || chartData.length === 0) return series;

    const sheet = surgeryData.sheets[surgeryData.activeSheetName];
    if (!sheet) return series;

    const rows = sheet.rows || [];

    const itemKeyToIds = new Map<string, string[]>();
    const monthlyUsageByItemId = new Map<string, Map<string, number>>();

    chartData.forEach(item => {
      const fixed = fixIbsImplant(item.manufacturer, item.brand);
      const key = `${normalizeSurgery(fixed.manufacturer)}|${normalizeSurgery(fixed.brand)}|${getSizeMatchKey(item.size, fixed.manufacturer)}`;
      const list = itemKeyToIds.get(key) ?? [];
      if (!list.includes(item.id)) list.push(item.id);
      itemKeyToIds.set(key, list);
      if (!series.has(item.id)) series.set(item.id, []);
      if (!monthlyUsageByItemId.has(item.id)) {
        monthlyUsageByItemId.set(item.id, new Map<string, number>());
      }
    });

    rows.forEach(row => {
      const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
      if (isTotalRow) return;
      const cls = String(row['구분'] || '');
      if (cls !== '식립' && cls !== '수술중교환') return;
      const record = String(row['수술기록'] || '');
      if (record.includes('[GBR Only]')) return;

      const month = toMonthKey(row['날짜'] ?? row['수술일']);
      if (!month) return;

      const fixed = fixIbsImplant(
        String(row['제조사'] || '').trim(),
        String(row['브랜드'] || '').trim()
      );
      const key = `${normalizeSurgery(fixed.manufacturer)}|${normalizeSurgery(fixed.brand)}|${getSizeMatchKey(String(row['규격(SIZE)'] || '').trim(), fixed.manufacturer)}`;
      const targetIds = itemKeyToIds.get(key);
      if (!targetIds || targetIds.length === 0) return;

      const qtyValue = row['갯수'] !== undefined ? Number(row['갯수']) : 0;
      const qty = Number.isFinite(qtyValue) ? qtyValue : 0;
      if (qty <= 0) return;

      targetIds.forEach(id => {
        const monthMap = monthlyUsageByItemId.get(id);
        if (!monthMap) return;
        monthMap.set(month, (monthMap.get(month) ?? 0) + qty);
      });
    });

    // 각 품목별로 플랜 보존 기간 상한 내에서 월별 시리즈 생성
    monthlyUsageByItemId.forEach((monthMap, id) => {
      if (monthMap.size === 0) {
        series.set(id, []);
        return;
      }

      const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => a.localeCompare(b));
      const rawLastMonth = sortedMonths[sortedMonths.length - 1];
      const [lastYearStr, lastMonthStr] = rawLastMonth.split('-');
      const lastMonthDate = new Date(Number(lastYearStr), Number(lastMonthStr) - 1, 1);
      const earliestAllowed = new Date(lastMonthDate);
      earliestAllowed.setMonth(earliestAllowed.getMonth() - (sparklineMonths - 1));
      const earliestAllowedKey = `${earliestAllowed.getFullYear()}-${String(earliestAllowed.getMonth() + 1).padStart(2, '0')}`;

      const scopedMonths = sortedMonths.filter(m => m >= earliestAllowedKey);
      if (scopedMonths.length === 0) {
        series.set(id, []);
        return;
      }

      const rangeStart = scopedMonths[0];
      const rangeEnd = scopedMonths[scopedMonths.length - 1];
      const [startYearStr, startMonthStr] = rangeStart.split('-');
      const [endYearStr, endMonthStr] = rangeEnd.split('-');

      const cursor = new Date(Number(startYearStr), Number(startMonthStr) - 1, 1);
      const end = new Date(Number(endYearStr), Number(endMonthStr) - 1, 1);
      const values: number[] = [];

      while (cursor <= end) {
        const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        values.push(monthMap.get(k) ?? 0);
        cursor.setMonth(cursor.getMonth() + 1);
      }

      series.set(id, values);
    });

    return series;
  }, [chartData, sparklineMonths, surgeryData]);
}
