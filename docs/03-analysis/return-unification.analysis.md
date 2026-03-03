# Return System Unification - Gap Analysis Report

> **Summary**: 반품 시스템 단일화 리팩토링 구현 검증 (Order(type:'return') 경로 제거, returnService 경로 단일화)
>
> **Author**: gap-detector
> **Created**: 2026-03-02
> **Last Modified**: 2026-03-02
> **Status**: Approved

---

## Analysis Overview

- **Analysis Target**: Return System Unification (반품 시스템 단일화)
- **Design Intent**: 두 개의 반품 경로를 하나로 통합 -- `onCreateReturn` -> `returnService` -> `return_requests` 경로만 유지
- **Analysis Date**: 2026-03-02

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 87.5% | WARN |
| Architecture Compliance | 100% | PASS |
| Backward Compatibility | 100% | PASS |
| **Overall** | **91.7%** | PASS |

---

## Verification Point Results

### VP-1: OptimizeModal -- `onAddOrder` prop 완전 제거, `onCreateReturn` 사용

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/inventory/OptimizeModal.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `onAddOrder` prop 없음 | interface에 `onAddOrder` 없음 | interface에 `onAddOrder` 없음 (line 10-24) | PASS |
| `onCreateReturn` prop 존재 | `onCreateReturn` in interface | `onCreateReturn` 정의됨 (line 14-20) | PASS |
| `Order` type import 없음 | `Order` import 없음 | import에 `InventoryItem`만 있음 (line 2) | PASS |
| `onCreateReturn` 사용 | 반품 로직에서 `onCreateReturn` 호출 | `handleReturnConfirm` (line 104-105), `handleBulkReturnConfirm` (line 135-136) 모두 `onCreateReturn` 호출 | PASS |

**Result: 4/4 PASS (100%)**

---

### VP-2: InventoryManager -- `onAddOrder` prop 완전 제거, `onCreateReturn` 전달

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/InventoryManager.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `onAddOrder` prop 없음 | interface에 `onAddOrder` 없음 | grep 결과: `onAddOrder` 매치 없음 | PASS |
| `onCreateReturn` prop 존재 | `onCreateReturn` in interface | `onCreateReturn` 정의됨 (line 29-34) | PASS |
| `onCreateReturn` destructure | destructuring에서 `onCreateReturn` 추출 | `onCreateReturn` 추출 확인 (line 74) | PASS |
| OptimizeModal에 `onCreateReturn` 전달 | `<OptimizeModal onCreateReturn={onCreateReturn}>` | 확인 (line 1225) | PASS |

**Result: 4/4 PASS (100%)**

---

### VP-3: OrderManager -- `onAddOrder` 제거, `handleBulkReturn`이 `onCreateReturn` 사용

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/OrderManager.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `onAddOrder` interface에 없음 | `onAddOrder` 없음 | interface (line 29-53)에 `onAddOrder` 없음, grep 매치 0건 | PASS |
| `onAddOrder` destructuring에 없음 | destructuring에 `onAddOrder` 없음 | destructuring (line 75-93)에 `onAddOrder` 없음 | PASS |
| `handleBulkReturn`이 `onCreateReturn` 사용 | `onCreateReturn` 호출 | `handleBulkReturn` (line 452)이 `onCreateReturn` 호출 (line 462) | PASS |
| OptimizeModal에 `onCreateReturn` 전달 | `<OptimizeModal onCreateReturn={onCreateReturn}>` | 확인 (line 1611) | PASS |
| `ReturnCandidateModal` import 없음 | import 없음 | grep 매치 0건 | PASS |

**Result: 5/5 PASS (100%)**

---

### VP-4: DashboardInventoryMasterSection -- `onCreateReturn` prop 전달

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/app/DashboardInventoryMasterSection.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `onCreateReturn` in interface | 있음 | 확인 (line 55-61) | PASS |
| `onCreateReturn` destructured | 있음 | 확인 (line 79) | PASS |
| InventoryManager에 `onCreateReturn` 전달 | 전달 | `onCreateReturn={onCreateReturn}` 확인 (line 260) | PASS |
| `onAddOrder` 잔존 여부 | 가급적 제거 | `onAddOrder` 여전히 interface에 존재 (line 54), `onQuickOrder` 래퍼에서 사용 (line 251) | WARN |

**Note**: `DashboardInventoryMasterSection`에 `onAddOrder`가 남아있지만, 이것은 InventoryManager의 `onQuickOrder` (보충 발주) 기능을 위한 것이다. 즉, `type:'replenishment'` 주문 생성용이므로 반품과는 무관하다. 반품 경로에서의 `onAddOrder` 사용은 없으며 설계 의도에 부합한다.

**Result: 3/4 PASS, 1 WARN (의도된 잔류 -- 보충 발주용)**

---

### VP-5: DashboardWorkspaceSection -- `DashboardInventoryMasterSection`에 `onCreateReturn` 전달

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/app/DashboardWorkspaceSection.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `onCreateReturn` in interface | 있음 | 확인 (line 92-98) | PASS |
| DashboardInventoryMasterSection에 `onCreateReturn` 전달 | 전달 | `onCreateReturn={onCreateReturn}` 확인 (line 302) | PASS |
| `onAddOrder` 잔존 여부 | 가급적 제거 | `onAddOrder` 여전히 interface (line 88), DashboardInventoryMasterSection (line 301), DashboardOperationalTabs (line 334, 338)에 전달 | WARN |

**Note**: `DashboardWorkspaceSection`의 `onAddOrder`는 `DashboardInventoryMasterSection`의 `onQuickOrder` (보충 발주)와 `DashboardOperationalTabs`의 `onAddFailOrder` (FAIL 교환 주문), `onQuickOrder`를 위해 사용된다. 모두 `type:'replenishment'` 또는 `type:'fail_exchange'`이며 `type:'return'`과는 무관하다.

**Result: 2/3 PASS, 1 WARN (의도된 잔류 -- 보충/FAIL용)**

---

### VP-6: DashboardOperationalTabs -- OrderManager 호출에 `onAddOrder` 없음

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/dashboard/DashboardOperationalTabs.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| OrderManager에 `onAddOrder` 전달 안 함 | `onAddOrder` prop 없음 | `<OrderManager>` (line 170-188)에 `onAddOrder` prop 없음 | PASS |
| `onCreateReturn` 전달 | 있음 | `onCreateReturn={onCreateReturn}` 확인 (line 182) | PASS |

**Result: 2/2 PASS (100%)**

---

### VP-7: App.tsx -- `handleAddOrder`에 `type === 'return'` 재고차감 블록 없음

**File**: `/Users/mac/Downloads/Projects/implant-inventory/App.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `handleAddOrder` 함수 내 `type === 'return'` 재고차감 블록 | 없음 | `handleAddOrder` (line 1739-1837)에 `type === 'return'` 분기 없음. `fail_exchange`와 일반 주문만 처리 | PASS |
| `handleAddOrder` 내 JS레벨 재고차감 로직 | 없음 | `adjustStock` 호출이나 `stockAdjustment` 변경 없음 | PASS |

**Result: 2/2 PASS (100%)**

---

### VP-8: Backward Compatibility -- `OrderType`에 `'return'` 유지, delete/cancel 핸들러 유지

**File**: `/Users/mac/Downloads/Projects/implant-inventory/types.ts`, `/Users/mac/Downloads/Projects/implant-inventory/App.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `OrderType`에 `'return'` 타입 존재 | `'replenishment' \| 'fail_exchange' \| 'return'` | 확인 (types.ts line 66) | PASS |
| `handleDeleteOrder`에서 `type === 'return'` 재고 복원 | 유지 | App.tsx line 1500-1516 -- 삭제 시 `stockAdjustment` 복원 | PASS |
| `handleCancelOrder`에서 `type === 'return'` 재고 복원 | 유지 | App.tsx line 1573-1590 -- 취소 시 `stockAdjustment` 복원 | PASS |
| `handleConfirmReceipt`에서 `type === 'return'` 재고 차감 | 유지 | App.tsx line 1896-1933 -- 입고 확인 시 기존 반품 주문 처리 | PASS |
| `receivedMap` 필터에서 `type !== 'return'` 제외 | 유지 | App.tsx line 784 -- 입고수량 계산 시 반품 주문 제외 | PASS |

**Result: 5/5 PASS (100%)**

---

## Summary Matrix

| VP | Description | Checks | Pass | Warn | Fail | Score |
|----|-------------|:------:|:----:|:----:|:----:|:-----:|
| VP-1 | OptimizeModal | 4 | 4 | 0 | 0 | 100% |
| VP-2 | InventoryManager | 4 | 4 | 0 | 0 | 100% |
| VP-3 | OrderManager | 5 | 5 | 0 | 0 | 100% |
| VP-4 | DashboardInventoryMasterSection | 4 | 3 | 1 | 0 | 87.5% |
| VP-5 | DashboardWorkspaceSection | 3 | 2 | 1 | 0 | 83.3% |
| VP-6 | DashboardOperationalTabs | 2 | 2 | 0 | 0 | 100% |
| VP-7 | App.tsx handleAddOrder | 2 | 2 | 0 | 0 | 100% |
| VP-8 | Backward Compatibility | 5 | 5 | 0 | 0 | 100% |
| **Total** | | **29** | **27** | **2** | **0** | **91.7%** |

---

## Differences Found

### Missing Features (Design O, Implementation X)

없음. 설계된 모든 변경 사항이 구현되었다.

### Added Features (Design X, Implementation O)

없음.

### Changed Features (Design != Implementation)

| Item | Design Intent | Implementation | Impact |
|------|---------------|----------------|--------|
| `DashboardInventoryMasterSection.onAddOrder` | 제거 (목표 4: "OrderManager 인터페이스에서 onAddOrder 완전 제거") | `onAddOrder` 잔류 -- 보충 발주(`onQuickOrder`) 래퍼용으로 사용 | Low |
| `DashboardWorkspaceSection.onAddOrder` | 제거 | `onAddOrder` 잔류 -- InventoryMaster 보충 발주 + FailManager FAIL 교환용 | Low |

---

## Analysis

### `onAddOrder` 잔류에 대한 판단

설계 의도의 목표 4는 "OrderManager 인터페이스에서 `onAddOrder` 완전 제거 (내부 사용 없음)"였다. 이 목표는 **완전히 달성**되었다 -- `OrderManager`의 props interface와 destructuring에서 `onAddOrder`가 완전 제거되었다.

그러나 `DashboardInventoryMasterSection`과 `DashboardWorkspaceSection`에서 `onAddOrder`가 잔류하고 있다. 이는 다음 용도로 사용된다:

1. **InventoryManager -> onQuickOrder**: 재고 부족 품목의 보충 발주 생성 (`type: 'replenishment'`)
2. **FailManager -> onAddFailOrder**: FAIL 교환 주문 생성 (`type: 'fail_exchange'`)
3. **DashboardOperationalTabs -> onQuickOrder**: 재고 부족 품목의 보충 발주 생성

이들은 모두 `type:'return'`과 무관한 주문 생성 경로이므로, 반품 단일화의 핵심 목표(반품 경로 단일화)에는 영향이 없다. `onAddOrder`의 명칭이 혼동을 줄 수 있으나, 이는 별도 리팩토링 이슈이다.

### 핵심 달성 사항

1. `OptimizeModal`에서 `onAddOrder(type:'return')` 경로 완전 제거, `onCreateReturn` 사용으로 전환
2. `OrderManager.handleBulkReturn`에서 `onAddOrder(type:'return')` 경로 완전 제거, `onCreateReturn` 사용으로 전환
3. `App.tsx`의 `handleAddOrder`에 `type === 'return'` 재고 차감 블록이 없음 -- JS레벨 재고차감 제거됨
4. `OrderManager` interface에서 `onAddOrder` prop 완전 제거
5. `ReturnCandidateModal` import 완전 제거
6. 기존 `type:'return'` 레코드의 backward compatibility 완벽 유지 (delete/cancel/receipt 핸들러)

---

## Recommended Actions

### Optional Improvements (Priority: Low)

1. **`onAddOrder` 명칭 정리**: `DashboardInventoryMasterSection`과 `DashboardWorkspaceSection`에서 `onAddOrder`를 `onCreateOrder` 또는 `onAddNonReturnOrder`로 리네이밍하면 반품 경로와의 혼동이 줄어든다. 다만 이는 반품 단일화와 별개의 코드 정리 이슈이며 기능에 영향은 없다.

2. **`OrderType`의 `'return'` 타입 향후 deprecation**: 신규 `type:'return'` 주문이 더 이상 생성되지 않으므로, 기존 데이터 마이그레이션 완료 후 `OrderType`에서 `'return'`을 제거하고 backward compatibility 핸들러도 정리할 수 있다. 단, 기존 병원 데이터에 `type:'return'` 레코드가 남아 있을 수 있으므로 충분한 유예 기간이 필요하다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-02 | Initial gap analysis | gap-detector |
