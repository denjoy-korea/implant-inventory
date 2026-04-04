import { useMemo } from 'react';
import type { AppState, ExcelData, InventoryItem } from '../types';
import { useSurgeryUnregistered } from './useSurgeryUnregistered';

interface UseAppInventoryMasterStateParams {
  surgeryMaster: AppState['surgeryMaster'];
  inventory: InventoryItem[];
  fixtureData: AppState['fixtureData'];
}

export function useAppInventoryMasterState({
  surgeryMaster,
  inventory,
  fixtureData,
}: UseAppInventoryMasterStateParams) {
  const virtualSurgeryData = useMemo((): ExcelData | null => {
    const masterRows = surgeryMaster['수술기록지'];
    if (!masterRows || masterRows.length === 0) return null;
    const sortedColumns = ['날짜', '환자정보', '치아번호', '갯수', '수술기록', '구분', '제조사', '브랜드', '규격(SIZE)', '골질', '초기고정'];
    return {
      sheets: {
        '수술기록지': {
          name: '수술기록지',
          columns: sortedColumns,
          rows: masterRows,
        },
      },
      activeSheetName: '수술기록지',
    } as ExcelData;
  }, [surgeryMaster]);

  const surgeryUnregisteredItems = useSurgeryUnregistered(surgeryMaster, inventory, fixtureData);

  return {
    virtualSurgeryData,
    surgeryUnregisteredItems,
  };
}
