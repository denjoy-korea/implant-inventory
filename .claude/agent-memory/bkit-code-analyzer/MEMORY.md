# Code Analyzer Memory

## Project Overview
- Dental implant inventory SaaS: React + TypeScript + Vite + Tailwind + Supabase
- Source files at project root (NOT under `src/`)
- Key paths: `components/`, `services/`, `hooks/`, `utils/`, `supabase/functions/`

## Key Findings (2026-03-06)

### Resolved (from 2026-03-05)
- **Payment amount now server-validated**: toss-payment-confirm Edge Function computes canonical amount from plan+cycle, rejects mismatch
- **process_payment_callback**: confirmed service_role GRANT in migration 20260305010000 + 20260306220000
- **process_payment_callback FOR UPDATE**: added in 20260311110000 (billing_history row locked)

### Critical Issues (2026-03-11 Credit/Payment Audit)
- **process_credit_payment RPC MISSING**: called at tossPaymentService.ts:256 but no SQL definition exists. 0-won credit payments always fail.
- **Renewal stacking across plan tiers**: process_payment_callback stacks expiry on upgrade (Basic 25d remaining + Plus 30d = 55d). Must check v_billing.plan vs current plan.
- **execute_downgrade_with_credit GRANT to authenticated**: any user can downgrade any hospital. No auth.uid() ownership check inside function.
- **execute_downgrade_with_credit no downgrade validation**: p_to_plan not checked against current plan. Can "downgrade" to higher plan for free.
- **SQL hardcoded VAT prices**: 29700/64900/141900 etc. in 5 migration files must stay in sync with types/plan.ts PLAN_PRICING. No lint rule exists.
- **credit_balance concurrency**: Edge Function reads balance without lock, process_payment_callback deducts separately.

### Older Critical Issues
- **Coupon tables RLS unknown**: coupon_templates, user_coupons, coupon_redemptions DDL applied via MCP -- no RLS statements in version control. MUST verify in Supabase Dashboard.
- **Math.random() for code generation**: betaInviteService.ts uses non-CSPRNG for invite/partner/promo codes
- **adjustStock fallback**: read-modify-write race condition (non-atomic)

### Coupon System (2026-03-06)
- Server-side discount verification in Edge Function is well-implemented
- `redeem_coupon` called inside `process_payment_callback` transaction
- No percentage cap validation (discount_value could be > 100%)
- Stats queries fetch all rows client-side (will not scale)
- Migration file `20260306210000` is comments-only -- actual DDL not recorded

### Architecture Debt
- App.tsx: 2757 lines monolith
- OrderManager.tsx: 2290 lines
- SystemAdminBetaCodesTab.tsx: 700+ lines, 30+ state vars (coupon + codes in one component)
- useAuthForm.ts: 626 lines, 40+ state vars
- Duplicated: resolveIsTestPayment, isMissingIsTestPaymentColumnError (tossPaymentService + planService)
- All plan enforcement is client-side only (no RLS/trigger checks)

### Security Notes
- `.env.local` is gitignored (safe)
- CORS: strict origin allowlist, but LOCAL_NETWORK_RE not gated by env
- XSS: DOMPurify with strict config, all dangerouslySetInnerHTML sanitized
- PII encryption: server-side via crypto-service Edge Function
- No hardcoded secrets found

### File Size Reference
- App.tsx: 2757, OrderManager.tsx: 2290, FailManager.tsx: 1414
- SurgeryDashboard.tsx: 1258, InventoryManager.tsx: 1134
- SystemAdminBetaCodesTab.tsx: 700+, useAuthForm.ts: 626
