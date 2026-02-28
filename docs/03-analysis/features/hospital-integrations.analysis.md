# Design-Implementation Gap Analysis Report: Hospital Integrations

> **Summary**: Comprehensive gap analysis between the hospital-integrations design document and the actual codebase implementation.
>
> **Design Document**: `docs/02-design/features/hospital-integrations.design.md`
> **Plan Document**: `docs/01-plan/features/hospital-integrations.plan.md`
> **Analysis Date**: 2026-02-28
> **Status**: Draft

---

## Analysis Overview

The design document specifies a **hospital-level** integration management system where each hospital's master admin can manage Notion, Slack, and Solapi connections within the SettingsHub (hospital workspace). The actual implementation exists as a **system-admin-level** integration tab (`SystemAdminIntegrationsTab.tsx`) in the system admin dashboard, which is a fundamentally different scope and architecture.

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Data Model Match | 10% | CRITICAL |
| Type Definitions Match | 0% | CRITICAL |
| Service Layer Match | 0% | CRITICAL |
| UI Component Match | 25% | CRITICAL |
| Feature Logic Match | 35% | CRITICAL |
| Architecture Match | 15% | CRITICAL |
| **Overall Match Rate** | **14%** | CRITICAL |

---

## Detailed Comparison

### 1. Data Model (DB Table)

#### Design Specification
- Table: `hospital_integrations`
- Structure: per-hospital, per-provider rows with UUID PK
- Columns: `id`, `hospital_id`, `provider`, `config` (encrypted), `is_active`, `created_at`, `updated_at`
- Unique constraint: `(hospital_id, provider)`
- RLS: Hospital master only (role = 'master', hospital_id match)
- Index: `idx_hospital_integrations_hospital` on `hospital_id`
- Migration file: `supabase/migrations/YYYYMMDDHHMMSS_create_hospital_integrations.sql`

#### Actual Implementation
- Table: `system_integrations` (created by `supabase/migrations/20260224230000_create_system_integrations.sql`)
- Structure: global key-value store (no hospital isolation)
- Columns: `key` (TEXT PK), `value` (TEXT, encrypted), `label` (TEXT), `updated_at`
- No hospital_id column, no per-hospital isolation
- RLS: System admin only (role = 'admin')
- No `hospital_integrations` table exists anywhere

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| Table name | `hospital_integrations` | `system_integrations` | DEVIATION |
| Hospital isolation | `hospital_id` FK with RLS | None (global) | MISSING |
| Row structure | One row per hospital+provider | Key-value pairs | DEVIATION |
| Provider as column | `provider TEXT CHECK(...)` | Encoded in key name | DEVIATION |
| RLS policy | Hospital master (role='master') | System admin (role='admin') | DEVIATION |
| Migration file | `*_create_hospital_integrations.sql` | `20260224230000_create_system_integrations.sql` | DEVIATION |

### 2. Type Definitions

#### Design Specification (`types.ts` changes)
- `IntegrationProvider` type: `'notion' | 'slack' | 'solapi'`
- `HospitalIntegration` interface with all DB fields
- `NotionConfig`, `SlackConfig`, `SolapiConfig` interfaces
- `IntegrationConfig` union type
- `PlanFeature` updated with `'integrations'`
- `PLAN_LIMITS` updated: plus/business/ultimate to include `'integrations'`

#### Actual Implementation
- None of the designed types exist in `types.ts`
- `PlanFeature` does NOT include `'integrations'` (file: `/Users/mac/Downloads/Projects/implant-inventory/types.ts`, lines 288-303)
- `PLAN_LIMITS` does NOT include `'integrations'` in any plan tier (lines 337-386)
- Local types defined inline in `SystemAdminIntegrationsTab.tsx`:
  - `NotionDatabaseEntry` (different from `NotionConfig`)
  - `SlackWebhook` (different from `SlackConfig`)
  - `SolapiCreds` (similar to `SolapiConfig` but includes `sender` field)

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| `IntegrationProvider` type | In `types.ts` | Not defined | MISSING |
| `HospitalIntegration` interface | In `types.ts` | Not defined | MISSING |
| `NotionConfig` interface | In `types.ts` | `NotionDatabaseEntry` (local, different shape) | DEVIATION |
| `SlackConfig` interface | In `types.ts` | `SlackWebhook` (local, different shape) | DEVIATION |
| `SolapiConfig` interface | In `types.ts` | `SolapiCreds` (local, has extra `sender` field) | DEVIATION |
| `IntegrationConfig` union | In `types.ts` | Not defined | MISSING |
| `PlanFeature: 'integrations'` | Added to union | Not present | MISSING |
| `PLAN_LIMITS` updated | plus+ plans | No plan includes 'integrations' | MISSING |

### 3. Service Layer

#### Design Specification
- New file: `services/integrationService.ts`
- Methods:
  - `getIntegrations(hospitalId)` - get all integrations for a hospital
  - `upsertIntegration(hospitalId, provider, config)` - save with encryption
  - `deleteIntegration(hospitalId, provider)` - remove integration
  - `decryptConfig(encryptedConfig)` - decrypt config JSON
  - `testConnection(provider, config)` - call Edge Function for connection test

#### Actual Implementation
- File `services/integrationService.ts` does NOT exist
- All data access is done inline within components (direct `supabase.from('system_integrations')` calls)
- No service abstraction layer for integrations

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| `integrationService.ts` file | New service file | Not created | MISSING |
| `getIntegrations()` | Service method | Inline in component | MISSING |
| `upsertIntegration()` | Service method | Inline in component | MISSING |
| `deleteIntegration()` | Service method | Inline in component | MISSING |
| `decryptConfig()` | Service method | Inline in component | MISSING |
| `testConnection()` | Service method calling Edge Function | Not implemented | MISSING |

### 4. UI Components

#### Design Specification
- **SettingsHub.tsx changes**: Add integration card to card grid
  - Condition: `isMaster && !isStaff && hospitalId && canAccess(plan, 'integrations')`
  - Card shows connection count badge
  - Plan gating: locked for plans below Plus
- **IntegrationManager.tsx** (new): Modal with provider cards
  - Props: `hospitalId`, `onClose`, `onIntegrationCountChange`
  - Expandable provider cards (Notion, Slack, Solapi)
  - Form with masking, connection test, save, disconnect
  - Secret masking utility (`maskSecret`)

#### Actual Implementation
- **SettingsHub.tsx**: NO integration card added (confirmed: no matches for "integration" or related terms)
- **IntegrationManager.tsx**: Does NOT exist
- **SystemAdminIntegrationsTab.tsx**: Exists in `components/system-admin/tabs/` (system admin scope, not hospital scope)
  - Contains `NotionModal`, `SlackModal`, `SolapiModal` as internal functions
  - Provider card grid with connection status badges
  - Each provider opens its own dedicated modal (not expandable cards in single modal)

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| SettingsHub integration card | Card in hospital settings | Not added | MISSING |
| Plan gating on card | `canAccess(plan, 'integrations')` | Not implemented | MISSING |
| Connection count badge in SettingsHub | Shows "N connected" | Not present | MISSING |
| `IntegrationManager.tsx` | New modal component | Not created | MISSING |
| Provider cards (Notion/Slack/Solapi) | In IntegrationManager modal | In SystemAdminIntegrationsTab (different scope) | DEVIATION |
| Expandable card pattern | Click to toggle form inline | Separate modal per provider | DEVIATION |
| `maskSecret()` utility | Reusable function | `maskUrl()` in SlackModal only (local, partial) | DEVIATION |
| Connection status badges | In unified modal | In system admin tab (different scope) | DEVIATION |

### 5. Edge Function

#### Design Specification
- New Edge Function: `supabase/functions/test-integration/index.ts`
- Endpoint: `POST /functions/v1/test-integration`
- Tests:
  - Notion: `GET https://api.notion.com/v1/databases/{db_id}`
  - Slack: `POST webhook_url` with test message
  - Solapi: `GET https://api.solapi.com/cash/v1/balance`
- Returns: `{ ok: boolean, message: string }`

#### Actual Implementation
- `test-integration` Edge Function does NOT exist
- Related function exists: `get-notion-db-schema` (fetches Notion DB schema, not a general connection test)
- No Slack connection test
- No Solapi connection test

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| `test-integration` Edge Function | New function | Not created | MISSING |
| Notion connection test | Via Edge Function | Not implemented (only schema fetch exists) | MISSING |
| Slack connection test | Via Edge Function | Not implemented | MISSING |
| Solapi connection test | Via Edge Function | Not implemented | MISSING |

### 6. Architecture & Scope

#### Design Specification
- **Scope**: Hospital-level (per-hospital, hospital master manages)
- **Data isolation**: RLS on `hospital_id`
- **Access control**: Hospital master role
- **Location**: SettingsHub (hospital workspace)

#### Actual Implementation
- **Scope**: System-admin-level (global, system admin manages)
- **Data isolation**: None (global key-value store)
- **Access control**: System admin role
- **Location**: SystemAdminDashboard > Integrations tab

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| Scope | Hospital workspace | System admin dashboard | FUNDAMENTAL DEVIATION |
| Data ownership | Per-hospital | Global | FUNDAMENTAL DEVIATION |
| Access control | Hospital master | System admin | FUNDAMENTAL DEVIATION |
| Component location | SettingsHub modal | SystemAdminDashboard tab | FUNDAMENTAL DEVIATION |

---

## Implemented Items (Partial/Alternate Implementation)

These items exist in the codebase but in a different form than designed:

| # | Item | Design Location | Implementation Location | Notes |
|---|------|-----------------|------------------------|-------|
| 1 | Notion integration UI | `IntegrationManager.tsx` | `SystemAdminIntegrationsTab.tsx` (NotionModal) | System-admin scope, not hospital scope |
| 2 | Slack integration UI | `IntegrationManager.tsx` | `SystemAdminIntegrationsTab.tsx` (SlackModal) | Webhook-based, multiple channels |
| 3 | Solapi integration UI | `IntegrationManager.tsx` | `SystemAdminIntegrationsTab.tsx` (SolapiModal) | Has extra `sender` field |
| 4 | Encrypted config storage | `hospital_integrations.config` | `system_integrations.value` | Different table, same encryption |
| 5 | Service card grid | `IntegrationManager` | `SystemAdminIntegrationsTab` | Same visual pattern |
| 6 | Connection status badges | Design Section 5.2 | `SystemAdminIntegrationsTab` | Present but in admin scope |
| 7 | Token masking | `maskSecret()` utility | Input `type="password"` toggle | Different approach |

---

## Missing Items (Design Specified, Not Implemented)

| # | Item | Design Location | Description | Impact |
|---|------|-----------------|-------------|--------|
| 1 | `hospital_integrations` table | Design Section 2.1 | Per-hospital integration table with RLS | CRITICAL |
| 2 | DB migration file | Design Section 7, Step 2 | Migration for hospital_integrations | CRITICAL |
| 3 | `IntegrationProvider` type | Design Section 3.1 | Shared type definition | HIGH |
| 4 | `HospitalIntegration` interface | Design Section 3.1 | DB row type | HIGH |
| 5 | Config type interfaces | Design Section 3.1 | `NotionConfig`, `SlackConfig`, `SolapiConfig` | HIGH |
| 6 | `PlanFeature: 'integrations'` | Design Section 3.2 | Plan gating feature flag | HIGH |
| 7 | `PLAN_LIMITS` update | Design Section 3.2 | Add 'integrations' to plus+ plans | HIGH |
| 8 | `integrationService.ts` | Design Section 4.1 | Service layer for CRUD + encryption | HIGH |
| 9 | `IntegrationManager.tsx` | Design Section 5.2 | Hospital-level integration modal | CRITICAL |
| 10 | SettingsHub integration card | Design Section 5.1 | Card in hospital settings grid | CRITICAL |
| 11 | Plan gating on SettingsHub card | Design Section 5.1 | `canAccess(plan, 'integrations')` | HIGH |
| 12 | `test-integration` Edge Function | Design Section 6.1 | Server-side connection test | MEDIUM |
| 13 | `maskSecret()` utility | Design Section 5.3 | Reusable masking function | LOW |
| 14 | `testConnection()` in service | Design Section 4.1 | Connection test via Edge Function | MEDIUM |
| 15 | Hospital-scoped RLS policies | Design Section 2.1 | Master-only CRUD policies | CRITICAL |

---

## Added/Deviating Items (Implementation Has, Design Does Not)

| # | Item | Implementation Location | Description | Impact |
|---|------|------------------------|-------------|--------|
| 1 | System-admin integrations tab | `components/system-admin/tabs/SystemAdminIntegrationsTab.tsx` | Global integration management (not per-hospital) | FUNDAMENTAL |
| 2 | `system_integrations` table | `supabase/migrations/20260224230000_create_system_integrations.sql` | Global key-value store instead of per-hospital | FUNDAMENTAL |
| 3 | Notion multi-database support | `SystemAdminIntegrationsTab.tsx` (NotionModal) | Array of databases with individual titles | Added |
| 4 | Notion field mapping | `SystemAdminIntegrationsTab.tsx` (NotionModal) | App field to Notion column mapping with `get-notion-db-schema` | Added |
| 5 | Slack multi-channel webhooks | `SystemAdminIntegrationsTab.tsx` (SlackModal) | Multiple named webhook channels | Added |
| 6 | Known channel auto-linking | `SystemAdminIntegrationsTab.tsx` (KNOWN_CHANNELS) | Standard channel names auto-link features | Added |
| 7 | Solapi `sender` phone field | `SystemAdminIntegrationsTab.tsx` (SolapiModal) | Extra sender phone number field | Added |
| 8 | Google Calendar placeholder | `SystemAdminIntegrationsTab.tsx` | "Coming soon" card | Added |
| 9 | Legacy key migration | `SystemAdminIntegrationsTab.tsx` (NotionModal) | Backwards compatibility with old key format | Added |
| 10 | Admin tab registration | `components/system-admin/adminTabs.ts` | 'integrations' tab in admin tabs | Added |

---

## Root Cause Analysis

The fundamental gap stems from a **scope mismatch**: the design document specifies a **hospital-level** integration feature, but the implementation was built as a **system-admin-level** feature. This is not a partial implementation -- it is an entirely different feature at a different scope.

### Key Architectural Differences

```
DESIGN:                                    IMPLEMENTATION:
Hospital Master                           System Admin
  |                                         |
  v                                         v
SettingsHub                               SystemAdminDashboard
  |                                         |
  v                                         v
IntegrationManager (modal)                SystemAdminIntegrationsTab
  |                                         |
  v                                         v
integrationService.ts                     Direct Supabase calls (inline)
  |                                         |
  v                                         v
hospital_integrations (per-hospital)      system_integrations (global KV)
  |                                         |
  v                                         v
test-integration Edge Function            get-notion-db-schema (Notion only)
```

The Plan document (Section 1 "Background") actually acknowledges this situation: "system_integrations table: system admin exclusive (no hospital isolation)" is the current state, and the goal is to create hospital-level integration management. The implementation has enhanced the system-admin-level feature but has not created the hospital-level feature described in the design.

---

## Recommendations

### Immediate Actions (to achieve design goals)

1. **Create `hospital_integrations` table** -- Write new migration with hospital_id FK, provider column, RLS policies as specified in Design Section 2.1.

2. **Define shared types** -- Add `IntegrationProvider`, `HospitalIntegration`, config interfaces, and `IntegrationConfig` to `types.ts`.

3. **Add `'integrations'` to `PlanFeature`** and update `PLAN_LIMITS` for plus/business/ultimate plans.

4. **Create `services/integrationService.ts`** -- Extract CRUD + encryption logic into a dedicated service layer following the design specification.

5. **Create `IntegrationManager.tsx`** -- Build the hospital-level integration management modal component.

6. **Add integration card to `SettingsHub.tsx`** -- With plan gating and connection count badge.

### Deferred Actions (Phase 2)

7. **Create `test-integration` Edge Function** -- Unified connection test for all three providers.

### Documentation Updates Needed

8. **Update design document** to acknowledge the existing `system_integrations` / SystemAdmin implementation as a separate, already-built feature. The hospital-level feature should be documented as building alongside (not replacing) the system-admin feature.

9. **Consider design revision**: The Solapi implementation includes a `sender` field not in the design. The Notion implementation supports multiple databases with field mapping, which is more advanced than the design. Consider incorporating these additions into the hospital-level design.

### Synchronization Decision Required

The user must decide:

| Option | Description |
|--------|-------------|
| **A. Implement design as-is** | Build the hospital-level feature as a separate feature from the existing system-admin feature. Both would coexist. |
| **B. Update design to match** | Revise the design to document the system-admin-level implementation as the intended approach. Drop hospital-level isolation. |
| **C. Hybrid approach** | Keep the system-admin feature for SaaS-wide defaults, and build hospital-level overrides that inherit from system defaults. |
| **D. Record as intentional** | Document that the system-admin implementation serves the same purpose and hospital-level integration is deferred. |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-28 | Initial gap analysis | gap-detector |
