-- Security fix: Restrict SECURITY DEFINER coupon functions to service_role only.
--
-- issue_partner_coupon, redeem_coupon, expire_coupons_batch are all
-- SECURITY DEFINER (run as owner, bypass RLS). Without explicit REVOKE,
-- PostgreSQL grants EXECUTE to PUBLIC by default, allowing any
-- authenticated or anon user to call these functions and bypass RLS
-- on coupon_templates, user_coupons, and coupon_redemptions.
--
-- All three are only called server-side (process_payment_callback,
-- pg_cron, or future Edge Functions), so restrict to service_role.

-- 1) issue_partner_coupon(uuid, uuid, uuid, uuid)
REVOKE ALL ON FUNCTION public.issue_partner_coupon(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_partner_coupon(uuid, uuid, uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.issue_partner_coupon(uuid, uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.issue_partner_coupon(uuid, uuid, uuid, uuid) TO service_role;

-- 2) redeem_coupon(uuid, uuid, uuid, uuid, text, int)
REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, uuid, uuid, uuid, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, uuid, uuid, uuid, text, int) FROM authenticated;
REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, uuid, uuid, uuid, text, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(uuid, uuid, uuid, uuid, text, int) TO service_role;

-- 3) expire_coupons_batch()
REVOKE ALL ON FUNCTION public.expire_coupons_batch() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_coupons_batch() FROM authenticated;
REVOKE ALL ON FUNCTION public.expire_coupons_batch() FROM anon;
GRANT EXECUTE ON FUNCTION public.expire_coupons_batch() TO service_role;
