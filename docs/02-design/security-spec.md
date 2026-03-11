# Security Specification - DenJOY Implant Inventory SaaS

## 1. Authentication Architecture

### 1.1 Auth Provider
- Supabase Auth (GoTrue-based JWT)
- Email/password + social (Google, Kakao) via `signInWithOAuth`
- Email OTP 2FA (MFA) with trusted device support (30-day tokens)

### 1.2 Session Management
- Supabase JWT stored in `localStorage` (`sb-*-auth-token`) by Supabase JS client
- Concurrent session control: `set_session_token` RPC stores random UUID in `profiles.session_token`
- Session token stored in `sessionStorage` (tab-scoped, auto-clears on tab close)
- Trusted device token stored in `localStorage` (`dentweb_trusted_device_token`)

### 1.3 Role Model
| Role | Description | Server Enforcement |
|------|-------------|-------------------|
| admin | System operator | `profiles.role = 'admin'` checked in SECURITY DEFINER functions |
| master | Hospital owner | `hospitals.master_admin_id` + `profiles.role` RLS check |
| dental_staff | Hospital staff | RLS `hospital_id` isolation |
| staff | Personal workspace | Promoted to `master` via `setup_profile_hospital` |

## 2. Authorization Architecture

### 2.1 Row-Level Security (RLS)
- **47 tables** with RLS enabled
- Hospital-level data isolation: `hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid())`
- Recursive RLS reference pattern via `_can_manage_hospital()` helper function

### 2.2 SECURITY DEFINER Functions (Mandatory Pattern)
Every SECURITY DEFINER function MUST follow this pattern:
```sql
CREATE OR REPLACE FUNCTION my_function(...)
RETURNS ... LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ...
$$;
REVOKE ALL ON FUNCTION my_function(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_function(...) TO <specific_role>;
```

### 2.3 Edge Function Auth Model
- Functions with `verify_jwt = false`: implement manual JWT verification via `requireAuth()` or inline `authClient.auth.getUser()`
- Admin-only functions (e.g., `admin-delete-user`): verify `profiles.role = 'admin'` via service_role client

## 3. Data Protection

### 3.1 PII Encryption
- Fields: `profiles.name`, `profiles.email`, `profiles.phone`
- Scheme: `ENCv2:` prefix (current) / `ENC:` prefix (legacy)
- Hash columns: `email_hash`, `phone_hash`, `name_hash` for lookup without decryption
- Key: `PATIENT_DATA_KEY` stored in Supabase secrets only (never `VITE_` exposed)

### 3.2 Encryption Guards
- Double-encryption prevention: `WHERE NOT LIKE 'ENCv2:%'` on update
- In-flight deduplication: `_lazyEncryptInFlight` Set
- `_decryptFailed` flag blocks writeback of placeholder values

## 4. Payment Security

### 4.1 TossPayments Flow
1. Client creates `billing_history` record (status: `pending`)
2. Client initiates TossPayments widget
3. On success, client calls `toss-payment-confirm` Edge Function
4. Edge Function: JWT auth -> ownership check -> server-side price recalculation -> TossPayments confirm API -> `process_payment_callback` RPC

### 4.2 Price Verification
- Server recalculates base amount from `plan_pricing` table (DB source of truth)
- Coupon discount recalculated server-side (ownership + template + validity)
- Upgrade credit recalculated from source billing record (daily rate formula)
- Credit balance verified against `hospitals.credit_balance`
- Client values are overwritten if they differ from server calculation

### 4.3 Access Control
- `process_payment_callback`: `service_role` only (Critical -- no internal auth check)
- `process_credit_payment`: `authenticated` with internal `auth.uid()` ownership check
- `execute_downgrade_with_credit`: `authenticated` with internal membership check

## 5. Transport Security

### 5.1 HTTPS
- HSTS: `max-age=63072000; includeSubDomains; preload` (2-year, with preload)
- All Supabase connections over HTTPS/WSS

### 5.2 Security Headers (vercel.json)
| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Clickjacking prevention |
| X-Content-Type-Options | nosniff | MIME sniffing prevention |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer leakage control |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Feature restriction |
| Content-Security-Policy | See section 5.3 | XSS/injection defense |

### 5.3 CSP Policy
```
default-src 'self';
script-src 'self' https://cdn.jsdelivr.net https://js.tosspayments.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.tosspayments.com;
frame-src https://*.tosspayments.com;
frame-ancestors 'none';
```

### 5.4 CORS Policy
- Explicit origin allowlist (no wildcards)
- Vercel preview URL regex: `implant-stock-*-headals-projects-*.vercel.app`
- Local network IPs gated by `CORS_ALLOW_LOCAL=true` env var
- Default fallback origin: `https://denjoy.info`

## 6. Plan Enforcement

### 6.1 Server-Side Enforced
| Limit | Mechanism |
|-------|-----------|
| maxItems | `enforce_plan_limits` trigger on `inventory` table via `_plan_max_items()` |
| maxUsers | Edge Functions `invite-member` / `accept-invite` check `PLAN_MAX_USERS` |

### 6.2 Client-Side Only (Known Gap)
| Limit | Risk | Mitigation Needed |
|-------|------|-------------------|
| retentionMonths | Direct SDK queries bypass date filter | RLS policy with date check |
| maxBaseStockEdits | Manual SDK calls bypass counter | DB trigger on base_stock updates |

## 7. Secrets Management

### 7.1 Environment Separation
- Client-exposed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TOSS_CLIENT_KEY`
- Server-only (Supabase secrets): `TOSS_SECRET_KEY`, `PATIENT_DATA_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Lint enforcement: `checkBannedEnvPatterns()` blocks `VITE_PATIENT_DATA_KEY` patterns

## 8. Audit and Monitoring

### 8.1 Operation Logs
- `operation_logs` table with hospital_id, user_id, action, metadata
- Admin hospital view switches logged as `admin_enter_user_view` action
- Account deletions logged as `account_force_deleted` action

### 8.2 Withdrawal Anonymization
- `surgery_records.patient_info` set to NULL on account deletion
- `profiles.name` set to `[강제탈퇴]` or `[탈퇴]`
- Hash columns cleared

## 9. Migration Applied

### 20260312220000_security_definer_revoke_hardening.sql
- CRITICAL: `process_payment_callback` restricted to `service_role`
- CRITICAL: `process_credit_payment` REVOKE ALL FROM PUBLIC
- CRITICAL: `execute_downgrade_with_credit` REVOKE ALL FROM PUBLIC
- HIGH: `get_coupon_stats` / `get_redemption_stats` admin role check added
- MEDIUM: `admin_enter_user_view` audit log added
