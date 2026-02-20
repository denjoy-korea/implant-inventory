export const extractLengthFromSize = (size: string | number | null | undefined): string => {
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
