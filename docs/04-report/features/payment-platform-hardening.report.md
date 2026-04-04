# payment-platform-hardening 완료 보고서

> **상태**: 완료 ✅
>
> **프로젝트**: Implant Inventory (DenJOY)
> **작성일**: 2026-04-04
> **완료일**: 2026-04-04
> **범위**: 결제 승인, 환불, 크레딧 복구, 결제 메타데이터, 운영 리포트, 릴리스 게이트

---

## 1. 개요

### 1.1 목적

이번 작업의 목표는 결제 기능이 앞으로 계속 늘어나는 상황을 기준으로, 다음 축을 한 번에 정리하는 것이었습니다.

- 결제 상태 전이의 무결성 확보
- 환불/크레딧 복구 계산의 단일 기준 수립
- 플랜 결제와 서비스 구매 결제의 공통 intent 레이어 확보
- 결제 메타데이터와 표시 로직의 공통 계약화
- 운영 리포트와 릴리스 검증을 실제 결제 도메인 기준으로 재정렬

### 1.2 결과 요약

```text
┌──────────────────────────────────────────────────────────────┐
│ 결제 플랫폼 하드닝: 완료 ✅                                  │
├──────────────────────────────────────────────────────────────┤
│ 상태 전이 정리              confirming / refunded 반영       │
│ 환불 정산 공통화            refund + credit restore 단일식   │
│ 결제 진입 공통화            payment intent 레이어 구축       │
│ 메타데이터 표준화           product descriptor 계약 추가     │
│ 운영 리포트 정리            MRR/환불 집계 분리               │
│ 릴리스 게이트 강화          smoke:refund:strict 추가         │
│ 번들 경고 정리              HomepageHeader lazy 경고 제거    │
├──────────────────────────────────────────────────────────────┤
│ 검증                         npm run verify:release PASS     │
│ 잔여 리스크                  라이브 refunded 행 부재로 SKIP  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 관련 문서

| 단계 | 문서 | 상태 |
|------|------|------|
| 계획 | `docs/01-plan/features/credit-system-remodel.plan.md` | 참고 |
| 설계 | `docs/02-design/features/credit-system-remodel.design.md` | 참고 |
| 런타임 구조 | `docs/04-report/features/platform-runtime-hardening.report.md` | 완료 |
| 결제 라이브 준비 | `docs/04-report/payment-live-prep-execution-2026-03-06.md` | 완료 |
| 현재 문서 | `docs/04-report/features/payment-platform-hardening.report.md` | 완료 |

---

## 3. 완료한 작업

### 3.1 결제 상태 전이 정리

- `billing_history.payment_status`에 `confirming`을 정식 상태로 추가했다.
- `toss-payment-confirm`가 `pending -> confirming -> completed/failed` 흐름을 일관되게 사용하도록 수정했다.
- `confirming` 상태에서 실패/해제되는 보조 경로까지 helper로 정리했다.

**핵심 파일**
- `supabase/migrations/20260404090000_billing_history_add_confirming_status.sql`
- `supabase/functions/toss-payment-confirm/index.ts`
- `types/plan.ts`

### 3.2 환불 권한 및 환불 계약 정리

- 환불 실행 권한을 `master/admin`으로 제한했다.
- `0원 환불` 경로와 `크레딧만 복구되는 환불` 경로를 분리했다.
- 환불/복구 계산을 `utils/billingSettlement.ts`로 단일화했다.

**핵심 파일**
- `supabase/functions/toss-payment-refund/index.ts`
- `services/refundService.ts`
- `components/UserProfile.tsx`
- `utils/billingSettlement.ts`

### 3.3 플랜 결제 계산 공통화

- 플랜 금액 계산, 주문명 생성, 할인/크레딧 적용 규칙을 `services/planPaymentQuote.ts`로 통합했다.
- `PricingPaymentModal`, `DirectPaymentModal`, `usePublicPlanActions`, `tossPaymentService`가 같은 계산식을 재사용하도록 바꿨다.

**핵심 파일**
- `services/planPaymentQuote.ts`
- `components/pricing/PricingPaymentModal.tsx`
- `components/DirectPaymentModal.tsx`
- `hooks/usePublicPlanActions.ts`
- `services/tossPaymentService.ts`

### 3.4 payment intent 레이어 구축

- 플랜 결제와 서비스 구매 결제가 공통 `payment intent` 흐름으로 들어가도록 정리했다.
- `billing_history` 생성, redirect 상태 저장, 0원 결제 분기, provider 실행을 한 계층에서 조합하게 만들었다.

**핵심 파일**
- `services/paymentIntentService.ts`
- `services/paymentRedirectState.ts`
- `components/payment/PaymentRedirectPage.tsx`

### 3.5 결제 메타데이터 표준화

- `description` JSON에 `product` descriptor를 넣는 공통 계약을 추가했다.
- 플랜 결제와 서비스 구매가 같은 메타데이터 버전/형식을 사용하게 했다.
- 과거 서비스 구매 배열 JSON도 계속 읽히도록 backward compatibility를 유지했다.

**핵심 파일**
- `utils/paymentProducts.ts`
- `utils/paymentMetadata.ts`
- `tests/unit/paymentMetadata.test.ts`

### 3.6 결제 표시 모델 공통화

- 마이페이지, 관리자 결제 탭, 운영자 결제 탭이 raw 필드 조합 대신 공통 display model을 사용하도록 정리했다.
- 상품명, 결제수단, 플랜명, 주기, 할인/크레딧/환불 상세를 한 곳에서 해석하게 했다.

**핵심 파일**
- `utils/billingDisplay.ts`
- `components/MyPage.tsx`
- `hooks/admin/useAdminBilling.ts`
- `components/system-admin/tabs/SystemAdminBillingTab.tsx`
- `components/AdminPanel.tsx`

### 3.7 환불 영속화 강화

- `billing_history.credit_restore_amount`를 추가했다.
- RPC `process_refund_and_cancel`이 카드 환불액과 크레딧 복구액을 함께 저장하도록 바꿨다.
- 기존 환불 건 backfill과 `get_billing_history` 반환 구조도 같이 올렸다.

**핵심 파일**
- `supabase/migrations/20260404100000_billing_history_credit_restore_amount.sql`
- `types/plan.ts`

### 3.8 운영 리포트 및 정산 집계 정리

- `mrr-raw-unblock-check`가 `refunded`를 별도 상태로 보고, 현금 환불/복구 크레딧을 분리 집계하도록 수정했다.
- 기존 `cancelled` 프록시 해석을 제거했다.

**핵심 파일**
- `scripts/mrr-raw-unblock-check.mjs`
- `scripts/payment-callback-contract.test.mjs`

### 3.9 자동 환불 정합성 스모크 추가

- 라이브 환불 건을 읽어서 저장된 `refund_amount`, `credit_restore_amount`가 정산 공식과 일치하는지 확인하는 스크립트를 추가했다.
- 로컬 `smoke:auto`는 네트워크 단절 시 `SKIP` 처리하고, 릴리스 게이트는 `smoke:refund:strict`로 엄격하게 막도록 분리했다.
- 환불 건이 많아져도 계속 검증되도록 REST 페이지네이션을 넣었다.

**핵심 파일**
- `scripts/check-refund-reconciliation.mjs`
- `scripts/smoke-auto.mjs`
- `scripts/operational-smoke-checklist.mjs`
- `package.json`
- `scripts/payment-status-lifecycle-contract.test.mjs`
- `scripts/mobile-critical-flow.test.mjs`

### 3.10 공개 셸 번들 경고 정리

- `PublicShellChrome`에서 `HomepageHeader`를 lazy import하던 구조를 제거했다.
- 같은 컴포넌트를 정적/동적 import로 섞어 쓰며 생기던 빌드 경고를 해소했다.

**핵심 파일**
- `components/app/PublicShellChrome.tsx`

---

## 4. 운영 적용 상태

### 4.1 DB / Edge Function

- `20260404090000_billing_history_add_confirming_status.sql` 적용 완료
- `20260404100000_billing_history_credit_restore_amount.sql` 적용 완료
- `toss-payment-refund` Edge Function 재배포 완료

### 4.2 저장소 기준 릴리스 게이트

현재 릴리스 검증 순서는 아래와 같다.

```bash
npm run smoke:edge:strict
npm run smoke:refund:strict
npm run verify:premerge
```

`verify:premerge` 내부에서는 다음이 다시 검증된다.

```bash
npm run smoke:auto
npm run lint
npm run test
npm run test:unit
npm run build
npm run smoke:bundles
```

---

## 5. 검증 결과

### 5.1 통과한 검증

- `npm run typecheck`
- `node --test scripts/*.test.mjs`
- `npm run test:unit`
- `npm run smoke:auto`
- `npm run build`
- `npm run smoke:bundles`
- `npm run verify:release`

### 5.2 strict 검증 결과

- `smoke:edge:strict`: PASS
- `smoke:refund:strict`: SKIP
  - 사유: 현재 운영 데이터에 `is_test_payment = false`인 `refunded` 행이 아직 없음
  - 의미: 게이트와 계산식은 준비됐고, 첫 실환불 이후부터 자동 대조가 시작됨

---

## 6. 최종 정리

이번 작업으로 결제 도메인은 다음 원칙으로 정리되었다.

1. 가격 계산은 공통 quote 모듈이 한다.
2. 결제 진입은 payment intent 레이어가 조립한다.
3. 승인과 환불은 Supabase Edge Function이 최종 권한을 가진다.
4. 결제 내역 설명은 구조화된 메타데이터 계약으로 저장한다.
5. 표시와 정산은 공통 helper를 기준으로 해석한다.
6. 운영 게이트는 edge 배포 상태와 환불 정합성을 자동 검증한다.

---

## 7. 남은 운영 후속

- 첫 라이브 환불 1건 발생 후 `smoke:refund:strict`가 실제 대조 PASS를 남기는지 확인
- 이후 신규 결제 상품이 생기면 `utils/paymentProducts.ts`와 `utils/paymentMetadata.ts`에 상품 타입만 추가

현재 저장소 기준으로는 추가 필수 개발 작업 없이 릴리스 가능한 상태다.
