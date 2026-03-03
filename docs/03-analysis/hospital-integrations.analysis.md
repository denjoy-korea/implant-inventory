# hospital-integrations Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: implant-inventory (DenJOY / DentWeb)
> **Analyst**: gap-detector
> **Date**: 2026-03-03
> **Design Doc**: [hospital-integrations.design.md](../02-design/features/hospital-integrations.design.md)
> **Plan Doc**: [hospital-integrations.plan.md](../01-plan/features/hospital-integrations.plan.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Design 문서(hospital-integrations.design.md)에 정의된 모든 요구사항이 실제 구현 코드에 정확히 반영되었는지 항목별로 검증한다.

### 1.2 Analysis Scope

| Category | Path |
|----------|------|
| Design Document | `docs/02-design/features/hospital-integrations.design.md` |
| Plan Document | `docs/01-plan/features/hospital-integrations.plan.md` |
| Types | `types.ts` (L290-335) |
| Service | `services/integrationService.ts` |
| Component | `components/IntegrationManager.tsx` |
| Settings Card | `components/SettingsHub.tsx` |
| DB Migration | `supabase/migrations/20260303040000_create_hospital_integrations.sql` |
| Edge Function | `supabase/functions/test-integration/index.ts` |

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 DB Schema (Section 2.1)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Identical | PASS | |
| `hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE` | Identical | PASS | |
| `provider TEXT NOT NULL CHECK (provider IN ('notion','slack','solapi'))` | Identical | PASS | |
| `config TEXT NOT NULL` | Identical | PASS | ENCv2 encrypted JSON |
| `is_active BOOLEAN NOT NULL DEFAULT true` | Identical | PASS | |
| `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Identical | PASS | |
| `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Identical | PASS | |
| `UNIQUE(hospital_id, provider)` | Identical | PASS | |
| `idx_hospital_integrations_hospital` index | Identical | PASS | |
| RLS ENABLE | Identical | PASS | |
| 4 RLS policies (SELECT/INSERT/UPDATE/DELETE) | Identical | PASS | role='master' AND status='active' |
| `GRANT ALL ... TO authenticated` | Identical | PASS | |

**DB Schema Score: 12/12 (100%)**

### 2.2 Type Definitions (Section 3.1)

| Design Type | Implementation (types.ts) | Status | Notes |
|-------------|--------------------------|--------|-------|
| `IntegrationProvider = 'notion' \| 'slack' \| 'solapi'` | L309: Identical | PASS | |
| `HospitalIntegration` interface (7 fields) | L311-319: Identical | PASS | `config: string` comment matches |
| `NotionConfig { api_token, database_id }` | L321-324: Identical | PASS | |
| `SlackConfig { webhook_url }` | L326-328: Identical | PASS | |
| `SolapiConfig { api_key, api_secret }` | L330-333: Identical | PASS | |
| `IntegrationConfig = NotionConfig \| SlackConfig \| SolapiConfig` | L335: Identical | PASS | |
| `PlanFeature` union includes `'integrations'` | L306: Identical | PASS | |

**Type Definitions Score: 7/7 (100%)**

### 2.3 PLAN_LIMITS (Section 3.2)

| Design Requirement | Implementation | Status | Notes |
|--------------------|---------------|--------|-------|
| `plus` features includes `'integrations'` | L392: present | PASS | |
| `business` features includes `'integrations'` | L404: present | PASS | |
| `ultimate` features includes `'integrations'` | L416: present | PASS | |

**Plan Feature Gating Note**: Design doc Section 3.2 says "Plus 이상에서 사용 가능". Plan doc FR-01 says "Business 이상". Implementation: plus 이상. Implementation matches design doc; plan doc has a discrepancy (Business vs Plus). Since design doc is the source of truth for implementation, this is correct.

**PLAN_LIMITS Score: 3/3 (100%)**

### 2.4 Service Layer (Section 4.1)

| Design Method | Implementation (integrationService.ts) | Status | Notes |
|---------------|----------------------------------------|--------|-------|
| `getIntegrations(hospitalId)` -> `HospitalIntegration[]` | L7-18: Identical logic | PASS | `.select('*').eq('hospital_id', hospitalId).order('provider')` |
| `upsertIntegration(hospitalId, provider, config)` -> `boolean` | L21-47: Identical logic | PASS | encrypt -> upsert with onConflict |
| `deleteIntegration(hospitalId, provider)` -> `boolean` | L50-65: Identical logic | PASS | `.delete().eq().eq()` |
| `decryptConfig<T>(encryptedConfig)` -> `T \| null` | L68-76: Identical logic | PASS | decrypt -> JSON.parse |
| `testConnection(provider, config)` -> `{ ok, message }` | L79-91: Identical logic | PASS | `supabase.functions.invoke('test-integration')` |
| Uses `encryptPatientInfo` / `decryptPatientInfo` from `cryptoUtils` | L2: Imported | PASS | |
| Import types from `../types` | L3: Imported | PASS | |

**Service Layer Score: 7/7 (100%)**

### 2.5 Component: IntegrationManager.tsx (Section 5.2)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| **Props**: `hospitalId, onClose, onIntegrationCountChange?` | L77-81: Identical | PASS | |
| **State**: `integrations: HospitalIntegration[]` | L89 | PASS | |
| **State**: `loading: boolean` | L90 | PASS | |
| **State**: `expandedProvider: IntegrationProvider \| null` | L91 | PASS | |
| **State**: `formConfig: Record<string, string>` | L94 | PASS | |
| **State**: `showSecrets: Record<string, boolean>` | L95 | PASS | |
| **State**: `testResult: { ok, message } \| null` | L96 | PASS | |
| **State**: `isTesting: boolean` | L97 | PASS | |
| **State**: `isSaving: boolean` | L98 | PASS | |
| **PROVIDERS** const: 3 providers (notion, slack, solapi) | L26-74: All 3 defined | PASS | |
| Notion fields: `api_token` (secret), `database_id` (text) | L39-41: Identical | PASS | |
| Slack fields: `webhook_url` (secret) | L55: Identical | PASS | |
| Solapi fields: `api_key` (secret), `api_secret` (secret) | L70-71: Identical | PASS | |
| Provider descriptions match design | Identical | PASS | |
| Mount: `getIntegrations(hospitalId)` | L105-115: useEffect | PASS | |
| Card click: expand toggle + decrypt config | L118-139 | PASS | |
| Connection test: `testConnection()` | L161-167 | PASS | |
| Save: `upsertIntegration()` -> reload | L142-158 | PASS | |
| Delete: confirm modal -> `deleteIntegration()` -> reload | L170-183, L349-370 | PASS | |
| `maskSecret()` utility | L7-11 | PASS | Slight enhancement: `Math.min(len-4, 12)` cap |
| Secret toggle (eye icon) per field | L277-289 | PASS | |
| Connected badge (green) / disconnected badge (gray) | L239-249 | PASS | |
| Expand/collapse chevron | L253-255 | PASS | |
| Modal header with link icon | L196-213 | PASS | |
| Footer with close button | L341-345 | PASS | |
| Test result display (success/error) | L295-304 | PASS | |
| Action buttons: test / save / disconnect | L307-331 | PASS | |
| `useEscapeKey(onClose)` | L102 | PASS | Not in design, reasonable addition |

**Additional implementation not in design (intentional enhancements):**

| Item | Location | Assessment |
|------|----------|------------|
| `isDeleting` state | L99 | Reasonable UX: delete loading state |
| `deleteTarget` state + confirmation modal | L100, L349-370 | Design mentions "확인 모달" in flow (Section 5.2 step 5), correctly implemented |
| `isFormValid()` validation | L188-190 | Reasonable UX: disable buttons when form incomplete |
| `ProviderDef` with `color` and `bgColor` | L16-24 | Reasonable UI enhancement beyond design's `icon: JSX.Element` |
| `lazy(() => import('./IntegrationManager'))` in SettingsHub | SettingsHub L10 | Good code-splitting, not in design |

**IntegrationManager Score: 24/24 (100%)**

### 2.6 SettingsHub Integration (Section 5.1)

| Design Item | Implementation (SettingsHub.tsx) | Status | Notes |
|-------------|--------------------------------|--------|-------|
| Integration card in grid | L361-391 | PASS | Rendered as button in card grid |
| Condition: `isMaster && !isStaff && hospitalId && canAccess(plan, 'integrations')` | L93: `canAccessIntegrations` | PASS | Identical condition |
| Card icon: link/connection icon | L369-371 | PASS | SVG link icon |
| Card title: "인테그레이션" or equivalent | L375: "외부 연동" | PARTIAL | Title is "외부 연동" instead of "인테그레이션" (intentional localization) |
| Card description: "노션, 슬랙, 솔라피 등 외부 서비스와 연동합니다." | L383 | PASS | "Notion, Slack, Solapi 등 외부 서비스와 연동합니다." |
| Connection count badge: "N개 연결됨" | L376-380 | PASS | Shows only when count > 0 |
| Plan lock display for sub-Plus plans | L93 (canAccessIntegrations gate) | PASS | Card not rendered if no access |
| Mount: load integration count | L96-101: useEffect | PASS | `getIntegrations` on mount, count active |
| Click opens IntegrationManager modal | L364, L742-750 | PASS | `showIntegrationModal` state |
| `onIntegrationCountChange` callback | L747 | PASS | `setIntegrationCount` |
| React.Suspense with lazy import | L743-749 | PASS | Not in design, good practice |

**SettingsHub Score: 10/11 (90.9%) -- 1 PARTIAL (title naming)**

### 2.7 Edge Function: test-integration (Section 6.1)

| Design Item | Implementation | Status | Notes |
|-------------|---------------|--------|-------|
| `POST /functions/v1/test-integration` | L101-148: Deno.serve, POST handler | PASS | |
| Request body: `{ provider, config }` | L116 | PASS | |
| Response: `{ ok, message }` | Throughout | PASS | |
| Notion: `GET /v1/databases/{db_id}` with Bearer | L21-26 | PASS | |
| Notion: 200 OK = success | L28-31 | PASS | Returns DB name in message |
| Slack: `POST webhook_url` with test text | L51-54 | PASS | Text slightly different from design but functionally identical |
| Slack: 200 OK = success | L57 | PASS | |
| Solapi: HMAC auth + API call | L66-98 | PARTIAL | Endpoint differs: design says `GET /cash/v1/balance`, impl uses `GET /users/v1/info` |
| CORS handling | L102-106 | PASS | OPTIONS preflight + cors headers |
| Method not allowed for non-POST | L108-113 | PASS | 405 response |
| Error handling | L141-146 | PASS | 500 with error message |
| Input validation per provider | testNotion L16, testSlack L43-48, testSolapi L67-69 | PASS | |
| Unknown provider fallback | L134 | PASS | Not in design, reasonable |

**Edge Function Score: 12/13 (92.3%) -- 1 PARTIAL (Solapi endpoint)**

### 2.8 Design Section 8 (Constraints)

| Design Constraint | Implementation | Status |
|-------------------|---------------|--------|
| Encrypt/decrypt via cryptoUtils (network cost) | integrationService.ts uses encryptPatientInfo/decryptPatientInfo | PASS |
| List returns encrypted; decrypt only on edit | getIntegrations returns raw; handleToggleExpand decrypts on expand | PASS |
| IntegrationManager in separate file (SettingsHub > 700 lines) | IntegrationManager.tsx is separate (375 lines) | PASS |
| Modal pattern matches vendor modal pattern | Both use fixed overlay + centered card | PASS |
| No new DashboardTab -- modal approach | No DashboardTab changes | PASS |

**Constraints Score: 5/5 (100%)**

---

## 3. Plan Document (FR) Coverage

| Plan FR | Description | Implementation Status | Notes |
|---------|-------------|----------------------|-------|
| FR-01 | SettingsHub integration card | PASS | Card renders for master + plus plan |
| FR-02 | Service cards (Notion/Slack/Solapi) with status | PASS | Connected/disconnected badges |
| FR-03 | API key registration form per service | PASS | Fields, masking, test, save, disconnect |
| FR-04 | Key encryption storage | PASS | encryptPatientInfo on save, decryptPatientInfo on edit |
| FR-05 | Connection test per service (Edge Function) | PASS | test-integration Edge Function |
| FR-06 | Connection status display | PASS | Count badge on card, per-service badges |

| Plan NFR | Description | Implementation Status | Notes |
|----------|-------------|----------------------|-------|
| NFR-01 | Security (encryption, RLS, masking) | PASS | All three implemented |
| NFR-02 | Extensibility (provider column) | PASS | PROVIDERS const array is extensible |
| NFR-03 | Plan gating | PARTIAL | Plan says "Business 이상", design/impl uses "Plus 이상" |

**Plan Coverage Score: 8/9 (88.9%) -- 1 PARTIAL (plan gating level discrepancy)**

---

## 4. Code Quality Notes

### 4.1 Positive Patterns

- `React.lazy()` + `Suspense` for IntegrationManager code-splitting
- `useEscapeKey` hook reuse for modal dismissal
- Delete confirmation modal prevents accidental disconnection
- `isFormValid()` disables actions on incomplete forms
- CORS handling + method guard in Edge Function
- HMAC-SHA256 implementation for Solapi authentication is correct

### 4.2 Minor Observations

| Item | File | Description | Severity |
|------|------|-------------|----------|
| Type assertion | IntegrationManager.tsx:148 | `formConfig as unknown as IntegrationConfig` -- double assertion | Low |
| Type assertion | IntegrationManager.tsx:136 | `decrypted as unknown as Record<string, string>` | Low |
| Slack test text | test-integration/index.ts:54 | Uses emoji in test message (design says "DenJOY 연결 테스트") | Info |
| Missing error toast | IntegrationManager.tsx | Delete failure has no user feedback (only reload skipped) | Low |

---

## 5. Match Rate Summary

### 5.1 Per-Category Scores

| Category | Items | Pass | Partial | Fail | Score |
|----------|:-----:|:----:|:-------:|:----:|:-----:|
| DB Schema | 12 | 12 | 0 | 0 | 100.0% |
| Type Definitions | 7 | 7 | 0 | 0 | 100.0% |
| PLAN_LIMITS | 3 | 3 | 0 | 0 | 100.0% |
| Service Layer | 7 | 7 | 0 | 0 | 100.0% |
| IntegrationManager | 24 | 24 | 0 | 0 | 100.0% |
| SettingsHub | 11 | 10 | 1 | 0 | 95.5% |
| Edge Function | 13 | 12 | 1 | 0 | 96.2% |
| Constraints | 5 | 5 | 0 | 0 | 100.0% |
| Plan FR/NFR | 9 | 8 | 1 | 0 | 94.4% |

### 5.2 Overall Score

```
+-----------------------------------------------+
|  Total Items Checked:    91                    |
|  PASS:                   88   (96.7%)          |
|  PARTIAL:                 3   ( 3.3%)          |
|  FAIL:                    0   ( 0.0%)          |
+-----------------------------------------------+
|  Overall Match Rate:     98.4%                 |
|  (PARTIAL counted as 0.5)                      |
+-----------------------------------------------+
|  Verdict:  PASS  (>= 90% threshold)           |
+-----------------------------------------------+
```

---

## 6. Differences Found

### 6.1 PARTIAL Items (Design != Implementation)

| # | Category | Design | Implementation | Impact | Assessment |
|---|----------|--------|----------------|--------|------------|
| 1 | SettingsHub card title | "인테그레이션" | "외부 연동" | Low | Intentional: user-friendly Korean naming. Design uses technical term; impl uses common term. Acceptable. |
| 2 | Solapi test endpoint | `GET /cash/v1/balance` | `GET /users/v1/info` | Low | Intentional: `/users/v1/info` is a lighter endpoint for connectivity check. Balance check may require additional permissions. Acceptable. |
| 3 | Plan gating level | Plan says "Business 이상" | Impl follows design "Plus 이상" | Low | Design doc is source of truth. Plan doc (FR-01) should be updated to say "Plus 이상". |

### 6.2 Additions Not in Design

| # | Item | Location | Description | Assessment |
|---|------|----------|-------------|------------|
| 1 | `isDeleting` / `deleteTarget` state | IntegrationManager.tsx:99-100 | Delete confirmation UX flow | Design section 5.2 step 5 mentions "확인 모달" -- correctly elaborated |
| 2 | `isFormValid()` | IntegrationManager.tsx:188-190 | Form validation gate | Good UX, prevents empty submissions |
| 3 | `ProviderDef.color` / `bgColor` | IntegrationManager.tsx:20-21 | Per-provider theming | UI polish beyond design wireframe |
| 4 | `React.lazy` / `Suspense` | SettingsHub.tsx:10, 743 | Code splitting | Performance optimization |
| 5 | `maskSecret` length cap `Math.min(len-4, 12)` | IntegrationManager.tsx:10 | Caps mask dots at 12 | Reasonable UX for very long tokens |
| 6 | Slack URL validation | test-integration:46-48 | `startsWith('https://hooks.slack.com/')` | Security hardening |
| 7 | Unknown provider fallback | test-integration:134 | Returns error for unknown providers | Defensive coding |

All additions are reasonable enhancements that do not contradict the design.

---

## 7. Architecture Compliance

| Check | Status | Notes |
|-------|--------|-------|
| Component in `components/` | PASS | `IntegrationManager.tsx` |
| Service in `services/` | PASS | `integrationService.ts` |
| Types in root `types.ts` | PASS | Follows existing project pattern |
| Migration in `supabase/migrations/` | PASS | Correct naming convention |
| Edge Function in `supabase/functions/` | PASS | With shared CORS util |
| Component -> Service dependency (not direct DB) | PASS | IntegrationManager calls integrationService |
| Service -> supabaseClient (infrastructure) | PASS | Standard project pattern |
| No circular dependencies | PASS | Clean dependency chain |

**Architecture Score: 8/8 (100%)**

---

## 8. Convention Compliance

| Convention | Check | Status |
|-----------|-------|--------|
| Component file: PascalCase.tsx | `IntegrationManager.tsx` | PASS |
| Service file: camelCase.ts | `integrationService.ts` | PASS |
| Functions: camelCase | `handleSave`, `handleTest`, `loadIntegrations` | PASS |
| Constants: UPPER_SNAKE_CASE | `PROVIDERS` | PASS |
| Types: PascalCase | `IntegrationProvider`, `HospitalIntegration` | PASS |
| Import order: external -> internal -> relative | IntegrationManager.tsx L1-4 | PASS |
| SQL migration naming: `YYYYMMDDHHMMSS_description.sql` | `20260303040000_create_hospital_integrations.sql` | PASS |

**Convention Score: 7/7 (100%)**

---

## 9. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 98.4% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **98.4%** | **PASS** |

---

## 10. Recommended Actions

### 10.1 Documentation Update (Low Priority)

1. **Plan doc FR-01**: Update "Business 이상" to "Plus 이상" to match design doc and implementation
2. **Design doc Section 6.1 Solapi**: Update test endpoint from `/cash/v1/balance` to `/users/v1/info` to match implementation choice
3. **Design doc Section 5.1**: Note that card title is "외부 연동" (not "인테그레이션")

### 10.2 Minor Code Improvements (Optional)

1. **IntegrationManager.tsx L148, L136**: Consider a typed adapter function instead of double `as unknown as` assertion
2. **IntegrationManager.tsx handleDeleteConfirm**: Add error feedback (toast) on delete failure
3. **Slack test message**: Align emoji usage with design description (cosmetic)

---

## 11. Phase Coverage

| Plan Phase | Items | Implementation Status |
|------------|-------|----------------------|
| Phase 1 (MVP) | DB + RLS, SettingsHub card, Modal UI, CRUD, Encryption, Service layer | All PASS |
| Phase 2 (Connection Test) | Edge Function test-integration | PASS |
| Phase 3 (Advanced) | Notion field mapping, Slack channel select, Usage logs | Not in scope (future) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial gap analysis | gap-detector |
