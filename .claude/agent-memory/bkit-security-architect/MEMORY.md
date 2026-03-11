# Security Architect Memory

## Project Overview
- Dental implant inventory SaaS (DenJOY/DentWeb)
- Stack: React + TypeScript + Vite + Supabase + Vercel
- Hospital-level data isolation via RLS

## Key Security Architecture
- Edge Functions use `_shared/cors.ts` with explicit origin allowlist (no wildcards)
- `verify_jwt = false` functions: 12 total (not 4 as CLAUDE.md states)
- All sensitive `verify_jwt=false` functions implement their own JWT auth checks
- Plan limits (maxUsers) enforced server-side only in `invite-member` and `accept-invite`
- Plan limits (maxItems, retentionMonths, maxBaseStockEdits) enforced client-side only

## Known Security Gaps (as of 2026-03-06)
- `maxItems`: No server-side enforcement (INSERT via SDK bypasses UI check)
- `retentionMonths`: Client-only filtering, direct SDK queries can access older records
- PLAN_MAX_USERS duplicated in 2 Edge Functions (sync risk with types/plan.ts)
- TOCTOU race in accept-invite member count check (low practical risk)
- FIXED: SECURITY DEFINER coupon functions missing REVOKE/GRANT (migration 20260306250000)
- FIXED: toss-payment-confirm coupon validation (ownership, applicable_plans, redeem_coupon)

## SECURITY DEFINER Pattern Checklist
- Every SECURITY DEFINER function MUST have: REVOKE ALL FROM PUBLIC + GRANT to specific role
- Good example: `process_payment_callback` in 20260306220000 (service_role only + JWT check)
- Bad example (fixed): `issue_partner_coupon`, `redeem_coupon`, `expire_coupons_batch`

## verify_jwt = false Functions (complete list)
crypto-service, notify-signup, notify-withdrawal, holiday-proxy,
invite-member, accept-invite, verify-invite, submit-contact,
notify-consultation, kick-member, admin-delete-user, get-notion-db-schema

## RLS Hardening
- Migration `20260222190000_rls_security_hardening.sql` fixed critical issues:
  - member_invitations UPDATE USING(true) removed
  - anon SELECT on member_invitations removed
  - profiles master_manage_members restricted to dental_staff role only
  - operation_logs INSERT hospital_id ownership check added

## Security Headers (vercel.json)
- HSTS, X-Frame-Options: DENY, nosniff, CSP with TossPayments domains
- Permissions-Policy blocks camera/mic/geolocation
