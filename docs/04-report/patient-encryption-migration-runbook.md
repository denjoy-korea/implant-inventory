# Patient Encryption Migration Runbook

Last updated: 2026-02-17
Target: migrate legacy `ENC:` patient_info values to `ENCv2:`.

## 1) Preconditions

- `supabase/024_fix_create_order_with_items_ambiguity.sql` applied.
- `supabase/025_verify_create_order_hotfix.sql` returns all `PASS`.
- App is running in dev mode (`npm run dev`) to use maintenance helper.

## 2) Measure Current Status

In Supabase SQL Editor, run:

```sql
-- Global hospital-level report
select * from (
  -- file: supabase/026_patient_info_encryption_report.sql
  SELECT
    hospital_id,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE patient_info IS NULL OR btrim(patient_info) = '') AS empty_records,
    COUNT(*) FILTER (WHERE patient_info LIKE 'ENC:%') AS enc_v1_records,
    COUNT(*) FILTER (WHERE patient_info LIKE 'ENCv2:%') AS enc_v2_records,
    COUNT(*) FILTER (
      WHERE patient_info IS NOT NULL
        AND btrim(patient_info) <> ''
        AND patient_info NOT LIKE 'ENC:%'
        AND patient_info NOT LIKE 'ENCv2:%'
    ) AS plain_records
  FROM surgery_records
  GROUP BY hospital_id
) t
order by t.total_records desc;
```

## 3) Migrate (Dev Console)

Open browser devtools console in running app:

```js
const svc = window.__securityMaintenanceService;
```

Status check:

```js
await svc.getPatientInfoEncryptionStatus('189cf0b0-a2bc-4902-8aa3-5c62da5cf9eb');
```

Batch migration (repeat until `remainingLegacy === 0`):

```js
await svc.migratePatientInfoToV2('189cf0b0-a2bc-4902-8aa3-5c62da5cf9eb', {
  batchSize: 200,
  maxBatches: 20
});
```

Expected result keys:
- `scanned`
- `migrated`
- `failed`
- `remainingLegacy`

## 4) Verification

1. Re-run `supabase/026_patient_info_encryption_report.sql`.
2. Confirm target hospital:
   - `enc_v1_records = 0`
   - `enc_v2_records` increased
3. Spot-check app:
   - surgery history view displays decrypted patient info correctly.
   - no decryption error in console.

## 5) Rollback / Failure Handling

- If `failed > 0`, keep legacy values as-is (no destructive replacement occurred).
- Log failed row IDs from console and retry with smaller batch size.
- If decryption fails repeatedly on specific rows, mark as legacy data quality issue and skip.

## 6) Execution Log

- Date (YYYY-MM-DD): 2026-02-17
  - Environment: manual SQL Editor run
  - Hospital: `bcc144ae-a417-4a06-9ceb-858ae69f9df3`
  - `026` report result:
    - `total_records = 563`
    - `enc_v1_records = 0`
    - `enc_v2_records = 563`
    - `plain_records = 0`
    - `enc_v2_ratio_percent = 100.00`
  - Migration action: not required (already ENCv2 100%)
