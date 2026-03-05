/**
 * dentweb-upload
 *
 * Dentweb 자동화 클라이언트가 전송한 수술기록 엑셀을 수신하여
 * surgery_records 테이블에 적재한다.
 *
 * Request:
 * - Method: POST
 * - Content-Type: multipart/form-data
 * - Authorization: Bearer <DENTWEB_UPLOAD_TOKEN>
 * - Fields:
 *   - hospital_id (UUID, required)
 *   - file (xlsx/xls, required)
 *
 * Response:
 * - { success: true, inserted, skipped, total_rows, sheet_name, filename }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import XLSX from "npm:xlsx";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ENC_V2_PREFIX = "ENCv2:";
const PBKDF2_SALT_BYTES = new TextEncoder().encode("implant-inventory-pbkdf2-salt-v1");
const PBKDF2_ITERATIONS = 100_000;
const IBS_SWAPPED_BRANDS = new Set(["Magicore", "Magic FC Mini", "Magic FC"]);
const ALLOWED_PLANS = new Set(["plus", "business", "ultimate"]);

let cachedAesKeyPromise: Promise<CryptoKey> | null = null;

type JsonObject = Record<string, unknown>;
type TokenMap = Record<string, string>;

type DbInsertRow = {
  hospital_id: string;
  date: string | null;
  patient_info: string | null;
  patient_info_hash: string | null;
  tooth_number: string | null;
  quantity: number;
  surgery_record: string | null;
  classification: string;
  manufacturer: string | null;
  brand: string | null;
  size: string | null;
  bone_quality: string | null;
  initial_fixation: string | null;
};

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function timingSafeEquals(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i += 1) {
    diff |= aa[i] ^ bb[i];
  }
  return diff === 0;
}

function parseTokenMap(raw: string): TokenMap {
  const value = raw.trim();
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: TokenMap = {};
    for (const [token, hospitalId] of Object.entries(parsed as Record<string, unknown>)) {
      const t = String(token || "").trim();
      const h = String(hospitalId || "").trim();
      if (t && isUuid(h)) result[t] = h;
    }
    return result;
  } catch {
    return {};
  }
}

function resolveHospitalIdByToken(receivedToken: string, tokenMap: TokenMap): string | null {
  for (const [token, hospitalId] of Object.entries(tokenMap)) {
    if (timingSafeEquals(receivedToken, token)) return hospitalId;
  }
  return null;
}

function isLikelyJwt(token: string): boolean {
  return token.split(".").length === 3;
}

function parseJwtPayload(token: string): JsonObject | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = atob(base64 + pad);
    const parsed = JSON.parse(payload) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as JsonObject;
  } catch {
    return null;
  }
}

async function resolveHospitalIdFromJwt(
  supabaseUrl: string,
  anonKey: string,
  adminClient: ReturnType<typeof createClient>,
  token: string,
): Promise<string | null> {
  if (!isLikelyJwt(token)) return null;

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!authRes.ok) return null;

    const jwtPayload = parseJwtPayload(token);
    const userId = String(jwtPayload?.sub ?? "").trim();
    if (!userId) return null;

    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("hospital_id")
      .eq("id", userId)
      .maybeSingle();
    if (error || !profile?.hospital_id) return null;
    return String(profile.hospital_id);
  } catch {
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function getBearerToken(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeDate(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;

  const normalized = raw.replace(/[./]/g, "-").replace(/\s+/g, " ").trim();
  const ymd = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  const dt = new Date(normalized);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const d = dt.getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return null;
}

function normalizeClassification(cls: string): string {
  if (cls === "수술중 FAIL") return "수술중교환";
  if (cls === "FAIL 교환완료") return "교환완료";
  return cls || "식립";
}

function normalizeCellText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isIbsImplantManufacturer(manufacturer?: string): boolean {
  const normalized = String(manufacturer || "")
    .toLowerCase()
    .replace(/[\s\-_]/g, "");
  return normalized === "ibs" || normalized.includes("ibsimplant");
}

function fixIbsImplant(manufacturer: string, brand: string): { manufacturer: string; brand: string } {
  if (IBS_SWAPPED_BRANDS.has(manufacturer) && brand === "IBS Implant") {
    return { manufacturer: "IBS Implant", brand: manufacturer };
  }
  return { manufacturer, brand };
}

function toCanonicalSize(raw: string, manufacturer?: string): string {
  const trimmed = normalizeCellText(raw);
  if (!trimmed) return "";

  if (!isIbsImplantManufacturer(manufacturer)) {
    if (/^[Φφ]/.test(trimmed)) {
      return trimmed.replace(/\s*[×xX]\s*/g, " × ").replace(/\s+/g, " ").trim();
    }
    return trimmed;
  }

  const m = trimmed.match(/D[:\s]*(\d+\.?\d*)\s*L[:\s]*(\d+\.?\d*)/i);
  if (!m) return trimmed;
  const diameter = m[1];
  const length = m[2];
  const cuff = trimmed.match(/Cuff[:\s]*(\d+\.?\d*)/i)?.[1] ?? "";
  if (cuff) return `C${cuff} Φ${diameter} X ${length}`;
  return `Φ${diameter} X ${length}`;
}

function getSizeMatchKey(size: string): string {
  return String(size || "")
    .toLowerCase()
    .replace(/[Φφ]/g, "d")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeToothNumber(value: string): string | null {
  const t = normalizeCellText(value);
  return t ? t : null;
}

function parseQuantity(toothRaw: string, rowQuantity: unknown, hasRecord: boolean): number {
  if (toothRaw) {
    return toothRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length || 1;
  }
  const q = Number(rowQuantity);
  if (Number.isFinite(q) && q > 0) return Math.trunc(q);
  return hasRecord ? 1 : 0;
}

function parseSurgeryFromDescription(descRaw: string): {
  classification: string;
  manufacturer: string;
  brand: string;
  size: string;
  boneQuality: string;
  initialFixation: string;
} {
  const desc = normalizeCellText(descRaw);
  let classification = "식립";
  let manufacturer = "";
  let brand = "";
  let size = "";
  let boneQuality = "";
  let initialFixation = "";

  if (!desc) {
    return { classification, manufacturer, brand, size, boneQuality, initialFixation };
  }

  if (desc.includes("[GBR Only]")) {
    classification = "골이식만";
  } else if (desc.includes("수술중교환_") || desc.includes("수술중FAIL_")) {
    classification = "수술중교환";
  } else if (desc.includes("보험임플란트")) {
    classification = "청구";
  }

  if (classification === "골이식만") {
    const mMatch = desc.match(/\[(.*?)\]/);
    manufacturer = mMatch ? mMatch[1] : "GBR Only";
    const bMatch = desc.match(/\]\s*(G.*?\))/);
    brand = bMatch ? bMatch[1] : "";
    return { classification, manufacturer, brand, size, boneQuality, initialFixation };
  }

  if (!desc.includes("-")) {
    manufacturer = desc
      .replace("보험임플란트", "")
      .replace("수술중교환_", "")
      .replace("수술중FAIL_", "")
      .trim();
    return { classification, manufacturer, brand, size, boneQuality, initialFixation };
  }

  const mainParts = desc.split("-").map((p) => p.trim());
  const rawM = mainParts[0] || "";
  manufacturer = rawM
    .replace("수술중교환_", "")
    .replace("수술중FAIL_", "")
    .replace("보험임플란트", "")
    .trim();
  if (!manufacturer && mainParts.length > 1) manufacturer = mainParts[1];

  const detailsStr = mainParts.slice(1).join("-");
  const slashSegments = detailsStr.split("/").map((s) => s.trim());
  const brandSizeStr = slashSegments[0] || "";
  const sizeIndicatorMatch = brandSizeStr.match(
    /([DdLlMm]\:|[Φφ]|(?:\s|^)[DdLlMm]\s|(?:\s|^)\d)/,
  );

  if (sizeIndicatorMatch && sizeIndicatorMatch.index !== undefined) {
    brand = brandSizeStr.substring(0, sizeIndicatorMatch.index).trim();
    size = brandSizeStr.substring(sizeIndicatorMatch.index).trim();
  } else {
    const fallbackMatch = brandSizeStr.match(/^([a-zA-Z\s\d-]+(?:\s[IVX]+)?)/);
    brand = fallbackMatch ? fallbackMatch[1].trim() : brandSizeStr;
    if (fallbackMatch) size = brandSizeStr.substring(fallbackMatch[0].length).trim();
  }

  if (!manufacturer || manufacturer === "보험임플란트") {
    manufacturer = brand;
  }

  for (let i = 1; i < slashSegments.length; i += 1) {
    const seg = slashSegments[i];
    if (seg.startsWith("골질")) boneQuality = seg.replace("골질", "").trim();
    else if (seg.startsWith("초기고정")) initialFixation = seg.replace("초기고정", "").trim();
  }

  return { classification, manufacturer, brand, size, boneQuality, initialFixation };
}

function getCandidateRows(rows: JsonObject[]): JsonObject[] {
  return rows.filter((row) => {
    const values = Object.values(row);
    const isTotalRow = values.some((v) => String(v).includes("합계"));
    if (isTotalRow) return false;
    const contentCount = values.filter((v) => str(v) !== "").length;
    return contentCount > 1;
  });
}

async function getAesKey(secret: string): Promise<CryptoKey> {
  if (cachedAesKeyPromise) return cachedAesKeyPromise;
  cachedAesKeyPromise = (async () => {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: PBKDF2_SALT_BYTES,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );
  })().catch((err) => {
    cachedAesKeyPromise = null;
    throw err;
  });
  return cachedAesKeyPromise;
}

async function encryptText(text: string, secret: string): Promise<string> {
  if (!text) return "";
  const key = await getAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text),
  );
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), 12);
  return ENC_V2_PREFIX + bytesToBase64(combined);
}

async function hashText(text: string, secret: string): Promise<string> {
  if (!text) return "";
  const salted = `${secret}:${text.trim()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted));
  return bytesToBase64(new Uint8Array(digest));
}

function buildDedupKey(row: {
  date: string | null;
  patient_info_hash: string | null;
  classification: string;
  brand: string | null;
  size: string | null;
  tooth_number: string | null;
}): string {
  return [
    row.date ?? "",
    row.patient_info_hash ?? "",
    row.classification ?? "",
    row.brand ?? "",
    getSizeMatchKey(row.size ?? ""),
    row.tooth_number ?? "",
  ].join("|");
}

async function parseRowsToDb(
  rows: JsonObject[],
  hospitalId: string,
  patientDataKey: string,
): Promise<DbInsertRow[]> {
  const candidates = getCandidateRows(rows);
  const mapped: DbInsertRow[] = [];

  for (const row of candidates) {
    const desc = str(
      row["수술기록"] ??
        row["수술내용"] ??
        row["픽스쳐"] ??
        row["규격"] ??
        row["품명"] ??
        "",
    );
    const toothRaw = str(row["치아번호"]);
    const parsed = parseSurgeryFromDescription(desc);
    const classificationRaw = str(row["구분"]);
    const classification = classificationRaw
      ? normalizeClassification(classificationRaw)
      : parsed.classification;

    let manufacturer = str(row["제조사"]) || parsed.manufacturer;
    let brand = str(row["브랜드"]) || parsed.brand;
    let size = str(
      row["규격(SIZE)"] ??
        row["규격"] ??
        row["사이즈"] ??
        row["Size"] ??
        row["size"] ??
        "",
    ) || parsed.size;

    const fixed = fixIbsImplant(manufacturer, brand);
    manufacturer = fixed.manufacturer;
    brand = fixed.brand;
    size = isIbsImplantManufacturer(manufacturer)
      ? normalizeCellText(size)
      : toCanonicalSize(size, manufacturer);

    const quantity = parseQuantity(toothRaw, row["갯수"] ?? row["수량"], desc.length > 0);
    if (quantity <= 0) continue;

    const patientRaw = str(row["환자정보"] ?? row["환자명"] ?? "");
    const date = normalizeDate(row["날짜"] ?? row["수술일"] ?? row["수술일자"] ?? row["일자"]);

    const boneQuality = str(row["골질"]) || parsed.boneQuality;
    const initialFixation = str(row["초기고정"]) || parsed.initialFixation;

    const [encryptedPatient, patientHash] = await Promise.all([
      patientRaw ? encryptText(patientRaw, patientDataKey) : Promise.resolve(""),
      patientRaw ? hashText(patientRaw, patientDataKey) : Promise.resolve(""),
    ]);

    mapped.push({
      hospital_id: hospitalId,
      date,
      patient_info: encryptedPatient || null,
      patient_info_hash: patientHash || null,
      tooth_number: normalizeToothNumber(toothRaw),
      quantity,
      surgery_record: desc || null,
      classification: normalizeClassification(classification),
      manufacturer: manufacturer || null,
      brand: brand || null,
      size: size || null,
      bone_quality: boneQuality || null,
      initial_fixation: initialFixation || null,
    });
  }

  return mapped;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const expectedToken = (Deno.env.get("DENTWEB_UPLOAD_TOKEN") || "").trim();
  const tokenMap = parseTokenMap(Deno.env.get("DENTWEB_UPLOAD_TOKEN_MAP") || "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const patientDataKey = (Deno.env.get("PATIENT_DATA_KEY") || "").trim();
  if (!supabaseUrl || !serviceRoleKey || !patientDataKey || !supabaseAnonKey) {
    return jsonResponse(
      { success: false, error: "Required env not configured" },
      500,
      corsHeaders,
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const receivedToken = getBearerToken(req);
  const mappedHospitalId = receivedToken
    ? resolveHospitalIdByToken(receivedToken, tokenMap)
    : null;
  const isSingleTokenAuthorized = !!(receivedToken && expectedToken && timingSafeEquals(receivedToken, expectedToken));
  const jwtHospitalId = receivedToken
    ? await resolveHospitalIdFromJwt(supabaseUrl, supabaseAnonKey, adminClient, receivedToken)
    : null;
  const isAuthorized = !!mappedHospitalId || isSingleTokenAuthorized || !!jwtHospitalId;
  if (!isAuthorized) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401, corsHeaders);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonResponse({ success: false, error: "Invalid multipart/form-data" }, 400, corsHeaders);
  }

  const requestedHospitalId = str(formData.get("hospital_id"));
  const hospitalId = mappedHospitalId || jwtHospitalId || requestedHospitalId;
  if (mappedHospitalId && requestedHospitalId && requestedHospitalId !== mappedHospitalId) {
    return jsonResponse(
      { success: false, error: "hospital_id mismatch for token" },
      403,
      corsHeaders,
    );
  }
  if (jwtHospitalId && requestedHospitalId && requestedHospitalId !== jwtHospitalId) {
    return jsonResponse(
      { success: false, error: "hospital_id mismatch for jwt user" },
      403,
      corsHeaders,
    );
  }
  if (!hospitalId || !isUuid(hospitalId)) {
    return jsonResponse({ success: false, error: "hospital_id (UUID) is required" }, 422, corsHeaders);
  }

  let uploadFile = formData.get("file");
  if (!(uploadFile instanceof File)) {
    for (const value of formData.values()) {
      if (value instanceof File) {
        uploadFile = value;
        break;
      }
    }
  }

  if (!(uploadFile instanceof File)) {
    return jsonResponse({ success: false, error: "file field is required" }, 422, corsHeaders);
  }

  if (uploadFile.size <= 0) {
    return jsonResponse({ success: false, error: "empty file" }, 422, corsHeaders);
  }

  if (uploadFile.size > MAX_FILE_SIZE) {
    return jsonResponse(
      { success: false, error: `file too large (max ${MAX_FILE_SIZE} bytes)` },
      413,
      corsHeaders,
    );
  }

  const { data: hospital, error: hospitalError } = await adminClient
    .from("hospitals")
    .select("id, plan")
    .eq("id", hospitalId)
    .maybeSingle();

  if (hospitalError) {
    console.error("[dentweb-upload] hospital lookup failed:", hospitalError);
    return jsonResponse({ success: false, error: "hospital lookup failed" }, 500, corsHeaders);
  }

  if (!hospital) {
    return jsonResponse({ success: false, error: "hospital not found" }, 404, corsHeaders);
  }

  if (!ALLOWED_PLANS.has(String(hospital.plan ?? ""))) {
    return jsonResponse(
      { success: false, error: "plan_not_allowed", message: "Plus 이상 플랜에서만 자동 업로드를 사용할 수 있습니다." },
      403,
      corsHeaders,
    );
  }

  const fileBuffer = await uploadFile.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: "array", cellDates: false });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return jsonResponse({ success: false, error: `xlsx parse failed: ${detail}` }, 400, corsHeaders);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return jsonResponse({ success: false, error: "sheet not found" }, 422, corsHeaders);
  }

  const targetSheetName = workbook.SheetNames.includes("수술기록지")
    ? "수술기록지"
    : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];
  const rawRows = XLSX.utils.sheet_to_json<JsonObject>(worksheet, { defval: "", raw: false });

  const parsedRows = await parseRowsToDb(rawRows, hospitalId, patientDataKey);
  if (parsedRows.length === 0) {
    return jsonResponse(
      {
        success: true,
        status: "no_data",
        inserted: 0,
        skipped: 0,
        total_rows: rawRows.length,
        sheet_name: targetSheetName,
        filename: uploadFile.name,
      },
      200,
      corsHeaders,
    );
  }

  const datedRows = parsedRows.filter((r) => !!r.date);
  const nullDateRows = parsedRows.filter((r) => !r.date);
  let rowsToInsert: DbInsertRow[] = [];
  let skipped = 0;

  if (datedRows.length > 0) {
    const dates = datedRows.map((r) => r.date as string);
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));

    const { data: existingRows, error: existingError } = await adminClient
      .from("surgery_records")
      .select("date, patient_info_hash, classification, brand, size, tooth_number")
      .eq("hospital_id", hospitalId)
      .gte("date", minDate)
      .lte("date", maxDate);

    if (existingError) {
      console.error("[dentweb-upload] existing records lookup failed:", existingError);
      return jsonResponse({ success: false, error: "dedup lookup failed" }, 500, corsHeaders);
    }

    const existingKeys = new Set(
      (existingRows ?? []).map((r) =>
        buildDedupKey({
          date: str(r.date) || null,
          patient_info_hash: str(r.patient_info_hash) || null,
          classification: str(r.classification),
          brand: str(r.brand) || null,
          size: str(r.size) || null,
          tooth_number: str(r.tooth_number) || null,
        })
      ),
    );

    const filteredDatedRows = datedRows.filter((row) => !existingKeys.has(buildDedupKey(row)));
    skipped = datedRows.length - filteredDatedRows.length;
    rowsToInsert = [...filteredDatedRows, ...nullDateRows];
  } else {
    rowsToInsert = [...nullDateRows];
  }

  if (rowsToInsert.length === 0) {
    return jsonResponse(
      {
        success: true,
        status: "duplicated",
        inserted: 0,
        skipped,
        total_rows: rawRows.length,
        sheet_name: targetSheetName,
        filename: uploadFile.name,
      },
      200,
      corsHeaders,
    );
  }

  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
    const chunk = rowsToInsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await adminClient
      .from("surgery_records")
      .insert(chunk)
      .select("id");

    if (error) {
      console.error("[dentweb-upload] insert failed:", error);
      return jsonResponse(
        {
          success: false,
          error: "insert failed",
          inserted,
          skipped,
        },
        500,
        corsHeaders,
      );
    }

    inserted += (data ?? []).length;
  }

  return jsonResponse(
    {
      success: true,
      status: "ok",
      inserted,
      skipped,
      total_rows: rawRows.length,
      sheet_name: targetSheetName,
      filename: uploadFile.name,
    },
    200,
    corsHeaders,
  );
});
