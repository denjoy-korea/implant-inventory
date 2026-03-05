# DB Migration Management Risk Report

> **Risk Score**: -8% ~ -12% (Critical)
> **Date**: 2026-03-06
> **Team**: 3-agent parallel analysis (inventory, policy conflict, timestamp collision)
> **Status**: RESOLVED (all missing migrations applied to production)

---

## Executive Summary

Supabase SQL migration management has **3 critical risk categories** that can cause silent schema drift, deployment failures, and security vulnerabilities.

| Risk | Severity | Impact |
|------|----------|--------|
| R-01: Timestamp collision (2 pairs) | CRITICAL | Migrations silently skipped; incomplete schema |
| R-02: Policy document conflict | HIGH | Conflicting source-of-truth definitions cause new file misplacement |
| R-03: Legacy number collision (4 pairs) | MEDIUM | Root-level files have ambiguous execution order |
| R-04: Orphaned nested directory | LOW | `supabase/supabase/migrations/` (9 files) may confuse tooling |

---

## R-01: Timestamp Collision (CRITICAL)

### Problem

4 migration files share 2 timestamps in `supabase/migrations/`:

| Timestamp | File A | File B |
|-----------|--------|--------|
| `20260305010000` | `fix_payment_callback_grant.sql` (2.4KB) | `trial_fingerprints.sql` (5.4KB) |
| `20260306010000` | `add_billing_history_is_test_payment.sql` (824B) | `fix_plan_max_items_free.sql` (473B) |

### Mechanism

Supabase tracks migrations in `_supabase_migrations` table with a **UNIQUE constraint on `version`** (the timestamp as integer). When two files share a timestamp:

1. CLI sorts files alphabetically within the same timestamp
2. First file executes and records version `20260305010000`
3. Second file **fails with unique constraint violation** OR is **silently skipped**
4. Schema is left **incomplete** without any error in deployment logs

### Impact Analysis

**Collision 1 (20260305010000)**: Alphabetical order = `fix_payment...` before `trial_finger...`
- `fix_payment_callback_grant.sql` APPLIES (payment security hardening)
- `trial_fingerprints.sql` **SKIPPED** (trial abuse prevention table never created)
- **Result**: `trial_fingerprints` table missing; `start_hospital_trial()` RPC not updated; users can re-signup for unlimited free trials after account deletion

**Collision 2 (20260306010000)**: Alphabetical order = `add_billing...` before `fix_plan...`
- `add_billing_history_is_test_payment.sql` APPLIES (test payment flag)
- `fix_plan_max_items_free.sql` **SKIPPED** (plan limit function not corrected)
- **Result**: `_plan_max_items('free')` still returns wrong value; free plan users may exceed intended 50-item limit

### Fix

Rename to unique timestamps (preserving creation order):

```
20260305010000_fix_payment_callback_grant.sql  -> 20260305010000  (keep)
20260305010000_trial_fingerprints.sql          -> 20260305020000  (bump)
20260306010000_add_billing_history_is_test_payment.sql -> 20260306010000  (keep)
20260306010000_fix_plan_max_items_free.sql     -> 20260306020000  (bump)
```

### Supabase Migration Table Verification

After fix, must verify remote DB state:
```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version IN (20260305010000, 20260306010000)
ORDER BY version;
```

If only one migration per timestamp was applied, **manually apply the missing one**.

### Production Fix Applied (2026-03-06)

3개 누락 마이그레이션 수동 적용 완료:

```
[BEFORE]
  trial_fingerprints  → NOT EXISTS
  is_test_payment     → NOT EXISTS
  _plan_max_items('free') → 80 (WRONG)

[AFTER]
  trial_fingerprints  → EXISTS ✅
  is_test_payment     → EXISTS ✅
  _plan_max_items('free') → 50 ✅
```

---

## R-02: Policy Document Conflict (HIGH)

### Problem

Two documents define **contradictory** source-of-truth locations:

| Document | Date | Source of Truth | Naming |
|----------|------|----------------|--------|
| `docs/04-report/supabase-migration-source-of-truth.md` | 2026-02-22 | `supabase/*.sql` (root) | Sequential: `001_*.sql` |
| `supabase/README.md` | 2026-03-06 | `supabase/migrations/` | Timestamp: `YYYYMMDDHHMMSS_*.sql` |

### Contradiction Detail

**Old policy** (L12): `supabase/*.sql` 루트가 정식 기준. 번호식 `040_example.sql`
**New policy** (L15): `supabase/migrations/` 가 단일 소스. 타임스탬프식 `YYYYMMDDHHMMSS_*.sql`

### Impact

- New contributors may follow either document
- Files could be added to wrong directory
- CI/CD pipeline may reference wrong path
- `supabase db push` only reads `supabase/migrations/` by default (Supabase CLI convention)

### Fix

1. Mark old document as **SUPERSEDED** with redirect to new policy
2. Add migration policy to `CLAUDE.md` (AI agents read this first)
3. Clarify root files (000-048) are **legacy/frozen**, not to be modified or executed

---

## R-03: Legacy Number Collision (MEDIUM)

### Problem

Root-level `supabase/` has 4 pairs of duplicate-numbered files:

| Number | File A | File B |
|--------|--------|--------|
| 042 | `featured_reviews.sql` | `mfa_email_otp.sql` |
| 046 | `contact_inquiries_grant.sql` | `signup_source.sql` |
| 047 | `fix_contact_rls.sql` | `withdrawal_reasons.sql` |
| 048 | `page_views.sql` | `trial_policy_14_28_alignment.sql` |

### Impact

- If root files are ever executed manually, order is ambiguous
- `000_all_migrations.sql` snapshot may not include both files per number
- Documentation references (e.g., "apply 042") are ambiguous

### Fix

These are **already frozen** per `supabase/README.md`. Risk is LOW if:
1. No CI/CD applies root-level files
2. `000_all_migrations.sql` is treated as read-only reference
3. All new work goes to `supabase/migrations/` exclusively

No rename needed; just ensure no tooling reads root files.

---

## R-04: Orphaned Nested Directory (LOW)

### Problem

`supabase/supabase/migrations/` contains 9 files from Supabase CLI's `db push` history:

```
20260218061520_029_clinic_work_days.sql
20260218070119_030_surgery_retention.sql
20260219040334_create_member_invitations.sql
20260219043558_031_member_invitations.sql
20260219060020_member_invitations_delete_policy.sql
20260219064100_add_accepted_fields_to_member_invitations.sql
20260219163000_032_public_notices.sql
20260219171000_034_normalize_ibs_size_format.sql
20260219172000_035_merge_duplicate_inventory_items.sql
```

### Impact

- These duplicate migrations already present in `supabase/migrations/`
- Supabase CLI ignores this nested path (only reads `supabase/migrations/`)
- No functional impact, but confuses audits and increases repo size

### Fix

Add to `.gitignore` or delete entirely:
```bash
rm -rf supabase/supabase/
echo "supabase/supabase/" >> .gitignore
```

---

## Action Plan

### Immediate (P0) - Timestamp Collision Fix

| Step | Action | Risk |
|------|--------|------|
| 1 | Rename 4 collision files to unique timestamps | None (file rename only) |
| 2 | Verify remote DB `supabase_migrations.schema_migrations` | Read-only query |
| 3 | Manually apply any skipped migrations to production | Requires staging test first |

### Short-term (P1) - Policy Unification

| Step | Action |
|------|--------|
| 4 | Mark old policy doc as SUPERSEDED |
| 5 | Add migration rules to CLAUDE.md |
| 6 | Delete or .gitignore `supabase/supabase/` |

### Medium-term (P2) - Prevention

| Step | Action |
|------|--------|
| 7 | Add pre-commit hook: detect duplicate timestamps in `supabase/migrations/` |
| 8 | Add CI check: validate migration timestamp uniqueness |

---

## File Inventory Summary

| Location | Files | Status |
|----------|------:|--------|
| `supabase/*.sql` (root, 000-048) | 49 | Frozen (legacy) |
| `supabase/_archive/` | 3 | Archived (013, 014, 022) |
| `supabase/migrations/` | 81 | Active (single source) |
| `supabase/supabase/migrations/` | 9 | Orphaned (CLI artifact) |
| **Total** | **142** | |

### Duplicate Summary

| Type | Count | Severity |
|------|------:|----------|
| Timestamp collisions (`migrations/`) | 2 pairs (4 files) | CRITICAL |
| Number collisions (root) | 4 pairs (8 files) | MEDIUM (frozen) |
| Cross-directory duplicates (nested) | 9 files | LOW (orphaned) |

---

## Appendix: Verification Queries

### Check applied migrations
```sql
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;
```

### Find unapplied local migrations
```bash
# List local migration versions
ls supabase/migrations/*.sql | sed 's/.*\///' | cut -d_ -f1 | sort -u > /tmp/local.txt

# Compare with remote (requires supabase link)
supabase db dump --schema supabase_migrations | grep INSERT > /tmp/remote.txt
```

### Pre-commit hook (duplicate detection)
```bash
#!/bin/bash
timestamps=$(ls supabase/migrations/*.sql 2>/dev/null | sed 's/.*\///' | cut -d_ -f1 | sort)
dupes=$(echo "$timestamps" | uniq -d)
if [ -n "$dupes" ]; then
  echo "ERROR: Duplicate migration timestamps detected:"
  echo "$dupes"
  exit 1
fi
```
