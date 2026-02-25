import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, ExcelData, ExcelRow } from '../types';
import { extractLengthFromSize } from '../services/sizeUtils';
import { normalizeLength } from '../components/LengthFilter';

const FIXTURE_SETTINGS_KEY = 'fixture_settings_v1';
const MAX_SETTINGS_PAYLOAD_SIZE = 5 * 1024 * 1024;

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseFixtureEditControlsParams {
  fixtureData: ExcelData | null;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showAlertToast: NotifyFn;
}

const buildFixtureRowKey = (row: ExcelRow): string => [
  String(row['제조사'] || ''),
  String(row['브랜드'] || ''),
  String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || ''),
].join('\x00');

const isSkippableManufacturer = (manufacturer: string): boolean =>
  manufacturer.startsWith('수술중FAIL_') || manufacturer === '보험청구';

export function useFixtureEditControls({
  fixtureData,
  setState,
  showAlertToast,
}: UseFixtureEditControlsParams) {
  const [saveToast, setSaveToast] = useState<'idle' | 'saved'>('idle');
  const [restoreToast, setRestoreToast] = useState<'idle' | 'restored'>('idle');
  const saveToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(FIXTURE_SETTINGS_KEY);
      if (!raw) return null;
      const payload = JSON.parse(raw) as { savedAt?: string };
      return payload.savedAt ?? null;
    } catch {
      return null;
    }
  });
  const [isDirtyAfterSave, setIsDirtyAfterSave] = useState(false);
  const restorePanelRef = React.useRef<HTMLDivElement>(null);
  const [enabledManufacturers, setEnabledManufacturers] = useState<string[]>([]);
  const [hasSavedPoint, setHasSavedPoint] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(FIXTURE_SETTINGS_KEY);
    } catch {
      return false;
    }
  });

  const fixtureSheet = fixtureData?.sheets?.[fixtureData?.activeSheetName ?? ''];

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
      if (restoreToastTimerRef.current) clearTimeout(restoreToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!fixtureSheet) {
      setEnabledManufacturers([]);
      return;
    }

    const manufacturers = new Set<string>();
    fixtureSheet.rows.forEach(row => {
      const manufacturer = String(row['제조사'] || '기타');
      if (row['사용안함'] !== true && !isSkippableManufacturer(manufacturer)) {
        manufacturers.add(manufacturer);
      }
    });

    const nextEnabled = Array.from(manufacturers).sort();
    setEnabledManufacturers(prev => {
      if (prev.length === 0) return nextEnabled;
      const mergedSet = new Set(prev);
      nextEnabled.forEach(manufacturer => mergedSet.add(manufacturer));
      const merged = Array.from(mergedSet).sort();
      if (merged.length === prev.length && merged.every((manufacturer, index) => manufacturer === prev[index])) {
        return prev;
      }
      return merged;
    });
  }, [fixtureSheet]);

  const formattedSavedAt = useMemo(() => {
    if (!savedAt) return null;
    try {
      const date = new Date(savedAt);
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${date.getMonth() + 1}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return null;
    }
  }, [savedAt]);

  const fixtureRestoreDiffCount = useMemo(() => {
    if (!hasSavedPoint || !fixtureData) return 0;
    try {
      const raw = localStorage.getItem(FIXTURE_SETTINGS_KEY);
      if (!raw) return 0;
      const savedPayload = JSON.parse(raw) as { unusedKeys: string[] };
      const savedSet = new Set(savedPayload.unusedKeys);
      const activeSheet = fixtureData.sheets[fixtureData.activeSheetName];
      let diffCount = 0;
      activeSheet.rows.forEach(row => {
        const key = buildFixtureRowKey(row);
        const savedUnused = savedSet.has(key);
        const currentUnused = row['사용안함'] === true;
        if (savedUnused !== currentUnused) diffCount += 1;
      });
      return diffCount;
    } catch {
      return 0;
    }
  }, [fixtureData, hasSavedPoint]);

  const markDirtyAfterSave = useCallback(() => {
    setSaveToast('idle');
    setIsDirtyAfterSave(true);
  }, []);

  const handleBulkToggle = useCallback((filters: Record<string, string>, targetUnused: boolean) => {
    markDirtyAfterSave();
    setState(prev => {
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];
      const newRows = activeSheet.rows.map(row => {
        const matches = Object.entries(filters).every(([field, value]) => String(row[field] || '') === value);
        return matches ? { ...row, '사용안함': targetUnused } : row;
      });
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, [markDirtyAfterSave, setState]);

  const handleManufacturerToggle = useCallback((manufacturer: string, isActive: boolean) => {
    handleBulkToggle({ '제조사': manufacturer }, isActive);
    setEnabledManufacturers(prev => {
      if (isActive) {
        return prev.filter(item => item !== manufacturer);
      }
      return prev.includes(manufacturer) ? prev : [...prev, manufacturer].sort();
    });
  }, [handleBulkToggle]);

  const handleSaveSettings = useCallback((): boolean => {
    if (!fixtureData) return false;
    const activeSheet = fixtureData.sheets[fixtureData.activeSheetName];
    const unusedKeys = activeSheet.rows
      .filter(row => row['사용안함'] === true)
      .map(buildFixtureRowKey);

    const payload = {
      sheetName: fixtureData.activeSheetName,
      unusedKeys,
      savedAt: new Date().toISOString(),
    };

    try {
      const serialized = JSON.stringify(payload);
      if (serialized.length > MAX_SETTINGS_PAYLOAD_SIZE) {
        console.warn('[App] 설정 데이터가 5MB를 초과합니다. 저장하지 않습니다.');
        showAlertToast('설정 데이터가 너무 큽니다. 저장에 실패했습니다.', 'error');
        return false;
      }
      localStorage.setItem(FIXTURE_SETTINGS_KEY, serialized);
      setHasSavedPoint(true);
      setSavedAt(payload.savedAt);
      setIsDirtyAfterSave(false);
    } catch {
      showAlertToast('설정 저장에 실패했습니다. 저장 공간이 부족할 수 있습니다.', 'error');
      return false;
    }

    setSaveToast('saved');
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = setTimeout(() => setSaveToast('idle'), 2500);

    requestAnimationFrame(() => {
      restorePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return true;
  }, [fixtureData, showAlertToast]);

  const handleRestoreToSavedPoint = useCallback(() => {
    if (!fixtureData) return;

    let payload: { unusedKeys: string[] } | null = null;
    try {
      const raw = localStorage.getItem(FIXTURE_SETTINGS_KEY);
      if (!raw) return;
      if (raw.length > MAX_SETTINGS_PAYLOAD_SIZE) {
        console.warn('[App] localStorage 설정 데이터가 5MB를 초과합니다.');
        return;
      }
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (!payload || !Array.isArray(payload.unusedKeys)) return;

    const unusedKeySet = new Set(payload.unusedKeys);
    setState(prev => {
      const data = prev.fixtureData;
      if (!data) return prev;
      const activeSheet = data.sheets[data.activeSheetName];
      const newRows = activeSheet.rows.map(row => ({
        ...row,
        '사용안함': unusedKeySet.has(buildFixtureRowKey(row)),
      }));
      const newSheets = { ...data.sheets, [data.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...data, sheets: newSheets } };
    });

    setIsDirtyAfterSave(false);
    setEnabledManufacturers(() => {
      const activeSheet = fixtureData.sheets[fixtureData.activeSheetName];
      const manufacturers = new Set<string>();
      activeSheet.rows.forEach(row => {
        const key = buildFixtureRowKey(row);
        const manufacturer = String(row['제조사'] || '기타');
        if (!unusedKeySet.has(key) && !isSkippableManufacturer(manufacturer)) {
          manufacturers.add(manufacturer);
        }
      });
      return Array.from(manufacturers).sort();
    });
    setRestoreToast('restored');
    if (restoreToastTimerRef.current) clearTimeout(restoreToastTimerRef.current);
    restoreToastTimerRef.current = setTimeout(() => setRestoreToast('idle'), 2500);
  }, [fixtureData, setState]);

  const handleExpandFailClaim = useCallback(() => {
    setState(prev => {
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];

      const alreadyExpanded = activeSheet.rows.some(row =>
        String(row['제조사'] || '').startsWith('수술중FAIL_')
      );
      if (alreadyExpanded) return prev;

      const activeRows = activeSheet.rows.filter(row => row['사용안함'] !== true);
      if (activeRows.length === 0) return prev;

      const failRows = activeRows.map(row => ({
        ...row,
        '제조사': `수술중FAIL_${row['제조사'] || ''}`,
      }));

      const hasInsurance = activeSheet.rows.some(row => String(row['제조사'] || '') === '보험청구');
      const insuranceRows: ExcelRow[] = [];
      if (!hasInsurance) {
        const insuranceRow: ExcelRow = {};
        activeSheet.columns.forEach(column => { insuranceRow[column] = ''; });
        insuranceRow['제조사'] = '보험청구';
        insuranceRow['브랜드'] = '보험청구';
        const sizeColumn = activeSheet.columns.find(column => /규격|사이즈|SIZE|size/i.test(column));
        if (sizeColumn) insuranceRow[sizeColumn] = '2단계 청구';
        insuranceRow['사용안함'] = false;
        insuranceRows.push(insuranceRow);
      }

      const newRows = [...activeSheet.rows, ...failRows, ...insuranceRows];
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, [setState]);

  const handleLengthToggle = useCallback((normalizedTarget: string, setUnused: boolean) => {
    setSaveToast('idle');
    setState(prev => {
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];

      const activeCombos = new Set<string>();
      activeSheet.rows.forEach(row => {
        if (row['사용안함'] === true) return;
        activeCombos.add(`${row['제조사'] || ''}|||${row['브랜드'] || ''}`);
      });

      const newRows = activeSheet.rows.map(row => {
        const combo = `${row['제조사'] || ''}|||${row['브랜드'] || ''}`;
        if (!activeCombos.has(combo)) return row;

        const size = String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || '');
        const rawLength = extractLengthFromSize(size);
        const normalized = rawLength ? normalizeLength(rawLength) : '';
        return normalized === normalizedTarget ? { ...row, '사용안함': setUnused } : row;
      });
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, [setState]);

  return {
    enabledManufacturers,
    hasSavedPoint,
    isDirtyAfterSave,
    restoreToast,
    saveToast,
    formattedSavedAt,
    fixtureRestoreDiffCount,
    restorePanelRef,
    handleBulkToggle,
    handleManufacturerToggle,
    handleLengthToggle,
    handleRestoreToSavedPoint,
    handleSaveSettings,
    handleExpandFailClaim,
    markDirtyAfterSave,
  };
}
