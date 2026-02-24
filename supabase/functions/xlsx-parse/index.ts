import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import XLSX from "npm:xlsx";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface ExcelRow {
  [key: string]: unknown;
}

interface ExcelSheet {
  name: string;
  columns: string[];
  rows: ExcelRow[];
}

interface ExcelData {
  sheets: Record<string, ExcelSheet>;
  activeSheetName: string;
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) {
    return jsonResponse({ error: "Body must be an object" }, 400, corsHeaders);
  }

  const body = parsedBody as Record<string, unknown>;
  const fileBase64 = typeof body.fileBase64 === "string" ? body.fileBase64 : null;
  const filename = typeof body.filename === "string" ? body.filename : "";

  if (!fileBase64) {
    return jsonResponse({ error: "fileBase64 is required" }, 400, corsHeaders);
  }

  let fileBytes: Uint8Array;
  try {
    fileBytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
  } catch {
    return jsonResponse({ error: "fileBase64 디코딩 실패: 유효한 base64 문자열이 아닙니다." }, 400, corsHeaders);
  }

  if (fileBytes.byteLength > MAX_FILE_SIZE) {
    return jsonResponse({ error: "파일 크기가 2MB를 초과합니다." }, 413, corsHeaders);
  }

  try {
    const arrayBuffer = fileBytes.buffer;
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheets: Record<string, ExcelSheet> = {};

    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: "" });

      const range = worksheet["!ref"] ? XLSX.utils.decode_range(worksheet["!ref"]) : null;
      const columns: string[] = [];
      if (range) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_col(C) + "1";
          const cell = worksheet[address];
          if (cell && cell.v !== undefined && cell.v !== null) {
            columns.push(String(cell.v));
          }
        }
      }

      const cleanedRows = rows.map((row) => {
        if (row["사용안함"] !== undefined) {
          const val = row["사용안함"];
          row["사용안함"] = val === true || val === "TRUE" || val === 1 || val === "1" || val === "v";
        }
        return row;
      });

      sheets[sheetName] = { name: sheetName, columns, rows: cleanedRows };
    });

    const result: ExcelData = {
      sheets,
      activeSheetName: workbook.SheetNames[0],
    };

    return jsonResponse(result, 200, corsHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { error: `엑셀 파싱 실패: ${message}`, filename },
      500,
      corsHeaders,
    );
  }
});
