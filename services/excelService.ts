import { ExcelData } from '../types';
import { supabase } from './supabaseClient';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 2MB를 초과합니다.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const fileBase64 = btoa(binary);

  const { data, error } = await supabase.functions.invoke('xlsx-parse', {
    body: { fileBase64, filename: file.name },
  });

  if (error) {
    throw new Error(`엑셀 파싱 실패: ${error.message}`);
  }
  if (!data) {
    throw new Error('엑셀 파싱 결과가 없습니다.');
  }

  return data as ExcelData;
};

export const downloadExcelFile = async (data: ExcelData, selectedIndices: Set<number>, fileName: string): Promise<void> => {
  const activeSheet = data.sheets[data.activeSheetName];
  if (!activeSheet) {
    return;
  }

  const { data: binaryData, error } = await supabase.functions.invoke('xlsx-generate', {
    body: {
      activeSheet: {
        name: activeSheet.name,
        columns: activeSheet.columns,
        rows: activeSheet.rows,
      },
      selectedIndices: Array.from(selectedIndices),
      fileName: fileName || 'export.xlsx',
    },
    responseType: 'arraybuffer',
  } as any);

  if (error) {
    throw new Error(`엑셀 생성 실패: ${error.message}`);
  }
  if (!binaryData) {
    throw new Error('엑셀 생성 결과가 없습니다.');
  }

  const blob = new Blob([binaryData as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'export.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
