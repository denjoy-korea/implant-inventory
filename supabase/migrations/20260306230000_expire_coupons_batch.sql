-- Phase 4-1: Auto-expire coupons batch function + pg_cron daily schedule

CREATE OR REPLACE FUNCTION expire_coupons_batch()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_coupons
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RAISE LOG '[expire_coupons_batch] %건 쿠폰 만료 처리', v_count;
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION expire_coupons_batch() IS 'Batch-expire active coupons past their expires_at. Run via pg_cron daily.';

-- pg_cron: daily 00:30 UTC (KST 09:30)
SELECT cron.schedule(
  'expire-coupons-daily',
  '30 0 * * *',
  $$SELECT expire_coupons_batch()$$
);
