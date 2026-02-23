
import { ParsedSize } from '../types';

// Dentium / 포인트임플란트 숫자코드 제조사
const NUMERIC_CODE_MANUFACTURERS = ['dentium', '덴티움', '포인트', '포인트임플란트', 'point'];

function isNumericCodeManufacturer(manufacturer: string): boolean {
  const m = manufacturer.toLowerCase().replace(/[\s\-\_]/g, '');
  return NUMERIC_CODE_MANUFACTURERS.some(nm => m.includes(nm));
}

// 숫자 포맷: 소수점 뒤 불필요한 0 제거
function fmtNum(n: number): string {
  return n % 1 === 0 ? String(n) : String(n);
}

function normalizeCuffToken(cuffRaw: string | null): string | null {
  if (!cuffRaw) return null;
  const cleaned = String(cuffRaw)
    .trim()
    .toUpperCase()
    .replace(/^CUFF[:\s]*/i, '')
    .replace(/^C/i, '')
    .trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return fmtNum(num);
}

function buildMatchKey(diameter: number, length: number, cuff: string | null): string {
  const normalizedCuff = normalizeCuffToken(cuff);
  return `d${fmtNum(diameter)}_l${fmtNum(length)}${normalizedCuff ? `_c${normalizedCuff}` : ''}`;
}

function formatIbsDiameter(n: number): string {
  if (Number.isInteger(n)) return n.toFixed(1);
  return fmtNum(n);
}

function formatIbsLength(n: number): string {
  return fmtNum(n);
}

export function isIbsImplantManufacturer(manufacturer?: string): boolean {
  const normalized = String(manufacturer || '')
    .toLowerCase()
    .replace(/[\s\-_]/g, '');
  return normalized === 'ibs' || normalized.includes('ibsimplant');
}

// A. Dentium 숫자코드 디코딩 (4자리: 3507 → D3.5 L7, 6자리: 483410 → D4.8/3.4 L10)
function parseDentiumCode(raw: string): ParsedSize | null {
  const cleaned = raw.replace(/[^0-9a-zA-Z]/g, '');
  // 접미사 추출 (BS, S, W, SW 등)
  const suffixMatch = cleaned.match(/^(\d{4,6})(BS|SW|S|W)$/i);
  const digits = suffixMatch ? suffixMatch[1] : cleaned.replace(/[a-zA-Z]+$/, '');
  const suffixStr = suffixMatch ? suffixMatch[2].toUpperCase() : (cleaned.replace(/^\d+/, '') || null);

  if (digits.length === 4) {
    const d = parseInt(digits.substring(0, 2), 10) / 10;
    const l = parseInt(digits.substring(2, 4), 10);
    if (d > 0 && d < 10 && l > 0 && l < 30) {
      return {
        diameter: d,
        length: l,
        cuff: null,
        suffix: suffixStr || null,
        raw,
        matchKey: `d${fmtNum(d)}_l${fmtNum(l)}`
      };
    }
  }

  if (digits.length === 6) {
    // 6자리: 여러 해석 시도
    // 패턴1: 48 34 10 → 직경계열48에서 직경3.4, 길이10
    const d = parseInt(digits.substring(2, 4), 10) / 10;
    const l = parseInt(digits.substring(4, 6), 10);
    if (d > 0 && d < 10 && l > 0 && l < 30) {
      return {
        diameter: d,
        length: l,
        cuff: null,
        suffix: suffixStr || null,
        raw,
        matchKey: `d${fmtNum(d)}_l${fmtNum(l)}`
      };
    }
  }

  return null;
}

// B/B2. Phi x 형 (OSSTEM, 디오, 메가젠, 네오바이오텍, 신흥 등)
function parsePhiFormat(raw: string): ParsedSize | null {
  const m = raw.match(/[Φφ]\s*(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)(?:\s*[×xX*]\s*(\d+\.?\d*))?/);
  if (!m) return null;
  const diameter = parseFloat(m[1]);
  const length = parseFloat(m[2]);
  const cuff = normalizeCuffToken(m[3] ? m[3] : null);
  return {
    diameter,
    length,
    cuff,
    suffix: null,
    raw,
    matchKey: buildMatchKey(diameter, length, cuff)
  };
}

// C. Oslash x mm형 (덴티스, 탑플란, Warantec)
function parseOslashFormat(raw: string): ParsedSize | null {
  const m = raw.match(/[Øø]\s*(\d+\.?\d*)\s*[xX×]\s*0?(\d+\.?\d*)\s*mm/i);
  if (!m) return null;
  const diameter = parseFloat(m[1]);
  const length = parseFloat(m[2]);
  // 접미사: ,L / ,S 등
  const suffixMatch = raw.match(/mm\s*[,\s]*([LSls])\b/i);
  const suffix = suffixMatch ? suffixMatch[1].toUpperCase() : null;
  return {
    diameter,
    length,
    cuff: null,
    suffix,
    raw,
    matchKey: `d${fmtNum(diameter)}_l${fmtNum(length)}`
  };
}

// D. Cuff 접두 + Phi형 (Magicore)
function parseCuffPhiFormat(raw: string): ParsedSize | null {
  const m = raw.match(/^C\s*(\d+\.?\d*)\s*[Φφ]\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/i);
  if (!m) return null;
  const cuff = normalizeCuffToken(m[1]);
  const diameter = parseFloat(m[2]);
  const length = parseFloat(m[3]);
  return {
    diameter,
    length,
    cuff,
    suffix: null,
    raw,
    matchKey: buildMatchKey(diameter, length, cuff)
  };
}

// E. Oslash / L 형 (메가젠 BLUEDIAMOND)
function parseOslashLFormat(raw: string): ParsedSize | null {
  const m = raw.match(/[Øø]\s*(\d+\.?\d*)\s*\/\s*L\s*(\d+\.?\d*)/i);
  if (!m) return null;
  const diameter = parseFloat(m[1]);
  const length = parseFloat(m[2]);
  // DT suffix
  const dtMatch = raw.match(/\/\s*DT\b/i);
  const suffix = dtMatch ? 'DT' : null;
  return {
    diameter,
    length,
    cuff: null,
    suffix,
    raw,
    matchKey: `d${fmtNum(diameter)}_l${fmtNum(length)}`
  };
}

// F. D: L: Cuff: 형 (수술기록 IBS)
function parseDLCuffFormat(raw: string): ParsedSize | null {
  const m = raw.match(/D[:\s]*(\d+\.?\d*)\s*L[:\s]*(\d+\.?\d*)/i);
  if (!m) return null;
  const diameter = parseFloat(m[1]);
  const length = parseFloat(m[2]);
  const cuffMatch = raw.match(/Cuff[:\s]*(\d+\.?\d*)/i);
  const cuff = normalizeCuffToken(cuffMatch ? cuffMatch[1] : null);
  return {
    diameter,
    length,
    cuff,
    suffix: null,
    raw,
    matchKey: buildMatchKey(diameter, length, cuff)
  };
}

// Fallback: Phi 없이 bare 숫자 x 숫자 패턴 (예: "4.0 x 10")
function parseBareNumericFormat(raw: string): ParsedSize | null {
  const m = raw.match(/(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)/);
  if (!m) return null;
  const diameter = parseFloat(m[1]);
  const length = parseFloat(m[2]);
  if (diameter > 0 && diameter < 10 && length > 0 && length < 30) {
    return {
      diameter,
      length,
      cuff: null,
      suffix: null,
      raw,
      matchKey: `d${fmtNum(diameter)}_l${fmtNum(length)}`
    };
  }
  return null;
}

export function parseSize(raw: string, manufacturer?: string): ParsedSize {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { diameter: null, length: null, cuff: null, suffix: null, raw: trimmed, matchKey: '' };
  }

  const mfr = String(manufacturer || '').trim();

  // D. Cuff + Phi 형 (가장 구체적인 패턴 먼저)
  const dResult = parseCuffPhiFormat(trimmed);
  if (dResult) return dResult;

  // F. D: L: Cuff: 형
  const fResult = parseDLCuffFormat(trimmed);
  if (fResult) return fResult;

  // E. Oslash / L 형
  const eResult = parseOslashLFormat(trimmed);
  if (eResult) return eResult;

  // C. Oslash x mm형
  const cResult = parseOslashFormat(trimmed);
  if (cResult) return cResult;

  // B/B2. Phi x 형
  const bResult = parsePhiFormat(trimmed);
  if (bResult) return bResult;

  // A. 숫자코드 (제조사 힌트가 있을 때 우선, 없으면 4~6자리 순수숫자+접미사 패턴이면 시도)
  if (isNumericCodeManufacturer(mfr) || /^\d{4,6}[a-zA-Z]*$/.test(trimmed)) {
    const aResult = parseDentiumCode(trimmed);
    if (aResult) return aResult;
  }

  // Fallback: bare 숫자 x 숫자
  const bareResult = parseBareNumericFormat(trimmed);
  if (bareResult) return bareResult;

  // 파싱 실패: raw 그대로 반환 (matchKey는 정규화된 문자열)
  return {
    diameter: null,
    length: null,
    cuff: null,
    suffix: null,
    raw: trimmed,
    matchKey: trimmed.toLowerCase().replace(/[\s\-\_\.\(\)]/g, '').replace(/[Φφ]/g, 'd')
  };
}

export function getSizeMatchKey(raw: string, manufacturer?: string): string {
  return parseSize(raw, manufacturer).matchKey;
}

/**
 * IBS Implant 표기를 신 표준 형식으로 통일한다.
 * - 구 표기: D:3.5 L:11 Cuff:4
 * - 신 표기: C4 Φ3.5 X 11
 */
export function toCanonicalSize(raw: string, manufacturer?: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';

  // 숫자코드 제조사 (Dentium, 포인트 등): 잘못된 문자 자동 제거
  // e.g. "40*07" → "4007", "40 07" → "4007"
  if (isNumericCodeManufacturer(manufacturer || '') && !/^[0-9A-Za-z]+$/.test(trimmed)) {
    const cleaned = trimmed.replace(/[^0-9A-Za-z]/g, '');
    if (/^\d+[A-Za-z]*$/.test(cleaned)) return cleaned;
  }

  if (!isIbsImplantManufacturer(manufacturer)) {
    // Φ 포맷 브랜드: 구분자(×/x/X) 앞뒤 공백 정규화
    // e.g. "Φ4.5 ×8.5" → "Φ4.5 × 8.5", "Φ4.0×10×1.8" → "Φ4.0 × 10 × 1.8"
    if (/^[Φφ]/.test(trimmed)) {
      return trimmed.replace(/\s*[×xX]\s*/g, ' × ').replace(/\s+/g, ' ').trim();
    }
    return trimmed;
  }

  // IBS 변환 대상 표기만 보정 (불필요한 숫자코드 변환 방지)
  const isConvertible =
    (/D[:\s]*\d+\.?\d*/i.test(trimmed) && /L[:\s]*\d+\.?\d*/i.test(trimmed)) ||
    /Cuff[:\s]*\d+\.?\d*/i.test(trimmed) ||
    /^C\s*\d+\.?\d*\s*[Φφ]/i.test(trimmed);
  if (!isConvertible) return trimmed;

  const parsed = parseSize(trimmed, manufacturer);
  if (parsed.diameter === null || parsed.length === null) return trimmed;

  const diameter = formatIbsDiameter(parsed.diameter);
  const length = formatIbsLength(parsed.length);
  const cuff = normalizeCuffToken(parsed.cuff);

  if (cuff) {
    return `C${cuff} Φ${diameter} X ${length}`;
  }
  return `Φ${diameter} X ${length}`;
}
