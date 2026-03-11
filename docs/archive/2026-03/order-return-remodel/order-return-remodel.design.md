# Design: order-return-remodel

**작성일**: 2026-03-12
**Phase**: Design
**Plan 참조**: `docs/01-plan/features/order-return-remodel.plan.md`

---

## 1. 아키텍처 개요

### 변경 전
```
OrderManager.tsx (950줄)
  ├── 모달 상태 10개 (개별 useState)
  ├── useOrderManager hook (582줄)
  ├── PC 레이아웃 인라인
  └── 모바일 레이아웃 인라인

OrderTableSection.tsx (393줄)
  └── 모바일 카드 + PC 테이블 혼합
```

### 변경 후
```
OrderManager.tsx (< 350줄)
  ├── useOrderManagerModals (useReducer) ← 신규
  ├── OrderPCLayout.tsx ← 신규 (PC 전용 레이아웃)
  ├── OrderMobileLayout.tsx ← 신규 (모바일 전용 레이아웃)
  ├── OrderMobileFilterBar.tsx ← 신규 (모바일 필터 칩)
  └── ReturnCompleteModal.tsx ← 신규 (실수령 수량 입력)

OrderTableSection.tsx (분리)
  ├── OrderUnifiedCard.tsx ← 신규 (모바일 카드 단위)
  └── OrderUnifiedTable.tsx ← 신규 (PC 테이블)
```

---

## 2. F-01: 모달 상태 useReducer 설계

### 현재 문제
```typescript
// useOrderManager.ts에 10개+ 개별 상태
const [cancelModalOrder, setCancelModalOrder] = useState<Order[] | null>(null);
const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);
const [selectedGroupModal, setSelectedGroupModal] = useState<GroupedOrder | null>(null);
const [showHistoryPanel, setShowHistoryPanel] = useState(false);
const [showReturnModal, setShowReturnModal] = useState(false);
const [brandOrderModalMfr, setBrandOrderModalMfr] = useState<string | null>(null);
const [showOptimizeModal, setShowOptimizeModal] = useState(false);
const [showReturnCandidateModal, setShowReturnCandidateModal] = useState(false);
const [returnCandidateCategory, setReturnCandidateCategory] = useState<ReturnCategory>('overstock');
const [showBulkReturnConfirm, setShowBulkReturnConfirm] = useState(false);
const [returnDetailGroup, setReturnDetailGroup] = useState<GroupedReturnRequest | null>(null);
const [exchangeReturnTarget, setExchangeReturnTarget] = useState<...>(null);
// + F-06 신규: returnCompleteGroup
```

### 신규: `hooks/useOrderManagerModals.ts`
```typescript
// 모달 타입 discriminated union
type ModalState =
  | { kind: 'none' }
  | { kind: 'cancel';          orders: Order[] }
  | { kind: 'receipt';         group: GroupedOrder }
  | { kind: 'brand_order';     mfr: string }
  | { kind: 'bulk_order' }
  | { kind: 'history' }
  | { kind: 'return_request' }
  | { kind: 'return_candidate'; category: ReturnCategory }
  | { kind: 'bulk_return_confirm' }
  | { kind: 'return_detail';   group: GroupedReturnRequest }
  | { kind: 'return_complete'; group: GroupedReturnRequest }  // F-06 신규
  | { kind: 'exchange_return'; target: ExchangeReturnTarget }
  | { kind: 'optimize' };

type ModalAction =
  | { type: 'OPEN_CANCEL';           orders: Order[] }
  | { type: 'OPEN_RECEIPT';          group: GroupedOrder }
  | { type: 'OPEN_BRAND_ORDER';      mfr: string }
  | { type: 'OPEN_BULK_ORDER' }
  | { type: 'TOGGLE_HISTORY' }
  | { type: 'OPEN_RETURN_REQUEST' }
  | { type: 'OPEN_RETURN_CANDIDATE'; category: ReturnCategory }
  | { type: 'OPEN_BULK_RETURN_CONFIRM' }
  | { type: 'OPEN_RETURN_DETAIL';    group: GroupedReturnRequest }
  | { type: 'OPEN_RETURN_COMPLETE';  group: GroupedReturnRequest }  // F-06 신규
  | { type: 'OPEN_EXCHANGE_RETURN';  target: ExchangeReturnTarget }
  | { type: 'OPEN_OPTIMIZE' }
  | { type: 'CLOSE' };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN_CANCEL':    return { kind: 'cancel', orders: action.orders };
    case 'OPEN_RECEIPT':   return { kind: 'receipt', group: action.group };
    // ... etc
    case 'CLOSE':          return { kind: 'none' };
    default:               return state;
  }
}

export function useOrderManagerModals() {
  const [modal, dispatch] = useReducer(modalReducer, { kind: 'none' });
  return { modal, dispatch };
}
```

### OrderManager.tsx 변화
```typescript
// Before: 10개 useState
const [cancelModalOrder, setCancelModalOrder] = useState<Order[] | null>(null);
const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);
// ...10개 더

// After: 단일 useReducer
const { modal, dispatch } = useOrderManagerModals();
// 사용법:
dispatch({ type: 'OPEN_CANCEL', orders: orderedItems });
dispatch({ type: 'OPEN_RETURN_COMPLETE', group: g });
dispatch({ type: 'CLOSE' });
```

---

## 3. F-02: 모바일 카드 품목 접기/펴기

### 신규: `components/order/OrderUnifiedCard.tsx`

**반품 카드 설계:**
```
┌─────────────────────────────────────┐
│ 2026-03-11  IBS Implant  [반품신청] │
│ ─────────────────────────────────── │
│  30개 품목                  총 66개 │
│  Magicore D:3.0 L:11 ×1           │  ← 첫 품목만 표시
│  [+ 29개 더 보기 ▾]               │  ← 토글 버튼 (NEW)
│ ─────────────────────────────────── │
│  담당: 설록차                        │
│  [수거완료]           [반품완료]     │
└─────────────────────────────────────┘

펼침 상태:
│  Magicore D:3.0 L:11 Cuff:2  ×1   │
│  Magicore D:3.5 L:10 Cuff:2  ×2   │
│  ...                              │
│  (전체 30개)                        │
│  [접기 ▴]                          │
```

**구현 핵심:**
```typescript
const [isExpanded, setIsExpanded] = useState(false);
const allItems = g.requests.flatMap(r => r.items);
const visibleItems = isExpanded ? allItems : allItems.slice(0, 1);

{!isExpanded && allItems.length > 1 && (
  <button onClick={() => setIsExpanded(true)}>
    + {allItems.length - 1}개 더 보기 ▾
  </button>
)}
{isExpanded && (
  <button onClick={() => setIsExpanded(false)}>접기 ▴</button>
)}
```

**발주 카드도 동일 패턴 적용** (현재 "외 N종" → 접기/펴기)

---

## 4. F-03: 모바일 필터 바

### 신규: `components/order/OrderMobileFilterBar.tsx`

```
┌─────────────────────────────────────────┐
│ [전체] [발주] [반품] [교환]  [IBS ▾]   │
│  2026-03-01 ─── 2026-03-12  [초기화]   │
└─────────────────────────────────────────┘
```

**Props:**
```typescript
interface OrderMobileFilterBarProps {
  filterType: 'all' | 'replenishment' | 'fail_exchange' | 'return';
  setFilterType: (t: ...) => void;
  filterManufacturer: string;
  setFilterManufacturer: (m: string) => void;
  filterDateFrom: string;
  setFilterDateFrom: (d: string) => void;
  filterDateTo: string;
  setFilterDateTo: (d: string) => void;
  manufacturerOptions: string[];
  totalCount: number;
}
```

**렌더링 위치**: 모바일 레이아웃 최상단 (카드 목록 위)

**현재**: 필터가 PC 사이드바에만 있어 모바일에서 접근 불가
**변경**: 모바일 레이아웃 최상단에 수평 스크롤 가능한 칩 바 추가

---

## 5. F-04: 반품 완료 확인 단계

### `OrderTableSection.tsx` 변경

**현재:**
```tsx
<button onClick={() => handleReturnUpdateStatus(r.id, 'completed', 'picked_up')}>
  반품완료
</button>
```

**변경:**
```tsx
<button onClick={() => dispatch({ type: 'OPEN_RETURN_COMPLETE', group: g })}>
  반품완료
</button>
```

`ReturnCompleteModal`이 열리고, 사용자가 실수령 수량 입력 후 최종 처리.

---

## 6. F-06: ReturnCompleteModal 설계 (핵심)

### 신규: `components/order/ReturnCompleteModal.tsx`

**UI 레이아웃:**
```
┌──────────────────────────────────────────┐
│  반품 완료 처리                       ✕  │
│  IBS Implant · 2026-03-11               │
├──────────────────────────────────────────┤
│  실제 수거된 수량을 확인해주세요.        │
│  신청 수량과 다를 경우 재고가 자동       │
│  보정됩니다.                             │
├──────────────────────────────────────────┤
│  품목               신청   실수령        │
│  ──────────────────────────────────────  │
│  Magicore D:3.0 L:11  1   [ 1 ▲▼]      │
│  Magicore D:3.5 L:10  2   [ 2 ▲▼]      │
│  ...                                     │
│  [전체 보기 / 접기 토글]                 │
├──────────────────────────────────────────┤
│  신청 합계: 66개    실수령 합계: 66개    │
│  재고 보정: ±0개                         │
├──────────────────────────────────────────┤
│              [취소]  [반품 완료 처리]    │
└──────────────────────────────────────────┘
```

**Props:**
```typescript
interface ReturnCompleteModalProps {
  group: GroupedReturnRequest;
  isLoading: boolean;
  onConfirm: (actualQties: Record<string, number>) => Promise<void>;
  // key = returnRequestItem.id, value = actualQty
  onClose: () => void;
}
```

**내부 상태:**
```typescript
// 초기값 = 신청 수량 그대로
const [actualQties, setActualQties] = useState<Record<string, number>>(
  () => Object.fromEntries(
    group.requests.flatMap(r => r.items).map(item => [item.id, item.quantity])
  )
);

const totalRequested = group.requests.flatMap(r => r.items).reduce((s, i) => s + i.quantity, 0);
const totalActual = Object.values(actualQties).reduce((s, v) => s + v, 0);
const stockDelta = totalActual - totalRequested; // 음수 = 재고 복구
```

---

## 7. F-06: DB 마이그레이션 설계

### `supabase/migrations/20260312220000_actual_received_qty.sql`
```sql
-- return_request_items에 실수령 수량 컬럼 추가
ALTER TABLE return_request_items
  ADD COLUMN actual_received_qty INTEGER DEFAULT NULL
  CONSTRAINT chk_actual_received_qty_non_negative
    CHECK (actual_received_qty IS NULL OR actual_received_qty >= 0);

COMMENT ON COLUMN return_request_items.actual_received_qty IS
  '반품 완료 시 실제 수거된 수량. NULL = 미입력(기존 방식, 신청 수량 그대로 처리)';
```

### 기존 데이터 하위 호환
- `actual_received_qty IS NULL` → 기존 방식 그대로 (신청 수량 = 실수령 수량)
- 신규 완료 처리만 actual_received_qty 기록

---

## 8. F-06: 타입 업데이트

### `types/return.ts` 변경
```typescript
export interface ReturnRequestItem {
  id: string;
  returnRequestId: string;
  brand: string;
  size: string;
  quantity: number;
  actualReceivedQty?: number | null;  // ← 신규
}

export interface DbReturnRequestItem {
  id: string;
  return_request_id: string;
  brand: string;
  size: string;
  quantity: number;
  actual_received_qty: number | null;  // ← 신규
}
```

---

## 9. F-06: 서비스 레이어 변경

### `services/returnService.ts` - `completeReturn` 수정
```typescript
async completeReturn(
  returnId: string,
  hospitalId: string,
  actualQties?: Record<string, number>  // itemId → 실수령 수량 (신규)
): Promise<ReturnMutationResult> {
  // 1. actual_received_qty DB 저장 (actualQties 있을 때만)
  if (actualQties && Object.keys(actualQties).length > 0) {
    const updates = Object.entries(actualQties).map(([id, qty]) => ({
      id,
      actual_received_qty: qty,
    }));
    // upsert return_request_items
    const { error: updateError } = await supabase
      .from('return_request_items')
      .upsert(updates, { onConflict: 'id' });
    if (updateError) return { ok: false, reason: 'error' };
  }

  // 2. 기존 RPC로 상태 변경 (picked_up → completed)
  const { error } = await supabase.rpc('complete_return_and_adjust_stock', {
    p_return_id: returnId,
    p_hospital_id: hospitalId,
  });
  if (error) { /* 기존 에러 처리 유지 */ }

  notifyHospitalSlack(hospitalId, 'return_completed', {});
  return { ok: true };
}
```

### `hooks/useReturnHandlers.ts` - `handleCompleteReturn` 수정
```typescript
const handleCompleteReturn = useCallback(async (
  returnId: string,
  actualQties?: Record<string, number>  // 신규 파라미터
): Promise<ReturnMutationResult> => {
  if (!hospitalId) return { ok: false, reason: 'error' };

  const returnReq = returnRequestsRef.current.find(r => r.id === returnId);

  // 낙관적 업데이트 (actualReceivedQty 포함)
  setReturnRequests(prev => prev.map(r => {
    if (r.id !== returnId) return r;
    return {
      ...r,
      status: 'completed' as ReturnStatus,
      completedDate: new Date().toISOString().split('T')[0],
      items: actualQties
        ? r.items.map(item => ({
            ...item,
            actualReceivedQty: actualQties[item.id] ?? item.quantity,
          }))
        : r.items,
    };
  }));

  // 재고 보정 — (신청수량 - 실수령수량) 만큼 복구
  if (actualQties && returnReq) {
    for (const item of returnReq.items) {
      const actualQty = actualQties[item.id] ?? item.quantity;
      const diff = item.quantity - actualQty; // 복구할 수량
      if (diff > 0) {
        const sizeKey = getSizeMatchKey(item.size, returnReq.manufacturer);
        const invItem = inventory.find(inv =>
          inv.manufacturer === returnReq.manufacturer &&
          inv.brand === item.brand &&
          getSizeMatchKey(inv.size, inv.manufacturer) === sizeKey
        );
        if (invItem) {
          await inventoryService.adjustStock(invItem.id, diff); // +diff 복구
          setState(prev => ({
            ...prev,
            inventory: prev.inventory.map(i =>
              i.id === invItem.id
                ? { ...i, currentStock: i.currentStock + diff }
                : i
            ),
          }));
        }
      }
    }
  }

  const result = await returnService.completeReturn(returnId, hospitalId, actualQties);
  if (!result.ok) await loadReturnRequests();
  return result;
}, [hospitalId, loadReturnRequests, inventory, setState]);
```

### `onCompleteReturn` signature 변경 전파
- `useReturnHandlers.ts`: `(returnId, actualQties?) => ReturnMutationResult`
- `components/OrderManager.tsx` Props: `onCompleteReturn` signature 업데이트
- `hooks/useOrderManager.ts`: `handleReturnUpdateStatus` 에서 `completed` 분기 업데이트

---

## 10. F-06: useOrderManager 연결

### `hooks/useOrderManager.ts` 변경

```typescript
// ReturnCompleteModal에서 받은 actualQties를 handleCompleteReturn으로 전달
const handleReturnCompleteWithQties = useCallback(async (
  returnId: string,
  actualQties: Record<string, number>
): Promise<ReturnMutationResult> => {
  setReturnActionLoadingId(returnId);
  try {
    const result = await onCompleteReturn(returnId, actualQties);
    if (result.ok) {
      showAlertToast('반품 완료 처리되었습니다.', 'success');
    } else {
      showAlertToast('반품 완료 처리에 실패했습니다.', 'error');
    }
    return result;
  } finally {
    setReturnActionLoadingId(null);
  }
}, [onCompleteReturn, showAlertToast]);
```

---

## 11. 컴포넌트 파일 구조 (최종)

```
components/
├── OrderManager.tsx              ← 수정 (350줄 목표)
├── order/
│   ├── OrderTableSection.tsx     ← 수정 (모바일 카드 개선)
│   ├── OrderUnifiedCard.tsx      ← 신규 (모바일 카드 컴포넌트)
│   ├── OrderMobileFilterBar.tsx  ← 신규 (모바일 필터 칩)
│   ├── ReturnCompleteModal.tsx   ← 신규 (실수령 수량 입력)
│   └── (기존 파일들 유지)
hooks/
├── useOrderManagerModals.ts      ← 신규 (useReducer 모달 관리)
├── useOrderManager.ts            ← 수정 (handleReturnCompleteWithQties 추가)
└── useReturnHandlers.ts          ← 수정 (actualQties 파라미터)
services/
└── returnService.ts              ← 수정 (completeReturn actualQties)
types/
└── return.ts                     ← 수정 (actualReceivedQty 필드)
supabase/migrations/
└── 20260312220000_actual_received_qty.sql  ← 신규
```

---

## 12. 데이터 흐름도 (F-06)

```
[반품완료 버튼 클릭]
  ↓ dispatch({ type: 'OPEN_RETURN_COMPLETE', group })
[ReturnCompleteModal 표시]
  ↓ 사용자가 품목별 실수령 수량 입력/확인
  ↓ onConfirm(actualQties)
[handleReturnCompleteWithQties(returnId, actualQties)]
  ↓ 낙관적 UI 업데이트
  ↓ 재고 보정 (신청수량 - 실수령수량 > 0이면 복구)
  ↓ returnService.completeReturn(returnId, hospitalId, actualQties)
    ├── return_request_items UPDATE (actual_received_qty 저장)
    └── RPC complete_return_and_adjust_stock (status 변경)
  ↓ 성공: toast '반품 완료 처리되었습니다.'
  ↓ 실패: loadReturnRequests() 롤백
```

---

## 13. 구현 순서 (Do Phase 가이드)

```
Step 1: DB 마이그레이션
  └── 20260312220000_actual_received_qty.sql 생성 및 적용

Step 2: 타입 업데이트
  └── types/return.ts — actualReceivedQty 필드 추가

Step 3: 서비스 수정
  └── services/returnService.ts — completeReturn 파라미터 추가

Step 4: 핸들러 수정
  ├── hooks/useReturnHandlers.ts — actualQties 처리 로직
  └── hooks/useOrderManager.ts — handleReturnCompleteWithQties

Step 5: useOrderManagerModals 신규 훅
  └── hooks/useOrderManagerModals.ts

Step 6: ReturnCompleteModal 신규 컴포넌트
  └── components/order/ReturnCompleteModal.tsx

Step 7: OrderManager 리팩터링
  └── components/OrderManager.tsx — useReducer 적용, 350줄 목표

Step 8: OrderUnifiedCard (모바일 카드 개선)
  └── components/order/OrderUnifiedCard.tsx — 접기/펴기

Step 9: OrderMobileFilterBar (모바일 필터)
  └── components/order/OrderMobileFilterBar.tsx

Step 10: OrderTableSection 수정
  └── components/order/OrderTableSection.tsx — 카드 개선 연결
```

---

## 14. 완료 기준 (Gap Analysis 체크포인트)

| 항목 | 검증 방법 |
|------|---------|
| F-01: OrderManager < 350줄 | `wc -l components/OrderManager.tsx` |
| F-01: 모달 상태 useReducer | `grep useState components/OrderManager.tsx` 개수 감소 확인 |
| F-02: 카드 접기/펴기 | 모바일에서 "N개 더 보기" 토글 클릭 시 전체 품목 표시 |
| F-03: 모바일 필터 | 모바일 뷰에서 필터 칩 렌더링 확인 |
| F-04: 반품완료 확인 | 반품완료 버튼 → ReturnCompleteModal 열림 |
| F-06: DB 컬럼 | `return_request_items` 테이블에 `actual_received_qty` 존재 |
| F-06: 실수령 수량 저장 | 반품완료 처리 후 DB row 확인 |
| F-06: 재고 보정 | 신청 10개, 실수령 7개 → 재고 +3 복구 확인 |
| F-06: NULL 하위 호환 | actual_received_qty=NULL 기존 반품 완료 정상 표시 |
| TypeScript 에러 없음 | `tsc --noEmit` |
