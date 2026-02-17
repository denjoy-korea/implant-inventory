import { ExcelData, ExcelSheet, ExcelRow } from '../types';

type XlsxModule = typeof import('xlsx');
let xlsxModulePromise: Promise<XlsxModule> | null = null;

async function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }
  return xlsxModulePromise;
}

export const extractLengthFromSize = (size: any): string => {
  if (size === undefined || size === null) return "";
  const s = String(size).trim();
  if (!s) return "";
  const doubleXMatch = s.match(/[xX×*]\s*(\d+(\.\d+)?)\s*[xX×*]/);
  if (doubleXMatch) return doubleXMatch[1];
  const singleXMatch = s.match(/[xX×*]\s*(\d+(\.\d+)?)/);
  if (singleXMatch) return singleXMatch[1];
  const lMatch = s.match(/[lL]\s*(\d+(\.\d+)?)/);
  if (lMatch) return lMatch[1];
  const digitWithAlphaMatch = s.match(/\b(\d{4}|\d{6})[a-zA-Z]*\b/);
  if (digitWithAlphaMatch) {
    const fullDigits = digitWithAlphaMatch[1];
    return fullDigits.substring(fullDigits.length - 2);
  }
  const simpleDigits = s.match(/\b(\d{4}|\d{6})\b/);
  if (simpleDigits) {
    const d = simpleDigits[0];
    return d.substring(d.length - 2);
  }
  return "";
};

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  const XLSX = await loadXlsx();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!(data instanceof ArrayBuffer)) {
          reject(new Error('파일을 읽을 수 없습니다.'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheets: Record<string, ExcelSheet> = {};
        workbook.SheetNames.forEach((sheetName: string) => {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: "" });
          const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
          const columns: string[] = [];
          if (range) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const address = XLSX.utils.encode_col(C) + "1";
              const cell = worksheet[address];
              if (cell && cell.v !== undefined && cell.v !== null) columns.push(String(cell.v));
            }
          }
          const cleanedRows = rows.map((row) => {
            if (row['사용안함'] !== undefined) {
              const val = row['사용안함'];
              row['사용안함'] = (val === true || val === 'TRUE' || val === 1 || val === '1' || val === 'v');
            }
            return row;
          });
          sheets[sheetName] = { name: sheetName, columns, rows: cleanedRows };
        });
        resolve({ sheets, activeSheetName: workbook.SheetNames[0] });
      } catch (error) { reject(error); }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const downloadExcelFile = async (data: ExcelData, selectedIndices: Set<number>, fileName: string): Promise<void> => {
  const activeSheet = data.sheets[data.activeSheetName];
  if (!activeSheet) return;
  const XLSX = await loadXlsx();

  // 사용안함이 체크되지 않은 항목만 필터링하여 다운로드
  const processedRows = activeSheet.rows.filter((row, index) => {
    return selectedIndices.has(index) && row['사용안함'] !== true;
  });

  const worksheet = XLSX.utils.json_to_sheet(processedRows, { header: activeSheet.columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, activeSheet.name);
  XLSX.writeFile(workbook, fileName || "processed_result.xlsx");
};
