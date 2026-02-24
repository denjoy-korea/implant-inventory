import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import XLSX from "npm:xlsx";

interface ActiveSheet {
  name: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

interface XlsxGeneratePayload {
  activeSheet: ActiveSheet;
  selectedIndices: number[];
  fileName?: string;
}

function jsonError(message: string, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
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
    return jsonError("Method not allowed", 405, corsHeaders);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400, corsHeaders);
  }

  // supabase.functions.invoke는 body를 이중 직렬화할 수 있음
  let payload: XlsxGeneratePayload | null = null;
  if (typeof parsedBody === "string") {
    try {
      payload = JSON.parse(parsedBody) as XlsxGeneratePayload;
    } catch {
      return jsonError("Body string is not valid JSON", 400, corsHeaders);
    }
  } else if (typeof parsedBody === "object" && parsedBody !== null) {
    payload = parsedBody as XlsxGeneratePayload;
  }

  if (!payload) {
    return jsonError("Body must be an object", 400, corsHeaders);
  }

  const { activeSheet, selectedIndices, fileName } = payload;

  if (!activeSheet || typeof activeSheet !== "object") {
    return jsonError("activeSheet is required", 400, corsHeaders);
  }
  if (!Array.isArray(activeSheet.rows)) {
    return jsonError("activeSheet.rows must be an array", 400, corsHeaders);
  }
  if (!Array.isArray(activeSheet.columns)) {
    return jsonError("activeSheet.columns must be an array", 400, corsHeaders);
  }
  if (!Array.isArray(selectedIndices)) {
    return jsonError("selectedIndices must be an array", 400, corsHeaders);
  }

  // Set<number>로 복원 (클라이언트에서 JSON 직렬화 시 number[]로 전송됨)
  const selectedSet = new Set<number>(selectedIndices);

  // 사용안함이 true인 행은 선택되더라도 제외
  const processedRows = activeSheet.rows.filter((row, index) => {
    return selectedSet.has(index) && row["사용안함"] !== true;
  });

  const worksheet = XLSX.utils.json_to_sheet(processedRows, {
    header: activeSheet.columns,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, activeSheet.name || "Sheet1");

  // XLSX.write(buffer) 사용 — Deno 환경은 파일 시스템 쓰기 불가이므로 XLSX.writeFile 사용 금지
  const buffer: Uint8Array = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  const outputFileName = (typeof fileName === "string" && fileName.trim())
    ? fileName.trim()
    : "export.xlsx";

  return new Response(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${outputFileName}"`,
    },
  });
});
