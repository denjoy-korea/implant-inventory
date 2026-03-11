# Analysis: renewal-ux

## Gap Analysis Result
- **Match Rate**: 100%
- **Date**: 2026-03-12
- **Gaps**: 0

## Acceptance Criteria

| ID | 항목 | 상태 | 위치 |
|----|------|------|------|
| AC-1 | D-30 이하: amber 배너 + amber 카드 테두리 + "갱신 / 변경" 버튼 | PASS | UserProfile.tsx:579-605, UserPlanPickerPanel.tsx:66 |
| AC-2 | D-7 이하: red 배너 + red 카드 테두리 | PASS | UserProfile.tsx:585, UserPlanPickerPanel.tsx:65 |
| AC-3 | 배너 클릭 → setShowPlanPicker(true) | PASS | UserProfile.tsx:583 |
| AC-4 | 동일 플랜+사이클: "Business 플랜 갱신하기" | PASS | UserPlanPickerPanel.tsx:199 |
| AC-5 | 동일 플랜, 월간→연간: "Business 플랜 연간으로 전환하기" | PASS | UserPlanPickerPanel.tsx:201-204 |
| AC-6 | 업그레이드: "Plus 플랜으로 변경하기" (기존 "결제하기" 개선) | PASS | UserPlanPickerPanel.tsx:207 |
| AC-7 | 갱신 완료 토스트: "Business 플랜이 갱신되었습니다." | PASS | App.tsx:269-271 |
| AC-8 | directPayment state에 isRenewal?: boolean | PASS | useAppLogic.tsx:59 |
| AC-9 | handleOpenDirectPayment 3번째 인자 isRenewal | PASS | useAppLogic.tsx:283 |
| AC-10 | onChangePlan: plan === currentPlan → isRenewal=true | PASS | useAppLogic.tsx:600 |
| AC-11 | Free / Ultimate / 체험 중 → 배너 미표시 | PASS | UserProfile.tsx:579 |

## Summary
모든 AC 11개 통과. 구현 완료.
