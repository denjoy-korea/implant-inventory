-- billing_history: 환불 시 복구된 보유 크레딧 금액 추적
ALTER TABLE public.billing_history
  ADD COLUMN IF NOT EXISTS credit_restore_amount numeric;

COMMENT ON COLUMN public.billing_history.credit_restore_amount IS
  '환불 처리 시 병원 credit_balance로 복구된 보유 크레딧 금액';

-- 기존 환불 건 backfill
WITH refunded_rows AS (
  SELECT
    id,
    CASE
      WHEN COALESCE(credit_used_amount, 0) <= 0 THEN 0
      ELSE ROUND(
        COALESCE(credit_used_amount, 0) * GREATEST(
          0,
          (
            CASE WHEN billing_cycle = 'yearly' THEN 360 ELSE 30 END
            - LEAST(
              CASE WHEN billing_cycle = 'yearly' THEN 360 ELSE 30 END,
              GREATEST(
                0,
                CEIL(
                  EXTRACT(EPOCH FROM (COALESCE(refunded_at, updated_at, created_at) - created_at)) / 86400.0
                )::numeric
              )
            )
          )::numeric / (CASE WHEN billing_cycle = 'yearly' THEN 360 ELSE 30 END)
        )
      )
    END AS restored_credit_amount
  FROM public.billing_history
  WHERE payment_status = 'refunded'
)
UPDATE public.billing_history bh
SET credit_restore_amount = refunded_rows.restored_credit_amount
FROM refunded_rows
WHERE bh.id = refunded_rows.id
  AND bh.credit_restore_amount IS NULL;

DROP FUNCTION IF EXISTS public.get_billing_history(uuid);

CREATE OR REPLACE FUNCTION public.get_billing_history(p_hospital_id uuid)
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
  credit_restore_amount     numeric,
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
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    bh.id, bh.hospital_id, bh.hospital_name_snapshot, bh.hospital_id_snapshot,
    bh.phone_last4_snapshot, bh.plan, bh.billing_cycle, bh.amount, bh.is_test_payment,
    bh.payment_method, bh.payment_status, bh.payment_ref, bh.description, bh.created_by,
    bh.created_at, bh.updated_at,
    bh.refund_amount, bh.credit_restore_amount, bh.refunded_at, bh.refund_reason,
    bh.coupon_id, bh.original_amount, bh.discount_amount,
    bh.upgrade_credit_amount, bh.upgrade_source_billing_id,
    bh.credit_used_amount
  FROM public.billing_history bh
  WHERE bh.hospital_id = p_hospital_id
  ORDER BY bh.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_billing_history(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_refund_and_cancel(
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
  SELECT id,
         hospital_id,
         payment_status,
         COALESCE(credit_used_amount, 0) AS credit_used_amount,
         billing_cycle,
         created_at
  INTO v_billing
  FROM public.billing_history
  WHERE id = p_billing_id
    AND hospital_id = p_hospital_id
    AND payment_status = 'completed';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_billing.credit_used_amount > 0 THEN
    v_total_days := CASE
      WHEN v_billing.billing_cycle = 'yearly' THEN 360
      ELSE 30
    END;

    v_used_days := LEAST(
      v_total_days,
      GREATEST(
        0,
        CEIL(EXTRACT(EPOCH FROM (now() - v_billing.created_at)) / 86400.0)::integer
      )
    );

    v_remaining_ratio := GREATEST(
      0,
      (v_total_days - v_used_days)::numeric / v_total_days
    );

    v_credit_restore := ROUND(v_billing.credit_used_amount * v_remaining_ratio);
  END IF;

  UPDATE public.billing_history
  SET
    payment_status        = 'refunded',
    refund_amount         = p_refund_amount,
    credit_restore_amount = v_credit_restore,
    refunded_at           = now(),
    refund_reason         = p_refund_reason,
    updated_at            = now()
  WHERE id = p_billing_id
    AND hospital_id = p_hospital_id
    AND payment_status = 'completed';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.hospitals
  SET
    plan            = 'free',
    billing_cycle   = 'monthly',
    plan_expires_at = NULL,
    updated_at      = now()
  WHERE id = p_hospital_id;

  IF v_credit_restore > 0 THEN
    UPDATE public.hospitals
    SET credit_balance = COALESCE(credit_balance, 0) + v_credit_restore
    WHERE id = p_hospital_id;
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_refund_and_cancel(uuid, uuid, numeric, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_refund_and_cancel(uuid, uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_refund_and_cancel(uuid, uuid, numeric, text) TO service_role;
