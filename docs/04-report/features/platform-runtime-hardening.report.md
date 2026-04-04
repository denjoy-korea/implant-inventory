# platform-runtime-hardening Completion Report

> **Status**: Complete
>
> **Project**: DenJOY Platform
> **Completion Date**: 2026-04-04
> **Scope**: App shell, public shell, session lifecycle, hospital data loading, dashboard data flow, payment/refund contracts, test guardrails, bundle gates

---

## 1. Executive Summary

이번 사이클의 목적은 멀티서비스 확장 브랜치가 더 커지기 전에 충돌면과 회귀 위험을 줄이는 것이었다. 결과적으로 앱의 상위 셸, 공개 퍼널, 세션/병원 로더, 대시보드 오케스트레이션, 결제/환불 계약, 테스트/스모크 가드가 각각 별도 경계로 분리되었고, premerge 검증에 bundle budget까지 포함됐다.

핵심 결과:

- `App.tsx`, `useAppLogic.tsx`, `useAppState.ts`의 god-orchestrator 성격을 크게 줄였다.
- 공개 브랜드/솔루션/서비스 허브는 공개 셸 경계 안에서 lazy boundary로 분리했다.
- 결제 quote, intent, redirect, confirm, refund 흐름은 공유 helper와 edge contract 기준으로 묶었다.
- 구조 계약 테스트와 서버 렌더 테스트를 추가해 리팩터링 회귀를 빠르게 탐지할 수 있게 했다.
- `dist/assets` 기준 bundle budget을 숫자로 잠가 성능 회귀를 premerge에서 차단하게 했다.

---

## 2. Workstream Summary

### 2.1 App Shell And Routing Hardening

| Area | Main Files | Outcome |
|------|------------|---------|
| Top-level shell | `App.tsx`, `components/app/AppShellFrame.tsx`, `components/app/AppShellOverlays.tsx` | 최상위 셸은 조립 전용으로 축소 |
| Shared view/routing rules | `types/app.ts`, `appRouting.ts` | pathname/hash/public shell 경계를 중앙 규칙으로 고정 |
| Dashboard route ownership | `components/app/AppDashboardRouteSection.tsx`, `components/app/AppSidebarChrome.tsx` | 대시보드 chrome과 route rendering ownership 분리 |

### 2.2 Public Shell Decomposition

| Area | Main Files | Outcome |
|------|------------|---------|
| Public shell coordinator | `components/app/PublicAppShell.tsx` | 공개 셸은 조합자 역할만 유지 |
| Public chrome/meta/auth | `components/app/PublicShellChrome.tsx`, `components/app/publicShellAuth.ts`, `components/app/publicShellMetaRegistry.ts`, `components/app/publicShellPlanMessaging.ts` | 공개 셸의 인증/메타/플랜 메시지 분리 |
| Route sections | `components/app/PublicShellRouteContent.tsx`, `components/app/publicRoutes/*` | auth / service-hub / solution / brand 단위 분리 |
| Lazy boundary | `components/app/PublicShellRouteContent.tsx` | 공개 섹션을 실제 청크 경계로 전환 |

### 2.3 Session And Hospital Lifecycle Hardening

| Area | Main Files | Outcome |
|------|------------|---------|
| Session orchestration | `hooks/useAppSessionLifecycle.ts`, `hooks/useAppSessionLifecycleActions.ts` | signed in/out 전이와 후처리 분리 |
| Auth session flow | `hooks/useAppAuthSessionFlow.ts`, `hooks/appSessionBootstrap.ts`, `hooks/appSignedInTransition.ts`, `hooks/appAuthStateHandlers.ts` | 초기 세션 복원과 signed-in 수락 로직 분리 |
| Polling/location sync | `hooks/useAppSessionPolling.ts`, `hooks/useAppLocationSync.ts` | 세션 토큰 검증과 브라우저 위치 동기화 분리 |
| Hospital data load | `hooks/useAppHospitalDataLoader.ts`, `hooks/appHospitalLoadGuard.ts`, `hooks/appHospitalContextLoader.ts`, `hooks/appHospitalWorkspaceLoader.ts` | 병원 접근 가드와 workspace hydration 분리 |

### 2.4 Dashboard Flow Hardening

| Area | Main Files | Outcome |
|------|------------|---------|
| Dashboard coordinator | `hooks/useAppDashboardCoordinator.ts`, `hooks/useAppDashboardSurfaceProps.ts` | 상위 coordinator는 data/surface 조합자로 축소 |
| Data ops split | `hooks/useAppDashboardDataOps.ts`, `hooks/useAppDashboardInventoryOps.ts`, `hooks/useAppDashboardFixtureFlow.ts` | 주문/반품/재고 sync와 fixture/비교 흐름 분리 |
| Overlay and workspace assembly | `hooks/useDashboardWorkspaceProps.ts`, `hooks/useAppUserOverlayProps.ts`, `hooks/useAppGlobalOverlayProps.ts` | prop bundle 조립 책임 분리 |

### 2.5 Billing, Payment, Refund Contract Hardening

| Area | Main Files | Outcome |
|------|------------|---------|
| Quote/intents | `services/planPaymentQuote.ts`, `services/paymentIntentService.ts`, `services/paymentRedirectState.ts` | 결제 계산과 redirect state 공통화 |
| Billing display/settlement | `utils/billingDisplay.ts`, `utils/billingSettlement.ts`, `utils/paymentMetadata.ts` | UI별 중복 라벨/정산 계산 제거 |
| Confirmation/refund | `supabase/functions/toss-payment-confirm/index.ts`, `supabase/functions/toss-payment-refund/index.ts` | confirming/refundType none/credit restore contract 고정 |

### 2.6 Testing And Guardrails

| Area | Main Files | Outcome |
|------|------------|---------|
| Contract guards | `scripts/app-orchestrator-boundary.test.mjs`, `scripts/app-session-lifecycle-contract.test.mjs`, `scripts/app-shell-section-contract.test.mjs`, `scripts/public-shell-section-contract.test.mjs`, `scripts/view-registry-contract.test.mjs`, `scripts/mobile-critical-flow.test.mjs` | 구조 드리프트 탐지 |
| Server-render tests | `tests/unit/publicShellChrome.test.ts`, `tests/unit/appDashboardRouteSection.test.ts` | 공개 셸/대시보드 셸 핵심 경로 회귀 방지 |
| Smoke gate | `scripts/check-architecture-guards.mjs`, `scripts/smoke-auto.mjs` | architecture smoke를 premerge 흐름에 고정 |

### 2.7 Bundle And Performance Guarding

| Area | Main Files | Outcome |
|------|------------|---------|
| Chunk strategy | `vite.config.ts` | broad first-party manual chunk 제거, lazy boundary 중심 분할 |
| Bundle gate | `scripts/check-bundle-budgets.mjs`, `package.json` | bundle size 회귀를 수치로 차단 |

---

## 3. Runtime Baseline

- 최상위 셸: `App.tsx`, `components/app/AppShellFrame.tsx`, `components/app/AppShellOverlays.tsx`
- 공개 셸: `components/app/PublicAppShell.tsx`, `components/app/PublicShellChrome.tsx`, `components/app/PublicShellRouteContent.tsx`
- 세션 축: `hooks/useAppSessionLifecycle.ts`, `hooks/useAppAuthSessionFlow.ts`, `hooks/useAppSessionPolling.ts`
- 병원 로더 축: `hooks/useAppHospitalDataLoader.ts`, `hooks/appHospitalLoadGuard.ts`, `hooks/appHospitalContextLoader.ts`, `hooks/appHospitalWorkspaceLoader.ts`
- 대시보드 축: `hooks/useAppDashboardCoordinator.ts`, `hooks/useAppDashboardDataOps.ts`, `hooks/useAppDashboardInventoryOps.ts`, `hooks/useAppDashboardFixtureFlow.ts`

이 기준선에서 새 기능을 추가할 때는 상위 셸 파일에 직접 로직을 쌓기보다, 해당 축의 하위 hook/component에 넣고 contract test를 함께 갱신하는 방식을 기본 원칙으로 삼는다.

---

## 4. Session And Access Rules

1. `SIGNED_OUT` 이벤트는 병원 로드 in-flight 상태와 세션 폴링을 먼저 정리한 뒤 signed-out preset으로 복귀한다.
2. `SIGNED_IN` 이벤트는 dedupe 후 단일 transition만 허용하고, 세션 이메일/소셜 로그인 후처리는 signed-in transition helper가 맡는다.
3. 병원 컨텍스트 로드는 access guard를 먼저 통과해야 하며, `paused` 또는 병원 미접근 사용자는 workspace hydration을 진행하지 않는다.
4. 병원 진입 이후 재고/주문/수술 스냅샷은 workspace loader에서만 hydrate한다.

---

## 5. Payment And Refund Rules

1. 가격 계산은 `services/planPaymentQuote.ts`에서 단일화하고, 결제 intent/redirect 상태는 프런트 서비스 계층에서만 조립한다.
2. 최종 승인 권한은 `supabase/functions/toss-payment-confirm/index.ts`가 가진다. 금액/소유권/상태 전이 검증은 여기서 확정한다.
3. 환불과 credit 복구는 `supabase/functions/toss-payment-refund/index.ts`가 단일 기준이다.
4. `0원 환불 + credit 복구 없음`은 `refundType: "none"` 경로로 처리하고, `0원 카드환불 + credit 복구 있음`과 구분한다.

---

## 6. Verification Results

최종 검증 기준:

```bash
npm run verify:premerge
```

포함 항목:

```bash
npm run smoke:auto
npm run lint
npm run test
npm run test:unit
npm run build
npm run smoke:bundles
```

최종 확인 결과:

- `smoke:auto` 통과
- `lint` 통과
- `test`: 168 / 168 통과
- `test:unit`: 116 / 116 통과
- `build` 통과
- `smoke:bundles` 통과

---

## 7. Bundle Budget Gate

`npm run smoke:bundles`는 아래 예산을 검사한다.

- `index-*.js`: 325 KiB 이하
- `SystemAdminDashboard-*.js`: 320 KiB 이하
- `OrderManager-*.js`: 230 KiB 이하
- `InventoryManager-*.js`: 225 KiB 이하
- `PublicAppShell-*.js`: 50 KiB 이하
- `PublicSolutionRouteSection-*.js`: 12 KiB 이하
- `xlsx-vendor-*.js`: 440 KiB 이하

이번 사이클 종료 시점 실측:

- `index`: 303.79 KiB
- `SystemAdminDashboard`: 288.44 KiB
- `OrderManager`: 208.02 KiB
- `InventoryManager`: 204.04 KiB
- `PublicAppShell`: 36.58 KiB
- `PublicSolutionRouteSection`: 6.53 KiB
- `xlsx-vendor`: 419.47 KiB

---

## 8. Residual Risks

- `xlsx-vendor`는 여전히 가장 큰 청크다. 다음 단계는 import/export 실행 시점까지 추가 지연 로드하는 것이다.
- `SystemAdminDashboard`, `OrderManager`, `InventoryManager`는 내부 탭 단위 lazy split 여지가 남아 있다.
- 구조 리팩터링이 큰 폭으로 진행된 브랜치이므로, 다음 기능 추가 전에는 contract test와 브라우저 상호작용 테스트를 같이 늘려야 한다.

---

## 9. Conclusion

이번 작업으로 “활성 확장 브랜치 위에 계속 기능을 얹는 상태”에서 “경계가 정리되고 가드가 있는 상태”로 기준선을 올렸다. 남은 과제는 대규모 구조 분해보다 성능 최적화, 브라우저 레벨 회귀 방지, CI 자동 차단 강화에 가깝다.
