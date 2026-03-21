# Security Audit Report -- DenJOY Implant Inventory SaaS

**Audit Date**: 2026-03-21
**Auditor**: Security Architect Agent
**Scope**: Full-stack security review (React+Vite frontend, Supabase backend, Edge Functions, RLS, Vercel deployment)
**Domain**: Medical SaaS (patient data handling)

---

## Executive Summary

The DenJOY application demonstrates a **mature security posture** for a medical SaaS product. Prior security reviews (2026-03-12) have addressed critical SECURITY DEFINER issues, RLS gaps, and CORS hardening. The architecture follows defense-in-depth principles with server-side encryption, explicit origin allowlists, and JWT verification patterns.

**Overall Score: 78/100**

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | NEW -- Requires immediate action |
| High     | 3 | NEW -- Fix before next release |
| Medium   | 5 | NEW/KNOWN -- Fix in next sprint |
| Low      | 6 | Track in backlog |

---

## OWASP Top 10 (2021) Assessment

### A01: Broken Access Control -- MEDIUM RISK

**Status**: Largely mitigated, with residual gaps.

**Strengths**:
- RLS is enabled on all tables with hospital_id-based isolation
- Migration `20260222190000_rls_security_hardening.sql` fixed critical issues (member_invitations UPDATE USING(true), anon SELECT leak, profiles role escalation)
- SECURITY DEFINER functions properly REVOKE'd from PUBLIC with GRANT to specific roles
- Edge Functions verify JWT + hospital ownership before sensitive operations

**Residual Issues**:

**[M-01] `retentionMonths` enforced client-side only** (Severity: MEDIUM, previously documented)
- Files: `hooks/useAppState.ts:141`, `hooks/useInventoryManagerData.ts:96`
- Risk: Direct Supabase SDK queries can access records beyond the plan's retention period
- Impact: Data access beyond plan entitlement (information leakage, not data modification)

**[M-02] `maxBaseStockEdits` enforced client-side only** (Severity: MEDIUM, previously documented)
- File: `components/InventoryManager.tsx:83`
- Risk: Crafted SDK calls can bypass edit count limits

**[L-01] `surgery_records` DELETE policy lacks role restriction** (Severity: LOW)
- File: `supabase/migrations/20260320160000_surgery_records_delete_policy.sql:5-8`
- Policy: `USING (hospital_id = get_my_hospital_id())` -- any authenticated hospital member can delete surgery records
- Risk: Non-master staff could bulk-delete records; no audit trail for deletions

---

### A02: Cryptographic Failures -- LOW RISK

**Strengths**:
- Patient data encrypted server-side with AES-256-GCM via PBKDF2 key derivation (100K iterations)
- `PATIENT_DATA_KEY` stored as Supabase secret only; `VITE_` prefix explicitly banned (`lint-check.mjs` enforces)
- Random IVs (12 bytes) for each encryption operation
- Legacy XOR encryption (ENCv1) handled for backward compatibility with proper fallback chain

**[L-02] Hardcoded PBKDF2 salt** (Severity: LOW)
- File: `supabase/functions/crypto-service/index.ts:27-28`
- Value: `"implant-inventory-pbkdf2-salt-v1"` -- static salt across all deployments
- Impact: Minimal (PBKDF2 salt's purpose is rainbow table prevention, not per-record uniqueness -- the random IV provides per-record uniqueness). However, ideally the salt would be deployment-specific.

**[L-03] Legacy fallback salt in source code** (Severity: LOW)
- File: `supabase/functions/crypto-service/index.ts:25`
- Value: `LEGACY_SALT = "dentweb-patient-info-2026"` -- used for backward-compatible decryption
- Impact: Enables decryption of legacy-encrypted data if attacker gains DB access without the key. Migration to ENCv2 reduces exposure over time.

---

### A03: Injection -- LOW RISK

**Strengths**:
- Supabase client SDK uses parameterized queries (no raw SQL from client)
- Edge Functions use Supabase JS client with parameter binding
- HTML sanitization uses DOMPurify with strict allowlist (`services/htmlSanitizer.ts`)
  - Custom hook strips non-http/https protocols from `<a>` href
  - `ALLOW_DATA_ATTR: false` prevents data-attribute injection
- `escapeHtml()` used in server-side email templates (`submit-contact/index.ts:37-44`)

**No SQL injection vectors found.** All database access goes through Supabase JS client.

---

### A04: Insecure Design -- MEDIUM RISK

**[H-01] `payment-callback` function -- weak authentication model** (Severity: HIGH)
- File: `supabase/functions/payment-callback/index.ts:150-158`
- Issue: If `PAYMENT_CALLBACK_SECRET` environment variable is empty/unset, the callback secret check is **completely skipped** (line 151: `if (callbackSecret) { ... }`). The function falls through to processing the payment.
- Impact: Without the secret, any actor who knows a billing_id UUID can trigger payment completion by POSTing `status=completed` to this endpoint. This activates paid plans without actual payment.
- Config: `verify_jwt = false` for this function is expected (webhook callback), but the fallback to no auth is dangerous.

```typescript
// payment-callback/index.ts:150-158
const callbackSecret = (Deno.env.get("PAYMENT_CALLBACK_SECRET") || "").trim();
if (callbackSecret) {  // <-- if unset, ALL requests pass through
  const queryToken = req.url ? new URL(req.url).searchParams.get("token") || "" : "";
  const headerToken = (req.headers.get("x-callback-token") || "").trim();
  const requestToken = queryToken || headerToken;
  if (!requestToken || !timingSafeEquals(requestToken, callbackSecret)) {
    return jsonResponse({ error: "Invalid callback token" }, 401);
  }
}
```

**Recommendation**: Fail closed. If `PAYMENT_CALLBACK_SECRET` is not configured, reject all requests with 500.

**[M-03] TOCTOU race in `accept-invite` member count** (Severity: MEDIUM, previously documented)
- Files: `supabase/functions/accept-invite/index.ts:57-66`, `supabase/functions/invite-member/index.ts:53-66`
- Issue: Member count check (SELECT) and profile update (UPDATE) are not atomic. Two concurrent accept-invite calls could both pass the maxUsers check.
- Practical risk: Low (requires precise timing, member invitations are manual)

---

### A05: Security Misconfiguration -- HIGH RISK

**[C-01] `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`** (Severity: CRITICAL)
- File: `/Users/mac/Downloads/Projects/implant-inventory/.env.local:4`
- Content: Full service_role JWT (`eyJhbG...`) is stored in a local dotfile
- `.gitignore` contains `*.local` and `.env.local`, so this is not committed **currently**, but:
  - The key is visible to any process/tool on the developer's machine
  - `.env.local` also contains the anon key, holiday API key, and Toss test client key
- **Immediate actions**:
  1. Verify `.env.local` has never been committed to git history: `git log --all -- .env.local`
  2. If ever committed, rotate the service_role key immediately via Supabase dashboard
  3. Consider using a secret manager or encrypted vault for local development

**[H-02] `notify-signup` -- no authentication, potential spam vector** (Severity: HIGH)
- File: `supabase/functions/notify-signup/index.ts`
- Config: `verify_jwt = false`
- Issue: Rate limit exists (10/min per IP) but no authentication. Attackers can:
  - Flood the Slack channel with fake signup notifications
  - Inject arbitrary content into Slack messages (name, email fields are not sanitized for Slack mrkdwn injection)
- Impact: Slack channel noise, potential social engineering via injected Slack formatting

**[H-03] No audit logging for payment refunds** (Severity: HIGH)
- File: `supabase/functions/toss-payment-refund/index.ts`
- Issue: Successful refunds are not logged to `operation_logs`. For a medical billing SaaS handling financial transactions, every refund must have an audit trail.
- Compare with `admin-delete-user` which does create audit log entries.

---

### A06: Vulnerable and Outdated Components -- NOT ASSESSED

Dependency audit (`npm audit`, Deno import version pinning) was not performed in this review. Recommend:
- Running `npm audit` and addressing critical/high findings
- Reviewing Deno import URLs for pinned versions (e.g., `denomailer@1.1.0` in submit-contact)
- Scheduling quarterly dependency reviews

---

### A07: Identification and Authentication Failures -- LOW RISK

**Strengths**:
- Supabase Auth handles session management, token refresh, password hashing
- JWT verification in Edge Functions uses `getUser()` API call (server-side validation, not just token parsing)
- `accept-invite` validates `userId === callerUser.id` to prevent spoofing
- `invite-member` uses `SITE_URL` from server env (SEC-07: phishing prevention)
- Invite tokens are 32 bytes of `crypto.getRandomValues()` (256 bits entropy)

**[L-04] No account lockout / brute-force protection at Edge Function level** (Severity: LOW)
- Supabase Auth has built-in rate limiting, but Edge Functions that perform auth checks (e.g., `crypto-service` verifyAuth) do not have request-level rate limiting.
- Impact: Minimal (Supabase Auth protects the actual login flow)

---

### A08: Software and Data Integrity Failures -- LOW RISK

**Strengths (exemplary payment verification)**:
- `toss-payment-confirm` performs full server-side amount recalculation:
  - Base amount from `plan_pricing` table (not client)
  - Coupon discount re-verified (ownership, applicable_plans, status, expiry)
  - Upgrade credit re-calculated from source billing
  - Credit balance re-verified against actual hospital balance
  - Amount mismatch returns 400 (blocks payment)
- `process_payment_callback` RPC is service_role only (migration 20260312220000)
- `toss-payment-refund` verifies billing ownership and recalculates refund amount server-side

---

### A09: Security Logging and Monitoring Failures -- MEDIUM RISK

**Strengths**:
- `operation_logs` table with hospital-scoped INSERT policy
- Admin hospital view switches logged as `admin_enter_user_view` action
- Account deletions logged as `account_force_deleted` action

**[M-04] `kick-member` -- no audit logging** (Severity: MEDIUM)
- File: `supabase/functions/kick-member/index.ts`
- Issue: Member removal (`auth.admin.deleteUser`) has no `operation_logs` entry
- Compare with `admin-delete-user` which properly logs

**[L-05] Rate limit bypass via `x-forwarded-for` spoofing** (Severity: LOW)
- File: `supabase/functions/_shared/rateLimit.ts:44-47`
- Issue: IP is extracted from `x-forwarded-for` header, which can be spoofed if not stripped by the infrastructure
- Impact: Low (Supabase Edge Functions run behind a CDN that typically sets the real IP)

---

### A10: Server-Side Request Forgery (SSRF) -- LOW RISK

**Strengths**:
- `invite-member` uses `SITE_URL` from server env, not client input
- No user-controlled URLs are fetched server-side (except TossPayments API which is hardcoded)
- `holiday-proxy` would need separate review for SSRF potential

---

## Security Headers Assessment

**File**: `/Users/mac/Downloads/Projects/implant-inventory/vercel.json`

| Header | Value | Grade |
|--------|-------|-------|
| HSTS | `max-age=63072000; includeSubDomains; preload` | A+ |
| X-Frame-Options | `DENY` | A+ |
| X-Content-Type-Options | `nosniff` | A |
| Referrer-Policy | `strict-origin-when-cross-origin` | A |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | A |
| CSP | Comprehensive with specific domains | A- |
| frame-ancestors | `'none'` (in CSP) | A+ |

**CSP Notes**:
- `script-src 'self' https://cdn.jsdelivr.net https://js.tosspayments.com` -- tight, no `unsafe-eval`
- `style-src 'self' 'unsafe-inline'` -- `unsafe-inline` required for Tailwind but worth noting
- `connect-src` properly lists Supabase and TossPayments domains
- `frame-src` limited to TossPayments (payment widget)

---

## CORS Assessment

**File**: `supabase/functions/_shared/cors.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| No wildcard `*` | PASS | Explicit origin allowlist |
| Vercel preview scoping | PASS | Regex scoped to specific project |
| Local network gating | PASS | Behind `CORS_ALLOW_LOCAL` env flag |
| `Vary: Origin` | PASS | Correct caching behavior |
| Methods restriction | PASS | `POST, OPTIONS` only |

**[L-06] localhost origins permanently in allowlist** (Severity: LOW)
- Lines 13-16: `http://localhost:5173/3000/3001/3002` are always allowed regardless of environment
- Recommendation: Gate behind env var like `CORS_ALLOW_LOCAL`

---

## Edge Function `verify_jwt = false` Risk Matrix

| Function | Internal Auth | Rate Limit | Risk Level |
|----------|:------------:|:----------:|:----------:|
| crypto-service | JWT (hash exempt) | None | LOW |
| **notify-signup** | **None** | 10/min/IP | **HIGH** |
| notify-withdrawal | Unknown | Unknown | MEDIUM |
| holiday-proxy | Unknown | Unknown | MEDIUM |
| invite-member | JWT + master | None | LOW |
| accept-invite | JWT + userId | None | LOW |
| verify-invite | Token-based | None | LOW |
| submit-contact | None | 5/min/IP | LOW |
| notify-consultation | Unknown | Unknown | MEDIUM |
| kick-member | JWT + master | None | LOW |
| admin-delete-user | JWT + admin | None | LOW |
| get-notion-db-schema | Unknown | Unknown | MEDIUM |
| dentweb-automation | JWT or agent_token | None | LOW |
| dentweb-upload | JWT or agent_token | None | LOW |
| toss-payment-confirm | JWT + ownership | None | LOW |
| toss-payment-refund | JWT + ownership | None | LOW |
| notify-support-message | Unknown | Unknown | MEDIUM |
| notify-hospital-slack | JWT | None | LOW |
| xlsx-generate | Unknown | Unknown | MEDIUM |

---

## Prioritized Remediation Plan

### P0: Immediate (Block deployment if exploitable)

| ID | Issue | File | Action |
|----|-------|------|--------|
| C-01 | SERVICE_ROLE_KEY in .env.local | `.env.local` | Verify never committed via `git log --all -- .env.local`; rotate if uncertain |

### P1: Before Next Release

| ID | Issue | File | Action |
|----|-------|------|--------|
| H-01 | payment-callback silent auth bypass | `payment-callback/index.ts:151` | Fail closed when `PAYMENT_CALLBACK_SECRET` is unset |
| H-02 | notify-signup unauthenticated spam | `notify-signup/index.ts` | Add JWT or email-exists validation |
| H-03 | No refund audit logging | `toss-payment-refund/index.ts` | Add `operation_logs` INSERT after successful refund |

### P2: Next Sprint

| ID | Issue | File | Action |
|----|-------|------|--------|
| M-01 | retentionMonths client-only | `hooks/useAppState.ts` | Add server-side date filter in RLS or view |
| M-02 | maxBaseStockEdits client-only | `InventoryManager.tsx` | Add DB trigger enforcement |
| M-03 | TOCTOU in accept-invite | `accept-invite/index.ts` | Use advisory lock or atomic RPC |
| M-04 | kick-member no audit log | `kick-member/index.ts` | Add `operation_logs` INSERT before deletion |

### P3: Backlog

| ID | Issue | Action |
|----|-------|--------|
| L-01 | surgery_records DELETE any member | Restrict to master_admin role |
| L-02 | Hardcoded PBKDF2 salt | Make deployment-specific via env var |
| L-03 | Legacy salt in source | Track migration progress off ENCv1 |
| L-04 | No Edge Function brute-force protection | Add rate limiting to crypto-service |
| L-05 | Rate limit x-forwarded-for spoofing | Verify CDN strips untrusted headers |
| L-06 | localhost in CORS allowlist | Gate behind env var |

---

## Positive Security Patterns (Worth Preserving)

These patterns represent strong security engineering and should be maintained:

1. **Server-side payment amount verification** -- `toss-payment-confirm` independently recalculates pricing from `plan_pricing` table, never trusting client-submitted amounts
2. **DOMPurify with strict allowlist** -- Custom hook for href protocol validation on top of DOMPurify defaults
3. **CORS explicit origin allowlist** -- No wildcard, project-scoped Vercel preview regex
4. **SECURITY DEFINER discipline** -- Consistent REVOKE ALL FROM PUBLIC + GRANT pattern across 72+ migration files
5. **PII encryption architecture** -- Server-side only (Edge Function), no client-side key exposure, lint-enforced
6. **Phishing prevention in invitations** -- `invite-member` uses server `SITE_URL`, not client-provided URL (SEC-07)
7. **Timing-safe comparison** -- `payment-callback` uses constant-time string comparison for callback secret
8. **Lint-enforced security policies** -- `lint-check.mjs` blocks `VITE_PATIENT_DATA_KEY` and verifies plan consistency

---

*Report generated by Security Architect Agent -- 2026-03-21*
