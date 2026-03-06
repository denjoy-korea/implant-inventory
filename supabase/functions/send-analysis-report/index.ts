import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getSlackWebhookUrl } from "../_shared/slackUtils.ts";

// ── 리포트 텍스트 파서 ──────────────────────────────────────────────
interface DiagItem { status: "good" | "warning" | "critical"; category: string; subtitle: string; score: string; detail: string; }
interface ParsedReport {
  score: string; grade: string; gradeText: string;
  diagnostics: DiagItem[];
  matching: { matched: string; fixture: string; surgery: string; unmatched: string };
  usage: { total: string; period: string; topItems: { name: string; count: string }[] };
  recommendations: string[];
}

function parseReport(text: string): ParsedReport {
  const lines = text.split("\n");
  const result: ParsedReport = {
    score: "", grade: "", gradeText: "",
    diagnostics: [],
    matching: { matched: "", fixture: "", surgery: "", unmatched: "" },
    usage: { total: "", period: "", topItems: [] },
    recommendations: [],
  };

  let section = "";
  let lastDiag: DiagItem | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("═══") || line.startsWith("─────") || line === "DenJOY 무료 데이터 품질 진단") continue;

    // 섹션 헤더
    if (line.startsWith("──") && line.endsWith("──")) {
      section = line.replace(/──/g, "").trim();
      lastDiag = null;
      continue;
    }

    // 종합 점수
    if (line.startsWith("종합 점수:")) {
      const m = line.match(/(\d+)\/100 \((\S+)등급\)/);
      if (m) { result.score = m[1]; result.grade = m[2]; }
      continue;
    }
    if (line.startsWith("평가:")) { result.gradeText = line.replace("평가:", "").trim(); continue; }

    // 진단 항목
    if (section.includes("진단")) {
      if (line.startsWith("[양호]") || line.startsWith("[주의]") || line.startsWith("[위험]")) {
        const status = line.startsWith("[양호]") ? "good" : line.startsWith("[주의]") ? "warning" : "critical";
        const content = line.replace(/^\[.*?\]/, "").trim();
        const colonIdx = content.indexOf(":");
        const parenIdx = content.lastIndexOf("(");
        const category = colonIdx > -1 ? content.substring(0, colonIdx).trim() : content;
        const subtitle = colonIdx > -1 && parenIdx > colonIdx ? content.substring(colonIdx + 1, parenIdx).trim() : "";
        const score = parenIdx > -1 ? content.substring(parenIdx + 1).replace(")", "").replace("점", "").trim() : "";
        lastDiag = { status, category, subtitle, score, detail: "" };
        result.diagnostics.push(lastDiag);
      } else if (lastDiag && line.length > 0) {
        lastDiag.detail = line;
      }
    }

    // 매칭 분석
    if (section.includes("매칭")) {
      if (line.startsWith("매칭:")) {
        const m = line.match(/(\d+)건 \/ 재고 (\d+)건 \/ 수술기록 (\d+)건/);
        if (m) { result.matching.matched = m[1]; result.matching.fixture = m[2]; result.matching.surgery = m[3]; }
      }
      if (line.startsWith("불일치:")) { result.matching.unmatched = line.replace("불일치:", "").trim().replace("건", ""); }
    }

    // 사용 패턴
    if (section.includes("사용 패턴")) {
      if (line.startsWith("총 수술:")) {
        const m = line.match(/(\d+)건 \((.+?),/);
        if (m) { result.usage.total = m[1]; result.usage.period = m[2]; }
      }
      if (line.startsWith("-") || line.startsWith("–")) {
        const m = line.replace(/^[-–]\s*/, "").match(/^(.+):\s*(\d+)건/);
        if (m) result.usage.topItems.push({ name: m[1].trim(), count: m[2] });
      }
    }

    // 개선 권장사항
    if (section.includes("개선") || section.includes("권장")) {
      const m = line.match(/^\d+\.\s+(.+)/);
      if (m) result.recommendations.push(m[1]);
    }
  }

  return result;
}

// ── HTML 이메일 생성 ─────────────────────────────────────────────────
function buildHtml(parsed: ParsedReport, hospitalName: string | null, isDetailed: boolean): string {
  const gradeColors: Record<string, { bg: string; border: string; text: string; light: string }> = {
    A: { bg: "#10b981", border: "#059669", text: "#065f46", light: "#ecfdf5" },
    B: { bg: "#f59e0b", border: "#d97706", text: "#78350f", light: "#fffbeb" },
    C: { bg: "#f97316", border: "#ea580c", text: "#7c2d12", light: "#fff7ed" },
    D: { bg: "#f43f5e", border: "#e11d48", text: "#881337", light: "#fff1f2" },
  };
  const gc = gradeColors[parsed.grade] || gradeColors.B;

  const statusStyle = {
    good:     { bg: "#ecfdf5", border: "#a7f3d0", dot: "#10b981", label: "양호", labelBg: "#d1fae5", labelText: "#065f46" },
    warning:  { bg: "#fffbeb", border: "#fcd34d", dot: "#f59e0b", label: "주의", labelBg: "#fef3c7", labelText: "#78350f" },
    critical: { bg: "#fff1f2", border: "#fda4af", dot: "#f43f5e", label: "위험", labelBg: "#ffe4e6", labelText: "#881337" },
  };

  const diagCards = parsed.diagnostics.map(d => {
    const s = statusStyle[d.status];
    return `
    <tr><td style="padding:0 0 8px">
      <div style="background:${s.bg};border:1px solid ${s.border};border-radius:10px;padding:14px 16px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="display:inline-block;margin-top:1px;width:8px;height:8px;border-radius:50%;background:${s.dot};flex-shrink:0;margin-top:5px"></span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="background:${s.labelBg};color:${s.labelText};font-size:10px;font-weight:800;padding:2px 7px;border-radius:20px;letter-spacing:0.5px">${s.label}</span>
              <span style="font-size:13px;font-weight:700;color:#1e293b">${d.category}</span>
              ${d.score ? `<span style="margin-left:auto;font-size:11px;font-weight:700;color:#64748b">${d.score}점</span>` : ""}
            </div>
            ${d.subtitle ? `<p style="margin:0 0 4px;font-size:12px;color:#475569;font-weight:600">${d.subtitle}</p>` : ""}
            ${d.detail ? `<p style="margin:0;font-size:12px;color:#64748b;line-height:1.6">${d.detail}</p>` : ""}
          </div>
        </div>
      </div>
    </td></tr>`;
  }).join("");

  const matchingCards = `
  <tr><td style="padding:0 0 16px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:33%;padding:0 4px 0 0">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center">
            <p style="margin:0 0 4px;font-size:22px;font-weight:900;color:#1e293b">${parsed.matching.matched}</p>
            <p style="margin:0;font-size:11px;color:#64748b;font-weight:600">매칭 건수</p>
          </div>
        </td>
        <td style="width:33%;padding:0 2px">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center">
            <p style="margin:0 0 4px;font-size:22px;font-weight:900;color:#1e293b">${parsed.matching.fixture}</p>
            <p style="margin:0;font-size:11px;color:#64748b;font-weight:600">재고 품목</p>
          </div>
        </td>
        <td style="width:33%;padding:0 0 0 4px">
          <div style="background:${parsed.matching.unmatched !== "0" ? "#fff7ed" : "#f8fafc"};border:1px solid ${parsed.matching.unmatched !== "0" ? "#fed7aa" : "#e2e8f0"};border-radius:10px;padding:14px;text-align:center">
            <p style="margin:0 0 4px;font-size:22px;font-weight:900;color:${parsed.matching.unmatched !== "0" ? "#c2410c" : "#1e293b"}">${parsed.matching.unmatched}</p>
            <p style="margin:0;font-size:11px;color:#64748b;font-weight:600">불일치</p>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>`;

  const topItems = parsed.usage.topItems.slice(0, 5).map((item, i) => {
    const maxCount = parsed.usage.topItems[0]?.count ? parseInt(parsed.usage.topItems[0].count) : 1;
    const pct = Math.max(15, Math.round((parseInt(item.count) / maxCount) * 100));
    const rankColors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c084fc", "#e879f9"];
    return `
    <tr><td style="padding:0 0 8px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:20px;height:20px;border-radius:50%;background:${rankColors[i]};color:#fff;font-size:10px;font-weight:900;text-align:center;line-height:20px;flex-shrink:0">${i + 1}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;color:#334155;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px">${item.name}</span>
            <span style="font-size:12px;font-weight:800;color:#1e293b;margin-left:8px;flex-shrink:0">${item.count}건</span>
          </div>
          <div style="background:#e2e8f0;border-radius:4px;height:5px;overflow:hidden">
            <div style="background:${rankColors[i]};height:5px;width:${pct}%;border-radius:4px"></div>
          </div>
        </div>
      </div>
    </td></tr>`;
  }).join("");

  const recItems = parsed.recommendations.map((rec, i) => `
    <tr><td style="padding:0 0 8px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <span style="width:22px;height:22px;border-radius:50%;background:#6366f1;color:#fff;font-size:11px;font-weight:900;text-align:center;line-height:22px;flex-shrink:0">${i + 1}</span>
        <p style="margin:0;font-size:13px;color:#334155;line-height:1.6;padding-top:2px">${rec}</p>
      </div>
    </td></tr>`).join("");

  const detailedBanner = isDetailed ? `
  <tr><td style="padding:0 32px 0">
    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:18px 20px;margin-bottom:4px">
      <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#4338ca">📋 상세 분석 요청이 접수되었습니다</p>
      <p style="margin:0;font-size:13px;color:#4f46e5;line-height:1.6">담당자가 검토 후 영업일 기준 1~2일 이내로 연락드리겠습니다.</p>
    </div>
  </td></tr>` : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DenJOY 데이터 품질 진단 리포트</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo',sans-serif;-webkit-font-smoothing:antialiased">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10)">

  <!-- 헤더 -->
  <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 32px 28px;text-align:center">
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">DenJOY Analytics</p>
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px">임플란트 재고 데이터 품질 진단</h1>
    ${hospitalName ? `<p style="margin:10px 0 0;color:rgba(255,255,255,0.75);font-size:13px;font-weight:600">${hospitalName}</p>` : ""}
  </td></tr>

  <!-- 점수 배지 -->
  <tr><td style="padding:32px 32px 24px;text-align:center;background:${gc.light};border-bottom:1px solid ${gc.border}20">
    <div style="display:inline-block;width:88px;height:88px;border-radius:50%;background:#ffffff;border:3px solid ${gc.bg};box-shadow:0 4px 16px ${gc.bg}40;line-height:82px;margin-bottom:12px">
      <span style="font-size:38px;font-weight:900;color:${gc.bg}">${parsed.grade}</span>
    </div>
    <p style="margin:0 0 4px;font-size:36px;font-weight:900;color:${gc.text}">${parsed.score}점</p>
    <p style="margin:0;font-size:13px;font-weight:600;color:${gc.bg}">${parsed.gradeText}</p>
  </td></tr>

  ${detailedBanner}

  <!-- 진단 항목 -->
  <tr><td style="padding:28px 32px 4px">
    <p style="margin:0 0 14px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px">진단 항목</p>
    <table width="100%" cellpadding="0" cellspacing="0">${diagCards}</table>
  </td></tr>

  <!-- 매칭 분석 -->
  <tr><td style="padding:20px 32px 4px">
    <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px">매칭 분석</p>
    <table width="100%" cellpadding="0" cellspacing="0">${matchingCards}</table>
  </td></tr>

  <!-- 사용 패턴 -->
  ${parsed.usage.topItems.length > 0 ? `
  <tr><td style="padding:20px 32px 4px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px">사용 패턴</p>
    <p style="margin:0 0 14px;font-size:12px;color:#64748b">총 수술 <strong style="color:#1e293b">${parsed.usage.total}건</strong> · ${parsed.usage.period}</p>
    <table width="100%" cellpadding="0" cellspacing="0">${topItems}</table>
  </td></tr>` : ""}

  <!-- 개선 권장사항 -->
  ${parsed.recommendations.length > 0 ? `
  <tr><td style="padding:20px 32px 28px">
    <p style="margin:0 0 14px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px">개선 권장사항</p>
    <table width="100%" cellpadding="0" cellspacing="0">${recItems}</table>
  </td></tr>` : ""}

  <!-- CTA -->
  <tr><td style="padding:0 32px 32px;text-align:center">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px">
      <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.6">더 정확한 분석과 체계적인 재고 관리를 원하신다면<br>DenJOY 정식 서비스를 이용해보세요.</p>
      <a href="https://inventory.denjoy.info/#/pricing" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:50px;text-decoration:none;letter-spacing:0.3px">DenJOY 시작하기 →</a>
    </div>
  </td></tr>

  <!-- 푸터 -->
  <tr><td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#94a3b8">DenJOY · 임플란트 재고 관리 SaaS</p>
    <p style="margin:0;font-size:11px;color:#cbd5e1">이 메일은 denjoy.info 분석 요청에 의해 자동 발송되었습니다.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

// ── 메인 핸들러 ──────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const corsHeaders = getCorsHeaders(req);

    // Rate limit: 5 requests per minute per IP
    const rateLimited = checkRateLimit(req, corsHeaders, 5, 60_000);
    if (rateLimited) return rateLimited;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { email, grade, score, reportText, isDetailed, hospitalName, region, contact } = await req.json();
    if (!email || !reportText) {
      return new Response(JSON.stringify({ error: "email, reportText는 필수입니다." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "유효하지 않은 이메일 형식입니다." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. DB 저장
    const { error: dbError } = await supabase.from("analysis_leads").insert({
      email, type: isDetailed ? "detailed_analysis" : "report_only",
      hospital_name: hospitalName || null, region: region || null,
      contact: contact || null, score, grade, report_summary: reportText,
    });
    if (dbError) console.error("[send-analysis-report] DB error:", dbError);

    // 2. 슬랙 알림 (실패해도 계속 진행)
    const webhookUrl = await getSlackWebhookUrl("분석알림");
    if (webhookUrl) {
      const now = new Date().toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul", year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit",
      });
      const slackBody = {
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: isDetailed ? "📊 상세 분석 요청이 접수되었습니다!" : "📊 무료 분석 결과가 제출되었습니다!" },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*이메일*\n${email || "—"}` },
              { type: "mrkdwn", text: `*점수*\n${grade}등급 ${score}점` },
              { type: "mrkdwn", text: `*병원명*\n${hospitalName || "—"}` },
              { type: "mrkdwn", text: `*지역*\n${region || "—"}` },
              { type: "mrkdwn", text: `*연락처*\n${contact || "—"}` },
              { type: "mrkdwn", text: `*유형*\n${isDetailed ? "🔍 상세 분석 요청" : "📋 리포트만"}` },
            ],
          },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: `⏰ ${now} (KST)` }],
          },
        ],
      };
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackBody),
      }).catch(() => {});
    }

    // 3. 이메일 발송
    if (!resendApiKey) return new Response(JSON.stringify({ success: true, email_sent: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const parsed = parseReport(reportText);
    const htmlBody = buildHtml(parsed, hospitalName || null, !!isDetailed);
    const subject = isDetailed ? `[DenJOY] 상세 분석 요청이 접수되었습니다` : `[DenJOY] 데이터 품질 진단 결과 — ${grade}등급 ${score}점`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "DenJOY <noreply@denjoy.info>", to: [email], subject, html: htmlBody }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("[send-analysis-report] Resend error:", JSON.stringify(emailData));
      return new Response(JSON.stringify({ success: true, email_sent: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, email_sent: true, id: emailData.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-analysis-report] error:", err);
    return new Response(JSON.stringify({ error: "서버 오류" }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
