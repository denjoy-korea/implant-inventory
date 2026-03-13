# Plan: order-return-bugfix

## Overview
- **Feature**: 주문/교환/반품 버그 수정
- **Created**: 2026-03-14
- **Priority**: Critical
- **Estimated Scope**: Medium (다수 파일, 로직 수정 위주)

## Problem Statement

진단 분석 결과 주문/교환/반품 흐름 전반에 걸쳐 재고 미반영, UI 비작동, 로직 오류가 발견됐다.

### 현재 문제점

#### [재고 미반영 — 핵심 버그]

1. **반품 신청 시 재고 즉시 미차감**
   - `handleCreateReturn`이 `invItem`을 못 찾으면 에러/경고 없이 silent skip
   - 원인: `useFailManager.ts`에서 `brand: activeM` (제조사명)을 brand 필드에 입력
   - `inv.brand === item.brand` 비교에서 제조사명 vs 브랜드명 불일치 → 항상 매칭 실패

2. **반품 완료 시 재고 미반영**
   - `complete_return_and_adjust_stock` RPC는 상태(status)만 변경 (설계적)
   - `handleCompleteReturn` 성공 후 inventory state 재로드/갱신 없음
   - 반품 신청 시 차감 실패 + 완료 시 갱신 없음 → 양쪽 모두 누락

#### [UI 비작동 — P0]

3. **FailReturnModal 반품 신청 버튼 클릭 무반응**
   - 최근 수정으로 `onSubmit` 시그니처가 불일치
   - 부모(FailManager)는 `(exchangeQty, failQty) => void` 전달
   - 컴포넌트 내부는 `() => void` 기대

4. **ReturnCompleteModal / ReturnResultModal render 내 setState**
   - render 함수에서 `setLastGroupId()` 직접 호출
   - React 18+ strict mode 경고 / 무한 렌더링 위험

#### [로직 오류 — P0]

5. **OrderReportDashboard 이중 반품 처리**
   - `ReturnCompleteModal.onCompleteReturn()` 후 `OrderDetailModal.onCompleteReturn()` 체인 호출
   - 동일 반품 2회 처리 위험

6. **OrderReportDashboard 타입 캐스팅 오류**
   - `g as (GroupedOrder & GroupedReturnRequest)` 교집합 타입이 의미 없음
   - `isOrder` 판정만으로 타입 보장 불가

7. **approvedCount 분배 오차**
   - 여러 return_request가 묶인 경우 일부 초과/누락 할당

#### [데이터 정합성 — P1]

8. **returnService.ts picked_up_date 컬럼 부재**
   - `return_requests` 테이블에 없는 컬럼 UPDATE 시도

9. **useReturnHandlers Race Condition**
   - 낙관적 업데이트 + 실패 시 stale returnRequestsRef로 잘못된 상태 복구

10. **handleCompleteReturn 재고 보정 누락**
    - actualQties 없으면 diff 계산 자체를 건너뜀

## Goals

1. FailManager 반품 신청 기능 완전 복원 (브랜드 매칭 수정 + props 동기화)
2. 반품 신청 시 재고 즉시 차감 보장 + 매칭 실패 시 명시적 경고
3. 반품 완료 시 inventory UI 반영
4. render 내 setState anti-pattern 제거
5. OrderReportDashboard 이중 처리 / 타입 오류 수정
6. returned_requests DB 스키마 정합성 확보 (picked_up_date 마이그레이션)

## Non-Goals

- ReturnCompleteModal과 ReturnResultModal 통합 리팩토링 (별도 PDCA)
- useOrderManager 70+ state 분리 (별도 PDCA)
- Race condition 완전 해결 (Supabase Realtime 전환 필요, 별도 PDCA)
- ReturnRequestModal 제조사 필터 DB 정규화 (별도 PDCA)

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| U1 | 병원 담당자 | Fail 반품 신청 버튼 클릭 시 정상 동작 | 교환/반품 업무 처리 가능 |
| U2 | 병원 담당자 | 반품 신청 후 재고가 즉시 반영 | 실시간 재고 현황 파악 |
| U3 | 병원 담당자 | 반품 완료 처리 후 재고 UI 갱신 | 완료된 반품의 재고 반영 확인 |
| U4 | 병원 담당자 | 반품 상세 모달에서 오류 없이 완료 처리 | 안정적인 반품 처리 흐름 |

## Scope

### Phase 1 — 즉시 수정 (P0, 기능 복원)

- [ ] **`useFailManager.ts`**: `handleReturnSubmit`에서 `brand: activeM` → 의미있는 값 (또는 공통 처리 방식 결정)
- [ ] **`components/fail/FailReturnModal.tsx`**: `onSubmit` props 시그니처 동기화
  - 내부 상태로 exchangeQty/failQty 관리 → 확인 버튼 클릭 시 `onSubmit(exchangeQty, failQty)` 호출 유지
  - 또는 부모에서 개별 state 관리로 변경 (택 1)
- [ ] **`components/order/ReturnCompleteModal.tsx`**: render 내 `setLastGroupId()` → `useEffect`로 이동
- [ ] **`components/order/ReturnResultModal.tsx`**: 동일 수정

### Phase 2 — 재고 반영 수정 (핵심)

- [ ] **`hooks/useReturnHandlers.ts`**: `handleCreateReturn` invItem 매칭 실패 시 `console.warn` 추가 + 사용자 토스트 경고
- [ ] **`hooks/useReturnHandlers.ts`**: `handleCompleteReturn` 성공 시 `syncInventoryWithUsageAndOrders()` 호출 추가
- [ ] **`hooks/useReturnHandlers.ts`**: `actualQties`가 없어도 반품 완료 후 inventory 재갱신
- [ ] **`useFailManager.ts`**: brand/size 파라미터 정확히 전달 (size도 '기타' 대신 실제값 또는 제조사 단위 처리)

### Phase 3 — 로직 오류 수정 (P0)

- [ ] **`components/order/OrderReportDashboard.tsx`**: 이중 반품 처리 체인 제거
- [ ] **`components/order/OrderReportDashboard.tsx`**: TypeScript discriminated union 패턴으로 타입 캐스팅 수정
- [ ] **`components/order/OrderReportDashboard.tsx`**: approvedCount 분배 알고리즘 — 여러 request 처리 수정

### Phase 4 — DB 정합성

- [ ] **마이그레이션 추가**: `return_requests.picked_up_date DATE` 컬럼 추가
  - 또는 `returnService.ts:87` 코드 제거 (비즈니스 요구사항 없으면)
- [ ] **`returnService.ts`**: picked_up_date 처리 방식 확정 후 코드 정리

### Out-of-Scope

- ReturnCompleteModal ↔ ReturnResultModal 통합
- useOrderManager state 분리
- 완전한 트랜잭션 보장 (Supabase RPC 확장)

## Technical Approach

### 재고 미반영 수정 핵심

```
현재 흐름 (버그):
FailReturnModal.onSubmit()
  → useFailManager.handleReturnSubmit()
  → onCreateReturn({ brand: activeM, size: '기타' })  ← 제조사명이 brand에
  → handleCreateReturn()
  → inventory.find(inv => inv.brand === item.brand)   ← 항상 불일치
  → invItem = undefined → 재고 차감 0

수정 후 흐름:
FailReturnModal.onSubmit(exchangeQty, failQty)         ← props 동기화
  → useFailManager.handleReturnSubmit(exchangeQty, failQty)
  → onCreateReturn({ brand: '', size: '' })            ← brand/size 처리 결정 필요
  → handleCreateReturn()
  → inventory.find(...) → 매칭 성공
  → adjustStock() + setState()                         ← 재고 차감
```

**brand/size 처리 방안 (택 1)**:
- A안: FailReturnModal에서 제조사 단위 처리 → brand='', size='' 허용 후 제조사 전체 합산 조정
- B안: FailManager에서 해당 제조사의 inventory 항목 중 수량 많은 순으로 품목 선택
- C안: ReturnRequest를 품목이 아닌 제조사 단위로 취급 (현재 실제 운영 방식과 일치 가능)

→ **구현 시 B안 우선 검토** (가장 직관적)

### ReturnCompleteModal / ReturnResultModal 수정

```typescript
// Before (anti-pattern):
// render 내부에서 직접:
if (g?.orderId !== lastGroupId) setLastGroupId(g?.orderId);  // ❌

// After:
useEffect(() => {
  if (g?.orderId && g.orderId !== lastGroupId) {
    setLastGroupId(g.orderId);
  }
}, [g?.orderId]);  // ✅
```

### 반품 완료 후 inventory 재갱신

```typescript
// handleCompleteReturn 성공 시 추가:
if (result.ok) {
  syncInventoryWithUsageAndOrders();  // inventory state 재계산
}
```

## 영향 파일

| 파일 | 변경 종류 | 우선순위 |
|------|---------|---------|
| `hooks/useFailManager.ts` | 버그 수정 (brand/size 값) | P0 |
| `components/fail/FailReturnModal.tsx` | props 시그니처 동기화 | P0 |
| `components/order/ReturnCompleteModal.tsx` | useEffect로 이동 | P0 |
| `components/order/ReturnResultModal.tsx` | useEffect로 이동 | P0 |
| `components/order/OrderReportDashboard.tsx` | 이중처리·타입캐스팅·분배 수정 | P0 |
| `hooks/useReturnHandlers.ts` | 매칭 경고 + 완료 후 재갱신 | P1 |
| `supabase/migrations/YYYYMMDDHHMMSS_add_picked_up_date.sql` | 컬럼 추가 | P1 |
| `services/returnService.ts` | picked_up_date 처리 정리 | P1 |

## Acceptance Criteria

- [ ] FailManager에서 반품 신청 버튼 클릭 → 반품 신청 DB 저장 확인
- [ ] 반품 신청 후 해당 제조사 재고가 즉시 차감되어 UI에 반영
- [ ] 반품 완료 처리 후 재고 UI 갱신 (syncInventory 호출)
- [ ] ReturnCompleteModal / ReturnResultModal 열릴 때 console.error 없음
- [ ] OrderReportDashboard에서 반품 완료 시 1회만 처리됨
- [ ] 반품 완료 처리 실패 시 토스트 에러 표시
- [ ] TypeScript 컴파일 에러 없음 (`tsc --noEmit` 통과)

## Dependencies

- 진단 분석 결과 (완료)
- brand/size 처리 방안 결정 필요 (구현 착수 전 확인)

## Risk

- **Medium**: 재고 차감 로직 변경은 데이터 정합성에 직접 영향
  - 완화: 테스트 환경에서 반품 신청 → 조회 → 완료 전체 흐름 검증 후 배포
- **Low**: ReturnCompleteModal useEffect 변경은 UI 전용, 데이터 무관
- **Low**: OrderReportDashboard 타입 수정은 런타임 영향 없음
