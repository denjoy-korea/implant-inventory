import * as XLSX from 'xlsx';
import { ExcelData } from '../types';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 2MB를 초과합니다.');
  }

  const arrayBuffer = await file.arrayBuffer();

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`엑셀 파싱 실패: ${msg}`);
  }

  const sheets: ExcelData['sheets'] = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
    const columns: string[] = [];
    if (range) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        const cell = worksheet[address];
        if (cell && cell.v !== undefined && cell.v !== null) {
          columns.push(String(cell.v));
        }
      }
    }

    const cleanedRows = rows.map((row) => {
      if (row['사용안함'] !== undefined) {
        const val = row['사용안함'];
        row['사용안함'] = val === true || val === 'TRUE' || val === 1 || val === '1' || val === 'v';
      }
      return row;
    });

    sheets[sheetName] = { name: sheetName, columns, rows: cleanedRows };
  });

  return {
    sheets,
    activeSheetName: workbook.SheetNames[0],
  };
};

export const downloadExcelFile = async (data: ExcelData, selectedIndices: Set<number>, fileName: string): Promise<void> => {
  const activeSheet = data.sheets[data.activeSheetName];
  if (!activeSheet) {
    return;
  }

  const selectedRows = activeSheet.rows.filter((_, i) => selectedIndices.has(i));
  const rowsToExport = selectedRows.length > 0 ? selectedRows : activeSheet.rows;

  const worksheet = XLSX.utils.json_to_sheet(rowsToExport, { header: activeSheet.columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, activeSheet.name);

  XLSX.writeFile(workbook, fileName || 'export.xlsx');
};
