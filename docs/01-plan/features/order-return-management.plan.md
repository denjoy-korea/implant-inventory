# 발주·반품 관리 시스템 계획서

> **Summary**: 치과 임플란트 재고 부족 자동 감지 기반 발주 관리 고도화 및 반품·교환 요청 추적 시스템 신규 구축
>
> **Project**: DenJOY (implant-inventory)
> **Version**: 1.0
> **Author**: Product Manager
> **Date**: 2026-02-28
> **Status**: Draft

---

## 1. 개요

### 1.1 목적

현재 DenJOY는 발주(OrderManager)와 FAIL 관리(FailManager)를 별도로 운영하고 있으나, 운영 현장에서 필요한 다음 흐름이 미완성 상태이다.

- **발주 흐름**: 재고 부족 자동 감지 → 발주 추천 → 발주 확정 → 입고 확인
- **반품 흐름**: 반품 사유 분류 → 반품 요청 등록 → 제조사 처리 상태 추적 → 재고 반영
- **교환 흐름**: FAIL 임플란트 → 제조사 교환 요청 → 교환품 입고 추적

이 계획서는 위 세 흐름을 하나의 일관된 시스템으로 통합·고도화하는 방안을 정의한다.

### 1.2 배경 및 운영 현장 사례

#### 실제 치과 병원 발주 프로세스
국내 치과 병원(1~3인 원장, 3~20명 스탭 규모)의 임플란트 재고 관리는 다음과 같은 방식으로 운영된다.

1. **주간 재고 점검**: 담당 스탭이 주 1회 이상 재고를 실사하며, 보통 월요일 아침에 다음 주 수술 스케줄을 기반으로 필요 수량을 계산한다.
2. **발주 기준**: 오스템, 덴티움, 네오바이오텍 등 제조사별 "최소 보유 수량(par level)"을 경험칙으로 관리. 통상 2~3주치 수술량을 안전재고로 유지한다.
3. **발주 채널**: 제조사 담당 영업사원에게 전화/카카오톡으로 발주. 일부 병원은 오스템 B2B 포털 등 온라인 채널 사용.
4. **리드타임**: 국내 주요 제조사는 익일~2일 납품. 긴급 발주 시 당일 납품도 가능.

#### 초과재고(Dead Stock) 처리 방식
- 유효기간 임박 품목은 제조사 영업사원에게 교환 요청 (비공식 협의).
- 단종·리뉴얼로 인한 구형 제품은 반품보다는 내부 소모 처리.
- 규모가 큰 병원(DSO급)은 잉여재고를 본원과 분원 간 이전으로 해소.

#### FAIL(수술 중 교환) 처리 프로세스
- 수술 중 임플란트 픽스처가 골 밀도 부족 등으로 교환되면 '수술중교환' 기록.
- 교환된 임플란트는 제조사에 반납하여 새 제품으로 교환(무상 교환이 업계 관례).
- 제조사 영업사원이 회수하여 처리하며, 병원 입장에서는 진행 상태를 별도로 추적하지 않는 경우가 많음.
- **페인포인트**: 교환 요청 후 입고 확인이 누락되어 재고 불일치 발생.

#### 국내 주요 임플란트 제조사 교환·반품 정책 (업계 관례 기반)
| 제조사 | 교환 정책 | 반품 정책 |
|--------|-----------|-----------|
| 오스템임플란트 | FAIL 픽스처 무상 교환 (영업사원 경유), 교환 기간 통상 2~4주 | 미개봉 제품 반품 가능 (일부 수수료 발생). 개봉 후 반품 불가 |
| 덴티움 | 수술 중 FAIL 무상 교환, 영업사원 승인 필요 | 미개봉 제품에 한해 반품 협의 가능 |
| 네오바이오텍 | FAIL 교환 정책 동일 구조 | 반품 조건은 제품 상태 및 경과 기간에 따라 협의 |
| 기타 수입 브랜드 | 국내 대리점 통한 교환, 기간 더 소요 (4~8주) | 대리점별 정책 상이 |

#### SaaS 제품 관점 모범 사례 (ImplantBase, Sowingo, Zenone 분석)
- **재주문점(ROP) 자동 계산**: `ROP = 평균 일일 사용량 x 리드타임(일) + 안전재고`
- **RGA(Returned Goods Authorization) 워크플로우**: 반품 요청 → 승인 → 수거 → 크레딧/재입고 상태 추적
- **FEFO(First-Expired, First-Out)**: 유효기간 임박 재고 우선 사용 알림
- **권한 분리**: 스탭은 발주 요청만 가능, 마스터/원장만 발주 확정

### 1.3 관련 문서

- 현재 구현: `components/OrderManager.tsx`, `services/orderService.ts`
- 현재 FAIL 관리: `components/FailManager.tsx`
- 타입 정의: `types.ts` (OrderType, OrderStatus, DbOrder, DbOrderItem)
- DB 테이블: `orders`, `order_items` (Supabase)

---

## 2. 범위 정의

### 2.1 포함 범위 (In Scope)

**Phase 1 - 발주 관리 고도화 (Must)**
- [ ] 재고 부족 자동 감지 및 발주 추천 배지/알림 (현재 UI 개선)
- [ ] 발주 상태 확장: `ordered` → `received` 외 `cancelled` 상태 추가
- [ ] 발주 유형 확장: 현행 `replenishment` / `fail_exchange` / `return` 타입에 메모·첨부 필드 보강
- [ ] 입고 확인 날짜 기록 및 재고 자동 반영 연동 포인트
- [ ] 발주 이력 필터 개선 (날짜 범위, 제조사, 유형, 상태 다축 필터)

**Phase 2 - 반품 관리 신규 구축 (Should)**
- [ ] 반품 요청 등록 UI (반품 사유 분류: 초과재고 / 제품 하자 / 수술중교환 교환)
- [ ] 반품 진행 상태 추적: `requested` → `picked_up` → `completed` / `rejected`
- [ ] 반품 처리 후 재고 차감 자동 반영
- [ ] 제조사별 반품 정책 메모 필드

**Phase 3 - 제조사 교환 관리 통합 (Should/Could)**
- [ ] FAIL 관리 화면과 발주 관리 간 교환 요청 연동 (수술중교환 → 교환 요청 자동 생성)
- [ ] 교환 요청 상태 추적 (`requested` → `sent_to_mfr` → `received`)
- [ ] 교환 이력 리포트 (제조사별 FAIL 교환 빈도 분석)

**공통**
- [ ] 권한 제어: 발주 등록·확정은 `canManageOrders` 권한자만 가능
- [ ] Realtime 구독 유지 (기존 orderService 패턴 유지)
- [ ] 병원(hospital_id) 단위 데이터 격리 유지

### 2.2 제외 범위 (Out of Scope)

- 제조사 B2B 포털 API 직접 연동 (EDI) - 향후 과제
- 자동 발주 실행 (사람이 최종 확정하는 semi-automatic만 지원)
- 바코드·UDI 스캔 기능 (하드웨어 의존성)
- 다중 병원 간 재고 이전 기능
- 재무/회계 시스템 연동 (ERP)

---

## 3. 요구사항

### 3.1 기능 요구사항

#### 발주 관리 (FR-01 ~ FR-06)

| ID | 요구사항 | 우선순위 | 현재 상태 |
|----|----------|----------|-----------|
| FR-01 | 재고 부족 품목 자동 감지: `currentStock < recommendedStock` 조건으로 발주 권장 목록 생성 | Must | 부분 구현 (OrderManager 내 lowStockItems) |
| FR-02 | 재주문점(ROP) 표시: 평균 월사용량 기반 부족 심각도를 시각화 (색상 배지) | Must | 미구현 |
| FR-03 | 발주 확정 후 '발주됨(ordered)' 상태 → 담당자/날짜 기록 | Must | 기존 구현 |
| FR-04 | 입고 확인(received): 입고일 기록, 수량 검증, 재고 반영 알림 연동 포인트 | Must | 부분 구현 (receivedDate 없는 경우) |
| FR-05 | 발주 취소(cancelled) 상태 추가 및 취소 사유 메모 | Should | 미구현 |
| FR-06 | 발주 이력 고급 필터: 날짜 범위 / 제조사 / 유형 / 상태 복합 필터 | Should | 미구현 (단일 필터만 존재) |

#### 반품 관리 (FR-07 ~ FR-12)

| ID | 요구사항 | 우선순위 | 현재 상태 |
|----|----------|----------|-----------|
| FR-07 | 반품 요청 등록: 반품 사유(초과재고/제품하자/교환) + 제조사 + 품목 + 수량 | Must | 미구현 |
| FR-08 | 반품 진행 상태: `requested` → `picked_up` → `completed` / `rejected` | Must | 미구현 |
| FR-09 | 반품 완료 시 재고 자동 차감 처리 (해당 품목 `currentStock -= 반품수량`) | Must | 미구현 |
| FR-10 | 반품 사유별 분류 표시 및 통계 (사유별 반품 건수/금액) | Should | 미구현 |
| FR-11 | 제조사별 예상 반품 처리 기간 메모 필드 | Could | 미구현 |
| FR-12 | 반품 요청 시 사진/메모 첨부 (하자 근거 보존) | Could | 미구현 |

#### 제조사 교환 관리 (FR-13 ~ FR-16)

| ID | 요구사항 | 우선순위 | 현재 상태 |
|----|----------|----------|-----------|
| FR-13 | FAIL 화면에서 '교환 요청' 버튼: 수술중교환 항목에서 교환 발주 자동 생성 | Should | 미구현 (FAIL과 Order가 분리됨) |
| FR-14 | 교환 요청 상태 추적: `requested` → `sent_to_mfr` → `received` | Should | 미구현 |
| FR-15 | 교환 완료 후 재고 반영: 교환품 입고 시 `currentStock += 1` | Should | 미구현 |
| FR-16 | 제조사별 FAIL 교환 리포트: 월별 교환 빈도, 교환 소요 기간 | Could | 미구현 |

### 3.2 비기능 요구사항

| 카테고리 | 기준 | 측정 방법 |
|----------|------|-----------|
| 성능 | 발주 목록 조회 응답 200ms 이내 (기존 Realtime 구조 유지) | Supabase 쿼리 로그 |
| 보안 | 병원(hospital_id) RLS 격리 유지, `canManageOrders` 권한 체크 | 기존 RLS 정책 검증 |
| 일관성 | 발주·반품·교환 상태 전환 시 낙관적 잠금(optimistic lock) 적용 | 기존 orderService `expectedCurrentStatus` 패턴 |
| UX | 재고 부족 배지는 페이지 진입 즉시 렌더링 (서버 왕복 없이 클라이언트 계산) | 현행 useMemo 패턴 유지 |
| 확장성 | 발주 유형(`OrderType`)·상태(`OrderStatus`) 추가 시 타입 확장만으로 대응 | TypeScript union type |

---

## 4. 성공 지표

### 4.1 완료 정의 (Definition of Done)

- [ ] FR-01~FR-06 (발주 고도화) 구현 완료 및 기존 발주 데이터 호환
- [ ] FR-07~FR-09 (반품 관리 MVP) 구현 완료
- [ ] FR-13~FR-15 (교환 요청 연동) 구현 완료
- [ ] TypeScript 타입 오류 0건
- [ ] 기존 발주 데이터(orders, order_items) 마이그레이션 무중단 적용
- [ ] 권한(canManageOrders) 체크 누락 없음

### 4.2 정량 지표

| 지표 | 목표 | 측정 기준 |
|------|------|-----------|
| 재고 부족 감지 정확도 | 발주 권장 목록 누락률 0% | `currentStock < recommendedStock` 조건 100% 커버 |
| 반품 요청 처리 추적률 | 등록된 반품 요청의 상태 추적 가능 100% | `return_requests` 테이블 상태 필드 |
| 교환 연동 전환율 | FAIL 항목의 교환 요청 생성 클릭 전환율 측정 시작 | 운영 지표 (3개월 후 목표 수립) |

---

## 5. 리스크 및 대응

| 리스크 | 영향 | 발생 가능성 | 대응 방안 |
|--------|------|-------------|-----------|
| 기존 `OrderType = 'return'` 타입 충돌 | 높음 | 높음 | `return` 유형을 반품 전용 테이블(`return_requests`)로 분리하여 혼용 방지 |
| 입고 확인 시 재고 자동 반영 누락 | 높음 | 중간 | 입고 확인(received) 이벤트에서 `inventoryService.adjustStock()` 호출 연동 확인 |
| FAIL과 Order 화면 간 상태 불일치 | 중간 | 중간 | FailManager와 OrderManager가 같은 `orders` 테이블을 참조하도록 교환 요청 생성 흐름 통일 |
| DB 스키마 변경 시 기존 데이터 호환 | 중간 | 낮음 | 컬럼 추가(nullable) + 기존 행 DEFAULT값 마이그레이션. `orders` 테이블 삭제·재생성 금지 |
| `canManageOrders` 권한 미체크 신규 진입점 | 중간 | 낮음 | 반품·교환 신규 액션마다 기존 `canAccessTab('order_management')` 체크 패턴 적용 |

---

## 6. 아키텍처 고려사항

### 6.1 프로젝트 레벨

**Dynamic** 레벨 유지 (기존 구조: `components/`, `services/`, `types/`, `hooks/`)

### 6.2 핵심 아키텍처 결정

| 결정 사항 | 선택 | 근거 |
|-----------|------|------|
| 반품 데이터 저장 | 신규 `return_requests` 테이블 (기존 `orders` 테이블과 분리) | `orders` 테이블의 `return` 타입이 이미 존재하나, 반품은 다단계 상태(4개 상태) + 사유 분류가 필요해 별도 테이블이 적합 |
| 발주 상태 확장 | `orders.status` 컬럼: `'ordered' / 'received' / 'cancelled'` (union type 확장) | 기존 타입에 nullable 추가. 마이그레이션: `ALTER TABLE orders ADD COLUMN ... DEFAULT NULL` |
| 재고 반영 트리거 | 클라이언트 사이드 + DB 트리거 옵션 병행 검토 | 입고 확인 시 재고 증가는 현재 클라이언트에서 처리. Edge Function RPC 방식으로 원자적 처리 권장 |
| Realtime 구독 | 기존 `orderService.subscribeToChanges()` 패턴 유지, `return_requests` 테이블도 동일 패턴 적용 | 코드 일관성 |

### 6.3 예상 DB 스키마 변경

```sql
-- 1. orders 테이블: status에 'cancelled' 추가, 메모 컬럼 추가
ALTER TABLE orders
  ADD COLUMN memo TEXT,
  ADD COLUMN cancelled_reason TEXT;
-- status는 CHECK 제약 조건 수정: 'ordered' | 'received' | 'cancelled'

-- 2. return_requests 테이블 신규 생성
CREATE TABLE return_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id    UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  manufacturer   TEXT NOT NULL,
  reason         TEXT NOT NULL CHECK (reason IN ('excess_stock', 'defective', 'exchange')),
  status         TEXT NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested', 'picked_up', 'completed', 'rejected')),
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_date DATE,
  manager        TEXT NOT NULL,
  memo           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE return_request_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  brand             TEXT NOT NULL,
  size              TEXT NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0)
);

-- RLS 정책
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospital_isolation" ON return_requests
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));
```

### 6.4 컴포넌트 구조 (신규 추가 예상)

```
components/
  OrderManager.tsx          (기존 - 발주 고도화로 수정)
  ReturnManager.tsx         (신규 - 반품 관리)
  FailManager.tsx           (기존 - 교환 요청 연동 버튼 추가)

services/
  orderService.ts           (기존 - cancelled 상태 처리 추가)
  returnService.ts          (신규 - 반품 CRUD + Realtime)

types.ts                    (기존 - OrderStatus 확장, ReturnReason/ReturnStatus 타입 추가)
```

---

## 7. 구현 단계 및 우선순위

### Phase 1: 발주 관리 고도화 (Must - 2주 예상)

| 순서 | 작업 | 파일 | 설명 |
|------|------|------|------|
| 1 | `OrderStatus` 타입에 `'cancelled'` 추가 | `types.ts` | union 타입 확장 |
| 2 | `orders` 테이블 스키마 마이그레이션 | `supabase/migrations/` | `memo`, `cancelled_reason` 컬럼 추가 |
| 3 | `orderService.cancelOrder()` 구현 | `services/orderService.ts` | 취소 상태 전환 + 사유 기록 |
| 4 | 발주 이력 고급 필터 UI | `components/OrderManager.tsx` | 날짜 범위 + 복합 필터 |
| 5 | 재주문점 심각도 배지 표시 | `components/OrderManager.tsx` | lowStockItems에 severity 컬러 추가 |
| 6 | 입고 확인 시 재고 반영 알림 연동 포인트 | `components/OrderManager.tsx` | `onUpdateOrderStatus(received)` 콜백에서 토스트 알림 |

### Phase 2: 반품 관리 신규 구축 (Should - 2주 예상)

| 순서 | 작업 | 파일 | 설명 |
|------|------|------|------|
| 1 | `return_requests`, `return_request_items` 테이블 생성 + RLS | `supabase/migrations/` | 신규 스키마 |
| 2 | `ReturnReason`, `ReturnStatus` 타입 정의 | `types.ts` | union 타입 |
| 3 | `returnService.ts` 구현 | `services/returnService.ts` | CRUD + Realtime 구독 |
| 4 | `ReturnManager.tsx` UI 구현 | `components/ReturnManager.tsx` | 반품 목록 + 등록 모달 |
| 5 | 대시보드 탭에 반품 관리 탭 추가 | `appRouting.ts`, `Sidebar.tsx` | `return_management` 탭 |
| 6 | 반품 완료 시 재고 차감 연동 | `returnService.ts` + `inventoryService.ts` | RPC 트랜잭션 |

### Phase 3: 제조사 교환 관리 통합 (Should/Could - 1.5주 예상)

| 순서 | 작업 | 파일 | 설명 |
|------|------|------|------|
| 1 | FailManager에 '교환 요청' 버튼 추가 | `components/FailManager.tsx` | 수술중교환 행에 버튼 |
| 2 | 교환 요청 생성: fail_exchange 유형 Order 자동 생성 | `services/orderService.ts` | 기존 `fail_exchange` 타입 활용 |
| 3 | 교환 진행 상태 UI (OrderManager 내) | `components/OrderManager.tsx` | fail_exchange 유형 전용 상태 컬럼 |
| 4 | 교환 완료 후 재고 반영 | `services/orderService.ts` | `received` 전환 시 재고 +1 |
| 5 | 제조사별 FAIL 교환 리포트 (선택) | `components/OrderManager.tsx` | 집계 뷰 추가 |

---

## 8. 컨벤션 및 기존 패턴 준수

### 8.1 기존 프로젝트 컨벤션 체크

- [x] `CLAUDE.md` 코딩 컨벤션 존재 (React + TypeScript + Tailwind + Supabase)
- [x] TypeScript strict 모드 사용
- [x] Tailwind CSS (tooltip은 `group-hover` 커스텀 패턴 사용)
- [x] Supabase RLS + hospital_id 격리
- [x] 낙관적 잠금 패턴 (`expectedCurrentStatus`) 기존 구현 존재

### 8.2 신규 환경변수

신규 환경변수 불필요 (기존 Supabase 연결 설정 재사용)

### 8.3 기존 패턴 준수 사항

| 패턴 | 기존 구현 | 신규 준수 방법 |
|------|-----------|---------------|
| Realtime 구독 | `orderService.subscribeToChanges()` | `returnService.subscribeToChanges()` 동일 패턴 |
| 낙관적 잠금 | `expectedCurrentStatus` 옵션 | 반품 상태 전환에도 동일 적용 |
| 트랜잭션 RPC | `create_order_with_items` RPC | `create_return_with_items` RPC 신규 생성 |
| 에러 처리 | `OrderMutationResult` 타입 | `ReturnMutationResult` 동일 패턴 |
| 권한 체크 | `canManageOrders` | 반품·교환 모든 액션에 동일 적용 |

---

## 9. 다음 단계

1. [ ] CTO(팀 리드) Plan 검토 및 승인
2. [ ] Design 문서 작성 (`order-return-management.design.md`)
   - DB 스키마 확정 (orders 테이블 변경 영향도 전수 검토)
   - UI 와이어프레임 (반품 관리 탭 레이아웃)
   - API/RPC 명세
3. [ ] Phase 1 구현 착수

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1 | 2026-02-28 | 초기 초안 작성 (조사 기반 + 현황 분석) | Product Manager |
