# Security Smoke Test Checklist

Last updated: 2026-02-17
Target: post-deploy verification after `021_auth_rls_hardening.sql`, `022_security_integrity_phase2.sql`, and `024_fix_create_order_with_items_ambiguity.sql`.

## 1) Preconditions

- Run this in staging first, then production.
- Keep one active admin account and one active non-admin account for verification.
- Ensure local quality gate is green:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- In Supabase SQL Editor, run:
  - `supabase/023_postdeploy_verification.sql`
  - `supabase/025_verify_create_order_hotfix.sql`
  - Accept only all `PASS`.

## 2) SQL Smoke Tests (Transactional, No Permanent Data)

Use one transaction and roll back at the end.

```sql
begin;

-- Test identity setup
-- This checklist is prefilled with:
--   target hospital      = 189cf0b0-a2bc-4902-8aa3-5c62da5cf9eb
--   comparison hospital  = bcc144ae-a417-4a06-9ceb-858ae69f9df3
-- user UUID is auto-selected as the first active profile in target hospital.

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claim.sub',
  (
    select id::text
    from profiles
    where hospital_id = '189cf0b0-a2bc-4902-8aa3-5c62da5cf9eb'
      and status = 'active'
    order by created_at asc
    limit 1
  ),
  true
);

-- A) create_order_with_items: success path (same hospital)
select *
from create_order_with_items(
  jsonb_build_object(
    'hospital_id', '189cf0b0-a2bc-4902-8aa3-5c62da5cf9eb',
    'type', '일반',
    'manufacturer', 'SMOKE-TEST',
    'date', to_char(current_date, 'YYYY-MM-DD'),
    'manager', 'smoke',
    'status', 'ordered'
  ),
  jsonb_build_array(
    jsonb_build_object('brand', 'SMOKE-BRAND', 'size', '4.0x10', 'quantity', 1)
  )
);

-- B) create_order_with_items: forbidden path (other hospital)
-- Expect error: FORBIDDEN
do $$
begin
  begin
    perform 1
    from create_order_with_items(
      jsonb_build_object(
        'hospital_id', 'bcc144ae-a417-4a06-9ceb-858ae69f9df3',
        'type', '일반',
        'manufacturer', 'SMOKE-TEST',
        'date', to_char(current_date, 'YYYY-MM-DD'),
        'manager', 'smoke',
        'status', 'ordered'
      ),
      jsonb_build_array(
        jsonb_build_object('brand', 'SMOKE-BRAND', 'size', '4.0x10', 'quantity', 1)
      )
    );
    raise exception 'Forbidden test failed: function unexpectedly succeeded';
  exception
    when others then
      raise notice 'Forbidden test result: %', sqlerrm;
  end;
end $$;

-- C) process_payment_callback: role gate check
do $$
declare
  v_billing_id uuid;
  v_ok_auth boolean;
  v_ok_service boolean;
begin
  insert into billing_history (
    hospital_id, plan, billing_cycle, amount, payment_status, payment_method, description
  ) values (
    '189cf0b0-a2bc-4902-8aa3-5c62da5cf9eb', 'plus', 'monthly', 1000, 'pending', 'smoke', 'smoke-test'
  )
  returning id into v_billing_id;

  -- Authenticated role should fail (false)
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  select process_payment_callback(v_billing_id, 'smoke-ref-auth', 'completed')
    into v_ok_auth;

  -- Service role should pass (true)
  perform set_config('request.jwt.claim.role', 'service_role', true);
  select process_payment_callback(v_billing_id, 'smoke-ref-svc', 'completed')
    into v_ok_service;

  raise notice 'process_payment_callback(authenticated)=%', v_ok_auth;
  raise notice 'process_payment_callback(service_role)=%', v_ok_service;
end $$;

-- D) reset request tamper guard
-- Create scheduled request owned by the current user
insert into data_reset_requests (
  hospital_id, requested_by, reason, status, scheduled_at
) values (
  '189cf0b0-a2bc-4902-8aa3-5c62da5cf9eb',
  current_setting('request.jwt.claim.sub', true)::uuid,
  'smoke-test',
  'scheduled',
  now() + interval '1 day'
);

-- Normal cancel should pass
update data_reset_requests
set status = 'cancelled', cancelled_at = now()
where requested_by = current_setting('request.jwt.claim.sub', true)::uuid
  and status = 'scheduled';

-- Create one more row for tamper test
insert into data_reset_requests (
  hospital_id, requested_by, reason, status, scheduled_at
) values (
  '189cf0b0-a2bc-4902-8aa3-5c62da5cf9eb',
  current_setting('request.jwt.claim.sub', true)::uuid,
  'smoke-test-2',
  'scheduled',
  now() + interval '1 day'
);

-- Tampering immutable field should fail (expect IMMUTABLE_FIELDS_MODIFIED)
do $$
begin
  begin
    update data_reset_requests
    set status = 'cancelled', reason = 'tampered'
    where requested_by = current_setting('request.jwt.claim.sub', true)::uuid
      and reason = 'smoke-test-2';
    raise exception 'Tamper test failed: update unexpectedly succeeded';
  exception
    when others then
      raise notice 'Tamper test result: %', sqlerrm;
  end;
end $$;

rollback;
```

Notes:
- Hospital IDs are prefilled from latest smoke run context.
- `request.jwt.claim.sub` is auto-selected from active profiles in target hospital.
- `process_payment_callback` positive test must run with `request.jwt.claim.role = service_role`.

## 3) UI XSS Smoke Tests

### NoticeBoard test

1. Login as admin.
2. Open Notice writing UI.
3. Paste payload:

```html
<script>alert('xss')</script>
<img src="https://example.com/x.png" onerror="alert('xss')">
<a href="javascript:alert('xss')">click</a>
<p style="position:fixed;top:0;left:0">text</p>
```

4. Save and view rendered content.
5. Expected:
   - No script execution.
   - `onerror` removed.
   - `javascript:` link removed or stripped.
   - non-allowlist style declarations removed.

### SystemAdminDashboard manual test

1. Open admin manual editor.
2. Use same payload and save.
3. Refresh page and re-open entry.
4. Expected:
   - Rendered content is sanitized.
   - No script execution on load or render.

## 4) Pass Criteria

- `023_postdeploy_verification.sql`: all `PASS`
- SQL smoke tests:
  - create order success in own hospital
  - create order denied in other hospital
  - payment callback denied for authenticated, allowed for service role
  - reset request cancel allowed only in valid path, tamper blocked
- UI smoke tests:
  - no XSS execution in notice/manual rendering

## 5) If Any Test Fails

- Re-run `023_postdeploy_verification.sql` and capture failing rows.
- Capture exact failing SQL statement and error text.
- Check migration order:
  - `021_auth_rls_hardening.sql`
  - `022_security_integrity_phase2.sql`
  - `023_postdeploy_verification.sql`
  - `024_fix_create_order_with_items_ambiguity.sql`
- Apply focused fix migration (new numbered file), then rerun this checklist.

## 6) Execution Log

Use this format for every run:

- Date (YYYY-MM-DD):
  - Environment:
  - Runner:
  - Migrations:
  - `023` verification:
  - SQL smoke:
  - UI XSS smoke:
  - `026` report:
  - Notes:

Staging run:

- Date (YYYY-MM-DD): pending
  - Environment: staging
  - Runner: pending
  - Migrations: pending
  - `023` verification: pending
  - `025` verification: pending
  - SQL smoke: pending
  - UI XSS smoke: pending
  - `026` report: pending
  - Notes: pending

Production run:

- Date (YYYY-MM-DD): pending
  - Environment: production
  - Runner: pending
  - Migrations: pending
  - `023` verification: pending
  - `025` verification: pending
  - SQL smoke: pending
  - UI XSS smoke: pending
  - `026` report: pending
  - Notes: pending

Ad-hoc latest run:

- Date (YYYY-MM-DD): 2026-02-17
  - Environment: unknown (manual SQL Editor)
  - Runner: user
  - Migrations: `021`, `022`, `024` applied
  - `023` verification: PASS (all rows)
  - `025` verification: PASS (all rows)
  - SQL smoke: PASS (after applying `024`, ambiguous `hospital_id` error resolved)
  - UI XSS smoke: PASS
  - `026` report: PASS (`bcc144ae-a417-4a06-9ceb-858ae69f9df3` -> total 563, ENCv2 563, ENCv1 0, plain 0, ratio 100.00%)
  - Notes: `create_order_with_items` ambiguity hotfix added in `024_fix_create_order_with_items_ambiguity.sql`; verification query (`025`) and encryption report (`026`) confirmed.

### UI XSS 1-Minute Confirmation

Run this once per environment (staging, production), then update `UI XSS smoke` to `PASS`.

- [x] NoticeBoard editor: paste payload, save, reopen, no alert/script execution
- [x] NoticeBoard render: `onerror` attribute removed from `<img>`
- [x] NoticeBoard render: `javascript:` link stripped/blocked
- [x] SystemAdminDashboard manual editor/render: same payload does not execute script
- [x] Browser console: no unexpected sanitizer-related runtime error

## 7) Runtime API Smoke (Real App Path)

Run this after SQL smoke in each environment.

1. Authenticated app user order creation
   - Action: create one normal order from UI (same hospital account).
   - Expected: order + item created together, no partial insert.
2. Cross-hospital protection
   - Action: with the same user, attempt request payload using another hospital ID (devtools/manual API test).
   - Expected: request rejected (`FORBIDDEN`).
3. Payment callback role gate
   - Action: invoke `process_payment_callback` through the server/service-role path only.
   - Expected: service-role path succeeds; authenticated app user path is blocked.
4. Reset cancel guard
   - Action: cancel only own scheduled reset request from UI.
   - Expected: own request cancel succeeds; immutable field tamper attempt fails.

## 8) Next Ops

- Encryption migration runbook: `docs/04-report/patient-encryption-migration-runbook.md`
- Encryption status report SQL: `supabase/026_patient_info_encryption_report.sql`
