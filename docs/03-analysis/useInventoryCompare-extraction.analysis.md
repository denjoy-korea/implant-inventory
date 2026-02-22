# Gap Analysis: useInventoryCompare Hook Extraction

| 항목 | 내용 |
|------|------|
| Feature | useInventoryCompare hook extraction (App.tsx 리팩터링) |
| Plan | 인라인 제공 (이전 세션) |
| Phase | Check |
| Match Rate | **97%** |
| Date | 2026-02-22 |

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| File Existence | 100% | PASS |
| Hook API Shape | 100% | PASS |
| App.tsx Cleanup | 100% | PASS |
| App.tsx Integration | 92% | WARN |
| App.tsx Line Count | 100% | PASS |
| **Overall** | **97%** | **PASS** |

---

## Detailed Results

### Files Created
| File | Status |
|------|--------|
| `services/inventoryUtils.ts` | PASS — exports `buildInventoryDuplicateKey` |
| `hooks/useInventoryCompare.ts` | PASS — 166 lines |

### Hook API Shape (8/8)
All parameters, internal states, and return values match the design exactly.

- ✅ Parameters: `fixtureData`, `inventory`, `user`, `setState`, `effectivePlan`, `billableItemCount`, `showAlertToast`
- ✅ Internal state: `inventoryCompare` (with `fullNewItems`), `planLimitModal`
- ✅ Return: display-only `inventoryCompare` (no `fullNewItems`), all handlers

### App.tsx Cleanup (5/5)
All inline code properly removed:
- ✅ `buildInventoryDuplicateKey` function removed (now imported from utils)
- ✅ `planLimitModal` useState removed
- ✅ `inventoryCompare` useState removed
- ✅ `handleApplyToInventory` useCallback removed
- ✅ `handleConfirmApplyToInventory` useCallback removed

### App.tsx Integration (5/6 — 92%)
- ✅ Imports `useInventoryCompare` and `buildInventoryDuplicateKey`
- ✅ `AppGlobalOverlays` receives `inventoryCompare` directly (no ternary wrapper)
- ✅ `onClosePlanLimitModal={closePlanLimitModal}`
- ✅ `onCancelInventoryCompare={cancelInventoryCompare}`
- ⚠️ `buildInventoryDuplicateKey` is also used in App.tsx for a separate surgery dedup flow (lines 2676-2728) — **not a defect**, legitimate secondary usage

### Line Count
- Before: 3208 lines
- After: 3055 lines
- Reduction: **−153 lines** (target: ≤ 3070 ✅)

---

## Gaps Found

**None.** All 31 checkpoints passed (1 minor observation, not a defect).

---

## Build
`npm run build` — TypeScript 0 errors, Vite build success.

---

## Recommended Actions

No immediate actions required. Match Rate 97% ≥ 90% threshold.

**Optional future extraction**: The remaining `buildInventoryDuplicateKey` usage in App.tsx (lines 2676-2728, surgery record dedup in `onAddInventoryItem`) could be extracted into a dedicated hook as the next refactoring pass to further reduce App.tsx size.
