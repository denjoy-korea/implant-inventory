# Plan: onboarding-improvements

## Overview

**Feature**: 온보딩 시스템 개선
**Priority**: Medium
**Date**: 2026-02-26
**Level**: Dynamic

## Background

온보딩 시스템 전체 분석 결과, 다음 문제점이 발견됨:

1. **`30~40분` 소요 시간 오기** → `20~30분`으로 수정 (BillingProgramGate.tsx) ✅ 완료
2. **`snoozeUntilTomorrow` / `clearSnooze` TS 에러**: App.tsx에서 호출하지만 onboardingService에 미구현 (기존 TS 에러 2건)
3. **Step 3 완료 기준 취약**: `!state.fixtureData` 메모리 상태 의존 → 새로고침 시 Step 3 재표시
4. **온보딩 완료 후 confetti가 backdrop-blur 뒤에서 흐릿하게 보임** ✅ 완료 (z-index 재정렬)
5. **온보딩 토스트 최소화** ✅ 완료 (단일 compact pill)

## Problem Statement

### P1. snooze 기능 TS 에러 (즉시 수정 필요)

```
App.tsx:2129 - Property 'snoozeUntilTomorrow' does not exist on type '{...}'
App.tsx:2137 - Property 'clearSnooze' does not exist on type '{...}'
```

`onboardingService`가 `snoozeUntilTomorrow()` / `clearSnooze()` 메서드를 미구현하고 있어 TypeScript 빌드 에러 발생. 기능 자체가 동작하지 않는 상태.

### P2. Step 3 완료 기준 취약 (안정성 개선)

`firstIncompleteStep` 계산 시:
```ts
if (state.inventory.length === 0 && !state.fixtureData) return 3;
```

- `state.fixtureData`는 메모리 상태 → 페이지 새로고침 시 초기화
- 픽스처 파일을 업로드 후 저장까지 완료했더라도, 재고 0건이면 Step 3으로 돌아갈 수 있음
- 단, `state.inventory.length > 0`이면 정상 진행이므로 실제 영향 범위는 제한적

## Goals

### G1. snooze 기능 완성 (TS 에러 해소)

`onboardingService.ts`에 `snoozeUntilTomorrow()` / `clearSnooze()` 구현:
- `snoozeUntilTomorrow(hospitalId)`: 현재 시각 + 24시간 timestamp를 localStorage 저장
- `isSnoozed(hospitalId)`: snooze 만료 여부 확인
- `clearSnooze(hospitalId)`: snooze 제거

**예상 효과**: 빌드 에러 해소, "오늘 하루 이 창 숨기기" 기능 정상 동작

### G2. Step 3 완료 기준 안정화 (선택적)

`_ob_v2_fixture_saved_{hospitalId}` localStorage 플래그 추가:
- Step 3 완료 → `setItem('_ob_v2_fixture_saved_${hid}', 'true')`
- `firstIncompleteStep` 계산 시 해당 플래그 확인
- DB `onboarding_flags` 비트마스크와 동기화 (현재 FIXTURE_DL bit는 다운로드 확인용)

## Out of Scope

- DB 저장 실패 시 재시도 로직 (현재 fire-and-forget 유지)
- 온보딩 단계 수 변경
- 온보딩 UI 대규모 리디자인

## Success Criteria

1. `npx tsc --noEmit` 에러 0건 (snooze 관련)
2. "오늘 하루 이 창 숨기기" 체크 → 24시간 후 자동 재개 정상 동작
3. 픽스처 저장 완료 후 새로고침 시 Step 3 재표시 없음 (G2 선택적)

## Implementation Notes

### onboardingService.ts 추가 메서드

```ts
const KEY_SNOOZE = (id: string) => `denjoy_ob_v2_snooze_${id}`;

snoozeUntilTomorrow(hospitalId: string): void {
  const until = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(KEY_SNOOZE(hospitalId), String(until));
},

isSnoozed(hospitalId: string): boolean {
  const val = localStorage.getItem(KEY_SNOOZE(hospitalId));
  if (!val) return false;
  return Date.now() < Number(val);
},

clearSnooze(hospitalId: string): void {
  localStorage.removeItem(KEY_SNOOZE(hospitalId));
},
```

### App.tsx 연관 코드 (변경 없음)

```ts
// 이미 올바르게 호출 중 - 메서드만 구현하면 됨
if (snooze) onboardingService.snoozeUntilTomorrow(state.user.hospitalId);
// ...
onboardingService.clearSnooze(state.user.hospitalId);
// ...
if (onboardingService.isSnoozed(state.user.hospitalId)) return;
```

## Files to Modify

| 파일 | 변경 내용 |
|------|----------|
| `services/onboardingService.ts` | `snoozeUntilTomorrow`, `clearSnooze` 메서드 추가 (G1 필수) |
| `App.tsx` | snooze 관련 TS 에러 자동 해소 (G1 완료 시) |
| `services/onboardingService.ts` | `setFixtureSaved` 플래그 추가 (G2 선택) |
| `App.tsx` | `firstIncompleteStep` Step 3 기준 강화 (G2 선택) |
