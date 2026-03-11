# Plan: order-return-remodel

## 개요
주문/반품 관리 전체 리모델링 — UX 개선, 코드 구조 분해, 신규 기능 5종 추가

**작성일**: 2026-03-12
**레벨**: Dynamic
**우선순위**: High

---

## 배경 및 목적

### 현재 상황
- `OrderManager.tsx` 950줄, `useOrderManager.ts` 582줄 — 단일 파일에 과도한 책임
- 모달 상태변수 10개 이상이 단일 컴포넌트에 집중
- 모바일 카드에서 품목 정보가 "외 N종"으로 잘려 상세 파악 불가
- 반품 완료 버튼이 확인 단계 없이 즉시 처리 → 실수 리스크
- 현재 반품 재고 차감은 신청(requested) 시점에 프론트엔드에서 일괄 처리
  → 실제 수령된 수량이 달라도 보정 불가

### 목표
1. **코드 구조 개선**: OrderManager 분해, 모달 상태 useReducer 전환
2. **UX 개선**: 카드 UI 가독성, 필터 접근성(모바일), 확인 단계 추가
3. **실수령 수량 기능**: 반품 완료 시 실제 수령 수량 입력 → 재고 정확도 향상

---

## 기능 요구사항

### F-01: 코드 구조 분해
- `OrderManager.tsx` → 레이아웃/모달관리/리스트 3개 컴포넌트로 분리
- 모달 상태 10개+ → `useReducer` 패턴으로 통합 관리
- PC 레이아웃 / 모바일 레이아웃 컴포넌트 명시적 분리

### F-02: 모바일 카드 UI 개선
- "외 N종" 텍스트 → 카드 내 접기/펴기(toggle)로 전체 품목 확인 가능
- 현재 혼합 리스트(발주+반품) 구조 유지
- 상태 배지 디자인 개선 (현재 배지 → 더 명확한 시각적 구분)

### F-03: 상태/제조사 필터 강화 (모바일)
- 모바일에서도 상태 필터 칩 (전체 / 진행중 / 완료 / 취소) 상단 접근 가능
- 제조사 필터 빠른 선택 (현재는 PC 사이드바에만 존재)

### F-04: 반품 완료 확인 단계
- "반품완료" 버튼 클릭 시 ConfirmModal 추가
- 확인 전에 반품 품목 요약 표시

### F-05: 품목 상세 모달 개선
- OrderReturnDetailModal / OrderDetailCard 에서 전체 품목 리스트 가시성 향상
- 현재 세로 테이블 → 브랜드/사이즈/수량 3열 명확하게

### F-06: ⭐ 반품 실수령 수량 입력 (핵심 신규)
- `수거완료 → 반품완료` 전환 시 품목별 실제 수령 수량 입력 모달 표시
- 입력된 실수령 수량 기준으로 최종 재고 차감 (신청 수량과 차이 발생 가능)
- 차이 발생 시 차이분 재고 원상복구
- DB: `return_request_items.actual_received_qty` 컬럼 추가

---

## 비기능 요구사항

- 기존 데이터 하위 호환: `actual_received_qty` NULL = 기존 방식(신청 수량 기준) 유지
- Realtime 구독 유지
- 낙관적 업데이트 패턴 유지
- 모바일/PC 모두 지원 (현재 반응형 구조 유지)

---

## 기술 범위

### 신규 DB 마이그레이션
```sql
-- return_request_items에 actual_received_qty 컬럼 추가
ALTER TABLE return_request_items
  ADD COLUMN actual_received_qty INTEGER DEFAULT NULL;
```

### 영향 파일 (예상)
| 파일 | 변경 유형 |
|------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_actual_received_qty.sql` | 신규 |
| `types/return.ts` | 타입 추가 |
| `services/returnService.ts` | 완료 RPC 수량 파라미터 추가 |
| `hooks/useReturnHandlers.ts` | 실수령 수량 처리 로직 |
| `components/OrderManager.tsx` | 구조 분해 |
| `components/order/OrderTableSection.tsx` | 카드 UI 개선 |
| `components/order/ReturnCompleteModal.tsx` | 신규 (실수령 수량 입력) |
| `components/order/OrderMobileFilterBar.tsx` | 신규 (모바일 필터 칩) |

### 영향 없는 범위
- `orderService.ts` (주문 로직 변경 없음)
- `BrandOrderModal.tsx` (발주 모달 변경 없음)
- `ReturnRequestModal.tsx` (신청 모달 변경 없음)
- RLS 정책 (hospital 격리 유지)

---

## 구현 순서

```
1. DB 마이그레이션 (actual_received_qty)
2. 타입 정의 업데이트
3. 서비스/훅 수정 (실수령 수량 처리)
4. ReturnCompleteModal 신규 컴포넌트
5. OrderManager 구조 분해 + useReducer
6. OrderTableSection 카드 UI 개선
7. OrderMobileFilterBar 신규 컴포넌트
8. 통합 테스트
```

---

## 완료 기준

- [ ] F-01: OrderManager.tsx < 400줄, 모달 상태 useReducer 통합
- [ ] F-02: 카드에서 전체 품목 접기/펴기 동작
- [ ] F-03: 모바일 필터 칩 렌더링 및 동작
- [ ] F-04: 반품완료 버튼 → ConfirmModal 표시 후 처리
- [ ] F-05: 상세 모달 품목 테이블 가시성 향상
- [ ] F-06: 실수령 수량 입력 → DB 저장 → 재고 정확 반영
- [ ] TypeScript 에러 없음
- [ ] 기존 주문/반품 CRUD 기능 정상 동작 유지
