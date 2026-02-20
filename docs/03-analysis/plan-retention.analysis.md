# Gap Analysis Report — plan-retention

**분석 일시**: 2026-02-18
**기능**: 플랜별 수술기록 보관 기간 제한 (3-Layer 구현)
**분석 도구**: bkit:gap-detector

---

## Overall Match Rate: **100%** ✅

| 카테고리 | 점수 | 상태 |
|----------|:---:|:---:|
| Design 일치율 | 100% | PASS |
| 아키텍처 준수 | 100% | PASS |
| 컨벤션 준수 | 100% | PASS |
| **종합** | **100%** | **PASS** |

---

## 구현 항목별 검사 결과 (6개 파일, 34개 체크포인트)

| # | 파일 | 항목 수 | 결과 |
|---|------|:-------:|:----:|
| 1 | `hooks/useAppState.ts` | 6 | ✅ PASS |
| 2 | `components/SurgeryDashboard.tsx` | 7 | ✅ PASS |
| 3 | `components/surgery-dashboard/DateRangeSlider.tsx` | 8 | ✅ PASS |
| 4 | `App.tsx` | 1 | ✅ PASS |
| 5 | `supabase/030_surgery_retention.sql` | 7 | ✅ PASS |
| 6 | `types.ts` | 5 | ✅ PASS |

---

## 파일별 상세 결과

### 1. `hooks/useAppState.ts` (6/6)

| 항목 | 결과 | 비고 |
|------|:---:|------|
| `planService.checkPlanExpiry` 선행 호출 | ✅ | Promise.all 이전 단독 호출 |
| `planStateForDate` 변수 저장 | ✅ | 중복 API 호출 방지 |
| `PLAN_LIMITS[plan].retentionMonths` 참조 | ✅ | 플랜별 보관 개월 수 추출 |
| `Math.min(retentionMonths, 24)` 상한 적용 | ✅ | 24개월 초과 방지 |
| `fromDate` → `getSurgeryRecords({ fromDate })` 전달 | ✅ | 서버사이드 DB 쿼리 제한 |
| `const planState = planStateForDate` 재사용 | ✅ | 중복 호출 없이 state에 저장 |

### 2. `components/SurgeryDashboard.tsx` (7/7)

| 항목 | 결과 | 비고 |
|------|:---:|------|
| `planState?: HospitalPlanState \| null` prop 선언 | ✅ | optional, null 허용 |
| `PLAN_LIMITS` import | ✅ | types에서 직접 import |
| `minStartIdx` useMemo 계산 | ✅ | `total - retentionMonths` |
| `retentionMonths >= 24` → `minStartIdx = 0` 처리 | ✅ | Business/Ultimate 전체 허용 |
| `total <= retentionMonths` → `minStartIdx = 0` 처리 | ✅ | 데이터 자체가 제한 이내 |
| `effectiveStart = Math.max(minStartIdx, ...)` | ✅ | 표시 시작점 강제 제한 |
| `DateRangeSlider`에 `minStartIdx` 전달 | ✅ | prop drilling |

### 3. `components/surgery-dashboard/DateRangeSlider.tsx` (8/8)

| 항목 | 결과 | 비고 |
|------|:---:|------|
| `minStartIdx?: number` prop (기본값 0) | ✅ | 미전달 시 잠금 없음 |
| `isLocked = minStartIdx > 0` 계산 | ✅ | 플랜 잠금 여부 판단 |
| 업그레이드 안내 배너 (amber) | ✅ | 잠긴 개월 수 동적 표시 |
| 잠긴 구간 오버레이 (회색 + 점선 border) | ✅ | `lockedPct` 계산 적용 |
| 경계 자물쇠 아이콘 (amber circle) | ✅ | boundary에 고정 배치 |
| 드래그 시 `minStartIdx` 이하 방지 | ✅ | `Math.max(minStartIdx, idx)` |
| 키보드(Arrow) 시 `minStartIdx` 이하 방지 | ✅ | ArrowLeft/Home 제한 |
| 초기화 버튼 `onChange(minStartIdx, maxIdx)` | ✅ | minStartIdx 기준 초기화 |

### 4. `App.tsx` (1/1)

| 항목 | 결과 | 비고 |
|------|:---:|------|
| `planState={state.planState}` prop 전달 | ✅ | SurgeryDashboard에 전달 |

### 5. `supabase/030_surgery_retention.sql` (7/7)

| 항목 | 결과 | 비고 |
|------|:---:|------|
| `CREATE EXTENSION IF NOT EXISTS pg_cron` | ✅ | 멱등성 보장 |
| `cleanup_old_surgery_records()` 함수 | ✅ | SECURITY DEFINER |
| `CURRENT_DATE - INTERVAL '24 months'` 기준 | ✅ | 24개월 초과 삭제 |
| `GET DIAGNOSTICS deleted_count = ROW_COUNT` | ✅ | 삭제 건수 추적 |
| `RAISE LOG` 로깅 | ✅ | 삭제 시에만 기록 |
| `cron.unschedule` + `WHERE EXISTS` 멱등성 | ✅ | 재실행 안전 |
| `cron.schedule('0 18 * * *', ...)` | ✅ | 매일 18:00 UTC = 03:00 KST |

### 6. `types.ts` (5/5)

| 항목 | 결과 | 비고 |
|------|:---:|------|
| `PLAN_LIMITS` 상수 존재 | ✅ | free/basic/plus/business/ultimate |
| `retentionMonths` 필드 포함 | ✅ | 각 플랜별 값 |
| `HospitalPlanState` 타입 정의 | ✅ | plan 필드 포함 |
| `HospitalPlan` 유니온 타입 | ✅ | 5개 플랜 열거 |
| `DEFAULT_WORK_DAYS` 상수 존재 | ✅ | SurgeryDashboard 참조용 |

---

## 누락 항목

없음. 모든 설계 사양이 구현 완료.

---

## 추가 구현 항목 (설계 外 → 구현 O, 긍정적)

| 항목 | 위치 | 설명 |
|------|------|------|
| `RAISE LOG` 조건부 로깅 | `030_surgery_retention.sql` | 삭제 건수 > 0일 때만 기록 (로그 노이즈 최소화) |
| `total <= retentionMonths` 엣지케이스 | `SurgeryDashboard.tsx` | 데이터가 플랜 제한보다 적을 때 `minStartIdx=0` 처리 |
| 잠긴 tick/label 시각 구분 | `DateRangeSlider.tsx` | `isLockedTick`, `isLockedLabel` — 잠긴 구간 회색 렌더링 |
| `aria-valuemin={minStartIdx}` | `DateRangeSlider.tsx` | 접근성(a11y) — 스크린리더에 제한 범위 노출 |
| `retentionMonths >= 24` 분기 | `SurgeryDashboard.tsx` | Business/Ultimate 플랜 전체 허용 (PLAN_LIMITS.999 대응) |

---

## 아키텍처 준수 사항

- **3-Layer 보관 기간 강제**: 서버사이드(fromDate) → UI 슬라이더(minStartIdx) → DB 스케줄(pg_cron) 완전 구현
- **플랜 업그레이드 즉시 반영**: DB에 24개월치 모두 보관 → 업그레이드 시 즉시 전체 데이터 열람 가능
- **중복 API 호출 방지**: `planStateForDate` 변수를 통해 `checkPlanExpiry` 단 1회만 호출
- **타입 안전성**: `HospitalPlanState`, `PLAN_LIMITS`, `HospitalPlan` 모두 TypeScript 타입 완비
- **멱등성 보장**: `CREATE EXTENSION IF NOT EXISTS`, `cron.unschedule + WHERE EXISTS` 패턴

---

## Supabase 배포 확인

```
cron.job 검증:
  jobid: 1
  jobname: cleanup-surgery-records-24m
  schedule: 0 18 * * *
  command: SELECT public.cleanup_old_surgery_records();
  active: true
```

→ pg_cron 스케줄 정상 등록 완료 (매일 18:00 UTC = 03:00 KST 자동 실행)

---

## 결론

**plan-retention 기능 구현이 설계 사양과 100% 일치합니다.**

6개 파일 34개 체크포인트 전부 통과. 3-Layer 보관 기간 강제(서버사이드 쿼리 제한 + UI 슬라이더 잠금 + DB 자동삭제 스케줄) 완전 구현 완료.
