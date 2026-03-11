-- billing_history: 업그레이드 크레딧 컬럼 추가
ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS upgrade_credit_amount    numeric  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upgrade_source_billing_id uuid     REFERENCES billing_history(id) ON DELETE SET NULL;

-- get_billing_history RPC 재생성 (upgrade_credit 컬럼 포함)
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
  upgrade_source_billing_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, hospital_id, hospital_name_snapshot, hospital_id_snapshot,
    phone_last4_snapshot, plan, billing_cycle, amount, is_test_payment,
    payment_method, payment_status, payment_ref, description, created_by,
    created_at, updated_at,
    refund_amount, refunded_at, refund_reason,
    coupon_id, original_amount, discount_amount,
    upgrade_credit_amount, upgrade_source_billing_id
  FROM billing_history
  WHERE hospital_id = p_hospital_id
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_billing_history(uuid) TO authenticated;
