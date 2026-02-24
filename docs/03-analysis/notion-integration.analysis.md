# notion-integration Analysis Report

> **Analysis Type**: Gap Analysis (Requirements Spec vs Implementation)
>
> **Project**: implant-inventory (치과 임플란트 재고 관리 SaaS)
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-02-24
> **Reference Doc**: Requirements Spec (session context — no formal design document)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Verify that the notion-integration feature implementation matches the requirements specification derived from session context. This covers the Notion/Slack integration UI, two Edge Functions, and the service layer integration.

### 1.2 Analysis Scope

- **Reference**: Requirements Spec (6 sections, 40 items)
- **Implementation Files**:
  - `components/system-admin/tabs/SystemAdminIntegrationsTab.tsx` (789 lines)
  - `supabase/functions/notify-consultation/index.ts` (202 lines)
  - `supabase/functions/get-notion-db-schema/index.ts` (130 lines)
  - `services/consultationService.ts` (92 lines)
- **Analysis Date**: 2026-02-24

---

## 2. Overall Scores

| Category | Items | Matched | Score | Status |
|----------|:-----:|:-------:|:-----:|:------:|
| Integration Tab + Cards | 4 | 4 | 100% | PASS |
| NotionModal | 16 | 16 | 100% | PASS |
| SlackModal | 8 | 7 | 87.5% | WARN |
| notify-consultation Edge Function | 8 | 8 | 100% | PASS |
| get-notion-db-schema Edge Function | 6 | 6 | 100% | PASS |
| consultationService.ts | 3 | 3 | 100% | PASS |
| **Overall** | **40** | **38** | **95%** | **PASS** |

---

## 3. Detailed Gap Analysis

### 3.1 Integration Tab with Cards (Req 1) — 100%

| Requirement | Implementation | Lines | Status |
|---|---|---|---|
| Three cards (Notion, Slack, Google Calendar) | `integrations` array with 3 entries | 683-726 | Match |
| Clicking card opens modal | `setOpenModal(item.id)` + conditional render | 739, 781-786 | Match |
| Connected/미연결 badge per card | Ternary on `item.connected` | 756-764 | Match |
| Google Calendar "준비 중" | `comingSoon: true`, renders "준비 중" badge | 717, 755 | Match |

### 3.2 NotionModal (Req 2) — 100%

| Requirement | Implementation | Lines | Status |
|---|---|---|---|
| Token + DB ID inputs | `NOTION_FIELDS` constant, rendered via `.map()` | 25-28, 230-272 | Match |
| Token masked by default | `type={field.isSecret && notionMasked[...] ? 'password' : 'text'}` | 241 | Match |
| Save encrypted via `encryptPatientInfo` | `encryptPatientInfo(raw)` in `handleSave` | 124 | Match |
| Stored to `system_integrations` | `.upsert({ key, value, label, updated_at })` | 125-126 | Match |
| Delete button per saved field | `handleDelete(key)` with `.delete().eq('key', key)` | 137-145, 261-268 | Match |
| "연결됨" / "미연결" badge | Conditional in modal header | 203-213 | Match |
| Property Mapping visible only when connected | `{isConnected && (...)}` | 301 | Match |
| "Notion 컬럼 불러오기" button | Calls `fetchNotionColumns()` invoking `get-notion-db-schema` | 306, 147-162 | Match |
| Refresh re-fetches | Button text "새로고침" when `columnsFetched` | 313 | Match |
| Dynamic dropdowns | `select` with `APP_FIELDS` and `notionColumns` | 341-369 | Match |
| All 10 APP_FIELDS | name, hospital_name, email, contact, region, preferred_date, preferred_time_slot, notes, status, created_at | 30-41 | Match |
| Add/delete mapping rows | Add button + delete X per row | 370-389 | Match |
| "매핑 저장" button | `saveMappings()`, button text "매핑 저장" | 164-181, 393-401 | Match |
| Encrypted to `notion_field_mappings` | `encryptPatientInfo(JSON.stringify(mappingObj))`, key `'notion_field_mappings'` | 172-174 | Match |
| Fallback note | "매핑이 없으면 기본 컬럼명..." | 410 | Match |
| `columnFetchError` red warning | `bg-rose-50 border-rose-200 text-rose-600` | 317-322 | Match |

### 3.3 SlackModal (Req 3) — 87.5%

| Requirement | Implementation | Lines | Status |
|---|---|---|---|
| List of named webhook URLs | `webhooks.map(webhook => ...)` | 562-591 | Match |
| URL masked by default + eye toggle | `masked` state init to `true`, toggle button | 452, 570-581 | Match |
| Add: channel name + webhook URL | `newName` + `newUrl` inputs, `handleAdd()` | 596-634 | Match |
| URL must start with `https://` | `newUrl.trim().startsWith('https://')` | 507 | Match |
| Delete auto-saves | `persistWebhooks(next)` then `setWebhooks(next)` | 491-500 | Match |
| Encrypted as `slack_webhooks` | `encryptPatientInfo`, upsert key `'slack_webhooks'` | 461-468 | Match |
| Slack purple #4A154B | Used in header, spinner, inputs, button | 518, 547, 605, 627 | Match |
| **"N개 채널" badge in card** | **Card shows "연결됨" only; "N개 채널" only in modal header** | 756-764, 530 | **GAP** |

### 3.4 notify-consultation (Req 4) — 100%

| Requirement | Implementation | Lines | Status |
|---|---|---|---|
| Loads token + DB ID + field_mappings | Query with all three keys | 97-100 | Match |
| Decrypts with PATIENT_DATA_KEY | `decryptENCv2(rowMap[...], patientDataKey)` | 114-124 | Match |
| Dynamic mapping via `buildNotionProp` | Loop + `buildNotionProp(fieldKey, fieldValues[fieldKey])` | 147-153 | Match |
| Fallback Korean column names (incl. notes) | 이름, 병원명, 이메일, 연락처, 지역, 상태, 신청 일시, 선호 날짜, 선호 시간대, 추가 요청 | 155-166 | Match |
| `FIELD_TYPE_MAP` all 10 fields | title, email, rich_text, phone_number, date, select, status 모두 포함 | 12-23 | Match |
| `{ success: false, reason }` errors | crypto_key_missing, not_configured, notion_api_error | 88, 107, 182 | Match |
| catch returns "internal_error" | `reason: "internal_error"` in catch block | 195-200 | Match |
| Logs hospital/name/KST on success | Template literal with KST timestamp | 188-189 | Match |

### 3.5 get-notion-db-schema (Req 5) — 100%

| Requirement | Implementation | Lines | Status |
|---|---|---|---|
| Admin-only JWT verification | Authorization header 확인, `auth.getUser()` | 57-72 | Match |
| `profiles.role === 'admin'` check | Query + 403 response | 74-80 | Match |
| Loads + decrypts token + DB ID | `system_integrations` query, `decryptENCv2()` | 83-98 | Match |
| `GET .../databases/{id}` | `fetch(\`https://api.notion.com/v1/databases/${dbId}\`)` | 101 | Match |
| Returns `{ columns: [{ name, type }] }` | `dbSchema.properties` 매핑 | 117-118 | Match |
| Sorted by Korean locale | `.localeCompare(b.name, "ko")` | 119 | Match |

### 3.6 consultationService.ts (Req 6) — 100%

| Requirement | Implementation | Lines | Status |
|---|---|---|---|
| Fire-and-forget invocation | await 없이 호출 | 54 | Match |
| `.catch(console.warn)` | `.catch((err) => { console.warn(...) })` | 54-56 | Match |
| Does NOT block submission | `invoke` called after successful `insert`, no `await` | 54 | Match |

---

## 4. Gaps Found

### GAP-1 [Low]: Slack "N개 채널" badge missing from integration card

**File**: `components/system-admin/tabs/SystemAdminIntegrationsTab.tsx`
**Lines**: 702 (data), 756-764 (render)

The `channelCount` property is defined on the Slack card data object but never referenced in the card rendering logic. The card shows "연결됨" / "미연결" like all other cards. The "N개 채널" text only appears in the SlackModal header (line 530).

**Fix**: Add Slack-specific rendering branch — when `item.channelCount !== undefined && item.channelCount > 0`, render `${item.channelCount}개 채널` instead of "연결됨".

### GAP-2 [Low / Convention]: HTML `title` attribute in SlackModal

**File**: `components/system-admin/tabs/SystemAdminIntegrationsTab.tsx`
**Lines**: 574, 586

두 곳에서 `title=` 속성 사용. CLAUDE.md: "HTML `title` 속성 **금지**".

**Fix**: Remove `title=` attributes (buttons already have icons, context is clear enough without tooltips).

---

## 5. Recommendations

| Priority | Gap | Action |
|----------|-----|--------|
| Low | GAP-1 | Slack 카드에 `${channelCount}개 채널` 배지 렌더링 추가 |
| Low | GAP-2 | SlackModal의 `title=` 속성 제거 (CLAUDE.md 컨벤션 준수) |

**Match Rate: 95% — 90% 임계값 초과. 핵심 기능 모두 정상 구현됨.**

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-24 | Initial gap analysis | Claude (gap-detector) |
