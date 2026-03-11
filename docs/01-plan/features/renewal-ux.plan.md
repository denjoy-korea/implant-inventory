# Plan: renewal-ux

## Overview
- **Feature**: 구독 갱신 UX 개선
- **Created**: 2026-03-12
- **Priority**: Medium
- **Estimated Scope**: Small (UI 조정 + 결제 흐름 연결)

## Problem Statement

현재 구독 관리 화면(`UserPlanPickerPanel`)에서 같은 플랜을 갱신할 때 UX가 불명확하다.

### 현재 문제점

1. **갱신 진입 경로 불명확**
   - Business 사용자가 Business 카드를 클릭해야 갱신 가능한지 직관적으로 알기 어렵다
   - "현재 · 갱신" 배지만 있고 별도 "지금 갱신" 버튼이 없다
   - D-30 상황에서도 갱신 CTA가 약하다

2. **사이클 전환 시 갱신 vs 신규 결제 구분 모호**
   - 월간→연간 전환 시 버튼이 "Business 플랜 결제하기"로 표시
   - 갱신인지 업그레이드인지 사용자가 판단하기 어렵다
   - `isRenewalSelected`는 **동일 플랜 + 동일 사이클**만 true → 월간→연간 전환은 "결제하기"로 표시

3. **만료 임박 시 능동적 안내 없음**
   - D-30 이하에서 갱신 유도 배너/모달 없음
   - D-7 이하에서도 동일한 정적 UI

4. **갱신 후 확인 피드백 없음**
   - 갱신 완료 시 "갱신되었습니다" 명시적 메시지가 없음
   - 일반 플랜 변경과 동일한 "변경되었습니다" 토스트

## Goals

1. 갱신 의도가 명확히 전달되는 CTA 개선
2. 월간→연간 전환(사이클 업그레이드)도 갱신 흐름에 편입
3. 만료 임박(D-30 이하) 시 능동적 갱신 유도
4. 갱신 완료 후 명확한 피드백

## Non-Goals

- 자동 갱신(Auto-renewal) 기능 — TossPayments 빌링 키 없음, 별도 프로젝트
- 이메일 갱신 알림 — 알림 시스템 별도 범위
- Free 플랜 갱신 — 해당 없음

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| U1 | Business 유료 사용자 | 만료 전 쉽게 갱신 | 서비스 중단 없이 유지 |
| U2 | 월간 구독 사용자 | 연간으로 전환 시 명확한 안내 | 20% 절약 혜택 확인 |
| U3 | D-7 이하 사용자 | 갱신 촉구 안내를 받음 | 만료를 잊지 않도록 |

## Scope

### In-Scope (이번 작업)

- [ ] `UserPlanPickerPanel`: 현재 플랜 카드에 "지금 갱신" 버튼 추가 (D-30 이하 강조)
- [ ] `UserPlanPickerPanel`: 사이클 전환(월간→연간) 시 버튼 텍스트 개선
  - "Business 플랜 연간으로 전환하기" (갱신 흐름임을 명확히)
- [ ] `UserProfile` 구독 탭: 만료 임박(D-30 이하) 갱신 배너 추가
- [ ] `useAppLogic`: 갱신 완료 토스트 메시지 구분
  - "Business 플랜이 갱신되었습니다. 5월 11일까지 이용하실 수 있습니다."

### Out-of-Scope

- 자동 갱신, 이메일 알림, 결제 수단 변경 UI

## Technical Approach

### 영향 파일
| 파일 | 변경 내용 |
|------|----------|
| `components/profile/UserPlanPickerPanel.tsx` | 갱신 CTA 강화, 버튼 텍스트 개선 |
| `components/UserProfile.tsx` | 만료 임박 배너 |
| `hooks/useAppLogic.tsx` | 갱신 완료 토스트 메시지 구분 |

### 갱신 완료 메시지 구분 방법
`useAppLogic.onChangePlan`에서 `plan === currentPlan` 분기 추가:
```typescript
const isRenewal = plan === currentPlan;
showAlertToast(
  isRenewal
    ? `${PLAN_NAMES[plan]} 플랜이 갱신되었습니다.`
    : `${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.`,
  'success'
);
```

### `isRenewalSelected` 확장
현재: 동일 플랜 + 동일 사이클
개선: 동일 플랜이면 사이클 전환도 "갱신/전환" 레이블 사용

```typescript
// 현재
const isRenewalSelected = pickerSelectedPlan === currentPlanId && isCurrentCycle;

// 개선: 동일 플랜이면 사이클 전환도 "갱신" 범주
const isSamePlanSelected = pickerSelectedPlan === currentPlanId;
const isCycleChange = isSamePlanSelected && !isCurrentCycle;
```

## Acceptance Criteria

- [ ] D-30 이하 사용자: 현재 플랜 카드에 강조된 "지금 갱신하기" 버튼 표시
- [ ] D-7 이하 사용자: 만료 임박 경고 배너 표시 (빨간색)
- [ ] 월간→연간 전환: "Business 플랜 연간으로 전환하기" 버튼 텍스트
- [ ] 갱신 완료 토스트: "Business 플랜이 갱신되었습니다." (만료일 포함)
- [ ] 기존 플랜 변경(업그레이드/다운그레이드) 흐름 회귀 없음

## Dependencies

- 없음 (독립적 UI 변경)

## Risk

- Low: UI 변경만, 결제 로직 변경 없음
