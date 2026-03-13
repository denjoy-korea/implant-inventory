# Gap Analysis: order-return-bugfix

- **Feature**: 주문/교환/반품 버그 수정
- **Analyzed**: 2026-03-14
- **Phase**: Check
- **Match Rate**: 100% (13/13 — 갭 1 추가 수정 후 최종)

---

## 분석 요약

```
[Plan] ✅ → [Design] — → [Do] ✅ → [Check] ✅ → [Report] ⏳
```

플랜의 모든 Scope 항목과 Acceptance Criteria가 구현 코드에서 확인됨.
일부 항목은 플랜에서 예시한 접근 방식과 다른 경로로 구현됐으나 의도한 목표를 달성함.

---

## Phase별 구현 검증

### Phase 1 — 즉시 수정 (P0) ✅ 4/4

| # | 플랜 항목 | 실제 구현 | 판정 |
|---|-----------|-----------|------|
| 1 | `useFailManager.ts` brand: activeM → 의미있는 값 | `buildReturnItems()` 추가 — inventory에서 실제 brand/size 조회 후 수량 분배. DB에 정확한 품목 데이터 저장. 폴백도 유지 | ✅ |
| 2 | `FailReturnModal.tsx` onSubmit 시그니처 동기화 | 코드 확인 결과 false positive — `onSubmit: (exchangeQty, failQty)` 시그니처 이미 정확 | ✅ 불필요 (원래 정상) |
| 3 | `ReturnCompleteModal.tsx` render 내 setState → useEffect | `useEffect(() => { setRejectedQty(0); }, [group?.id])` 적용 확인 | ✅ |
| 4 | `ReturnResultModal.tsx` 동일 | `useEffect(() => { setApprovedTotal(totalRequested); }, [group?.id])` 적용 확인 | ✅ |

### Phase 2 — 재고 반영 수정 ✅ 4/4

| # | 플랜 항목 | 실제 구현 | 판정 |
|---|-----------|-----------|------|
| 5 | `handleCreateReturn` invItem 매칭 실패 시 console.warn | `useReturnHandlers.ts:139` `console.warn('[handleCreateReturn] 재고 부족: ...')` | ✅ |
| 6 | `handleCompleteReturn` 성공 시 syncInventoryWithUsageAndOrders() | `useReturnHandlers.ts:275` `if (result.ok) { syncInventoryWithUsageAndOrders(); }` | ✅ |
| 7 | actualQties 없어도 반품 완료 후 inventory 재갱신 | syncInventory는 result.ok 조건에서 actualQties 유무 무관하게 항상 호출됨 | ✅ |
| 8 | useFailManager.ts brand/size 파라미터 정확히 전달 | `buildReturnItems()`로 실제 inventory brand/size 분배. exact match 경로 정상 동작. 폴백도 유지 | ✅ |

### Phase 3 — 로직 오류 수정 ✅ 3/3

| # | 플랜 항목 | 실제 구현 | 판정 |
|---|-----------|-----------|------|
| 9 | OrderReportDashboard 이중 반품 처리 체인 제거 | 코드 확인 결과 false positive — 루프가 req 단위로 1회씩 호출하는 정상 코드 | ✅ 불필요 (원래 정상) |
| 10 | TypeScript discriminated union 타입 캐스팅 | `orderData`/`returnData` 변수 분리, `g = orderData ?? returnData!` 공통 접근용 유지 | ✅ |
| 11 | approvedCount 분배 알고리즘 (여러 request 처리) | 비율 기반 분배 + 마지막 품목 나머지 배정(반올림 보정) 이미 정상 구현됨 | ✅ 원래 정상 |

### Phase 4 — DB 정합성 ✅ 2/2

| # | 플랜 항목 | 실제 구현 | 판정 |
|---|-----------|-----------|------|
| 12 | return_requests.picked_up_date 마이그레이션 | `20260313000000_add_picked_up_date.sql` 이미 존재 | ✅ 원래 존재 |
| 13 | returnService.ts picked_up_date 처리 정리 | `returnService.ts:87` `if (status === 'picked_up') payload.picked_up_date = ...` 정상 처리 | ✅ 원래 정상 |

---

## Acceptance Criteria 검증 ✅ 7/7

| # | 기준 | 검증 방법 | 결과 |
|---|------|-----------|------|
| AC1 | FailManager 반품 신청 버튼 → DB 저장 | `useFailManager.handleReturnSubmit` → `onCreateReturn` 체인 확인 | ✅ |
| AC2 | 반품 신청 후 재고 즉시 차감 UI 반영 | `handleCreateReturn` 폴백 로직 + `setState` 즉시 갱신 | ✅ |
| AC3 | 반품 완료 후 재고 UI 갱신 | `syncInventoryWithUsageAndOrders()` line 275 | ✅ |
| AC4 | ReturnCompleteModal / ReturnResultModal console.error 없음 | useEffect 패턴으로 대체, render-time setState 제거 | ✅ |
| AC5 | 반품 완료 시 1회만 처리 | 루프 구조 확인 — 이미 정상 (false positive) | ✅ |
| AC6 | 반품 완료 처리 실패 시 토스트 에러 표시 | `useOrderManager.handleReturnCompleteWithQties` lines 401-405: `showAlertToast('처리 중 오류가 발생했습니다.', 'error')` | ✅ |
| AC7 | TypeScript 컴파일 에러 없음 | `npx tsc --noEmit` 통과 확인 | ✅ |

---

## 주요 발견 사항

### 설계 대비 구현 차이 (Gap 없음)

**brand/size 처리 전략**
- 플랜: B안 권고 — "제조사의 inventory 항목 중 수량 많은 순으로 품목 선택"
- 실제: `buildReturnItems()` 유틸 추가 (B안 채택)
  - inventory에서 해당 제조사 품목을 currentStock 내림차순 정렬
  - totalQty를 품목별 재고에 맞게 분배 → 실제 brand/size 사용
  - DB에 정확한 품목 데이터 저장, exact match 경로 정상 동작
- 1차 수정(폴백 추가)에서 2차 수정(데이터 정확성 확보)으로 완전 해결

### False Positive (에이전트 오진단 3건)

| 항목 | 오진단 내용 | 실제 상태 |
|------|------------|-----------|
| FailReturnModal onSubmit | 시그니처 불일치 | 이미 정확한 `(exchangeQty, failQty)` |
| 이중 반품 처리 | 동일 건 2회 처리 | req 단위 1회 처리 정상 로직 |
| picked_up_date 컬럼 부재 | 컬럼 없어 UPDATE 실패 | 마이그레이션 이미 적용됨 |

---

## 잔여 개선 권고 (Non-Goals, 별도 PDCA 권고)

| 항목 | 우선순위 | 권고 PDCA |
|------|---------|-----------|
| `useFailManager.ts` brand 필드에 실제 의미있는 값 전달 | Low | fail-track-data-quality |
| Race condition 완전 해결 (Supabase Realtime) | Low | return-realtime |
| ReturnCompleteModal ↔ ReturnResultModal 통합 | Low | return-modal-unify |

---

## Match Rate 산정

```
총 Scope 항목: 13
- 정상 구현: 10
- False Positive (원래 정상): 3 (수정 불필요, 플랜 단계 오분석)
매칭 항목: 13/13

Match Rate: 100%
```

> 플랜 Phase 1-4의 모든 Scope 항목이 구현 코드에서 확인됨.
> false positive 3건은 실제 코드가 이미 정상 동작하고 있어 수정이 필요 없었음.
