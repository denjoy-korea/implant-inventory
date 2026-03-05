import { useCallback, useEffect } from 'react';
import { AppState, InventoryItem, Order } from '../types';
import React from 'react';
import { StockCalcSettings } from '../services/hospitalSettingsService';
import { normalizeSurgery } from '../services/normalizationService';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { isExchangePrefix } from '../services/appUtils';
import { buildBrandSizeFormatIndex, isListBasedSurgeryInput } from '../services/surgeryUnregisteredUtils';
import { DAYS_PER_MONTH } from '../constants';

export function useInventorySync(
  surgeryMaster: AppState['surgeryMaster'],
  orders: Order[],
  inventoryLength: number,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  stockCalcSettingsRef: { current: StockCalcSettings },
) {
  const normalize = normalizeSurgery;

  const computeUsageByInventoryFromRecords = useCallback((records: Array<{
    date: string | null;
    classification: string;
    manufacturer: string | null;
    brand: string | null;
    size: string | null;
    quantity: number;
    surgery_record: string | null;
  }>, inventoryItems: InventoryItem[]) => {
    type SurgeryEntry = { totalQty: number };
    const surgeryMap = new Map<string, SurgeryEntry>();
    const formatIndex = buildBrandSizeFormatIndex(inventoryItems);

    records.forEach(row => {
      const cls = String(row.classification || '');
      if (cls !== '식립' && cls !== '수술중교환') return;
      const record = String(row.surgery_record || '');
      if (record.includes('[GBR Only]')) return;

      const rawManufacturer = String(row.manufacturer || '');
      const rawBrand = String(row.brand || '');
      const rawSize = String(row.size || '');
      if (!isListBasedSurgeryInput(formatIndex, rawManufacturer, rawBrand, rawSize)) return;

      const rowM = normalize(rawManufacturer);
      const rowB = normalize(rawBrand);
      const rowS = getSizeMatchKey(rawSize, rawManufacturer);
      const key = `${rowM}|${rowB}|${rowS}`;
      const qtyValue = row.quantity !== undefined ? Number(row.quantity) : 0;
      const validQty = isNaN(qtyValue) ? 0 : qtyValue;
      const existing = surgeryMap.get(key);
      if (existing) {
        existing.totalQty += validQty;
      } else {
        surgeryMap.set(key, { totalQty: validQty });
      }
    });

    const usageByInventoryId: Record<string, number> = {};
    inventoryItems.forEach(item => {
      const isCategory = isExchangePrefix(item.manufacturer) || item.manufacturer === '보험청구';
      if (isCategory) return;

      const targetM = normalize(item.manufacturer);
      const targetB = normalize(item.brand);
      const targetS = getSizeMatchKey(item.size, item.manufacturer);
      let totalUsage = 0;

      surgeryMap.forEach((entry, key) => {
        const [rowM, rowB, rowS] = key.split('|');
        if (
          (rowM.includes(targetM) || targetM.includes(rowM) || rowM === targetM) &&
          rowB === targetB &&
          rowS === targetS
        ) {
          totalUsage += entry.totalQty;
        }
      });

      usageByInventoryId[item.id] = totalUsage;
    });

    return usageByInventoryId;
  }, [normalize]);

  const syncInventoryWithUsageAndOrders = useCallback(() => {
    const calcSettings = stockCalcSettingsRef.current;
    setState(prev => {
      const records = prev.surgeryMaster['수술기록지'] || [];
      if (records.length === 0 && prev.inventory.length === 0) return prev;

      // ── 1회 순회: 기간 계산 + 수술기록 집계 (O(records)) ──────────────────
      let minTime = Infinity;
      let maxTime = -Infinity;

      // key: `${normM}|${normB}|${normS}` → { totalQty, dailyQty, normM }
      type SurgeryEntry = { totalQty: number; dailyQty: Record<string, number>; normM: string };
      const surgeryMap = new Map<string, SurgeryEntry>();
      const formatIndex = buildBrandSizeFormatIndex(prev.inventory);

      records.forEach(row => {
        const dateStr = row['날짜'];
        if (dateStr) {
          const t = new Date(dateStr as string | number).getTime();
          if (!isNaN(t)) {
            if (t < minTime) minTime = t;
            if (t > maxTime) maxTime = t;
          }
        }

        const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
        if (isTotalRow) return;

        const cls = String(row['구분'] || '');
        if (cls !== '식립' && cls !== '수술중교환') return;
        const record = String(row['수술기록'] || '');
        if (record.includes('[GBR Only]')) return;

        const rawManufacturer = String(row['제조사'] || '');
        const rawBrand = String(row['브랜드'] || '');
        const rawSize = String(row['규격(SIZE)'] || '');
        if (!isListBasedSurgeryInput(formatIndex, rawManufacturer, rawBrand, rawSize)) return;

        const rowM = normalize(rawManufacturer);
        const rowB = normalize(rawBrand);
        const rowS = getSizeMatchKey(rawSize, rawManufacturer);
        const key = `${rowM}|${rowB}|${rowS}`;

        const qtyValue = row['갯수'] !== undefined ? Number(row['갯수']) : 0;
        const validQty = isNaN(qtyValue) ? 0 : qtyValue;
        const dateKey = String(dateStr || 'unknown');

        const existing = surgeryMap.get(key);
        if (existing) {
          existing.totalQty += validQty;
          existing.dailyQty[dateKey] = (existing.dailyQty[dateKey] || 0) + validQty;
        } else {
          surgeryMap.set(key, { totalQty: validQty, dailyQty: { [dateKey]: validQty }, normM: rowM });
        }
      });

      const periodInMonths = (minTime === Infinity || maxTime === -Infinity || minTime === maxTime)
        ? 1
        : Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24 * DAYS_PER_MONTH));

      // ── 1회 순회: 입고완료 주문 집계 (O(orders × items)) ──────────────────
      const receivedMap = new Map<string, number>();
      prev.orders.filter(o => o.status === 'received' && o.type !== 'return').forEach(order => {
        const normOM = normalize(order.manufacturer);
        order.items.forEach(orderItem => {
          const normOB = normalize(orderItem.brand);
          const normOS = getSizeMatchKey(orderItem.size, order.manufacturer);
          const key = `${normOM}|${normOB}|${normOS}`;
          receivedMap.set(key, (receivedMap.get(key) ?? 0) + Number(orderItem.quantity || 0));
        });
      });

      // 지난달 prefix
      const _lastDataDate = maxTime !== -Infinity ? new Date(maxTime) : new Date();
      const _ldMonth = _lastDataDate.getMonth();
      const _prevMonthYear = _ldMonth === 0 ? _lastDataDate.getFullYear() - 1 : _lastDataDate.getFullYear();
      const _prevMonth = _ldMonth === 0 ? 12 : _ldMonth;
      const lastMonthPrefix = `${_prevMonthYear}-${String(_prevMonth).padStart(2, '0')}`;

      // ── inventory 매핑 ──────────────────────────────────────────────────────
      const updatedInventory = prev.inventory.map(item => {
        const isCategory = isExchangePrefix(item.manufacturer) || item.manufacturer === '보험청구';
        if (isCategory) {
          return {
            ...item,
            usageCount: 0,
            currentStock: item.initialStock + (item.stockAdjustment ?? 0),
            recommendedStock: 0,
            monthlyAvgUsage: 0,
            dailyMaxUsage: 0,
            predictedDailyUsage: 0,
            forecastConfidence: 0,
          };
        }

        const targetM = normalize(item.manufacturer);
        const targetB = normalize(item.brand);
        const targetS = getSizeMatchKey(item.size, item.manufacturer);

        let totalUsage = 0;
        const mergedDailyQty: Record<string, number> = {};

        surgeryMap.forEach((entry, key) => {
          const [rowM, rowB, rowS] = key.split('|');
          if (
            (rowM.includes(targetM) || targetM.includes(rowM) || rowM === targetM) &&
            rowB === targetB &&
            rowS === targetS
          ) {
            totalUsage += entry.totalQty;
            for (const [day, qty] of Object.entries(entry.dailyQty)) {
              mergedDailyQty[day] = (mergedDailyQty[day] || 0) + qty;
            }
          }
        });

        const dailyMax = Object.values(mergedDailyQty).length > 0 ? Math.max(...Object.values(mergedDailyQty)) : 0;
        const monthlyAvg = Number((totalUsage / periodInMonths).toFixed(1));
        const lastMonthUsage = Object.entries(mergedDailyQty)
          .filter(([day]) => day.startsWith(lastMonthPrefix))
          .reduce((sum, [, qty]) => sum + qty, 0);

        const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
        const datedEntries = Object.entries(mergedDailyQty)
          .map(([day, qty]) => ({ day, qty: Number(qty) || 0, time: new Date(day).getTime() }))
          .filter(({ day, time }) => !!day && day !== 'unknown' && Number.isFinite(time))
          .sort((a, b) => a.time - b.time);

        const dailyQtyByDate = new Map<string, number>();
        datedEntries.forEach(entry => {
          const key = entry.day.slice(0, 10);
          dailyQtyByDate.set(key, (dailyQtyByDate.get(key) ?? 0) + entry.qty);
        });

        const toDateKey = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };

        const getWindowAvg = (days: number, offsetDays = 0) => {
          if (days <= 0) return 0;
          let total = 0;
          for (let i = offsetDays; i < offsetDays + days; i += 1) {
            const date = new Date(_lastDataDate);
            date.setDate(date.getDate() - i);
            total += dailyQtyByDate.get(toDateKey(date)) ?? 0;
          }
          return total / days;
        };

        const recent14Avg = getWindowAvg(14, 0);
        const recent30Avg = getWindowAvg(30, 0);
        const previous30Avg = getWindowAvg(30, 30);
        const monthlyDailyAvg = monthlyAvg / DAYS_PER_MONTH;

        const trendRatio = previous30Avg > 0
          ? recent30Avg / previous30Avg
          : recent30Avg > 0
            ? 1.05
            : 1;
        const trendFactor = clamp(trendRatio, calcSettings.trendFloor, calcSettings.trendCeiling);

        const volatilityBase = Math.max(recent30Avg, monthlyDailyAvg, 0.2);
        const volatilityRatio = dailyMax > 0 ? dailyMax / volatilityBase : 1;
        const volatilityFactor = clamp(1 + Math.max(0, volatilityRatio - 1) * 0.05, 1, 1.15);

        const baseForecastDaily = recent14Avg > 0
          ? (recent14Avg * 0.6) + (recent30Avg * 0.3) + (monthlyDailyAvg * 0.1)
          : recent30Avg > 0
            ? (recent30Avg * 0.7) + (monthlyDailyAvg * 0.3)
            : monthlyDailyAvg;

        const fallbackDaily = totalUsage > 0 ? Math.max(monthlyDailyAvg, 1 / DAYS_PER_MONTH) : 0;
        const predictedDailyUsage = Number(
          Math.max(0, (baseForecastDaily || fallbackDaily) * trendFactor * volatilityFactor).toFixed(2)
        );

        const sampleDensityScore = clamp(datedEntries.length / 30, 0, 1);
        const trendStabilityScore = previous30Avg > 0 && recent30Avg > 0
          ? 1 - clamp(Math.abs(recent30Avg - previous30Avg) / Math.max(previous30Avg, 0.1), 0, 1)
          : 0.6;
        const forecastConfidence = Number(
          clamp(0.35 + (sampleDensityScore * 0.45) + (trendStabilityScore * 0.2), 0.35, 0.95).toFixed(2)
        );

        const exactKey = `${targetM}|${targetB}|${targetS}`;
        const totalReceived = receivedMap.get(exactKey) ?? 0;

        const currentStock = item.initialStock + (item.stockAdjustment ?? 0) + totalReceived - totalUsage;
        const demandBase = Math.max(monthlyAvg, lastMonthUsage);
        const recommended = Math.max(Math.ceil(demandBase), dailyMax * calcSettings.safetyMultiplier, 1);

        const lastUsedDate = totalUsage > 0 && datedEntries.length > 0
          ? datedEntries[datedEntries.length - 1].day
          : null;

        return {
          ...item,
          usageCount: totalUsage,
          currentStock,
          recommendedStock: recommended,
          monthlyAvgUsage: monthlyAvg,
          dailyMaxUsage: dailyMax,
          predictedDailyUsage,
          forecastConfidence,
          lastMonthUsage,
          lastUsedDate,
        };
      });
      return { ...prev, inventory: updatedInventory };
    });
  }, [normalize, stockCalcSettingsRef]);

  useEffect(() => {
    syncInventoryWithUsageAndOrders();
  }, [surgeryMaster, orders, inventoryLength, syncInventoryWithUsageAndOrders]);

  return { syncInventoryWithUsageAndOrders, computeUsageByInventoryFromRecords };
}
