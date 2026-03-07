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
  const ExcelJSModule = await import('exceljs') as Record<string, unknown>;
  // ESM/CJS/UMD 대응: Vite 브라우저 빌드는 다양한 형태로 감쌀 수 있음
  // 가능한 경로: mod.Workbook, mod.default.Workbook, mod.default.default.Workbook
  type WbCtor = new () => import('exceljs').Workbook;
  const resolveWorkbook = (mod: Record<string, unknown>): WbCtor | null => {
    if (typeof mod.Workbook === 'function') return mod.Workbook as WbCtor;
    if (mod.default && typeof mod.default === 'object') {
      const def = mod.default as Record<string, unknown>;
      if (typeof def.Workbook === 'function') return def.Workbook as WbCtor;
      if (def.default && typeof def.default === 'object') {
        const def2 = def.default as Record<string, unknown>;
        if (typeof def2.Workbook === 'function') return def2.Workbook as WbCtor;
      }
    }
    return null;
  };
  const WorkbookCtor = resolveWorkbook(ExcelJSModule);
  if (!WorkbookCtor) {
    console.error('[excelService] ExcelJS Workbook 생성자를 찾을 수 없음. 모듈 구조:', Object.keys(ExcelJSModule), ExcelJSModule.default ? Object.keys(ExcelJSModule.default as object) : 'no default');
    throw new Error('엑셀 라이브러리 초기화에 실패했습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
  }
  const workbook = new WorkbookCtor();
  const buffer = await file.arrayBuffer();
  try {
    // JSZip(ExcelJS 내부)은 브라우저에서 Uint8Array를 ArrayBuffer보다 안정적으로 처리
    await workbook.xlsx.load(new Uint8Array(buffer) as unknown as ArrayBuffer);
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
