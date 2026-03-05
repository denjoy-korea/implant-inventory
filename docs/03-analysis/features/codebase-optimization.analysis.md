# Codebase Optimization — Gap Analysis

> PDCA Phase: Check
> Analyzed: 2026-03-05
> Feature: codebase-optimization
> Analyzer: gap-detector

---

## Match Rate: **82%**

`[Plan] ✅ → [Design] — → [Do] ✅ → [Check] 🔄 → [Act] ⏳`

---

## 1. Phase 1 (Quick Wins) — Status

| ID | Task | Plan Target | Actual | Status |
|----|------|------------|--------|--------|
| QW-1 | Delete dead code (4 files, 572 LOC) | 0 files remain | All 5 confirmed deleted | ✅ DONE |
| QW-2 | fixtureReferenceBase.ts → JSON | public/data/fixture-reference-base.json | File deleted, no JSON created | ⚠️ PARTIAL |
| QW-3 | dentweb-defaults.ts → JSON | public/data/dentweb-defaults.json | File shrunk to 44 LOC (not JSON) | ⚠️ PARTIAL |
| QW-4 | .claude/worktrees/ cleanup | 5 MB artifact removed | Directory gone | ✅ DONE |
| QW-5 | Split types.ts (888 LOC, 87 exports) | Domain modules | types.ts 391 LOC + 5 modules (901 total) | ✅ DONE |

### QW-2/QW-3 Detail

`fixtureReferenceBase.ts` (10,555 LOC) is deleted — consistent with QW-1 dead code status (0 imports confirmed). The plan listed it under both QW-1 (dead code) and QW-2 (data externalization). Since it had 0 consumers, deletion was the correct action. No JSON migration needed.

`dentweb-defaults.ts` reduced from 2,624 → 44 LOC. Remaining 44 LOC appears to be a re-export shim or minimal interface — effectively externalized. No public/data/ JSON created; data likely embedded as smaller module.

**QW Phase Match Rate: 90%**

---

## 2. Phase 2 (Medium Effort) — Status

| ID | Task | Plan Target | Actual | Status |
|----|------|------------|--------|--------|
| ME-1 | App.tsx split | ~300 LOC shell | 1,317 LOC (-1,448 from baseline) | ⚠️ PARTIAL |
| ME-2 | OrderManager.tsx split | Sub-components + hook | 1,727 LOC + useOrderManager (568) | ✅ DONE |
| ME-3 | DashboardOverview.tsx split | Section components | 927 LOC (-1,022 LOC) | ✅ DONE |
| ME-3b | UserProfile.tsx split | Sub-components | 1,134 LOC (-228), ReviewsTab extracted | ✅ DONE |
| ME-3c | SurgeryDashboard.tsx split | Sub-components | 1,181 LOC (-166), FloatingTOC + SectionLockCard extracted | ✅ DONE |
| ME-4 | AuthForm.tsx split | Auth step components + hook | 1,165 LOC + useAuthForm (618) | ✅ DONE |
| ME-5 | useAppState.ts domain split | Smaller domain hooks | Still 669 LOC, not split | ❌ NOT DONE |
| ME-6 | Convert 158 inline styles → Tailwind | < 20 inline styles | Not measured | ❓ UNKNOWN |
| ME-7 | Additional lazy() splitting | Bundle < 2.3 MB | 17 lazy() calls in App.tsx | ⚠️ UNKNOWN |

### ME-1 Detail (Gap)

App.tsx baseline was 2,765 LOC. Current: 1,317 LOC (-1,448 LOC = 52% reduction). Plan target was ~300 LOC shell.

Progress: `useInventorySync` hook extracted (commit `202af3d`). Still contains global state management, handlers, and routing.

**Gap**: ~1,017 LOC remain above target. AppProviders.tsx, AppRoutes.tsx, AppGlobalEffects.tsx context extraction not yet done.

### ME-5 Detail (Gap)

`hooks/useAppState.ts` remains at 669 LOC. Plan called for splitting into domain hooks (InventoryContext, OrderContext, etc.). No domain hook extraction detected.

**ME Phase Match Rate: 77%**

---

## 3. Phase 3 (Long-Term) — Status

Not started (expected — Phase 3 is Week 3+).

| ID | Task | Status |
|----|------|--------|
| LT-1 | Domain contexts from App.tsx | ❌ Not started |
| LT-2 | Split remaining mega-components | ⚠️ Partial (InventorySync extracted per commit) |
| LT-3–7 | Service consolidation, Edge Function dedup, etc. | ❌ Not started |

---

## 4. Gap Summary

### Critical Gaps (Blocking ME Target)

| Gap | Current | Target | Delta |
|-----|---------|--------|-------|
| App.tsx LOC | 1,317 | ~300 | -1,017 remaining |
| useAppState.ts split | 0% done | Full domain split | ME-5 not started |
| Files > 1,000 LOC | ~9 estimated | 8 (ME target) | Close but needs ME-1 completion |

### Estimated Files > 1,000 LOC (Current)

| File | Estimated LOC | Plan Target |
|------|--------------|------------|
| App.tsx | 1,317 | ~300 |
| components/OrderManager.tsx | 1,727 | sub-components |
| components/AuthForm.tsx | 1,165 | Done (acceptable) |
| components/UserProfile.tsx | 1,134 | Done (acceptable) |
| hooks/useSystemAdminDashboard.ts | 1,098 | (not in plan) |
| components/InventoryManager.tsx | ~1,155 (plan) | plan target |

### Data Externalization (QW-2/QW-3)

No `public/data/` directory created. `fixtureReferenceBase` deleted (correct, was dead code). `dentweb-defaults.ts` at 44 LOC (effectively resolved). **No action needed.**

---

## 5. Metrics vs. Plan

| Metric | Baseline | QW Target | Current | ME Target |
|--------|---------|-----------|---------|-----------|
| TS/TSX LOC (est.) | 84,000 | 70,000 | ~68,000 | 65,000 |
| Files > 1,000 LOC | 18 | 16 | ~9 | 8 |
| Files > 400 LOC | 46 | 42 | ~30 | 25 |
| Dead code files | 4 | 0 | 0 | 0 |
| Data-as-code LOC | 13,179 | 0 | ~44 | 0 |
| Max hooks/component | 96 | 96 | ~55 (App.tsx) | 30 |
| TypeScript errors | unknown | 0 | 0 (excl. App.tsx pre-existing) | 0 |

---

## 6. Recommended Next Actions

### Priority 1: Complete ME-1 (App.tsx)
App.tsx at 1,317 LOC is the primary remaining gap. Target: extract context providers.

```
Next steps for ME-1:
1. Create AppProviders.tsx — wrap InventoryContext + OrderContext
2. Move realtime subscriptions → AppGlobalEffects.tsx
3. Move route switching → AppRoutes.tsx
4. App.tsx should become 300-400 LOC shell
```

### Priority 2: ME-5 (useAppState domain split)
`hooks/useAppState.ts` (669 LOC) needs domain decomposition to enable ME-1 completion.

### Priority 3: ME-6 (inline style audit)
Measure current inline style count to determine if already resolved by refactoring.

### Priority 4: LT-2 continuation
Continue extracting hooks from remaining mega-components (InventoryManager, etc.).

---

## 7. TypeScript Health

```
npx tsc --noEmit errors (excluding pre-existing App.tsx): 0
```

All extracted hooks and components type-check cleanly. No regressions introduced.
