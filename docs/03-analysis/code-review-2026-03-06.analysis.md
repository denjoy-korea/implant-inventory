# Code Analysis Results

## Analysis Target
- Path: `services/`, `hooks/`, `components/`, `supabase/functions/`, `utils/`
- Focus: code-coupon-system feature + existing critical paths
- Analysis date: 2026-03-06

## Quality Score: 72/100

---

## Issues Found

### Critical (Immediate Fix Required)

| # | File | Line | Issue | Category | Recommended Action |
|---|------|------|-------|----------|-------------------|
| C-01 | `supabase/migrations/20260306210000_create_coupon_tables.sql` | 1-8 | **Coupon table DDL not recorded in migration file.** The file is comments only; actual DDL was applied via Supabase MCP. No `ENABLE ROW LEVEL SECURITY`, no RLS policies, no `CREATE TABLE` statements exist in version control. If the DB is ever recreated or migrated, the coupon tables will be missing. | Security / Ops | Write full DDL (`CREATE TABLE`, `ENABLE RLS`, policies, functions) into the migration file. At minimum add `ALTER TABLE coupon_templates ENABLE ROW LEVEL SECURITY` + policies. |
| C-02 | `supabase/migrations/20260306210000_create_coupon_tables.sql` | N/A | **No RLS on coupon_templates, user_coupons, coupon_redemptions.** If RLS was not enabled during MCP application, any `authenticated` user can read/write all coupon data across hospitals. A user could grant themselves arbitrary coupons or view other hospitals' coupons. | Security (OWASP A01) | Confirm RLS status via `SELECT relrowsecurity FROM pg_class WHERE relname = 'user_coupons'`. If not enabled, apply `ENABLE ROW LEVEL SECURITY` + hospital-scoped policies immediately. |
| C-03 | `supabase/migrations/20260306220000_billing_history_coupon_columns.sql` | 36-39 | **`process_payment_callback` reads `billing_history` without `FOR UPDATE` lock.** Concurrent calls with the same billing_id could both pass the `payment_status = pending` check and double-process the payment (double plan activation, double coupon redemption). | Race Condition | Add `FOR UPDATE` to `SELECT * INTO v_billing FROM billing_history WHERE id = p_billing_id FOR UPDATE LIMIT 1;` |
| C-04 | `services/betaInviteService.ts` | 51-57 | **`Math.random()` used for invite/partner/promo code generation.** `Math.random()` is not cryptographically secure; codes are predictable if the PRNG state is known. An attacker could guess valid partner codes and obtain coupons. | Security (OWASP A02) | Replace with `crypto.getRandomValues()` for code segment generation. |

### Major (Fix Before Next Release)

| # | File | Line | Issue | Category | Recommended Action |
|---|------|------|-------|----------|-------------------|
| M-01 | `services/couponService.ts` | 198-216 | **No validation cap on percentage discount.** `previewDiscount` accepts any `discount_value` for percentage type. A coupon with `discount_value = 200` (200%) would compute a negative `finalAmount`, capped to 0 by `Math.max`. The server-side Edge Function also computes `Math.floor(canonicalAmount * discount_value / 100)` without checking `discount_value <= 100`. While the server rejects mismatched amounts, a malicious admin could create a > 100% coupon template. | Validation | Add `CHECK (discount_value > 0 AND (discount_type = 'fixed_amount' OR discount_value <= 100))` constraint on `coupon_templates` and `user_coupons`. Add client validation in `createTemplate`. |
| M-02 | `supabase/functions/toss-payment-confirm/index.ts` | 202-234 | **Coupon verification does not lock the coupon row.** Between the SELECT (line 207-210) and the coupon redemption inside `process_payment_callback` RPC, another concurrent payment could use the same coupon. If the coupon has `max_uses = 1`, two concurrent payments could both see `used_count = 0` and both proceed. | Race Condition | The `redeem_coupon` function (applied via MCP, not in version control) must use `SELECT ... FOR UPDATE` on the coupon row. Verify and document. |
| M-03 | `services/tossPaymentService.ts` | 198-199 | **Client-side discount amount is trusted for the billing_history INSERT.** While the Edge Function re-verifies, the `billing_history.discount_amount` field is written by the client. If the Edge Function verification has a bug or is bypassed, the wrong discount persists. | Defense-in-Depth | Consider computing discount server-side during the confirm step and overwriting the billing record rather than trusting the client-written value. |
| M-04 | `hooks/useAuthForm.ts` | 472-474 | **`_pending_trial_plan` stored in localStorage.** If a user manipulates this value to a higher plan (e.g., `business`), `planService.startTrial()` on line 507 will attempt to start a trial for that plan. The server-side `startTrial` must validate eligibility. | Security | Verify that `planService.startTrial` has server-side plan eligibility checks. If not, add them. |
| M-05 | `supabase/functions/toss-payment-confirm/index.ts` | 18-23 | **`PLAN_BASE_PRICES` is duplicated from `types/plan.ts`.** These two sources must stay in sync manually. If a price changes in one but not the other, amount verification will fail (payments blocked) or succeed incorrectly. | Maintainability | Add an automated test that compares `PLAN_BASE_PRICES` (Edge Function) with `PLAN_PRICING` (client types). A contract test already exists (`payment-callback-contract.test.mjs`) -- ensure it covers this. |
| M-06 | `components/system-admin/tabs/SystemAdminBetaCodesTab.tsx` | 1-700+ | **File exceeds 700 lines with 30+ state variables.** This component manages beta codes, coupon templates, coupon lookup, statistics, and channel stats -- at least 5 distinct responsibilities in one component. | Architecture (SRP) | Split into sub-components: `BetaCodeManager`, `CouponTemplateManager`, `CouponLookup`, `CouponStatsPanel`, `ChannelStatsPanel`. |
| M-07 | `hooks/useAuthForm.ts` | 1-626 | **Hook has 40+ state variables and 626 lines.** Handles login, signup, invite, beta code verification, waitlist, trial plan, password reset -- too many concerns in one hook. | Architecture (SRP) | Extract into focused hooks: `useLoginForm`, `useSignupForm`, `useInviteForm`, `useBetaCodeVerification`, `useWaitlist`. |

### Minor (Improvement Recommended)

| # | File | Line | Issue | Category | Recommended Action |
|---|------|------|-------|----------|-------------------|
| m-01 | `services/couponService.ts` | 233-248 | **`getCouponStats()` fetches all `user_coupons` rows to count client-side.** This will degrade as coupon volume grows. | Performance | Use a server-side aggregate query (`SELECT status, COUNT(*), SUM(used_count) FROM user_coupons GROUP BY status`) or an RPC function. |
| m-02 | `services/couponService.ts` | 250-260 | **`getRedemptionStats()` fetches all `coupon_redemptions` to sum client-side.** Same performance concern as m-01. | Performance | Use `SELECT COUNT(*), SUM(discount_amount) FROM coupon_redemptions` via RPC. |
| m-03 | `services/couponService.ts` | 168-186 | **`getAvailableCoupons` fetches all active coupons then filters client-side.** The expiry and used_count checks should be done in the query. | Performance | Add `.lt('used_count', 'max_uses')` and `.or('expires_at.is.null,expires_at.gt.now()')` to the Supabase query. |
| m-04 | `services/tossPaymentService.ts` | 52-116 | **`createBillingRecordWithCoupon` has a backward-compatibility fallback path.** The fallback silently drops the coupon if the DB column doesn't exist. This could lead to a user paying full price even though they selected a coupon. | UX / Data Integrity | Log a more visible warning or show the user an error rather than silently dropping the coupon. |
| m-05 | `services/tossPaymentService.ts` | 38-42 | **`resolveIsTestPayment` is duplicated** in `tossPaymentService.ts` and `planService.ts` (identical logic). | DRY | Extract to a shared utility, e.g., `utils/paymentConfig.ts`. |
| m-06 | `services/tossPaymentService.ts` | 44-50 | **`isMissingIsTestPaymentColumnError` is also duplicated** in `planService.ts`. | DRY | Move to shared utility. |
| m-07 | `components/DirectPaymentModal.tsx` | 23 | **Unsafe type cast `(user as { phone?: string })?.phone`.** The `User` type should include `phone` if the field exists. | Type Safety | Add `phone` to the `User` type definition or remove the cast. |
| m-08 | `components/AuthForm.tsx` | 273 | **Beta invite modal backdrop click closes modal** even when `isBetaInviteRequired` is true. This allows the user to dismiss a required modal. The signup flow then shows the beta invite screen again, but the UX is confusing. | UX | When `isBetaInviteRequired`, disable backdrop close: `onClick={() => !isBetaInviteRequired && setBetaInviteModalOpen(false)}`. |
| m-09 | `supabase/functions/_shared/cors.ts` | 22 | **Local network IPs allowed in CORS production build.** The `LOCAL_NETWORK_RE` pattern allows `192.168.x.x`, `10.x.x.x`, and `172.16-31.x.x` origins in production. While this only affects CORS headers (not authentication), it widens the attack surface. | Security | Gate `LOCAL_NETWORK_RE` behind an environment variable (e.g., `CORS_ALLOW_LOCAL=true` only in dev). |

### Info (Reference)

| # | Observation |
|---|-------------|
| I-01 | **XSS defense is properly implemented.** `dangerouslySetInnerHTML` usage (2 locations) always passes through `sanitizeRichHtml()` which uses DOMPurify with a strict whitelist config. The DOMPurify hook also strips non-http(s) protocols from links. |
| I-02 | **CORS policy is well-designed.** Strict origin allowlist, no wildcard, Vercel preview regex is scoped to the project name. |
| I-03 | **PII encryption is properly server-side.** `cryptoUtils.ts` is a thin wrapper calling the `crypto-service` Edge Function; `PATIENT_DATA_KEY` is never exposed to the client. Double-encryption prevention (H-5) is implemented with a Set-based mutex. |
| I-04 | **Payment amount verification is solid.** The Edge Function independently computes the canonical amount from `plan + billing_cycle`, does not trust `billing_history.amount`, and verifies coupon discount server-side before calling TossPayments. |
| I-05 | **`process_payment_callback` has proper GRANT security.** `REVOKE ALL FROM PUBLIC`, `REVOKE ALL FROM authenticated`, `GRANT TO service_role` only. JWT role check (`v_jwt_role = 'service_role'`) provides defense-in-depth. |
| I-06 | **Auth service properly masks PII in logs** (`maskNameForLog`, `maskEmailForLog`). |
| I-07 | **Password policy is strong.** 8+ chars, uppercase, lowercase, digit, special character required. Enforced on both signup and invite flows. |
| I-08 | **No hardcoded secrets found.** API keys come from environment variables (`VITE_*` for client, Supabase secrets for server). `.env.local` is gitignored. |

---

## Coupon System Security Summary

The newly implemented coupon system has a **well-designed server-side verification flow** for payment amounts and discounts. Key strengths:

1. Server independently computes discount from coupon data (not trusting client)
2. Discount mismatch between client and server is rejected
3. Coupon validity (status, used_count, expiry) is checked server-side
4. `redeem_coupon` is called atomically inside `process_payment_callback` (single transaction)

Key risks that need immediate attention:

1. **RLS status of coupon tables is unknown** (C-01, C-02) -- if not enabled, any authenticated user can manipulate coupon data directly
2. **No row-level lock on billing_history** during payment processing (C-03) -- concurrent double-processing risk
3. **Code generation uses `Math.random()`** (C-04) -- predictable invite/partner codes

---

## Architecture Debt Summary

| Area | Issue | Severity |
|------|-------|----------|
| `SystemAdminBetaCodesTab.tsx` | 700+ lines, 30+ state vars, 5+ responsibilities | Major |
| `useAuthForm.ts` | 626 lines, 40+ state vars, handles login+signup+invite+beta+waitlist | Major |
| `App.tsx` | 2757 lines monolith (pre-existing) | Major |
| `OrderManager.tsx` | 2290 lines (pre-existing) | Major |
| Duplicate functions | `resolveIsTestPayment`, `isMissingIsTestPaymentColumnError` duplicated across 2 files | Minor |
| Price duplication | `PLAN_BASE_PRICES` (Edge Function) must manually sync with `PLAN_PRICING` (types) | Minor |

---

## Improvement Recommendations

1. **[Immediate]** Verify and enforce RLS on `coupon_templates`, `user_coupons`, `coupon_redemptions` tables. Write full DDL into the migration file.
2. **[Immediate]** Add `FOR UPDATE` lock in `process_payment_callback` when reading `billing_history`.
3. **[Immediate]** Replace `Math.random()` with `crypto.getRandomValues()` in `betaInviteService.ts` code generation.
4. **[Short-term]** Add `CHECK` constraint on `discount_value` for percentage coupons (max 100%).
5. **[Short-term]** Move coupon stat queries to server-side aggregation (RPC or database view).
6. **[Short-term]** Extract `resolveIsTestPayment` and `isMissingIsTestPaymentColumnError` to a shared utility.
7. **[Medium-term]** Split `SystemAdminBetaCodesTab` into focused sub-components.
8. **[Medium-term]** Split `useAuthForm` into domain-focused hooks.
9. **[Medium-term]** Add automated contract test comparing Edge Function price table with client-side `PLAN_PRICING`.

---

## Deployment Decision

**Warning issues present -- deployment possible with conditions:**

- C-01/C-02 (RLS on coupon tables): **Verify in Supabase Dashboard immediately.** If RLS is not enabled, block deployment until fixed.
- C-03 (FOR UPDATE lock): Low probability in current traffic volume, but fix before any production coupon usage.
- C-04 (Math.random): Acceptable risk for beta period with low user count, but fix before public launch.
