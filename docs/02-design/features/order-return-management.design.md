# 발주·반품 관리 시스템 설계서

> **Feature**: order-return-management
> **Plan Reference**: `docs/01-plan/features/order-return-management.plan.md`
> **Date**: 2026-02-28
> **Status**: Draft

---

## 1. 설계 개요

### 1.1 현황 분석 (As-Is)

코드베이스 탐색 결과, 기존 시스템은 이미 반환(return) 유형의 발주를 부분적으로 지원한다.

| 항목 | 현재 상태 |
|------|-----------|
| `OrderType` | `'replenishment' \| 'fail_exchange' \| 'return'` — return 타입 이미 존재 |
| `OrderStatus` | `'ordered' \| 'received'` — cancelled 미존재 |
| `OrderManager.tsx` | return 유형 통계(returnOrders, returnPending, returnReceived) 이미 계산 |
| `orders` 테이블 | type='return' 행 이미 저장 가능 |
| 반품 전용 상태 추적 | 없음 (ordered/received만 존재) |
| 반품 사유 분류 | 없음 |
| 취소 상태 | 없음 |
| 고급 필터 | 없음 (단일 탭 필터만 존재) |

### 1.2 목표 (To-Be)

```
Phase 1: 발주 고도화
  orders 테이블 → cancelled 상태 + memo/cancelled_reason 컬럼 추가
  OrderManager → 취소 기능, 고급 필터, 재주문점 배지

Phase 2: 반품 관리 신규
  return_requests 테이블 → 4단계 상태 추적 + 사유 분류
  ReturnManager 컴포넌트 신규
  order_management 탭 내 서브탭으로 통합

Phase 3: FAIL 교환 연동
  FailManager → 교환 요청 버튼 (fail_exchange 발주 자동 생성)
  교환 진행 상태 OrderManager 내 시각화
```

---

## 2. DB 스키마 설계

### 2.1 Phase 1: orders 테이블 확장

```sql
-- Migration: add_order_cancelled_and_memo
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS memo TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- status CHECK 제약 조건 변경 (기존 'ordered' | 'received' → + 'cancelled')
-- Supabase에서는 ALTER CONSTRAINT 미지원 → 기존 제약 삭제 후 재생성
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('ordered', 'received', 'cancelled'));
```

**타입 변경**:
```typescript
// types.ts
export type OrderStatus = 'ordered' | 'received' | 'cancelled';
```

**DB 매퍼 변경** (`services/orderService.ts`):
```typescript
// dbOrderToOrder() 함수에 memo, cancelledReason 필드 추가
export interface Order {
  // ... 기존 필드
  memo?: string;
  cancelledReason?: string;
}
```

### 2.2 Phase 2: return_requests 테이블 신규

```sql
-- Migration: create_return_requests
CREATE TABLE IF NOT EXISTS return_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  manufacturer     TEXT NOT NULL,
  reason           TEXT NOT NULL
                     CHECK (reason IN ('excess_stock', 'defective', 'exchange')),
  status           TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN ('requested', 'picked_up', 'completed', 'rejected')),
  requested_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_date   DATE,
  manager          TEXT NOT NULL,
  memo             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_request_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  brand             TEXT NOT NULL,
  size              TEXT NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0)
);

-- RLS 정책
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "return_requests_hospital_isolation" ON return_requests
  USING (hospital_id = (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "return_request_items_hospital_isolation" ON return_request_items
  USING (
    return_request_id IN (
      SELECT id FROM return_requests
      WHERE hospital_id = (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_return_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER return_requests_updated_at
  BEFORE UPDATE ON return_requests
  FOR EACH ROW EXECUTE FUNCTION update_return_requests_updated_at();

-- 원자적 생성 RPC (items 포함)
CREATE OR REPLACE FUNCTION create_return_with_items(
  p_return JSONB,
  p_items  JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_return_id UUID;
BEGIN
  INSERT INTO return_requests (
    hospital_id, manufacturer, reason, status,
    requested_date, manager, memo
  )
  VALUES (
    (p_return->>'hospital_id')::UUID,
    p_return->>'manufacturer',
    p_return->>'reason',
    COALESCE(p_return->>'status', 'requested'),
    COALESCE((p_return->>'requested_date')::DATE, CURRENT_DATE),
    p_return->>'manager',
    p_return->>'memo'
  )
  RETURNING id INTO v_return_id;

  INSERT INTO return_request_items (return_request_id, brand, size, quantity)
  SELECT
    v_return_id,
    item->>'brand',
    item->>'size',
    (item->>'quantity')::INTEGER
  FROM jsonb_array_elements(p_items) AS item;

  RETURN v_return_id;
END;
$$;
```

### 2.3 Phase 2: 재고 차감 RPC (반품 완료 시)

```sql
-- 반품 완료 → 재고 차감 원자적 처리
CREATE OR REPLACE FUNCTION complete_return_and_adjust_stock(
  p_return_id   UUID,
  p_hospital_id UUID,
  p_completed_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- 상태 업데이트
  UPDATE return_requests
  SET status = 'completed', completed_date = p_completed_date
  WHERE id = p_return_id AND hospital_id = p_hospital_id
    AND status = 'picked_up';  -- 낙관적 잠금: picked_up 상태만 완료 가능

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Return request not found or invalid status transition';
  END IF;

  -- 품목별 재고 차감
  FOR v_item IN
    SELECT brand, size, quantity
    FROM return_request_items
    WHERE return_request_id = p_return_id
  LOOP
    UPDATE inventory
    SET current_stock = current_stock - v_item.quantity
    WHERE hospital_id = p_hospital_id
      AND brand = v_item.brand
      AND size = v_item.size;
  END LOOP;
END;
$$;
```

---

## 3. TypeScript 타입 설계

```typescript
// types.ts에 추가

// ----- Phase 1: 발주 확장 -----

export type OrderStatus = 'ordered' | 'received' | 'cancelled';

export interface Order {
  id: string;
  type: OrderType;
  manufacturer: string;
  date: string;
  items: OrderItem[];
  manager: string;
  status: OrderStatus;
  receivedDate?: string;
  memo?: string;           // 신규
  cancelledReason?: string; // 신규
}

export interface DbOrder {
  id: string;
  hospital_id: string;
  type: OrderType;
  manufacturer: string;
  date: string;
  manager: string;
  status: OrderStatus;
  received_date: string | null;
  memo: string | null;             // 신규
  cancelled_reason: string | null; // 신규
  created_at: string;
}

// ----- Phase 2: 반품 관리 -----

export type ReturnReason = 'excess_stock' | 'defective' | 'exchange';
export type ReturnStatus = 'requested' | 'picked_up' | 'completed' | 'rejected';

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  excess_stock: '초과재고',
  defective: '제품하자',
  exchange: '수술중교환',
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: '반품 요청',
  picked_up: '수거 완료',
  completed: '반품 완료',
  rejected: '반품 거절',
};

export const RETURN_STATUS_FLOW: Record<ReturnStatus, ReturnStatus | null> = {
  requested: 'picked_up',
  picked_up: 'completed',
  completed: null,
  rejected: null,
};

export interface ReturnRequestItem {
  brand: string;
  size: string;
  quantity: number;
}

export interface ReturnRequest {
  id: string;
  manufacturer: string;
  reason: ReturnReason;
  status: ReturnStatus;
  requestedDate: string;
  completedDate?: string;
  manager: string;
  memo?: string;
  items: ReturnRequestItem[];
  createdAt: string;
}

// DB 표현
export interface DbReturnRequest {
  id: string;
  hospital_id: string;
  manufacturer: string;
  reason: ReturnReason;
  status: ReturnStatus;
  requested_date: string;
  completed_date: string | null;
  manager: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbReturnRequestItem {
  id: string;
  return_request_id: string;
  brand: string;
  size: string;
  quantity: number;
}

// Mutation 결과 (기존 OrderMutationResult 패턴 동일)
export type ReturnMutationResult =
  | { success: true }
  | { success: false; error: string; conflict?: boolean };
```

---

## 4. 서비스 설계

### 4.1 orderService.ts 확장 (Phase 1)

```typescript
// 신규 메서드 추가

/** 발주 취소 */
cancelOrder(
  orderId: string,
  reason?: string
): Promise<OrderMutationResult>
// 구현: UPDATE orders SET status='cancelled', cancelled_reason=reason
// 낙관적 잠금: expectedCurrentStatus = 'ordered'

/** 고급 필터로 발주 조회 */
getOrdersFiltered(params: {
  dateFrom?: string;
  dateTo?: string;
  manufacturer?: string;
  type?: OrderType;
  status?: OrderStatus;
}): Promise<Order[]>
```

### 4.2 returnService.ts 신규 (Phase 2)

```typescript
// services/returnService.ts

export const returnService = {
  /** 병원의 반품 요청 목록 조회 */
  getReturnRequests(): Promise<ReturnRequest[]>

  /** 반품 요청 생성 (원자적 RPC) */
  createReturnRequest(
    returnReq: Omit<ReturnRequest, 'id' | 'createdAt'>,
    items: ReturnRequestItem[]
  ): Promise<ReturnMutationResult>

  /** 반품 상태 변경 */
  updateReturnStatus(
    returnId: string,
    newStatus: ReturnStatus,
    expectedCurrentStatus: ReturnStatus,
    completedDate?: string
  ): Promise<ReturnMutationResult>
  // completed로 전환 시 → complete_return_and_adjust_stock RPC 호출

  /** 반품 요청 삭제 (requested 상태만 가능) */
  deleteReturnRequest(returnId: string): Promise<ReturnMutationResult>

  /** Realtime 구독 */
  subscribeToChanges(
    hospitalId: string,
    callback: () => void
  ): RealtimeChannel
}
```

---

## 5. 컴포넌트 설계

### 5.1 파일 구조

```
components/
  OrderManager.tsx           기존 수정 (Phase 1, 3)
  ReturnManager.tsx          신규 (Phase 2)
  order/
    OrderCancelModal.tsx     신규 (Phase 1) — 취소 사유 입력 모달
    OrderFilterBar.tsx       신규 (Phase 1) — 고급 필터 UI
    OrderStatusBadge.tsx     신규 (Phase 1) — cancelled 포함 배지
    ReturnRequestModal.tsx   신규 (Phase 2) — 반품 요청 등록 모달
    ReturnStatusStepper.tsx  신규 (Phase 2) — 4단계 상태 표시기

services/
  orderService.ts    기존 수정 (cancelOrder 추가)
  returnService.ts   신규

types.ts             기존 수정 (OrderStatus, ReturnRequest 등 추가)

supabase/migrations/
  20260228_01_order_cancelled_status.sql   Phase 1
  20260228_02_return_requests.sql          Phase 2
```

### 5.2 OrderManager.tsx 변경 사항 (Phase 1)

**현재 탭 구조** → **변경 후**:

```
[현재]
order_management 탭
  └── OrderManager.tsx (단일 화면)

[변경 후 Phase 1]
order_management 탭
  └── 서브탭: [발주 관리] [반품 관리]
        └── 발주 관리: OrderManager (개선)
        └── 반품 관리: ReturnManager (신규)
```

**OrderManager.tsx 추가 기능**:
- 발주 취소 버튼 (ordered 상태의 발주에만 표시)
- 취소된 발주 목록에 '취소됨' 배지 표시
- 날짜 범위 필터, 제조사 필터 추가
- 재주문점 심각도 배지: `currentStock / recommendedStock` 비율에 따라 red/orange/yellow
- `cancelled` 발주는 목록에서 별도 섹션으로 분리 또는 필터링

### 5.3 ReturnManager.tsx (Phase 2)

```
┌─────────────────────────────────────────────┐
│  반품 관리                    [+ 반품 요청]  │
│  총 12건 | 진행중 3건 | 완료 8건 | 거절 1건 │
├─────────────────────────────────────────────┤
│  [전체] [요청됨] [수거완료] [처리완료] [거절]│
├─────────────────────────────────────────────┤
│  오스템임플란트  |  초과재고  | 요청됨       │
│  2026-02-25     |  담당: 홍길동             │
│  TA4.0x10 ×2, SA4.0x8.5 ×1                │
│  [수거완료로 변경]  [삭제]                   │
├─────────────────────────────────────────────┤
│  덴티움         |  제품하자  | 수거완료      │
│  2026-02-20     |  담당: 김담당             │
│  GS III 4.0x10 ×1                          │
│  [반품완료로 변경]  [거절 처리]              │
└─────────────────────────────────────────────┘
```

**ReturnManager Props**:
```typescript
interface ReturnManagerProps {
  returnRequests: ReturnRequest[];
  onUpdateStatus: (id: string, status: ReturnStatus, expectedStatus: ReturnStatus) => void;
  onDeleteRequest: (id: string) => void;
  onCreateRequest: (req: Omit<ReturnRequest, 'id' | 'createdAt'>, items: ReturnRequestItem[]) => void;
  isReadOnly?: boolean;
  currentUser: User;
}
```

### 5.4 ReturnRequestModal.tsx

```
┌────────────────────────────────────────┐
│  반품 요청 등록                         │
├────────────────────────────────────────┤
│  제조사 *   [오스템임플란트      ▼]     │
│  반품 사유 * ○ 초과재고  ○ 제품하자     │
│              ○ 수술중교환               │
├────────────────────────────────────────┤
│  반품 품목                [+ 품목 추가] │
│  브랜드    규격      수량               │
│  [TA   ▼] [4.0x10▼] [ 2 ]   [×]      │
│  [SA   ▼] [4.0x8.5▼][ 1 ]   [×]      │
├────────────────────────────────────────┤
│  메모 (선택)                            │
│  [                                   ] │
├────────────────────────────────────────┤
│                [취소] [반품 요청 등록]  │
└────────────────────────────────────────┘
```

### 5.5 OrderCancelModal.tsx

```
┌────────────────────────────────────────┐
│  발주 취소                              │
│  오스템임플란트 | TA4.0x10 ×3         │
│  발주일: 2026-02-26                    │
├────────────────────────────────────────┤
│  취소 사유 (선택)                       │
│  [                                   ] │
├────────────────────────────────────────┤
│               [돌아가기] [취소 확인]    │
└────────────────────────────────────────┘
```

### 5.6 FailManager.tsx 변경 (Phase 3)

기존 수술중교환 행에 '교환 요청' 버튼 추가:
```
[기존]
| 날짜 | 브랜드 | 규격 | 구분 | ... |

[변경]
| 날짜 | 브랜드 | 규격 | 구분 | ... | 액션 |
|      |        |      | 수술중교환 | | [교환 요청 생성] |
```

클릭 시: `orderService.createOrder({ type: 'fail_exchange', ... })` 호출 후 발주 관리 탭으로 이동.

---

## 6. 상태 관리 설계

### 6.1 AppState 변경

```typescript
// types.ts의 AppState 또는 대시보드 훅

interface DashboardState {
  // 기존
  orders: Order[];
  // 신규 (Phase 2)
  returnRequests: ReturnRequest[];
}
```

### 6.2 데이터 로딩 전략

- `returnRequests`: `order_management` 탭 진입 시 로드 (lazy loading)
- Realtime 구독: 탭 진입 시 구독 시작, 탭 이탈 시 구독 해제 (기존 orders 패턴 동일)
- 낙관적 업데이트: 상태 변경 시 즉시 UI 업데이트 → 실패 시 롤백

### 6.3 권한 체크 포인트

| 액션 | 권한 조건 |
|------|-----------|
| 발주 목록 조회 | `canAccessTab('order_management')` |
| 발주 취소 | `!isReadOnly && canManageOrders` |
| 반품 요청 등록 | `!isReadOnly && canManageOrders` |
| 반품 상태 변경 | `!isReadOnly && canManageOrders` |
| 교환 요청 생성 (FailManager) | `canManageFails && canManageOrders` |

---

## 7. UI/UX 설계 원칙

### 7.1 기존 패턴 준수 사항

- 발주 유형 탭 버튼: 기존 `['전체', '재고 보충', '수술중교환', '반품']` 탭 필터 유지
- 배지 색상 시스템:
  - `ordered` → 파란색 (`bg-blue-100 text-blue-700`)
  - `received` → 초록색 (`bg-green-100 text-green-700`)
  - `cancelled` → 회색 (`bg-slate-100 text-slate-500`)
  - `requested` → 노란색 (`bg-amber-100 text-amber-700`)
  - `picked_up` → 보라색 (`bg-purple-100 text-purple-700`)
  - `completed` → 초록색 (`bg-green-100 text-green-700`)
  - `rejected` → 빨간색 (`bg-red-100 text-red-700`)
- 모달: 기존 인라인 폼(`bg-white rounded-2xl shadow-xl p-6`) 패턴 사용
- 로딩/에러: 기존 토스트(showAlertToast) 패턴 사용

### 7.2 재주문점(ROP) 배지 계산

```typescript
// OrderManager.tsx 내 useMemo
const lowStockSeverity = useMemo(() => {
  return inventory
    .filter(item => item.currentStock < item.recommendedStock)
    .map(item => {
      const ratio = item.currentStock / (item.recommendedStock || 1);
      const severity =
        ratio <= 0.25 ? 'critical' :  // 빨간 배지
        ratio <= 0.5  ? 'warning' :   // 주황 배지
                        'caution';    // 노란 배지
      return { ...item, severity };
    });
}, [inventory]);
```

### 7.3 서브탭 구조 (order_management 탭 내)

```
order_management 탭
├── 서브탭: [발주 관리] [반품 관리]  ← 신규 서브탭 UI
│           (현재 탭에 서브탭 추가, DashboardTab 변경 없음)
└── 라우팅: 서브탭 상태는 컴포넌트 로컬 state로 관리
            (DashboardTab 타입 변경 없이 내부 state만 사용)
```

---

## 8. 에러 처리 설계

### 8.1 낙관적 잠금 패턴 (기존 orderService 동일)

```typescript
// returnService.updateReturnStatus 구현 내부
const result = await supabase
  .from('return_requests')
  .update({ status: newStatus, ...(completedDate ? { completed_date: completedDate } : {}) })
  .eq('id', returnId)
  .eq('status', expectedCurrentStatus)  // 낙관적 잠금
  .select('id');

if (!result.data?.length) {
  return { success: false, error: '상태가 변경되었습니다. 페이지를 새로고침해 주세요.', conflict: true };
}
```

### 8.2 재고 차감 실패 처리

`complete_return_and_adjust_stock` RPC에서 예외 발생 시:
- 클라이언트에서 `RAISE EXCEPTION` 메시지를 파싱하여 사용자에게 표시
- 재고 품목이 없는 경우: "해당 품목의 재고 정보가 없습니다. 재고 확인 후 수동으로 조정해 주세요."

---

## 9. 구현 순서 (Implementation Checklist)

### Phase 1 (발주 고도화)
- [ ] `supabase/migrations/20260228_01_order_cancelled_status.sql` 작성 및 적용
- [ ] `types.ts`: `OrderStatus`에 `'cancelled'` 추가, `Order`에 `memo?`, `cancelledReason?` 추가
- [ ] `services/orderService.ts`: `cancelOrder()` 메서드 추가, `dbOrderToOrder()` 매퍼 업데이트
- [ ] `components/order/OrderCancelModal.tsx` 신규
- [ ] `components/order/OrderFilterBar.tsx` 신규
- [ ] `components/OrderManager.tsx`: 취소 버튼, 필터 바, cancelled 배지, ROP 심각도 배지 추가

### Phase 2 (반품 관리)
- [ ] `supabase/migrations/20260228_02_return_requests.sql` 작성 및 적용
- [ ] `types.ts`: `ReturnReason`, `ReturnStatus`, `ReturnRequest`, `ReturnMutationResult` 추가
- [ ] `services/returnService.ts` 신규 구현
- [ ] `components/order/ReturnRequestModal.tsx` 신규
- [ ] `components/order/ReturnStatusStepper.tsx` 신규
- [ ] `components/ReturnManager.tsx` 신규 구현
- [ ] `components/OrderManager.tsx`: 서브탭 추가, ReturnManager 연결
- [ ] 상위 컴포넌트에서 `returnRequests` 상태 + Realtime 구독 추가

### Phase 3 (FAIL 교환 연동)
- [ ] `components/FailManager.tsx`: 수술중교환 행에 '교환 요청 생성' 버튼 추가
- [ ] 클릭 핸들러: `orderService.createOrder({ type: 'fail_exchange', ... })`
- [ ] 교환 요청 생성 후 토스트 + 발주 관리 탭으로 이동 콜백

---

## 10. 검증 기준 (Gap Analysis 기준)

| 항목 | 기대 동작 | 확인 방법 |
|------|-----------|-----------|
| 발주 취소 | ordered 발주에서 취소 가능, DB status='cancelled' 저장 | orders 테이블 직접 확인 |
| 취소 배지 | cancelled 발주에 회색 배지 표시 | UI 시각 확인 |
| 고급 필터 | 날짜/제조사/유형/상태 복합 필터 동작 | 필터 조합 테스트 |
| ROP 배지 | currentStock/recommendedStock 비율에 따른 색상 | 재고 데이터로 검증 |
| 반품 요청 등록 | DB return_requests + items 원자적 삽입 | DB 직접 확인 |
| 반품 상태 전환 | requested→picked_up→completed 순서 강제 | 역방향 전환 불가 확인 |
| 반품 완료 재고 차감 | completed 전환 시 inventory.current_stock 감소 | inventory 테이블 확인 |
| 낙관적 잠금 | 동시 상태 변경 시 conflict 에러 반환 | expectedCurrentStatus 조건 |
| 권한 제어 | isReadOnly 시 등록/변경 버튼 비활성화 | 읽기 전용 계정으로 확인 |
| FAIL 교환 연동 | 수술중교환 행에서 fail_exchange 발주 생성 | orders 테이블 확인 |
| Realtime | 다른 탭에서 변경 시 목록 자동 갱신 | 두 창에서 동시 확인 |

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 0.1 | 2026-02-28 | 초기 설계서 작성 |
