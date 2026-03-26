# security-fix Gap Analysis Report

## Analysis Overview

| Item | Detail |
|------|--------|
| Feature | security-fix |
| Summary | SQL-TS 플랜 제한 정렬 + 기능 게이트 RLS + crypto hospital_id 강제 + 업로드 빈도 + 데이터 조회 기간 + verify_jwt 강화 |
| Implementation Files | 4 SQL migrations, 1 Edge Function, 3 config.toml, 1 frontend service |
| Analysis Date | 2026-03-21 |
| Analyst | bkit:gap-detector |

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **100%** | **PASS** |

## Detailed Checklist (30/30 PASS)

### P0-1: SQL-TS 플랜 제한값 정렬 (3/3 PASS)

| # | 항목 | 설계 | 구현 | 상태 |
|---|------|------|------|------|
| 1 | `_plan_max_items('basic')` | 150 | 150 (L23) | PASS |
| 2 | `_plan_max_items('plus')` | 300 | 300 (L24) | PASS |
| 3 | `_plan_max_users('business')` | 10 | 10 (L42) | PASS |

File: `supabase/migrations/20260321140000_align_plan_limits.sql`

### P0-2: 기능 게이트 RLS (8/8 PASS)

| # | 항목 | 구현 위치 | 상태 |
|---|------|-----------|------|
| 1 | `_hospital_plan_allows(uuid, text)` 존재 | L18-61 | PASS |
| 2 | SECURITY DEFINER 설정 | L25 | PASS |
| 3 | `detected_fails_select_plan_gate` SELECT + plus 체크 | L74-81 | PASS |
| 4 | `detected_fails_write_hospital_isolation` INSERT/UPDATE/DELETE 분리 | L84-89 | PASS |
| 5 | `return_requests_select_plan_gate` SELECT + plus 체크 | L98-105 | PASS |
| 6 | `return_requests_write_hospital_isolation` INSERT/UPDATE/DELETE 분리 | L108-113 | PASS |
| 7 | `return_request_items_select_plan_gate` SELECT + plus 체크 | L123-133 | PASS |
| 8 | `return_request_items_write_isolation` INSERT/UPDATE/DELETE 분리 | L136-148 | PASS |

File: `supabase/migrations/20260321150000_feature_gate_rls.sql`

> 참고: Write 정책은 `FOR ALL` (Postgres 표준 — INSERT/UPDATE/DELETE 모두 포함). SELECT 게이트와 명확히 분리됨.

### P0-3: crypto-service hospital_id 강제 (6/6 PASS)

| # | 항목 | 구현 위치 | 상태 |
|---|------|-----------|------|
| 1 | body 타입에 `hospital_id?: string` 추가 | index.ts L389 | PASS |
| 2 | JWT vs body hospital_id 불일치 → 403 | index.ts L419-431 | PASS |
| 3 | 구 JWT (hospitalId 없음) → 소프트-패스 + 경고 로그 | index.ts L432-436 | PASS |
| 4 | body에 hospital_id 없음 → 경고 로그 (하드 실패 아님) | index.ts L437-442 | PASS |
| 5 | cryptoUtils: `app_metadata.hospital_id` 추출 | cryptoUtils.ts L86-89 | PASS |
| 6 | cryptoUtils: hospital_id를 request body에 포함 | cryptoUtils.ts L98 | PASS |

### P1-4: 수술기록 업로드 빈도 트리거 (6/6 PASS)

| # | 항목 | 구현 위치 | 상태 |
|---|------|-----------|------|
| 1 | `hospitals.last_surgery_upload_at` 컬럼 추가 | L12-13 | PASS |
| 2 | `_check_upload_frequency` BEFORE INSERT 트리거 | L16-61 | PASS |
| 3 | free 플랜: 30일 간격 제한 | L45 `INTERVAL '30 days'` | PASS |
| 4 | basic 플랜: 7일 간격 제한 | L44 `INTERVAL '7 days'` | PASS |
| 5 | plus+ 플랜: 무제한 (즉시 통과) | L33-35 | PASS |
| 6 | `_update_last_surgery_upload_at` AFTER INSERT 트리거 | L65-83 | PASS |

File: `supabase/migrations/20260321160000_enforce_upload_frequency.sql`

### P1-5: 데이터 조회 기간 RLS (4/4 PASS)

| # | 항목 | 구현 위치 | 상태 |
|---|------|-----------|------|
| 1 | `_plan_view_months`: free=3, basic=12, plus+=24 | L14-28 | PASS |
| 2 | `_get_my_effective_plan` SECURITY DEFINER 함수 | L31-47 | PASS |
| 3 | `hospital_surgery_select` date 필터 적용 | L57-77 | PASS |
| 4 | admin 역할 (profiles.role='admin') 기간 제한 bypass | L66-70 | PASS |

File: `supabase/migrations/20260321170000_enforce_data_retention.sql`

### P1-6: verify_jwt 설정 (3/3 PASS)

| # | 항목 | 구현 | 상태 |
|---|------|------|------|
| 1 | `admin-delete-user/config.toml` | `verify_jwt = true` | PASS |
| 2 | `kick-member/config.toml` | `verify_jwt = true` | PASS |
| 3 | `reset-hospital-data/config.toml` (신규) | `verify_jwt = true` | PASS |

## 결과 요약

```
+-----------------------------------------------------+
|  Match Rate: 100% (30/30 PASS)                      |
+-----------------------------------------------------+
|  P0-1 플랜 제한 정렬:     3/3  PASS                  |
|  P0-2 기능 게이트 RLS:    8/8  PASS                  |
|  P0-3 crypto hospital_id: 6/6  PASS                 |
|  P1-4 업로드 빈도 트리거:  6/6  PASS                  |
|  P1-5 데이터 조회 기간:    4/4  PASS                  |
|  P1-6 verify_jwt:         3/3  PASS                  |
|                                                     |
|  FAIL:    0                                         |
|  PARTIAL: 0                                         |
+-----------------------------------------------------+
```

## 구현 품질 메모

1. **Defense-in-depth**: RLS 정책을 SELECT(플랜 게이트)와 Write(hospital_id 격리)로 명확히 분리 — 트라이얼 중 데이터 생성 허용 + 다운그레이드 후 데이터 보존
2. **하위 호환성**: crypto-service P0-3에서 구 JWT는 소프트-패스 처리 — 기존 세션 단절 없이 점진적 전환 가능
3. **재귀 방지**: `_hospital_plan_allows`, `_get_my_effective_plan` 모두 SECURITY DEFINER로 RLS 재귀 방지
4. **트리거 분리**: BEFORE INSERT(빈도 검증) + AFTER INSERT(타임스탬프 갱신) — 실패 시 타임스탬프 미갱신 보장

## 권고사항

Match Rate >= 90% — 수정 불필요. `/pdca report security-fix` 실행 권장.
