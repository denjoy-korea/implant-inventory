/**
 * holiday-proxy — 공공데이터포털 한국천문연구원 특일 정보 API 서버사이드 프록시
 *
 * 브라우저에서 직접 호출 시 CORS 차단 이슈를 우회하기 위해
 * Supabase Edge Function에서 API를 호출하고 결과를 반환합니다.
 *
 * Request : GET /functions/v1/holiday-proxy?year=2025&month=03
 *           (month 생략 시 전체 12개월 요청 후 병합)
 * Response: { dates: string[] }  — YYYY-MM-DD 배열 (중복 제거, 정렬)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const BASE_URL =
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";

/** 공공데이터포털에서 특정 연도·월의 공휴일 locdate 목록을 가져옵니다. */
async function fetchMonth(apiKey: string, year: number, month: number): Promise<string[]> {
  const params = [
    `ServiceKey=${apiKey}`,
    `solYear=${year}`,
    `solMonth=${String(month).padStart(2, "0")}`,
    `numOfRows=50`,
    `_type=json`,
  ].join("&");

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`Holiday API HTTP ${res.status} (${year}-${month})`);
  }

  const json = await res.json();
  const resultCode = json?.response?.header?.resultCode;
  if (resultCode && resultCode !== "00") {
    throw new Error(`Holiday API resultCode ${resultCode} (${year}-${month})`);
  }

  const items = json?.response?.body?.items?.item;
  if (!items) return [];

  const list = Array.isArray(items) ? items : [items];
  return list
    .filter((item: { isHoliday: string }) => item.isHoliday === "Y")
    .map((item: { locdate: number }) => {
      const d = String(item.locdate);
      return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const corsHeaders = getCorsHeaders(req);
    const apiKey = Deno.env.get("HOLIDAY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "HOLIDAY_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const yearStr = url.searchParams.get("year");
    const monthStr = url.searchParams.get("month");

    if (!yearStr) {
      return new Response(
        JSON.stringify({ error: "year parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return new Response(
        JSON.stringify({ error: "Invalid year parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let dates: string[];

    if (monthStr) {
      // 특정 월만 조회
      const month = parseInt(monthStr, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        return new Response(
          JSON.stringify({ error: "Invalid month parameter (1–12)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      dates = await fetchMonth(apiKey, year, month);
    } else {
      // 12개월 전체 병렬 조회
      const monthResults = await Promise.all(
        Array.from({ length: 12 }, (_, i) => fetchMonth(apiKey, year, i + 1))
      );
      dates = [...new Set(monthResults.flat())].sort();
    }

    return new Response(
      JSON.stringify({ dates }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[holiday-proxy] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
