-- Phase 2: coupon_templates, user_coupons, coupon_redemptions + functions
-- Applied via Supabase MCP: create_coupon_tables + extend_verify_and_trigger_for_coupons_v2

-- See design doc: docs/02-design/features/code-coupon-system.design.md
-- Tables: coupon_templates, user_coupons, coupon_redemptions
-- Functions: issue_partner_coupon, redeem_coupon
-- Modified: verify_beta_invite_code (code_type return), handle_new_user (coupon auto-issue)
