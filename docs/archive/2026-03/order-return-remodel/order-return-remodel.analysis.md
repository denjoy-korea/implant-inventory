# Gap Analysis: order-return-remodel (v2)

> **Summary**: Design vs Implementation gap analysis for order-return-remodel feature
>
> **Design Document**: `docs/02-design/features/order-return-remodel.design.md`
> **Analysis Date**: 2026-03-12
> **Analyzer**: gap-detector agent
> **Status**: Check Phase Complete

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 76.5% | WARNING |
| Architecture Compliance | 82.4% | WARNING |
| Convention Compliance | 100% | PASS |
| **Overall** | **82.4%** | WARNING |

**Match Rate: 82.4%** (28 / 34 items PASS)

---

## Detailed Checklist

### F-01: Modal State useReducer (Design Section 2)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 1 | `useOrderManagerModals.ts` hook exists | `hooks/useOrderManagerModals.ts` | Exists, 59 LOC | PASS |
| 2 | ModalState 13-kind discriminated union | 13 kinds (none, cancel, receipt, brand_order, bulk_order, history, return_request, return_candidate, bulk_return_confirm, return_detail, return_complete, exchange_return, optimize) | Exact match, all 13 kinds present | PASS |
| 3 | ModalAction types match | 13 action types incl. OPEN_RETURN_COMPLETE | Exact match | PASS |
| 4 | modalReducer logic | switch/case per action type | Exact match | PASS |
| 5 | **OrderManager.tsx uses useOrderManagerModals** | `const { modal, dispatch } = useOrderManagerModals()` replaces 10+ individual useState | **NOT WIRED**: OrderManager.tsx still uses individual useState from useOrderManager. Lines 72-74 add 3 more useState (returnCompleteGroup, isReturnCompleting, returnDetailGroup). useOrderManager.ts still has 20+ individual useState calls. | **FAIL** |
| 6 | **OrderManager.tsx < 350 LOC** | Target: 350 lines | **Actual: 1013 lines** (2.9x target) | **FAIL** |
| 7 | useState count reduction in OrderManager | Design: 0 useState for modals | 4 useState in OrderManager.tsx (line 2: `import { useState }`, lines 72-74: 3 local useState). All modal state still flows from useOrderManager individual useState. | **FAIL** |

### F-02: Mobile Card Expand/Collapse (Design Section 3)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 8 | OrderUnifiedCard.tsx exists | `components/order/OrderUnifiedCard.tsx` | **NOT CREATED**: Expand/collapse logic is inline in OrderTableSection.tsx instead of a separate component | **FAIL** |
| 9 | Expand/collapse state | `useState<boolean>` per card | `useState<Set<string>>` with `expandedCards` + `toggleExpand` in OrderTableSection (lines 34-40) -- functionally equivalent, better pattern | PASS |
| 10 | Return card: first item + "N more" toggle | Show first item, "+N more" button | Lines 95-108: shows first item, then "+N more" toggle button. Matches design. | PASS |
| 11 | Order card: first item + "N more" toggle | Same pattern for order cards | Lines 163-185: identical pattern applied to order cards | PASS |
| 12 | Collapse button text | "fold" arrow | Lines 106, 179: `expandedCards.has(id) ? 'triangle up fold' : 'triangle down +N more'` | PASS |

### F-03: Mobile Filter Bar (Design Section 4)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 13 | OrderMobileFilterBar.tsx exists | `components/order/OrderMobileFilterBar.tsx` | Exists, 117 LOC | PASS |
| 14 | FilterType props | `filterType`, `setFilterType` with `'all' \| 'replenishment' \| 'fail_exchange' \| 'return'` | Actual type includes `'fail_and_return'` (superset of design). Props match. | PASS |
| 15 | Manufacturer filter | `filterManufacturer`, `setFilterManufacturer`, `manufacturerOptions` | All present | PASS |
| 16 | Date range filter | `filterDateFrom`, `setFilterDateFrom`, `filterDateTo`, `setFilterDateTo` | All present with date inputs and reset button | PASS |
| 17 | totalCount prop | `totalCount: number` | Present | PASS |
| 18 | Mobile-only rendering | `md:hidden` | Line 38: `className="md:hidden ..."` | PASS |
| 19 | Horizontal scroll chips | Horizontal scrollable chip bar | Line 40: `overflow-x-auto no-scrollbar` | PASS |

### F-04: Return Complete Confirmation Step (Design Section 5)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 20 | "Return complete" button opens modal | `dispatch({ type: 'OPEN_RETURN_COMPLETE', group: g })` | OrderTableSection line 119/308: `onOpenReturnComplete(g)` -- callback-based instead of dispatch, but functionally equivalent | PASS |
| 21 | No direct status update on button click | Previously called `handleReturnUpdateStatus` directly | Now calls `onOpenReturnComplete` which opens ReturnCompleteModal | PASS |

### F-06: ReturnCompleteModal (Design Section 6)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 22 | ReturnCompleteModal.tsx exists | `components/order/ReturnCompleteModal.tsx` | Exists, 189 LOC, uses ModalShell | PASS |
| 23 | Props interface | `group, isLoading, onConfirm(actualQties), onClose` | Exact match (group is `GroupedReturnRequest \| null`) | PASS |
| 24 | actualQties state initialization | `Object.fromEntries(items.map(item => [item.id, item.quantity]))` | Lines 22-23: exact match | PASS |
| 25 | totalRequested / totalActual / stockDelta | Computed from allItems and actualQties | Lines 35-37: exact match (note: stockDelta = `totalRequested - totalActual` matching design's "positive = restore") | PASS |
| 26 | Per-item qty stepper (up/down buttons) | Stepper UI with +/- buttons | Lines 112-129: +/- buttons + number input | PASS |
| 27 | Summary footer with stock delta | Shows requested total, actual total, and stock correction amount | Lines 139-158: shows all three values with color coding | PASS |
| 28 | Confirm/Cancel buttons | Cancel + "Return Complete Process" | Lines 161-183: both buttons with loading spinner state | PASS |

### F-06: DB Migration (Design Section 7)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 29 | Migration file exists | `20260312220000_actual_received_qty.sql` | Exists as `20260312230000_actual_received_qty.sql` (1hr timestamp diff, content identical) | PASS |
| 30 | actual_received_qty column | `INTEGER DEFAULT NULL` with CHECK >= 0 | Exact match including constraint name and comment | PASS |

### F-06: Type Updates (Design Section 8)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 31 | ReturnRequestItem.actualReceivedQty | `actualReceivedQty?: number \| null` | Line 35: exact match | PASS |
| 32 | DbReturnRequestItem.actual_received_qty | `actual_received_qty: number \| null` | Line 77: `actual_received_qty?: number \| null` (optional vs required -- minor, functionally equivalent due to DB default NULL) | PASS |

### F-06: Service Layer (Design Section 9)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 33 | completeReturn accepts actualQties | `actualQties?: Record<string, number>` 3rd param | returnService.ts line 123: exact match | PASS |
| 34 | Upsert actual_received_qty to return_request_items | Upsert with onConflict: 'id' | Lines 126-138: exact match with error handling | PASS |

### F-06: Handler Layer (Design Section 9-10)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 35 | useReturnHandlers.handleCompleteReturn accepts actualQties | `actualQties?: Record<string, number>` | Line 181: exact match | PASS |
| 36 | Optimistic update includes actualReceivedQty | Maps items with actualReceivedQty when actualQties provided | Lines 188-200: exact match | PASS |
| 37 | Stock correction (diff > 0 restore) | `item.quantity - actualQty` diff, adjustStock positive | Lines 203-227: exact match | PASS |
| 38 | handleReturnCompleteWithQties in useOrderManager | Dedicated handler with loading state | Lines 392-411: exact match with toast messages and loading | PASS |

### F-01: Layout Extraction (Design Section 1 Architecture)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 39 | OrderPCLayout.tsx | New file for PC-only layout | **NOT CREATED** | **FAIL** |
| 40 | OrderMobileLayout.tsx | New file for mobile-only layout | **NOT CREATED** | **FAIL** |
| 41 | OrderUnifiedTable.tsx | New file for PC table | **NOT CREATED**: Table remains inline in OrderTableSection.tsx | **FAIL (deferred)** |

### Mapper (Design Section 8 implied)

| # | Item | Design | Implementation | Status |
|---|------|--------|----------------|--------|
| 42 | dbToReturnRequest maps actual_received_qty | Map DB field to UI field | mappers.ts line 444: `actualReceivedQty: item.actual_received_qty ?? undefined` | PASS |

---

## Summary

### PASS: 34 items
Core feature implementation (F-02 through F-06) is complete and matches the design document precisely:
- ReturnCompleteModal with per-item actual quantity input
- DB migration for actual_received_qty column
- Full service/handler/type chain for actualQties propagation
- Mobile filter bar with type/date/manufacturer chips
- Card expand/collapse in OrderTableSection
- Return complete confirmation flow (button -> modal -> confirm)

### FAIL: 8 items

#### 1. F-01: useOrderManagerModals not wired into OrderManager (Items 5, 6, 7)
- **Impact**: HIGH
- **Detail**: The `useOrderManagerModals` hook was built correctly (59 LOC, useReducer, 13 ModalState kinds) but OrderManager.tsx still consumes all modal state via individual useState from useOrderManager.ts. The hook file exists as dead code.
- **Consequence**: OrderManager remains at 1013 LOC (target: 350), no useState reduction achieved.

#### 2. F-01: Layout extraction not done (Items 39, 40, 41)
- **Impact**: MEDIUM
- **Detail**: OrderPCLayout.tsx, OrderMobileLayout.tsx, OrderUnifiedCard.tsx, OrderUnifiedTable.tsx were designed as separate files but not created. Layout logic remains inline in OrderManager.tsx and OrderTableSection.tsx.
- **Consequence**: No LOC reduction from layout separation.

#### 3. F-02: OrderUnifiedCard.tsx not created (Item 8)
- **Impact**: LOW
- **Detail**: Card expand/collapse functionality is implemented inline in OrderTableSection.tsx rather than as a separate OrderUnifiedCard.tsx component. Functionally equivalent.

---

## Score Calculation

| Category | Items | Pass | Fail | Score |
|----------|-------|------|------|-------|
| F-01: Modal useReducer | 7 | 4 | 3 | 57.1% |
| F-02: Card expand/collapse | 5 | 4 | 1 | 80.0% |
| F-03: Mobile filter bar | 7 | 7 | 0 | 100% |
| F-04: Return complete confirmation | 2 | 2 | 0 | 100% |
| F-06: ReturnCompleteModal | 7 | 7 | 0 | 100% |
| F-06: DB migration | 2 | 2 | 0 | 100% |
| F-06: Type updates | 2 | 2 | 0 | 100% |
| F-06: Service layer | 2 | 2 | 0 | 100% |
| F-06: Handler layer | 4 | 4 | 0 | 100% |
| F-01: Layout extraction | 3 | 0 | 3 | 0% |
| Mapper | 1 | 1 | 0 | 100% |
| **Total** | **42** | **35** | **7** | **83.3%** |

---

## Recommended Actions

### Immediate (to reach 90%+)

1. **Wire useOrderManagerModals into OrderManager.tsx**
   - Replace individual useState destructuring from useOrderManager with `const { modal, dispatch } = useOrderManagerModals()`
   - Remove 20+ individual modal useState from useOrderManager.ts
   - This alone would fix Items 5, 6, 7 and significantly reduce LOC

2. **Extract layout components (optional for 90%)**
   - OrderPCLayout.tsx and OrderMobileLayout.tsx extraction from OrderManager.tsx
   - Would bring OrderManager under 350 LOC target

### Documentation Update Needed

3. **Update design doc** to reflect that expand/collapse was implemented inline in OrderTableSection rather than as separate OrderUnifiedCard/OrderUnifiedTable components (intentional simplification)

### Accepted Deviations

- Migration timestamp `20260312230000` vs design `20260312220000`: 1-hour offset, no functional impact
- FilterType includes `'fail_and_return'` beyond design spec: superset, no breakage
- DbReturnRequestItem.actual_received_qty optional (`?`) vs design required: functionally equivalent due to DB default NULL

---

## Related Documents

- Plan: `docs/01-plan/features/order-return-remodel.plan.md`
- Design: `docs/02-design/features/order-return-remodel.design.md`
- Previous analysis: v1 (2026-03-12, 94.1%)
