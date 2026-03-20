import { useMemo } from 'react';
import { ExcelData, ExcelRow, InventoryItem, SurgeryUnregisteredItem } from '../types';
import { normalizeSurgery } from '../services/normalizationService';
import { getSizeMatchKey, toCanonicalSize, isIbsImplantManufacturer } from '../services/sizeNormalizer';
import { isExchangePrefix, buildInventoryDuplicateKey } from '../services/appUtils';
import { fixIbsImplant } from '../services/mappers';
import {
  appendUnregisteredSample,
  buildBrandSizeFormatIndex,
  buildUnregisteredSample,
  hasRegisteredBrandSize,
  isListBasedSurgeryInput,
  normalizeSizeTextStrict,
} from '../services/surgeryUnregisteredUtils';

export function useSurgeryUnregistered(
  surgeryMaster: Record<string, ExcelRow[]>,
  inventory: InventoryItem[],
  fixtureData?: ExcelData | null,
): SurgeryUnregisteredItem[] {
  return useMemo<SurgeryUnregisteredItem[]>(() => {
    const rows = surgeryMaster['수술기록지'] || [];
    if (rows.length === 0) return [];

    // fixture가 있으면 현재 활성(사용안함=false) 항목만 유효한 inventory로 간주
    let effectiveInventory = inventory;
    if (fixtureData) {
      const activeSheet = fixtureData.sheets[fixtureData.activeSheetName];
      if (activeSheet) {
        const activeFixtureKeys = new Set(
          activeSheet.rows
            .filter(row =>
              row['사용안함'] !== true &&
              !isExchangePrefix(String(row['제조사'] || '')) &&
              String(row['제조사'] || '') !== '보험청구' &&
              String(row['제조사'] || '') !== 'z수술후FAIL'
            )
            .map(row => {
              const fixed = fixIbsImplant(
                String(row['제조사'] || ''),
                String(row['브랜드'] || ''),
              );
              const rawSize = String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || '');
              const size = isIbsImplantManufacturer(fixed.manufacturer) ? rawSize : toCanonicalSize(rawSize, fixed.manufacturer);
              return buildInventoryDuplicateKey({ manufacturer: fixed.manufacturer, brand: fixed.brand, size });
            })
        );
        effectiveInventory = inventory.filter(item => activeFixtureKeys.has(buildInventoryDuplicateKey(item)));
      }
    }

    const formatIndex = buildBrandSizeFormatIndex(effectiveInventory);
    const missingMap = new Map<string, SurgeryUnregisteredItem>();

    rows.forEach((row) => {
      const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
      if (isTotalRow) return;

      const cls = String(row['구분'] || '').trim();
      if (cls !== '식립' && cls !== '수술중교환') return;

      const surgeryRecord = String(row['수술기록'] || '');
      if (surgeryRecord.includes('[GBR Only]')) return;
      if (surgeryRecord.includes('[일괄등록]')) return;

      const manufacturer = String(row['제조사'] || '').trim();
      const brand = String(row['브랜드'] || '').trim();
      const size = String(row['규격(SIZE)'] || '').trim();

      if (!manufacturer && !brand && !size) return;
      if (isExchangePrefix(manufacturer)) return;
      if (manufacturer === '보험청구' || brand === '보험임플란트') return;

      const qtyRaw = row['갯수'] !== undefined ? Number(row['갯수']) : 1;
      const qty = Number.isFinite(qtyRaw) ? qtyRaw : 1;
      const sample = buildUnregisteredSample(row);

      const normM = normalizeSurgery(manufacturer);
      const normB = normalizeSurgery(brand);
      const normS = getSizeMatchKey(size, manufacturer);
      const hasRegisteredCombo = hasRegisteredBrandSize(formatIndex, manufacturer, brand, size);
      const isListBased = isListBasedSurgeryInput(formatIndex, manufacturer, brand, size);
      if (isListBased) return;

      const itemKey = hasRegisteredCombo
        ? `${normM}|${normB}|${normS}|manual:${normalizeSizeTextStrict(size)}`
        : `${normM}|${normB}|${normS}`;
      const existing = missingMap.get(itemKey);
      const rowId = String(row._id || '').trim();
      if (existing) {
        existing.usageCount += qty;
        appendUnregisteredSample(existing, sample);
        if (rowId) {
          const currentIds = existing.recordIds ?? [];
          if (!currentIds.includes(rowId)) {
            existing.recordIds = [...currentIds, rowId];
          }
        }
      } else {
        missingMap.set(itemKey, {
          manufacturer: manufacturer || '-',
          brand: brand || '-',
          size: size || '-',
          usageCount: qty,
          reason: hasRegisteredCombo ? 'non_list_input' : 'not_in_inventory',
          samples: [sample],
          recordIds: rowId ? [rowId] : [],
        });
      }
    });

    return Array.from(missingMap.values()).sort((a, b) => b.usageCount - a.usageCount);
  }, [surgeryMaster, inventory, fixtureData]);
}
