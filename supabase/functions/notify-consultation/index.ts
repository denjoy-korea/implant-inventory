import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const TIME_SLOT_KO: Record<string, string> = {
  morning: "오전 (9시–12시)",
  afternoon: "오후 (13시–17시)",
  evening: "저녁 (17시–19시)",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const corsHeaders = getCorsHeaders(req);

    const notionToken = Deno.env.get("NOTION_API_TOKEN");
    const dbId = Deno.env.get("NOTION_CONSULTATION_DB_ID");

    if (!notionToken || !dbId) {
      console.error("[notify-consultation] NOTION_API_TOKEN or NOTION_CONSULTATION_DB_ID not configured");
      return new Response(JSON.stringify({ success: false, reason: "not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      name,
      email,
      hospital_name,
      region,
      contact,
      preferred_date,
      preferred_time_slot,
      notes,
    } = await req.json();

    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Notion 페이지 properties 구성
    // ⚠️ 노션 DB의 컬럼명과 반드시 일치해야 합니다
    const properties: Record<string, unknown> = {
      "이름": {
        title: [{ text: { content: name || "" } }],
      },
      "병원명": {
        rich_text: [{ text: { content: hospital_name || "" } }],
      },
      "이메일": {
        email: email || null,
      },
      "연락처": {
        phone_number: contact || null,
      },
      "지역": {
        rich_text: [{ text: { content: region || "" } }],
      },
      "상태": {
        select: { name: "접수됨" },
      },
      "신청 일시": {
        date: { start: new Date().toISOString() },
      },
    };

    // 선호 날짜 (있을 때만)
    if (preferred_date) {
      properties["선호 날짜"] = { date: { start: preferred_date } };
    }

    // 선호 시간대 (있을 때만)
    if (preferred_time_slot) {
      properties["선호 시간대"] = {
        select: { name: TIME_SLOT_KO[preferred_time_slot] ?? preferred_time_slot },
      };
    }

    // 추가 요청 (있을 때만)
    if (notes) {
      properties["추가 요청"] = {
        rich_text: [{ text: { content: notes.slice(0, 2000) } }],
      };
    }

    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties,
      }),
    });

    if (!notionRes.ok) {
      const text = await notionRes.text();
      console.error("[notify-consultation] Notion API failed:", notionRes.status, text);
      // 실패해도 200 반환 — 상담 신청 흐름에 영향 없음
      return new Response(JSON.stringify({ success: false, reason: "notion_api_error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[notify-consultation] Notion row created — ${hospital_name} / ${name} / ${now} KST`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-consultation] error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
