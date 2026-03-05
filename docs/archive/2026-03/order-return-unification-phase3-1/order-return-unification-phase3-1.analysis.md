# Phase 3-1: Order + ReturnRequest 구조 통합 Analysis Report

> **Analysis Type**: Gap Analysis (Design-Implementation Checklist Verification)
>
> **Project**: implant-inventory (DenJOY / DentWeb)
> **Analyst**: gap-detector
> **Date**: 2026-03-03
> **Scope**: FailManager / ReturnCandidateModal / OrderManager / DashboardOperationalTabs / App.tsx

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Phase 3-1 구현 계획(FailManager/ReturnCandidateModal에서 Order(type:'return') 생성을 중단하고 ReturnRequest로 단일화, OrderManager의 ReturnManager 탭 활성화)의 실제 구현 결과를 7개 체크리스트 항목 대비 검증합니다.

### 1.2 Analysis Scope

| File | Path |
|------|------|
| FailManager | `/Users/mac/Downloads/Projects/implant-inventory/components/FailManager.tsx` |
| ReturnCandidateModal | `/Users/mac/Downloads/Projects/implant-inventory/components/order/ReturnCandidateModal.tsx` |
| OrderManager | `/Users/mac/Downloads/Projects/implant-inventory/components/OrderManager.tsx` |
| DashboardOperationalTabs | `/Users/mac/Downloads/Projects/implant-inventory/components/dashboard/DashboardOperationalTabs.tsx` |
| App.tsx | `/Users/mac/Downloads/Projects/implant-inventory/App.tsx` |

---

## 2. Checklist Verification (7 Items)

### Checklist 1: FailManager의 반품 신청이 ReturnRequest로 생성되는가 (onCreateReturn 호출)

**Status: PASS (with fallback)**

| Evidence | Location | Detail |
|----------|----------|--------|
| `onCreateReturn` prop 정의 | `FailManager.tsx:38-44` | `onCreateReturn?: (params: { manufacturer, reason, manager, memo, items }) => Promise<void>` -- optional prop |
| `handleReturnSubmit`에서 onCreateReturn 우선 호출 | `FailManager.tsx:503-520` | `if (onCreateReturn) { void onCreateReturn({...})` |
| `handleAllReturnSubmit`에서 onCreateReturn 우선 호출 | `FailManager.tsx:563-570` | `if (onCreateReturn) { await onCreateReturn({...})` |
| fallback으로 `onAddFailOrder` 유지 | `FailManager.tsx:521-542`, `571-582` | `else { const newOrder: FailOrder = { type: 'return', ... }; onAddFailOrder(newOrder) }` |
| DashboardOperationalTabs에서 prop 전달 | `DashboardOperationalTabs.tsx:158` | `onCreateReturn={onCreateReturn}` |

분석:
- `onCreateReturn`이 존재하면 ReturnRequest로 생성, 없으면 기존 Order(type:'return') fallback으로 동작합니다.
- 실제 런타임에서 `DashboardOperationalTabs.tsx:158`에서 `onCreateReturn`을 전달하므로, fallback 경로는 실행되지 않습니다.
- 다만 `onCreateReturn`이 optional(`?`)이므로 타입 안전성을 위한 fallback은 합리적입니다.

**Result: PASS**

---

### Checklist 2: ReturnCandidateModal의 반품 권장이 ReturnRequest로 등록되는가

**Status: PASS**

| Evidence | Location | Detail |
|----------|----------|--------|
| `onCreateReturn` prop (required) | `ReturnCandidateModal.tsx:12-18` | `onCreateReturn: (params: { manufacturer, reason, manager, memo, items }) => Promise<void>` |
| 기존 `onReturn: (order: Order) => void` 제거됨 | `ReturnCandidateModal.tsx:6-22` | interface에 Order 관련 prop 없음 |
| `handleReturn`에서 onCreateReturn 호출 | `ReturnCandidateModal.tsx:126-132` | `await onCreateReturn({ manufacturer, reason, manager, memo, items })` |
| reason 매핑: `excess_stock` 사용 | `ReturnCandidateModal.tsx:125` | `const reason = activeTab === 'overstock' ? 'excess_stock' : 'excess_stock'` |
| `returnRequests` prop 추가 | `ReturnCandidateModal.tsx:9` | `returnRequests: ReturnRequest[]` -- 반품 대기 수량 표시용 |

분석:
- Order 객체를 생성하는 코드가 완전히 제거되었고, `onCreateReturn`으로 전환되었습니다.
- reason 매핑은 모든 카테고리에서 `excess_stock`으로 통일됩니다 (계획대로).
- 단, line 125에서 삼항 연산자의 양쪽이 동일한 값(`'excess_stock'`)이므로 불필요한 조건식입니다. 기능상 문제는 없으나 코드 정리 대상입니다.

**Result: PASS**

---

### Checklist 3: OrderManager의 "반품 관리" 탭이 활성화되었는가 (false && 가드 제거)

**Status: PARTIAL PASS (가드 변경되었으나 CSS hidden 적용)**

| Evidence | Location | Detail |
|----------|----------|--------|
| 탭 버튼 컨테이너 | `OrderManager.tsx:550` | `<div className="hidden gap-1 bg-gray-100 p-1 rounded-xl w-fit">` |
| 반품 관리 탭 렌더링 | `OrderManager.tsx:577` | `{activeTab === 'returns' && (` -- `false &&` 가드 제거됨 |
| ReturnManager 컴포넌트 렌더링 | `OrderManager.tsx:578-589` | `<ReturnManager returnRequests={returnRequests} ...>` |

분석:
- `{false && activeTab === 'returns' && (` 형태의 가드는 제거되었습니다. 이제 `{activeTab === 'returns' && (` 형태로 조건부 렌더링됩니다.
- **그러나** 탭 전환 버튼을 감싸는 `<div>`의 className이 `"hidden ..."` 입니다(line 550). Tailwind의 `hidden` 클래스는 `display: none`이므로, 사용자가 탭 전환 버튼을 볼 수 없습니다.
- `activeTab` 초기값이 `'orders'`(line 90)이므로, 사용자가 반품 관리 탭으로 전환할 수 있는 UI 경로가 없습니다.
- 결과적으로, 코드 레벨에서는 `false &&` 가드가 제거되었지만, UI 레벨에서는 탭 버튼이 `hidden` 상태이므로 사실상 비활성 상태입니다.

**Result: PARTIAL PASS (코드 가드 제거 O, UI 접근 경로 X)**

---

### Checklist 4: FailManager의 반품 대기중 배지가 ReturnRequest 기반으로 집계되는가

**Status: PASS**

| Evidence | Location | Detail |
|----------|----------|--------|
| `returnRequests` prop 수신 | `FailManager.tsx:36` | `returnRequests?: ReturnRequest[]` (optional, default `[]`) |
| `returnPendingByMfr` useMemo | `FailManager.tsx:202-212` | `returnRequests.filter(r => r.status === 'requested' \|\| r.status === 'picked_up')` |
| 제조사별 집계 | `FailManager.tsx:208-209` | `.forEach(r => { const qty = r.items.reduce(...); counts[m] = (counts[m] \|\| 0) + qty; })` |
| 전체 합계 | `FailManager.tsx:214` | `totalReturnPending = Object.values(returnPendingByMfr).reduce(...)` |
| 실질 미처리 건수 계산 | `FailManager.tsx:218` | `actualPendingFails = Math.max(0, currentRemainingFails - returnPendingCount)` |
| KPI 애니메이션에 반영 | `FailManager.tsx:310` | `animPending = useCountUp(Math.max(0, pendingFailList.length - totalReturnPending))` |
| DashboardOperationalTabs 전달 | `DashboardOperationalTabs.tsx:156` | `returnRequests={returnRequests}` |

분석:
- `orders.filter(type='return')` 대신 `returnRequests.filter(status='requested'|'picked_up')` 기반으로 완전 전환되었습니다.
- KPI 카드와 실질 미처리 건수 계산 모두 ReturnRequest 기반입니다.

**Result: PASS**

---

### Checklist 5: OrderManager의 exchangeCandidates가 ReturnRequest 기반 returnPendingByMfr을 사용하는가

**Status: PASS**

| Evidence | Location | Detail |
|----------|----------|--------|
| `returnRequests` prop 수신 | `OrderManager.tsx:32` | `returnRequests: ReturnRequest[]` (required) |
| `exchangeCandidates` useMemo 내 `returnPendingByMfr` | `OrderManager.tsx:311-318` | `returnRequests.filter(r => r.status === 'requested' \|\| r.status === 'picked_up')` |
| 제조사별 수량 집계 | `OrderManager.tsx:316-317` | `const qty = r.items.reduce(...)` / `returnPendingByMfr[mfr] = ... + qty` |
| `actualCount` 계산 | `OrderManager.tsx:323-324` | `actualCount: Math.max(0, count - (returnPendingByMfr[manufacturer] \|\| 0))` |
| UI 렌더링에 사용 | `OrderManager.tsx:999` | `exchangeCandidates.list.map(({ manufacturer, actualCount, returnPending })` |

분석:
- `orders` 기반이 아닌 `returnRequests` 기반으로 반품 대기 건수를 집계합니다.
- `surgeryMaster`에서 미처리 교환 건수를 구하고, `returnRequests`에서 이미 반품 신청된 건수를 차감하여 `actualCount`를 산출합니다.

**Result: PASS**

---

### Checklist 6: TypeScript 컴파일 에러가 없는가

**Status: PASS (static analysis)**

| Check | Result | Notes |
|-------|--------|-------|
| `CreateReturnParams` type 정의 | types.ts:627-633 | `{ manufacturer, reason, manager, memo, items }` -- 사용처와 일치 |
| `ReturnReason` type에 `'exchange'` 포함 | types.ts:624 | `'excess_stock' \| 'defective' \| 'exchange'` |
| FailManager props 호환 | FailManager.tsx:32-52 | `onCreateReturn` optional, `returnRequests` optional -- 하위호환 |
| ReturnCandidateModal props 호환 | ReturnCandidateModal.tsx:6-22 | `onCreateReturn` required, `returnRequests` required |
| OrderManager props 호환 | OrderManager.tsx:29-48 | `returnRequests: ReturnRequest[]` required, `onCreateReturn` uses `CreateReturnParams` |
| DashboardOperationalTabs 전달 | DashboardOperationalTabs.tsx:53-59 | `onCreateReturn` 시그니처 일치 |

분석:
- 타입 정의와 모든 사용처의 시그니처가 일치합니다.
- FailManager의 `onCreateReturn`은 optional이므로 전달하지 않는 경우에도 컴파일 에러가 발생하지 않습니다.
- OrderManager에서 `CreateReturnParams`를 import하여 사용하므로 타입 안전합니다.

**Result: PASS**

---

### Checklist 7: 기존 Order(type:'return') 처리 코드가 App.tsx에 보존되는가 (하위호환)

**Status: PASS**

| Evidence | Location | Detail |
|----------|----------|--------|
| 주문 삭제 시 type:'return' 재고 복원 | `App.tsx:1500-1510` | `if (currentOrder.type === 'return') { ... adjustStock }` |
| 주문 취소 시 type:'return' 재고 복원 | `App.tsx:1573-1590` | `if (currentOrder.type === 'return') { ... for (const orderItem of currentOrder.items) }` |
| 입고 확인 시 type:'return' 재고 차감 | `App.tsx:1972-1980` | `const returnOrderIds = orderIdsToReceive.filter(id => { return order.type === 'return' })` |
| 월별 통계에서 type:'return' 제외 | `App.tsx:784` | `o.status === 'received' && o.type !== 'return'` |
| `handleAddOrder` 자체 보존 | `App.tsx:1815-1894` | fail_exchange, replenishment, return 모든 type 처리 가능 |

분석:
- 기존 Order(type:'return') 레코드에 대한 삭제, 취소, 입고 확인 핸들러가 모두 보존되어 있습니다.
- `handleAddOrder`는 여전히 `type: 'return'` 주문을 생성할 수 있는 구조이지만, FailManager의 fallback 경로에서만 사용됩니다(실제 런타임에서는 호출되지 않음).
- 이전에 생성된 Order(type:'return') 레코드의 lifecycle 관리가 완벽합니다.

**Result: PASS**

---

## 3. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Checklist 1: FailManager onCreateReturn | 100% | PASS |
| Checklist 2: ReturnCandidateModal onCreateReturn | 100% | PASS |
| Checklist 3: OrderManager 반품 탭 활성화 | 70% | PARTIAL |
| Checklist 4: FailManager returnPendingByMfr | 100% | PASS |
| Checklist 5: OrderManager exchangeCandidates | 100% | PASS |
| Checklist 6: TypeScript 컴파일 호환 | 100% | PASS |
| Checklist 7: App.tsx 하위호환 보존 | 100% | PASS |
| **Overall** | **95.7%** | PASS |

---

## 4. Differences Found

### 4.1 Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| ReturnManager 탭 활성화 | `{false &&` 가드 제거 -> 탭 UI 표시 | `{false &&` 가드는 제거되었으나, 탭 버튼 컨테이너가 `className="hidden ..."` | Medium |
| ReturnCandidateModal reason 매핑 | 모든 카테고리 -> `excess_stock` | 구현 일치, 단 삼항 연산자 양쪽 동일값 (`olderThanYear`/`neverUsed` 케이스 구분 없음) | Low |

### 4.2 Minor Issues

| Item | Location | Description | Severity |
|------|----------|-------------|----------|
| 불필요한 삼항 연산자 | `ReturnCandidateModal.tsx:125` | `activeTab === 'overstock' ? 'excess_stock' : 'excess_stock'` -- 항상 동일값 | Low |
| 탭 UI hidden | `OrderManager.tsx:550` | `<div className="hidden ...">` -- 탭 전환 버튼 비표시 | Medium |
| FailManager `onCreateReturn` optional | `FailManager.tsx:38` | 실질적으로 항상 전달되지만 optional 타입 -> fallback 코드 유지 필요 | Low |

---

## 5. Recommended Actions

### 5.1 Immediate Actions

| Priority | Item | File | Detail |
|----------|------|------|--------|
| 1 | 탭 버튼 컨테이너 `hidden` 제거 | `OrderManager.tsx:550` | `className="hidden ..."` -> `className="flex ..."` 변경하여 반품 관리 탭 실제 접근 가능하게 변경 |

### 5.2 코드 정리 (선택)

| Priority | Item | File | Detail |
|----------|------|------|--------|
| 2 | 불필요한 삼항 연산자 정리 | `ReturnCandidateModal.tsx:125` | `const reason: ReturnReason = 'excess_stock';` 으로 단순화 |
| 3 | FailManager fallback 코드 정리 검토 | `FailManager.tsx:521-542, 571-582` | `onCreateReturn`이 항상 전달되는 환경이라면 fallback 코드 제거 고려 (단, optional prop의 안전망이므로 유지해도 무방) |

---

## 6. Architecture Analysis

### 6.1 Prop Drilling Chain

```
App.tsx
  handleCreateReturn (ReturnRequest 생성)
  handleAddOrder (Order 생성 -- fallback용)
    |
    v
DashboardWorkspaceSection
  onAddOrder -> onAddFailOrder
  onCreateReturn
    |
    v
DashboardOperationalTabs
  onAddFailOrder -> FailManager.onAddFailOrder
  onCreateReturn -> FailManager.onCreateReturn
  onCreateReturn -> OrderManager.onCreateReturn
    |
    v
FailManager (onCreateReturn 우선, fallback onAddFailOrder)
OrderManager (onCreateReturn -> ReturnManager)
ReturnCandidateModal (onCreateReturn only)
```

### 6.2 데이터 흐름 일관성

| 생성 경로 | 호출 함수 | 최종 대상 |
|-----------|----------|-----------|
| FailManager -> 개별 반품 | `onCreateReturn` | `returnService.createReturnRequest` |
| FailManager -> 전체 반품 | `onCreateReturn` | `returnService.createReturnRequest` |
| ReturnCandidateModal -> 반품 권장 | `onCreateReturn` | `returnService.createReturnRequest` |
| OrderManager -> ReturnManager -> 반품 등록 | `onCreateReturn` | `returnService.createReturnRequest` |
| FailManager fallback | `onAddFailOrder` | `orderService.createOrder` (type:'return') |

모든 주요 경로가 `returnService.createReturnRequest`로 통일되었습니다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial analysis - Phase 3-1 checklist verification | gap-detector |
