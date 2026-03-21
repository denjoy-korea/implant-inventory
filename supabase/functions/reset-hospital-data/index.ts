/**
 * reset-hospital-data
 *
 * admin_reset_hospital_data RPC를 service_role로 안전하게 래핑.
 * - immediate: admin 역할 확인 후 즉시 초기화
 * - scheduled: 병원 구성원 + 예약 기한 도래 확인 후 초기화
 *
 * 클라이언트가 직접 RPC를 호출하지 않도록
 * GRANT는 service_role 전용으로 제한 (migration 20260321130000 참조)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, createAdminClient } from "../_shared/authUtils.ts";
import { jsonOk, jsonError } from "../_shared/responseUtils.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;
    const caller = auth.user;

    const { hospitalId, requestId, mode } = await req.json();
    if (!hospitalId || !requestId || !mode) {
      return jsonError("hospitalId, requestId, mode는 필수입니다.", 400, corsHeaders);
    }

    const adminClient = createAdminClient();

    if (mode === "immediate") {
      // admin 역할 확인
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();

      if (callerProfile?.role !== "admin") {
        return jsonError("시스템 운영자만 즉시 초기화를 승인할 수 있습니다.", 403, corsHeaders);
      }
    } else if (mode === "scheduled") {
      // 본인 병원 구성원인지 확인
      const { data: profile } = await adminClient
        .from("profiles")
        .select("hospital_id")
        .eq("id", caller.id)
        .single();

      if (profile?.hospital_id !== hospitalId) {
        return jsonError("해당 병원의 구성원이 아닙니다.", 403, corsHeaders);
      }

      // 예약 요청 존재 + 기한 도래 확인
      const { data: resetReq } = await adminClient
        .from("data_reset_requests")
        .select("scheduled_at, status")
        .eq("id", requestId)
        .eq("hospital_id", hospitalId)
        .single();

      if (!resetReq || resetReq.status !== "scheduled" || !resetReq.scheduled_at) {
        return jsonError("유효한 예약 초기화 요청이 없습니다.", 400, corsHeaders);
      }

      if (new Date(resetReq.scheduled_at).getTime() > Date.now()) {
        return jsonError("아직 예약 시간이 도래하지 않았습니다.", 400, corsHeaders);
      }
    } else {
      return jsonError("mode는 immediate 또는 scheduled여야 합니다.", 400, corsHeaders);
    }

    // service_role 클라이언트로 RPC 호출 (GRANT service_role 전용)
    const { error: rpcError } = await adminClient.rpc("admin_reset_hospital_data", {
      p_hospital_id: hospitalId,
    });

    if (rpcError) {
      console.error("[reset-hospital-data] RPC failed:", rpcError);
      return jsonError("데이터 초기화에 실패했습니다.", 500, corsHeaders);
    }

    // 요청 상태 업데이트
    const updatePayload: Record<string, string> = {
      status: "completed",
      completed_at: new Date().toISOString(),
    };
    if (mode === "immediate") {
      updatePayload.approved_by = caller.id;
      updatePayload.approved_at = new Date().toISOString();
    }

    await adminClient
      .from("data_reset_requests")
      .update(updatePayload)
      .eq("id", requestId);

    // 신청자 프로필 일시정지
    const { data: resetReqData } = await adminClient
      .from("data_reset_requests")
      .select("requested_by")
      .eq("id", requestId)
      .single();

    if (resetReqData?.requested_by) {
      await adminClient
        .from("profiles")
        .update({ status: "paused" })
        .eq("id", resetReqData.requested_by);
    }

    return jsonOk({ success: true }, corsHeaders);
  } catch (err) {
    console.error("[reset-hospital-data] error:", err);
    return jsonError("서버 오류가 발생했습니다.", 500, corsHeaders);
  }
});
