# 계약 테스트 감사 리포트 (TF-01) — 2026-03-05

## 목적

- 리팩터링 후 테스트 계약이 특정 단일 파일 경로에 과도하게 고정되지 않았는지 점검.
- 핵심 10개 계약 테스트에 대해 검증 소스 다중화(페이지+훅/컴포넌트+가드)를 확인.

## 감사 기준

1. 테스트 단위에서 검증 소스가 2개 이상이어야 한다.
2. 리팩터링으로 책임 이동 가능성이 큰 영역(App shell, Analyze, Pricing, Auth)은 단일 파일 고정 검증을 금지한다.
3. 검증은 구현 위치가 아니라 행위(이벤트 emit, wiring, guard, 접근성 보장)를 대상으로 한다.

## 감사 결과 (10개 핵심 테스트)

| # | 테스트 | 검증 소스 | 단일 파일 고정 여부 | 결과 |
| --- | --- | --- | --- | --- |
| 1 | mobile critical operations stay wired | `App.tsx` + `hooks/useAppLogic.tsx` + workspace/tabs | 없음 | PASS |
| 2 | analyze checklist and disabled reasons | `components/AnalyzePage.tsx` + `hooks/useAnalyzePage.ts` | 없음 | PASS |
| 3 | analyze error classification/retry | `AnalyzePage.tsx` + `useAnalyzePage.ts` + `analyzeHelpers.ts` | 없음 | PASS |
| 4 | funnel instrumentation | `PricingPage.tsx` + `usePricingPage.ts` + `AnalyzePage.tsx` + `useAnalyzePage.ts` + `useAuthForm.ts` + `useAppState.ts` | 없음 | PASS |
| 5 | app shell guard states and settings wiring | `App.tsx` + `DashboardGuardedContent.tsx` + tabs | 없음 | PASS |
| 6 | payment failure fallback path | `PricingPage.tsx` + `usePricingPage.ts` + `PricingPaymentModal.tsx` | 없음 | PASS |
| 7 | core public conversion events | `PricingPage.tsx` + `usePricingPage.ts` + `ContactPage.tsx` + `useAuthForm.ts` | 없음 | PASS |
| 8 | mobile bottom nav toast offset | `PricingPage.tsx` + `ContactPage.tsx` + `NoticeBoard.tsx` + `App.tsx` + `useAppLogic.tsx` + overlays | 없음 | PASS |
| 9 | trial duration 14/28 alignment | `trialPolicy.ts` + `types.ts` + `types/plan.ts` + `planService.ts` + SQL + admin domain | 없음 | PASS |
| 10 | modal keyboard/aria primitives | waitlist/trial/legal/auth + `ModalShell.tsx` | 없음 | PASS |

판정: 핵심 10개 테스트 기준 `단일 파일 고정 검증 0건`.

## 후속 유지 규칙

1. 새로운 계약 테스트 작성 시 2개 이상 소스(페이지+훅/가드+호출부) 조합을 기본값으로 한다.
2. "컴포넌트 단일 파일 문자열" 매칭은 UI 텍스트/접근성 등 위치 고정성이 높은 항목으로 제한한다.
