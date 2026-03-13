-- ────────────────────────────────────────────────────────────────────────────
-- [C-1] process_refund_and_cancel 권한 강화
--   버그: GRANT TO authenticated → PostgREST 직접 호출로 타 병원 플랜 강제 해지 가능
--   수정: service_role 전용으로 변경 (Edge Function adminClient만 호출)
--
-- [C-3] 환불 시 크레딧 비례 복구
--   버그: credit_used_amount가 결제에 사용됐어도 환불 시 영구 소실
--   수정: 일할 잔여 비율로 credit_balance에 복구
--         remaining_ratio = max(0, totalDays - usedDays) / totalDays
--         credit_restore  = round(credit_used_amount × remaining_ratio)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION process_refund_and_cancel(
  p_billing_id    uuid,
  p_hospital_id   uuid,
  p_refund_amount numeric,
  p_refund_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing         RECORD;
  v_rows_updated    integer;
  v_total_days      integer;
  v_used_days       integer;
  v_remaining_ratio numeric;
  v_credit_restore  numeric := 0;
BEGIN
  -- 1. billing_history 조회 (크레딧 복구 계산용 컬럼 포함)
  SELECT id,
         hospital_id,
         payment_status,
         COALESCE(credit_used_amount, 0) AS credit_used_amount,
         billing_cycle,
         created_at
  INTO v_billing
  FROM billing_history
  WHERE id          = p_billing_id
    AND hospital_id = p_hospital_id
    AND payment_status = 'completed';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 2. billing_history 상태 → 'refunded'
  UPDATE billing_history
  SET
    payment_status = 'refunded',
    refund_amount  = p_refund_amount,
    refunded_at    = now(),
    refund_reason  = p_refund_reason,
    updated_at     = now()
  WHERE id = p_billing_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RETURN false;
  END IF;

  -- 3. 병원 플랜 → free (즉시 다운그레이드)
  UPDATE hospitals
  SET
    plan            = 'free',
    billing_cycle   = 'monthly',
    plan_expires_at = NULL,
    updated_at      = now()
  WHERE id = p_hospital_id;

  -- 4. 크레딧 비례 복구 (credit_used_amount > 0인 경우)
  --    월간 30일 / 연간 360일 기준, 잔여일 비율로 복구
  IF v_billing.credit_used_amount > 0 THEN
    v_total_days := CASE
      WHEN v_billing.billing_cycle = 'yearly' THEN 360
      ELSE 30
    END;

    -- 사용 일수: 결제 시점 ~ 현재 (최대 totalDays)
    v_used_days := LEAST(
      v_total_days,
      GREATEST(0, CEIL(
        EXTRACT(EPOCH FROM (now() - v_billing.created_at)) / 86400.0
      ))
    );

    -- 잔여 비율 = (totalDays - usedDays) / totalDays
    v_remaining_ratio := GREATEST(
      0,
      (v_total_days - v_used_days)::numeric / v_total_days
    );

    v_credit_restore := ROUND(v_billing.credit_used_amount * v_remaining_ratio);

    IF v_credit_restore > 0 THEN
      UPDATE hospitals
      SET credit_balance = credit_balance + v_credit_restore
      WHERE id = p_hospital_id;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- [C-1] authenticated 직접 호출 차단, service_role 전용으로 변경
REVOKE EXECUTE ON FUNCTION process_refund_and_cancel(uuid, uuid, numeric, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION process_refund_and_cancel(uuid, uuid, numeric, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION process_refund_and_cancel(uuid, uuid, numeric, text) TO service_role;
