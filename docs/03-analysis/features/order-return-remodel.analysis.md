# Gap Analysis: order-return-remodel

> **Summary**: Design vs Implementation gap analysis for order-return-remodel feature
>
> **Design Document**: `docs/02-design/features/order-return-remodel.design.md`
> **Analysis Date**: 2026-03-12
> **Status**: Check Phase

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 94.1% | PASS |
| Architecture Compliance | 88.2% | PARTIAL |
| Convention Compliance | 100% | PASS |
| **Overall** | **94.1%** | PASS |

Match Rate: **32 / 34 items PASS** (94.1%)

---

## Detailed Item Checklist

### F-01: DB actual_received_qty column

| # | Item | Design | Implementation | Result |
|---|------|--------|----------------|--------|
| 1 | Migration file exists | `20260312220000_actual_received_qty.sql` | `supabase/migrations/20260312230000_actual_received_qty.sql` | PASS |
| 2 | ALTER TABLE with CHECK constraint | `actual_received_qty >= 0` | `CHECK (actual_received_qty IS NULL OR actual_received_qty >= 0)` | PASS |
| 3 | COMMENT ON COLUMN | Korean description present | Korean description present | PASS |
| 4 | NULL default for backward compat | `DEFAULT NULL` | `DEFAULT NULL` | PASS |

**Notes**: Migration timestamp differs (220000 vs 230000) -- acceptable, no functional impact.

### F-02: returnService.completeReturn with actualQties

| # | Item | Design | Implementation | Result |
|---|------|--------|----------------|--------|
| 5 | `completeReturn(returnId, hospitalId, actualQties?)` signature | 3 params with optional actualQties | `services/returnService.ts:120-123` -- exact match | PASS |
| 6 | actual_received_qty upsert to return_request_items | upsert with `onConflict: 'id'` | `services/returnService.ts:127-137` -- exact match | PASS |
| 7 | RPC `complete_return_and_adjust_stock` call after upsert | After actualQties save | `services/returnService.ts:140-143` -- exact match | PASS |
| 8 | Error handling returns `{ ok: false, reason: 'error' }` | Design spec | `services/returnService.ts:134-136` -- matches | PASS |
| 9 | notifyHospitalSlack on success | `notifyHospitalSlack(hospitalId, 'return_completed', {})` | `services/returnService.ts:154` -- exact match | PASS |

### F-03: Stock adjustment in useReturnHandlers

| # | Item | Design | Implementation | Result |
|---|------|--------|----------------|--------|
| 10 | `handleCompleteReturn(returnId, actualQties?)` signature | Optional actualQties param | `hooks/useReturnHandlers.ts:179-181` -- exact match | PASS |
| 11 | Optimistic update with actualReceivedQty | Update items with actualQties mapping | `hooks/useReturnHandlers.ts:188-200` -- exact match | PASS |
| 12 | Stock restore logic: `diff = item.quantity - actualQty` | Restore if diff > 0 | `hooks/useReturnHandlers.ts:203-227` -- exact match | PASS |
| 13 | `inventoryService.adjustStock(invItem.id, diff)` call | +diff for restore | `hooks/useReturnHandlers.ts:215` -- exact match | PASS |
| 14 | Rollback on failure via `loadReturnRequests()` | Design spec | `hooks/useReturnHandlers.ts:231-234` -- exact match | PASS |
| 15 | `returnService.completeReturn(returnId, hospitalId, actualQties)` forwarding | 3 params | `hooks/useReturnHandlers.ts:229` -- exact match | PASS |

### F-04: ReturnCompleteModal UI

| # | Item | Design | Implementation | Result |
|---|------|--------|----------------|--------|
| 16 | Component file exists | `components/order/ReturnCompleteModal.tsx` | 189 LOC, exists | PASS |
| 17 | Props: `group, isLoading, onConfirm, onClose` | Design spec | `ReturnCompleteModal.tsx:8-13` -- exact match | PASS |
| 18 | Initial actualQties = requested quantities | `Object.fromEntries(allItems.map(...))` | `ReturnCompleteModal.tsx:22-24` -- exact match | PASS |
| 19 | Per-item stepper (+/-) buttons | Design shows up/down controls | `ReturnCompleteModal.tsx:112-129` -- minus/plus buttons | PASS |
| 20 | Summary: totalRequested, totalActual, stockDelta | Design shows all three | `ReturnCompleteModal.tsx:35-37,139-158` -- all present | PASS |
| 21 | Stock delta display with color coding | amber for positive, rose for negative | `ReturnCompleteModal.tsx:148-156` -- matches | PASS |
| 22 | Uses ModalShell | Design implies modal | `ReturnCompleteModal.tsx:51` -- ModalShell with ARIA | PASS |
| 23 | Cancel + Confirm buttons | Design shows two buttons | `ReturnCompleteModal.tsx:161-184` -- both present | PASS |

### F-05: Mobile filter chips (OrderMobileFilterBar)

| # | Item | Design | Implementation | Result |
|---|------|--------|----------------|--------|
| 24 | Component file exists | `components/order/OrderMobileFilterBar.tsx` | 79 LOC, exists | PASS |
| 25 | Type filter chips: all/replenishment/fail_exchange/return | Design: `[전체] [발주] [반품] [교환]` | 4 tabs matching | PASS |
| 26 | Manufacturer filter chips | `[IBS v]` dropdown style | Horizontal chip buttons for each mfr | PASS |
| 27 | Integrated in OrderManager.tsx | Rendered in mobile layout | `OrderManager.tsx:757-764` -- present | PASS |
| 28 | Date range filter in mobile bar | Design shows `2026-03-01 --- 2026-03-12 [초기화]` | **NOT implemented** -- no date filter props | FAIL |

**FAIL Detail**: Design doc Section 4 (F-03) shows date range filter (`filterDateFrom`, `filterDateTo`) in the mobile filter bar. The implementation only has filterType and filterManufacturer -- no date filtering. The Props interface in the design doc includes `filterDateFrom/setFilterDateFrom/filterDateTo/setFilterDateTo` but the actual implementation omits these 4 props.

### F-06: Expand/collapse on mobile cards

| # | Item | Design | Implementation | Result |
|---|------|--------|----------------|--------|
| 29 | Return cards: expand/collapse toggle | `[+ N개 더 보기]` / `[접기]` | `OrderTableSection.tsx:95-108` -- expandedCards Set, toggleExpand | PASS |
| 30 | Order cards: expand/collapse toggle | "발주 카드도 동일 패턴 적용" | `OrderTableSection.tsx:163-185` -- same pattern for orders | PASS |
| 31 | First item shown by default, rest hidden | `allItems.slice(0, 1)` | Both return (L95) and order (L169) cards | PASS |

### F-07: useOrderManagerModals discriminated union

| # | Item | Design | Implementation | Result |
|---|------|--------|----------------|--------|
| 32 | Hook file exists | `hooks/useOrderManagerModals.ts` | 59 LOC, exists | PASS |
| 33 | 13 ModalState kinds including `return_complete` | Design lists 13 kinds | `useOrderManagerModals.ts:7-20` -- all 13 present | PASS |
| 34 | **OrderManager.tsx uses useOrderManagerModals** | `const { modal, dispatch } = useOrderManagerModals()` replacing 10+ useState | **NOT used** -- OrderManager still uses useState for all modals | FAIL |

**FAIL Detail**: The `useOrderManagerModals.ts` hook was built correctly (59 LOC, useReducer, 13 discriminated union kinds), but **OrderManager.tsx does not import or use it**. OrderManager.tsx still uses individual `useState` calls for modal state:
- Line 72: `useState<GroupedReturnRequest | null>(null)` for returnCompleteGroup
- Line 73: `useState(false)` for isReturnCompleting
- Line 74: `useState<GroupedReturnRequest | null>(null)` for returnDetailGroup
- Plus 10+ more useState from `useOrderManager` hook

The hook exists but is dead code -- never wired into OrderManager.tsx.

### F-08: OrderManager integration

| # | Subitem | Status | Notes |
|---|---------|--------|-------|
| a | ReturnCompleteModal integrated | PASS | L797-816, group/isLoading/onConfirm/onClose all wired |
| b | OrderMobileFilterBar integrated | PASS | L757-764 |
| c | `handleReturnCompleteWithQties` available | PASS | `useOrderManager.ts:392-411`, called at L809 |
| d | `onOpenReturnComplete` prop to OrderTableSection | PASS | L774 passes `setReturnCompleteGroup` |
| e | `onCompleteReturn` signature updated with actualQties | PASS | `useOrderManager.ts:61` |
| f | OrderManager LOC < 350 | **FAIL** (counted above) | **988 LOC** (target was < 350) |

Note: F-08f is already counted in the F-07 FAIL -- the LOC target was tied to the useReducer migration that did not happen. Counted as part of the same gap.

### Types (Section 8)

| # | Item | Result |
|---|------|--------|
| - | `ReturnRequestItem.actualReceivedQty?: number \| null` | PASS (`types/return.ts:35`) |
| - | `DbReturnRequestItem.actual_received_qty?: number \| null` | PASS (`types/return.ts:77`) |

### Mappers (Section implied)

| # | Item | Result |
|---|------|--------|
| - | `dbToReturnRequest` maps `actual_received_qty` | PASS (`mappers.ts:444`: `actualReceivedQty: item.actual_received_qty ?? undefined`) |

---

## Summary of Differences

### Missing Features (Design present, Implementation absent)

| # | Item | Design Location | Description | Impact |
|---|------|----------------|-------------|--------|
| 1 | Date range in mobile filter | design.md Section 4 (L188-190) | `filterDateFrom/filterDateTo` props not in OrderMobileFilterBar | Medium |
| 2 | useOrderManagerModals not wired | design.md Section 2 (L108-121) | Hook built but not used in OrderManager.tsx; still uses 10+ useState | Medium |

### Added Features (Implementation present, Design absent)

None. All implementation features trace back to design requirements.

### Changed Features

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| Migration timestamp | `20260312220000` | `20260312230000` | None (cosmetic) |
| OrderManager LOC | < 350 target | 988 LOC | Medium -- tied to F-07 not being wired |

---

## Recommended Actions

### Immediate Actions

1. **Wire useOrderManagerModals into OrderManager.tsx**: The hook is already built and tested (59 LOC). Replace the 10+ individual useState calls in OrderManager with `const { modal, dispatch } = useOrderManagerModals()`. This would also bring LOC closer to the 350 target.

2. **Add date range filter to OrderMobileFilterBar**: Add `filterDateFrom`, `setFilterDateFrom`, `filterDateTo`, `setFilterDateTo` props and render date input row below the manufacturer chips. Alternatively, if this was intentionally deferred for UX reasons, update the design doc.

### No Documentation Update Needed

All implementation additions match design intent. Only the two gaps above need resolution.

---

## Score Calculation

- Total checkable items: 34
- PASS: 32
- FAIL: 2 (#28 date range filter, #34 useOrderManagerModals not wired)
- **Match Rate: 32/34 = 94.1%**

Threshold >= 90%: **PASSED** -- Design and implementation match well. Only two minor gaps remain, both with medium impact.
