/** 날짜 값(Date, Excel serial, string)을 'YYYY-MM' 키로 변환 */
export function toMonthKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  let date: Date | null = null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    date = value;
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial date -> JS Date
    const excelEpochMs = Date.UTC(1899, 11, 30);
    date = new Date(excelEpochMs + value * 24 * 60 * 60 * 1000);
  } else {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
