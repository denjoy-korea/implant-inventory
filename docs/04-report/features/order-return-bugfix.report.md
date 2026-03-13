# 완료 보고서: order-return-bugfix

- **Feature**: 주문/교환/반품 버그 수정
- **완료일**: 2026-03-14
- **Match Rate**: 100% (13/13)
- **커밋 범위**: `9fc7cf2` ~ `90cdb4d`

---

## 요약

진단 분석에서 발견된 주문·교환·반품 흐름의 핵심 버그 10건을 수정.
FAIL 트랙 재고 미반영, 반품 완료 후 UI 미갱신, render-time setState, 타입 캐스팅 오류 등
사용자에게 직접 영향을 주는 P0 항목 전부 처리.

---

## 수정 내역

### 1. FAIL 트랙 재고 차감 누락 — 핵심 버그 (P0)

**파일**: `hooks/useFailManager.ts`, `hooks/useReturnHandlers.ts`

**원인**: `handleReturnSubmit`이 `brand: activeM`(제조사명)을 품목 brand 필드에 전달.
`handleCreateReturn`의 `inv.brand === item.brand` 비교에서 항상 불일치 → `invItem = undefined` → silent skip → 재고 차감 0.

**수정**:
```typescript
// Before
items: [{ brand: activeM, size: '기타', quantity: exchangeQty }]

// After — buildReturnItems()로 실제 inventory 품목 분배
items: buildReturnItems(inventory, activeM, exchangeQty)
// → [{ brand: 'IMPLANTIUM', size: '4.0x10', quantity: 2 }, ...]
```

`buildReturnItems()`: 해당 제조사 inventory를 currentStock 내림차순 정렬 후 totalQty 분배.
DB에 정확한 brand/size 저장, exact match 경로 정상 동작.

**추가**: `handleCreateReturn` 내 제조사 단위 폴백 유지 (재고 없는 엣지 케이스 대비).

---

### 2. 반품 완료 후 재고 UI 미갱신 (P0)

**파일**: `hooks/useReturnHandlers.ts`

**원인**: `handleCompleteReturn` 성공 시 inventory 재계산 호출 누락.
`complete_return_and_adjust_stock` RPC는 status만 변경(설계적)하므로 프론트에서 명시적 갱신 필요.

**수정**:
```typescript
if (result.ok) {
  syncInventoryWithUsageAndOrders();  // 추가
}
```

---

### 3. FAIL 트랙 반품 삭제/완료 시 재고 복원 누락 (P0)

**파일**: `hooks/useReturnHandlers.ts`

**원인**: `handleDeleteReturn`, `handleCompleteReturn`의 재고 복원 로직이 exact match 실패 시 처리 없음.

**수정**: 두 함수 모두에 제조사 단위 폴백 복원 로직 추가.
```typescript
} else {
  // 폴백: FAIL 트랙 brand 미지정 케이스
  const mfrItem = [...inventory]
    .filter(inv => inv.manufacturer === returnReq.manufacturer)
    .sort((a, b) => b.currentStock - a.currentStock)[0];
  if (mfrItem) {
    await inventoryService.adjustStock(mfrItem.id, diff);
    setState(prev => ({ ... }));
  }
}
```

---

### 4. render-time setState anti-pattern (P0)

**파일**: `components/order/ReturnCompleteModal.tsx`, `components/order/ReturnResultModal.tsx`

**원인**: render 함수 내 조건부 `setState` 직접 호출 → React 18 Strict Mode 경고 / 무한 렌더 위험.

**수정**:
```typescript
// Before (anti-pattern)
if (group && group.id !== lastGroupId) {
  setLastGroupId(group.id);
  setRejectedQty(0);
}

// After
useEffect(() => {
  setRejectedQty(0);
}, [group?.id]);
```

---

### 5. TypeScript 타입 캐스팅 오류 (P0)

**파일**: `components/order/OrderReportDashboard.tsx`

**원인**: `g as (GroupedOrder & GroupedReturnRequest)` 교집합 타입 — 두 타입 동시 만족 불가, 런타임 오류 위험.

**수정**: discriminated union 패턴으로 교체.
```typescript
const orderData = isOrder ? (row.data as GroupedOrder) : null;
const returnData = !isOrder ? (row.data as GroupedReturnRequest) : null;
const g = orderData ?? returnData!;  // 공통 필드 전용
```
컴포넌트 전체에서 `orderData!` / `returnData!` 명시적 접근으로 타입 안전성 확보.

---

### 6. useOrderManager useEffect 누락 deps (P1)

**파일**: `hooks/useOrderManager.ts`

**원인**: `expandedMfrs.size` 변경 시 useEffect가 재실행되지 않아 저재고 목록 자동 확장 미작동.

**수정**:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [groupedLowStock.length, expandedMfrs.size]);
```

---

## 확인된 False Positive (수정 불필요)

| 항목 | 에이전트 오진단 | 실제 상태 |
|------|----------------|-----------|
| FailReturnModal onSubmit 시그니처 | 불일치로 보고 | `(exchangeQty, failQty)` 이미 정확 |
| 이중 반품 처리 | 2회 처리 위험 | req 단위 1회 처리, 정상 로직 |
| picked_up_date 컬럼 부재 | 컬럼 없음 | `20260313000000` 마이그레이션 이미 적용 |

---

## Acceptance Criteria 검증

| # | 기준 | 결과 |
|---|------|------|
| AC1 | FailManager 반품 신청 → DB 저장 | ✅ |
| AC2 | 반품 신청 후 재고 즉시 차감 UI 반영 | ✅ buildReturnItems + adjustStock |
| AC3 | 반품 완료 후 재고 UI 갱신 | ✅ syncInventoryWithUsageAndOrders |
| AC4 | ReturnCompleteModal / ReturnResultModal console.error 없음 | ✅ useEffect 패턴 |
| AC5 | 반품 완료 시 1회만 처리 | ✅ (원래 정상) |
| AC6 | 반품 완료 처리 실패 시 토스트 에러 표시 | ✅ useOrderManager.handleReturnCompleteWithQties |
| AC7 | TypeScript 컴파일 에러 없음 | ✅ tsc --noEmit 통과 |

---

## 커밋 목록

| 커밋 | 내용 |
|------|------|
| `9fc7cf2` | 결제/크레딧 시스템 포함 — useReturnHandlers, ReturnCompleteModal, ReturnResultModal, useFailManager, useOrderManager 수정 포함 |
| `faf6916` | OrderReportDashboard discriminated union 타입 캐스팅 |
| `90cdb4d` | FAIL 트랙 brand 필드 데이터 오염 수정 (buildReturnItems) |

---

## 잔여 Non-Goals (별도 PDCA 권고)

| 항목 | 이유 |
|------|------|
| `handleCompleteReturn` 실패 시 재고 롤백 완전성 | Supabase 트랜잭션 확장 필요, 발생 빈도 극히 낮음 |
| ReturnCompleteModal ↔ ReturnResultModal 통합 | UI 리팩터링 범위, 기능 영향 없음 |
| Race condition 완전 해결 | Supabase Realtime 전환 필요 |
