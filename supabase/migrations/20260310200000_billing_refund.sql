-- billing_history: refund 관련 컬럼 추가
ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS refund_amount  numeric,
  ADD COLUMN IF NOT EXISTS refunded_at   timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text;

-- get_billing_history RPC에 refund 컬럼 노출 (기존 뷰/RPC가 *를 쓰면 자동 반영, 명시 컬럼 목록인 경우 아래로 대체)
-- (기존 RPC가 있으면 DROP 후 재생성)
DROP FUNCTION IF EXISTS get_billing_history(uuid);

CREATE OR REPLACE FUNCTION get_billing_history(p_hospital_id uuid)
RETURNS TABLE (
  id                      uuid,
  hospital_id             uuid,
  hospital_name_snapshot  text,
  hospital_id_snapshot    uuid,
  phone_last4_snapshot    text,
  plan                    text,
  billing_cycle           text,
  amount                  numeric,
  is_test_payment         boolean,
  payment_method          text,
  payment_status          text,
  payment_ref             text,
  description             text,
  created_by              uuid,
  created_at              timestamptz,
  updated_at              timestamptz,
  refund_amount           numeric,
  refunded_at             timestamptz,
  refund_reason           text,
  coupon_id               uuid,
  original_amount         numeric,
  discount_amount         numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    hospital_id,
    hospital_name_snapshot,
    hospital_id_snapshot,
    phone_last4_snapshot,
    plan,
    billing_cycle,
    amount,
    is_test_payment,
    payment_method,
    payment_status,
    payment_ref,
    description,
    created_by,
    created_at,
    updated_at,
    refund_amount,
    refunded_at,
    refund_reason,
    coupon_id,
    original_amount,
    discount_amount
  FROM billing_history
  WHERE hospital_id = p_hospital_id
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_billing_history(uuid) TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- process_refund_and_cancel: 환불 처리 + 플랜 free 전환 (atomic)
-- ────────────────────────────────────────────────────────────────
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
  v_rows_updated integer;
BEGIN
  -- 1. billing_history 상태 → 'refunded'
  UPDATE billing_history
  SET
    payment_status = 'refunded',
    refund_amount  = p_refund_amount,
    refunded_at    = now(),
    refund_reason  = p_refund_reason,
    updated_at     = now()
  WHERE id           = p_billing_id
    AND hospital_id  = p_hospital_id
    AND payment_status = 'completed';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RETURN false;
  END IF;

  -- 2. 병원 플랜 → free (즉시 다운그레이드)
  UPDATE hospitals
  SET
    plan            = 'free',
    billing_cycle   = 'monthly',
    plan_expires_at = NULL,
    updated_at      = now()
  WHERE id = p_hospital_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION process_refund_and_cancel(uuid, uuid, numeric, text) TO authenticated;
