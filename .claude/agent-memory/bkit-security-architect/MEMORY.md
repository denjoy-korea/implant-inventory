# Security Architect Memory

## Project Overview
- Dental implant inventory SaaS (DenJOY/DentWeb)
- Stack: React + TypeScript + Vite + Supabase + Vercel
- Hospital-level data isolation via RLS

## Key Security Architecture
- Edge Functions use `_shared/cors.ts` with explicit origin allowlist (no wildcards)
- `verify_jwt = false` functions: 19 config.toml entries (see list below)
- All sensitive `verify_jwt=false` functions implement their own JWT auth checks
- Plan limits (maxUsers) enforced server-side in `invite-member` and `accept-invite`
- `maxItems` enforced server-side via `enforce_plan_limits` trigger + `_plan_max_items()`
- Plan limits (retentionMonths, maxBaseStockEdits) enforced client-side only

## Critical Security Gaps (as of 2026-03-12)
- `retentionMonths`: client-only filtering, direct SDK queries can access older records
- `maxBaseStockEdits`: client-only enforcement
- TOCTOU race in accept-invite member count check (low practical risk)

## FIXED by migration 20260312220000
- `process_payment_callback`: REVOKE authenticated + GRANT service_role only
- `process_credit_payment`: REVOKE ALL FROM PUBLIC added
- `execute_downgrade_with_credit`: REVOKE ALL FROM PUBLIC added
- `get_coupon_stats`/`get_redemption_stats`: admin role check + REVOKE FROM PUBLIC
- `admin_enter_user_view`: audit log INSERT into operation_logs

## SECURITY DEFINER Pattern Checklist
- Every SECURITY DEFINER function MUST have: REVOKE ALL FROM PUBLIC + GRANT to specific role
- Good example: `admin_enter_user_view` in 20260227100000 (REVOKE + GRANT authenticated + admin check)
- Bad example (fixed in 20260312220000): `execute_downgrade_with_credit`, `process_credit_payment`

## FIXED Issues
- SECURITY DEFINER coupon functions missing REVOKE/GRANT (migration 20260306250000)
- toss-payment-confirm coupon validation (ownership, applicable_plans, redeem_coupon)
- member_invitations UPDATE USING(true) removed
- anon SELECT on member_invitations removed
- maxItems now has server-side trigger enforcement (was client-only)

## verify_jwt = false Functions (from config.toml grep)
crypto-service, notify-signup, notify-withdrawal, holiday-proxy,
invite-member, accept-invite, verify-invite, submit-contact,
notify-consultation, kick-member, admin-delete-user, get-notion-db-schema,
dentweb-automation, dentweb-upload, toss-payment-confirm, toss-payment-refund,
notify-support-message, notify-hospital-slack

## RLS Hardening
- Migration `20260222190000_rls_security_hardening.sql` fixed critical issues
- profiles master_manage_members restricted to dental_staff role only
- operation_logs INSERT hospital_id ownership check added

## Security Headers (vercel.json)
- HSTS max-age=63072000 includeSubDomains preload
- X-Frame-Options: DENY, nosniff, strict-origin-when-cross-origin referrer
- CSP with TossPayments domains, frame-ancestors 'none'
- Permissions-Policy blocks camera/mic/geolocation
