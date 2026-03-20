import { useCallback } from 'react';
import React from 'react';
import { AppState, InventoryItem } from '../types';
import { getSizeMatchKey, toCanonicalSize } from '../services/sizeNormalizer';
import { fixIbsImplant } from '../services/mappers';
import { normalizeSurgery } from '../services/normalizationService';
import { surgeryService } from '../services/surgeryService';
import { isExchangePrefix } from '../services/appUtils';
import {
  buildBrandSizeFormatIndex,
  hasRegisteredBrandSize,
  isListBasedSurgeryInput,
  isManufacturerAliasMatch,
} from '../services/surgeryUnregisteredUtils';

export interface ManualFixResult {
  checked: number;
  found: number;
  applicable: number;
  alreadyFixed: number;
  updated: number;
  failed: number;
  notFound: number;
  appliedManufacturer: string;
  appliedBrand: string;
  appliedSize: string;
}

export function useSurgeryManualFix(
  surgeryMaster: AppState['surgeryMaster'],
  inventory: InventoryItem[],
  hospitalId: string | undefined,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
) {
  const resolveManualSurgeryInput = useCallback(async (params: {
    recordIds: string[];
    targetManufacturer: string;
    targetBrand: string;
    targetSize: string;
    verifyOnly?: boolean;
    forceApply?: boolean;
  }): Promise<ManualFixResult> => {
    const sheetName = '수술기록지';
    const rows = surgeryMaster[sheetName] || [];
    const idSet = Array.from(new Set((params.recordIds || []).filter(Boolean)));

    const fixedTarget = fixIbsImplant(
      String(params.targetManufacturer || '').trim(),
      String(params.targetBrand || '').trim()
    );
    const canonicalTargetSize = toCanonicalSize(String(params.targetSize || '').trim(), fixedTarget.manufacturer);
    const targetSizeKey = getSizeMatchKey(canonicalTargetSize, fixedTarget.manufacturer);
    const targetBrandKey = normalizeSurgery(fixedTarget.brand);
    const targetManufacturerKey = normalizeSurgery(fixedTarget.manufacturer);

    // 동일 제조사-브랜드-규격 키를 가진 기존 재고 규격 표기를 우선 사용 (목록 기반 표기 통일)
    const preferredInventoryItem = inventory.find(item => {
      if (isExchangePrefix(item.manufacturer)) return false;
      if (item.manufacturer === '보험청구' || item.brand === '보험임플란트') return false;
      const itemFixed = fixIbsImplant(item.manufacturer, item.brand);
      return (
        normalizeSurgery(itemFixed.brand) === targetBrandKey &&
        isManufacturerAliasMatch(normalizeSurgery(itemFixed.manufacturer), targetManufacturerKey) &&
        getSizeMatchKey(item.size, itemFixed.manufacturer) === targetSizeKey
      );
    });
    const appliedSize = preferredInventoryItem?.size || canonicalTargetSize;

    const formatIndex = buildBrandSizeFormatIndex(inventory);

    let found = 0;
    let alreadyFixed = 0;
    let notFound = 0;
    const applicableIds: string[] = [];

    if (params.forceApply) {
      // forceApply: state 조회 없이 recordId 기반으로 DB 직접 수정
      // (state에 _id가 없어도 DB UUID가 있으면 동작)
      applicableIds.push(...idSet);
      found = idSet.length;
    } else {
      for (const id of idSet) {
        const row = rows.find(r => String(r._id || '') === id);
        if (!row) {
          notFound += 1;
          continue;
        }
        found += 1;

        const rowManufacturer = String(row['제조사'] || '').trim();
        const rowBrand = String(row['브랜드'] || '').trim();
        const rowSize = String(row['규격(SIZE)'] || '').trim();
        const rowHasRegisteredCombo = hasRegisteredBrandSize(formatIndex, rowManufacturer, rowBrand, rowSize);
        const rowIsListBased = isListBasedSurgeryInput(formatIndex, rowManufacturer, rowBrand, rowSize);

        if (rowIsListBased || !rowHasRegisteredCombo) {
          alreadyFixed += 1;
          continue;
        }
        applicableIds.push(id);
      }
    }

    if (params.verifyOnly) {
      return {
        checked: idSet.length,
        found,
        applicable: applicableIds.length,
        alreadyFixed,
        updated: 0,
        failed: 0,
        notFound,
        appliedManufacturer: fixedTarget.manufacturer,
        appliedBrand: fixedTarget.brand,
        appliedSize,
      };
    }

    if (applicableIds.length === 0) {
      return {
        checked: idSet.length,
        found,
        applicable: 0,
        alreadyFixed,
        updated: 0,
        failed: 0,
        notFound,
        appliedManufacturer: fixedTarget.manufacturer,
        appliedBrand: fixedTarget.brand,
        appliedSize,
      };
    }

    const successIds: string[] = [];
    let failed = 0;

    if (hospitalId) {
      const updateResults = await Promise.all(
        applicableIds.map(async (id) => {
          const updated = await surgeryService.updateRecord(id, {
            manufacturer: fixedTarget.manufacturer,
            brand: fixedTarget.brand,
            size: appliedSize,
          });
          return { id, ok: !!updated };
        })
      );

      updateResults.forEach(result => {
        if (result.ok) {
          successIds.push(result.id);
        } else {
          failed += 1;
        }
      });
    } else {
      successIds.push(...applicableIds);
    }

    if (successIds.length > 0) {
      const successIdSet = new Set(successIds);
      setState(prev => {
        const prevRows = prev.surgeryMaster[sheetName] || [];
        const nextRows = prevRows.map(row => {
          const rowId = String(row._id || '');
          if (!successIdSet.has(rowId)) return row;
          return {
            ...row,
            '제조사': fixedTarget.manufacturer,
            '브랜드': fixedTarget.brand,
            '규격(SIZE)': appliedSize,
          };
        });
        return {
          ...prev,
          surgeryMaster: {
            ...prev.surgeryMaster,
            [sheetName]: nextRows,
          },
        };
      });
    }

    return {
      checked: idSet.length,
      found,
      applicable: applicableIds.length,
      alreadyFixed,
      updated: successIds.length,
      failed,
      notFound,
      appliedManufacturer: fixedTarget.manufacturer,
      appliedBrand: fixedTarget.brand,
      appliedSize,
    };
  }, [surgeryMaster, inventory, hospitalId, setState]);

  return { resolveManualSurgeryInput };
}
