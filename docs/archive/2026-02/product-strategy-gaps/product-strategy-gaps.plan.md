# Plan: product-strategy-gaps

> **Feature**: product-strategy-gaps
> **Project**: DenJOY (implant-inventory)
> **Level**: Dynamic
> **Date**: 2026-02-23
> **Priority**: P0

---

## 1. 배경 및 목적

`product-strategy` Gap Analysis (73.8% strict / 92.9% adjusted)에서 식별된 P0 Gap 3건을 수정한다.

| Gap | 설명 | 영향 |
|-----|------|------|
| G2 | `createStockFromTemplate()` 미구현 | HIGH |
| G4 | `retentionDaysLeft` 미설정 → T1 넛지 불발 | MEDIUM |
| G5 | `uploadLimitExceeded` 미설정 → T3 넛지 불발 | MEDIUM |

---

## 2. 범위

### G2: `createStockFromTemplate()` 처리 방침

**결정: 공식적으로 D1 변경으로 수용 (구현 불필요)**

현재 온보딩은 `Step2FixtureUpload` (덴트웹 픽스처 엑셀 업로드) 방식으로 이미 대체됨.
`createStockFromTemplate()`는 설계 문서에서 삭제하고 D1을 공식 기록.
- onboardingService에 dead code(`Step2BrandSelect`, `Step3StockInput`, `Step5Complete`) 제거 또는 주석 정리
- 설계 문서 업데이트

### G4: `retentionDaysLeft` 계산

**대상 파일**: `services/planService.ts`

`_buildPlanState()` 반환값에 `retentionDaysLeft` 추가:
- **조건**: `plan === 'free'` && `plan_expires_at !== null` (유료 플랜 만료 후 다운그레이드 유저)
- **계산**: `(plan_expires_at + PLAN_LIMITS.free.retentionMonths * 30days) - now` (일 단위)
- **의미**: 유료 플랜 만료 후 무료 전환 유저에게 "데이터 삭제 X일 전" 경고 (D-7에 T1 넛지 발동)
- `plan_expires_at === null` (항상 free이거나 trial) → `retentionDaysLeft = undefined` (넛지 불발)

### G5: `uploadLimitExceeded` 계산

**대상 파일**: `services/planService.ts`

`_buildPlanState()` 반환값에 `uploadLimitExceeded` 추가:
- **조건**: `plan === 'free'` && `!isTrialActive`
- **계산**: `base_stock_edit_count >= PLAN_LIMITS[plan].maxBaseStockEdits`
- **변경 필요사항**:
  1. `getHospitalPlan()` SELECT에 `base_stock_edit_count` 추가
  2. `_buildPlanState()` 파라미터에 `base_stock_edit_count?: number` 추가
  3. RPC `expire_trial_if_needed` / `check_plan_expiry`의 반환 데이터도 동일 필드 포함 필요 (없으면 fallback 0)

---

## 3. 구현 항목

| # | 파일 | 작업 |
|---|------|------|
| 1 | `services/planService.ts` | `getHospitalPlan()` SELECT에 `base_stock_edit_count` 추가 |
| 2 | `services/planService.ts` | `_buildPlanState()` 파라미터 확장 + G4/G5 계산 추가 |
| 3 | `docs/02-design/features/product-strategy.design.md` | G2(D1) 공식 반영, G4/G5 구현 내용 반영 |

---

## 4. 구현 제외 항목 (P1)

| Item | 이유 |
|------|------|
| G6 이메일 시퀀스 (`send-nudge-emails`) | 유료 고객 증가 시 구현 |
| G7 `RESEND_API_KEY` | G6 연동 시 |
| G8 Toss Payments PG | 유료 15개소 초과 조건 |

---

## 5. 완료 기준

- [ ] T1 넛지: 유료 만료 후 무료 전환 유저 `retentionDaysLeft <= 7` 시 `data_expiry_warning` 발동
- [ ] T3 넛지: free 플랜 `base_stock_edit_count >= maxBaseStockEdits` 시 `upload_limit` 발동
- [ ] G2 dead code 정리 or 공식 D1 문서화

---

## 6. 관련 파일

- `services/planService.ts` — `_buildPlanState()`, `getHospitalPlan()` (L480-516, L17-38)
- `types.ts` — `HospitalPlanState`, `PLAN_LIMITS` (L309-321, L325-370)
- `App.tsx` — T1/T3 넛지 트리거 (L337-341)
- `docs/02-design/features/product-strategy.design.md`
- `docs/03-analysis/product-strategy.analysis.md` (Gap Source)
