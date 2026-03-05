const EXCEL_FILE_REGEX = /\.(xlsx|xls)$/i;

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('02')) {
    // 서울 02 지역번호: 02-XXX-XXXX or 02-XXXX-XXXX
    if (digits.length <= 5) return digits.replace(/^(\d{2})(\d+)$/, '$1-$2');
    if (digits.length <= 9) return digits.replace(/^(\d{2})(\d{3})(\d+)$/, '$1-$2-$3');
    return digits.slice(0, 10).replace(/^(\d{2})(\d{4})(\d{4})$/, '$1-$2-$3');
  }
  // 010, 031, 032 등 10~11자리
  if (digits.length <= 6) return digits.replace(/^(\d{3})(\d+)$/, '$1-$2');
  if (digits.length <= 10) return digits.replace(/^(\d{3})(\d{3})(\d+)$/, '$1-$2-$3');
  return digits.slice(0, 11).replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
}

export function isExcelFile(file: File): boolean {
  return EXCEL_FILE_REGEX.test(file.name);
}

export function splitExcelFiles(files: File[]): { valid: File[]; invalid: File[] } {
  const valid: File[] = [];
  const invalid: File[] = [];

  files.forEach((file) => {
    if (isExcelFile(file)) valid.push(file);
    else invalid.push(file);
  });

  return { valid, invalid };
}
