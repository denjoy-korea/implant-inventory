# Return System Unification - Gap Analysis Report

> **Summary**: 반품 시스템 단일화 리팩토링 구현 검증 (Order(type:'return') 경로 제거, returnService 경로 단일화) + Session 2 재고차감 시점 변경, 용어 통일, 타입 통일, 코드 품질 개선
>
> **Author**: gap-detector
> **Created**: 2026-03-02
> **Last Modified**: 2026-03-03
> **Status**: Approved

---

## Analysis Overview

- **Analysis Target**: Return System Unification (반품 시스템 단일화)
- **Design Intent**: 두 개의 반품 경로를 하나로 통합 -- `onCreateReturn` -> `returnService` -> `return_requests` 경로만 유지
- **Analysis Date**: 2026-03-02

## Overall Scores (v2.0 Combined)

| Category | Score | Status |
|----------|:-----:|:------:|
| Session 1: Return Unification | 91.7% | PASS |
| Session 2: Stock Timing Change | 91.7% | PASS |
| Session 2: Terminology Unification | 80.0% | WARN |
| Session 2: CreateReturnParams Type | 100% | PASS |
| Session 2: Code Quality | 100% | PASS |
| **Overall (v2.0)** | **92.0%** | PASS |

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

## Recommended Actions (Session 1)

### Optional Improvements (Priority: Low)

1. **`onAddOrder` 명칭 정리**: `DashboardInventoryMasterSection`과 `DashboardWorkspaceSection`에서 `onAddOrder`를 `onCreateOrder` 또는 `onAddNonReturnOrder`로 리네이밍하면 반품 경로와의 혼동이 줄어든다. 다만 이는 반품 단일화와 별개의 코드 정리 이슈이며 기능에 영향은 없다.

2. **`OrderType`의 `'return'` 타입 향후 deprecation**: 신규 `type:'return'` 주문이 더 이상 생성되지 않으므로, 기존 데이터 마이그레이션 완료 후 `OrderType`에서 `'return'`을 제거하고 backward compatibility 핸들러도 정리할 수 있다. 단, 기존 병원 데이터에 `type:'return'` 레코드가 남아 있을 수 있으므로 충분한 유예 기간이 필요하다.

---

# Session 2 Changes (2026-03-03)

## Session 2 Overview

- **Analysis Target**: 반품 재고 차감 시점 변경, 용어 통일, CreateReturnParams 타입 통일, 코드 품질 개선
- **Analysis Date**: 2026-03-03
- **Changes**: 4개 변경 그룹, 15개 개별 검증 포인트

---

## Change 1: Stock Adjustment Timing (신청 시 즉시 차감)

### VP-9: App.tsx handleCreateReturn -- 반품 신청 즉시 재고 차감

**File**: `/Users/mac/Downloads/Projects/implant-inventory/App.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `handleCreateReturn` 내 `inventoryService.adjustStock` 호출 | 신청 직후 재고 차감 | line 1684: `await inventoryService.adjustStock(invItem.id, -item.quantity)` -- `result.ok` 블록 내에서 각 item에 대해 차감 | PASS |
| `setState`로 로컬 재고 동기화 | `currentStock - item.quantity`, `stockAdjustment - item.quantity` | line 1685-1692: 정확히 구현 | PASS |
| `getSizeMatchKey` 기반 inventory 매칭 | sizeKey 비교로 해당 품목 탐색 | line 1677-1682: `getSizeMatchKey` 사용하여 manufacturer + brand + sizeKey 매칭 | PASS |

**Result: 3/3 PASS (100%)**

---

### VP-10: App.tsx handleUpdateReturnStatus -- rejected 복원 / rejected->requested 재차감

**File**: `/Users/mac/Downloads/Projects/implant-inventory/App.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `status === 'rejected'` 시 재고 복원 (`delta = +1`) | rejected 전환 시 품목별 재고 복원 | line 1727: `const needsRestore = status === 'rejected'` -> delta = 1 -> `adjustStock(invItem.id, delta * item.quantity)` (line 1739) | PASS |
| `status === 'requested' && currentStatus === 'rejected'` 시 재차감 (`delta = -1`) | rejected->requested 시 품목별 재차감 | line 1728: `const needsDeduct = status === 'requested' && currentStatus === 'rejected'` -> delta = -1 | PASS |
| `returnRequestsRef.current` 사용 (stale closure 방지) | ref로 최신 배열 참조 | line 1725: `const returnReq = returnRequestsRef.current.find(r => r.id === returnId)` | PASS |
| 낙관적 업데이트 + 롤백 패턴 | 실패 시 롤백 | line 1706-1720: 낙관적 setState, `!result.ok` 시 이전 status로 복원 + conflict 시 `loadReturnRequests()` | PASS |

**Result: 4/4 PASS (100%)**

---

### VP-11: App.tsx handleDeleteReturn -- 삭제 시 재고 복원

**File**: `/Users/mac/Downloads/Projects/implant-inventory/App.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| 삭제 성공 후 재고 복원 | `adjustStock(invItem.id, item.quantity)` (양수) | line 1803: `await inventoryService.adjustStock(invItem.id, item.quantity)` -- 삭제 성공 후 복원 | PASS |
| `returnRequestsRef.current` 사용 | ref로 최신 배열 참조 | line 1781: `const returnReq = returnRequestsRef.current.find(r => r.id === returnId)` | PASS |
| 삭제 시 requested 상태만 재고 복원 | status check 존재 | 명시적 status === 'requested' guard 없음. 서버 측 `deleteReturnRequest`에 `expectedCurrentStatus`를 전달하여 삭제 자체를 제한하지만, App.tsx 내에 status guard는 없다 | WARN |

**Note**: 설계 의도는 "삭제 시 requested 상태만 재고 복원"이었으나, `handleDeleteReturn`은 삭제 성공 후 무조건 재고를 복원한다. 실질적으로 `returnService.deleteReturnRequest`가 `eq('status', expectedCurrentStatus)` 쿼리로 삭제를 제한하므로, requested가 아닌 상태에서는 삭제 자체가 실패(`!result.ok`)하여 복원 로직에 도달하지 않는다. 따라서 실제 동작은 설계 의도와 일치하지만, 방어적 코딩 관점에서 명시적 guard가 없다.

**Result: 2/3 PASS, 1 WARN (실질적 동작 일치, 명시적 guard 부재)**

---

### VP-12: Supabase RPC complete_return_and_adjust_stock -- 재고 차감 제거

**File**: `/Users/mac/Downloads/Projects/implant-inventory/supabase/migrations/20260303000000_complete_return_status_only.sql`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| RPC 함수에 stock_adjustment UPDATE 없음 | inventory 테이블 UPDATE 없음 | 함수 본문에 `inventory` 테이블 관련 쿼리 없음. `UPDATE return_requests SET status = 'completed'`만 수행 | PASS |
| 주석에 재고 차감 제거 명시 | 재고 차감 시점 변경 설명 | line 1-6: "반품 재고 차감 시점 변경: 완료 시 -> 신청 시", line 24-25: "재고 차감은 반품 신청(create_return_with_items) 시 프론트엔드에서 처리" | PASS |
| 상태 전환 guard | `picked_up -> completed`만 허용 | line 30: `AND status = 'picked_up'` + `IF NOT FOUND THEN RAISE EXCEPTION` | PASS |
| GRANT 유지 | authenticated 권한 | line 38: `GRANT EXECUTE ON FUNCTION ... TO authenticated` | PASS |

**Result: 4/4 PASS (100%)**

---

### VP-13: App.tsx handleCompleteReturn -- 완료 시 재고 변동 없음

**File**: `/Users/mac/Downloads/Projects/implant-inventory/App.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `handleCompleteReturn` 내 `adjustStock` 호출 없음 | 재고 변동 로직 없음 | line 1756-1777: `returnService.completeReturn` 호출 후 `result.ok` 여부만 확인, `adjustStock` 호출 없음 | PASS |
| 실패 시 롤백 코멘트 | "재고는 신청 시점에 이미 차감" 설명 | line 1772: `// 롤백 (재고는 신청 시점에 이미 차감됐으므로 완료 실패 시 재고 변동 없음)` | PASS |

**Result: 2/2 PASS (100%)**

---

## Change 2: Terminology Unification (용어 통일)

### VP-14: FailManager -- "반품처리" -> "반품 처리" (버튼 텍스트)

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/FailManager.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| 주요 버튼 텍스트 "반품 처리" (공백 포함) | 3곳에서 공백 포함 | line 636, 737, 792: 모두 "반품 처리" (공백 포함) | PASS |
| 에러 토스트 메시지 | "반품 처리에 실패했습니다." | line 444, 465: "반품 처리에 실패했습니다." (공백 포함) | PASS |
| 일괄 반품 모달 내부 텍스트 | "반품처리" (합성어) | line 496 memo, 513 toast, 515 toast, 1190 제목, 1204 안내, 1209 레이블, 1240 버튼: 모두 "반품처리" (공백 없음) | WARN |

**Note**: 설계 의도는 "반품처리" -> "반품 처리" (공백 추가)로 버튼 텍스트 3곳을 변경하는 것이었으며, 이는 달성되었다 (line 636, 737, 792). 그러나 일괄 반품 모달 내부의 텍스트(제목, 안내문, 레이블, memo 문자열, toast 메시지)에서는 여전히 "반품처리"(공백 없음)가 사용되고 있다. 이들은 버튼 텍스트가 아닌 제목/안내문/내부 문자열이므로 설계 범위에 명시적으로 포함되지는 않았으나, 용어 일관성 관점에서 정리가 권장된다.

**Result: 2/3 PASS, 1 WARN (버튼 3곳 완료, 모달 내부 미통일)**

---

### VP-15: ReturnCandidateModal -- "보유" -> "유지" (스누즈 버튼)

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/order/ReturnCandidateModal.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| 스누즈 버튼 텍스트 "유지" | "유지" | line 321: `유지` | PASS |
| 푸터 안내 텍스트 | "'유지' 선택 시 1개월간 숨김" | line 337: `'유지' 선택 시 1개월간 숨김` | PASS |
| 빈 목록 안내 "보유 처리" 잔존 | "유지 처리" 또는 유사 | line 201: "모든 품목이 정상 상태이거나 보유 처리되었습니다." -- "보유" 잔존 | FAIL |

**Note**: 스누즈 버튼(line 321)과 푸터 안내(line 337)에서는 "유지"로 통일되었으나, 빈 목록 상태 안내 문구(line 201)에서 "보유 처리"가 남아있다. "보유 처리" -> "유지 처리"로 변경이 필요하다.

**Result: 2/3 PASS, 1 FAIL (line 201 "보유" 잔존)**

---

### VP-16: DashboardOverview -- size '기타'/'-' -> '규격정보없음'

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/DashboardOverview.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `entry.size === '기타' \|\| entry.size === '-'` 조건 존재 | 삼항 연산자로 '규격정보없음' 표시 | line 1370: `{entry.size === '기타' || entry.size === '-' ? '규격정보없음' : entry.size}` | PASS |

**Result: 1/1 PASS (100%)**

---

### VP-17: FailManager -- size '기타'/'-' -> '규격정보없음'

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/FailManager.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `item.size === '기타' \|\| item.size === '-'` 조건 존재 | 삼항 연산자로 '규격정보없음' 표시 | line 1140: `{item.size === '기타' || item.size === '-' ? '규격정보없음' : item.size}` | PASS |

**Result: 1/1 PASS (100%)**

---

### VP-18: OrderManager -- size '기타'/'-' -> '규격정보없음'

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/OrderManager.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `first.size === '기타' \|\| first.size === '-'` 조건 존재 | 삼항 연산자로 '규격정보없음' 표시 | line 1276: `{first.size === '기타' || first.size === '-' ? '규격정보없음' : first.size}` | PASS |

**Result: 1/1 PASS (100%)**

---

## Change 3: CreateReturnParams Type Unification (타입 통일)

### VP-19: types.ts -- CreateReturnParams interface 정의

**File**: `/Users/mac/Downloads/Projects/implant-inventory/types.ts`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `CreateReturnParams` interface 존재 | 독립 interface 정의 | line 627: `export interface CreateReturnParams { manufacturer, reason, manager, memo, items }` | PASS |

**Result: 1/1 PASS (100%)**

---

### VP-20: 4개 파일에서 CreateReturnParams import 사용

| File | Expected | Actual | Status |
|------|----------|--------|:------:|
| `OptimizeModal.tsx` | `import { CreateReturnParams } from '../../types'` | line 2: `import { InventoryItem, CreateReturnParams } from '../../types'`; line 15: `onCreateReturn?: (params: CreateReturnParams) => Promise<void>` | PASS |
| `InventoryManager.tsx` | `import { CreateReturnParams }` | line 2: `import { ..., CreateReturnParams } from '../types'`; line 25: `onCreateReturn?: (params: CreateReturnParams) => Promise<void>` | PASS |
| `DashboardInventoryMasterSection.tsx` | `import { CreateReturnParams }` | line 8: `CreateReturnParams`; line 55: `onCreateReturn: (params: CreateReturnParams) => Promise<void>` | PASS |
| `OrderManager.tsx` | `import { CreateReturnParams }` | line 3: `import { ..., CreateReturnParams } from '../types'`; line 25: `onCreateReturn: (params: CreateReturnParams) => Promise<void>` | PASS |

**Result: 4/4 PASS (100%)**

---

## Change 4: Code Quality (코드 품질)

### VP-21: OptimizeModal -- buildOptimizeMemo helper extraction

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/inventory/OptimizeModal.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `buildOptimizeMemo` 모듈 레벨 함수 | 컴포넌트 외부 순수 함수 | line 21-25: `const buildOptimizeMemo = (item: DeadStockItem): string => { ... }` -- 컴포넌트 밖에 정의됨 | PASS |
| 3가지 분기 (olderThanYear, neverUsed, default) | 조건별 memo 생성 | line 22: `olderThanYear` -> "마지막 사용: ...", line 23: `neverUsed` -> "한 번도 미사용", line 24: default -> "품목 최적화 반품" | PASS |
| `handleReturnConfirm`에서 사용 | `buildOptimizeMemo(item)` 호출 | line 119: `memo: buildOptimizeMemo(item)` | PASS |
| `handleBulkReturnConfirm`에서 사용 | `buildOptimizeMemo(item)` 호출 | line 146: `memo: buildOptimizeMemo(item)` | PASS |

**Result: 4/4 PASS (100%)**

---

### VP-22: OrderManager handleBulkReturn -- Promise.all 병렬화

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/OrderManager.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `handleBulkReturn`에 `Promise.all` 사용 | 순차 await 대신 병렬 처리 | line 435: `await Promise.all(Object.entries(byMfr).map(([mfr, items]) => { ... return onCreateReturn({...}); }))` | PASS |
| 제조사별 그룹핑 후 병렬 호출 | byMfr 맵으로 그룹핑 -> Promise.all | line 428-446: `byMfr` 제조사별 그룹핑 후 `Object.entries(byMfr).map(...)` | PASS |
| 에러 핸들링 | try/catch 유지 | line 434: `try { await Promise.all(...) }` -> line 448: `catch { showAlertToast(...) }` | PASS |

**Result: 3/3 PASS (100%)**

---

### VP-23: OptimizeModal handleReturnConfirm -- async/await 패턴

**File**: `/Users/mac/Downloads/Projects/implant-inventory/components/inventory/OptimizeModal.tsx`

| Check Item | Expected | Actual | Status |
|------------|----------|--------|:------:|
| `handleReturnConfirm` async 선언 | `async` keyword | line 111: `const handleReturnConfirm = async (item: DeadStockItem) => {` | PASS |
| `onCreateReturn` await 호출 | `await onCreateReturn(...)` | line 115: `await onCreateReturn({...})` | PASS |

**Result: 2/2 PASS (100%)**

---

## Session 2 Summary Matrix

| VP | Description | Checks | Pass | Warn | Fail | Score |
|----|-------------|:------:|:----:|:----:|:----:|:-----:|
| VP-9 | handleCreateReturn stock deduction | 3 | 3 | 0 | 0 | 100% |
| VP-10 | handleUpdateReturnStatus rejected | 4 | 4 | 0 | 0 | 100% |
| VP-11 | handleDeleteReturn stock restore | 3 | 2 | 1 | 0 | 83.3% |
| VP-12 | RPC complete_return_status_only | 4 | 4 | 0 | 0 | 100% |
| VP-13 | handleCompleteReturn no stock change | 2 | 2 | 0 | 0 | 100% |
| VP-14 | FailManager "반품 처리" terminology | 3 | 2 | 1 | 0 | 83.3% |
| VP-15 | ReturnCandidateModal "유지" | 3 | 2 | 0 | 1 | 66.7% |
| VP-16 | DashboardOverview "규격정보없음" | 1 | 1 | 0 | 0 | 100% |
| VP-17 | FailManager "규격정보없음" | 1 | 1 | 0 | 0 | 100% |
| VP-18 | OrderManager "규격정보없음" | 1 | 1 | 0 | 0 | 100% |
| VP-19 | CreateReturnParams interface | 1 | 1 | 0 | 0 | 100% |
| VP-20 | CreateReturnParams usage (4 files) | 4 | 4 | 0 | 0 | 100% |
| VP-21 | buildOptimizeMemo helper | 4 | 4 | 0 | 0 | 100% |
| VP-22 | handleBulkReturn Promise.all | 3 | 3 | 0 | 0 | 100% |
| VP-23 | handleReturnConfirm async/await | 2 | 2 | 0 | 0 | 100% |
| **Session 2 Total** | | **39** | **36** | **2** | **1** | **92.0%** |

---

## Session 2 Differences Found

### Missing Features (Design O, Implementation X)

| Item | Design Location | Description |
|------|-----------------|-------------|
| ReturnCandidateModal "보유" -> "유지" (빈 목록 안내) | ReturnCandidateModal.tsx:201 | "보유 처리되었습니다" -- "유지 처리"로 변경 필요 |

### Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| handleDeleteReturn status guard | requested 상태만 재고 복원 | 명시적 guard 없음 (서버 측 status 매칭으로 간접 보장) | Low |
| FailManager 일괄 반품 모달 용어 | "반품 처리" (공백 포함) 통일 | 모달 내부에 "반품처리" (공백 없음) 7곳 잔존: 제목, 안내문, 레이블, memo, toast | Low |

---

## Session 2 Analysis

### 재고 차감 시점 변경 평가

재고 차감의 생명주기가 명확하게 구현되었다:

| 이벤트 | 재고 변동 | 구현 위치 |
|--------|----------|----------|
| 반품 신청 (requested) | -quantity | `handleCreateReturn` (App.tsx line 1676-1694) |
| 거절 (rejected) | +quantity (복원) | `handleUpdateReturnStatus` (App.tsx line 1727-1750) |
| 거절 철회 (rejected -> requested) | -quantity (재차감) | `handleUpdateReturnStatus` (App.tsx line 1728-1750) |
| 완료 (completed) | 변동 없음 | `handleCompleteReturn` (App.tsx line 1756-1777) |
| 삭제 | +quantity (복원) | `handleDeleteReturn` (App.tsx line 1794-1814) |

RPC 함수(`complete_return_and_adjust_stock`)에서 재고 차감 로직이 제거되어 상태 변경만 수행하며, 프론트엔드와의 이중 차감 위험이 해소되었다.

### 용어 통일 평가

3가지 용어 변경 중:
- **"규격정보없음"**: DashboardOverview, FailManager, OrderManager 3곳 모두 완벽 적용
- **"유지" (스누즈)**: 버튼과 푸터 완료, 빈 목록 안내 1곳 "보유" 잔존
- **"반품 처리" (공백)**: 버튼 3곳 완료, 일괄 반품 모달 내부 7곳 "반품처리" 잔존

### 타입 통일 평가

`CreateReturnParams` interface가 `types.ts`에 정의되어 5개 파일(types.ts 정의 + 4개 import)에서 일관되게 사용된다. 인라인 타입 정의가 완전히 제거되어 유지보수성이 향상되었다.

---

## Recommended Actions (Session 2)

### Immediate (Priority: High)

1. **ReturnCandidateModal line 201 "보유" -> "유지"**: `"모든 품목이 정상 상태이거나 보유 처리되었습니다."` -> `"모든 품목이 정상 상태이거나 유지 처리되었습니다."`

### Optional (Priority: Low)

2. **FailManager 일괄 반품 모달 용어 통일**: line 496, 513, 515, 1190, 1204, 1209, 1240에서 "반품처리" -> "반품 처리" (공백 추가). 기능 영향 없음.

3. **handleDeleteReturn 명시적 status guard**: `if (returnReq && returnReq.status === 'requested')` guard 추가. 현재 서버 측에서 간접 보장되므로 기능 문제는 없으나 방어적 코딩 관점에서 권장.

---

## Combined Summary (v1.0 + v2.0)

### All VPs Combined

| Session | VPs | Checks | Pass | Warn | Fail | Score |
|---------|-----|:------:|:----:|:----:|:----:|:-----:|
| Session 1 (2026-03-02) | VP-1 ~ VP-8 | 29 | 27 | 2 | 0 | 91.7% |
| Session 2 (2026-03-03) | VP-9 ~ VP-23 | 39 | 36 | 2 | 1 | 92.0% |
| **Grand Total** | **VP-1 ~ VP-23** | **68** | **63** | **4** | **1** | **91.9%** |

### Open Issues (3 items)

| Priority | Issue | Location | Action |
|----------|-------|----------|--------|
| High | "보유" -> "유지" 1곳 미변경 | ReturnCandidateModal.tsx:201 | 즉시 수정 |
| Low | "반품처리" 공백 미통일 7곳 | FailManager.tsx 모달 내부 | 선택적 수정 |
| Low | handleDeleteReturn status guard 부재 | App.tsx line 1794 | 선택적 수정 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-02 | Initial gap analysis (Session 1: VP-1 ~ VP-8) | gap-detector |
| 2.0 | 2026-03-03 | Session 2 추가: VP-9 ~ VP-23 (재고차감 시점, 용어 통일, 타입 통일, 코드 품질) | gap-detector |
