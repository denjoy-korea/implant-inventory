# Design: onboarding-improvements

## Status Overview

Plan 분석 시 예상한 이슈들을 코드 실제 확인 후 업데이트:

| 이슈 | 예상 상태 | 실제 상태 |
|------|----------|----------|
| snooze 미구현 TS 에러 | 미구현 | ✅ 이미 구현됨 (`lines 107-118`) — stale 오탐 |
| confetti z-index | 버그 | ✅ 이번 세션에서 수정 완료 |
| 온보딩 토스트 최소화 | 개선 필요 | ✅ 이번 세션에서 수정 완료 |
| 소요시간 30~40분 오기 | 오기 | ✅ 이번 세션에서 수정 완료 |
| **Step 3 완료 기준 취약** | 취약 | ⚠️ **실제 버그 — 수정 필요** |

## 실제 수정 필요 항목: Step 3 안정화

### 현재 코드 (App.tsx:460)

```ts
if (state.inventory.length === 0 && !state.fixtureData) return 3;
```

### 문제 상황

```
1. 사용자: 픽스처 업로드 → 분석 중 (fixtureData 메모리에 있음)
2. 사용자: 브라우저 새로고침 (fixtureData 초기화됨)
3. inventory.length === 0 && fixtureData === null → Step 3 재표시 ❌
   (실제로는 Step 4로 가야 하는 상태)
```

영향 범위: 픽스처 업로드 완료 후 저장 전에 새로고침하는 경우.
저장 완료 후(`inventory.length > 0`)에는 새로고침해도 정상.

### 해결 방법: localStorage 플래그 추가

`services/onboardingService.ts`에 `FIXTURE_SAVED` 플래그 추가:

```ts
// KEY 추가
const KEY_FIXTURE_SAVED = (id: string) => `denjoy_ob_v2_fixture_saved_${id}`;

// 메서드 추가
isFixtureSaved(hospitalId: string): boolean {
  return !!localStorage.getItem(KEY_FIXTURE_SAVED(hospitalId));
},
markFixtureSaved(hospitalId: string): void {
  localStorage.setItem(KEY_FIXTURE_SAVED(hospitalId), '1');
},
```

> **DB 동기화 불필요**: `FIXTURE_SAVED`는 파일 업로드 후 실제 재고 DB 저장 시점을 추적.
> 다기기에서는 DB에서 `inventory.length > 0`으로 이미 판단 가능 → localStorage만으로 충분.

### App.tsx Step 3 조건 수정

```ts
// Before:
if (state.inventory.length === 0 && !state.fixtureData) return 3;

// After:
if (state.inventory.length === 0 && !onboardingService.isFixtureSaved(hid)) return 3;
```

### 픽스처 저장 완료 시점에 markFixtureSaved 호출

`components/onboarding/Step2FixtureUpload.tsx`에서 `onGoToDataSetup` 호출 직전:

```ts
// Step2FixtureUpload.tsx 내 "데이터 설정 페이지에서 저장하기" 버튼 클릭 시
onboardingService.markFixtureSaved(hospitalId);
onGoToDataSetup(file, corrections);
```

혹은 App.tsx의 `onGoToDataSetup` 핸들러에서 호출:
```ts
onGoToDataSetup={(file, sizeCorrections) => {
  if (file) {
    if (state.user?.hospitalId) {
      onboardingService.markFixtureSaved(state.user.hospitalId);
    }
    handleFileUpload(file, 'fixture', sizeCorrections);
  }
  // ...
}}
```

> App.tsx 핸들러에서 처리하는 것이 더 안전 (hospitalId 확실히 존재).

---

## 이번 세션 완료 항목 (커밋 포함)

| 항목 | 파일 | 커밋 |
|------|------|------|
| 30~40분 → 20~30분 | BillingProgramGate.tsx | e6d1b94 |
| confetti z-index 수정 | OnboardingCompleteModal.tsx | (미커밋) |
| 온보딩 토스트 compact pill | OnboardingToast.tsx | 이전 세션 |
| holiday-proxy 401 수정 | supabase/functions/holiday-proxy/ | e6d1b94 |
| 딥링크 복원 | App.tsx | 92a4fc8 |

---

## 구현 순서

1. `services/onboardingService.ts`: `KEY_FIXTURE_SAVED`, `isFixtureSaved`, `markFixtureSaved` 추가
2. `App.tsx:460`: `!state.fixtureData` → `!onboardingService.isFixtureSaved(hid)` 교체
3. `App.tsx onGoToDataSetup 핸들러`: `markFixtureSaved` 호출 추가

## 영향 파일

| 파일 | 변경 유형 | 범위 |
|------|----------|------|
| `services/onboardingService.ts` | 메서드 3개 추가 | ~10 lines |
| `App.tsx` | 조건문 수정 + markFixtureSaved 호출 | ~3 lines |

## 검증

1. `npx tsc --noEmit` — 에러 0건
2. Step 3 완료 후 새로고침 → Step 4로 정상 진행 확인
3. 최초 진입 (픽스처 없음) → Step 3 정상 표시 확인
4. 픽스처 저장 완료 후 새로고침 → Step 4 유지 확인
