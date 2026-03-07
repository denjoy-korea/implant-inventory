import { ExcelData, ExcelRow } from '../types';
import { supabase } from './supabaseClient';

function toCellScalar(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('result' in (v as object)) {
      const r = (v as { result?: unknown }).result;
      return (typeof r === 'string' || typeof r === 'number' || typeof r === 'boolean') ? r : String(r ?? '');
    }
    if ('richText' in (v as object)) {
      return (v as { richText: { text: string }[] }).richText.map(rt => rt.text).join('');
    }
  }
  return String(v);
}

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  if (!file || file.size === 0) {
    throw new Error('빈 파일입니다. 올바른 .xlsx 파일을 선택해 주세요.');
  }
  const ExcelJSModule = await import('exceljs');
  // ESM/CJS 양면 대응: Vite는 default export를 ExcelJSModule.default로 감싸는 경우가 있음
  const ExcelJS = (ExcelJSModule as Record<string, unknown>).default ?? ExcelJSModule;
  const workbook = new (ExcelJS as { Workbook: new () => import('exceljs').Workbook }).Workbook();
  const buffer = await file.arrayBuffer();
  try {
    await workbook.xlsx.load(buffer);
  } catch (e) {
    console.error('[excelService] workbook.xlsx.load 실패:', e, { fileName: file.name, fileSize: file.size, fileType: file.type });
    throw new Error(`엑셀 파일을 읽을 수 없습니다. 파일이 .xlsx 형식인지 확인해 주세요. (${file.name})`);
  }

  const sheets: Record<string, { name: string; columns: string[]; rows: ExcelRow[] }> = {};
  let activeSheetName = '';

  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name;
    if (!activeSheetName) activeSheetName = sheetName;

    const headerRow = worksheet.getRow(1);
    const columns: string[] = [];
    for (let C = 1; C <= worksheet.columnCount; C++) {
      const val = headerRow.getCell(C).value;
      if (val !== null && val !== undefined && val !== '') {
        columns.push(String(val));
      }
    }

    const rows: ExcelRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData: ExcelRow = {};
      columns.forEach((colName, idx) => {
        rowData[colName] = toCellScalar(row.getCell(idx + 1).value);
      });
      if (rowData['사용안함'] !== undefined) {
        const val = rowData['사용안함'];
        rowData['사용안함'] = val === true || val === 'TRUE' || val === 1 || val === '1' || val === 'v';
      }
      rows.push(rowData);
    });

    sheets[sheetName] = { name: sheetName, columns, rows };
  });

  return { sheets, activeSheetName };
};

export const downloadExcelFile = async (data: ExcelData, selectedIndices: Set<number>, fileName: string): Promise<void> => {
  const activeSheet = data.sheets[data.activeSheetName];
  if (!activeSheet) {
    return;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('엑셀 생성 실패: Supabase 환경변수가 설정되지 않았습니다.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? supabaseAnonKey;
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/xlsx-generate`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      activeSheet,
      selectedIndices: Array.from(selectedIndices),
      fileName,
    }),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody && typeof errBody === 'object' && 'error' in errBody && typeof errBody.error === 'string') {
        detail = errBody.error;
      }
    } catch {}
    throw new Error(`엑셀 생성 실패: ${detail}`);
  }

  const binaryData = await response.arrayBuffer();
  if (!(binaryData instanceof ArrayBuffer)) {
    throw new Error('엑셀 생성 실패: 서버 응답 형식이 올바르지 않습니다.');
  }

  const blob = new Blob([binaryData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const safeFileName = fileName?.trim() ? fileName : 'export.xlsx';
  const downloadUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = safeFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(downloadUrl);
  }
};
