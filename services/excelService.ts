import { ExcelData, ExcelRow } from '../types';
import { supabase } from './supabaseClient';

function toCellScalar(cell: { t?: string; v?: unknown; w?: string } | undefined): string | number | boolean {
  if (!cell || cell.v === null || cell.v === undefined) return '';
  // SheetJS cell types: s=string, n=number, b=boolean, d=date, e=error
  switch (cell.t) {
    case 'n': return typeof cell.v === 'number' ? cell.v : Number(cell.v);
    case 'b': return !!cell.v;
    case 'd': return cell.w ?? (cell.v instanceof Date ? cell.v.toISOString().slice(0, 10) : String(cell.v));
    case 's': return String(cell.v);
    default: return cell.w ?? String(cell.v ?? '');
  }
}

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  if (!file || file.size === 0) {
    throw new Error('빈 파일입니다. 올바른 .xlsx 파일을 선택해 주세요.');
  }

  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();

  let workbook;
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
  } catch (e) {
    console.error('[excelService] XLSX.read 실패:', e, { fileName: file.name, fileSize: file.size, fileType: file.type });
    throw new Error(`엑셀 파일을 읽을 수 없습니다. 파일이 .xlsx 형식인지 확인해 주세요. (${file.name})`);
  }

  const sheets: Record<string, { name: string; columns: string[]; rows: ExcelRow[] }> = {};
  let activeSheetName = '';

  for (const sheetName of workbook.SheetNames) {
    if (!activeSheetName) activeSheetName = sheetName;
    const ws = workbook.Sheets[sheetName];
    if (!ws || !ws['!ref']) {
      sheets[sheetName] = { name: sheetName, columns: [], rows: [] };
      continue;
    }

    const range = XLSX.utils.decode_range(ws['!ref']);

    // 1행에서 헤더 추출 (빈 셀은 건너뜀)
    const columns: string[] = [];
    const colIndices: number[] = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const cell = ws[addr];
      const val = cell?.v;
      if (val !== null && val !== undefined && val !== '') {
        columns.push(String(val));
        colIndices.push(C);
      }
    }

    // 2행부터 데이터 추출
    const rows: ExcelRow[] = [];
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const rowData: ExcelRow = {};
      columns.forEach((colName, idx) => {
        const addr = XLSX.utils.encode_cell({ r: R, c: colIndices[idx] });
        rowData[colName] = toCellScalar(ws[addr] as { t?: string; v?: unknown; w?: string } | undefined);
      });
      if (rowData['사용안함'] !== undefined) {
        const val = rowData['사용안함'];
        rowData['사용안함'] = val === true || val === 'TRUE' || val === 1 || val === '1' || val === 'v';
      }
      rows.push(rowData);
    }

    sheets[sheetName] = { name: sheetName, columns, rows };
  }

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
