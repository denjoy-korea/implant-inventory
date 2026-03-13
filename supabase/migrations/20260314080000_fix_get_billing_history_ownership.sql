-- ────────────────────────────────────────────────────────────────────────────
-- [LOW] get_billing_history — 소유권 검증 추가
--
-- 문제: SECURITY DEFINER 함수가 p_hospital_id만 필터링하고 호출자 소유권 미검증
--       → 인증된 사용자라면 타 병원 결제 내역을 임의로 조회 가능
-- 수정: 함수 시작 시 _can_manage_hospital() 소유권 검사 추가
--       미소유 병원 요청 시 빈 결과 반환 (에러 대신 silent)
-- ────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_billing_history(uuid);

CREATE OR REPLACE FUNCTION get_billing_history(p_hospital_id uuid)
RETURNS TABLE (
  id                        uuid,
  hospital_id               uuid,
  hospital_name_snapshot    text,
  hospital_id_snapshot      uuid,
  phone_last4_snapshot      text,
  plan                      text,
  billing_cycle             text,
  amount                    numeric,
  is_test_payment           boolean,
  payment_method            text,
  payment_status            text,
  payment_ref               text,
  description               text,
  created_by                uuid,
  created_at                timestamptz,
  updated_at                timestamptz,
  refund_amount             numeric,
  refunded_at               timestamptz,
  refund_reason             text,
  coupon_id                 uuid,
  original_amount           numeric,
  discount_amount           numeric,
  upgrade_credit_amount     numeric,
  upgrade_source_billing_id uuid,
  credit_used_amount        numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- [LOW] 소유권 검증: 호출자가 해당 병원을 관리할 수 있어야만 결제 내역 반환
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN; -- 빈 결과셋 반환
  END IF;

  RETURN QUERY
  SELECT
    bh.id, bh.hospital_id, bh.hospital_name_snapshot, bh.hospital_id_snapshot,
    bh.phone_last4_snapshot, bh.plan, bh.billing_cycle, bh.amount, bh.is_test_payment,
    bh.payment_method, bh.payment_status, bh.payment_ref, bh.description, bh.created_by,
    bh.created_at, bh.updated_at,
    bh.refund_amount, bh.refunded_at, bh.refund_reason,
    bh.coupon_id, bh.original_amount, bh.discount_amount,
    bh.upgrade_credit_amount, bh.upgrade_source_billing_id,
    bh.credit_used_amount
  FROM billing_history bh
  WHERE bh.hospital_id = p_hospital_id
  ORDER BY bh.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_billing_history(uuid) TO authenticated;
