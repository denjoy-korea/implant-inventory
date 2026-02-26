# Gap Analysis: onboarding-improvements

**Date**: 2026-02-26
**Match Rate**: 100% ✅ PASS
**Analyzer**: bkit:gap-detector

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **100%** | **PASS** |

## Checklist (7/7)

### 1. services/onboardingService.ts

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| 1-1 | `KEY_FIXTURE_SAVED` 상수 추가 | ✅ | Line 8: 명세와 정확히 일치 |
| 1-2 | `isFixtureSaved()` 메서드 | ✅ | Lines 99-101: localStorage 패턴 일치 |
| 1-3 | `markFixtureSaved()` 메서드 | ✅ | Lines 102-104: DB 미동기화 설계 의도 반영 |

### 2. App.tsx

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| 2-1 | Step 3 조건 `!state.fixtureData` → `isFixtureSaved(hid)` | ✅ | Line 460: 완전 교체 확인 |
| 2-2 | `onGoToDataSetup`에서 `markFixtureSaved` 호출 | ✅ | Line 2145: hospitalId guard 포함 |

### 3. 세션 완료 항목

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| 3-1 | BillingProgramGate "20~30분" | ✅ | Line 68 확인 |
| 3-2 | OnboardingCompleteModal confetti z-10/z-20 | ✅ | canvas z-10, modal z-20 확인 |

## 특이사항

`markFixtureSaved`가 `persistFlag()` DB 동기화를 호출하지 않는 것은 설계 의도:
> "다기기에서는 DB의 inventory.length > 0으로 판단 가능 → localStorage만으로 충분"
