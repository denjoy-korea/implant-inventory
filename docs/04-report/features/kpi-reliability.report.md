# Completion Report: kpi-reliability

> **Date**: 2026-03-05
> **Phase**: Completed
> **Match Rate**: 100%
> **Feature**: KPI 신뢰성 파이프라인 복구

---

## 1. Summary

funnel-cvr-fix(2026-03-05)로 CVR 알고리즘 교체 후 발생한 KPI 신뢰성 파이프라인 문제 4건을 전부 해소했다.

| 코드 | 심각도 | 문제 | 상태 |
|------|--------|------|:----:|
| P1 | Critical | 기존 스냅샷 CVR > 100% 오염 | ✅ 해결 |
| P2 | High | 스냅샷 커버리지 7% (출시 후 10일 중 2일) | ✅ 해결 |
| P3 | High | CI 커버리지 임계값 고정 (`continue-on-error: true`) | ✅ 해결 |
| P4 | Medium | `markConverted` 실패 무음 처리 | ✅ 해결 |

---

## 2. 요구사항 달성

| ID | 요구사항 | 결과 |
|----|----------|:----:|
| R-01 | 2026-03-05 스냅샷 재생성 (올바른 알고리즘) | ✅ Scheduled #3 자동 생성 완료 |
| R-02 | 2026-02-25 ~ 2026-03-03 8일치 백필 | ✅ Backfill #1 성공 |
| R-03 | 커버리지 ≥ 80% | ✅ 백필 후 달성 |
| R-04 | `markConverted` catch 핸들러 `console.error` 로깅 | ✅ `pageViewService.ts:69` |
| R-05 | CI 동적 커버리지 임계값 (출시일 기준 경과 일수) | ✅ `daily-snapshot.yml:47-55` |

---

## 3. 구현 내역

### 3-A. 코드 변경

| 파일 | 변경 내용 |
|------|-----------|
| `services/pageViewService.ts:69` | `markConverted` catch → `console.error('[pageViewService] markConverted failed', err)` |
| `.github/workflows/daily-snapshot.yml` | 출시일(2026-02-25) 기준 경과 일수로 최소 커버리지 임계값 동적 계산 |
| `.github/workflows/backfill-snapshots.yml` | 과거 날짜 수동 백필 워크플로 신규 추가 |
| `scripts/traffic-snapshot-coverage.mjs` | 기존 파일, 변경 없음 (정상 동작 확인) |

### 3-B. CI 버그 수정 (과정 중 발견)

| 파일 | 내용 |
|------|------|
| `scripts/lint-check.mjs` | `checkPlanLimitConsistency`: `types.ts` 단독 검사 → `types.ts + types/plan.ts` 합산으로 수정 |
| `components/shared/ModalShell.tsx` | 누락 커밋 추가 (CI typecheck 오류 해소) |
| `.github/workflows/backfill-snapshots.yml` | `while [[ <= ]]` → `while [[ < || == ]]` (bash `[[]]` 미지원 연산자 수정) |

### 3-C. 추가 완료 (동일 세션)

| 항목 | 내용 |
|------|------|
| `SystemAdminTrafficTab.tsx` KST 수정 | `toKSTDate()` 헬퍼로 `todayViews`·`weekViews`·일별 차트 UTC→KST 변환 |
| Dead code 삭제 | `fixtureReferenceBase.ts`, `fixtureReferenceService.ts`, `makePaymentService.ts` 제거 (-11,058 LOC) |

---

## 4. 검증

| 항목 | 결과 |
|------|:----:|
| `npm run typecheck` | ✅ 0 errors |
| `node scripts/lint-check.mjs` | ✅ pass |
| `node scripts/security-regression.test.mjs` | ✅ 18/18 pass |
| `node scripts/legal-ux-hardening.test.mjs` | ✅ 10/10 pass |
| `node scripts/funnel-kpi-regression.test.mjs` | ✅ 5/5 pass |
| CI #188 (quality-gate) | ✅ pass |
| Backfill Traffic Snapshots #1 | ✅ 성공 |
| Daily Traffic Snapshot #3 (Scheduled) | ✅ 성공 |

---

## 5. 잔존 사항

- R-06 (스냅샷 메타데이터 `algorithm_version` 필드): Could — 이번 범위 제외, 향후 고려
- R-07 (Slack 알림): Could — 이번 범위 제외, 향후 고려

---

## 6. 결론

투자자 데이터룸 KPI 수치 오염(CVR > 100%) 해소, 스냅샷 커버리지 7% → 정상 수준 복구, CI 모니터링 체계 강화 완료. 모든 Must 요구사항 100% 달성.
